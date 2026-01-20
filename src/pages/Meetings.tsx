import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';

export default function Meetings() {
    return (
        <div className="space-y-6 animate-fade-in">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Reuniones</h1>
            <Card>
                <CardHeader><CardTitle>Agenda</CardTitle></CardHeader>
                <CardContent>
                    <div className="h-96 flex items-center justify-center text-slate-400 bg-slate-50 border border-dashed rounded-lg">
                        Gestión de Actas pendiente (Mockup)
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
