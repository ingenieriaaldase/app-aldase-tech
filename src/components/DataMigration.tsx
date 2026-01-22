
import { useState } from 'react';
import { Button } from './ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from './ui/Card';
import { UploadCloud } from 'lucide-react';
import { storage, STORAGE_KEYS } from '../services/storage';
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
        'crm_config',
        'crm_workers',
        'crm_clients',
        'crm_projects',
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
        'clientId': 'client_id',
        'projectId': 'project_id',
        'assigneeId': 'assignee_id',
        'authorId': 'author_id',
    };

    const migrate = async () => {
        if (!window.confirm('¿Estás seguro? Esto subirá los datos locales a Supabase.')) return;

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

        const idMap: Record<string, Record<string, string>> = {
            'crm_workers': {},
            'crm_clients': {},
            'crm_projects': {}
        };

        try {
            addLog('Iniciando migración...');
            addLog('Corrigiendo fechas y tipos...');

            for (let i = 0; i < LOG_KEYS.length; i++) {
                const key = LOG_KEYS[i];
                const raw = localStorage.getItem(key);

                if (!raw) {
                    addLog(`ℹ️ Skipping ${key} (No local data)`);
                    setProgress(((i + 1) / LOG_KEYS.length) * 100);
                    continue;
                }

                try {
                    const data = JSON.parse(raw);

                    if (key === 'crm_config') {
                        if (Array.isArray(data) && data.length > 0) await storage.updateConfig(data[0]);
                        else if (!Array.isArray(data)) await storage.updateConfig(data);
                        addLog(`✅ Config uploaded`);
                        setProgress(((i + 1) / LOG_KEYS.length) * 100);
                        continue;
                    }

                    if (!Array.isArray(data) || data.length === 0) continue;

                    addLog(`Migrating ${data.length} items from ${key}...`);

                    let successCount = 0;
                    let failCount = 0;
                    let skipCount = 0;
                    const table = TABLE_MAP[key];

                    for (const item of data) {
                        try {
                            const originalId = item.id;
                            const payload: any = {};
                            const toSnakeLocal = (s: string) => s.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);

                            Object.keys(item).forEach(k => {
                                const newKey = KEY_OVERRIDES[k] || toSnakeLocal(k);
                                let val = item[k];

                                // FIX 1: Empty strings to NULL (Dates)
                                if (val === '') val = null;

                                // FIX 2: Enum Mapping for SPANISH ENUMS
                                if ((newKey === 'type' && (key === 'crm_clients')) || (k === 'clientType')) {
                                    if (typeof val === 'string') {
                                        const upper = val.toUpperCase();
                                        // "EMPRESA" -> "PROMOTOR" (Database Enum: ARQUITECTURA, PROMOTOR, PARTICULAR, CONSTRUCTORA, INSTALADORA)
                                        if (upper.includes('EMPRESA') || upper.includes('COMPANY')) val = 'PROMOTOR';

                                        // "PARTICULAR" is valid. "INDIVIDUAL" -> "PARTICULAR"
                                        if (upper.includes('PARTICULAR') || upper.includes('INDIVIDUAL')) val = 'PARTICULAR';
                                    }
                                }

                                payload[newKey] = val;
                            });

                            const docType = getDocType(key);
                            if (docType) payload.doc_type = docType;

                            if (key === 'crm_projects') {
                                if (payload.client_id && !isValidUUID(payload.client_id)) {
                                    const newClientId = idMap['crm_clients'][payload.client_id];
                                    payload.client_id = newClientId || null;
                                }
                                if (payload.manager_id && !isValidUUID(payload.manager_id)) {
                                    const newWorkerId = idMap['crm_workers'][payload.manager_id];
                                    payload.manager_id = newWorkerId || null;
                                }
                            }

                            if (key === 'crm_tasks') {
                                if (payload.project_id && !isValidUUID(payload.project_id)) {
                                    const newId = idMap['crm_projects'][payload.project_id];
                                    if (newId) payload.project_id = newId;
                                    else delete payload.project_id;
                                }
                                if (payload.assignee_id && !isValidUUID(payload.assignee_id)) {
                                    const newId = idMap['crm_workers'][payload.assignee_id];
                                    payload.assignee_id = newId || null;
                                }
                            }

                            if (payload.id && !isValidUUID(payload.id)) {
                                delete payload.id;
                            }

                            const { data: inserted, error } = await supabase
                                .from(table)
                                .insert(payload)
                                .select('id')
                                .single();

                            if (error) {
                                if (error.code === '23505') skipCount++;
                                else {
                                    failCount++;
                                    appendError(`Failed ${key}: ${error.message} (Payload Type: ${payload.type})`);
                                }
                            } else {
                                successCount++;
                                if (originalId && inserted?.id) {
                                    if (!idMap[key]) idMap[key] = {};
                                    idMap[key][originalId] = inserted.id;
                                }
                            }

                        } catch (err: any) {
                            failCount++;
                            appendError(`Exception on ${key}: ${err.message}`);
                        }
                    }

                    if (failCount > 0) addLog(`⚠️ ${key}: ${successCount} ok, ${skipCount} skipped, ${failCount} failed.`);
                    else addLog(`✅ ${key}: ${successCount} ok, ${skipCount} skipped.`);

                } catch (e: any) {
                    appendError(`Error parsing ${key}: ${e.message}`);
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

    const handleExportCSV = (key: string, filename: string) => {
        try {
            const raw = localStorage.getItem(key);
            if (!raw) { alert(`No data for ${filename}`); return; }
            const data = JSON.parse(raw);
            if (!Array.isArray(data)) { alert(`Invalid data for ${filename}`); return; }
            const toSnakeLocal = (s: string) => s.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
            const mapItem = (item: any): any => {
                const newItem: any = {};
                Object.keys(item).forEach(k => {
                    const newKey = KEY_OVERRIDES[k] || toSnakeLocal(k);
                    newItem[newKey] = item[k];
                });
                return newItem;
            };
            const formattedData = data.map(item => mapItem(item));
            import('../utils/csvExporter').then(({ exportToCSV }) => { exportToCSV(formattedData, filename); });
        } catch (e) { console.error(e); alert('Error'); }
    };

    const handleImportCSV = (event: React.ChangeEvent<HTMLInputElement>, key: string) => {
        const file = event.target.files?.[0];
        if (!file) return;
        import('papaparse').then(({ default: Papa }) => {
            Papa.parse(file, {
                header: true, skipEmptyLines: true,
                complete: async (results) => {
                    const data = results.data;
                    if (data.length === 0) { alert('CSV vacío'); return; }
                    if (!window.confirm(`Importar ${data.length} en LOCAL?`)) return;
                    setStatus('MIGRATING');
                    try {
                        const toCamelLocal = (s: string) => s.replace(/([-_][a-z])/ig, ($1) => $1.toUpperCase().replace('-', '').replace('_', ''));
                        const cleanedData = data.map((row: any) => {
                            const newRow: any = {};
                            Object.keys(row).forEach(k => {
                                let val = row[k];
                                if (val === '') val = null;
                                if (val === 'true') val = true;
                                if (val === 'false') val = false;
                                newRow[toCamelLocal(k)] = val;
                            });
                            return newRow;
                        });
                        const existingRaw = localStorage.getItem(key);
                        const existing = existingRaw ? JSON.parse(existingRaw) : [];
                        const map = new Map();
                        existing.forEach((i: any) => i.id && map.set(i.id, i));
                        cleanedData.forEach((i: any) => {
                            if (i.id) map.set(i.id, i);
                            else map.set(crypto.randomUUID(), i);
                        });
                        localStorage.setItem(key, JSON.stringify(Array.from(map.values())));
                        alert('Importación completada.');
                        setStatus('SUCCESS');
                        window.location.reload();
                    } catch (err: any) { alert(`Error: ${err.message}`); setStatus('ERROR'); }
                    event.target.value = '';
                }
            });
        });
    };

    return (
        <Card className="border-l-4 border-l-purple-500">
            <CardHeader>
                <CardTitle className="text-purple-700 flex items-center gap-2">
                    <UploadCloud className="w-5 h-5" />
                    Gestión de Datos (Migración Inteligente)
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <p className="text-sm text-slate-600">
                    Utilice el Botón Morado para subir datos a la nube con <b>corrección de IDs</b> automáticamente.
                </p>
                <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="p-2 border rounded bg-slate-50 text-xs">
                        <Button variant="outline" size="sm" onClick={() => handleExportCSV('crm_workers', 'trabajadores')} className="mb-2 w-full">Export Local</Button>
                        <input type="file" className="block w-full" onChange={(e) => handleImportCSV(e, 'crm_workers')} />
                    </div>
                    <div className="p-2 border rounded bg-slate-50 text-xs">
                        <Button variant="outline" size="sm" onClick={() => handleExportCSV('crm_clients', 'clientes')} className="mb-2 w-full">Export Local</Button>
                        <input type="file" className="block w-full" onChange={(e) => handleImportCSV(e, 'crm_clients')} />
                    </div>
                </div>
                {status === 'IDLE' || status === 'SUCCESS' || status === 'ERROR' ? (
                    <Button onClick={migrate} className="bg-purple-600 hover:bg-purple-700 w-full">
                        Iniciar Migración (Subir a Nube)
                    </Button>
                ) : null}
                {status === 'MIGRATING' && (
                    <div className="w-full bg-slate-200 rounded-full h-2.5 mt-2">
                        <div className="bg-purple-600 h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
                        <p className="text-xs text-center">Procesando...</p>
                    </div>
                )}
                {log.length > 0 && (
                    <div className="bg-slate-900 text-slate-400 p-4 rounded-md text-xs font-mono h-40 overflow-y-auto mt-4">
                        {log.map((l, i) => <div key={i}>{l}</div>)}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
