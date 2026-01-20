import React, { useState } from 'react';
import { Project, ProjectStatus } from '../types';
import { Link } from 'react-router-dom';
import { storage } from '../services/storage';
import { Trash2 } from 'lucide-react';

interface ProjectWithClient extends Project {
    clientName?: string;
}

interface ProjectKanbanProps {
    projects: ProjectWithClient[];
    onProjectUpdate: () => void;
}

const KANBAN_COLUMNS: { id: ProjectStatus, label: string, color: string }[] = [
    { id: 'PLANIFICACION', label: 'Planificación', color: 'bg-slate-100' },
    { id: 'EN_CURSO', label: 'En Curso', color: 'bg-blue-50' },
    { id: 'PAUSADO', label: 'Pausado', color: 'bg-amber-50' },
    { id: 'COMPLETADO', label: 'Completado', color: 'bg-green-50' }
];

export default function ProjectKanban({ projects, onProjectUpdate }: ProjectKanbanProps) {
    const [draggedProjectId, setDraggedProjectId] = useState<string | null>(null);

    const handleDragStart = (e: React.DragEvent, projectId: string) => {
        setDraggedProjectId(projectId);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e: React.DragEvent, targetStatus: ProjectStatus) => {
        e.preventDefault();
        if (draggedProjectId) {
            const project = projects.find(p => p.id === draggedProjectId);
            if (project && project.status !== targetStatus) {
                const updatedProject = { ...project, status: targetStatus };
                // Remove clientName if it leaked into the object before saving to storage? 
                const { clientName, ...projectToSave } = updatedProject;
                storage.update('crm_projects', projectToSave);
                onProjectUpdate();
            }
        }
        setDraggedProjectId(null);
    };

    const handleDelete = (e: React.MouseEvent, projectId: string) => {
        e.preventDefault();
        e.stopPropagation();
        if (window.confirm('¿Estás seguro de que deseas eliminar este proyecto?')) {
            storage.deleteProject(projectId);
            onProjectUpdate();
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-250px)] min-h-[500px]">
            <div className="flex gap-4 overflow-x-auto pb-4 flex-1">
                {KANBAN_COLUMNS.map(col => (
                    <div
                        key={col.id}
                        className={`flex-shrink-0 w-80 rounded-xl flex flex-col ${col.color}`}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, col.id)}
                    >
                        <div className="p-4 font-semibold text-slate-700 flex justify-between items-center">
                            {col.label}
                            <span className="bg-white/50 px-2 py-0.5 rounded-full text-xs">
                                {projects.filter(p => p.status === col.id).length}
                            </span>
                        </div>

                        <div className="flex-1 p-2 space-y-3 overflow-y-auto custom-scrollbar">
                            {projects
                                .filter(p => p.status === col.id)
                                .map(project => (
                                    <div
                                        key={project.id}
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, project.id)}
                                        className="bg-white p-3 rounded shadow-sm border border-slate-200 hover:shadow-md transition-shadow cursor-pointer group relative"
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="text-xs text-slate-500 font-mono">{project.code}</div>
                                            <button
                                                onClick={(e) => handleDelete(e, project.id)}
                                                className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                                title="Eliminar proyecto"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                        <Link to={`/projects/${project.id}`} className="block">
                                            <h4 className="font-medium text-slate-900 mb-1 hover:text-primary-600">{project.name}</h4>
                                            <p className="text-xs text-slate-500 mb-2">{project.city}</p>

                                            <div className="flex items-center justify-between text-xs text-slate-500 mt-2">
                                                <span>{new Date(project.deliveryDate).toLocaleDateString()}</span>
                                                <span className="font-semibold text-slate-700">{project.budget.toLocaleString()}€</span>
                                            </div>

                                            {/* Client Name */}
                                            <div className="mt-2 pt-2 border-t border-slate-100 text-xs text-slate-500 flex items-center">
                                                <span className="truncate max-w-[150px]">{project.clientName}</span>
                                            </div>
                                        </Link>
                                    </div>
                                ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* Drop Zone for Delivered */}
            <div
                className={`mt-4 border-2 border-dashed rounded-xl p-8 text-center transition-colors ${draggedProjectId ? 'border-green-300 bg-green-50 text-green-700' : 'border-slate-200 text-slate-400'}`}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, 'ENTREGADO')}
            >
                <div className="pointer-events-none">
                    <p className="font-medium">Arrastra aquí para marcar como ENTREGADO</p>
                    <p className="text-sm opacity-75">El proyecto se moverá a estado Entregado y desaparecerá del tablero principal</p>
                </div>
            </div>
        </div>
    );
}
