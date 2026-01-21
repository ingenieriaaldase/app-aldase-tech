import { useEffect, useState } from 'react';
import LeadsKanban from '../components/LeadsKanban';
import { Lead, Client } from '../types';
import { storage } from '../services/storage';
import { Plus, LayoutGrid, List as ListIcon, Pencil, Trash2, ArrowRight, Download, ArrowDown } from 'lucide-react';
import LeadFormModal from '../components/LeadFormModal';
import { useNavigate } from 'react-router-dom';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { useAuth } from '../hooks/useAuth';
import { exportToCSV } from '../utils/csvExporter';

// Helper to keep existing mock data logic if needed, or remove it. 
// For consistency with previous file:
const MOCK_LEADS: Lead[] = [
    {
        id: '1',
        name: 'Inversiones Inmobiliarias S.L.',
        status: 'NUEVO',
        email: 'contacto@inversiones.com',
        phone: '600123456',
        createdAt: new Date().toISOString(),
        value: 15000,
        source: 'Web',
    },
    {
        id: '2',
        name: 'Juan Pérez',
        status: 'CONTACTADO',
        email: 'juan.perez@email.com',
        phone: '612345678',
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        notes: 'Interesado en reforma integral',
        source: 'Referido',
    },
];

export default function Leads() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [leads, setLeads] = useState<Lead[]>([]);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [selectedLead, setSelectedLead] = useState<Lead | undefined>(undefined);
    const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');

    useEffect(() => {
        loadLeads();
    }, []);

    const handleExport = () => {
        const dataToExport = leads.map(l => ({
            Nombre: l.name,
            Estado: l.status,
            Valor: l.value,
            Email: l.email,
            Teléfono: l.phone,
            Fuente: l.source,
            Ciudad: l.city,
            Notas: l.notes,
            FechaCreacion: l.createdAt
        }));
        exportToCSV(dataToExport, `leads_${new Date().toISOString().split('T')[0]}`);
    };

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const { parseCSV } = await import('../utils/csvImporter');
            const data = await parseCSV(file);

            const newLeads: Lead[] = data.map((row: any) => ({
                id: crypto.randomUUID(),
                name: row['Nombre'] || row['name'] || 'Sin Nombre',
                status: (row['Estado'] as any) || 'NUEVO',
                value: Number(row['Valor']) || 0,
                email: row['Email'] || row['email'] || '',
                phone: row['Teléfono'] || row['phone'] || '',
                source: row['Fuente'] || row['source'] || 'Importado',
                city: row['Ciudad'] || row['city'] || '',
                notes: row['Notas'] || row['notes'] || '',
                createdAt: new Date().toISOString()
            }));

            const current = storage.getAll<Lead>('crm_leads');
            storage.setData('crm_leads', [...current, ...newLeads]);

            loadLeads();
            alert(`Importados ${newLeads.length} leads correctamente.`);
        } catch (error) {
            console.error(error);
            alert('Error al importar CSV');
        }
        e.target.value = '';
    };

    const loadLeads = () => {
        let storedLeads = storage.getAll<Lead>('crm_leads');
        if (storedLeads.length === 0) {
            MOCK_LEADS.forEach(lead => storage.add('crm_leads', lead));
            storedLeads = MOCK_LEADS;
        }
        setLeads(storedLeads);
    };

    const handleNewLeadClick = () => {
        setSelectedLead(undefined);
        setIsCreateModalOpen(true);
    };

    const handleEditLead = (lead: Lead) => {
        setSelectedLead(lead);
        setIsCreateModalOpen(true);
    };

    const handleSaveLead = (data: Partial<Lead>) => {
        if (selectedLead) {
            const updatedLead = { ...selectedLead, ...data };
            storage.update('crm_leads', updatedLead);
        } else {
            const newLead: Lead = {
                id: crypto.randomUUID(),
                name: data.name!,
                status: 'NUEVO',
                createdAt: new Date().toISOString(),
                source: data.source || 'Manual',
                email: data.email,
                phone: data.phone,
                city: data.city,
                notes: data.notes,
                ...data
            } as Lead;
            storage.add('crm_leads', newLead);
        }
        loadLeads();
        setIsCreateModalOpen(false);
    };

    const handleDeleteLead = (leadId: string) => {
        if (window.confirm('¿Estás seguro de que deseas eliminar este lead?')) {
            storage.delete('crm_leads', leadId);
            loadLeads();
        }
    };

    const handleConvertLead = (lead: Lead) => {
        if (!window.confirm(`¿Convertir a ${lead.name} en cliente?`)) return;

        const newClient: Client = {
            id: crypto.randomUUID(),
            name: lead.name,
            cif: '',
            address: '',
            city: lead.city || '',
            province: '',
            zipCode: '',
            contactName: lead.name,
            email: lead.email || '',
            phone: lead.phone || '',
            notes: `Convertido desde Lead. Fuente: ${lead.source || 'Desconocida'}. ${lead.notes || ''}`,
            createdAt: new Date().toISOString(),
            type: 'PARTICULAR'
        };

        storage.add('crm_clients', newClient);

        const updatedLead = { ...lead, status: 'GANADO' };
        storage.update('crm_leads', updatedLead);

        loadLeads();
        navigate(`/clients/${newClient.id}`);
    };

    const getStatusBadge = (status: string) => {
        let variant: any = 'default';
        if (status === 'NUEVO') variant = 'secondary';
        else if (status === 'GANADO') variant = 'success';
        else if (status === 'PERDIDO') variant = 'danger';
        else if (status === 'CONTACTADO') variant = 'default';
        else variant = 'warning';

        return <Badge variant={variant}>{status}</Badge>;
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Oportunidades (Leads)</h1>
                    <p className="text-slate-500 dark:text-slate-400">Gestiona tus contactos comerciales y seguimiento de ventas</p>
                </div>
                <div className="flex gap-2">
                    <div className="flex bg-slate-100 p-1 rounded-lg">
                        <button
                            onClick={() => setViewMode('kanban')}
                            className={`p-2 rounded-md transition-all ${viewMode === 'kanban' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                            title="Vista Kanban"
                        >
                            <LayoutGrid className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                            title="Vista Lista"
                        >
                            <ListIcon className="w-4 h-4" />
                        </button>
                    </div>
                    {user?.role === 'ADMIN' && (
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={handleExport}>
                                <Download className="w-4 h-4 mr-2" />
                                Exportar
                            </Button>
                            <div className="relative">
                                <input
                                    type="file"
                                    accept=".csv"
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    onChange={handleImport}
                                />
                                <Button variant="outline">
                                    <ArrowDown className="w-4 h-4 mr-2" />
                                    Importar
                                </Button>
                            </div>
                        </div>
                    )}
                    <button
                        onClick={handleNewLeadClick}
                        className="flex items-center space-x-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg transition-colors"
                    >
                        <Plus className="w-5 h-5" />
                        <span>Nuevo Lead</span>
                    </button>
                </div>
            </div>

            {viewMode === 'kanban' ? (
                <LeadsKanban
                    leads={leads}
                    onLeadUpdate={loadLeads}
                    onConvertLead={handleConvertLead}
                    onEditLead={handleEditLead}
                />
            ) : (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Nombre</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Estado</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Valor</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Contacto</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Fuente</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Notas</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-slate-200">
                                {leads.map((lead) => (
                                    <tr key={lead.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-slate-900">{lead.name}</div>
                                            <div className="text-xs text-slate-500">{new Date(lead.createdAt).toLocaleDateString()}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {getStatusBadge(lead.status)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 font-medium">
                                            {lead.value ? `${lead.value.toLocaleString()}€` : '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-slate-900">{lead.email}</div>
                                            <div className="text-sm text-slate-500">{lead.phone}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                            {lead.source}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-500 max-w-xs truncate" title={lead.notes}>
                                            {lead.notes || '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => handleConvertLead(lead)}
                                                    className="text-green-600 hover:text-green-900"
                                                    title="Convertir a Cliente"
                                                >
                                                    <ArrowRight className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleEditLead(lead)}
                                                    className="text-blue-600 hover:text-blue-900"
                                                    title="Editar"
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteLead(lead.id)}
                                                    className="text-red-600 hover:text-red-900"
                                                    title="Eliminar"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {leads.length === 0 && (
                        <div className="p-8 text-center text-slate-500">
                            No hay leads registrados.
                        </div>
                    )}
                </div>
            )}

            <LeadFormModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSubmit={handleSaveLead}
                initialLead={selectedLead}
            />
        </div>
    );
}
