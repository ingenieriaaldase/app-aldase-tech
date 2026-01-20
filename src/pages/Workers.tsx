import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { storage } from '../services/storage';
import { Worker, Role } from '../types';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { UserCircle, DollarSign, Phone, Mail, X, Edit, Trash2 } from 'lucide-react';

export default function Workers() {
    const { user } = useAuth();
    const [workers, setWorkers] = useState<Worker[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingWorker, setEditingWorker] = useState<Partial<Worker> | null>(null);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        surnames: '',
        role: 'WORKER' as Role,
        email: '',
        phone: '',
        hourlyRate: 0
    });

    useEffect(() => {
        setWorkers(storage.getWorkers());
    }, []);

    const handleOpenModal = (worker?: Worker) => {
        if (worker) {
            setEditingWorker(worker);
            setFormData({
                name: worker.name,
                surnames: worker.surnames || '',
                role: worker.role,
                email: worker.email,
                phone: worker.phone,
                hourlyRate: worker.hourlyRate
            });
        } else {
            setEditingWorker(null);
            setFormData({
                name: '',
                surnames: '',
                role: 'WORKER',
                email: '',
                phone: '',
                hourlyRate: 0
            });
        }
        setIsModalOpen(true);
    };

    const handleSave = () => {
        if (!formData.name || !formData.email) return;

        if (editingWorker && editingWorker.id) {
            // Update
            const updated: Worker = {
                ...editingWorker as Worker,
                ...formData,
                hourlyRate: Number(formData.hourlyRate)
            };
            storage.update('crm_workers', updated);
        } else {
            // Create
            const newWorker: Worker = {
                id: crypto.randomUUID(),
                ...formData,
                hourlyRate: Number(formData.hourlyRate),
                joinedDate: new Date().toISOString(),
                active: true,
                avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.name + ' ' + formData.surnames)}&background=random`
            };
            storage.add('crm_workers', newWorker);
        }

        setWorkers(storage.getWorkers());
        setIsModalOpen(false);
    };

    const handleDelete = (id: string) => {
        if (window.confirm('¿Estás seguro de que quieres eliminar este trabajador?')) {
            storage.remove('crm_workers', id);
            setWorkers(storage.getWorkers());
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">Trabajadores</h1>
                {user?.role === 'ADMIN' && (
                    <Button onClick={() => handleOpenModal()}>
                        <UserCircle className="w-4 h-4 mr-2" />
                        Invitar Trabajador
                    </Button>
                )}
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {workers.map((worker) => (
                    <Card key={worker.id} className="group hover:shadow-md transition-shadow">
                        <CardContent className="p-6">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center space-x-4">
                                    {worker.avatarUrl ? (
                                        <img src={worker.avatarUrl} alt={worker.name} className="w-12 h-12 rounded-full" />
                                    ) : (
                                        <div className="w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center">
                                            <UserCircle className="w-6 h-6 text-slate-500" />
                                        </div>
                                    )}
                                    <div>
                                        <h3 className="font-semibold text-lg text-slate-900 leading-tight">
                                            {worker.name} {worker.surnames}
                                        </h3>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 capitalize">
                                                {worker.role.toLowerCase()}
                                            </span>
                                            {worker.role === 'ADMIN' && <span className="text-[10px] bg-red-100 text-red-700 px-1 rounded border border-red-200">ADMIN</span>}
                                        </div>
                                    </div>
                                </div>
                                {user?.role === 'ADMIN' && (
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => handleOpenModal(worker)} className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded">
                                            <Edit className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => handleDelete(worker.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-3 pt-2 border-t border-slate-100">
                                {user?.role === 'ADMIN' && (
                                    <div className="flex items-center justify-between text-sm">
                                        <div className="flex items-center text-slate-600">
                                            <DollarSign className="w-4 h-4 mr-2" />
                                            Tarifa/Hora
                                        </div>
                                        <span className="font-medium">{worker.hourlyRate} €</span>
                                    </div>
                                )}

                                <div className="flex items-center text-sm text-slate-600">
                                    <Mail className="w-4 h-4 mr-2 text-slate-400" />
                                    <span className="truncate">{worker.email}</span>
                                </div>
                                <div className="flex items-center text-sm text-slate-600">
                                    <Phone className="w-4 h-4 mr-2 text-slate-400" />
                                    {worker.phone || '-'}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Modal Overlay */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center p-4 border-b">
                            <h2 className="text-lg font-semibold">{editingWorker ? 'Editar Trabajador' : 'Invitar Trabajador'}</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-4 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Nombre</label>
                                    <Input
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="Juan"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Apellidos</label>
                                    <Input
                                        value={formData.surnames}
                                        onChange={e => setFormData({ ...formData, surnames: e.target.value })}
                                        placeholder="Pérez"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                                <Input
                                    type="email"
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    placeholder="juan@ejemplo.com"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Teléfono</label>
                                    <Input
                                        value={formData.phone}
                                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                        placeholder="+34 600..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Rol</label>
                                    <select
                                        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                                        value={formData.role}
                                        onChange={e => setFormData({ ...formData, role: e.target.value as Role })}
                                    >
                                        <option value="WORKER">Trabajador</option>
                                        <option value="MANAGER">Manager</option>
                                        <option value="ADMIN">Admin</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Tarifa Hora (€)</label>
                                <Input
                                    type="number"
                                    value={formData.hourlyRate}
                                    onChange={e => setFormData({ ...formData, hourlyRate: Number(e.target.value) })}
                                />
                            </div>
                        </div>
                        <div className="p-4 border-t bg-slate-50 flex justify-end gap-2 rounded-b-lg">
                            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                            <Button onClick={handleSave}>Guardar</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
