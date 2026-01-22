
import { useState } from 'react';
import { Button } from './ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from './ui/Card';
import { UploadCloud, CheckCircle, AlertTriangle } from 'lucide-react';
import { storage } from '../services/storage';

export default function DataMigration() {
    const [status, setStatus] = useState<'IDLE' | 'MIGRATING' | 'SUCCESS' | 'ERROR'>('IDLE');
    const [log, setLog] = useState<string[]>([]);
    const [progress, setProgress] = useState(0);

    const LOG_KEYS = [
        'crm_users', 'crm_projects', 'crm_clients', 'crm_time_entries',
        'crm_invoices', 'crm_quotes', 'crm_meetings', 'crm_workers',
        'crm_tasks', 'crm_documents', 'crm_config', 'crm_leads',
        'crm_social_posts', 'crm_events'
    ];

    const migrate = async () => {
        if (!window.confirm('¿Estás seguro? Esto leerá los datos de tu navegador y los subirá a la base de datos de Supabase. Si ya existen datos en la nube, podrían duplicarse.')) return;

        setStatus('MIGRATING');
        setLog([]);
        let logs: string[] = [];
        const addLog = (msg: string) => {
            logs = [...logs, msg];
            setLog(logs);
        };

        try {
            addLog('Iniciando migración...');

            for (let i = 0; i < LOG_KEYS.length; i++) {
                const key = LOG_KEYS[i];
                const raw = localStorage.getItem(key);
                if (!raw) {
                    addLog(`Skipping ${key} (No data)`);
                    continue;
                }

                try {
                    const data = JSON.parse(raw);
                    if (!Array.isArray(data)) {
                        // Likely single object like config
                        if (key === 'crm_config') {
                            await storage.updateConfig(data);
                            addLog(`Uploaded Config`);
                        }
                        continue;
                    }

                    if (data.length === 0) {
                        addLog(`Skipping ${key} (Empty array)`);
                        continue;
                    }

                    addLog(`Migrating ${data.length} items from ${key}...`);

                    // Batch insert using storage.add (one by one for now as we don't have bulk insert exposed yet)
                    // Or specific mapping.

                    // We need to adhere to table names. 
                    // STORAGE_KEYS in storage.ts match these keys.

                    for (const item of data) {
                        await storage.add(key, item);
                    }
                    addLog(`Success: ${key}`);

                } catch (e: any) {
                    console.error(e);
                    addLog(`Error parsing/uploading ${key}: ${e.message}`);
                }

                setProgress(((i + 1) / LOG_KEYS.length) * 100);
            }

            setStatus('SUCCESS');
            addLog('Migración completada con éxito.');

        } catch (error: any) {
            console.error(error);
            setStatus('ERROR');
            addLog(`Error fatal: ${error.message}`);
        }
    };

    return (
        <Card className="border-l-4 border-l-purple-500">
            <CardHeader>
                <CardTitle className="text-purple-700 flex items-center gap-2">
                    <UploadCloud className="w-5 h-5" />
                    Migración a la Nube
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <p className="text-sm text-slate-600">
                    Utilice esta herramienta para subir sus datos locales (guardados en este navegador) a la base de datos en la nube (Supabase).
                    Ejecute esto <b>una sola vez</b> por cada navegador que tenga datos.
                </p>

                {status === 'IDLE' && (
                    <Button onClick={migrate} className="bg-purple-600 hover:bg-purple-700">
                        Iniciar Migración
                    </Button>
                )}

                {status === 'MIGRATING' && (
                    <div className="space-y-2">
                        <div className="w-full bg-slate-200 rounded-full h-2.5">
                            <div className="bg-purple-600 h-2.5 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
                        </div>
                        <p className="text-xs text-slate-500 text-center">Procesando...</p>
                    </div>
                )}

                {status === 'SUCCESS' && (
                    <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-md">
                        <CheckCircle className="w-5 h-5" />
                        <span className="font-medium">Datos migrados correctamente. Recargue la página.</span>
                    </div>
                )}

                {status === 'ERROR' && (
                    <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-md">
                        <AlertTriangle className="w-5 h-5" />
                        <span className="font-medium">Ocurrió un error. Revise la consola.</span>
                    </div>
                )}

                {log.length > 0 && (
                    <div className="bg-slate-900 text-slate-400 p-4 rounded-md text-xs font-mono h-40 overflow-y-auto">
                        {log.map((l, i) => <div key={i}>{l}</div>)}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
