import { useState, useEffect } from 'react';

import { Button } from '../components/ui/Button';
import { storage } from '../services/storage';
import { SocialPost, SocialPlatform, PostStatus, Worker } from '../types';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, addWeeks, subWeeks, parseISO, isToday, startOfMonth, endOfMonth, addMonths, subMonths, isSameMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus, Instagram, Linkedin, Facebook, Twitter, Youtube, FileText, Calendar as CalendarIcon, List } from 'lucide-react';

import SocialPostModal from '../components/SocialPostModal';

const PLATFORMS: { id: SocialPlatform, icon: any, color: string }[] = [
    { id: 'INSTAGRAM', icon: Instagram, color: 'text-pink-600' },
    { id: 'LINKEDIN', icon: Linkedin, color: 'text-blue-700' },
    { id: 'FACEBOOK', icon: Facebook, color: 'text-blue-600' },
    { id: 'TWITTER', icon: Twitter, color: 'text-sky-500' },
    { id: 'YOUTUBE', icon: Youtube, color: 'text-red-600' },
    { id: 'BLOG', icon: FileText, color: 'text-orange-600' }
];

const STATUS_COLORS: Record<PostStatus, string> = {
    'IDEA': 'bg-gray-100 text-gray-700 border-gray-200',
    'BORRADOR': 'bg-yellow-50 text-yellow-700 border-yellow-200',
    'PROGRAMADO': 'bg-blue-50 text-blue-700 border-blue-200',
    'PUBLICADO': 'bg-green-50 text-green-700 border-green-200'
};

export default function Marketing() {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [posts, setPosts] = useState<SocialPost[]>([]);
    const [workers, setWorkers] = useState<Worker[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [selectedPost, setSelectedPost] = useState<SocialPost | undefined>(undefined);

    // View States
    const [view, setView] = useState<'calendar' | 'table'>('calendar');
    const [calendarView, setCalendarView] = useState<'month' | 'week'>('week');

    // Initial Load
    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const [storedPosts, storedWorkers] = await Promise.all([
            storage.getAll<SocialPost>('crm_social_posts'),
            storage.getAll<Worker>('crm_workers')
        ]);
        setPosts(storedPosts);
        setWorkers(storedWorkers);
    };

    const getWorkerName = (id?: string) => {
        if (!id) return '-';
        const worker = workers.find(w => w.id === id);
        return worker ? `${worker.name} ${worker.surnames || ''}` : 'Desconocido';
    };

    // Calendar Navigation
    const handlePrev = () => {
        if (calendarView === 'week') {
            setCurrentDate(subWeeks(currentDate, 1));
        } else {
            setCurrentDate(subMonths(currentDate, 1));
        }
    };

    const handleNext = () => {
        if (calendarView === 'week') {
            setCurrentDate(addWeeks(currentDate, 1));
        } else {
            setCurrentDate(addMonths(currentDate, 1));
        }
    };

    const handleNewPost = (date: Date) => {
        setSelectedDate(date);
        setSelectedPost(undefined);
        setIsModalOpen(true);
    };

    const handleEditPost = (post: SocialPost) => {
        setSelectedPost(post);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedDate(null);
        setSelectedPost(undefined);
    };

    // Render Logic
    const renderCalendar = () => {
        let days: Date[] = [];
        let start: Date, end: Date;

        if (calendarView === 'week') {
            start = startOfWeek(currentDate, { weekStartsOn: 1 });
            end = endOfWeek(currentDate, { weekStartsOn: 1 });
            days = eachDayOfInterval({ start, end });
        } else {
            const monthStart = startOfMonth(currentDate);
            const monthEnd = endOfMonth(currentDate);
            start = startOfWeek(monthStart, { weekStartsOn: 1 });
            end = endOfWeek(monthEnd, { weekStartsOn: 1 });
            days = eachDayOfInterval({ start, end });
        }

        return (
            <div className={`grid ${calendarView === 'month' ? 'grid-cols-7 grid-rows-5' : 'grid-cols-7'} gap-4 flex-1 overflow-hidden min-h-0`}>
                {days.map(day => {
                    const dayPosts = posts.filter(p => isSameDay(parseISO(p.date), day));
                    const isCurrentMonth = isSameMonth(day, currentDate);
                    const isDayToday = isToday(day);

                    return (
                        <div
                            key={day.toString()}
                            className={`flex flex-col bg-slate-50 dark:bg-slate-900/50 rounded-xl border ${isDayToday ? 'border-primary-500 ring-1 ring-primary-500' : 'border-slate-200 dark:border-slate-800'
                                } ${!isCurrentMonth && calendarView === 'month' ? 'opacity-50 grayscale' : ''}`}
                        >
                            <div className={`p-2 text-center border-b border-slate-200 dark:border-slate-800 ${isDayToday ? 'bg-primary-50 dark:bg-primary-900/20' : ''}`}>
                                <div className="text-[10px] uppercase text-slate-500 font-semibold">{format(day, 'EEE', { locale: es })}</div>
                                <div className={`text-sm font-bold ${isDayToday ? 'text-primary-600' : 'text-slate-700 dark:text-slate-300'}`}>
                                    {format(day, 'd')}
                                </div>
                            </div>

                            <div className="flex-1 p-1 space-y-1 overflow-y-auto custom-scrollbar">
                                {dayPosts.map(post => {
                                    const PlatformIcon = PLATFORMS.find(p => p.id === post.platform)?.icon || FileText;
                                    const platformStyle = PLATFORMS.find(p => p.id === post.platform)?.color || 'text-slate-500';

                                    return (
                                        <div
                                            key={post.id}
                                            onClick={() => handleEditPost(post)}
                                            className="bg-white dark:bg-slate-800 p-1.5 rounded-lg shadow-sm border border-slate-100 dark:border-slate-700 cursor-pointer hover:shadow-md transition-shadow group"
                                        >
                                            <div className="flex justify-between items-start mb-1">
                                                <PlatformIcon className={`w-3 h-3 ${platformStyle}`} />
                                            </div>
                                            <h4 className="text-xs font-medium text-slate-900 dark:text-white line-clamp-2 leading-tight mb-0.5 group-hover:text-primary-600 transition-colors">{post.title}</h4>
                                            <div className="flex justify-between items-center">
                                                <span className={`text-[8px] px-1 py-px rounded-full border ${STATUS_COLORS[post.status]}`}>
                                                    {post.status.toLowerCase()}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}

                                <button
                                    onClick={() => handleNewPost(day)}
                                    className="w-full py-1.5 bg-transparent border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg text-slate-400 hover:text-primary-500 hover:border-primary-300 hover:bg-primary-50/50 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100 hover:opacity-100"
                                >
                                    <Plus className="w-3 h-3" />
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    const renderTable = () => (
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden flex-1">
            <div className="overflow-x-auto h-full">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-medium border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10">
                        <tr>
                            <th className="px-4 py-3">Fecha y Hora</th>
                            <th className="px-4 py-3">Plataforma</th>
                            <th className="px-4 py-3">Título</th>
                            <th className="px-4 py-3">Estado</th>
                            <th className="px-4 py-3">Sube / Crea</th>
                            <th className="px-4 py-3">24h</th>
                            <th className="px-4 py-3">1 Semana</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(post => {
                            const PlatformIcon = PLATFORMS.find(p => p.id === post.platform)?.icon || FileText;
                            const platformStyle = PLATFORMS.find(p => p.id === post.platform)?.color || 'text-slate-500';

                            return (
                                <tr key={post.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer" onClick={() => handleEditPost(post)}>
                                    <td className="px-4 py-3 whitespace-nowrap">
                                        <div className="text-slate-900 dark:text-white font-medium">{format(parseISO(post.date), 'dd/MM/yyyy')}</div>
                                        {post.time && <div className="text-xs text-slate-500">{post.time}</div>}
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap">
                                        <div className="flex items-center space-x-2">
                                            <PlatformIcon className={`w-4 h-4 ${platformStyle}`} />
                                            <span className="capitalize text-slate-700 dark:text-slate-300">{post.platform.toLowerCase()}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-white max-w-xs truncate">
                                        {post.title}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`text-xs px-2 py-1 rounded-full border ${STATUS_COLORS[post.status]}`}>
                                            {post.status.toLowerCase()}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-500">
                                        <div className="flex flex-col">
                                            <span>⬆️ {post.uploaderType === 'COMPANY' ? 'Empresa' : getWorkerName(post.uploaderId)}</span>
                                            {post.creatorId && <span>✍️ {getWorkerName(post.creatorId)}</span>}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap">
                                        <div className="text-xs space-y-0.5">
                                            {post.stats24h ? (
                                                <>
                                                    {post.platform === 'LINKEDIN' ? (
                                                        <div className="flex gap-2" title="Impresiones | Reacciones">
                                                            <span>👁️ {post.stats24h.impressions || 0}</span>
                                                            <span>❤️ {post.stats24h.likes || 0}</span>
                                                        </div>
                                                    ) : (
                                                        <div className="flex gap-2">
                                                            <span>👁️ {post.stats24h.views || 0}</span>
                                                            <span>❤️ {post.stats24h.likes || 0}</span>
                                                        </div>
                                                    )}
                                                </>
                                            ) : <span className="text-slate-400">-</span>}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap">
                                        <div className="text-xs space-y-0.5">
                                            {post.stats1w ? (
                                                <>
                                                    {post.platform === 'LINKEDIN' ? (
                                                        <div className="flex gap-2" title="Impresiones | Reacciones">
                                                            <span>👁️ {post.stats1w.impressions || 0}</span>
                                                            <span>❤️ {post.stats1w.likes || 0}</span>
                                                        </div>
                                                    ) : (
                                                        <div className="flex gap-2">
                                                            <span>👁️ {post.stats1w.views || 0}</span>
                                                            <span>❤️ {post.stats1w.likes || 0}</span>
                                                        </div>
                                                    )}
                                                </>
                                            ) : <span className="text-slate-400">-</span>}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );

    return (
        <div className="space-y-6 h-[calc(100vh-100px)] flex flex-col">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Marketing</h1>
                    <p className="text-slate-500 dark:text-slate-400">Calendario de Redes Sociales y Campañas</p>
                </div>

                <div className="flex items-center gap-4">
                    {/* View Toggle */}
                    <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                        <button
                            onClick={() => setView('calendar')}
                            className={`p-2 rounded-md transition-all ${view === 'calendar' ? 'bg-white dark:bg-slate-700 shadow-sm text-primary-600' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <CalendarIcon className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setView('table')}
                            className={`p-2 rounded-md transition-all ${view === 'table' ? 'bg-white dark:bg-slate-700 shadow-sm text-primary-600' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <List className="w-4 h-4" />
                        </button>
                    </div>

                    {view === 'calendar' && (
                        <div className="flex items-center space-x-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                            <button
                                onClick={() => setCalendarView('week')}
                                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${calendarView === 'week' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500'}`}
                            >
                                Semanal
                            </button>
                            <button
                                onClick={() => setCalendarView('month')}
                                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${calendarView === 'month' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500'}`}
                            >
                                Mensual
                            </button>
                        </div>
                    )}

                    {view === 'calendar' && (
                        <div className="flex items-center space-x-2">
                            <Button variant="outline" onClick={handlePrev}><ChevronLeft className="w-5 h-5" /></Button>
                            <span className="font-medium min-w-[150px] text-center capitalize">
                                {format(currentDate, 'MMMM yyyy', { locale: es })}
                            </span>
                            <Button variant="outline" onClick={handleNext}><ChevronRight className="w-5 h-5" /></Button>
                        </div>
                    )}

                    {view === 'table' && (
                        <Button onClick={() => handleNewPost(new Date())}>
                            <Plus className="w-4 h-4 mr-2" />
                            Nuevo Post
                        </Button>
                    )}
                </div>
            </div>

            {view === 'calendar' ? renderCalendar() : renderTable()}

            <SocialPostModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                initialDate={selectedDate}
                post={selectedPost}
                onSave={() => { loadData(); handleCloseModal(); }}
                onDelete={async (id) => {
                    await storage.remove('crm_social_posts', id);
                    loadData();
                    handleCloseModal();
                }}
            />
        </div>
    );
}
