import React, { useState } from 'react';
import { Lead, LeadStatus } from '../types';
import { storage } from '../services/storage';
import { Trash2, Phone, Mail, DollarSign, Pencil } from 'lucide-react';


interface LeadsKanbanProps {
    leads: Lead[];
    onLeadUpdate: () => void | Promise<void>;
    onConvertLead: (lead: Lead) => void;
    onEditLead: (lead: Lead) => void;
}

const KANBAN_COLUMNS: { id: LeadStatus, label: string, color: string }[] = [
    { id: 'NUEVO', label: 'Nuevo', color: 'bg-slate-100' },
    { id: 'CONTACTADO', label: 'Contactado', color: 'bg-blue-50' },
    { id: 'REUNION', label: 'Reunión', color: 'bg-indigo-50' },
    { id: 'PROPUESTA', label: 'Propuesta', color: 'bg-amber-50' },
    { id: 'GANADO', label: 'Ganado', color: 'bg-green-50' },
    { id: 'PERDIDO', label: 'Perdido', color: 'bg-red-50' }
];

export default function LeadsKanban({ leads, onLeadUpdate, onConvertLead, onEditLead }: LeadsKanbanProps) {
    const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);

    // Optimize performance: Helper to group leads by status
    const leadsByStatus = React.useMemo(() => {
        const groups: Record<LeadStatus, Lead[]> = {
            'NUEVO': [],
            'CONTACTADO': [],
            'REUNION': [],
            'PROPUESTA': [],
            'GANADO': [],
            'PERDIDO': []
        };
        leads.forEach(lead => {
            if (groups[lead.status]) {
                groups[lead.status].push(lead);
            } else {
                // Fallback for unknown status
                if (!groups['NUEVO']) groups['NUEVO'] = [];
                groups['NUEVO'].push(lead);
            }
        });
        return groups;
    }, [leads]);

    const handleDragStart = (e: React.DragEvent, leadId: string) => {
        setDraggedLeadId(leadId);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = async (e: React.DragEvent, targetStatus: LeadStatus) => {
        e.preventDefault();
        if (draggedLeadId) {
            const lead = leads.find(l => l.id === draggedLeadId);
            if (lead && lead.status !== targetStatus) {
                const updatedLead = { ...lead, status: targetStatus, lastContactDate: new Date().toISOString() };
                await storage.update('crm_leads', updatedLead);
                await onLeadUpdate();
            }
        }
        setDraggedLeadId(null);
    };

    const handleDelete = async (e: React.MouseEvent, leadId: string) => {
        e.preventDefault();
        e.stopPropagation();
        if (window.confirm('¿Estás seguro de que deseas eliminar este lead?')) {
            await storage.delete('crm_leads', leadId);
            await onLeadUpdate();
        }
    };

    const handleConvert = (e: React.MouseEvent, lead: Lead) => {
        e.preventDefault();
        e.stopPropagation();
        if (window.confirm(`¿Convertir a ${lead.name} en cliente? Se creará una ficha de cliente y el lead pasará a estado GANADO.`)) {
            onConvertLead(lead);
        }
    };

    const handleEdit = (e: React.MouseEvent, lead: Lead) => {
        e.preventDefault();
        e.stopPropagation();
        onEditLead(lead);
    };

    return (
        <div className="flex flex-col h-[calc(100vh-250px)] min-h-[500px]">
            <div className="flex gap-4 overflow-x-auto pb-4 flex-1">
                {KANBAN_COLUMNS.map(col => (
                    <div
                        key={col.id}
                        className={`flex-shrink-0 w-72 rounded-xl flex flex-col ${col.color}`}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, col.id)}
                    >
                        <div className="p-4 font-semibold text-slate-700 flex justify-between items-center">
                            {col.label}
                            <span className="bg-white/50 px-2 py-0.5 rounded-full text-xs">
                                {leadsByStatus[col.id]?.length || 0}
                            </span>
                        </div>

                        <div className="flex-1 p-2 space-y-3 overflow-y-auto custom-scrollbar">
                            {leadsByStatus[col.id]?.map(lead => (
                                <div
                                    key={lead.id}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, lead.id)}
                                    className="bg-white p-3 rounded shadow-sm border border-slate-200 hover:shadow-md transition-shadow cursor-pointer group relative"
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="text-xs text-slate-500 font-medium badge badge-ghost opacity-70">
                                            {new Date(lead.createdAt).toLocaleDateString()}
                                        </div>
                                        <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={(e) => handleEdit(e, lead)}
                                                className="text-slate-400 hover:text-blue-500"
                                                title="Editar lead"
                                            >
                                                <Pencil className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={(e) => handleDelete(e, lead.id)}
                                                className="text-slate-400 hover:text-red-500"
                                                title="Eliminar lead"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>

                                    <h4 className="font-medium text-slate-900 mb-1 hover:text-primary-600">{lead.name}</h4>

                                    {lead.value && (
                                        <div className="flex items-center text-xs text-green-600 font-medium mb-2">
                                            <DollarSign className="w-3 h-3 mr-1" />
                                            {lead.value.toLocaleString()}€
                                        </div>
                                    )}

                                    <div className="flex flex-col gap-1 mt-2 pt-2 border-t border-slate-100">
                                        {lead.email && (
                                            <div className="flex items-center text-xs text-slate-500 truncate" title={lead.email}>
                                                <Mail className="w-3 h-3 mr-2 text-slate-400" />
                                                {lead.email}
                                            </div>
                                        )}
                                        {lead.phone && (
                                            <div className="flex items-center text-xs text-slate-500" title={lead.phone}>
                                                <Phone className="w-3 h-3 mr-2 text-slate-400" />
                                                {lead.phone}
                                            </div>
                                        )}
                                        {lead.notes && (
                                            <div className="mt-2 text-xs text-slate-600 bg-slate-50 p-2 rounded border border-slate-100 italic line-clamp-3" title={lead.notes}>
                                                "{lead.notes}"
                                            </div>
                                        )}
                                    </div>

                                    {lead.lastContactDate && (
                                        <div className="mt-2 text-[10px] text-slate-400 text-right">
                                            Act: {new Date(lead.lastContactDate).toLocaleDateString()}
                                        </div>
                                    )}

                                    <div className="mt-2 pt-2 border-t border-slate-100 flex justify-center">
                                        <button
                                            onClick={(e) => handleConvert(e, lead)}
                                            className="text-xs text-primary-600 hover:text-primary-700 font-medium hover:underline"
                                        >
                                            Convertir a Cliente
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
