import React from 'react';
import { useForm } from 'react-hook-form';
import { X } from 'lucide-react';
import { Lead } from '../types';
import { ProvinceSelect } from './ui/ProvinceSelect';


interface LeadFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: Partial<Lead>) => void;
    initialLead?: Lead;
}

export default function LeadFormModal({ isOpen, onClose, onSubmit, initialLead }: LeadFormModalProps) {
    const { register, handleSubmit, reset, formState: { errors } } = useForm<Partial<Lead>>();

    React.useEffect(() => {
        if (isOpen) {
            if (initialLead) {
                reset(initialLead);
            } else {
                reset({
                    name: '',
                    city: '',
                    email: '',
                    phone: '',
                    source: 'Web',
                    notes: ''
                });
            }
        }
    }, [isOpen, initialLead, reset]);

    if (!isOpen) return null;

    const onFormSubmit = (data: Partial<Lead>) => {
        onSubmit({
            ...data,
            status: initialLead ? initialLead.status : 'NUEVO',
            createdAt: initialLead ? initialLead.createdAt : new Date().toISOString()
        });
        reset();
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                <div className="flex justify-between items-center p-4 border-b border-slate-100 dark:border-slate-800">
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                        {initialLead ? 'Editar Lead' : 'Nuevo Lead'}
                    </h2>
                    <button onClick={onClose} className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit(onFormSubmit)} className="p-4 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Nombre
                        </label>
                        <input
                            {...register('name', { required: 'El nombre es obligatorio' })}
                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                            placeholder="Nombre del contacto o empresa"
                        />
                        {errors.name && <span className="text-xs text-red-500">{errors.name.message}</span>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Ciudad
                        </label>
                        <input
                            {...register('city')}
                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                            placeholder="Ciudad"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Provincia
                        </label>
                        <ProvinceSelect
                            {...register('province')}
                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Canal de contacto (Fuente)
                        </label>
                        <select
                            {...register('source')}
                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                        >
                            <option value="Web">Web</option>
                            <option value="Referido">Referido</option>
                            <option value="LinkedIn">LinkedIn</option>
                            <option value="Instagram">Instagram</option>
                            <option value="Llamada">Llamada</option>
                            <option value="Otro">Otro</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Notas
                        </label>
                        <textarea
                            {...register('notes')}
                            rows={3}
                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none resize-none"
                            placeholder="Información adicional..."
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                Email
                            </label>
                            <input
                                {...register('email')}
                                type="email"
                                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                                placeholder="Email"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                Teléfono
                            </label>
                            <input
                                {...register('phone')}
                                type="tel"
                                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                                placeholder="Teléfono"
                            />
                        </div>
                    </div>

                    <div className="pt-4 flex justify-end space-x-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                        >
                            Guardar Lead
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
