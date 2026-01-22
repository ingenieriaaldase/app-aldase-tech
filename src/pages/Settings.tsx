import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { storage } from '../services/storage';
import { Trash2, Plus } from 'lucide-react';
import DataMigration from '../components/DataMigration';

export default function Settings() {
    const [projectTypes, setProjectTypes] = useState<string[]>([]);
    const [taskCategories, setTaskCategories] = useState<string[]>([]);
    const [newProjectType, setNewProjectType] = useState('');
    const [newTaskCategory, setNewTaskCategory] = useState('');

    // Design Categories Logic
    const [designCategories, setDesignCategories] = useState<string[]>([]);
    const [newDesignCategory, setNewDesignCategory] = useState('');

    // Event Types Logic
    const [eventTypes, setEventTypes] = useState<string[]>([]);
    const [newEventType, setNewEventType] = useState('');

    useEffect(() => {
        setProjectTypes(storage.getProjectTypes());
        setTaskCategories(storage.getTaskCategories());
        setDesignCategories(storage.getDesignCategories());
        setEventTypes(storage.getEventTypes()); // Load event types
    }, []);

    const handleAddProjectType = () => {
        if (newProjectType.trim()) {
            const updated = [...projectTypes, newProjectType.trim()];
            setProjectTypes(updated);
            storage.setProjectTypes(updated);
            setNewProjectType('');
        }
    };

    const handleRemoveProjectType = (type: string) => {
        const updated = projectTypes.filter(t => t !== type);
        setProjectTypes(updated);
        storage.setProjectTypes(updated);
    };

    const handleAddTaskCategory = () => {
        if (newTaskCategory.trim()) {
            const updated = [...taskCategories, newTaskCategory.trim()];
            setTaskCategories(updated);
            storage.setTaskCategories(updated);
            setNewTaskCategory('');
        }
    };

    const handleRemoveTaskCategory = (cat: string) => {
        const updated = taskCategories.filter(c => c !== cat);
        setTaskCategories(updated);
        storage.setTaskCategories(updated);
    };

    const handleAddDesignCategory = () => {
        if (newDesignCategory.trim()) {
            const updated = [...designCategories, newDesignCategory.trim()];
            setDesignCategories(updated);
            storage.setDesignCategories(updated);
            setNewDesignCategory('');
        }
    };

    const handleRemoveDesignCategory = (cat: string) => {
        const updated = designCategories.filter(c => c !== cat);
        setDesignCategories(updated);
        storage.setDesignCategories(updated);
    };

    const handleAddEventType = () => {
        if (newEventType.trim()) {
            const updated = [...eventTypes, newEventType.trim()];
            setEventTypes(updated);
            storage.setEventTypes(updated);
            setNewEventType('');
        }
    };

    const handleRemoveEventType = (type: string) => {
        const updated = eventTypes.filter(t => t !== type);
        setEventTypes(updated);
        storage.setEventTypes(updated);
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">Configuración</h1>
                <p className="text-slate-500">Gestión de categorías y tipos del sistema</p>
            </div>

            {/* Migration Tool */}
            <DataMigration />

            <div className="grid gap-6 md:grid-cols-2">
                {/* Project Types */}
                <Card>
                    <CardHeader>
                        <CardTitle>Tipos de Proyecto</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex gap-2">
                            <Input
                                placeholder="Nuevo tipo..."
                                value={newProjectType}
                                onChange={(e) => setNewProjectType(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddProjectType()}
                            />
                            <Button onClick={handleAddProjectType} size="sm">
                                <Plus className="w-4 h-4" />
                            </Button>
                        </div>
                        <ul className="space-y-2">
                            {projectTypes.map((type, idx) => (
                                <li key={idx} className="flex justify-between items-center p-3 bg-slate-50 rounded-md border border-slate-100">
                                    <span>{type}</span>
                                    <button
                                        onClick={() => handleRemoveProjectType(type)}
                                        className="text-slate-400 hover:text-red-500 transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>

                {/* Task Categories */}
                <Card>
                    <CardHeader>
                        <CardTitle>Categorías de Tareas</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex gap-2">
                            <Input
                                placeholder="Nueva categoría..."
                                value={newTaskCategory}
                                onChange={(e) => setNewTaskCategory(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddTaskCategory()}
                            />
                            <Button onClick={handleAddTaskCategory} size="sm">
                                <Plus className="w-4 h-4" />
                            </Button>
                        </div>
                        <ul className="space-y-2">
                            {taskCategories.map((cat, idx) => (
                                <li key={idx} className="flex justify-between items-center p-3 bg-slate-50 rounded-md border border-slate-100">
                                    <span>{cat}</span>
                                    <button
                                        onClick={() => handleRemoveTaskCategory(cat)}
                                        className="text-slate-400 hover:text-red-500 transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>

                {/* Design Sub-categories */}
                <Card>
                    <CardHeader>
                        <CardTitle>Subcategorías de Diseño</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex gap-2">
                            <Input
                                placeholder="Nueva subcategoría..."
                                value={newDesignCategory}
                                onChange={(e) => setNewDesignCategory(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddDesignCategory()}
                            />
                            <Button onClick={handleAddDesignCategory} size="sm">
                                <Plus className="w-4 h-4" />
                            </Button>
                        </div>
                        <ul className="space-y-2">
                            {designCategories.map((cat, idx) => (
                                <li key={idx} className="flex justify-between items-center p-3 bg-slate-50 rounded-md border border-slate-100">
                                    <span>{cat}</span>
                                    <button
                                        onClick={() => handleRemoveDesignCategory(cat)}
                                        className="text-slate-400 hover:text-red-500 transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>

                {/* Event Types Settings */}
                <Card>
                    <CardHeader>
                        <CardTitle>Tipos de Evento</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex gap-2">
                            <Input
                                placeholder="Nuevo tipo de evento..."
                                value={newEventType}
                                onChange={(e) => setNewEventType(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddEventType()}
                            />
                            <Button onClick={handleAddEventType} size="sm">
                                <Plus className="w-4 h-4" />
                            </Button>
                        </div>
                        <ul className="space-y-2">
                            {eventTypes.map((type, idx) => (
                                <li key={idx} className="flex justify-between items-center p-3 bg-slate-50 rounded-md border border-slate-100">
                                    <span>{type}</span>
                                    <button
                                        onClick={() => handleRemoveEventType(type)}
                                        className="text-slate-400 hover:text-red-500 transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
