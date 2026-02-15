import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { storage } from '../services/storage';
import { Trash2, Plus, Save, ChevronDown, ChevronUp } from 'lucide-react';
import { CompanyConfig } from '../types';

interface CollapsibleSectionProps {
    title: string;
    children: React.ReactNode;
    defaultOpen?: boolean;
}

const CollapsibleSection = ({ title, children, defaultOpen = false }: CollapsibleSectionProps) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <Card>
            <CardHeader
                className="cursor-pointer hover:bg-slate-50 transition-colors flex flex-row items-center justify-between space-y-0"
                onClick={() => setIsOpen(!isOpen)}
            >
                <CardTitle className="text-xl">{title}</CardTitle>
                {isOpen ? <ChevronUp className="h-5 w-5 text-slate-500" /> : <ChevronDown className="h-5 w-5 text-slate-500" />}
            </CardHeader>
            {isOpen && <CardContent className="pt-0 transition-all animate-in slide-in-from-top-2 duration-200">
                {children}
            </CardContent>}
        </Card>
    );
};

export default function Settings() {
    const [projectTypes, setProjectTypes] = useState<string[]>([]);
    const [taskCategories, setTaskCategories] = useState<string[]>([]);
    const [newProjectType, setNewProjectType] = useState('');
    const [newTaskCategory, setNewTaskCategory] = useState('');

    // Company Data
    const [companyData, setCompanyData] = useState<CompanyConfig>({
        name: '',
        cif: '',
        address: '',
        phone: '',
        email: '',
        invoiceSequence: 1,
        quoteSequence: 1,
        defaultQuoteTerms: '',
        defaultInvoiceTerms: ''
    });

    // Design Categories Logic
    const [designCategories, setDesignCategories] = useState<string[]>([]);
    const [newDesignCategory, setNewDesignCategory] = useState('');

    // Event Types Logic
    const [eventTypes, setEventTypes] = useState<string[]>([]);
    const [newEventType, setNewEventType] = useState('');

    useEffect(() => {
        const load = async () => {
            const config = await storage.getConfig();
            setCompanyData(config);
            setProjectTypes(await storage.getProjectTypes());
            setTaskCategories(await storage.getTaskCategories());
            setDesignCategories(await storage.getDesignCategories());
            setEventTypes(await storage.getEventTypes());
        };
        load();
    }, []);

    const handleSaveCompanyData = async () => {
        try {
            await storage.updateConfig(companyData);
            alert('Datos de empresa guardados correctamente.');
        } catch (error) {
            console.error('Error saving company data:', error);
            alert('Error al guardar los datos de la empresa.');
        }
    };

    const handleAddProjectType = async () => {
        if (newProjectType.trim()) {
            try {
                const updated = [...projectTypes, newProjectType.trim()];
                setProjectTypes(updated);
                await storage.setProjectTypes(updated);
                setNewProjectType('');
            } catch (error) {
                console.error('Error saving project types:', error);
                alert('Error al guardar el tipo de proyecto. Inténtalo de nuevo.');
                // Revert state if needed, but for now simple alert
            }
        }
    };

    const handleRemoveProjectType = async (type: string) => {
        try {
            const updated = projectTypes.filter(t => t !== type);
            setProjectTypes(updated);
            await storage.setProjectTypes(updated);
        } catch (error) {
            console.error('Error saving project types:', error);
            alert('Error al eliminar el tipo de proyecto.');
        }
    };

    const handleAddTaskCategory = async () => {
        if (newTaskCategory.trim()) {
            try {
                const updated = [...taskCategories, newTaskCategory.trim()];
                setTaskCategories(updated);
                await storage.setTaskCategories(updated);
                setNewTaskCategory('');
            } catch (error) {
                alert('Error al guardar la categoría.');
            }
        }
    };

    const handleRemoveTaskCategory = async (cat: string) => {
        try {
            const updated = taskCategories.filter(c => c !== cat);
            setTaskCategories(updated);
            await storage.setTaskCategories(updated);
        } catch (error) {
            alert('Error al eliminar la categoría.');
        }
    };

    const handleAddDesignCategory = async () => {
        if (newDesignCategory.trim()) {
            try {
                const updated = [...designCategories, newDesignCategory.trim()];
                setDesignCategories(updated);
                await storage.setDesignCategories(updated);
                setNewDesignCategory('');
            } catch (error) {
                alert('Error al guardar subcategoría.');
            }
        }
    };

    const handleRemoveDesignCategory = async (cat: string) => {
        try {
            const updated = designCategories.filter(c => c !== cat);
            setDesignCategories(updated);
            await storage.setDesignCategories(updated);
        } catch (error) {
            alert('Error al eliminar subcategoría.');
        }
    };

    const handleAddEventType = async () => {
        if (newEventType.trim()) {
            try {
                const updated = [...eventTypes, newEventType.trim()];
                setEventTypes(updated);
                await storage.setEventTypes(updated);
                setNewEventType('');
            } catch (error) {
                alert('Error al guardar tipo de evento.');
            }
        }
    };

    const handleRemoveEventType = async (type: string) => {
        try {
            const updated = eventTypes.filter(t => t !== type);
            setEventTypes(updated);
            await storage.setEventTypes(updated);
        } catch (error) {
            alert('Error al eliminar tipo de evento.');
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">Configuración</h1>
                <p className="text-slate-500">Gestión de categorías y tipos del sistema</p>
            </div>

            {/* Migration Tool Removed */}

            <div className="grid gap-6 md:grid-cols-2">
                {/* Company Data */}
                <div className="md:col-span-2">
                    <CollapsibleSection title="Datos de la Empresa" defaultOpen={false}>
                        <div className="space-y-4 pt-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Input
                                    label="Nombre Fiscal"
                                    value={companyData.name}
                                    onChange={(e) => setCompanyData({ ...companyData, name: e.target.value })}
                                />
                                <Input
                                    label="CIF / NIF"
                                    value={companyData.cif}
                                    onChange={(e) => setCompanyData({ ...companyData, cif: e.target.value })}
                                />

                                {/* Address Block */}
                                <div className="md:col-span-2 space-y-2">
                                    <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Dirección Completa</label>
                                    <Input
                                        placeholder="Calle, número, piso..."
                                        value={companyData.address}
                                        onChange={(e) => setCompanyData({ ...companyData, address: e.target.value })}
                                    />
                                    <div className="grid grid-cols-3 gap-2">
                                        <Input
                                            placeholder="Código Postal"
                                            value={companyData.zipCode || ''}
                                            onChange={(e) => setCompanyData({ ...companyData, zipCode: e.target.value })}
                                        />
                                        <Input
                                            placeholder="Ciudad"
                                            value={companyData.city || ''}
                                            onChange={(e) => setCompanyData({ ...companyData, city: e.target.value })}
                                        />
                                        <Input
                                            placeholder="Provincia"
                                            value={companyData.province || ''}
                                            onChange={(e) => setCompanyData({ ...companyData, province: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <Input
                                    label="Teléfono"
                                    value={companyData.phone}
                                    onChange={(e) => setCompanyData({ ...companyData, phone: e.target.value })}
                                />
                                <Input
                                    label="Email"
                                    value={companyData.email}
                                    onChange={(e) => setCompanyData({ ...companyData, email: e.target.value })}
                                />
                                <Input
                                    label="IBAN (para facturas)"
                                    value={companyData.iban || ''}
                                    onChange={(e) => setCompanyData({ ...companyData, iban: e.target.value })}
                                    placeholder="ESXX XXXX XXXX XXXX XXXX XXXX"
                                />
                                <Input
                                    label="URL Logo (Opcional - se usa logo interno por defecto)"
                                    value={companyData.logoUrl || ''}
                                    onChange={(e) => setCompanyData({ ...companyData, logoUrl: e.target.value })}
                                    placeholder="https://..."
                                />

                                <div className="md:col-span-2 grid md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Términos (Presupuestos)</label>
                                        <textarea
                                            className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                            value={companyData.defaultQuoteTerms || ''}
                                            onChange={(e) => setCompanyData({ ...companyData, defaultQuoteTerms: e.target.value })}
                                            placeholder="Validez de la oferta, forma de pago..."
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Términos (Facturas)</label>
                                        <textarea
                                            className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                            value={companyData.defaultInvoiceTerms || ''}
                                            onChange={(e) => setCompanyData({ ...companyData, defaultInvoiceTerms: e.target.value })}
                                            placeholder="Vencimiento, recargos..."
                                        />
                                    </div>
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium mb-1">Texto Legal (GDPR) - Pie de página</label>
                                    <textarea
                                        className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                        value={companyData.gdprText || ''}
                                        onChange={(e) => setCompanyData({ ...companyData, gdprText: e.target.value })}
                                        placeholder="En cumplimiento del RGPD..."
                                    />
                                </div>

                                <div className="flex items-end md:col-span-2">
                                    <Button onClick={handleSaveCompanyData} className="w-full md:w-auto">
                                        <Save className="w-4 h-4 mr-2" />
                                        Guardar Datos
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </CollapsibleSection>
                </div>

                {/* Invoicing Settings */}
                <div className="md:col-span-2">
                    <CollapsibleSection title="Facturación y Presupuestos" defaultOpen={true}>
                        <div className="space-y-4 pt-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Input
                                    label="Siguiente Número de Factura"
                                    type="number"
                                    value={companyData.invoiceSequence}
                                    onChange={(e) => setCompanyData({ ...companyData, invoiceSequence: Number(e.target.value) })}
                                    className="font-mono"
                                />
                                <Input
                                    label="Siguiente Número de Presupuesto"
                                    type="number"
                                    value={companyData.quoteSequence}
                                    onChange={(e) => setCompanyData({ ...companyData, quoteSequence: Number(e.target.value) })}
                                    className="font-mono"
                                />
                                <div className="md:col-span-2 flex justify-end">
                                    <Button onClick={handleSaveCompanyData}>
                                        <Save className="w-4 h-4 mr-2" />
                                        Guardar Configuración
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </CollapsibleSection>
                </div>

                {/* Project Types */}
                <CollapsibleSection title="Tipos de Proyecto" defaultOpen={false}>
                    <div className="space-y-4 pt-4">
                        <div className="flex gap-2">
                            <Input
                                placeholder="Nuevo tipo..."
                                value={newProjectType}
                                onChange={(e) => setNewProjectType(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddProjectType()}
                            />
                            <Button onClick={handleAddProjectType} size="sm">
                                <Plus className="w-4 h-4" />
                            </Button>
                        </div>
                        <ul className="space-y-2">
                            {projectTypes.map((type, idx) => (
                                <li key={idx} className="flex justify-between items-center p-3 bg-slate-50 rounded-md border border-slate-100">
                                    <span>{type}</span>
                                    <button
                                        onClick={() => handleRemoveProjectType(type)}
                                        className="text-slate-400 hover:text-red-500 transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                </CollapsibleSection>

                {/* Task Categories */}
                <CollapsibleSection title="Categorías de Tareas" defaultOpen={false}>
                    <div className="space-y-4 pt-4">
                        <div className="flex gap-2">
                            <Input
                                placeholder="Nueva categoría..."
                                value={newTaskCategory}
                                onChange={(e) => setNewTaskCategory(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddTaskCategory()}
                            />
                            <Button onClick={handleAddTaskCategory} size="sm">
                                <Plus className="w-4 h-4" />
                            </Button>
                        </div>
                        <ul className="space-y-2">
                            {taskCategories.map((cat, idx) => (
                                <li key={idx} className="flex justify-between items-center p-3 bg-slate-50 rounded-md border border-slate-100">
                                    <span>{cat}</span>
                                    <button
                                        onClick={() => handleRemoveTaskCategory(cat)}
                                        className="text-slate-400 hover:text-red-500 transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                </CollapsibleSection>

                {/* Design Sub-categories */}
                <CollapsibleSection title="Subcategorías de Diseño" defaultOpen={false}>
                    <div className="space-y-4 pt-4">
                        <div className="flex gap-2">
                            <Input
                                placeholder="Nueva subcategoría..."
                                value={newDesignCategory}
                                onChange={(e) => setNewDesignCategory(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddDesignCategory()}
                            />
                            <Button onClick={handleAddDesignCategory} size="sm">
                                <Plus className="w-4 h-4" />
                            </Button>
                        </div>
                        <ul className="space-y-2">
                            {designCategories.map((cat, idx) => (
                                <li key={idx} className="flex justify-between items-center p-3 bg-slate-50 rounded-md border border-slate-100">
                                    <span>{cat}</span>
                                    <button
                                        onClick={() => handleRemoveDesignCategory(cat)}
                                        className="text-slate-400 hover:text-red-500 transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                </CollapsibleSection>

                {/* Event Types Settings */}
                <CollapsibleSection title="Tipos de Evento" defaultOpen={false}>
                    <div className="space-y-4 pt-4">
                        <div className="flex gap-2">
                            <Input
                                placeholder="Nuevo tipo de evento..."
                                value={newEventType}
                                onChange={(e) => setNewEventType(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddEventType()}
                            />
                            <Button onClick={handleAddEventType} size="sm">
                                <Plus className="w-4 h-4" />
                            </Button>
                        </div>
                        <ul className="space-y-2">
                            {eventTypes.map((type, idx) => (
                                <li key={idx} className="flex justify-between items-center p-3 bg-slate-50 rounded-md border border-slate-100">
                                    <span>{type}</span>
                                    <button
                                        onClick={() => handleRemoveEventType(type)}
                                        className="text-slate-400 hover:text-red-500 transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                </CollapsibleSection>
            </div>
        </div>
    );
}
