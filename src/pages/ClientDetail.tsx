import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom'; // Added Link
import { storage } from '../services/storage';
import { Client, Project, ClientType } from '../types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { ArrowLeft, Save, Trash2, User, Mail, Phone, MapPin, Calendar, Edit2, Plus } from 'lucide-react'; // Added icons
import { Badge } from '../components/ui/Badge'; // Added Badge
import { ProvinceSelect } from '../components/ui/ProvinceSelect';

export default function ClientDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    // Mode State
    const [isEditing, setIsEditing] = useState(false);
    const [isNew, setIsNew] = useState(false);

    // Data State
    const [client, setClient] = useState<Client | null>(null);
    const [projects, setProjects] = useState<Project[]>([]);

    // Form State
    const [formData, setFormData] = useState<Partial<Client>>({});

    useEffect(() => {
        const load = async () => {
            if (id === 'new') {
                setIsNew(true);
                setIsEditing(true);
                setFormData({
                    id: crypto.randomUUID(),
                    name: '',
                    cif: '',
                    address: '',
                    contactName: '',
                    email: '',
                    phone: '',
                    notes: '',
                    createdAt: new Date().toISOString(),
                    city: '',
                    province: '',
                    zipCode: '',
                    type: 'PARTICULAR'
                });
            } else if (id) {
                const clients = await storage.getClients();
                const found = clients.find(c => c.id === id);
                if (found) {
                    setClient(found);
                    setFormData(found);
                    // Fetch projects
                    const allProjects = await storage.getProjects();
                    setProjects(allProjects.filter(p => p.clientId === id));
                }
            }
        };
        load();
    }, [id]);

    const handleSubmit = async () => {
        if (isNew) {
            await storage.add('crm_clients', formData as Client);
            navigate('/clients');
        } else {
            // Update not implemented as simple method yet, usually put/upsert.
            // Assuming storage.update exists or we mock it via add (upsert)
            // But checking storage.ts, 'update' method might be missing or different.
            // Let's check storage.ts content previously viewed... 'update' was generic.
            await storage.update('crm_clients', formData as Client);
            setClient(formData as Client);
            setIsEditing(false);
        }
    };

    const handleDelete = async () => {
        if (confirm('¿Seguro que quieres eliminar este cliente?')) {
            await storage.remove('crm_clients', formData.id!);
            navigate('/clients');
        }
    }

    if (!client && !isNew) return <div>Cargando...</div>;

    // Edit Form View
    if (isEditing) {
        return (
            <div className="max-w-3xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <Button variant="ghost" onClick={() => isNew ? navigate('/clients') : setIsEditing(false)}>
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        {isNew ? 'Cancelar' : 'Volver al Detalle'}
                    </Button>
                    <h1 className="text-2xl font-bold">{isNew ? 'Nuevo Cliente' : 'Editar Cliente'}</h1>
                    {!isNew && (
                        <Button variant="danger" size="sm" onClick={handleDelete}><Trash2 className="w-4 h-4" /></Button>
                    )}
                </div>

                <Card>
                    <CardContent className="pt-6">
                        <div className="space-y-4">
                            <Input
                                label="Nombre Fiscal / Empresa"
                                value={formData.name || ''}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                required
                            />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Input
                                    label="CIF"
                                    value={formData.cif || ''}
                                    onChange={e => setFormData({ ...formData, cif: e.target.value })}
                                    required
                                />
                                <Input
                                    label="Persona de Contacto"
                                    value={formData.contactName || ''}
                                    onChange={e => setFormData({ ...formData, contactName: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Input
                                    label="Email"
                                    type="email"
                                    value={formData.email || ''}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                />
                                <Input
                                    label="Teléfono"
                                    value={formData.phone || ''}
                                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                />
                            </div>

                            <Input
                                label="Dirección"
                                value={formData.address || ''}
                                onChange={e => setFormData({ ...formData, address: e.target.value })}
                            />

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Input
                                    label="Ciudad"
                                    value={formData.city || ''}
                                    onChange={e => setFormData({ ...formData, city: e.target.value })}
                                />
                                <Input
                                    label="Ciudad"
                                    value={formData.city || ''}
                                    onChange={e => setFormData({ ...formData, city: e.target.value })}
                                />
                                <ProvinceSelect
                                    label="Provincia"
                                    value={formData.province || ''}
                                    onChange={e => setFormData({ ...formData, province: e.target.value })}
                                />
                                <Input
                                    label="Código Postal"
                                    value={formData.zipCode || ''}
                                    onChange={e => setFormData({ ...formData, zipCode: e.target.value })}
                                />
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de Cliente</label>
                                    <select
                                        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                                        value={formData.type || 'PARTICULAR'}
                                        onChange={e => setFormData({ ...formData, type: e.target.value as ClientType })}
                                    >
                                        <option value="PARTICULAR">Particular</option>
                                        <option value="ARQUITECTURA">Estudio Arquitectura</option>
                                        <option value="PROMOTOR">Promotor</option>
                                        <option value="CONSTRUCTORA">Constructora</option>
                                        <option value="INSTALADORA">Instaladora</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-medium text-slate-700">Notas</label>
                                <textarea
                                    className="w-full min-h-[100px] rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    value={formData.notes || ''}
                                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                />
                            </div>

                            <div className="flex justify-end pt-4 gap-2">
                                <Button variant="ghost" onClick={() => isNew ? navigate('/clients') : setIsEditing(false)}>Cancelar</Button>
                                <Button onClick={handleSubmit}>
                                    <Save className="w-4 h-4 mr-2" />
                                    Guardar Cliente
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Detail View
    return (
        <div className="space-y-6 max-w-6xl mx-auto pb-10">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm" onClick={() => navigate('/clients')}>
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">{client!.name}</h1>
                        <p className="text-slate-500">CIF: {client!.cif}</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" className="text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200" onClick={handleDelete}>
                        Eliminar
                    </Button>
                    <Button variant="secondary" onClick={() => setIsEditing(true)}>
                        <Edit2 className="w-4 h-4 mr-2" />
                        Editar
                    </Button>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                {/* Client Info */}
                <Card className="md:col-span-1 h-fit">
                    <CardHeader>
                        <CardTitle>Datos de Contacto</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-start gap-3">
                            <User className="w-5 h-5 text-slate-400 mt-0.5" />
                            <div>
                                <p className="text-sm font-medium text-slate-500">Contacto</p>
                                <p className="text-slate-900">{client!.contactName}</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <Mail className="w-5 h-5 text-slate-400 mt-0.5" />
                            <div>
                                <p className="text-sm font-medium text-slate-500">Email</p>
                                <a href={`mailto:${client!.email}`} className="text-primary-600 hover:underline">{client!.email}</a>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <Phone className="w-5 h-5 text-slate-400 mt-0.5" />
                            <div>
                                <p className="text-sm font-medium text-slate-500">Teléfono</p>
                                <p className="text-slate-900">{client!.phone}</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <MapPin className="w-5 h-5 text-slate-400 mt-0.5" />
                            <div>
                                <p className="text-sm font-medium text-slate-500">Dirección</p>
                                <p className="text-slate-900">
                                    {client!.address}<br />
                                    {client!.zipCode} {client!.city} ({client!.province})
                                </p>
                            </div>
                        </div>
                        {client!.notes && (
                            <div className="pt-4 border-t border-slate-100">
                                <p className="text-sm text-slate-500 mb-1">Notas</p>
                                <p className="text-sm text-slate-700 whitespace-pre-wrap">{client!.notes}</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Projects List */}
                <Card className="md:col-span-2">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Proyectos Asociados</CardTitle>
                        <Link to="/projects/new">
                            <Button size="sm" variant="outline">
                                <Plus className="w-4 h-4 mr-2" />
                                Nuevo Proyecto
                            </Button>
                        </Link>
                    </CardHeader>
                    <CardContent>
                        {projects.length === 0 ? (
                            <div className="text-center py-10 text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                                Este cliente no tiene proyectos activos.
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {projects.map((project) => (
                                    <div key={project.id} className="flex items-center justify-between p-4 rounded-lg border border-slate-200 hover:border-primary-200 transition-colors bg-white">
                                        <div>
                                            <Link to={`/projects/${project.id}`} className="font-semibold text-lg text-slate-900 hover:text-primary-600">
                                                {project.name}
                                            </Link>
                                            <div className="flex items-center gap-4 mt-1 text-sm text-slate-500">
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="w-4 h-4" />
                                                    {project.startDate}
                                                </span>
                                                <span>{project.type.replace(/_/g, ' ')}</span>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-2">
                                            <Badge>{project.status}</Badge>
                                            <span className="text-sm font-medium text-slate-700">{project.budget.toLocaleString()}€</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
