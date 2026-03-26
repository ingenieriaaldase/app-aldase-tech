import { useState, useEffect } from 'react';
import { Client, Project, Concept, Invoice, Quote } from '../../types';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card, CardContent } from '../ui/Card';
import { Plus, Trash2, ArrowLeft, Save, Printer } from 'lucide-react';
import { storage } from '../../services/storage';
import { generatePDF } from '../../utils/pdfGenerator';

interface FinancialDocumentEditorProps {
    type: 'INVOICES' | 'QUOTES';
    initialData?: Invoice | Quote | null;
    onSave: () => void;
    onCancel: () => void;
    workerId?: string; // Add optional workerId prop
}

// Union type for form state
type DocumentFormState = Partial<Invoice | Quote> & {
    status?: Invoice['status'] | Quote['status'];
    description?: string;
    terms?: string;
    isRectification?: boolean; // New field
};

export default function FinancialDocumentEditor({ type, initialData, onSave, onCancel, workerId }: FinancialDocumentEditorProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [clients, setClients] = useState<Client[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [config, setConfig] = useState<any>(null);
    const [existingDocs, setExistingDocs] = useState<any[]>([]);
    const [workerCfg, setWorkerCfg] = useState<any>(null);

    // Form State
    const [formData, setFormData] = useState<DocumentFormState>({
        date: new Date().toISOString().split('T')[0],
        expiryDate: new Date(Date.now() + 86400000 * 30).toISOString().split('T')[0],
        concepts: [],
        baseAmount: 0,
        ivaRate: 0.21,
        ivaAmount: 0,
        irpfRate: 0,
        irpfAmount: 0,
        totalAmount: 0,
        status: 'PENDIENTE',
        isRectification: false,
        invoiceToCompany: false
    });

    // Toggle: this personal invoice is directed to the company
    const invoiceToCompany = !!(formData as any).invoiceToCompany;
    const setInvoiceToCompany = (val: boolean) => setFormData(prev => ({ ...prev, invoiceToCompany: val, clientId: val ? undefined : prev.clientId, projectId: val ? undefined : prev.projectId }));

    const isEditing = !!initialData;

    // Helper to generate number based on config, type, and existing docs
    const generateNumber = (conf: any, isRect: boolean = false, dateStr: string, docs: any[] = [], isPersonal: boolean = false, workerConf: any = null) => {
        if (!conf && !workerConf) return '';

        const date = new Date(dateStr);
        const year = date.getFullYear();
        const yearShort = year.toString().slice(-2);

        // All docs use same prefix; personal vs company distinguished by sequence source
        const prefix = type === 'INVOICES' ? (isRect ? 'R' : 'F') : 'P';

        // Get config sequence as baseline minimum
        let configSeq = 1;
        if (isPersonal && workerConf) {
            if (workerConf.lastSequenceYear === year) {
                configSeq = type === 'INVOICES' ? (workerConf.invoiceSequence || 1) : (workerConf.quoteSequence || 1);
            }
        } else if (conf?.lastSequenceYear === year) {
            if (type === 'INVOICES') {
                configSeq = isRect ? (conf.rectificationSequence || 1) : conf.invoiceSequence;
            } else {
                configSeq = conf.quoteSequence;
            }
        }

        // Find the highest number already used among existing docs for this prefix+year
        const pattern = `${prefix}${yearShort}`;
        let maxExisting = 0;
        for (const doc of docs) {
            if (doc.number && doc.number.startsWith(pattern)) {
                const numPart = parseInt(doc.number.slice(pattern.length), 10);
                if (!isNaN(numPart) && numPart > maxExisting) {
                    maxExisting = numPart;
                }
            }
        }

        // Next number = max of (highest existing + 1, config sequence)
        const seq = Math.max(maxExisting + 1, configSeq);

        return `${prefix}${yearShort}${String(seq).padStart(3, '0')}`;
    };

    useEffect(() => {
        const load = async () => {
            const [cli, pro, conf, invoices, quotes] = await Promise.all([
                storage.getClients(),
                storage.getProjects(),
                storage.getConfig(),
                storage.getInvoices(),
                storage.getQuotes()
            ]);
            setClients(cli);
            setProjects(pro);
            setConfig(conf);

            // Combine all docs for number lookup
            const allDocs = type === 'INVOICES' ? invoices : quotes;
            setExistingDocs(allDocs);

            if (initialData) {
                setFormData({
                    ...initialData,
                    irpfRate: (initialData as any).irpfRate || 0,
                    irpfAmount: (initialData as any).irpfAmount || 0,
                    date: new Date(initialData.date).toISOString().split('T')[0],
                    expiryDate: new Date(initialData.expiryDate).toISOString().split('T')[0],
                    isRectification: (initialData as any).isRectification || false
                });
            } else {
                let defaultTerms = type === 'INVOICES' ? conf.defaultInvoiceTerms : conf.defaultQuoteTerms;
                defaultTerms = defaultTerms || conf.defaultTerms || '';

                // Load per-worker personal config if in personal scope
                if (workerId) {
                    try {
                        const { storage: st } = await import('../../services/storage');
                        const loadedWorkerCfg = await st.getWorkerAccountingConfig(workerId);
                        if (loadedWorkerCfg) {
                            setWorkerCfg(loadedWorkerCfg);
                            const allPersonalDocs = allDocs.filter((d: any) => d.workerId === workerId);
                            const nextNumber = generateNumber(conf, false, new Date().toISOString(), allPersonalDocs, true, loadedWorkerCfg);
                            const wTerms = type === 'INVOICES' ? loadedWorkerCfg.defaultInvoiceTerms : loadedWorkerCfg.defaultQuoteTerms;
                            setFormData(prev => ({
                                ...prev,
                                number: nextNumber,
                                terms: wTerms || defaultTerms,
                                irpfRate: loadedWorkerCfg.defaultIrpfRate || 0,
                            }));
                            return;
                        }
                    } catch (e) { /* ignore */ }
                    // Fallback: no workerCfg yet
                    const allPersonalDocs = allDocs.filter((d: any) => d.workerId === workerId);
                    const nextNumber = generateNumber(conf, false, new Date().toISOString(), allPersonalDocs, true, null);
                    setFormData(prev => ({ ...prev, number: nextNumber, terms: defaultTerms, irpfRate: 0 }));
                    return;
                }

                // Company doc
                const nextNumber = generateNumber(conf, false, new Date().toISOString(), allDocs);
                setFormData(prev => ({
                    ...prev,
                    number: nextNumber,
                    terms: defaultTerms
                }));
            }
        };
        load();
    }, [initialData, type]);

    // Recalculate number if Rectification toggle or date changes (only for new docs)
    useEffect(() => {
        if (!isEditing && config) {
            if (workerId) {
                // For personal docs, filter only personal docs for number lookup
                const personalDocs = existingDocs.filter((d: any) => d.workerId === workerId);
                const nextNumber = generateNumber(config, formData.isRectification, formData.date || new Date().toISOString(), personalDocs, true, workerCfg);
                setFormData(prev => ({ ...prev, number: nextNumber }));
            } else {
                const nextNumber = generateNumber(config, formData.isRectification, formData.date || new Date().toISOString(), existingDocs);
                setFormData(prev => ({ ...prev, number: nextNumber }));
            }
        }
    }, [formData.isRectification, formData.date, existingDocs, workerCfg]);

    // Validity State (days)
    const [validityDays, setValidityDays] = useState<number | 'custom'>(30);

    // Update totals when concepts, IVA or IRPF changes
    useEffect(() => {
        const base = (formData.concepts || []).reduce((acc, curr) => acc + (curr.quantity * curr.price), 0);
        const iva = base * (formData.ivaRate || 0.21);
        const irpf = base * ((formData.irpfRate || 0) / 100);
        const total = base + iva - irpf;

        setFormData(prev => ({
            ...prev,
            baseAmount: Number(base.toFixed(2)),
            ivaAmount: Number(iva.toFixed(2)),
            irpfAmount: Number(irpf.toFixed(2)),
            totalAmount: Number(total.toFixed(2))
        }));
    }, [formData.concepts, formData.ivaRate, formData.irpfRate]);

    // Auto-update Expiry Date when Date or Validity changes
    useEffect(() => {
        if (validityDays !== 'custom' && formData.date) {
            const date = new Date(formData.date);
            date.setDate(date.getDate() + (validityDays as number));
            setFormData(prev => ({
                ...prev,
                expiryDate: date.toISOString().split('T')[0]
            }));
        }
    }, [formData.date, validityDays]);

    const handleValidityChange = (value: string) => {
        if (value === 'custom') {
            setValidityDays('custom');
        } else {
            setValidityDays(Number(value));
        }
    };

    const handleExpiryDateManualChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setValidityDays('custom');
        setFormData({ ...formData, expiryDate: e.target.value });
    };

    const handleConceptChange = (index: number, field: keyof Concept, value: any) => {
        const newConcepts = [...(formData.concepts || [])];
        newConcepts[index] = { ...newConcepts[index], [field]: value };
        setFormData({ ...formData, concepts: newConcepts });
    };

    const handleDetailChange = (conceptIndex: number, detailIndex: number, value: string) => {
        const newConcepts = [...(formData.concepts || [])];
        const newDetails = [...(newConcepts[conceptIndex].details || [])];
        newDetails[detailIndex] = value;
        newConcepts[conceptIndex] = { ...newConcepts[conceptIndex], details: newDetails };
        setFormData({ ...formData, concepts: newConcepts });
    };

    const addDetail = (conceptIndex: number) => {
        const newConcepts = [...(formData.concepts || [])];
        const newDetails = [...(newConcepts[conceptIndex].details || []), ''];
        newConcepts[conceptIndex] = { ...newConcepts[conceptIndex], details: newDetails };
        setFormData({ ...formData, concepts: newConcepts });
    };

    const removeDetail = (conceptIndex: number, detailIndex: number) => {
        const newConcepts = [...(formData.concepts || [])];
        const newDetails = [...(newConcepts[conceptIndex].details || [])];
        newDetails.splice(detailIndex, 1);
        newConcepts[conceptIndex] = { ...newConcepts[conceptIndex], details: newDetails };
        setFormData({ ...formData, concepts: newConcepts });
    };

    const addConcept = () => {
        setFormData({
            ...formData,
            concepts: [...(formData.concepts || []), { description: '', quantity: 1, price: 0 }]
        });
    };

    const removeConcept = (index: number) => {
        const newConcepts = [...(formData.concepts || [])];
        newConcepts.splice(index, 1);
        setFormData({ ...formData, concepts: newConcepts });
    };

    const handleSave = async () => {
        const isToCompany = !!(formData as any).invoiceToCompany;

        if (!isToCompany && !formData.clientId) {
            alert('Por favor, selecciona un cliente o activa "Factura a la empresa".');
            return;
        }
        if (!formData.number) {
            alert('Revisa el número de factura.');
            return;
        }
        if (!formData.date || !formData.expiryDate) {
            alert('Por favor, indica la fecha de emisión y vencimiento.');
            return;
        }

        setIsLoading(true);
        try {
            const dataToSave = {
                ...formData,
                id: initialData?.id || crypto.randomUUID(),
                date: new Date(formData.date).toISOString(),
                expiryDate: new Date(formData.expiryDate).toISOString(),
                projectId: formData.projectId || null, // Convert empty string to null for UUID field
                isRectification: formData.isRectification || false, // Save flag
                workerId: (initialData as any)?.workerId || workerId
            };

            const collection = type === 'INVOICES' ? 'crm_invoices' : 'crm_quotes';

            if (isEditing) {
                await storage.update(collection, dataToSave);
            } else {
                await storage.add(collection, dataToSave);

                // If this is a personal invoice to the company, auto-create a company expense
                if (isToCompany && !isEditing && type === 'INVOICES') {
                    const workerName = workerCfg?.personalName || 'Autónomo';
                    const expenseNumber = `GHO-${formData.number}`;
                    const companyExpense = {
                        id: crypto.randomUUID(),
                        number: expenseNumber,
                        supplier: workerName,
                        date: new Date(formData.date).toISOString(),
                        description: `Honorarios profesionales - Factura ${formData.number}`,
                        category: 'Honorarios profesionales',
                        baseAmount: formData.baseAmount || 0,
                        ivaRate: formData.ivaRate || 0.21,
                        ivaAmount: formData.ivaAmount || 0,
                        suppliesAmount: 0,
                        irpfRate: formData.irpfRate || 0,
                        irpfAmount: formData.irpfAmount || 0,
                        totalAmount: formData.totalAmount || 0,
                        irpfDeductible: true,
                        workerId: null // Company expense (NO workerId)
                    };
                    await storage.add('crm_expenses', companyExpense as any);
                }

                const docYear = new Date(formData.date).getFullYear();

                if (workerId && workerCfg) {
                    // Update personal sequence for worker
                    const pPrefix = type === 'INVOICES' ? (formData.isRectification ? 'R' : 'F') : 'P';
                    const yearShort = docYear.toString().slice(-2);
                    const pPattern = `${pPrefix}${yearShort}`;
                    let usedNum = 0;
                    if (formData.number && formData.number.startsWith(pPattern)) {
                        usedNum = parseInt(formData.number.slice(pPattern.length), 10) || 0;
                    }
                    const newWorkerCfg = { ...workerCfg };
                    if (newWorkerCfg.lastSequenceYear !== docYear) {
                        newWorkerCfg.lastSequenceYear = docYear;
                        newWorkerCfg.invoiceSequence = 1;
                        newWorkerCfg.quoteSequence = 1;
                    }
                    if (type === 'INVOICES') {
                        newWorkerCfg.invoiceSequence = usedNum + 1;
                    } else {
                        newWorkerCfg.quoteSequence = usedNum + 1;
                    }
                    await storage.saveWorkerAccountingConfig(newWorkerCfg);
                } else if (config && !workerId) {
                    // Update company sequence
                    const newConfig = { ...config };
                    if (newConfig.lastSequenceYear !== docYear) {
                        newConfig.lastSequenceYear = docYear;
                        newConfig.invoiceSequence = 1;
                        newConfig.quoteSequence = 1;
                        newConfig.rectificationSequence = 1;
                    }
                    const prefix = type === 'INVOICES' ? (formData.isRectification ? 'R' : 'F') : 'P';
                    const yearShort = docYear.toString().slice(-2);
                    const pattern = `${prefix}${yearShort}`;
                    let usedNum = 0;
                    if (formData.number && formData.number.startsWith(pattern)) {
                        usedNum = parseInt(formData.number.slice(pattern.length), 10) || 0;
                    }
                    if (type === 'INVOICES') {
                        if (formData.isRectification) {
                            newConfig.rectificationSequence = usedNum + 1;
                        } else {
                            newConfig.invoiceSequence = usedNum + 1;
                        }
                    } else {
                        newConfig.quoteSequence = usedNum + 1;
                    }
                    await storage.updateConfig(newConfig);
                }
            }
            onSave();
        } catch (error: any) {
            console.error('Error saving document:', error);
            const msg = error?.message || error?.details || 'Error desconocido';
            alert(`Error al guardar: ${msg}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handlePrint = async () => {
        const isToCompany = !!(formData as any).invoiceToCompany;

        if (!isToCompany && !formData.clientId) {
            alert('Selecciona un cliente para generar el PDF');
            return;
        }

        let client: any;
        const project = projects.find(p => p.id === formData.projectId);

        if (isToCompany && config) {
            // Build a pseudo-client from company config
            client = {
                id: 'COMPANY',
                name: config.name,
                cif: config.cif,
                address: config.address,
                city: config.city,
                zipCode: config.zipCode,
                contactName: '',
            };
        } else {
            client = clients.find(c => c.id === formData.clientId);
        }

        if (client) {
            generatePDF(
                type === 'INVOICES' ? (formData.isRectification ? 'FACTURA RECTIFICATIVA' : 'FACTURA') : 'PRESUPUESTO',
                { ...formData, id: initialData?.id || 'preview' } as Invoice | Quote,
                client,
                project,
                config,
                workerId ? workerCfg : undefined
            );
        }
    };

    return (
        <div className="space-y-6 max-w-5xl mx-auto pb-10 animate-in fade-in slide-in-from-bottom-4">
            {/* Header / Actions */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm" onClick={onCancel}>
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">
                            {isEditing ? 'Editar' : 'Nueva'} {type === 'INVOICES' ? (formData.isRectification ? 'Factura Rectificativa' : 'Factura') : 'Propuesta'}
                        </h1>
                        <p className="text-slate-500">{formData.number}</p>
                    </div>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    <Button variant="outline" onClick={handlePrint} className="flex-1 md:flex-none">
                        <Printer className="w-4 h-4 mr-2" />
                        PDF
                    </Button>
                    <Button onClick={handleSave} disabled={isLoading} className="flex-1 md:flex-none">
                        <Save className="w-4 h-4 mr-2" />
                        {isLoading ? 'Guardando...' : 'Guardar'}
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Info */}
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardContent className="pt-6 space-y-4">

                            {/* Rectification Toggle (Only for Invoices) */}
                            {type === 'INVOICES' && !isEditing && (
                                <div className="bg-amber-50 border border-amber-200 rounded-md p-3 flex items-center gap-3">
                                    <input
                                        type="checkbox"
                                        id="isRectification"
                                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                                        checked={formData.isRectification}
                                        onChange={(e) => setFormData({ ...formData, isRectification: e.target.checked })}
                                    />
                                    <label htmlFor="isRectification" className="text-sm font-medium text-amber-900 cursor-pointer select-none">
                                        Es Factura Rectificativa
                                    </label>
                                </div>
                            )}

                            {/* "Invoice to Company" Toggle — only in personal scope for INVOICES */}
                            {workerId && type === 'INVOICES' && !isEditing && (
                                <div className={`border rounded-md p-3 flex items-center gap-3 transition-colors ${invoiceToCompany ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-200'}`}>
                                    <input
                                        type="checkbox"
                                        id="invoiceToCompany"
                                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                        checked={invoiceToCompany}
                                        onChange={(e) => setInvoiceToCompany(e.target.checked)}
                                    />
                                    <div>
                                        <label htmlFor="invoiceToCompany" className="text-sm font-semibold text-blue-900 cursor-pointer select-none">
                                            Factura a la empresa
                                        </label>
                                        {invoiceToCompany && (
                                            <p className="text-xs text-blue-600 mt-0.5">Se generará automáticamente un gasto de empresa en "Honorarios profesionales"</p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Client / Project selectors — hidden when invoicing to company */}
                            {!invoiceToCompany ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Cliente</label>
                                        <select
                                            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:ring-primary-500"
                                            value={formData.clientId || ''}
                                            onChange={e => setFormData({ ...formData, clientId: e.target.value, projectId: '' })}
                                        >
                                            <option value="">Seleccionar Cliente...</option>
                                            {clients.map(c => (
                                                <option key={c.id} value={c.id}>{c.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Proyecto (Opcional)</label>
                                        <select
                                            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:ring-primary-500"
                                            value={formData.projectId || ''}
                                            onChange={e => setFormData({ ...formData, projectId: e.target.value })}
                                            disabled={!formData.clientId}
                                        >
                                            <option value="">Sin Proyecto / General</option>
                                            {projects
                                                .filter(p => !formData.clientId || p.clientId === formData.clientId)
                                                .map(p => (
                                                    <option key={p.id} value={p.id}>{p.code} - {p.name}</option>
                                                ))}
                                        </select>
                                    </div>
                                </div>
                            ) : (
                                /* Company as client — readonly display */
                                config && (
                                    <div className="rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm">
                                        <p className="font-semibold text-blue-900 mb-1">Destinatario: {config.name}</p>
                                        {config.cif && <p className="text-blue-700">CIF: {config.cif}</p>}
                                        {config.address && <p className="text-blue-700">{config.address}</p>}
                                        {config.city && <p className="text-blue-700">{config.zipCode} {config.city}</p>}
                                    </div>
                                )
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <Input
                                    label="Fecha Emisión"
                                    type="date"
                                    value={formData.date}
                                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                                />
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Validez</label>
                                    <select
                                        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:ring-primary-500"
                                        value={validityDays}
                                        onChange={e => handleValidityChange(e.target.value)}
                                    >
                                        <option value="7">7 días</option>
                                        <option value="15">15 días</option>
                                        <option value="30">30 días</option>
                                        <option value="60">60 días</option>
                                        <option value="90">90 días</option>
                                        <option value="custom">Personalizado</option>
                                    </select>
                                </div>
                                <Input
                                    label="Fecha Vencimiento"
                                    type="date"
                                    value={formData.expiryDate}
                                    onChange={handleExpiryDateManualChange}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Notas / Descripción</label>
                                <Input
                                    placeholder="Descripción general del documento..."
                                    value={formData.description || ''}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="pt-6">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Condiciones Generales / Términos</label>
                            <textarea
                                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:ring-primary-500 h-32"
                                placeholder="Términos y condiciones de la oferta..."
                                value={formData.terms || ''}
                                onChange={e => setFormData({ ...formData, terms: e.target.value })}
                            />
                        </CardContent>
                    </Card>

                    {/* Concepts */}
                    <Card>
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="font-semibold text-slate-900">Conceptos</h3>
                            <Button size="sm" variant="outline" onClick={addConcept}>
                                <Plus className="w-4 h-4 mr-2" />
                                Añadir Línea
                            </Button>
                        </div>
                        <div className="p-4 space-y-4">
                            {(formData.concepts || []).length > 0 && (
                                <div className="flex gap-2 items-center text-[10px] font-bold text-slate-400 uppercase tracking-widest pb-2 border-b border-slate-100 mb-2 px-1">
                                    <div className="flex-1">Descripción</div>
                                    <div className="w-20 text-center">Cant.</div>
                                    <div className="w-28 text-center">Precio Unit.</div>
                                    <div className="w-24 text-right">Total</div>
                                    <div className="w-[40px]"></div>
                                </div>
                            )}
                            {(formData.concepts || []).length === 0 && (
                                <p className="text-center text-slate-400 py-4 italic">No hay conceptos añadidos.</p>
                            )}
                            {formData.concepts?.map((concept, index) => (
                                <div key={index} className="animate-fade-in group border-b border-slate-100 last:border-0 pb-4 last:pb-0">
                                    <div className="flex gap-2 items-start">
                                        <div className="flex-1">
                                            <Input
                                                placeholder="Descripción del concepto (Título)"
                                                value={concept.description}
                                                onChange={e => handleConceptChange(index, 'description', e.target.value)}
                                            />
                                        </div>
                                        <div className="w-20">
                                            <Input
                                                type="number"
                                                placeholder="Cant."
                                                value={concept.quantity}
                                                onChange={e => handleConceptChange(index, 'quantity', Number(e.target.value))}
                                            />
                                        </div>
                                        <div className="w-28">
                                            <Input
                                                type="number"
                                                placeholder="Precio"
                                                step="0.01"
                                                value={concept.price}
                                                onChange={e => handleConceptChange(index, 'price', Number(e.target.value))}
                                            />
                                        </div>
                                        <div className="w-24 pt-2 text-right font-medium text-slate-700">
                                            {(concept.quantity * concept.price).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}€
                                        </div>
                                        <button
                                            onClick={() => removeConcept(index)}
                                            className="p-2 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>

                                    {/* Concept Details */}
                                    <div className="ml-4 mt-2 space-y-2 border-l-2 border-slate-100 pl-4">
                                        {concept.details?.map((detail, dIndex) => (
                                            <div key={dIndex} className="flex gap-2 items-center">
                                                <Input
                                                    className="text-sm h-8"
                                                    placeholder="Línea de detalle (sin coste)..."
                                                    value={detail}
                                                    onChange={e => handleDetailChange(index, dIndex, e.target.value)}
                                                />
                                                <button
                                                    onClick={() => removeDetail(index, dIndex)}
                                                    className="text-slate-400 hover:text-red-500"
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ))}
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => addDetail(index)}
                                            className="text-xs text-primary-600 h-6 px-2"
                                        >
                                            <Plus className="w-3 h-3 mr-1" />
                                            Añadir detalle
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>

                {/* Sidebar / Totals */}
                <div className="space-y-6">
                    <Card>
                        <CardContent className="pt-6 space-y-3">
                            {/* IRPF Rate – only for personal invoices */}
                            {workerId && (
                                <div className="pb-3 border-b border-slate-100">
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        Retención IRPF (%)
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="number"
                                            min={0}
                                            max={50}
                                            step={0.5}
                                            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:ring-primary-500"
                                            value={formData.irpfRate ?? 0}
                                            onChange={e => setFormData({ ...formData, irpfRate: parseFloat(e.target.value) || 0 })}
                                        />
                                        <span className="text-slate-500 text-sm font-medium">%</span>
                                    </div>
                                </div>
                            )}
                            <div className="flex flex-col items-end">
                                <div className="flex justify-end items-center gap-4 text-slate-600 w-full">
                                    <span className="text-sm">Subtotal:</span>
                                    <span className="w-28 text-right font-semibold text-slate-900">{formData.baseAmount?.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}€</span>
                                </div>
                                <div className="flex justify-end items-center gap-4 text-slate-600 w-full">
                                    <span className="text-sm">IVA ({((formData.ivaRate || 0.21) * 100).toFixed(0)}%):</span>
                                    <span className="w-28 text-right font-semibold text-slate-900">{formData.ivaAmount?.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}€</span>
                                </div>
                                {workerId && (formData.irpfRate ?? 0) > 0 && (
                                    <div className="flex justify-end items-center gap-4 text-slate-600 w-full">
                                        <span className="text-sm">IRPF ({formData.irpfRate}%):</span>
                                        <span className="w-28 text-right font-semibold text-slate-900">-{formData.irpfAmount?.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}€</span>
                                    </div>
                                )}
                                <div className="mt-4 pt-4 border-t border-slate-200 flex justify-end items-center gap-4 w-full">
                                    <span className="text-base font-bold text-slate-900">TOTAL:</span>
                                    <span className="w-28 text-right text-2xl font-black text-primary-600">
                                        {formData.totalAmount?.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}€
                                    </span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="pt-6">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Estado</label>
                            <select
                                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:ring-primary-500"
                                value={formData.status}
                                onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                            >
                                <option value="PENDIENTE">PENDIENTE</option>
                                {type === 'QUOTES' ? (
                                    <>
                                        <option value="ENVIADO">ENVIADO</option>
                                        <option value="ACEPTADO">ACEPTADO</option>
                                        <option value="RECHAZADO">RECHAZADO</option>
                                    </>
                                ) : (
                                    <>
                                        <option value="PAGADA">PAGADA</option>
                                        <option value="VENCIDA">VENCIDA</option>
                                    </>
                                )}
                            </select>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
