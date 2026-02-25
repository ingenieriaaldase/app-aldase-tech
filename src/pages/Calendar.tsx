import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { storage } from '../services/storage';
import { CalendarEvent, Worker } from '../types';
import {
    format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
    eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths,
    parseISO, isToday, startOfDay, endOfDay

} from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, X, Clock, Calendar as CalendarIcon, List, Users } from 'lucide-react';

export default function Calendar() {
    const [viewMode, setViewMode] = useState<'CALENDAR' | 'LIST'>('CALENDAR');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [workers, setWorkers] = useState<Worker[]>([]);
    const [eventTypes, setEventTypes] = useState<string[]>([]);

    // New Event Form State
    const [newEventTitle, setNewEventTitle] = useState('');
    const [newEventTime, setNewEventTime] = useState('');
    const [eventType, setEventType] = useState<string>('');
    const [selectedAttendees, setSelectedAttendees] = useState<string[]>([]);

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
            description: '',
            date: finalDate,
            type: eventType,
            allDay: !newEventTime,
            attendees: selectedAttendees
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
        if (t.includes('reuni')) return 'bg-blue-50 border-blue-500 text-blue-700';
        if (t.includes('visita')) return 'bg-green-50 border-green-500 text-green-700';
        if (t.includes('entrega')) return 'bg-orange-50 border-orange-500 text-orange-700';
        if (t.includes('formaci')) return 'bg-violet-50 border-violet-500 text-violet-700';
        if (t.includes('personal') || t.includes('libre')) return 'bg-pink-50 border-pink-500 text-pink-700';
        if (t.includes('proyecto')) return 'bg-red-50 border-red-500 text-red-700';
        return 'bg-slate-50 border-slate-400 text-slate-700';
    };

    const getEventBadgeBg = (type: string) => {
        const t = type?.toLowerCase() || '';
        if (t.includes('reuni')) return 'bg-blue-100 text-blue-700';
        if (t.includes('visita')) return 'bg-green-100 text-green-700';
        if (t.includes('entrega')) return 'bg-orange-100 text-orange-700';
        if (t.includes('formaci')) return 'bg-violet-100 text-violet-700';
        if (t.includes('personal') || t.includes('libre')) return 'bg-pink-100 text-pink-700';
        if (t.includes('proyecto')) return 'bg-red-100 text-red-700';
        return 'bg-slate-100 text-slate-700';
    };

    const getEventsForDay = (day: Date) => {
        return events.filter(e => {
            const eventStart = startOfDay(parseISO(e.date));
            const dayStart = startOfDay(day);

            if (e.endDate) {
                const eventEnd = endOfDay(parseISO(e.endDate));
                // Check overlap
                return (eventStart <= dayStart && eventEnd >= dayStart);
            }

            return isSameDay(eventStart, dayStart);
        });
    };

    return (
        <div className="space-y-6 animate-fade-in h-[calc(100vh-100px)] flex flex-col">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 capitalize">
                    {viewMode === 'CALENDAR' ? format(currentDate, 'MMMM yyyy', { locale: es }) : 'Próximas Entregas'}
                </h1>

                <div className="flex bg-slate-100 p-1 rounded-lg">
                    <button
                        onClick={() => setViewMode('CALENDAR')}
                        className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'CALENDAR' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                    >
                        <CalendarIcon className="w-4 h-4" />
                        <span>Calendario</span>
                    </button>
                    <button
                        onClick={() => setViewMode('LIST')}
                        className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'LIST' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
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
                <Card className="flex-1 flex flex-col overflow-hidden">
                    <div className="grid grid-cols-7 border-b border-slate-200">
                        {weekDays.map(day => (
                            <div key={day} className="py-2 text-center text-sm font-semibold text-slate-600 bg-slate-50">
                                {day}
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-7 flex-1 auto-rows-fr bg-slate-200 gap-px border-b border-l border-slate-200 overflow-y-auto">
                        {calendarDays.map((day) => {
                            const dayEvents = getEventsForDay(day);
                            const isCurrentMonth = isSameMonth(day, monthStart);

                            return (
                                <div
                                    key={day.toString()}
                                    className={`bg-white p-2 min-h-[100px] cursor-pointer hover:bg-slate-50 transition-colors relative
                                        ${!isCurrentMonth ? 'bg-slate-50/50 text-slate-400' : ''}
                                        ${isToday(day) ? 'bg-blue-50/30' : ''}
                                    `}
                                    onClick={() => handleDateClick(day)}
                                >
                                    <div className={`text-right text-sm font-medium mb-1 
                                        ${isToday(day) ? 'text-primary-600 bg-blue-100 w-7 h-7 rounded-full flex items-center justify-center ml-auto' : ''}
                                    `}>
                                        {format(day, 'd')}
                                    </div>

                                    <div className="space-y-1">
                                        {dayEvents.map(event => (
                                            <div
                                                key={event.id}
                                                className={`text-xs p-1.5 rounded border-l-4 truncate leading-tight shadow-sm ${getEventColor(event.type)}`}
                                                title={`${event.title}${event.attendees?.length ? ` (${event.attendees.length} invitados)` : ''}`}
                                            >
                                                <div className="flex items-center gap-1">
                                                    {!event.allDay && <span className="font-bold shrink-0">{format(parseISO(event.date), 'HH:mm')}</span>}
                                                    <span className="truncate">{event.title}</span>
                                                </div>
                                                <div className="flex items-center gap-1 mt-0.5">
                                                    <span className={`text-[10px] px-1 rounded font-medium ${getEventBadgeBg(event.type)}`}>{event.type}</span>
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
                <Card className="flex-1 overflow-y-auto">
                    <CardHeader><CardTitle>Próximas Entregas</CardTitle></CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {events.filter(e => e.id.startsWith('proj')).length === 0 ? (
                                <div className="text-center py-12 text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                                    No hay entregas próximas.
                                </div>
                            ) : (
                                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                    {events.filter(e => e.id.startsWith('proj')).map(event => (
                                        <div key={event.id} className="bg-white border rounded-lg p-4 shadow-sm">
                                            <div className="text-sm font-medium text-slate-500 mb-2">
                                                {format(parseISO(event.date), 'dd/MM/yyyy')}
                                            </div>
                                            <h3 className="font-semibold text-slate-900">{event.title}</h3>
                                            <p className="text-sm text-slate-500 mt-1">{event.description}</p>
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
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-slate-900">
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

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Hora</label>
                                    <div className="relative">
                                        <Clock className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                                        <input
                                            type="time"
                                            className="w-full pl-10 pr-3 py-2 border rounded-md text-sm focus:ring-primary-500 border-slate-300"
                                            value={newEventTime}
                                            onChange={(e) => setNewEventTime(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Tipo</label>
                                    <select
                                        className="w-full border rounded-md text-sm p-2 bg-white border-slate-300 focus:ring-primary-500"
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
                                <label className="block text-sm font-medium text-slate-700 mb-2">Invitar a...</label>
                                <div className="border rounded-md p-2 max-h-32 overflow-y-auto space-y-1">
                                    {workers.map(worker => (
                                        <label key={worker.id} className="flex items-center space-x-2 text-sm p-1 hover:bg-slate-50 rounded cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={selectedAttendees.includes(worker.id)}
                                                onChange={() => handleToggleAttendee(worker.id)}
                                                className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
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
        </div>
    )
}
