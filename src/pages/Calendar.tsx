import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { storage } from '../services/storage';
import { CalendarEvent, Worker } from '../types';
import {
    format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
    eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths,
    parseISO, isToday, startOfDay

} from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, X, Clock, Calendar as CalendarIcon, List, Users, Pencil, Trash2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export default function Calendar() {
    const { user } = useAuth();
    const [viewMode, setViewMode] = useState<'CALENDAR' | 'LIST'>('CALENDAR');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [workers, setWorkers] = useState<Worker[]>([]);
    const [eventTypes, setEventTypes] = useState<string[]>([]);

    // New Event Form State
    const [newEventTitle, setNewEventTitle] = useState('');
    const [newEventTime, setNewEventTime] = useState('');
    const [newEventDescription, setNewEventDescription] = useState('');
    const [eventType, setEventType] = useState<string>('');
    const [selectedAttendees, setSelectedAttendees] = useState<string[]>([]);

    // Detail view state (clicked existing event)
    const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editTitle, setEditTitle] = useState('');
    const [editDescription, setEditDescription] = useState('');
    const [editTime, setEditTime] = useState('');
    const [editType, setEditType] = useState('');
    const [editAttendees, setEditAttendees] = useState<string[]>([]);
    const [confirmDelete, setConfirmDelete] = useState(false);

    useEffect(() => {
        loadData();
        window.addEventListener('storage', loadData);
        return () => window.removeEventListener('storage', loadData);
    }, []);

    const loadData = async () => {
        setWorkers(await storage.getWorkers());
        setEventTypes(await storage.getEventTypes());

        // 1. Get Projects (Deadlines & Timeline)
        const projects = await storage.getProjects();
        const projectEvents: CalendarEvent[] = projects
            .filter(p => p.status !== 'CANCELADO' && p.status !== 'ENTREGADO' && p.status !== 'COMPLETADO')
            .map(p => ({
                id: `proj-${p.id}`,
                title: `${p.name}`,
                description: p.city || '',
                date: p.startDate, // Start of span
                endDate: p.deliveryDate, // End of span
                type: 'Proyecto' as any,
                projectId: p.id,
                allDay: true
            }));

        const customEvents = await storage.getEvents() || [];
        setEvents([...projectEvents, ...customEvents]);
    };

    const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
    const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));

    const handleDateClick = (date: Date) => {
        setSelectedDate(date);
        setNewEventTitle('');
        setNewEventTime('09:00');
        setNewEventDescription('');
        setEventType(eventTypes[0] || 'Reunión');
        setSelectedAttendees([]);
    };

    const handleSaveEvent = async () => {
        if (!selectedDate || !newEventTitle) return;

        const dateStr = format(selectedDate, 'yyyy-MM-dd');
        const finalDate = newEventTime ? `${dateStr}T${newEventTime}:00` : dateStr;

        const newEvent: CalendarEvent = {
            id: crypto.randomUUID(),
            title: newEventTitle,
            description: newEventDescription,
            date: finalDate,
            type: eventType,
            allDay: !newEventTime,
            attendees: selectedAttendees,
            createdBy: user?.id
        };

        await storage.addEvent(newEvent);
        setSelectedDate(null);
        loadData();
    };

    const handleToggleAttendee = (workerId: string) => {
        if (selectedAttendees.includes(workerId)) {
            setSelectedAttendees(selectedAttendees.filter(id => id !== workerId));
        } else {
            setSelectedAttendees([...selectedAttendees, workerId]);
        }
    };

    const openDetailModal = (event: CalendarEvent) => {
        setSelectedEvent(event);
        setIsEditing(false);
        setConfirmDelete(false);
        // Pre-fill edit fields
        setEditTitle(event.title);
        setEditDescription(event.description || '');
        setEditTime(event.allDay ? '' : format(parseISO(event.date), 'HH:mm'));
        setEditType(event.type);
        setEditAttendees(event.attendees || []);
    };

    const handleEditSave = async () => {
        if (!selectedEvent || !editTitle) return;
        const dateStr = format(parseISO(selectedEvent.date), 'yyyy-MM-dd');
        const finalDate = editTime ? `${dateStr}T${editTime}:00` : dateStr;
        const updated: CalendarEvent = {
            ...selectedEvent,
            title: editTitle,
            description: editDescription,
            date: finalDate,
            type: editType,
            allDay: !editTime,
            attendees: editAttendees
        };
        await storage.updateEvent(updated);
        setSelectedEvent(null);
        setIsEditing(false);
        loadData();
    };

    const handleDeleteEvent = async () => {
        if (!selectedEvent) return;
        await storage.removeEvent(selectedEvent.id);
        setSelectedEvent(null);
        setConfirmDelete(false);
        loadData();
    };

    const handleToggleEditAttendee = (id: string) => {
        setEditAttendees(prev =>
            prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
        );
    };

    // Calendar Grid Generation
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
    const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });
    const weekDays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

    // Color map by event type
    const getEventColor = (type: string) => {
        const t = type?.toLowerCase() || '';
        if (t.includes('reuni')) return 'bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-900/30 dark:border-blue-500 dark:text-blue-300';
        if (t.includes('visita')) return 'bg-green-50 border-green-500 text-green-700 dark:bg-green-900/30 dark:border-green-500 dark:text-green-300';
        if (t.includes('entrega')) return 'bg-orange-50 border-orange-500 text-orange-700 dark:bg-orange-900/30 dark:border-orange-500 dark:text-orange-300';
        if (t.includes('formaci')) return 'bg-violet-50 border-violet-500 text-violet-700 dark:bg-violet-900/30 dark:border-violet-500 dark:text-violet-300';
        if (t.includes('personal') || t.includes('libre')) return 'bg-pink-50 border-pink-500 text-pink-700 dark:bg-pink-900/30 dark:border-pink-500 dark:text-pink-300';
        if (t.includes('proyecto')) return 'bg-red-50 border-red-500 text-red-700 dark:bg-red-900/30 dark:border-red-500 dark:text-red-300';
        return 'bg-slate-50 border-slate-400 text-slate-700 dark:bg-slate-800 dark:border-slate-500 dark:text-slate-300';
    };

    const getEventBadgeBg = (type: string) => {
        const t = type?.toLowerCase() || '';
        if (t.includes('reuni')) return 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300';
        if (t.includes('visita')) return 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300';
        if (t.includes('entrega')) return 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300';
        if (t.includes('formaci')) return 'bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300';
        if (t.includes('personal') || t.includes('libre')) return 'bg-pink-100 text-pink-700 dark:bg-pink-900/50 dark:text-pink-300';
        if (t.includes('proyecto')) return 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300';
        return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
    };

    // Returns events that START or END on this day.
    // Multi-day project spans do NOT fill every intermediate day.
    const getEventsForDay = (day: Date): (CalendarEvent & { _dayRole?: 'start' | 'end' })[] => {
        const dayStart = startOfDay(day);
        const result: (CalendarEvent & { _dayRole?: 'start' | 'end' })[] = [];

        events.forEach(e => {
            const eventStart = startOfDay(parseISO(e.date));

            if (e.endDate) {
                const eventEnd = startOfDay(parseISO(e.endDate));
                const isStart = isSameDay(eventStart, dayStart);
                const isEnd = isSameDay(eventEnd, dayStart);
                // Show on start day and/or end day (could be same day)
                if (isStart) result.push({ ...e, _dayRole: 'start' });
                else if (isEnd) result.push({ ...e, _dayRole: 'end' });
            } else {
                if (isSameDay(eventStart, dayStart)) result.push(e);
            }
        });

        return result;
    };

    return (
        <div className="space-y-6 animate-fade-in h-[calc(100vh-100px)] flex flex-col">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 capitalize">
                    {viewMode === 'CALENDAR' ? format(currentDate, 'MMMM yyyy', { locale: es }) : 'Próximas Entregas'}
                </h1>

                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                    <button
                        onClick={() => setViewMode('CALENDAR')}
                        className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'CALENDAR' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'}`}
                    >
                        <CalendarIcon className="w-4 h-4" />
                        <span>Calendario</span>
                    </button>
                    <button
                        onClick={() => setViewMode('LIST')}
                        className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'LIST' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'}`}
                    >
                        <List className="w-4 h-4" />
                        <span>Entregas</span>
                    </button>
                </div>

                {viewMode === 'CALENDAR' && (
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={handlePrevMonth}><ChevronLeft className="w-5 h-5" /></Button>
                        <Button variant="outline" onClick={() => setCurrentDate(new Date())}>Hoy</Button>
                        <Button variant="outline" onClick={handleNextMonth}><ChevronRight className="w-5 h-5" /></Button>
                    </div>
                )}
            </div>

            {viewMode === 'CALENDAR' ? (
                <Card className="flex-1 flex flex-col overflow-hidden border-slate-200 dark:border-slate-800">
                    <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800">
                        {weekDays.map(day => (
                            <div key={day} className="py-2 text-center text-sm font-semibold text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800">
                                {day}
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-7 flex-1 auto-rows-fr bg-slate-200 dark:bg-slate-800 gap-px border-b border-l border-slate-200 dark:border-slate-800 overflow-y-auto">
                        {calendarDays.map((day) => {
                            const dayEvents = getEventsForDay(day);
                            const isCurrentMonth = isSameMonth(day, monthStart);

                            return (
                                <div
                                    key={day.toString()}
                                    className={`bg-white dark:bg-slate-900 p-2 min-h-[100px] cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors relative
                                        ${!isCurrentMonth ? 'bg-slate-50/50 dark:bg-slate-950/50 text-slate-400 dark:text-slate-500' : ''}
                                        ${isToday(day) ? 'bg-blue-50/30 dark:bg-blue-900/20' : ''}
                                    `}
                                    onClick={() => handleDateClick(day)}
                                >
                                    <div className={`text-right text-sm font-medium mb-1 
                                        ${isToday(day) ? 'text-primary-600 dark:text-primary-400 bg-blue-100 dark:bg-blue-900/40 w-7 h-7 rounded-full flex items-center justify-center ml-auto' : ''}
                                    `}>
                                        {format(day, 'd')}
                                    </div>

                                    <div className="space-y-1">
                                        {dayEvents.map(event => (
                                            <div
                                                key={`${event.id}-${(event as any)._dayRole || 'single'}`}
                                                className={`text-xs p-1.5 rounded border-l-4 leading-tight shadow-sm cursor-pointer hover:opacity-80 transition-opacity ${getEventColor(event.type)}`}
                                                title={`${event.title}${event.attendees?.length ? ` (${event.attendees.length} invitados)` : ''}`}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (!event.id.startsWith('proj')) openDetailModal(event);
                                                }}
                                            >
                                                <div className="flex items-center gap-1">
                                                    {!event.allDay && <span className="font-bold shrink-0">{format(parseISO(event.date), 'HH:mm')}</span>}
                                                    {(event as any)._dayRole === 'start' && <span className="shrink-0 text-[9px] font-bold opacity-70">▶</span>}
                                                    {(event as any)._dayRole === 'end' && <span className="shrink-0 text-[9px] font-bold opacity-70">🏁</span>}
                                                    <span className="truncate">{event.title}</span>
                                                </div>
                                                <div className="flex items-center gap-1 mt-0.5">
                                                    <span className={`text-[10px] px-1 rounded font-medium ${getEventBadgeBg(event.type)}`}>{event.type}</span>
                                                    {(event as any)._dayRole === 'start' && <span className="text-[9px] opacity-60">inicio</span>}
                                                    {(event as any)._dayRole === 'end' && <span className="text-[9px] opacity-60">fin</span>}
                                                    {(event.attendees?.length ?? 0) > 0 && (
                                                        <span className="text-[10px] flex items-center gap-0.5 opacity-70">
                                                            <Users className="w-2.5 h-2.5" />{event.attendees!.length}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </Card>
            ) : (
                <Card className="flex-1 overflow-y-auto dark:bg-slate-900">
                    <CardHeader><CardTitle className="text-slate-900 dark:text-slate-100">Próximas Entregas</CardTitle></CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {events.filter(e => e.id.startsWith('proj')).length === 0 ? (
                                <div className="text-center py-12 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 rounded-lg border border-dashed border-slate-200 dark:border-slate-700">
                                    No hay entregas próximas.
                                </div>
                            ) : (
                                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                    {events.filter(e => e.id.startsWith('proj')).map(event => (
                                        <div key={event.id} className="bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-lg p-4 shadow-sm">
                                            <div className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">
                                                {format(parseISO(event.date), 'dd/MM/yyyy')}
                                            </div>
                                            <h3 className="font-semibold text-slate-900 dark:text-slate-100">{event.title}</h3>
                                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{event.description}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Add Event Dialog */}
            {selectedDate && (
                <div className="fixed inset-0 bg-black/50 dark:bg-black/70 z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                                Nuevo Evento: {format(selectedDate, 'd MMMM', { locale: es })}
                            </h3>
                            <Button variant="ghost" size="sm" onClick={() => setSelectedDate(null)}>
                                <X className="w-5 h-5" />
                            </Button>
                        </div>

                        <div className="space-y-4">
                            <Input
                                label="Título"
                                placeholder="Ej: Reunión..."
                                value={newEventTitle}
                                onChange={(e) => setNewEventTitle(e.target.value)}
                                autoFocus
                            />

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Descripción (opcional)</label>
                                <textarea
                                    className="w-full border rounded-md text-sm p-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none transition-colors"
                                    rows={2}
                                    placeholder="Añade detalles del evento..."
                                    value={newEventDescription}
                                    onChange={(e) => setNewEventDescription(e.target.value)}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Hora</label>
                                    <div className="relative">
                                        <Clock className="w-4 h-4 absolute left-3 top-3 text-slate-400 dark:text-slate-500" />
                                        <input
                                            type="time"
                                            className="w-full pl-10 pr-3 py-2 border rounded-md text-sm border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:ring-primary-500 transition-colors"
                                            value={newEventTime}
                                            onChange={(e) => setNewEventTime(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tipo</label>
                                    <select
                                        className="w-full border rounded-md text-sm p-2 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-700 focus:ring-primary-500 transition-colors"
                                        value={eventType}
                                        onChange={(e) => setEventType(e.target.value)}
                                    >
                                        {eventTypes.map(t => (
                                            <option key={t} value={t}>{t}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Attendees */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Invitar a...</label>
                                <div className="border rounded-md p-2 max-h-32 overflow-y-auto space-y-1 border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 transition-colors">
                                    {workers.map(worker => (
                                        <label key={worker.id} className="flex items-center space-x-2 text-sm p-1 hover:bg-white dark:hover:bg-slate-800 rounded cursor-pointer text-slate-700 dark:text-slate-300">
                                            <input
                                                type="checkbox"
                                                checked={selectedAttendees.includes(worker.id)}
                                                onChange={() => handleToggleAttendee(worker.id)}
                                                className="rounded border-slate-300 dark:border-slate-700 text-primary-600 focus:ring-primary-500 bg-white dark:bg-slate-900"
                                            />
                                            <span>{worker.name}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="flex gap-2 justify-end mt-6">
                                <Button variant="ghost" onClick={() => setSelectedDate(null)}>Cancelar</Button>
                                <Button onClick={handleSaveEvent} disabled={!newEventTitle}>Guardar</Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Event Detail Modal */}
            {selectedEvent && (
                <div className="fixed inset-0 bg-black/50 dark:bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => { setSelectedEvent(null); setIsEditing(false); setConfirmDelete(false); }}>
                    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-800" onClick={e => e.stopPropagation()}>

                        {/* Header */}
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                {!isEditing && <span className={`text-xs px-2 py-0.5 rounded font-medium mb-2 inline-block ${getEventBadgeBg(selectedEvent.type)}`}>{selectedEvent.type}</span>}
                                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">{isEditing ? 'Editar Evento' : selectedEvent.title}</h3>
                            </div>
                            <div className="flex items-center gap-1">
                                {/* Owner-only actions */}
                                {!isEditing && !confirmDelete && selectedEvent.createdBy === user?.id && (
                                    <>
                                        <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)} title="Editar">
                                            <Pencil className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                                        </Button>
                                        <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(true)} title="Eliminar">
                                            <Trash2 className="w-4 h-4 text-red-500 dark:text-red-400" />
                                        </Button>
                                    </>
                                )}
                                <Button variant="ghost" size="sm" onClick={() => { setSelectedEvent(null); setIsEditing(false); setConfirmDelete(false); }}>
                                    <X className="w-5 h-5" />
                                </Button>
                            </div>
                        </div>

                        {/* Delete confirmation */}
                        {confirmDelete ? (
                            <div className="space-y-4">
                                <p className="text-sm text-slate-700 dark:text-slate-300 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 rounded-lg p-3">¿Seguro que quieres eliminar este evento? Esta acción no se puede deshacer.</p>
                                <div className="flex gap-2 justify-end">
                                    <Button variant="ghost" onClick={() => setConfirmDelete(false)}>Cancelar</Button>
                                    <Button variant="outline" className="text-red-600 dark:text-red-400 border-red-300 dark:border-red-900 hover:bg-red-50 dark:hover:bg-red-900/40" onClick={handleDeleteEvent}>
                                        <Trash2 className="w-4 h-4 mr-1" /> Eliminar
                                    </Button>
                                </div>
                            </div>
                        ) : isEditing ? (
                            /* EDIT FORM */
                            <div className="space-y-4">
                                <Input label="Título" value={editTitle} onChange={e => setEditTitle(e.target.value)} autoFocus />

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Descripción</label>
                                    <textarea
                                        className="w-full border rounded-md text-sm p-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none transition-colors"
                                        rows={2}
                                        value={editDescription}
                                        onChange={e => setEditDescription(e.target.value)}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Hora</label>
                                        <div className="relative">
                                            <Clock className="w-4 h-4 absolute left-3 top-3 text-slate-400 dark:text-slate-500" />
                                            <input type="time" className="w-full pl-10 pr-3 py-2 border rounded-md text-sm border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors" value={editTime} onChange={e => setEditTime(e.target.value)} />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tipo</label>
                                        <select className="w-full border rounded-md text-sm p-2 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-700 transition-colors" value={editType} onChange={e => setEditType(e.target.value)}>
                                            {eventTypes.map(t => <option key={t} value={t}>{t}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Invitados</label>
                                    <div className="border rounded-md p-2 max-h-32 overflow-y-auto space-y-1 border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 transition-colors">
                                        {workers.map(w => (
                                            <label key={w.id} className="flex items-center space-x-2 text-sm p-1 hover:bg-white dark:hover:bg-slate-800 rounded cursor-pointer text-slate-700 dark:text-slate-300">
                                                <input type="checkbox" checked={editAttendees.includes(w.id)} onChange={() => handleToggleEditAttendee(w.id)} className="rounded border-slate-300 dark:border-slate-700 text-primary-600 bg-white dark:bg-slate-900" />
                                                <span>{w.name} {w.surnames || ''}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex gap-2 justify-end mt-2">
                                    <Button variant="ghost" onClick={() => setIsEditing(false)}>Cancelar</Button>
                                    <Button onClick={handleEditSave} disabled={!editTitle}>Guardar cambios</Button>
                                </div>
                            </div>
                        ) : (
                            /* READ VIEW */
                            <div className="space-y-3 text-sm">
                                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                                    <Clock className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                                    <span>
                                        {format(parseISO(selectedEvent.date), "d 'de' MMMM yyyy", { locale: es })}
                                        {!selectedEvent.allDay && ` — ${format(parseISO(selectedEvent.date), 'HH:mm')}`}
                                    </span>
                                </div>

                                {selectedEvent.description && (
                                    <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3 text-slate-700 dark:text-slate-300 transition-colors">
                                        {selectedEvent.description}
                                    </div>
                                )}

                                {(selectedEvent.attendees?.length ?? 0) > 0 && (
                                    <div>
                                        <p className="font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
                                            <Users className="w-4 h-4" />
                                            Invitados ({selectedEvent.attendees!.length})
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                            {selectedEvent.attendees!.map(id => {
                                                const w = workers.find(w => w.id === id);
                                                return w ? (
                                                    <span key={id} className="flex items-center gap-1.5 text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 px-2 py-1 rounded-full transition-colors">
                                                        <span className="w-5 h-5 bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-300 rounded-full flex items-center justify-center font-bold text-[10px]">
                                                            {w.name.charAt(0).toUpperCase()}
                                                        </span>
                                                        {w.name} {w.surnames || ''}
                                                    </span>
                                                ) : null;
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
