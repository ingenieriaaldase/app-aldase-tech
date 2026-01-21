import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { storage } from '../services/storage';
import { Project, TimeEntry } from '../types';
import { Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Clock, TrendingUp, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';

const COLORS = ['#0ea5e9', '#22c55e', '#eab308', '#ef4444', '#cbd5e1'];

export default function Dashboard() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [activeProjects, setActiveProjects] = useState<Project[]>([]);
    const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);

    const [events, setEvents] = useState<any[]>([]);
    const [workers, setWorkers] = useState<any[]>([]);

    useEffect(() => {
        const loadData = async () => {
            const [allProjects, allEntries, allEvents, allWorkers] = await Promise.all([
                storage.getProjects(),
                storage.getTimeEntries(),
                storage.getEvents(),
                storage.getWorkers()
            ]);
            setProjects(allProjects);
            setActiveProjects(allProjects.filter(p => p.status === 'EN_CURSO' || p.status === 'PLANIFICACION'));
            setTimeEntries(allEntries);
            setEvents(allEvents);
            setWorkers(allWorkers);
        };
        loadData();
    }, []);

    // Stats Check
    const totalHours = timeEntries.reduce((acc, curr) => acc + curr.hours, 0);
    const totalBudget = activeProjects.reduce((acc, curr) => acc + curr.budget, 0);

    // Status Chart Data
    const statusData = [
        { name: 'En Curso', value: projects.filter(p => p.status === 'EN_CURSO').length },
        { name: 'Planificación', value: projects.filter(p => p.status === 'PLANIFICACION').length },
        { name: 'Completado', value: projects.filter(p => p.status === 'COMPLETADO').length },
        { name: 'Pausado', value: projects.filter(p => p.status === 'PAUSADO').length },
    ];

    // Clean empty values for chart
    const pieData = statusData.filter(d => d.value > 0);

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">Dashboard</h1>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="border-l-4 border-l-primary-500">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">Proyectos Activos</CardTitle>
                        <TrendingUp className="h-4 w-4 text-primary-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{activeProjects.length}</div>
                        <p className="text-xs text-slate-500">En curso o planificación</p>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-green-500">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">Horas Totales</CardTitle>
                        <Clock className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalHours}h</div>
                        <p className="text-xs text-slate-500">Registradas este mes</p>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-yellow-500">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">Presupuesto Activo</CardTitle>
                        <CheckCircle2 className="h-4 w-4 text-yellow-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalBudget.toLocaleString('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}</div>
                        <p className="text-xs text-slate-500">Volumen de obra en curso</p>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-red-500">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">Alertas</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">0</div>
                        <p className="text-xs text-slate-500">Vencimientos próximos</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4">
                    <CardHeader>
                        <CardTitle>Estado de Proyectos</CardTitle>
                    </CardHeader>
                    <CardContent className="pl-2">
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={pieData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {pieData.map((_, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="flex justify-center gap-4 text-sm text-slate-600 mt-4">
                            {pieData.map((entry, index) => (
                                <div key={entry.name} className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                                    <span>{entry.name} ({entry.value})</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                <Card className="col-span-3">
                    <CardHeader>
                        <CardTitle>Entregas Próximas</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {activeProjects.slice(0, 5).map(project => (
                                <div key={project.id} className="flex items-center justify-between border-b border-slate-100 pb-2 last:border-0 last:pb-0">
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium leading-none">{project.name}</p>
                                        <p className="text-xs text-slate-500">{project.deliveryDate}</p>
                                    </div>
                                    <Link to={`/projects/${project.id}`} className="text-xs text-primary-600 hover:underline">Ver</Link>
                                </div>
                            ))}
                            {activeProjects.length === 0 && (
                                <p className="text-sm text-slate-500 text-center py-4">No hay entregas próximas</p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>


            {/* Third Row: Upcoming Events & Latest Time Entries */}
            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader><CardTitle>Próximos Eventos</CardTitle></CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {(() => {
                                const upcomingEvents = events
                                    .filter(e => new Date(e.date) >= new Date())
                                    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                                    .slice(0, 5);

                                if (upcomingEvents.length === 0) return <p className="text-sm text-slate-500 py-4">No hay eventos próximos</p>;

                                return upcomingEvents.map(event => (
                                    <div key={event.id} className="flex items-start justify-between border-b border-slate-100 pb-2 last:border-0 last:pb-0">
                                        <div>
                                            <p className="text-sm font-medium">{event.title}</p>
                                            <p className="text-xs text-slate-500">{new Date(event.date).toLocaleDateString()} - {event.type}</p>
                                        </div>
                                    </div>
                                ));
                            })()}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader><CardTitle>Últimos Registros de Horas</CardTitle></CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {(() => {
                                const latestEntries = [...timeEntries]
                                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                    .slice(0, 5);

                                if (latestEntries.length === 0) return <p className="text-sm text-slate-500 py-4">No hay registros recientes</p>;

                                const getWorkerName = (id: string) => workers.find(w => w.id === id)?.name || 'Usuario';
                                const getProjectName = (id?: string) => {
                                    if (!id) return 'General';
                                    return projects.find(p => p.id === id)?.name || 'Proyecto';
                                };

                                return latestEntries.map(entry => (
                                    <div key={entry.id} className="flex items-center justify-between border-b border-slate-100 pb-2 last:border-0 last:pb-0">
                                        <div>
                                            <p className="text-sm font-medium">{getWorkerName(entry.workerId)}</p>
                                            <p className="text-xs text-slate-500">{getProjectName(entry.projectId)}</p>
                                        </div>
                                        <div className="text-sm font-bold text-slate-700">{entry.hours}h</div>
                                    </div>
                                ));
                            })()}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div >
    );
}
