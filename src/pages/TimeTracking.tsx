import React, { useState, useEffect } from 'react';
import { storage } from '../services/storage';
import { Project, TimeEntry, Worker, TaskType } from '../types';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Plus, Download, Trash2, Pencil, X } from 'lucide-react';



export default function TimeTracking() {
    const { user } = useAuth();
    const [entries, setEntries] = useState<TimeEntry[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [workers, setWorkers] = useState<Worker[]>([]);
    const [taskCategories, setTaskCategories] = useState<string[]>([]);
    const [designCategories, setDesignCategories] = useState<string[]>([]);

    // New Entry Form State
    const [projectId, setProjectId] = useState('');
    const [taskType, setTaskType] = useState<string>(''); // Default empty to force selection
    const [subCategory, setSubCategory] = useState('');
    const [hours, setHours] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [description, setDescription] = useState('');

    // Editing State
    const [editingId, setEditingId] = useState<string | null>(null);

    useEffect(() => {
        const loadData = async () => {
            const [loadedEntries, loadedProjects, loadedWorkers, loadedTaskCats, loadedDesignCats] = await Promise.all([
                storage.getTimeEntries(),
                storage.getProjects(),
                storage.getWorkers(),
                storage.getTaskCategories(),
                storage.getDesignCategories()
            ]);
            setEntries(loadedEntries.reverse());
            setProjects(loadedProjects.filter(p => p.status === 'EN_CURSO' || p.status === 'PLANIFICACION'));
            setWorkers(loadedWorkers);
            setTaskCategories(loadedTaskCats);
            setDesignCategories(loadedDesignCats);
        };
        loadData();
    }, []);

    const resetForm = () => {
        setProjectId('');
        setHours('');
        setDescription('');
        setSubCategory('');
        setTaskType('');
        // Keep date? Or reset to today? Keep today used
        setEditingId(null);
    };

    const handleEdit = (entry: TimeEntry) => {
        setEditingId(entry.id);
        setProjectId(entry.projectId || '');
        setTaskType(entry.taskType);
        setSubCategory(entry.subCategory || '');
        setHours(entry.hours.toString());
        setDate(new Date(entry.date).toISOString().split('T')[0]);
        setDescription(entry.description || '');

        // Scroll to form
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const cancelEdit = () => {
        if (window.confirm('¿Cancelar edición y limpiar formulario?')) {
            resetForm();
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!user) {
            alert('Error: No hay usuario autenticado. Por favor, inicia sesión.');
            return;
        }

        if (!taskType) {
            alert('Por favor, selecciona un tipo de tarea.');
            return;
        }

        // Validate that the current user exists in the workers list (DB)
        // If editing, user might be admin editing someone else's? 
        // For now, assume user edits their own or admin edits any.
        // But validation should check if 'user' context is valid.
        const worker = workers.find(w => w.id === user.id);
        if (!worker) {
            alert(`Error de integridad: El usuario actual (ID: ${user.id}) no se encuentra en la lista de trabajadores activos. Por favor, cierra sesión e inicia de nuevo.`);
            return;
        }

        try {
            // If editing, we keep the original worker info unless we want to change it?
            // The constraint is: user can only register for themselves?
            // For now, simpler: Entry owner remains. If creating, it's current user.

            let entryToSave: TimeEntry;

            if (editingId) {
                // We need the original entry to preserve ID and maybe workerID if Admin edits 
                const original = entries.find(e => e.id === editingId);
                if (!original) throw new Error('Registro original no encontrado');

                entryToSave = {
                    ...original,
                    projectId: projectId || undefined,
                    taskType,
                    subCategory: taskType.toLowerCase().includes('diseño') ? subCategory : undefined,
                    date,
                    hours: Number(hours),
                    description,
                    // Do NOT update hourlyRateSnapshot on edit? Or yes? 
                    // Usually rates are fixed at creation. Let's keep original unless explicitly changing.
                };

                await storage.update('crm_time_entries', entryToSave);
                alert('Registro actualizado correctamente.');
            } else {
                // CREATE
                const hourlyRate = worker.hourlyRate;
                entryToSave = {
                    id: crypto.randomUUID(),
                    workerId: user.id,
                    projectId: projectId || undefined,
                    taskType,
                    subCategory: taskType.toLowerCase().includes('diseño') ? subCategory : undefined,
                    date,
                    hours: Number(hours),
                    description,
                    hourlyRateSnapshot: hourlyRate
                };
                await storage.add('crm_time_entries', entryToSave);
                alert('Horas registradas correctamente.');
            }

            resetForm();

            // Reload entries to show the new one immediately
            const updatedEntries = await storage.getTimeEntries();
            setEntries(updatedEntries.reverse());

        } catch (error: any) {
            console.error('Error saving hours:', error);
            alert(`Error al guardar: ${error.message || JSON.stringify(error)}`);
        }
    };

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!user) {
            alert('Debes iniciar sesión');
            return;
        }

        try {
            const { parseCSV } = await import('../utils/csvImporter');
            const data = await parseCSV(file);

            // Expected headers: Date, Project, Task, Hours... or similar mapping
            const newEntries: TimeEntry[] = data.map((row: any) => ({
                id: crypto.randomUUID(),
                workerId: user.id, // Assign to current user for safety, or try to map 'Worker' column if Admin
                // If mapping worker, we need to find worker ID by name. 
                // For now, let's keep it simple: Import as current user.
                projectId: projects.find(p => p.name === (row['Project'] || row['Proyecto']))?.id || projects[0]?.id || '',
                taskType: (row['Task'] || row['Tarea'] || 'OTROS') as TaskType,
                date: row['Date'] || row['Fecha'] || new Date().toISOString().split('T')[0],
                hours: Number(row['Hours'] || row['Horas']) || 0,
                description: row['Description'] || row['Descripción'] || 'Importado',
                hourlyRateSnapshot: 0
            }));


            // Bulk add is not supported by single 'add' wrapper, need to iterate or change 'add' to support array
            // Supabase supports bulk insert. Storage.add does not map well.
            // For now, let's insert one by one or create a bulkAdd method. 
            // Or just iterate:
            for (const entry of newEntries) {
                await storage.add('crm_time_entries', entry);
            }

            const updated = await storage.getTimeEntries();
            setEntries(updated.reverse());
            alert(`Importadas ${newEntries.length} entradas de tiempo.`);
        } catch (error) {
            console.error(error);
            alert('Error al importar CSV');
        }
        e.target.value = '';
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('¿Estás seguro de que deseas eliminar este registro?')) return;

        try {
            await storage.remove('crm_time_entries', id);
            setEntries(entries.filter(e => e.id !== id));
        } catch (error) {
            console.error('Error deleting entry:', error);
            alert('Error al eliminar el registro');
        }
    };

    const getProjectName = (id?: string) => {
        if (!id) return 'General / Sin Proyecto';
        return projects.find(p => p.id === id)?.name || 'Proyecto Desconocido';
    };
    const getWorkerName = (id: string) => workers.find(w => w.id === id)?.name || 'Usuario';

    return (
        <div className="space-y-8 animate-fade-in" >
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">Registro de Horas</h1>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => alert('Función de exportar CSV simulada')}>
                        <Download className="w-4 h-4 mr-2" />
                        Exportar CSV
                    </Button>
                    <div className="relative">
                        <input
                            type="file"
                            accept=".csv"
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            onChange={handleImport}
                        />
                        <Button variant="outline">
                            <Download className="w-4 h-4 mr-2 rotate-180" />
                            Importar CSV
                        </Button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Entry Form */}
                <Card className="lg:col-span-1 h-fit">
                    <CardHeader>
                        <CardTitle>{editingId ? 'Editar Entrada' : 'Nueva Entrada'}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Proyecto</label>
                                <select
                                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:ring-primary-500"
                                    value={projectId}
                                    onChange={e => setProjectId(e.target.value)}
                                >
                                    <option value="">-- General / Sin Proyecto --</option>
                                    {projects.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de Tarea</label>
                                <select
                                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:ring-primary-500"
                                    value={taskType}
                                    onChange={e => setTaskType(e.target.value as TaskType)}
                                    required
                                >
                                    <option value="">-- Seleccionar Tarea --</option>
                                    {taskCategories.map((t: string) => (
                                        <option key={t} value={t}>{t}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Design Sub-category */}
                            {taskType && taskType.toLowerCase().includes('diseño') && (
                                <div className="animate-fade-in">
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Especialidad de Diseño</label>
                                    <select
                                        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:ring-primary-500"
                                        value={subCategory}
                                        onChange={e => setSubCategory(e.target.value)}
                                    >
                                        <option value="">Seleccionar Especialidad...</option>
                                        {designCategories.map((c: string) => (
                                            <option key={c} value={c}>{c}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <Input
                                    label="Fecha"
                                    type="date"
                                    value={date}
                                    onChange={e => setDate(e.target.value)}
                                    required
                                />
                                <Input
                                    label="Horas"
                                    type="number"
                                    step="0.5"
                                    min="0"
                                    value={hours}
                                    onChange={e => setHours(e.target.value)}
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Descripción</label>
                                <textarea
                                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                                    rows={3}
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                />
                            </div>

                            <div className="flex gap-2">
                                {editingId && (
                                    <Button type="button" variant="ghost" onClick={cancelEdit} className="flex-1">
                                        <X className="w-4 h-4 mr-2" />
                                        Cancelar
                                    </Button>
                                )}
                                <Button type="submit" className="flex-1">
                                    {editingId ? <Pencil className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                                    {editingId ? 'Actualizar' : 'Registrar'}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>

                {/* List */}
                <Card className="lg:col-span-2">
                    <CardHeader><CardTitle>Historial Reciente</CardTitle></CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-slate-500 uppercase bg-slate-50">
                                    <tr>
                                        <th className="px-4 py-3">Fecha</th>
                                        <th className="px-4 py-3">Trabajador</th>
                                        <th className="px-4 py-3">Proyecto</th>
                                        <th className="px-4 py-3">Tarea</th>
                                        <th className="px-4 py-3 text-right">Horas</th>
                                        <th className="px-4 py-3 text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {entries.map(entry => (
                                        <tr key={entry.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                                            <td className="px-4 py-3">{new Date(entry.date).toLocaleDateString()}</td>
                                            <td className="px-4 py-3 font-medium">{getWorkerName(entry.workerId)}</td>
                                            <td className="px-4 py-3 text-slate-600">{getProjectName(entry.projectId)}</td>
                                            <td className="px-4 py-3">
                                                <div className="flex flex-col gap-1 items-start">
                                                    <Badge variant="secondary">{entry.taskType}</Badge>
                                                    {entry.subCategory && <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{entry.subCategory}</span>}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-right font-bold">{entry.hours}</td>
                                            <td className="px-4 py-3 text-right">
                                                <div className="flex justify-end gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-slate-400 hover:text-blue-500 hover:bg-blue-50 h-8 w-8 p-0"
                                                        onClick={() => handleEdit(entry)}
                                                    >
                                                        <Pencil className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-slate-400 hover:text-red-500 hover:bg-red-50 h-8 w-8 p-0"
                                                        onClick={() => handleDelete(entry.id)}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {entries.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="text-center py-8 text-slate-500">No hay registros de horas aún.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div >
    );
}
