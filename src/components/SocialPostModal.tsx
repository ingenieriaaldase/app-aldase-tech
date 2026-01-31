import { useEffect, useState } from 'react';

import { useForm, useWatch } from 'react-hook-form';
import { X, Calendar as CalendarIcon, Hash, User, Building, Clock, BarChart3, TrendingUp } from 'lucide-react';

import { SocialPost, SocialPlatform, PostStatus, Worker } from '../types';
import { storage } from '../services/storage';
import { format } from 'date-fns';

interface SocialPostModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialDate?: Date | null;
    post?: SocialPost;
    onSave: () => void;
    onDelete?: (id: string) => void;
}

const PLATFORMS: SocialPlatform[] = ['INSTAGRAM', 'FACEBOOK', 'LINKEDIN', 'TIKTOK', 'TWITTER', 'YOUTUBE', 'BLOG'];
const STATUSES: PostStatus[] = ['IDEA', 'BORRADOR', 'PROGRAMADO', 'PUBLICADO'];

export default function SocialPostModal({ isOpen, onClose, initialDate, post, onSave, onDelete }: SocialPostModalProps) {
    const { register, handleSubmit, reset, control, setValue } = useForm<SocialPost>();
    const [workers, setWorkers] = useState<Worker[]>([]);

    const uploaderType = useWatch({
        control,
        name: 'uploaderType',
        defaultValue: 'COMPANY'
    });

    const status = useWatch({
        control,
        name: 'status',
        defaultValue: 'IDEA'
    });

    const platform = useWatch({
        control,
        name: 'platform',
        defaultValue: 'INSTAGRAM'
    });

    useEffect(() => {
        loadWorkers();
    }, []);

    const loadWorkers = async () => {
        const storedWorkers = await storage.getAll<Worker>('crm_workers');
        setWorkers(storedWorkers);
    };

    useEffect(() => {
        if (isOpen) {
            if (post) {
                reset(post);
            } else {
                reset({
                    id: crypto.randomUUID(),
                    status: 'IDEA',
                    platform: 'INSTAGRAM',
                    date: initialDate ? format(initialDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
                    time: '10:00',
                    hashtags: '',
                    uploaderType: 'COMPANY',
                    uploaderId: '',
                    creatorId: ''
                });
            }
        }
    }, [isOpen, post, initialDate, reset]);

    useEffect(() => {
        if (uploaderType === 'COMPANY') {
            setValue('uploaderId', undefined);
        }
    }, [uploaderType, setValue]);

    if (!isOpen) return null;

    const onSubmit = (data: SocialPost) => {
        if (post) {
            storage.update('crm_social_posts', data);
        } else {
            storage.add('crm_social_posts', { ...data, id: crypto.randomUUID() });
        }
        onSave();
    };

    // Components helpers for stats inputs
    const StatInput = ({ label, registerName }: { label: string, registerName: any }) => (
        <div>
            <label className="block text-[10px] font-medium text-slate-500 mb-1 truncate" title={label}>{label}</label>
            <input
                type="number"
                {...register(registerName)}
                className="w-full px-2 py-1.5 border rounded bg-white dark:bg-slate-800 text-xs focus:ring-1 focus:ring-primary-500 outline-none border-slate-300 dark:border-slate-700"
                placeholder="0"
            />
        </div>
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center p-4 border-b border-slate-100 dark:border-slate-800">
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                        {post ? 'Editar Publicación' : 'Nueva Publicación'}
                    </h2>
                    <button onClick={onClose} className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-6">

                        {/* 1. Detalles Principales */}
                        <div className="space-y-4">
                            <input
                                {...register('title', { required: true })}
                                className="w-full px-3 py-2 text-xl font-bold border-b border-transparent hover:border-slate-200 focus:border-primary-500 transition-colors bg-transparent outline-none placeholder:text-slate-300"
                                placeholder="Título de la publicación..."
                            />

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 mb-1">Fecha</label>
                                            <div className="relative">
                                                <CalendarIcon className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-400" />
                                                <input
                                                    {...register('date')}
                                                    type="date"
                                                    className="w-full pl-9 pr-3 py-2 border rounded-lg bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-primary-500 outline-none border-slate-300 dark:border-slate-700"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 mb-1">Hora</label>
                                            <div className="relative">
                                                <Clock className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-400" />
                                                <input
                                                    {...register('time')}
                                                    type="time"
                                                    className="w-full pl-9 pr-3 py-2 border rounded-lg bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-primary-500 outline-none border-slate-300 dark:border-slate-700"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 mb-1">Red Social</label>
                                        <select
                                            {...register('platform')}
                                            className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-primary-500 outline-none border-slate-300 dark:border-slate-700"
                                        >
                                            {PLATFORMS.map(p => (
                                                <option key={p} value={p}>{p}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 mb-1">Estado</label>
                                        <select
                                            {...register('status')}
                                            className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-primary-500 outline-none border-slate-300 dark:border-slate-700"
                                        >
                                            {STATUSES.map(s => (
                                                <option key={s} value={s}>{s}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <textarea
                                        {...register('content')}
                                        rows={8}
                                        className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-800/50 text-sm focus:ring-2 focus:ring-primary-500 outline-none border-slate-200 dark:border-slate-700 resize-none h-full"
                                        placeholder="Contenido de la publicación, copy, scripts..."
                                    />
                                </div>
                            </div>
                        </div>

                        {/* 2. Responsables */}
                        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 space-y-4">
                            <h4 className="text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-wider flex items-center">
                                <User className="w-3.5 h-3.5 mr-2" /> Responsables
                            </h4>
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-2">Quién sube el post</label>
                                    <div className="space-y-3">
                                        <div className="flex bg-white dark:bg-slate-900 rounded-lg p-1 border border-slate-200 dark:border-slate-700 w-fit">
                                            <label className={`flex items-center space-x-2 px-3 py-1.5 rounded-md cursor-pointer transition-colors ${uploaderType === 'COMPANY' ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                                                <input type="radio" value="COMPANY" {...register('uploaderType')} className="hidden" />
                                                <Building className="w-3.5 h-3.5" />
                                                <span className="text-xs font-medium">Empresa</span>
                                            </label>
                                            <label className={`flex items-center space-x-2 px-3 py-1.5 rounded-md cursor-pointer transition-colors ${uploaderType === 'WORKER' ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                                                <input type="radio" value="WORKER" {...register('uploaderType')} className="hidden" />
                                                <User className="w-3.5 h-3.5" />
                                                <span className="text-xs font-medium">Persona</span>
                                            </label>
                                        </div>

                                        {uploaderType === 'WORKER' && (
                                            <select
                                                {...register('uploaderId', { required: uploaderType === 'WORKER' })}
                                                className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-primary-500 outline-none border-slate-300 dark:border-slate-700 animate-in fade-in slide-in-from-top-1"
                                            >
                                                <option value="">Seleccionar empleado...</option>
                                                {workers.map(worker => (
                                                    <option key={worker.id} value={worker.id}>{worker.name} {worker.surnames}</option>
                                                ))}
                                            </select>
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-2">Creado por</label>
                                    <select
                                        {...register('creatorId')}
                                        className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-primary-500 outline-none border-slate-300 dark:border-slate-700"
                                    >
                                        <option value="">Seleccionar creador (opcional)...</option>
                                        {workers.map(worker => (
                                            <option key={worker.id} value={worker.id}>{worker.name} {worker.surnames}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* 3. Stats Section - Only visible if Published */}
                        {status === 'PUBLICADO' && (
                            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 space-y-4 animate-in fade-in zoom-in-95 duration-300">
                                <h4 className="text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-wider flex items-center text-primary-600">
                                    <BarChart3 className="w-3.5 h-3.5 mr-2" /> Resultados y Estadísticas
                                </h4>

                                <div className="grid grid-cols-2 gap-8">
                                    {/* 24 Hours */}
                                    <div>
                                        <h5 className="text-xs font-medium text-slate-900 dark:text-white mb-3 flex items-center">
                                            <Clock className="w-3 h-3 mr-1.5 text-slate-400" /> 24 Horas
                                        </h5>
                                        <div className="grid grid-cols-2 gap-3">
                                            {platform === 'LINKEDIN' ? (
                                                <>
                                                    <StatInput label="Impresiones" registerName="stats24h.impressions" />
                                                    <StatInput label="Alcance" registerName="stats24h.reached" />
                                                    <StatInput label="Visitas Perfil" registerName="stats24h.profileViews" />
                                                    <StatInput label="Reacciones" registerName="stats24h.likes" />
                                                    <StatInput label="Comentarios" registerName="stats24h.comments" />
                                                    <StatInput label="Compartidos" registerName="stats24h.shares" />
                                                    <StatInput label="Clics" registerName="stats24h.clicks" />
                                                    <StatInput label="Seguidores" registerName="stats24h.followers" />
                                                    <StatInput label="Guardados" registerName="stats24h.saves" />
                                                    <StatInput label="Enviados" registerName="stats24h.sends" />
                                                </>
                                            ) : (
                                                <>
                                                    <StatInput label="Vistas/Impresiones" registerName="stats24h.views" />
                                                    <StatInput label="Likes" registerName="stats24h.likes" />
                                                    <StatInput label="Comentarios" registerName="stats24h.comments" />
                                                    <StatInput label="Compartidos" registerName="stats24h.shares" />
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {/* 1 Week */}
                                    <div>
                                        <h5 className="text-xs font-medium text-slate-900 dark:text-white mb-3 flex items-center">
                                            <TrendingUp className="w-3 h-3 mr-1.5 text-slate-400" /> 1 Semana
                                        </h5>
                                        <div className="grid grid-cols-2 gap-3">
                                            {platform === 'LINKEDIN' ? (
                                                <>
                                                    <StatInput label="Impresiones" registerName="stats1w.impressions" />
                                                    <StatInput label="Alcance" registerName="stats1w.reached" />
                                                    <StatInput label="Visitas Perfil" registerName="stats1w.profileViews" />
                                                    <StatInput label="Reacciones" registerName="stats1w.likes" />
                                                    <StatInput label="Comentarios" registerName="stats1w.comments" />
                                                    <StatInput label="Compartidos" registerName="stats1w.shares" />
                                                    <StatInput label="Clics" registerName="stats1w.clicks" />
                                                    <StatInput label="Seguidores" registerName="stats1w.followers" />
                                                    <StatInput label="Guardados" registerName="stats1w.saves" />
                                                    <StatInput label="Enviados" registerName="stats1w.sends" />
                                                </>
                                            ) : (
                                                <>
                                                    <StatInput label="Vistas/Impresiones" registerName="stats1w.views" />
                                                    <StatInput label="Likes" registerName="stats1w.likes" />
                                                    <StatInput label="Comentarios" registerName="stats1w.comments" />
                                                    <StatInput label="Compartidos" registerName="stats1w.shares" />
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">Hashtags</label>
                            <div className="relative">
                                <Hash className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                                <input
                                    {...register('hashtags')}
                                    className="w-full pl-9 pr-3 py-2 border rounded-lg bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-primary-500 outline-none border-slate-300 dark:border-slate-700"
                                    placeholder="marketing, design, architecture..."
                                />
                            </div>
                        </div>
                    </div>

                    <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center z-10 shrink-0">
                        {post && onDelete ? (
                            <button
                                type="button"
                                onClick={() => {
                                    if (window.confirm('¿Estás seguro de que quieres eliminar esta publicación?')) {
                                        onDelete(post.id);
                                    }
                                }}
                                className="text-red-500 hover:text-red-700 text-sm font-medium transition-colors"
                            >
                                Eliminar
                            </button>
                        ) : <div></div>}

                        <div className="flex space-x-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors shadow-sm"
                            >
                                Guardar Publicación
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
