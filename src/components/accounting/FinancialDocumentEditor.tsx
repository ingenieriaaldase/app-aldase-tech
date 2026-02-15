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
}

// Union type for form state
type DocumentFormState = Partial<Invoice | Quote> & {
    status?: Invoice['status'] | Quote['status'];
    description?: string;
    terms?: string;
};

export default function FinancialDocumentEditor({ type, initialData, onSave, onCancel }: FinancialDocumentEditorProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [clients, setClients] = useState<Client[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [config, setConfig] = useState<any>(null);

    // Form State
    const [formData, setFormData] = useState<DocumentFormState>({
        date: new Date().toISOString().split('T')[0],
        expiryDate: new Date(Date.now() + 86400000 * 30).toISOString().split('T')[0],
        concepts: [],
        baseAmount: 0,
        ivaRate: 0.21,
        ivaAmount: 0,
        totalAmount: 0,
        status: 'PENDIENTE'
    });

    const isEditing = !!initialData;

    useEffect(() => {
        const load = async () => {
            const [cli, pro, conf] = await Promise.all([
                storage.getClients(),
                storage.getProjects(),
                storage.getConfig()
            ]);
            setClients(cli);
            setProjects(pro);
            setConfig(conf);

            if (initialData) {
                setFormData({
                    ...initialData,
                    date: new Date(initialData.date).toISOString().split('T')[0],
                    expiryDate: new Date(initialData.expiryDate).toISOString().split('T')[0]
                });
            } else {
                // Generate Next Number
                const seq = type === 'INVOICES' ? conf.invoiceSequence : conf.quoteSequence;
                const prefix = type === 'INVOICES' ? 'F' : 'P';
                const year = new Date().getFullYear().toString().slice(-2); // Last 2 digits
                const nextNumber = `${prefix}${year}${String(seq).padStart(3, '0')}`;

                // Select specific terms based on type, fallback to legacy defaultTerms
                const defaultT = type === 'INVOICES' ? conf.defaultInvoiceTerms : conf.defaultQuoteTerms;
                const termsToUse = defaultT || conf.defaultTerms || '';

                setFormData(prev => ({
                    ...prev,
                    number: nextNumber,
                    terms: termsToUse
                }));
            }
        };
        load();
    }, [initialData, type]);

    // Validity State (days)
    const [validityDays, setValidityDays] = useState<number | 'custom'>(30);

    // Update totals when concepts or IVA changes
    useEffect(() => {
        const base = (formData.concepts || []).reduce((acc, curr) => acc + (curr.quantity * curr.price), 0);
        const iva = base * (formData.ivaRate || 0.21);
        const total = base + iva;

        setFormData(prev => ({
            ...prev,
            baseAmount: base,
            ivaAmount: iva,
            totalAmount: total
        }));
    }, [formData.concepts, formData.ivaRate]);

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
        if (!formData.clientId || !formData.number) {
            alert('Por favor, selecciona un cliente y revisa el número.');
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
            };

            const collection = type === 'INVOICES' ? 'crm_invoices' : 'crm_quotes';

            if (isEditing) {
                await storage.update(collection, dataToSave);
            } else {
                await storage.add(collection, dataToSave);
                // Increment sequence ONLY if creating new
                if (config) {
                    const newConfig = { ...config };
                    if (type === 'INVOICES') newConfig.invoiceSequence++;
                    else newConfig.quoteSequence++;
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
        if (!formData.clientId) {
            alert('Selecciona un cliente para generar el PDF');
            return;
        }
        const client = clients.find(c => c.id === formData.clientId);
        const project = projects.find(p => p.id === formData.projectId);

        if (client) {
            generatePDF(
                type === 'INVOICES' ? 'FACTURA' : 'PRESUPUESTO',
                { ...formData, id: initialData?.id || 'preview' } as Invoice | Quote,
                client,
                project,
                config
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
                            {isEditing ? 'Editar' : 'Nueva'} {type === 'INVOICES' ? 'Factura' : 'Propuesta'}
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
                                            {(concept.quantity * concept.price).toLocaleString()}€
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
                        <CardContent className="pt-6 space-y-4">
                            <div className="flex justify-between text-slate-600">
                                <span>Subtotal</span>
                                <span>{formData.baseAmount?.toLocaleString()}€</span>
                            </div>
                            <div className="flex justify-between items-center text-slate-600">
                                <span>IVA ({((formData.ivaRate || 0.21) * 100).toFixed(0)}%)</span>
                                <span>{formData.ivaAmount?.toLocaleString()}€</span>
                            </div>
                            <div className="border-t border-slate-200 pt-4 flex justify-between font-bold text-xl text-slate-900">
                                <span>Total</span>
                                <span>{formData.totalAmount?.toLocaleString()}€</span>
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
                                <option value="ACEPTADO">ACEPTADO / PAGADA</option>
                                <option value="RECHAZADO">RECHAZADO / VENCIDA</option>
                            </select>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
