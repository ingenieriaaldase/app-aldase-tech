import { useState } from 'react';
import { ProjectNote, ProjectNoteType, Worker } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { Plus, Trash2, StickyNote, Clock, CheckCircle2, Circle, Edit2, MessageSquareReply, CornerDownRight } from 'lucide-react';

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
    onAdd: (type: ProjectNoteType, text: string, parentId?: string) => Promise<void>;
    onEdit?: (noteId: string, newText: string) => Promise<void>;
    onDelete: (noteId: string) => Promise<void>;
    onToggleResolved?: (note: ProjectNote) => Promise<void>;
}

export default function ProjectNotes({ notes, workers, currentUserId, currentUserRole, onAdd, onEdit, onDelete, onToggleResolved }: ProjectNotesProps) {
    const [newText, setNewText] = useState('');
    const [newType, setNewType] = useState<ProjectNoteType>('GENERAL');
    const [isSaving, setIsSaving] = useState(false);
    
    // Editing state
    const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
    const [editText, setEditText] = useState('');
    const [isSavingEdit, setIsSavingEdit] = useState(false);

    // Replying state
    const [replyingToId, setReplyingToId] = useState<string | null>(null);
    const [replyText, setReplyText] = useState('');
    const [isSavingReply, setIsSavingReply] = useState(false);

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

    const handleEdit = async (noteId: string) => {
        const text = editText.trim();
        if (!text || !onEdit) return;
        setIsSavingEdit(true);
        try {
            await onEdit(noteId, text);
            setEditingNoteId(null);
        } finally {
            setIsSavingEdit(false);
        }
    };

    const handleReply = async (parentId: string) => {
        const text = replyText.trim();
        if (!text) return;
        setIsSavingReply(true);
        try {
            await onAdd('GENERAL', text, parentId); // Replies are 'GENERAL' by default
            setReplyingToId(null);
            setReplyText('');
        } finally {
            setIsSavingReply(false);
        }
    };

    const canDelete = (note: ProjectNote) => {
        return currentUserRole === 'ADMIN' || note.authorId === currentUserId;
    };

    const canEdit = (note: ProjectNote) => {
        return currentUserRole === 'ADMIN' || note.authorId === currentUserId;
    };

    const parentNotes = notes.filter(n => !n.parentId);
    const getReplies = (parentId: string) => notes.filter(n => n.parentId === parentId).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    const renderNote = (note: ProjectNote, isReply = false) => {
        const cfg = NOTE_TYPE_CONFIG[note.type] || NOTE_TYPE_CONFIG['GENERAL'];
        const isEditingThis = editingNoteId === note.id;
        const isReplyingThis = replyingToId === note.id;

        return (
            <div key={note.id} className="space-y-2">
                <div
                    className={`group flex gap-3 p-4 bg-white border ${isReply ? 'border-slate-100 ml-8 bg-slate-50/50' : 'border-slate-200'} rounded-xl hover:border-slate-300 transition-colors`}
                >
                    <div className="text-xl leading-none mt-0.5 shrink-0">
                        {isReply ? <CornerDownRight className="w-5 h-5 text-slate-300" /> : cfg.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                            {note.isResolved && (
                                <Badge variant="success" className="text-xs">
                                    Resuelto
                                </Badge>
                            )}
                            {!isReply && <Badge variant={cfg.color} className="text-xs">{cfg.label}</Badge>}
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
                            {note.updatedAt && (
                                <span className="text-xs text-slate-400 italic">
                                    (Editado)
                                </span>
                            )}
                        </div>

                        {isEditingThis ? (
                            <div className="mt-2 space-y-2">
                                <textarea
                                    className="w-full min-h-[60px] rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                                    value={editText}
                                    onChange={e => setEditText(e.target.value)}
                                    autoFocus
                                />
                                <div className="flex gap-2">
                                    <Button size="sm" onClick={() => handleEdit(note.id)} disabled={isSavingEdit || !editText.trim()}>
                                        {isSavingEdit ? 'Guardando...' : 'Guardar cambios'}
                                    </Button>
                                    <Button size="sm" variant="outline" onClick={() => setEditingNoteId(null)} disabled={isSavingEdit}>
                                        Cancelar
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <p className={`text-sm whitespace-pre-wrap ${note.isResolved ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                                {note.text}
                            </p>
                        )}
                    </div>
                    
                    {!isEditingThis && (
                        <div className="flex flex-col gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            {onToggleResolved && !isReply && (
                                <button
                                    onClick={() => onToggleResolved(note)}
                                    className={`p-1 rounded transition-colors ${note.isResolved ? 'text-green-600 hover:bg-green-50' : 'text-slate-400 hover:text-green-600 hover:bg-green-50'}`}
                                    title={note.isResolved ? "Marcar como pendiente" : "Marcar como hecho"}
                                >
                                    {note.isResolved ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                                </button>
                            )}
                            {!isReply && (
                                <button
                                    onClick={() => {
                                        setReplyingToId(isReplyingThis ? null : note.id);
                                        setReplyText('');
                                    }}
                                    className="p-1 rounded text-slate-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                                    title="Responder"
                                >
                                    <MessageSquareReply className="w-4 h-4" />
                                </button>
                            )}
                            {canEdit(note) && onEdit && (
                                <button
                                    onClick={() => {
                                        setEditingNoteId(note.id);
                                        setEditText(note.text);
                                    }}
                                    className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                    title="Editar nota"
                                >
                                    <Edit2 className="w-4 h-4" />
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
                    )}
                </div>

                {isReplyingThis && (
                    <div className="ml-8 bg-primary-50/50 rounded-xl border border-primary-100 p-3 space-y-2">
                        <textarea
                            className="w-full min-h-[60px] rounded-md border border-primary-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                            placeholder="Escribe tu respuesta..."
                            value={replyText}
                            onChange={e => setReplyText(e.target.value)}
                            autoFocus
                        />
                        <div className="flex gap-2">
                            <Button size="sm" onClick={() => handleReply(note.id)} disabled={isSavingReply || !replyText.trim()}>
                                {isSavingReply ? 'Guardando...' : 'Responder'}
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setReplyingToId(null)} disabled={isSavingReply}>
                                Cancelar
                            </Button>
                        </div>
                    </div>
                )}

                {/* Render replies */}
                {!isReply && getReplies(note.id).length > 0 && (
                    <div className="space-y-2 mt-2">
                        {getReplies(note.id).map(reply => renderNote(reply, true))}
                    </div>
                )}
            </div>
        );
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
                {parentNotes.length === 0 ? (
                    <div className="text-center py-10 text-slate-400 border border-dashed border-slate-200 rounded-xl">
                        <StickyNote className="w-8 h-8 mx-auto mb-2 opacity-40" />
                        <p className="text-sm">No hay notas todavía. ¡Añade la primera!</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {parentNotes.map(note => renderNote(note, false))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
