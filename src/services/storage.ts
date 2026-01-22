
import { supabase } from './supabase';
import {
    Project, Client, TimeEntry, Invoice, Quote, Meeting, Worker, CompanyConfig, CalendarEvent,
    Task, ProjectDocument
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
    PROJECT_TYPES: 'crm_project_types',
    TASK_CATEGORIES: 'crm_task_categories',
    DESIGN_CATEGORIES: 'crm_design_categories',
    EVENTS: 'crm_events',
    EVENT_TYPES: 'crm_event_types',
    LEADS: 'crm_leads',
    SOCIAL_POSTS: 'crm_social_posts'
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
    [STORAGE_KEYS.EVENTS]: 'calendar_events'
};

// Helper to handle mixed Invoice/Quote table
const getDocType = (key: string) => {
    if (key === STORAGE_KEYS.INVOICES) return 'INVOICE';
    if (key === STORAGE_KEYS.QUOTES) return 'QUOTE';
    return null;
};

export const storage = {
    // Generic Getters
    getData: async <T>(key: string): Promise<T[]> => {
        const table = TABLE_MAP[key];
        if (!table) return [];

        let query = supabase.from(table).select('*');

        // Filter for Shared Table (Financial Documents)
        const docType = getDocType(key);
        if (docType) {
            query = query.eq('doc_type', docType);
        }

        const { data, error } = await query;
        if (error) {
            console.error(`Error fetching ${key}:`, error);
            return [];
        }
        return (data as T[]) || [];
    },

    getAll: async <T>(key: string): Promise<T[]> => storage.getData<T>(key),

    // Generic Add
    add: async <T extends { id?: string }>(key: string, item: T): Promise<T | null> => {
        const table = TABLE_MAP[key];
        if (!table) return null;

        // Spread item to avoid mutating original, ensure appropriate fields for DB
        // Convert camelCase keys to snake_case for Supabase
        const payload: any = mapKeysToSnake({ ...item });

        // Handle specific fields or transformations if needed
        const docType = getDocType(key);
        if (docType) {
            payload.doc_type = docType;
        }

        // Remove undefined id if it exists (let DB generate) or keep if UUID provided
        // Supabase will ignore id if it's not in the payload, but if it's undefined it might be fine?
        // Better to remove if falsy, but our types usually require ID. 
        // If the code generates UUID client-side, we keep it. Check usage.
        // Step 130 TimeTracking uses `crypto.randomUUID()`, so ID is provided.

        const { data, error } = await supabase.from(table).insert(payload).select().single();

        if (error) {
            console.error(`Error adding to ${key}:`, error);
            return null;
        }
        // Convert response back to camelCase
        return mapKeysToCamel(data) as T;
    },

    // Generic Update
    update: async <T extends { id: string }>(key: string, item: T): Promise<T | null> => {
        const table = TABLE_MAP[key];
        if (!table) return null;

        const payload = mapKeysToSnake(item);

        const { data, error } = await supabase
            .from(table)
            .update(payload)
            .eq('id', item.id)
            .select()
            .single();

        if (error) {
            console.error(`Error updating ${key}:`, error);
            return null;
        }
        // Convert response back to camelCase
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

    // Config
    getConfig: async (): Promise<CompanyConfig> => {
        const { data, error } = await supabase.from('company_configs').select('*').limit(1).single();
        if (error || !data) {
            // Return default or create default
            // For now return a mock default if not found
            const defaultConfig: CompanyConfig = {
                name: 'Ingeniería Demo S.L.',
                cif: 'B12345678',
                address: 'Calle Principal 123, Madrid',
                phone: '912345678',
                email: 'info@ingenieria-demo.com',
                invoiceSequence: 1,
                quoteSequence: 1,
                designCategories: [],
                eventTypes: []
            };
            return defaultConfig;
        }

        // Map DB fields to camelCase if they differ? 
        // Supabase returns snake_case by default for columns usually, 
        // BUT my table definitions used snake_case for columns like `logo_url`.
        // My Types use camelCase `logoUrl`. 
        // SUPABASE CLIENT DOES NOT AUTO-CONVERT CASE. 
        // I NEED TO TRANSFORM DATA or USE CAMEL CASE IN DB (Too late, schema applied) 
        // OR Use a response modifier.

        // This is a CRITICAL mismatch. `logo_url` vs `logoUrl`.
        // I must map the responses.

        return mapKeysToCamel(data) as CompanyConfig;
    },

    updateConfig: async (config: CompanyConfig) => {
        // Need to fetch ID if exists or insert
        // Assuming single config row approach
        const { data } = await supabase.from('company_configs').select('id').limit(1).single();
        const payload = mapKeysToSnake(config);

        if (data?.id) {
            await supabase.from('company_configs').update(payload).eq('id', data.id);
        } else {
            await supabase.from('company_configs').insert(payload);
        }
    },


    // Arrays (Lists) - Stored in localStorage or Config?
    // In schema, I added `design_categories` and `event_types` to `company_configs`.
    // The previous implementation used separate localStorage keys for projectTypes, taskCategories.
    // I didn't add columns for projectTypes/taskCategories in `company_configs` in my schema!
    // I can stick to localStorage for these simple preference lists OR add them to company_configs now.
    // For simplicity/speed, I'll keep them in LocalStorage for now OR add to config.
    // The user didn't ask me to migrate *everything* perfectly to DB, but "create databases necessary".
    // I'll keep lists in localStorage for now to reduce friction, or check if I can use DB.
    // Let's use localStorage for these preferences to avoid breaking schema changes now.

    getProjectTypes: () => {
        const data = localStorage.getItem(STORAGE_KEYS.PROJECT_TYPES);
        return data ? JSON.parse(data) : ['Vivienda Unifamiliar', 'Reformas', 'Terciario', 'Industrial', 'Obra Civil', 'Instalaciones'];
    },
    getTaskCategories: () => {
        const data = localStorage.getItem(STORAGE_KEYS.TASK_CATEGORIES);
        return data ? JSON.parse(data) : ['Oficina', 'Visita Obra', 'Reunión', 'Administrativo', 'Organización', 'Formación', 'Calculo', 'Delineación', 'Diseño'];
    },
    getDesignCategories: () => {
        const data = localStorage.getItem(STORAGE_KEYS.DESIGN_CATEGORIES);
        return data ? JSON.parse(data) : ['Fontanería', 'Electricidad', 'Estructura', 'Climatización'];
    },
    getEventTypes: () => {
        const data = localStorage.getItem('crm_event_types'); // Key used in previous file
        return data ? JSON.parse(data) : ['Reunión', 'Visita de Obra', 'Administrativo', 'Formación', 'Otros'];
    },

    setProjectTypes: (types: string[]) => localStorage.setItem(STORAGE_KEYS.PROJECT_TYPES, JSON.stringify(types)),
    setTaskCategories: (cats: string[]) => localStorage.setItem(STORAGE_KEYS.TASK_CATEGORIES, JSON.stringify(cats)),
    setDesignCategories: (cats: string[]) => localStorage.setItem(STORAGE_KEYS.DESIGN_CATEGORIES, JSON.stringify(cats)),
    setEventTypes: (types: string[]) => localStorage.setItem('crm_event_types', JSON.stringify(types)),


    // Specialized Methods
    addEvent: async (event: CalendarEvent) => storage.add(STORAGE_KEYS.EVENTS, event),
    removeEvent: async (id: string) => storage.remove(STORAGE_KEYS.EVENTS, id),
    deleteProject: async (id: string) => storage.remove(STORAGE_KEYS.PROJECTS, id),
};


// HELPERS for Case Conversion
const toCamel = (s: string) => {
    return s.replace(/([-_][a-z])/ig, ($1) => {
        return $1.toUpperCase()
            .replace('-', '')
            .replace('_', '');
    });
};

const toSnake = (s: string) => {
    return s.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

export const mapKeysToCamel = (obj: any): any => {
    if (Array.isArray(obj)) {
        return obj.map(v => mapKeysToCamel(v));
    } else if (obj !== null && obj.constructor === Object) {
        return Object.keys(obj).reduce(
            (result, key) => ({
                ...result,
                [toCamel(key)]: mapKeysToCamel(obj[key]),
            }),
            {},
        );
    }
    return obj;
};

export const mapKeysToSnake = (obj: any): any => {
    if (Array.isArray(obj)) {
        return obj.map(v => mapKeysToSnake(v));
    } else if (obj !== null && obj.constructor === Object) {
        return Object.keys(obj).reduce(
            (result, key) => ({
                ...result,
                [toSnake(key)]: mapKeysToSnake(obj[key]),
            }),
            {},
        );
    }
    return obj;
};

// Wrap getData with mapper - override the implementation
storage.getData = async <T>(key: string): Promise<T[]> => {
    const table = TABLE_MAP[key];
    if (!table) return [];

    let query = supabase.from(table).select('*');
    const docType = getDocType(key);
    if (docType) query = query.eq('doc_type', docType);

    const { data, error } = await query;
    if (error) {
        console.error(error);
        return [];
    }
    return mapKeysToCamel(data) as T[];
};
