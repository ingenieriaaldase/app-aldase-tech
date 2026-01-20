import { useEffect, useState } from 'react';
import { storage } from '../services/storage';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
    PieChart, Pie, Cell
} from 'recharts';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet Default Icon
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// Mock Coordinates for Spanish Cities (Expand as needed)
const CITY_COORDS: Record<string, [number, number]> = {
    'Madrid': [40.4168, -3.7038],
    'Barcelona': [41.3851, 2.1734],
    'Valencia': [39.4699, -0.3763],
    'Sevilla': [37.3891, -5.9845],
    'Bilbao': [43.2630, -2.9350],
    'Málaga': [36.7212, -4.4217],
    'Zaragoza': [41.6488, -0.8891],
    'Murcia': [37.9922, -1.1307],
    'Palma': [39.5696, 2.6502],
    'Las Palmas': [28.1235, -15.4363],
    'Alicante': [38.3452, -0.4810],
    'Córdoba': [37.8882, -4.7794],
    'Valladolid': [41.6523, -4.7245],
    'Vigo': [42.2406, -8.7207],
    'Gijón': [43.5322, -5.6611],
    'Getafe': [40.3083, -3.7327],
    'Pozuelo': [40.4349, -3.8158],
    'Alcobendas': [40.5374, -3.6373],
    'Leganés': [40.3272, -3.7635],
    'Fuenlabrada': [40.2854, -3.7950]
};

const COLORS = ['#0ea5e9', '#22c55e', '#eab308', '#ef4444', '#8b5cf6', '#ec4899', '#f97316', '#14b8a6'];

export default function Analytics() {
    const [financialData, setFinancialData] = useState<any[]>([]);
    const [projectsByType, setProjectsByType] = useState<any[]>([]);
    const [projectsByCity, setProjectsByCity] = useState<any[]>([]);
    const [mapData, setMapData] = useState<any[]>([]);

    useEffect(() => {
        const projects = storage.getProjects();
        const entries = storage.getTimeEntries();

        // 1. Profitability per Project
        const financial = projects.map(p => {
            const projectHours = entries.filter(e => e.projectId === p.id).reduce((acc, curr) => acc + curr.hours, 0);
            return {
                name: p.name.substring(0, 15) + (p.name.length > 15 ? '...' : ''),
                Presupuesto: p.budget,
                Costes: p.costs,
                Beneficio: p.budget - p.costs,
                Horas: projectHours
            };
        });
        setFinancialData(financial);

        // 2. Projects by Type
        const typeCount: Record<string, number> = {};
        projects.forEach(p => {
            const type = p.type || 'Otros';
            typeCount[type] = (typeCount[type] || 0) + 1;
        });
        setProjectsByType(Object.entries(typeCount).map(([name, value]) => ({ name: name.replace(/_/g, ' '), value })));

        // 3. Projects by City
        const cityCount: Record<string, number> = {};
        projects.forEach(p => {
            const city = p.city ? p.city.trim() : 'Sin especificar';
            cityCount[city] = (cityCount[city] || 0) + 1;
        });
        setProjectsByCity(Object.entries(cityCount)
            .sort((a, b) => b[1] - a[1]) // Sort by count desc
            .slice(0, 10) // Top 10
            .map(([name, connections]) => ({ name, proyectos: connections }))
        );

        // 4. Map Data
        const mapPoints = Object.entries(cityCount).map(([city, count]) => {
            // Fuzzy match or default
            const coords = Object.entries(CITY_COORDS).find(([key]) => key.toLowerCase() === city.toLowerCase())?.[1]
                || CITY_COORDS[Object.keys(CITY_COORDS).find(k => city.toLowerCase().includes(k.toLowerCase())) || '']
                || [40.4168 + (Math.random() - 0.5), -3.7038 + (Math.random() - 0.5)]; // Default to random around Madrid if not found

            return {
                city,
                count,
                position: coords
            };
        });
        setMapData(mapPoints);

    }, []);

    return (
        <div className="space-y-6 animate-fade-in pb-10">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Estadísticas y Dashboard</h1>

            {/* Top Row: Map & Type Distribution */}
            <div className="grid gap-6 md:grid-cols-3">

                {/* Map */}
                <Card className="md:col-span-2">
                    <CardHeader><CardTitle>Distribución Geográfica</CardTitle></CardHeader>
                    <CardContent className="p-0">
                        <div className="h-[400px] w-full rounded-b-lg overflow-hidden relative z-0">
                            <MapContainer center={[40.4637, -3.7492]} zoom={6} style={{ height: '100%', width: '100%' }}>
                                <TileLayer
                                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                />
                                {mapData.map((point, idx) => (
                                    <Marker key={idx} position={point.position}>
                                        <Popup>
                                            <div className="font-semibold">{point.city}</div>
                                            <div>{point.count} Proyectos</div>
                                        </Popup>
                                    </Marker>
                                ))}
                            </MapContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Projects by Type */}
                <Card className="md:col-span-1">
                    <CardHeader><CardTitle>Tipos de Proyecto</CardTitle></CardHeader>
                    <CardContent>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={projectsByType}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {projectsByType.map((_, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                    <Legend layout="vertical" verticalAlign="bottom" height={100} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Second Row: City Bar Chart & Profitability */}
            <div className="grid gap-6 md:grid-cols-2">

                {/* Profitability */}
                <Card>
                    <CardHeader><CardTitle>Rentabilidad Financiera</CardTitle></CardHeader>
                    <CardContent>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={financialData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" />
                                    <YAxis />
                                    <Tooltip formatter={(value: number) => value.toLocaleString() + '€'} />
                                    <Legend />
                                    <Bar dataKey="Presupuesto" fill="#0ea5e9" stackId="a" />
                                    <Bar dataKey="Costes" fill="#ef4444" stackId="b" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Projects by City */}
                <Card>
                    <CardHeader><CardTitle>Proyectos por Localidad</CardTitle></CardHeader>
                    <CardContent>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={projectsByCity} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                    <XAxis type="number" />
                                    <YAxis dataKey="name" type="category" width={100} />
                                    <Tooltip />
                                    <Bar dataKey="proyectos" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
