import {
    Project, Client, TimeEntry, Invoice, Quote, Meeting, Worker, CompanyConfig, CalendarEvent
} from '../types';

const STORAGE_KEYS = {
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

// ... demo data (kept same as before, omitted here for brevity if using replace_file_content partial, 
// BUT since I use Overwrite=true I must provide full file. 
// I will switch to using distinct edits or I need to be careful not to lose demo data. 
// Actually I'll use partial edit to append methods, it's safer than rewriting the whole large file.)
// Wait, I can only use partial edit if I know the content.
// I will read the file first to sure I have it all, or just append the methods at the end of the object.
// I'll read it fully first to be safe, as I saw valid file above but want to be precise.




const DEMO_WORKERS: Worker[] = [
    {
        id: '1', name: 'Admin User', email: 'admin@crm.com', role: 'ADMIN',
        hourlyRate: 100, phone: '555-0001', joinedDate: '2023-01-01', active: true,
        avatarUrl: 'https://ui-avatars.com/api/?name=Admin+User&background=0ea5e9&color=fff'
    },
    {
        id: '2', name: 'Alvaro Gerente', email: 'alvaro@crm.com', role: 'MANAGER',
        hourlyRate: 80, phone: '555-0002', joinedDate: '2023-02-15', active: true,
        avatarUrl: 'https://ui-avatars.com/api/?name=Alvaro+Gerente&background=0284c7&color=fff'
    },
    {
        id: '3', name: 'Juan Tecnico', email: 'juan@crm.com', role: 'WORKER',
        hourlyRate: 45, phone: '555-0003', joinedDate: '2023-03-10', active: true,
        avatarUrl: 'https://ui-avatars.com/api/?name=Juan+Tecnico&background=38bdf8&color=fff'
    }
];





export const storage = {
    getData: <T>(key: string): T[] => {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error(`Error reading ${key}`, e);
            return [];
        }
    },

    getAll: <T>(key: string): T[] => storage.getData<T>(key),

    setData: <T>(key: string, data: T[]) => {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            window.dispatchEvent(new Event('storage'));
        } catch (e) {
            console.error(`Error writing ${key}`, e);
        }
    },

    // Specialized Getters with lazy seeding
    getWorkers: () => {
        const data = storage.getData<Worker>(STORAGE_KEYS.WORKERS);
        if (data.length === 0) {
            storage.setData(STORAGE_KEYS.WORKERS, DEMO_WORKERS);
            return DEMO_WORKERS;
        }
        return data;
    },
    getProjects: () => {
        const data = storage.getData<Project>(STORAGE_KEYS.PROJECTS);
        // if (data.length === 0) { storage.setData(STORAGE_KEYS.PROJECTS, DEMO_PROJECTS); return DEMO_PROJECTS; }
        return data;
    },
    getClients: () => {
        const data = storage.getData<Client>(STORAGE_KEYS.CLIENTS);
        // if (data.length === 0) { storage.setData(STORAGE_KEYS.CLIENTS, DEMO_CLIENTS); return DEMO_CLIENTS; }
        return data;
    },

    getTimeEntries: () => storage.getData<TimeEntry>(STORAGE_KEYS.TIME_ENTRIES),
    getInvoices: () => storage.getData<Invoice>(STORAGE_KEYS.INVOICES),
    getQuotes: () => storage.getData<Quote>(STORAGE_KEYS.QUOTES),
    getMeetings: () => storage.getData<Meeting>(STORAGE_KEYS.MEETINGS),
    getTasks: () => storage.getData<any>(STORAGE_KEYS.TASKS), // Use any to avoid circular type issues if types file not re-imported yet, or just generic T
    getDocuments: () => storage.getData<any>(STORAGE_KEYS.DOCUMENTS),

    add: <T extends { id: string }>(key: string, item: T) => {
        const items = storage.getData<T>(key);
        items.push(item);
        storage.setData(key, items);
    },

    update: <T extends { id: string }>(key: string, item: T) => {
        const items = storage.getData<T>(key);
        const index = items.findIndex(i => i.id === item.id);
        if (index !== -1) {
            items[index] = item;
            storage.setData(key, items);
        }
    },

    remove: <T extends { id: string }>(key: string, id: string) => {
        const items = storage.getData<T>(key);
        const newItems = items.filter(i => i.id !== id);
        storage.setData(key, newItems);
    },

    delete: <T extends { id: string }>(key: string, id: string) => storage.remove<T>(key, id),

    getConfig: (): CompanyConfig => {
        const config = localStorage.getItem(STORAGE_KEYS.CONFIG);
        if (!config) {
            const defaultConfig: CompanyConfig = {
                name: 'Ingeniería Demo S.L.',
                cif: 'B12345678',
                address: 'Calle Principal 123, Madrid',
                phone: '912345678',
                email: 'info@ingenieria-demo.com',
                invoiceSequence: 1,
                quoteSequence: 1
            };
            localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(defaultConfig));
            return defaultConfig;
        }
        return JSON.parse(config);
    },

    updateConfig: (config: CompanyConfig) => {
        localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(config));
    },

    getProjectTypes: (): string[] => {
        const data = storage.getData<string>(STORAGE_KEYS.PROJECT_TYPES);
        if (!data || data.length === 0) {
            const defaults = ['Vivienda Unifamiliar', 'Reformas', 'Terciario', 'Industrial', 'Obra Civil', 'Instalaciones'];
            storage.setData(STORAGE_KEYS.PROJECT_TYPES, defaults);
            return defaults;
        }
        return data;
    },

    getTaskCategories: (): string[] => {
        const data = storage.getData<string>(STORAGE_KEYS.TASK_CATEGORIES);
        if (!data || data.length === 0) {
            const defaults = ['Oficina', 'Visita Obra', 'Reunión', 'Administrativo', 'Formación', 'Calculo', 'Delineación', 'Diseño'];
            storage.setData(STORAGE_KEYS.TASK_CATEGORIES, defaults);
            return defaults;
        }
        return data;
    },

    setProjectTypes: (types: string[]) => storage.setData(STORAGE_KEYS.PROJECT_TYPES, types),
    setTaskCategories: (cats: string[]) => storage.setData(STORAGE_KEYS.TASK_CATEGORIES, cats),

    getDesignCategories: (): string[] => {
        const data = storage.getData<string>(STORAGE_KEYS.DESIGN_CATEGORIES);
        if (!data || data.length === 0) {
            const defaults = ['Fontanería', 'Electricidad', 'Estructura', 'Climatización'];
            storage.setData(STORAGE_KEYS.DESIGN_CATEGORIES, defaults);
            return defaults;
        }
        return data;
    },
    setDesignCategories: (cats: string[]) => storage.setData(STORAGE_KEYS.DESIGN_CATEGORIES, cats),

    getEventTypes: (): string[] => {
        // We store this in config or separate key? User said "In settings". 
        // Previously we used separate keys for lists. Let's stick to that pattern for consistency,
        // even though config is an object. Actually, previous lists (projectTypes) were keys.
        // Let's use a new key EVENT_TYPES.
        const data = storage.getData<string>('crm_event_types');
        if (!data || data.length === 0) {
            const defaults = ['Reunión', 'Visita de Obra', 'Administrativo', 'Formación', 'Otros'];
            storage.setData('crm_event_types', defaults);
            return defaults;
        }
        return data;
    },
    setEventTypes: (types: string[]) => storage.setData('crm_event_types', types),

    // Calendar Events
    getEvents: () => storage.getData<CalendarEvent>(STORAGE_KEYS.EVENTS),
    addEvent: (event: CalendarEvent) => storage.add(STORAGE_KEYS.EVENTS, event),
    removeEvent: (id: string) => storage.remove(STORAGE_KEYS.EVENTS, id),

    // Projects
    deleteProject: (id: string) => storage.remove(STORAGE_KEYS.PROJECTS, id)
};

export const KEYS = STORAGE_KEYS;
