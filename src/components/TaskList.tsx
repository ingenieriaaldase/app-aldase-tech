import { useState, useEffect } from 'react';
import { Task, Worker } from '../types';
import { storage } from '../services/storage';
import { Card, CardContent } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { CheckCircle2, Circle, Plus, Trash2, Calendar as CalendarIcon, User as UserIcon, MessageSquare, Send } from 'lucide-react';

interface TaskListProps {
    tasks: Task[];
    workers: Worker[];
    onAddTask: (task: Partial<Task>) => void;
    onToggleStatus: (taskId: string, newStatus: Task['status']) => void;
    onDeleteTask: (taskId: string) => void;
    onAddComment: (taskId: string, text: string) => void;
}

export default function TaskList({ tasks, workers, onAddTask, onToggleStatus, onDeleteTask, onAddComment }: TaskListProps) {
    const [isAdding, setIsAdding] = useState(false);
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [newTaskAssignee, setNewTaskAssignee] = useState('');
    const [newTaskHours, setNewTaskHours] = useState('');
    const [designCategories, setDesignCategories] = useState<string[]>([]);

    useEffect(() => {
        const loadCats = async () => {
            setDesignCategories(await storage.getDesignCategories());
        };
        loadCats();
    }, []);

    // Comments state
    const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
    const [newComment, setNewComment] = useState('');

    const handleAdd = () => {
        if (!newTaskTitle.trim()) return;
        onAddTask({
            title: newTaskTitle,
            status: 'TODO',
            assigneeId: newTaskAssignee || undefined,
            estimatedHours: newTaskHours ? Number(newTaskHours) : undefined,
            createdAt: new Date().toISOString()
        });
        setNewTaskTitle('');
        setNewTaskAssignee('');
        setNewTaskHours('');
        setIsAdding(false);
    };

    const getWorkerName = (id?: string) => {
        if (!id) return 'Sin asignar';
        return workers.find(w => w.id === id)?.name ? `${workers.find(w => w.id === id)?.name} ${workers.find(w => w.id === id)?.surnames || ''}` : 'Desconocido';
    };

    const handleSendComment = (taskId: string) => {
        if (!newComment.trim()) return;
        onAddComment(taskId, newComment);
        setNewComment('');
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-slate-900">Tareas del Proyecto</h3>
                <Button size="sm" onClick={() => setIsAdding(!isAdding)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Nueva Tarea
                </Button>
            </div>

            {isAdding && (
                <Card className="animate-in fade-in slide-in-from-top-4">
                    <CardContent className="pt-6 flex flex-wrap gap-4 items-end">
                        <div className="flex-1 min-w-[200px] space-y-2">
                            <label className="text-sm font-medium text-slate-700">Tipo de Tarea (Diseño)</label>
                            <select
                                className="w-full h-10 rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                                value={newTaskTitle}
                                onChange={e => setNewTaskTitle(e.target.value)}
                            >
                                <option value="">Seleccionar Tarea...</option>
                                {designCategories.map((t: string) => (
                                    <option key={t} value={t}>{t}</option>
                                ))}
                            </select>
                        </div>
                        <div className="w-32 space-y-2">
                            <label className="text-sm font-medium text-slate-700">Horas Est.</label>
                            <Input
                                type="number"
                                value={newTaskHours}
                                onChange={e => setNewTaskHours(e.target.value)}
                                placeholder="0"
                            />
                        </div>
                        <div className="w-48 space-y-2">
                            <label className="text-sm font-medium text-slate-700">Asignado a</label>
                            <select
                                className="w-full h-10 rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                                value={newTaskAssignee}
                                onChange={e => setNewTaskAssignee(e.target.value)}
                            >
                                <option value="">Sin asignar</option>
                                {workers.map(w => (
                                    <option key={w.id} value={w.id}>{w.name} {w.surnames}</option>
                                ))}
                            </select>
                        </div>
                        <Button onClick={handleAdd}>Añadir</Button>
                    </CardContent>
                </Card>
            )}

            <div className="space-y-2">
                {tasks.length === 0 && !isAdding && (
                    <div className="text-center py-8 text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                        No hay tareas en este proyecto.
                    </div>
                )}

                {tasks.map(task => (
                    <div key={task.id} className="bg-white border border-slate-200 rounded-lg transition-all hover:border-primary-200 hover:shadow-sm">
                        <div className={`flex items-center justify-between p-4 ${task.status === 'DONE' ? 'bg-slate-50' : ''}`}>
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={() => onToggleStatus(task.id, task.status === 'DONE' ? 'TODO' : 'DONE')}
                                    className={`transition-colors ${task.status === 'DONE' ? 'text-green-500' : 'text-slate-300 hover:text-primary-500'}`}
                                >
                                    {task.status === 'DONE' ? (
                                        <CheckCircle2 className="w-6 h-6" />
                                    ) : (
                                        <Circle className="w-6 h-6" />
                                    )}
                                </button>
                                <div>
                                    <p className={`font-medium ${task.status === 'DONE' ? 'text-slate-500 line-through' : 'text-slate-900'}`}>
                                        {task.title}
                                    </p>
                                    <div className="flex items-center gap-4 mt-1 text-xs text-slate-500">
                                        <span className="flex items-center gap-1">
                                            <UserIcon className="w-3 h-3" />
                                            {getWorkerName(task.assigneeId)}
                                        </span>
                                        {task.estimatedHours && (
                                            <span className="flex items-center gap-1">
                                                <span className="text-xs font-bold bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">{task.estimatedHours}h</span>
                                            </span>
                                        )}
                                        {task.dueDate && (
                                            <span className="flex items-center gap-1">
                                                <CalendarIcon className="w-3 h-3" />
                                                {task.dueDate}
                                            </span>
                                        )}
                                        {(task.comments?.length || 0) > 0 && (
                                            <span className="flex items-center gap-1 text-primary-600">
                                                <MessageSquare className="w-3 h-3" />
                                                {task.comments?.length}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center space-x-1">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setExpandedTaskId(expandedTaskId === task.id ? null : task.id)}
                                    className={expandedTaskId === task.id ? 'bg-primary-50 text-primary-600' : 'text-slate-400'}
                                >
                                    <MessageSquare className="w-4 h-4" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-slate-400 hover:text-red-500"
                                    onClick={() => onDeleteTask(task.id)}
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>

                        {/* Comments Section */}
                        {expandedTaskId === task.id && (
                            <div className="border-t border-slate-100 bg-slate-50/50 p-4 space-y-4">
                                <div className="space-y-3">
                                    {task.comments && task.comments.length > 0 ? (
                                        task.comments.map(comment => (
                                            <div key={comment.id} className="flex gap-3">
                                                <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                                                    {getWorkerName(comment.authorId).charAt(0)}
                                                </div>
                                                <div className="flex-1 bg-white p-3 rounded-lg border border-slate-200 shadow-sm text-sm">
                                                    <div className="flex justify-between items-center mb-1">
                                                        <span className="font-medium text-slate-900">{getWorkerName(comment.authorId)}</span>
                                                        <span className="text-xs text-slate-400">{new Date(comment.createdAt).toLocaleString()}</span>
                                                    </div>
                                                    <p className="text-slate-600">{comment.text}</p>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-sm text-slate-500 italic text-center py-2">No hay comentarios todavía.</p>
                                    )}
                                </div>
                                <div className="flex gap-2 items-center">
                                    <Input
                                        value={newComment}
                                        onChange={e => setNewComment(e.target.value)}
                                        placeholder="Escribe un comentario..."
                                        className="bg-white"
                                        onKeyDown={e => {
                                            if (e.key === 'Enter') handleSendComment(task.id);
                                        }}
                                    />
                                    <Button size="sm" onClick={() => handleSendComment(task.id)}>
                                        <Send className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div >
    );
}
