import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { storage } from '../services/storage';
import { Project, Client, ProjectStatus } from '../types';
import { Plus, Search, List, Kanban, ArrowUp, ArrowDown, ArrowUpDown, Download } from 'lucide-react';
import ProjectKanban from '../components/ProjectKanban';
import { useAuth } from '../hooks/useAuth';
import { exportToCSV } from '../utils/csvExporter';

const STATUS_MAP: Record<ProjectStatus, { label: string, color: 'default' | 'success' | 'warning' | 'danger' | 'secondary' }> = {
    'PLANIFICACION': { label: 'Planificación', color: 'secondary' },
    'EN_CURSO': { label: 'En Curso', color: 'default' },
    'PAUSADO': { label: 'Pausado', color: 'warning' },
    'COMPLETADO': { label: 'Completado', color: 'success' },
    'ENTREGADO': { label: 'Entregado', color: 'success' },
    'CANCELADO': { label: 'Cancelado', color: 'danger' }
};

type SortConfig = {
    key: string;
    direction: 'asc' | 'desc';
};

export default function Projects() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [projects, setProjects] = useState<Project[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [workers, setWorkers] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('ALL');
    const [yearFilter, setYearFilter] = useState<string>('ALL');
    const [viewMode, setViewMode] = useState<'grid' | 'kanban'>(() => {
        const saved = localStorage.getItem('projects_viewMode');
        return (saved === 'grid' || saved === 'kanban') ? saved : 'kanban';
    });

    useEffect(() => {
        localStorage.setItem('projects_viewMode', viewMode);
    }, [viewMode]);
    const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);

    const loadData = async () => {
        const [loadedProjects, loadedClients, loadedWorkers] = await Promise.all([
            storage.getProjects(),
            storage.getClients(),
            storage.getWorkers()
        ]);
        setProjects(loadedProjects);
        setClients(loadedClients);
        setWorkers(loadedWorkers);
    };

    useEffect(() => {
        loadData();
    }, []);

    // Get unique years from projects
    const availableYears = Array.from(new Set(projects.map(p => new Date(p.startDate).getFullYear()))).sort((a, b) => b - a);

    const getClientName = (id: string) => clients.find(c => c.id === id)?.name || 'Desconocido';

    const getWorkerName = (id: string) => {
        const w = workers.find(w => w.id === id);
        return w ? `${w.name} ${w.surnames || ''}` : '-';
    };

    const handleSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const filteredProjects = projects.filter(project => {
        const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            getClientName(project.clientId).toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'ALL' || project.status === statusFilter;

        const projectYear = new Date(project.startDate).getFullYear();
        const matchesYear = yearFilter === 'ALL' || projectYear.toString() === yearFilter;

        return matchesSearch && matchesStatus && matchesYear;
    });

    const projectsWithClient = filteredProjects.map(p => ({
        ...p,
        clientName: getClientName(p.clientId),
        managerName: getWorkerName(p.managerId)
    }));

    const sortedProjects = [...projectsWithClient].sort((a, b) => {
        if (!sortConfig) {
            // Default sort by code/expediente desc
            return (b.code || '').localeCompare(a.code || '', undefined, { numeric: true });
        }

        let aValue: any = a[sortConfig.key as keyof typeof a];
        let bValue: any = b[sortConfig.key as keyof typeof b];

        // Handle specific columns if needed
        if (sortConfig.key === 'budget') {
            return sortConfig.direction === 'asc' ? a.budget - b.budget : b.budget - a.budget;
        }

        if (typeof aValue === 'string') {
            return sortConfig.direction === 'asc'
                ? aValue.localeCompare(bValue, undefined, { numeric: true })
                : bValue.localeCompare(aValue, undefined, { numeric: true });
        }

        return 0;
    });

    const getStatusBadge = (status: ProjectStatus) => {
        const config = STATUS_MAP[status] || { label: status, color: 'default' };
        let variant: any = 'default';
        if (status === 'EN_CURSO') variant = 'default';
        if (status === 'COMPLETADO' || status === 'ENTREGADO') variant = 'success';
        if (status === 'PAUSADO') variant = 'warning';
        if (status === 'CANCELADO') variant = 'danger';
        if (status === 'PLANIFICACION') variant = 'secondary';
        return <Badge variant={variant}>{config.label}</Badge>;
    };

    const SortIcon = ({ columnKey }: { columnKey: string }) => {
        if (sortConfig?.key !== columnKey) return <ArrowUpDown className="w-4 h-4 text-slate-400 opacity-0 group-hover:opacity-50" />;
        if (sortConfig.direction === 'asc') return <ArrowUp className="w-4 h-4 text-primary-600" />;
        return <ArrowDown className="w-4 h-4 text-primary-600" />;
    };

    const renderSortableHeader = (label: string, key: string, align: 'left' | 'right' = 'left') => (
        <th
            scope="col"
            className={`px-6 py-3 text-${align} text-xs font-medium text-slate-500 uppercase tracking-wider cursor-pointer group hover:bg-slate-100 transition-colors select-none`}
            onClick={() => handleSort(key)}
        >
            <div className={`flex items-center gap-1 ${align === 'right' ? 'justify-end' : ''}`}>
                {label}
                <SortIcon columnKey={key} />
            </div>
        </th>
    );

    const handleExport = () => {
        // Flatten data for export
        const dataToExport = projectsWithClient.map(p => ({
            Expediente: p.code,
            Nombre: p.name,
            Cliente: p.clientName,
            Estado: p.status,
            Responsable: p.managerName,
            Inicio: p.startDate,
            Entrega: p.deliveryDate,
            Presupuesto: p.budget,
            Costes: p.costs,
            Ciudad: p.city
        }));
        exportToCSV(dataToExport, `proyectos_${new Date().toISOString().split('T')[0]}`);
    };

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const { parseCSV } = await import('../utils/csvImporter');
            const data = await parseCSV(file);

            // Map CSV columns to Project type
            // Assuming the CSV matches our Export format or has keys: code, name, etc.
            // Let's support the Export format for round-trip:

            const newProjects: Project[] = data.map((row: any) => ({
                id: crypto.randomUUID(),
                code: row['Expediente'] || row['code'] || '',
                name: row['Nombre'] || row['name'] || 'Sin Nombre',
                clientId: '1', // Default to dummy or try to find by name? For now dummy or raw
                // Real mapping would require looking up Client ID by Client Name.
                // Let's try simple name match:
                // clientId: clients.find(c => c.name === row['Cliente'])?.id || '1',
                type: 'REFORMAS', // Default
                managerId: '1',
                status: (row['Estado'] as ProjectStatus) || 'PLANIFICACION',
                startDate: row['Inicio'] || new Date().toISOString(),
                deliveryDate: row['Entrega'] || '',
                budget: Number(row['Presupuesto']) || 0,
                costs: Number(row['Costes']) || 0,
                description: 'Importado vía CSV',
                address: '',
                city: row['Ciudad'] || '',
                createdAt: new Date().toISOString()
            }));

            // Bulk add
            // setData not available, use add

            // Just add new ones? Or overwrite? 
            // Previous logic was overwrite if IDs match or append. 
            // Here we just append.
            for (const p of newProjects) {
                await storage.add('crm_projects', p);
            }
            loadData();
            alert(`Importados ${newProjects.length} proyectos correctamente.`);
        } catch (error) {
            console.error(error);
            alert('Error al importar CSV');
        }

        // Reset input
        e.target.value = '';
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">Proyectos</h1>
                    <p className="text-slate-500">Gestión de obras e instalaciones</p>
                </div>
                <div className="flex gap-2">
                    {user?.role === 'ADMIN' && (
                        <Button variant="outline" onClick={handleExport}>
                            <Download className="w-4 h-4 mr-2" />
                            Exportar CSV
                        </Button>
                    )}
                    {user?.role === 'ADMIN' && (
                        <div className="relative">
                            <input
                                type="file"
                                accept=".csv"
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                onChange={handleImport}
                            />
                            <Button variant="outline">
                                <ArrowDown className="w-4 h-4 mr-2" />
                                Importar CSV
                            </Button>
                        </div>
                    )}
                    <div className="flex bg-slate-100 p-1 rounded-lg">
                        <button
                            onClick={() => setViewMode('kanban')}
                            className={`p-2 rounded-md transition-all ${viewMode === 'kanban' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <Kanban className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-2 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <List className="w-4 h-4" />
                        </button>
                    </div>
                    <Link to="/projects/new">
                        <Button>
                            <Plus className="w-4 h-4 mr-2" />
                            Nuevo Proyecto
                        </Button>
                    </Link>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                    <Input
                        placeholder="Buscar por nombre o cliente..."
                        className="pl-9"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="w-full sm:w-[200px]">
                    <select
                        className="w-full h-10 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                        value={yearFilter}
                        onChange={(e) => setYearFilter(e.target.value)}
                    >
                        <option value="ALL">Todos los años</option>
                        {availableYears.map(year => (
                            <option key={year} value={year}>{year}</option>
                        ))}
                    </select>
                </div>
                <div className="w-full sm:w-[200px]">
                    <select
                        className="w-full h-10 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="ALL">Todos los estados</option>
                        {Object.keys(STATUS_MAP).map(status => (
                            <option key={status} value={status}>{STATUS_MAP[status as ProjectStatus].label}</option>
                        ))}
                    </select>
                </div>
            </div>

            {viewMode === 'kanban' ? (
                <ProjectKanban projects={projectsWithClient} onProjectUpdate={loadData} />
            ) : (
                <div className="bg-white rounded-lg shadow overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                            <tr>
                                {renderSortableHeader('Expediente', 'code')}
                                {renderSortableHeader('Proyecto', 'name')}
                                {renderSortableHeader('Cliente', 'clientName')}
                                {renderSortableHeader('Estado', 'status')}
                                {renderSortableHeader('Responsable', 'managerName')}
                                {renderSortableHeader('Entrega', 'deliveryDate')}
                                {renderSortableHeader('Presupuesto', 'budget', 'right')}
                                <th scope="col" className="relative px-6 py-3"><span className="sr-only">Ver</span></th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-200">
                            {sortedProjects.map((project) => (
                                <tr key={project.id} className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => navigate(`/projects/${project.id}`)}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                                        {project.code}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-slate-900">{project.name}</div>
                                        <div className="text-sm text-slate-500">{project.city}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                        {project.clientName}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {getStatusBadge(project.status)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                        <span className="flex items-center">
                                            <span className="w-2 h-2 rounded-full bg-slate-400 mr-2"></span>
                                            {project.managerName}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                        {project.deliveryDate ? new Date(project.deliveryDate).toLocaleDateString() : '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-slate-900">
                                        {project.budget.toLocaleString()}€
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <div className="flex justify-end gap-2">
                                            <Link to={`/projects/${project.id}`} className="text-primary-600 hover:text-primary-900">
                                                Ver
                                            </Link>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (window.confirm('¿Estás seguro de que deseas eliminar este proyecto? Esta acción no se puede deshacer.')) {
                                                        const runDelete = async () => {
                                                            await storage.deleteProject(project.id);
                                                            loadData();
                                                        };
                                                        runDelete();
                                                    }
                                                }}
                                                className="text-red-500 hover:text-red-700 ml-2"
                                            >
                                                Eliminar
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {filteredProjects.length === 0 && (
                <div className="col-span-full text-center py-12 text-slate-500 bg-white rounded-lg border border-dashed border-slate-300">
                    No se encontraron proyectos
                </div>
            )}
        </div>
    );
}
