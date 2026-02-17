import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { storage } from '../services/storage';
import { Project, Client, Worker, Task, ProjectDocument, Invoice, TimeEntry } from '../types';
import TaskList from '../components/TaskList';
import DocumentList from '../components/DocumentList';
import { Button } from '../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { ArrowLeft, Calendar, MapPin, User, Save, Trash2 } from 'lucide-react';
import { Input } from '../components/ui/Input';
import { ProvinceSelect } from '../components/ui/ProvinceSelect';

export default function ProjectDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [project, setProject] = useState<Project | null>(null);
    const [client, setClient] = useState<Client | null>(null);
    const [manager, setManager] = useState<Worker | null>(null);
    const [workers, setWorkers] = useState<Worker[]>([]);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [documents, setDocuments] = useState<ProjectDocument[]>([]);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);

    // Dropdown Data States
    const [allClients, setAllClients] = useState<Client[]>([]);
    const [allQuotes, setAllQuotes] = useState<any[]>([]); // Using any for Quote to avoid import issues if not defined yet
    const [projectTypes, setProjectTypes] = useState<string[]>([]);

    const [isEditing, setIsEditing] = useState(false);
    const [activeTab, setActiveTab] = useState<'info' | 'financial' | 'time' | 'tasks' | 'docs'>('info');

    // Form State
    const [formData, setFormData] = useState<Partial<Project>>({});

    useEffect(() => {
        const load = async () => {
            // Load Dropdown Data
            const clientsList = await storage.getClients();
            setAllClients(clientsList);
            const quotesList = await storage.getQuotes();
            setAllQuotes(quotesList);
            const typesList = await storage.getProjectTypes();
            setProjectTypes(typesList);

            if (id) {
                if (id === 'new') {
                    setIsEditing(true);
                    const projects = await storage.getProjects();
                    const year = new Date().getFullYear();
                    const nextNum = projects.length + 1;
                    const code = `EXP-${year}-${String(nextNum).padStart(3, '0')}`;

                    setProject({
                        id: crypto.randomUUID(),
                        code,
                        name: '',
                        clientId: '',
                        status: 'PLANIFICACION',
                        type: 'VIVIENDA_UNIFAMILIAR',
                        managerId: '',
                        startDate: new Date().toISOString().split('T')[0],
                        deliveryDate: '',
                        budget: 0,
                        costs: 0,
                        description: '',
                        location: '',
                        address: '',
                        city: '',
                        createdAt: new Date().toISOString()
                    } as Project);
                } else {
                    const projects = await storage.getProjects();
                    const found = projects.find(p => p.id === id);
                    if (found) {
                        setProject(found);
                        setFormData(found);
                        // Use populated list or fetch again? We have them in clientsList now
                        setClient(clientsList.find(c => c.id === found.clientId) || null);

                        // Load relation data
                        const workersData = await storage.getWorkers();
                        setWorkers(workersData);
                        setManager(workersData.find(w => w.id === found.managerId) || null);

                        const allTasks = await storage.getTasks() || [];
                        setTasks(allTasks.filter((t: Task) => t.projectId === id));

                        const allDocs = await storage.getDocuments() || [];
                        setDocuments(allDocs.filter((d: ProjectDocument) => d.projectId === id));

                        const allInvoices = await storage.getInvoices() || [];
                        setInvoices(allInvoices.filter((i: Invoice) => i.projectId === id));

                        const allTime = await storage.getTimeEntries() || [];
                        setTimeEntries(allTime.filter((t: TimeEntry) => t.projectId === id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
                    }
                }
            }
        };
        load();
    }, [id]);

    // Update client object when form client ID changes
    useEffect(() => {
        const updateClient = async () => {
            if (formData.clientId) {
                const clients = await storage.getClients();
                setClient(clients.find(c => c.id === formData.clientId) || null);
            }
        };
        updateClient();
    }, [formData.clientId]);

    if (!project) return <div>Cargando...</div>;

    const handleSave = async () => {
        setIsLoading(true);
        try {
            const dataToSave = { ...project, ...formData };
            // Sanitize dates for DB (Supabase/Postgres doesn't like empty strings for dates)
            if (dataToSave.deliveryDate === '') (dataToSave as any).deliveryDate = null;
            if (dataToSave.startDate === '') (dataToSave as any).startDate = null;

            if (id === 'new') {
                await storage.add('crm_projects', dataToSave);
            } else {
                await storage.update('crm_projects', dataToSave);
            }
            navigate('/projects');
        } catch (error) {
            console.error('Error saving project:', error);
            alert('Error al guardar el proyecto. Por favor, revisa los datos (fechas, etc).');
        } finally {
            setIsLoading(false);
        }
    };

    // Task Handlers
    const handleAddTask = async (taskData: Partial<Task>) => {
        if (!project) return;
        const newTask: Task = {
            id: crypto.randomUUID(),
            projectId: project.id,
            title: taskData.title!,
            description: '',
            status: 'TODO',
            assigneeId: taskData.assigneeId,
            createdAt: new Date().toISOString(),
            ...taskData
        };
        await storage.add('crm_tasks', newTask);
        setTasks([...tasks, newTask]);
    };

    const handleToggleTask = async (taskId: string, status: Task['status']) => {
        const task = tasks.find(t => t.id === taskId);
        if (task) {
            const updated = { ...task, status };
            await storage.update('crm_tasks', updated);
            setTasks(tasks.map(t => t.id === taskId ? updated : t));
        }
    };

    const handleDeleteTask = async (taskId: string) => {
        await storage.remove('crm_tasks', taskId);
        setTasks(tasks.filter(t => t.id !== taskId));
    };

    const handleAddComment = async (taskId: string, text: string) => {
        const task = tasks.find(t => t.id === taskId);
        if (task) {
            const newComment = {
                id: crypto.randomUUID(),
                text,
                authorId: user?.id || '1',
                createdAt: new Date().toISOString()
            };

            const updatedComments = [...(task.comments || []), newComment];
            const updatedTask = { ...task, comments: updatedComments };

            await storage.update('crm_tasks', updatedTask);
            setTasks(tasks.map(t => t.id === taskId ? updatedTask : t));
        }
    };

    // Doc Handlers
    const handleUploadDoc = async () => {
        if (!project) return;
        const mockDoc: ProjectDocument = {
            id: crypto.randomUUID(),
            projectId: project.id,
            name: `Documento Ejemplo ${documents.length + 1}.pdf`,
            url: '#',
            type: 'application/pdf',
            category: 'PLAN',
            uploadDate: new Date().toISOString(),
            size: '2.4 MB'
        };
        await storage.add('crm_documents', mockDoc);
        setDocuments([...documents, mockDoc]);
    };

    const handleDeleteDoc = async (docId: string) => {
        await storage.remove('crm_documents', docId);
        setDocuments(documents.filter(d => d.id !== docId));
    };

    return (
        <div className="space-y-6 max-w-5xl mx-auto pb-10">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm" onClick={() => navigate('/projects')}>
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div>
                        {isEditing ? (
                            <h1 className="text-2xl font-bold text-slate-400">Editando Proyecto...</h1>
                        ) : (
                            <h1 className="text-3xl font-bold text-slate-900">{project.name}</h1>
                        )}
                        {!isEditing && <p className="text-slate-500">{client?.name}</p>}
                    </div>
                </div>
                <div className="flex gap-2">
                </div>
                <div className="flex gap-2">
                    {!isEditing ? (
                        <>
                            <Button
                                variant="ghost"
                                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                onClick={() => {
                                    if (window.confirm('¿Estás seguro de que deseas eliminar este proyecto? Esta acción no se puede deshacer.')) {
                                        storage.deleteProject(project.id);
                                        navigate('/projects');
                                    }
                                }}
                            >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Eliminar
                            </Button>
                            <Button onClick={() => setIsEditing(true)} variant="secondary">Editar</Button>
                        </>
                    ) : (
                        <>
                            <Button variant="ghost" onClick={() => { setIsEditing(false); if (id === 'new') navigate('/projects'); }}>Cancelar</Button>
                            <Button onClick={handleSave} disabled={isLoading}>
                                <Save className="w-4 h-4 mr-2" />
                                {isLoading ? 'Guardando...' : 'Guardar'}
                            </Button>
                        </>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-slate-200">
                <nav className="-mb-px flex space-x-8">
                    {['info', 'financial', 'tasks', 'docs', 'time'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab as any)}
                            className={`
                        whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm capitalize
                        ${activeTab === tab
                                    ? 'border-primary-500 text-primary-600'
                                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}
                    `}
                        >
                            {tab === 'info' ? 'Información General' :
                                tab === 'financial' ? 'Finanzas' :
                                    tab === 'tasks' ? 'Tareas' :
                                        tab === 'docs' ? 'Documentación' :
                                            'Registro de Horas'}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Content */}
            <div className="grid gap-6">
                {activeTab === 'info' && (
                    <Card>
                        <CardHeader><CardTitle>Detalles del Proyecto</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Client Selection */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700">Cliente</label>
                                    {isEditing ? (
                                        <select
                                            className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border p-2"
                                            value={formData.clientId}
                                            onChange={e => {
                                                setFormData({ ...formData, clientId: e.target.value });
                                                // Optional: Reset quote if client changes? Or filter quotes by this client
                                            }}
                                        >
                                            <option value="">Seleccionar Cliente...</option>
                                            {allClients.map(c => (
                                                <option key={c.id} value={c.id}>{c.name}</option>
                                            ))}
                                        </select>
                                    ) : (
                                        <div className="mt-1 flex items-center text-slate-900">
                                            <User className="w-4 h-4 mr-2 text-slate-400" />
                                            {client?.name || 'No Asignado'}
                                        </div>
                                    )}
                                </div>

                                {/* Quote Linking */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700">Presupuesto Vinculado</label>
                                    {isEditing ? (
                                        <select
                                            className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border p-2"
                                            value={formData.linkedQuoteId || ''}
                                            onChange={e => {
                                                const quoteId = e.target.value;
                                                const quote = allQuotes.find(q => q.id === quoteId);
                                                setFormData({
                                                    ...formData,
                                                    linkedQuoteId: quoteId,
                                                    budget: quote ? quote.totalAmount : formData.budget // Auto-update budget
                                                });
                                            }}
                                        >
                                            <option value="">Sin vincular</option>
                                            {allQuotes
                                                .filter(q => q.status === 'ACEPTADO' && (!formData.clientId || q.clientId === formData.clientId))
                                                .map(q => (
                                                    <option key={q.id} value={q.id}>{q.number} - {q.totalAmount.toLocaleString()}€</option>
                                                ))}
                                        </select>
                                    ) : (
                                        <div className="mt-1 text-slate-900">
                                            {(() => {
                                                if (!project.linkedQuoteId) return 'Ninguno';
                                                const q = allQuotes.find(q => q.id === project.linkedQuoteId);
                                                return q ? `${q.number} (${q.totalAmount.toLocaleString()}€)` : 'No encontrado';
                                            })()}
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700">Presupuesto</label>
                                    {isEditing ? (
                                        <div className="mt-1 relative rounded-md shadow-sm">
                                            <Input
                                                type="number"
                                                value={formData.budget || 0}
                                                onChange={e => setFormData({ ...formData, budget: Number(e.target.value) })}
                                                disabled={!!formData.linkedQuoteId} // Weak disable, or maybe allow override? User said "if no quote linked, allow manual". Implicitly suggests if quote linked, take from quote.
                                                className={formData.linkedQuoteId ? "bg-slate-50 text-slate-500" : ""}
                                            />
                                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                                                <span className="text-gray-500 sm:text-sm">€</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="mt-1 text-slate-900 font-bold">{project.budget.toLocaleString()}€</div>
                                    )}
                                    {isEditing && formData.linkedQuoteId && (
                                        <p className="text-xs text-slate-500 mt-1">Vinculado a presupuesto (automático)</p>
                                    )}
                                </div>
                                {/* Type & Status */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700">Expediente</label>
                                    {isEditing ? (
                                        <Input
                                            value={formData.code || ''}
                                            onChange={e => setFormData({ ...formData, code: e.target.value })}
                                            placeholder="EXP-2024-001"
                                        />
                                    ) : (
                                        <div className="mt-1 text-slate-900 font-bold text-lg">{project.code}</div>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700">Nombre del Proyecto</label>
                                    {isEditing ? (
                                        <Input
                                            value={formData.name || ''}
                                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                                            placeholder="Nombre del Proyecto"
                                        />
                                    ) : (
                                        <div className="mt-1 text-slate-900 font-medium">{project.name}</div>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700">Tipo de Proyecto</label>
                                    {isEditing ? (
                                        <select
                                            className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border p-2"
                                            value={formData.type}
                                            onChange={e => setFormData({ ...formData, type: e.target.value as any })}
                                        >
                                            {projectTypes.map(type => (
                                                <option key={type} value={type}>{type}</option>
                                            ))}
                                        </select>
                                    ) : (
                                        <div className="mt-1 text-slate-900 font-medium bg-slate-100 p-2 rounded-md">{formData.type?.replace(/_/g, ' ')}</div>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700">Estado</label>
                                    {isEditing ? (
                                        <select
                                            className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border p-2"
                                            value={formData.status}
                                            onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                                        >
                                            <option value="PLANIFICACION">Planificación</option>
                                            <option value="EN_CURSO">En Curso</option>
                                            <option value="PAUSADO">Pausado</option>
                                            <option value="COMPLETADO">Completado</option>
                                            <option value="ENTREGADO">Entregado</option>
                                            <option value="CANCELADO">Cancelado</option>
                                        </select>
                                    ) : (
                                        <div className="mt-1"><Badge>{project.status}</Badge></div>
                                    )}
                                </div>

                                {/* New Address Fields */}
                                <div className="col-span-1">
                                    <label className="block text-sm font-medium text-slate-700">Dirección</label>
                                    {isEditing ? (
                                        <Input
                                            value={formData.address || ''}
                                            onChange={e => setFormData({ ...formData, address: e.target.value })}
                                            placeholder="Calle Ejemplo 123"
                                        />
                                    ) : (
                                        <div className="mt-1 flex items-start text-slate-900">
                                            <MapPin className="w-5 h-5 text-slate-400 mt-0.5 mr-2" />
                                            <div>
                                                {project.address || '-'}
                                                {(project.zipCode || project.city || project.province) && (
                                                    <>
                                                        <br />
                                                        {project.zipCode} {project.city} {project.province ? `(${project.province})` : ''}
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700">Ciudad</label>
                                    {isEditing ? (
                                        <Input
                                            value={formData.city || ''}
                                            onChange={e => setFormData({ ...formData, city: e.target.value })}
                                            placeholder="Madrid"
                                        />
                                    ) : (
                                        <div className="mt-1 text-slate-900">{project.city || '-'}</div>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700">Provincia</label>
                                    {isEditing ? (
                                        <ProvinceSelect
                                            value={formData.province || ''}
                                            onChange={e => setFormData({ ...formData, province: e.target.value })}
                                        />
                                    ) : (
                                        <div className="mt-1 text-slate-900">{project.province || '-'}</div>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700">Código Postal</label>
                                    {isEditing ? (
                                        <Input
                                            value={formData.zipCode || ''}
                                            onChange={e => setFormData({ ...formData, zipCode: e.target.value })}
                                            placeholder="28001"
                                        />
                                    ) : (
                                        <div className="mt-1 text-slate-900">{project.zipCode || '-'}</div>
                                    )}
                                </div>

                                {/* Manager Selection */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700">Responsable (Managers)</label>
                                    {isEditing ? (
                                        <select
                                            className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border p-2"
                                            value={formData.managerId || ''}
                                            onChange={e => setFormData({ ...formData, managerId: e.target.value })}
                                        >
                                            <option value="">Seleccionar Responsable...</option>
                                            {workers.filter(w => w.role === 'MANAGER' || w.role === 'ADMIN').map(w => (
                                                <option key={w.id} value={w.id}>{w.name} {w.surnames}</option>
                                            ))}
                                        </select>
                                    ) : (
                                        <div className="mt-1 flex items-center text-slate-900">
                                            <User className="w-4 h-4 mr-2 text-slate-400" />
                                            {manager ? `${manager.name} ${manager.surnames || ''}` : 'No Asignado'}
                                        </div>
                                    )}
                                </div>

                                {/* Dates */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700">Fecha Inicio</label>
                                    {isEditing ? (
                                        <Input
                                            type="date"
                                            value={formData.startDate || ''}
                                            onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                                        />
                                    ) : (
                                        <div className="mt-1 flex items-center text-slate-900"><Calendar className="w-4 h-4 mr-2 text-slate-400" /> {project.startDate}</div>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700">Fecha Entrega (Opcional)</label>
                                    {isEditing ? (
                                        <Input
                                            type="date"
                                            value={formData.deliveryDate || ''}
                                            onChange={e => setFormData({ ...formData, deliveryDate: e.target.value })}
                                        />
                                    ) : (
                                        <div className="mt-1 flex items-center text-slate-900"><FlagIcon /> {project.deliveryDate}</div>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700">Fecha Creación</label>
                                    {isEditing ? (
                                        <Input
                                            disabled
                                            className="bg-slate-100 text-slate-500 cursor-not-allowed"
                                            type="date"
                                            value={formData.createdAt ? new Date(formData.createdAt).toISOString().split('T')[0] : ''}
                                            onChange={() => { }} // Read-only
                                        />
                                    ) : (
                                        <div className="mt-1 flex items-center text-slate-900">
                                            <Calendar className="w-4 h-4 mr-2 text-slate-400" />
                                            {new Date(project.createdAt).toLocaleDateString()}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="mt-4">
                                <label className="block text-sm font-medium text-slate-700">Descripción</label>
                                {isEditing ? (
                                    <textarea
                                        className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border p-2"
                                        rows={4}
                                        value={formData.description || ''}
                                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    />
                                ) : (
                                    <p className="mt-1 text-slate-900 whitespace-pre-wrap">{project.description}</p>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {activeTab === 'financial' && (
                    <Card>
                        <CardContent className="pt-6">
                            <div className="grid grid-cols-2 gap-8">
                                <div className="bg-slate-50 p-6 rounded-lg text-center">
                                    <p className="text-sm text-slate-500 uppercase tracking-wide">Presupuesto</p>
                                    <p className="text-4xl font-bold text-slate-900 mt-2">{project.budget.toLocaleString()}€</p>
                                </div>
                                <div className="bg-slate-50 p-6 rounded-lg text-center">
                                    <p className="text-sm text-slate-500 uppercase tracking-wide">Costes Reales</p>
                                    <p className={`text-4xl font-bold mt-2 ${project.costs && project.costs > project.budget ? 'text-red-500' : 'text-slate-900'}`}>
                                        {(project.costs || 0).toLocaleString()}€
                                    </p>
                                    {project.costs && project.costs > project.budget && <span className="text-xs text-red-500 font-medium">SOBRECOSTE</span>}
                                </div>
                            </div>

                            <div className="mt-8 border-t pt-8">
                                <h3 className="text-lg font-medium text-slate-900 mb-4">Facturación</h3>
                                {invoices.length === 0 ? (
                                    <div className="text-center py-8 text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                                        No hay facturas emitidas para este proyecto.
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm text-left">
                                            <thead className="text-xs text-slate-500 uppercase bg-slate-50">
                                                <tr>
                                                    <th className="px-4 py-2">Número</th>
                                                    <th className="px-4 py-2">Fecha</th>
                                                    <th className="px-4 py-2">Estado</th>
                                                    <th className="px-4 py-2 text-right">Importe</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {invoices.map(inv => (
                                                    <tr key={inv.id} className="border-b last:border-0 hover:bg-slate-50">
                                                        <td className="px-4 py-3 font-medium">{inv.number}</td>
                                                        <td className="px-4 py-3 text-slate-500">{new Date(inv.date).toLocaleDateString()}</td>
                                                        <td className="px-4 py-3">
                                                            <Badge variant={inv.status === 'PAGADA' ? 'success' : inv.status === 'VENCIDA' ? 'danger' : 'warning'}>
                                                                {inv.status}
                                                            </Badge>
                                                        </td>
                                                        <td className="px-4 py-3 text-right font-medium">{inv.totalAmount.toLocaleString()}€</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {activeTab === 'tasks' && (
                    <TaskList
                        tasks={tasks}
                        workers={workers}
                        onAddTask={handleAddTask}
                        onToggleStatus={handleToggleTask}
                        onDeleteTask={handleDeleteTask}
                        onAddComment={handleAddComment}
                    />
                )}

                {activeTab === 'docs' && (
                    <DocumentList
                        documents={documents}
                        onUpload={handleUploadDoc}
                        onDelete={handleDeleteDoc}
                    />
                )}

                {activeTab === 'time' && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Registro de Horas</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center bg-slate-50 p-4 rounded-lg">
                                    <div>
                                        <p className="text-sm text-slate-500">Total Horas</p>
                                        <p className="text-2xl font-bold text-slate-900">{timeEntries.reduce((acc, curr) => acc + curr.hours, 0)}h</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-slate-500">Coste Total</p>
                                        <p className="text-2xl font-bold text-slate-900">
                                            {timeEntries.reduce((acc, curr) => acc + (curr.hours * (curr.hourlyRateSnapshot || 0)), 0).toLocaleString()}€
                                        </p>
                                    </div>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead className="text-xs text-slate-500 uppercase bg-slate-50">
                                            <tr>
                                                <th className="px-4 py-3">Fecha</th>
                                                <th className="px-4 py-3">Trabajador</th>
                                                <th className="px-4 py-3">Tarea</th>
                                                <th className="px-4 py-3">Descripción</th>
                                                <th className="px-4 py-3 text-right">Horas</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {timeEntries.map(entry => (
                                                <tr key={entry.id} className="border-b border-slate-100 hover:bg-slate-50">
                                                    <td className="px-4 py-3">{new Date(entry.date).toLocaleDateString()}</td>
                                                    <td className="px-4 py-3 font-medium">
                                                        {workers.find(w => w.id === entry.workerId)?.name || 'Usuario'}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex flex-col items-start gap-1">
                                                            <Badge variant="secondary">{entry.taskType}</Badge>
                                                            {(entry.taskType === 'Diseño' || entry.taskType === 'DISEÑO') && entry.subCategory && (
                                                                <span className="text-[10px] text-slate-500 font-medium px-1.5 py-0.5 bg-slate-100 rounded-full border border-slate-200">
                                                                    {entry.subCategory}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-slate-600 truncate max-w-[200px]" title={entry.description}>{entry.description}</td>
                                                    <td className="px-4 py-3 text-right font-bold">{entry.hours}</td>
                                                </tr>
                                            ))}
                                            {timeEntries.length === 0 && (
                                                <tr>
                                                    <td colSpan={5} className="text-center py-8 text-slate-500">No hay horas registradas en este proyecto.</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}

const FlagIcon = () => {
    // Simple logic to show red flag if close to date (mock logic)
    return <Calendar className="w-4 h-4 mr-2 text-primary-500" />
}
