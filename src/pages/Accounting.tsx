import { useState, useEffect } from 'react';
import { storage } from '../services/storage';
import { Invoice, Quote, Client, Project, InvoiceStatus, QuoteStatus } from '../types';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { generatePDF } from '../utils/pdfGenerator';
import { Plus, FileText, Printer, Edit, Trash2, AlertTriangle, Search, Filter, X, ChevronDown } from 'lucide-react';
import FinancialDocumentEditor from '../components/accounting/FinancialDocumentEditor';

export default function Accounting() {
    const [activeTab, setActiveTab] = useState<'INVOICES' | 'QUOTES'>('QUOTES');
    const [viewMode, setViewMode] = useState<'LIST' | 'EDITOR'>('LIST');
    const [editingItem, setEditingItem] = useState<Invoice | Quote | null>(null);

    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [quotes, setQuotes] = useState<Quote[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);

    // Filters state
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('ALL');
    const [dateStart, setDateStart] = useState('');
    const [dateEnd, setDateEnd] = useState('');
    const [showFilters, setShowFilters] = useState(false);

    const loadData = async () => {
        const [inv, quo, cli, pro] = await Promise.all([
            storage.getInvoices(),
            storage.getQuotes(),
            storage.getClients(),
            storage.getProjects()
        ]);
        // Sort by date descending
        setInvoices(inv.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
        setQuotes(quo.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
        setClients(cli);
        setProjects(pro);
    };

    useEffect(() => {
        loadData();
    }, []);

    // Reset filters when changing tab
    useEffect(() => {
        setSearchTerm('');
        setStatusFilter('ALL');
        setDateStart('');
        setDateEnd('');
    }, [activeTab]);

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

    const handleStatusChange = async (item: Invoice | Quote, newStatus: string) => {
        try {
            const updatedItem = { ...item, status: newStatus as any };
            const endpoint = activeTab === 'INVOICES' ? 'crm_invoices' : 'crm_quotes';
            await storage.update(endpoint, updatedItem);

            // Optimistic update
            if (activeTab === 'INVOICES') {
                setInvoices(prev => prev.map(i => i.id === item.id ? { ...i, status: newStatus as InvoiceStatus } : i));
            } else {
                setQuotes(prev => prev.map(q => q.id === item.id ? { ...q, status: newStatus as QuoteStatus } : q));
            }
        } catch (error) {
            console.error('Error updating status:', error);
            alert('Error al actualizar el estado');
            loadData(); // Revert on error
        }
    };

    const getClientName = (id: string) => clients.find(c => c.id === id)?.name || 'Cliente desconocido';
    const getProjectName = (id: string) => projects.find(p => p.id === id)?.name || 'Sin proyecto';

    // Filtering Logic
    const filteredItems = (activeTab === 'QUOTES' ? quotes : invoices).filter(item => {
        // Text Search
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch =
            item.number.toLowerCase().includes(searchLower) ||
            getClientName(item.clientId).toLowerCase().includes(searchLower) ||
            getProjectName(item.projectId).toLowerCase().includes(searchLower);

        // Status Filter
        const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter;

        // Date Range
        let matchesDate = true;
        const itemDate = new Date(item.date);
        if (dateStart) {
            matchesDate = matchesDate && itemDate >= new Date(dateStart);
        }
        if (dateEnd) {
            // Set end date specifically to end of day to be inclusive
            const end = new Date(dateEnd);
            end.setHours(23, 59, 59, 999);
            matchesDate = matchesDate && itemDate <= end;
        }

        return matchesSearch && matchesStatus && matchesDate;
    });

    // Helper for Status Options
    const getStatusOptions = () => {
        if (activeTab === 'QUOTES') {
            return [
                { value: 'PENDIENTE', label: 'Pendiente', color: 'bg-yellow-100 text-yellow-800' },
                { value: 'ENVIADO', label: 'Enviado', color: 'bg-blue-100 text-blue-800' },
                { value: 'ACEPTADO', label: 'Aceptado', color: 'bg-green-100 text-green-800' },
                { value: 'RECHAZADO', label: 'Rechazado', color: 'bg-red-100 text-red-800' }
            ];
        } else {
            return [
                { value: 'PENDIENTE', label: 'Pendiente', color: 'bg-yellow-100 text-yellow-800' },
                { value: 'PAGADA', label: 'Pagada', color: 'bg-green-100 text-green-800' },
                { value: 'VENCIDA', label: 'Vencida', color: 'bg-red-100 text-red-800' }
            ];
        }
    };

    const clearFilters = () => {
        setSearchTerm('');
        setStatusFilter('ALL');
        setDateStart('');
        setDateEnd('');
    };

    const hasActiveFilters = searchTerm || statusFilter !== 'ALL' || dateStart || dateEnd;

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
        <div className="space-y-6 animate-fade-in pb-20">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">Contabilidad</h1>
                    <p className="text-slate-500 text-sm mt-1">Gestiona tus {activeTab === 'QUOTES' ? 'presupuestos' : 'facturas'} y cobros.</p>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                    <Button variant="outline" onClick={() => setShowFilters(!showFilters)} className={showFilters || hasActiveFilters ? 'bg-slate-100' : ''}>
                        <Filter className="w-4 h-4 mr-2" />
                        Filtros
                        {hasActiveFilters && <span className="ml-2 w-2 h-2 rounded-full bg-primary-600"></span>}
                    </Button>
                    <Button onClick={handleCreateNew} className="flex-1 sm:flex-none">
                        <Plus className="w-4 h-4 mr-2" />
                        Nueva {activeTab === 'QUOTES' ? 'Propuesta' : 'Factura'}
                    </Button>
                </div>
            </div>

            <div className="border-b border-slate-200">
                <nav className="-mb-px flex space-x-8">
                    <button onClick={() => setActiveTab('QUOTES')} className={`pb-4 px-1 border-b-2 font-medium transition-colors ${activeTab === 'QUOTES' ? 'border-primary-500 text-primary-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                        Presupuestos
                    </button>
                    <button onClick={() => setActiveTab('INVOICES')} className={`pb-4 px-1 border-b-2 font-medium transition-colors ${activeTab === 'INVOICES' ? 'border-primary-500 text-primary-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                        Facturas
                    </button>
                </nav>
            </div>

            {/* Filters Bar */}
            {(showFilters || hasActiveFilters) && (
                <Card className="animate-in fade-in slide-in-from-top-2 bg-slate-50 border-slate-200">
                    <CardContent className="p-4">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Buscar por nº, cliente o proyecto..."
                                    className="w-full pl-9 pr-4 py-2 text-sm rounded-md border border-slate-300 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <div>
                                <select
                                    className="w-full py-2 px-3 text-sm rounded-md border border-slate-300 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                >
                                    <option value="ALL">Todos los estados</option>
                                    {getStatusOptions().map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="relative flex-1">
                                    <input
                                        type="date"
                                        className="w-full py-2 px-3 text-sm rounded-md border border-slate-300 focus:ring-2 focus:ring-primary-500"
                                        value={dateStart}
                                        onChange={(e) => setDateStart(e.target.value)}
                                    />
                                </div>
                                <span className="text-slate-400">-</span>
                                <div className="relative flex-1">
                                    <input
                                        type="date"
                                        className="w-full py-2 px-3 text-sm rounded-md border border-slate-300 focus:ring-2 focus:ring-primary-500"
                                        value={dateEnd}
                                        onChange={(e) => setDateEnd(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end">
                                <Button variant="ghost" size="sm" onClick={clearFilters} disabled={!hasActiveFilters} className="text-slate-500 hover:text-slate-700">
                                    <X className="w-4 h-4 mr-2" />
                                    Limpiar
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            <div className="space-y-3">
                {filteredItems.map((item) => (
                    <Card key={item.id} className="hover:shadow-sm transition-shadow group border-slate-200">
                        <CardContent className="p-4 flex flex-col md:flex-row items-center justify-between gap-4">

                            {/* Document Info */}
                            <div className="flex items-center gap-4 cursor-pointer flex-1 min-w-0" onClick={() => handleEdit(item)}>
                                <div className={`p-3 rounded-full shrink-0 ${activeTab === 'QUOTES' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                                    <FileText className="w-5 h-5" />
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                        <p className="font-bold text-slate-900 truncate group-hover:text-primary-600 transition-colors">{item.number}</p>
                                        {item.status === 'ENVIADO' && new Date(item.date) < new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) && (
                                            <div className="text-amber-500" title="Enviado hace más de un mes">
                                                <AlertTriangle className="w-4 h-4" />
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-sm text-slate-500 truncate">{new Date(item.date).toLocaleDateString()} — {getClientName(item.clientId)}</p>
                                    <p className="text-xs text-slate-400 truncate">{getProjectName(item.projectId)}</p>
                                </div>
                            </div>

                            {/* Actions & Status */}
                            <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
                                <div className="text-right w-full sm:w-auto flex flex-row sm:flex-col justify-between sm:justify-center items-center sm:items-end gap-x-4">
                                    <p className="font-bold text-lg">{item.totalAmount.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</p>

                                    {/* Inline Status Edit */}
                                    <div className="relative group/status">
                                        <select
                                            value={item.status}
                                            onChange={(e) => handleStatusChange(item, e.target.value)}
                                            className={`appearance-none cursor-pointer py-1 pl-3 pr-8 text-xs font-bold rounded-full border-0 ring-1 ring-slate-200 focus:ring-2 focus:ring-primary-500 outline-none transition-all
                                                ${item.status === 'PAGADA' || item.status === 'ACEPTADO' ? 'bg-green-50 text-green-700 ring-green-200' :
                                                    item.status === 'VENCIDA' || item.status === 'RECHAZADO' ? 'bg-red-50 text-red-700 ring-red-200' :
                                                        item.status === 'ENVIADO' ? 'bg-blue-50 text-blue-700 ring-blue-200' :
                                                            'bg-amber-50 text-amber-700 ring-amber-200'}
                                            `}
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            {getStatusOptions().map(opt => (
                                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                                            ))}
                                        </select>
                                        <ChevronDown className="w-3 h-3 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-50" />
                                    </div>
                                </div>

                                <div className="flex gap-1 border-t sm:border-t-0 sm:border-l border-slate-100 pt-2 sm:pt-0 sm:pl-2 w-full sm:w-auto justify-end">
                                    <Button variant="ghost" size="sm" onClick={() => handleGeneratePDF(item)} title="Imprimir PDF" className="h-8 w-8 p-0">
                                        <Printer className="w-4 h-4 text-slate-500" />
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={() => handleEdit(item)} title="Editar" className="h-8 w-8 p-0">
                                        <Edit className="w-4 h-4 text-slate-500" />
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={() => handleDelete(item.id)} className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50" title="Eliminar">
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}

                {filteredItems.length === 0 && (
                    <div className="text-center py-12 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                        <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                            <Search className="w-6 h-6 text-slate-400" />
                        </div>
                        <h3 className="text-sm font-medium text-slate-900">No se encontraron resultados</h3>
                        <p className="text-sm text-slate-500 mt-1">Intenta ajustar los filtros de búsqueda.</p>
                        <Button variant="ghost" size="sm" onClick={clearFilters} className="mt-4">
                            Limpiar filtros
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}
