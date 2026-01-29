import { useState, useEffect } from 'react';

import { Button } from '../components/ui/Button';
import { storage } from '../services/storage';
import { SocialPost, SocialPlatform, PostStatus } from '../types';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, addWeeks, subWeeks, parseISO, isToday } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus, Instagram, Linkedin, Facebook, Twitter, Youtube, FileText } from 'lucide-react';

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
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [selectedPost, setSelectedPost] = useState<SocialPost | undefined>(undefined);

    // Initial Load
    useEffect(() => {
        loadPosts();
    }, []);

    const loadPosts = async () => {
        const storedPosts = await storage.getAll<SocialPost>('crm_social_posts');
        setPosts(storedPosts);
    };

    // Calendar Logic (Weekly View)
    const start = startOfWeek(currentDate, { weekStartsOn: 1 });
    const end = endOfWeek(currentDate, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start, end });

    const handlePrevWeek = () => setCurrentDate(subWeeks(currentDate, 1));
    const handleNextWeek = () => setCurrentDate(addWeeks(currentDate, 1));

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

    return (
        <div className="space-y-6 h-[calc(100vh-100px)] flex flex-col">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Marketing</h1>
                    <p className="text-slate-500 dark:text-slate-400">Calendario de Redes Sociales y Campañas</p>
                </div>
                <div className="flex items-center space-x-2">
                    <Button variant="outline" onClick={handlePrevWeek}><ChevronLeft className="w-5 h-5" /></Button>
                    <span className="font-medium min-w-[150px] text-center capitalize">
                        {format(start, 'MMMM yyyy', { locale: es })}
                    </span>
                    <Button variant="outline" onClick={handleNextWeek}><ChevronRight className="w-5 h-5" /></Button>
                </div>
            </div>

            {/* Weekly Calendar */}
            <div className="grid grid-cols-7 gap-4 flex-1 overflow-hidden min-h-0">
                {days.map(day => {
                    const dayPosts = posts.filter(p => isSameDay(parseISO(p.date), day));
                    return (
                        <div key={day.toString()} className={`flex flex-col bg-slate-50 dark:bg-slate-900/50 rounded-xl border ${isToday(day) ? 'border-primary-500 ring-1 ring-primary-500' : 'border-slate-200 dark:border-slate-800'}`}>
                            <div className={`p-3 text-center border-b border-slate-200 dark:border-slate-800 ${isToday(day) ? 'bg-primary-50 dark:bg-primary-900/20' : ''}`}>
                                <div className="text-xs uppercase text-slate-500 font-semibold">{format(day, 'EEE', { locale: es })}</div>
                                <div className={`text-xl font-bold ${isToday(day) ? 'text-primary-600' : 'text-slate-700 dark:text-slate-300'}`}>
                                    {format(day, 'd')}
                                </div>
                            </div>

                            <div className="flex-1 p-2 space-y-2 overflow-y-auto custom-scrollbar">
                                {dayPosts.map(post => {
                                    const PlatformIcon = PLATFORMS.find(p => p.id === post.platform)?.icon || FileText;
                                    const platformStyle = PLATFORMS.find(p => p.id === post.platform)?.color || 'text-slate-500';

                                    return (
                                        <div
                                            key={post.id}
                                            onClick={() => handleEditPost(post)}
                                            className="bg-white dark:bg-slate-800 p-2 rounded-lg shadow-sm border border-slate-100 dark:border-slate-700 cursor-pointer hover:shadow-md transition-shadow group"
                                        >
                                            <div className="flex justify-between items-start mb-1">
                                                <PlatformIcon className={`w-4 h-4 ${platformStyle}`} />
                                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${STATUS_COLORS[post.status]}`}>
                                                    {post.status.toLowerCase()}
                                                </span>
                                            </div>
                                            <h4 className="text-sm font-medium text-slate-900 dark:text-white line-clamp-2 leading-tight mb-1 group-hover:text-primary-600 transition-colors">{post.title}</h4>
                                            {post.hashtags && (
                                                <p className="text-[10px] text-slate-400 line-clamp-1">{post.hashtags}</p>
                                            )}
                                        </div>
                                    );
                                })}

                                <button
                                    onClick={() => handleNewPost(day)}
                                    className="w-full py-2 bg-transparent border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg text-slate-400 hover:text-primary-500 hover:border-primary-300 hover:bg-primary-50/50 transition-all flex items-center justify-center opacity-50 hover:opacity-100"
                                >
                                    <Plus className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            <SocialPostModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                initialDate={selectedDate}
                post={selectedPost}
                onSave={() => { loadPosts(); handleCloseModal(); }}
                onDelete={async (id) => {
                    await storage.remove('crm_social_posts', id);
                    loadPosts();
                    handleCloseModal();
                }}
            />
        </div>
    );
}
