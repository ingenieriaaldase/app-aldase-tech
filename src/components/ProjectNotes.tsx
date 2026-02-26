import { useState } from 'react';
import { ProjectNote, ProjectNoteType, Worker } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { Plus, Trash2, StickyNote, Clock, CheckCircle2, Circle } from 'lucide-react';

const NOTE_TYPE_CONFIG: Record<ProjectNoteType, { label: string; color: 'default' | 'success' | 'warning' | 'danger' | 'secondary'; emoji: string }> = {
    'AVANCE': { label: 'Avance', color: 'success', emoji: '✅' },
    'PROXIMO_PASO': { label: 'Próximo paso', color: 'default', emoji: '➡️' },
    'EN_ESPERA': { label: 'En espera', color: 'warning', emoji: '⏳' },
    'GENERAL': { label: 'General', color: 'secondary', emoji: '📝' },
};

interface ProjectNotesProps {
    notes: ProjectNote[];
    workers: Worker[];
    currentUserId?: string;
    currentUserRole?: string;
    onAdd: (type: ProjectNoteType, text: string) => Promise<void>;
    onDelete: (noteId: string) => Promise<void>;
    onToggleResolved?: (note: ProjectNote) => Promise<void>;
}

export default function ProjectNotes({ notes, workers, currentUserId, currentUserRole, onAdd, onDelete, onToggleResolved }: ProjectNotesProps) {
    const [newText, setNewText] = useState('');
    const [newType, setNewType] = useState<ProjectNoteType>('GENERAL');
    const [isSaving, setIsSaving] = useState(false);

    const getWorkerName = (id: string) => {
        const w = workers.find(w => w.id === id);
        return w ? `${w.name} ${w.surnames || ''}`.trim() : 'Usuario';
    };

    const handleAdd = async () => {
        const text = newText.trim();
        if (!text) return;
        setIsSaving(true);
        try {
            await onAdd(newType, text);
            setNewText('');
            setNewType('GENERAL');
        } finally {
            setIsSaving(false);
        }
    };

    const canDelete = (note: ProjectNote) => {
        return currentUserRole === 'ADMIN' || note.authorId === currentUserId;
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <StickyNote className="w-5 h-5 text-primary-600" />
                    Notas del Proyecto
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Add note form */}
                <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-3">
                    <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                        <Plus className="w-4 h-4" />
                        Añadir nota
                    </h3>
                    <div className="flex gap-3 items-start">
                        <select
                            className="h-10 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 shrink-0 w-44"
                            value={newType}
                            onChange={e => setNewType(e.target.value as ProjectNoteType)}
                        >
                            {Object.entries(NOTE_TYPE_CONFIG).map(([key, cfg]) => (
                                <option key={key} value={key}>{cfg.emoji} {cfg.label}</option>
                            ))}
                        </select>
                        <textarea
                            className="flex-1 min-h-[80px] rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                            placeholder="Escribe aquí el avance, siguiente paso, bloqueo..."
                            value={newText}
                            onChange={e => setNewText(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleAdd(); }}
                        />
                    </div>
                    <div className="flex justify-end">
                        <Button onClick={handleAdd} disabled={isSaving || !newText.trim()} size="sm">
                            {isSaving ? 'Guardando...' : 'Añadir nota'}
                        </Button>
                    </div>
                    <p className="text-xs text-slate-400">Ctrl+Enter para guardar rápido</p>
                </div>

                {/* Notes list */}
                {notes.length === 0 ? (
                    <div className="text-center py-10 text-slate-400 border border-dashed border-slate-200 rounded-xl">
                        <StickyNote className="w-8 h-8 mx-auto mb-2 opacity-40" />
                        <p className="text-sm">No hay notas todavía. ¡Añade la primera!</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {notes.map(note => {
                            const cfg = NOTE_TYPE_CONFIG[note.type] || NOTE_TYPE_CONFIG['GENERAL'];
                            return (
                                <div
                                    key={note.id}
                                    className="group flex gap-3 p-4 bg-white border border-slate-200 rounded-xl hover:border-slate-300 transition-colors"
                                >
                                    <div className="text-xl leading-none mt-0.5 shrink-0">{cfg.emoji}</div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            {note.isResolved && (
                                                <Badge variant="success" className="text-xs">
                                                    Resuelto
                                                </Badge>
                                            )}
                                            <Badge variant={cfg.color} className="text-xs">{cfg.label}</Badge>
                                            <span className="text-xs text-slate-400 flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {new Date(note.createdAt).toLocaleString('es-ES', {
                                                    day: '2-digit', month: '2-digit', year: 'numeric',
                                                    hour: '2-digit', minute: '2-digit'
                                                })}
                                            </span>
                                            <span className="text-xs text-slate-400">
                                                · {getWorkerName(note.authorId || '')}
                                            </span>
                                        </div>
                                        <p className={`text-sm whitespace-pre-wrap ${note.isResolved ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                                            {note.text}
                                        </p>
                                    </div>
                                    <div className="flex flex-col gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {onToggleResolved && (
                                            <button
                                                onClick={() => onToggleResolved(note)}
                                                className={`p-1 rounded transition-colors ${note.isResolved ? 'text-green-600 hover:bg-green-50' : 'text-slate-400 hover:text-green-600 hover:bg-green-50'}`}
                                                title={note.isResolved ? "Marcar como pendiente" : "Marcar como hecho"}
                                            >
                                                {note.isResolved ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                                            </button>
                                        )}
                                        {canDelete(note) && (
                                            <button
                                                onClick={() => onDelete(note.id)}
                                                className="p-1 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                                                title="Eliminar nota"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
