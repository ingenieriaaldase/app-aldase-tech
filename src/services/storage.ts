
import { supabase } from './supabase';
import {
    Project, Client, TimeEntry, Invoice, Quote, Meeting, Worker, CompanyConfig, CalendarEvent,
    Task, ProjectDocument, Expense, ExpenseCategory
} from '../types';

export const STORAGE_KEYS = {
    USERS: 'crm_users',
    PROJECTS: 'crm_projects',
    CLIENTS: 'crm_clients',
    TIME_ENTRIES: 'crm_time_entries',
    INVOICES: 'crm_invoices',
    QUOTES: 'crm_quotes',
    MEETINGS: 'crm_meetings',
    WORKERS: 'crm_workers',
    TASKS: 'crm_tasks',
    DOCUMENTS: 'crm_documents',
    CONFIG: 'crm_config',
    // Lists
    PROJECT_TYPES: 'crm_project_types',
    TASK_CATEGORIES: 'crm_task_categories',
    DESIGN_CATEGORIES: 'crm_design_categories',
    EVENTS: 'crm_events',
    EVENT_TYPES: 'crm_event_types',
    LEADS: 'crm_leads',
    SOCIAL_POSTS: 'crm_social_posts',
    EXPENSES: 'crm_expenses',
    EXPENSE_CATEGORIES: 'crm_expense_categories'
};

export const KEYS = STORAGE_KEYS;

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
    [STORAGE_KEYS.EVENTS]: 'calendar_events',
    [STORAGE_KEYS.EXPENSES]: 'expenses',
    [STORAGE_KEYS.EXPENSE_CATEGORIES]: 'expense_categories'
};

const getDocType = (key: string) => {
    if (key === STORAGE_KEYS.INVOICES) return 'INVOICE';
    if (key === STORAGE_KEYS.QUOTES) return 'QUOTE';
    return null;
};

// --- DATA TRANSFORMATION HELPERS ---
const toCamel = (s: string) => {
    if (s === 'stats_24h') return 'stats24h';
    if (s === 'stats_1w') return 'stats1w';
    return s.replace(/([-_][a-z])/ig, ($1) => $1.toUpperCase().replace('-', '').replace('_', ''));
};

const toSnake = (s: string) => {
    if (s === 'stats24h') return 'stats_24h';
    if (s === 'stats1w') return 'stats_1w';
    return s.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
};

export const mapKeysToCamel = (obj: any): any => {
    if (obj === undefined || obj === null) return obj;
    if (Array.isArray(obj)) return obj.map(v => mapKeysToCamel(v));
    if (obj.constructor === Object) {
        return Object.keys(obj).reduce((result, key) => ({
            ...result,
            [toCamel(key)]: mapKeysToCamel(obj[key]),
        }), {});
    }
    return obj;
};

export const mapKeysToSnake = (obj: any): any => {
    if (obj === undefined || obj === null) return obj;
    if (Array.isArray(obj)) return obj.map(v => mapKeysToSnake(v));
    if (obj.constructor === Object) {
        return Object.keys(obj).reduce((result, key) => ({
            ...result,
            [toSnake(key)]: mapKeysToSnake(obj[key]),
        }), {});
    }
    return obj;
};

// --- CLOUD STORAGE SERVICE ---
export const storage = {
    // Generic Getters
    getData: async <T>(key: string): Promise<T[]> => {
        const table = TABLE_MAP[key];
        if (!table) return [];

        let query = supabase.from(table).select('*');
        const docType = getDocType(key);
        if (docType) query = query.eq('doc_type', docType);

        const { data, error } = await query;
        if (error) {
            console.error(`Error fetching ${key}:`, error.message);
            return [];
        }
        return mapKeysToCamel(data) as T[];
    },

    getAll: async <T>(key: string): Promise<T[]> => storage.getData<T>(key),

    // Generic Add
    add: async <T extends { id?: string }>(key: string, item: T): Promise<T | null> => {
        const table = TABLE_MAP[key];
        if (!table) return null;

        const payload: any = mapKeysToSnake({ ...item });
        const docType = getDocType(key);
        if (docType) payload.doc_type = docType;
        if (!payload.id) delete payload.id; // Let DB generate ID

        console.log(`[Storage] Adding to ${table} (${key}):`, payload);

        const { data, error } = await supabase.from(table).insert(payload).select().single();
        if (error) {
            console.error(`Error adding to ${key}:`, error);
            console.error(`Error details:`, error.details, error.hint, error.code);
            throw error;
        }
        return mapKeysToCamel(data) as T;
    },

    // Generic Update
    update: async <T extends { id: string }>(key: string, item: T): Promise<T | null> => {
        const table = TABLE_MAP[key];
        if (!table) return null;

        const payload = mapKeysToSnake(item);
        console.log(`[Storage] Updating ${table} (${key}) ID: ${item.id}:`, payload);

        const { data, error } = await supabase.from(table).update(payload).eq('id', item.id).select().single();

        if (error) {
            console.error(`Error updating ${key}:`, error);
            console.error(`Error details:`, error.details, error.hint, error.code);
            throw error;
        }
        return mapKeysToCamel(data) as T;
    },

    // Generic Remove
    remove: async (key: string, id: string): Promise<boolean> => {
        const table = TABLE_MAP[key];
        if (!table) return false;

        const { error } = await supabase.from(table).delete().eq('id', id);
        if (error) {
            console.error(`Error deleting from ${key}:`, error);
            return false;
        }
        return true;
    },

    delete: async (key: string, id: string) => storage.remove(key, id),

    // Specialized Getters
    getWorkers: async () => storage.getData<Worker>(STORAGE_KEYS.WORKERS),
    getProjects: async () => storage.getData<Project>(STORAGE_KEYS.PROJECTS),
    getClients: async () => storage.getData<Client>(STORAGE_KEYS.CLIENTS),
    getTimeEntries: async () => storage.getData<TimeEntry>(STORAGE_KEYS.TIME_ENTRIES),
    getInvoices: async () => storage.getData<Invoice>(STORAGE_KEYS.INVOICES),
    getQuotes: async () => storage.getData<Quote>(STORAGE_KEYS.QUOTES),
    getMeetings: async () => storage.getData<Meeting>(STORAGE_KEYS.MEETINGS),
    getTasks: async () => storage.getData<Task>(STORAGE_KEYS.TASKS),
    getDocuments: async () => storage.getData<ProjectDocument>(STORAGE_KEYS.DOCUMENTS),
    getEvents: async () => storage.getData<CalendarEvent>(STORAGE_KEYS.EVENTS),
    getExpenses: async () => storage.getData<Expense>(STORAGE_KEYS.EXPENSES),
    getExpenseCategories: async () => storage.getData<ExpenseCategory>(STORAGE_KEYS.EXPENSE_CATEGORIES),
    createExpenseCategory: async (category: Omit<ExpenseCategory, 'id'>) => storage.add<ExpenseCategory>(STORAGE_KEYS.EXPENSE_CATEGORIES, category as ExpenseCategory),
    deleteExpenseCategory: async (id: string) => storage.remove(STORAGE_KEYS.EXPENSE_CATEGORIES, id),

    // Config Management
    getConfig: async (): Promise<CompanyConfig> => {
        const { data, error } = await supabase.from('company_configs').select('*').limit(1).single();
        if (error || !data) {
            return {
                name: 'Ingeniería Demo S.L.',
                cif: 'B12345678',
                address: 'Calle Principal 123, Madrid',
                phone: '912345678',
                email: 'info@ingenieria-demo.com',
                invoiceSequence: 1,
                quoteSequence: 1,
                rectificationSequence: 1,
                lastSequenceYear: 2025,
                designCategories: [],
                eventTypes: []
            };
        }
        return mapKeysToCamel(data) as CompanyConfig;
    },

    updateConfig: async (config: CompanyConfig) => {
        try {
            const { data, error: fetchError } = await supabase.from('company_configs').select('id').limit(1).single();
            if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is "No rows found"
                console.error('Error fetching config for update:', fetchError);
            }

            const payload = mapKeysToSnake(config);
            console.log('Updating config with payload:', payload);

            let error;
            if (data?.id) {
                const { error: updateError } = await supabase.from('company_configs').update(payload).eq('id', data.id);
                error = updateError;
            } else {
                const { error: insertError } = await supabase.from('company_configs').insert(payload);
                error = insertError;
            }

            if (error) {
                console.error('Error saving config:', error);
                throw error;
            }
        } catch (err) {
            console.error('Unexpected error in updateConfig:', err);
            throw err;
        }
    },

    // Dynamic Lists (Stored in Company Config)
    getProjectTypes: async () => {
        const config = await storage.getConfig();
        return config.projectTypes?.length ? config.projectTypes : ['Vivienda Unifamiliar', 'Reformas', 'Terciario', 'Industrial', 'Obra Civil', 'Instalaciones'];
    },
    getTaskCategories: async () => {
        const config = await storage.getConfig();
        return (config as any).taskCategories?.length ? (config as any).taskCategories : ['Oficina', 'Visita Obra', 'Reunión', 'Administrativo', 'Organización', 'Formación', 'Calculo', 'Delineación', 'Diseño'];
    },
    getDesignCategories: async () => {
        const config = await storage.getConfig();
        return config.designCategories?.length ? config.designCategories : ['Fontanería', 'Electricidad', 'Estructura', 'Climatización'];
    },
    getEventTypes: async () => {
        const config = await storage.getConfig();
        return config.eventTypes?.length ? config.eventTypes : ['Reunión', 'Visita de Obra', 'Administrativo', 'Formación', 'Otros'];
    },

    setProjectTypes: async (types: string[]) => {
        const config = await storage.getConfig();
        config.projectTypes = types;
        await storage.updateConfig(config);
    },
    setTaskCategories: async (cats: string[]) => {
        const config = await storage.getConfig();
        config.taskCategories = cats;
        await storage.updateConfig(config);
    },
    setDesignCategories: async (cats: string[]) => {
        const config = await storage.getConfig();
        config.designCategories = cats;
        await storage.updateConfig(config);
    },
    setEventTypes: async (types: string[]) => {
        const config = await storage.getConfig();
        config.eventTypes = types;
        await storage.updateConfig(config);
    },

    // Wrappers
    addEvent: async (event: CalendarEvent) => storage.add(STORAGE_KEYS.EVENTS, event),
    removeEvent: async (id: string) => storage.remove(STORAGE_KEYS.EVENTS, id),
    deleteProject: async (id: string) => storage.remove(STORAGE_KEYS.PROJECTS, id),
};

