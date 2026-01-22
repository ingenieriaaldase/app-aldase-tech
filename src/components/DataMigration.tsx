
import { useState } from 'react';
import { Button } from './ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from './ui/Card';
import { UploadCloud, CheckCircle, AlertTriangle } from 'lucide-react';
import { storage, mapKeysToSnake, STORAGE_KEYS } from '../services/storage';
import { supabase } from '../services/supabase';

// Helper to check for valid UUID
const isValidUUID = (uuid: string) => {
    const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return regex.test(uuid);
};

export default function DataMigration() {
    const [status, setStatus] = useState<'IDLE' | 'MIGRATING' | 'SUCCESS' | 'ERROR'>('IDLE');
    const [log, setLog] = useState<string[]>([]);
    const [progress, setProgress] = useState(0);

    const LOG_KEYS = [
        'crm_config',      // 1. Config (Independent)
        'crm_workers',     // 2. Workers (Referenced by Projects, Tasks, etc.)
        'crm_clients',     // 3. Clients (Referenced by Projects, Invoices)
        'crm_projects',    // 4. Projects (Referenced by Tasks, Documents, etc.)
        'crm_tasks',
        'crm_time_entries',
        'crm_invoices',
        'crm_quotes',
        'crm_meetings',
        'crm_documents',
        'crm_leads',
        'crm_social_posts',
        'crm_events'
    ];

    // Map storage keys to table names
    const TABLE_MAP: Record<string, string> = {
        [STORAGE_KEYS.PROJECTS]: 'projects',
        [STORAGE_KEYS.CLIENTS]: 'clients',
        [STORAGE_KEYS.TIME_ENTRIES]: 'time_entries',
        [STORAGE_KEYS.INVOICES]: 'financial_documents',
        [STORAGE_KEYS.QUOTES]: 'financial_documents',
        [STORAGE_KEYS.MEETINGS]: 'meetings',
        [STORAGE_KEYS.WORKERS]: 'workers',
        [STORAGE_KEYS.TASKS]: 'tasks',
        [STORAGE_KEYS.DOCUMENTS]: 'project_documents',
        [STORAGE_KEYS.CONFIG]: 'company_configs',
        [STORAGE_KEYS.LEADS]: 'leads',
        [STORAGE_KEYS.SOCIAL_POSTS]: 'social_posts',
        [STORAGE_KEYS.EVENTS]: 'calendar_events'
    };

    const getDocType = (key: string) => {
        if (key === STORAGE_KEYS.INVOICES) return 'INVOICE';
        if (key === STORAGE_KEYS.QUOTES) return 'QUOTE';
        return null;
    };

    const migrate = async () => {
        if (!window.confirm('¿Estás seguro? Esto leerá los datos de tu navegador y los subirá a la base de datos de Supabase. Si ya existen datos en la nube, podrían duplicarse.')) return;

        setStatus('MIGRATING');
        setLog([]);
        let logs: string[] = [];
        const addLog = (msg: string) => {
            logs = [...logs, msg];
            setLog(logs);
        };
        const appendError = (msg: string) => {
            console.error(msg);
            addLog(`❌ ${msg}`);
        };

        try {
            addLog('Iniciando migración...');
            addLog('Orden de migración optimizado para dependencias.');

            for (let i = 0; i < LOG_KEYS.length; i++) {
                const key = LOG_KEYS[i];
                const raw = localStorage.getItem(key);

                if (!raw) {
                    addLog(`ℹ️ Skipping ${key} (No local data)`);
                    setProgress(((i + 1) / LOG_KEYS.length) * 100);
                    continue;
                }

                try {
                    const data = JSON.parse(raw); // Parse local data

                    // Handle Config (Single Object)
                    if (key === 'crm_config') {
                        if (Array.isArray(data)) {
                            if (data.length > 0) await storage.updateConfig(data[0]);
                        } else {
                            await storage.updateConfig(data);
                        }
                        addLog(`✅ Config uploaded`);
                        setProgress(((i + 1) / LOG_KEYS.length) * 100);
                        continue;
                    }

                    if (!Array.isArray(data)) {
                        addLog(`⚠️ Skipping ${key} (Data is not an array)`);
                        continue;
                    }

                    if (data.length === 0) {
                        addLog(`ℹ️ Skipping ${key} (Empty list)`);
                        continue;
                    }

                    addLog(`Migrating ${data.length} items from ${key}...`);

                    let successCount = 0;
                    let failCount = 0;
                    let skipCount = 0;

                    const table = TABLE_MAP[key];
                    if (!table) {
                        appendError(`No table map for ${key}`);
                        continue;
                    }

                    for (const item of data) {
                        try {
                            // 1. Sanitize Payload
                            const payload: any = mapKeysToSnake({ ...item });
                            const docType = getDocType(key);
                            if (docType) payload.doc_type = docType;

                            // 2. Validate ID
                            if (payload.id && !isValidUUID(payload.id)) {
                                // console.warn(`Invalid UUID for ${key}: ${payload.id}. Generating new ID.`);
                                delete payload.id; // Let Supabase generate a new UUID
                            }

                            // 3. Direct Insert
                            const { error } = await supabase.from(table).insert(payload);

                            if (error) {
                                // Check for Duplicate Key Error (23505)
                                if (error.code === '23505') {
                                    skipCount++;
                                    // console.warn(`Duplicate skipped: ${JSON.stringify(item)}`);
                                } else {
                                    failCount++;
                                    appendError(`Failed ${key}: ${error.message} (${error.code})`);
                                }
                            } else {
                                successCount++;
                            }

                        } catch (err: any) {
                            failCount++;
                            appendError(`Exception on ${key}: ${err.message}`);
                        }
                    }

                    if (failCount > 0) {
                        addLog(`⚠️ ${key}: ${successCount} ok, ${skipCount} skipped, ${failCount} failed.`);
                    } else if (skipCount > 0) {
                        addLog(`✅ ${key}: ${successCount} ok, ${skipCount} duplicates skipped.`);
                    } else {
                        addLog(`✅ Success: ${key} (${successCount} items)`);
                    }

                } catch (e: any) {
                    console.error(e);
                    appendError(`Error parsing/uploading ${key}: ${e.message}`);
                }

                setProgress(((i + 1) / LOG_KEYS.length) * 100);
            }

            setStatus('SUCCESS');
            addLog('🏁 Proceso finalizado.');

        } catch (error: any) {
            console.error(error);
            setStatus('ERROR');
            addLog(`⛔ Error fatal: ${error.message}`);
        }
    };

    // Helper to export CSV
    const handleExportCSV = (key: string, filename: string) => {
        try {
            const raw = localStorage.getItem(key);
            if (!raw) {
                alert(`No hay datos locales para ${filename}`);
                return;
            }
            const data = JSON.parse(raw);
            if (!Array.isArray(data) || data.length === 0) {
                alert(`No hay datos válidos para ${filename}`);
                return;
            }

            // Local Helper for robustness
            const toSnakeLocal = (s: string) => s.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);

            // Specific mappings for legacy data to Supabase schema
            const KEY_OVERRIDES: Record<string, string> = {
                'clientType': 'type',
                'zipCode': 'zip_code',
                'contactName': 'contact_name',
                'createdAt': 'created_at',
                'hourlyRate': 'hourly_rate',
                'joinedDate': 'joined_date',
                'avatarUrl': 'avatar_url',
                'startDate': 'start_date',
                'deliveryDate': 'delivery_date',
                'linkedQuoteId': 'linked_quote_id',
                'managerId': 'manager_id',
                'clientId': 'client_id'
            };

            const mapItem = (item: any): any => {
                const newItem: any = {};
                Object.keys(item).forEach(k => {
                    // Check override first, then snake_case
                    const newKey = KEY_OVERRIDES[k] || toSnakeLocal(k);
                    newItem[newKey] = item[k];
                });
                return newItem;
            };

            const formattedData = data.map(item => mapItem(item));

            console.log(`Exporting ${filename}:`, formattedData[0]); // Debug

            import('../utils/csvExporter').then(({ exportToCSV }) => {
                exportToCSV(formattedData, filename);
            });

        } catch (e) {
            console.error(e);
            alert('Error exportando CSV');
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

                <div className="flex flex-wrap gap-2 mb-4">
                    <Button variant="outline" size="sm" onClick={() => handleExportCSV('crm_workers', 'trabajadores_backup')}>
                        Exportar Trabajadores (CSV)
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleExportCSV('crm_clients', 'clientes_backup')}>
                        Exportar Clientes (CSV)
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleExportCSV('crm_projects', 'proyectos_backup')}>
                        Exportar Proyectos (CSV)
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleExportCSV('crm_leads', 'leads_backup')}>
                        Exportar Leads (CSV)
                    </Button>
                </div>

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
