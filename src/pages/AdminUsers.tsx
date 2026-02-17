import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { storage } from '../services/storage';
import { Worker } from '../types';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { supabase } from '../services/supabase';
import { Plus, Shield } from 'lucide-react';

export default function AdminUsers() {
    const { user } = useAuth();
    const [workers, setWorkers] = useState<Worker[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        surnames: '',
        email: '',
        password: '',
        role: 'WORKER',
        hourlyRate: 0
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        loadWorkers();
    }, []);

    const loadWorkers = async () => {
        setIsLoading(true);
        try {
            const data = await storage.getWorkers();
            setWorkers(data);
        } catch (error) {
            console.error('Error loading workers:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            // Call Edge Function
            const { error } = await supabase.functions.invoke('create-user', {
                body: {
                    email: formData.email,
                    password: formData.password,
                    userData: {
                        name: formData.name,
                        surnames: formData.surnames,
                        role: formData.role,
                        hourlyRate: Number(formData.hourlyRate)
                    }
                }
            });

            if (error) throw error;

            alert('Usuario creado correctamente');
            setShowForm(false);
            setFormData({
                name: '',
                surnames: '',
                email: '',
                password: '',
                role: 'WORKER',
                hourlyRate: 0
            });
            loadWorkers();

        } catch (error: any) {
            console.error('Error creating user:', error);
            alert(`Error: ${error.message || 'No se pudo crear el usuario'}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (user?.role !== 'ADMIN') {
        return (
            <div className="p-8 text-center text-slate-500">
                <Shield className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                <p>No tienes permisos para ver esta página.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">Gestión de Usuarios</h1>
                <Button onClick={() => setShowForm(!showForm)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Nuevo Usuario
                </Button>
            </div>

            {showForm && (
                <Card className="animate-in fade-in slide-in-from-top-4 mb-6 border-primary-100 ring-4 ring-primary-50">
                    <CardHeader>
                        <CardTitle className="text-lg">Crear Nuevo Usuario</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleCreateUser} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Input
                                    label="Nombre"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    required
                                />
                                <Input
                                    label="Apellidos"
                                    value={formData.surnames}
                                    onChange={e => setFormData({ ...formData, surnames: e.target.value })}
                                />
                                <Input
                                    label="Email"
                                    type="email"
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    required
                                />
                                <Input
                                    label="Contraseña Inicial"
                                    type="password"
                                    value={formData.password}
                                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                                    required
                                    minLength={6}
                                />
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Rol</label>
                                    <select
                                        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:ring-primary-500"
                                        value={formData.role}
                                        onChange={e => setFormData({ ...formData, role: e.target.value })}
                                    >
                                        <option value="WORKER">Trabajador</option>
                                        <option value="MANAGER">Manager</option>
                                        <option value="ADMIN">Administrador</option>
                                    </select>
                                </div>
                                <Input
                                    label="Tarifa Hora (€)"
                                    type="number"
                                    value={formData.hourlyRate}
                                    onChange={e => setFormData({ ...formData, hourlyRate: Number(e.target.value) })}
                                />
                            </div>
                            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                                <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>Cancelar</Button>
                                <Button type="submit" isLoading={isSubmitting}>Crear Usuario</Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            )}

            {isLoading && <p className="text-center py-8 text-slate-500">Cargando usuarios...</p>}

            {!isLoading && <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {workers.map(worker => (
                    <Card key={worker.id} className="group hover:shadow-md transition-shadow">
                        <CardContent className="p-6">
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-lg">
                                        {worker.avatarUrl ? (
                                            <img src={worker.avatarUrl} alt={worker.name} className="w-12 h-12 rounded-full object-cover" />
                                        ) : (
                                            worker.name.charAt(0)
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-900">{worker.name} {worker.surnames}</h3>
                                        <p className="text-sm text-slate-500">{worker.email}</p>
                                    </div>
                                </div>
                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${worker.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' :
                                    worker.role === 'MANAGER' ? 'bg-blue-100 text-blue-700' :
                                        'bg-slate-100 text-slate-700'
                                    }`}>
                                    {worker.role}
                                </span>
                            </div>

                            <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center text-sm text-slate-500">
                                <span>{worker.active ? 'Activo' : 'Inactivo'}</span>
                                {worker.joinedDate && <span>Desde {new Date(worker.joinedDate).toLocaleDateString()}</span>}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>}
        </div>
    );
}
