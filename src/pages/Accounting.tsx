import { useState, useEffect } from 'react';
import { storage } from '../services/storage';
import { Invoice, Quote, Client, Project } from '../types';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { generatePDF } from '../utils/pdfGenerator';
import { Plus, FileText, Printer, Edit, Trash2, AlertTriangle } from 'lucide-react';
import FinancialDocumentEditor from '../components/accounting/FinancialDocumentEditor';

export default function Accounting() {
    const [activeTab, setActiveTab] = useState<'INVOICES' | 'QUOTES'>('QUOTES');
    const [viewMode, setViewMode] = useState<'LIST' | 'EDITOR'>('LIST');
    const [editingItem, setEditingItem] = useState<Invoice | Quote | null>(null);

    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [quotes, setQuotes] = useState<Quote[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);

    const loadData = async () => {
        const [inv, quo, cli, pro] = await Promise.all([
            storage.getInvoices(),
            storage.getQuotes(),
            storage.getClients(),
            storage.getProjects()
        ]);
        setInvoices(inv);
        setQuotes(quo);
        setClients(cli);
        setProjects(pro);
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleCreateNew = () => {
        setEditingItem(null);
        setViewMode('EDITOR');
    };

    const handleEdit = (item: Invoice | Quote) => {
        setEditingItem(item);
        setViewMode('EDITOR');
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('¿Estás seguro de que quieres eliminar este documento?')) return;

        await storage.remove(activeTab === 'INVOICES' ? 'crm_invoices' : 'crm_quotes', id);
        loadData();
    };

    const handleSave = () => {
        setViewMode('LIST');
        loadData();
    };

    const handleGeneratePDF = (item: Invoice | Quote) => {
        const client = clients.find(c => c.id === item.clientId);
        const project = projects.find(p => p.id === item.projectId);
        const runPDF = async () => {
            const config = await storage.getConfig();
            if (client) {
                generatePDF(activeTab === 'INVOICES' ? 'FACTURA' : 'PRESUPUESTO', item, client, project, config);
            } else {
                alert('No se encuentra el cliente asociado');
            }
        };
        runPDF();
    };

    const getClientName = (id: string) => clients.find(c => c.id === id)?.name || 'Cliente desconocido';
    const getProjectName = (id: string) => projects.find(p => p.id === id)?.name || 'Sin proyecto';

    if (viewMode === 'EDITOR') {
        return (
            <FinancialDocumentEditor
                type={activeTab}
                initialData={editingItem}
                onSave={handleSave}
                onCancel={() => setViewMode('LIST')}
            />
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">Contabilidad</h1>
                <Button onClick={handleCreateNew}>
                    <Plus className="w-4 h-4 mr-2" />
                    Nueva {activeTab === 'QUOTES' ? 'Propuesta' : 'Factura'}
                </Button>
            </div>

            <div className="border-b border-slate-200">
                <nav className="-mb-px flex space-x-8">
                    <button onClick={() => setActiveTab('QUOTES')} className={`pb-4 px-1 border-b-2 font-medium ${activeTab === 'QUOTES' ? 'border-primary-500 text-primary-600' : 'border-transparent text-slate-500'}`}>
                        Presupuestos
                    </button>
                    <button onClick={() => setActiveTab('INVOICES')} className={`pb-4 px-1 border-b-2 font-medium ${activeTab === 'INVOICES' ? 'border-primary-500 text-primary-600' : 'border-transparent text-slate-500'}`}>
                        Facturas
                    </button>
                </nav>
            </div>

            <div className="space-y-4">
                {(activeTab === 'QUOTES' ? quotes : invoices).map((item) => (
                    <Card key={item.id} className="hover:shadow-sm transition-shadow group">
                        <CardContent className="p-4 flex flex-col md:flex-row items-center justify-between gap-4">
                            <div className="flex items-center gap-4 cursor-pointer flex-1" onClick={() => handleEdit(item)}>
                                <div className="p-3 bg-slate-100 rounded-full">
                                    <FileText className="w-6 h-6 text-slate-600" />
                                </div>
                                <div>
                                    <p className="font-bold text-slate-900 group-hover:text-primary-600 transition-colors">{item.number}</p>
                                    <p className="text-sm text-slate-500">{new Date(item.date).toLocaleDateString()} — {getClientName(item.clientId)}</p>
                                    <p className="text-xs text-slate-400">{getProjectName(item.projectId)}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-6">
                                <div className="text-right">
                                    <p className="font-bold text-lg">{item.totalAmount.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</p>
                                    <div className="flex items-center gap-2 justify-end">
                                        {item.status === 'ENVIADO' && new Date(item.date) < new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) && (
                                            <div className="text-amber-500" title="Enviado hace más de un mes">
                                                <AlertTriangle className="w-5 h-5" />
                                            </div>
                                        )}
                                        <Badge variant={item.status === 'PAGADA' || item.status === 'ACEPTADO' ? 'success' : item.status === 'VENCIDA' || item.status === 'RECHAZADO' ? 'danger' : item.status === 'ENVIADO' ? 'default' : 'warning'}>
                                            {item.status}
                                        </Badge>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <Button variant="ghost" size="sm" onClick={() => handleGeneratePDF(item)} title="Imprimir PDF">
                                        <Printer className="w-4 h-4 text-slate-600" />
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={() => handleEdit(item)} title="Editar">
                                        <Edit className="w-4 h-4 text-slate-600" />
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={() => handleDelete(item.id)} className="text-red-500 hover:text-red-700 hover:bg-red-50" title="Eliminar">
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
                {quotes.length === 0 && activeTab === 'QUOTES' && <p className="text-center text-slate-500 py-8">No hay presupuestos registrados.</p>}
                {invoices.length === 0 && activeTab === 'INVOICES' && <p className="text-center text-slate-500 py-8">No hay facturas registradas.</p>}
            </div>
        </div>
    );
}
