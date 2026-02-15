export type Role = 'ADMIN' | 'MANAGER' | 'WORKER';

export interface User {
    id: string;
    name: string;
    email: string;
    role: Role;
    avatarUrl?: string;
}

export interface Worker extends User {
    surnames?: string;
    hourlyRate: number;
    phone: string;
    joinedDate: string;
    active: boolean;
    password?: string; // Local storage password for simple auth
}

export type ClientType = 'ARQUITECTURA' | 'PROMOTOR' | 'PARTICULAR' | 'CONSTRUCTORA' | 'INSTALADORA';

export interface Client {
    id: string;
    name: string;
    cif: string;
    address: string;
    city?: string;
    province?: string;
    zipCode?: string;
    type?: ClientType;
    contactName: string;
    email: string;
    phone: string;
    notes: string;
    createdAt: string;
}

export type ProjectType = string;
export type ProjectStatus = 'PLANIFICACION' | 'EN_CURSO' | 'PAUSADO' | 'COMPLETADO' | 'ENTREGADO' | 'CANCELADO';

export interface Project {
    id: string;
    code: string; // Expediente
    name: string;
    clientId: string;
    linkedQuoteId?: string;
    type: ProjectType;
    managerId: string; // Worker ID responsible
    status: ProjectStatus;
    startDate: string;
    deliveryDate: string;
    budget: number;
    costs: number;
    description: string;
    location: string; // Keep for backward compatibility or map to address? User asked for Address + City. Let's keep location as "Ubicación General" or map it. I will add new fields.
    address: string;
    city: string;
    province?: string;
    zipCode?: string;
    createdAt: string;
}

export type TaskType = string;

export interface TimeEntry {
    id: string;
    workerId: string;
    projectId?: string;
    taskType: TaskType;
    date: string;
    hours: number;
    description: string;
    subCategory?: string; // For Design sub-categories
    hourlyRateSnapshot: number; // Rate at the time of entry
}

export interface TaskComment {
    id: string;
    text: string;
    authorId: string;
    createdAt: string;
}

export interface Task {
    id: string;
    projectId: string;
    title: string;
    description?: string;
    status: 'TODO' | 'IN_PROGRESS' | 'DONE';
    assigneeId?: string; // Worker ID
    dueDate?: string;
    estimatedHours?: number;
    createdAt: string;
    comments?: TaskComment[];
}

export interface ProjectDocument {
    id: string;
    projectId: string;
    name: string;
    url: string; // Mock URL or blob
    type: string; // pdf, dwg, etc
    category: 'CONTRACT' | 'PLAN' | 'INVOICE' | 'OTHER';
    uploadDate: string;
    size: string;
}

export interface Concept {
    description: string;
    quantity: number;
    price: number;
    details?: string[];
}

export type InvoiceStatus = 'PENDIENTE' | 'PAGADA' | 'VENCIDA';
export type QuoteStatus = 'PENDIENTE' | 'ACEPTADO' | 'RECHAZADO';

export interface FinancialDocument {
    id: string; // Auto-generated sequence
    number: string; // Formatting string e.g. "FAC-2024-001"
    clientId: string;
    projectId: string;
    date: string;
    expiryDate: string;
    concepts: Concept[];
    baseAmount: number;
    ivaRate: number; // 0.21
    ivaAmount: number;
    totalAmount: number;
    terms?: string; // General conditions text
    description?: string; // Project description or general notes
}

export interface Invoice extends FinancialDocument {
    status: InvoiceStatus;
    paidDate?: string;
    paymentMethod?: string;
}

export interface Quote extends FinancialDocument {
    status: QuoteStatus;
}

export type MeetingType = 'PROYECTO' | 'GENERAL' | 'CLIENTE';

export interface Meeting {
    id: string;
    title: string;
    type: MeetingType;
    projectId?: string;
    date: string; // ISO string with time
    durationMinutes: number;
    attendees: string[]; // Worker IDs
    location: string; // Or link
    agenda: string;
    minutes: string; // Acta
    completed: boolean;
}

export type EventType = string; // Was union, now dynamic string

export interface CalendarEvent {
    id: string;
    title: string;
    description: string;
    date: string; // ISO Date String (YYYY-MM-DD or full ISO)
    endDate?: string; // For multi-day events
    type: EventType;
    projectId?: string;
    allDay: boolean;
    attendees?: string[]; // IDs of invited workers
}

export interface CompanyConfig {
    name: string;
    cif: string;
    address: string;
    city?: string;
    province?: string;
    zipCode?: string;
    phone: string;
    email: string;
    logoUrl?: string; // For PDF
    iban?: string; // New field for bank details
    invoiceSequence: number;
    quoteSequence: number;
    projectTypes?: string[]; // Configurable project types
    taskCategories?: string[];
    designCategories?: string[]; // Configurable sub-categories for Design tasks
    eventTypes?: string[]; // Configurable event types
    defaultTerms?: string; // Legacy/General
    defaultQuoteTerms?: string; // Specific for Quotes
    defaultInvoiceTerms?: string; // Specific for Invoices
    gdprText?: string; // Legal text for footer
}

export type LeadStatus = 'NUEVO' | 'CONTACTADO' | 'REUNION' | 'PROPUESTA' | 'GANADO' | 'PERDIDO';

export interface Lead {
    id: string;
    name: string; // Contact name or Company name
    email?: string;
    phone?: string;
    city?: string;
    province?: string;
    source?: string; // e.g. "Web", "Referral", "LinkedIn"
    status: LeadStatus;
    notes?: string;
    value?: number; // Estimated value if applicable
    createdAt: string;
    lastContactDate?: string;
}

export type SocialPlatform = 'INSTAGRAM' | 'FACEBOOK' | 'LINKEDIN' | 'TIKTOK' | 'TWITTER' | 'YOUTUBE' | 'BLOG';
export type PostStatus = 'IDEA' | 'BORRADOR' | 'PROGRAMADO' | 'PUBLICADO';

export interface SocialPost {
    id: string;
    title: string;
    content: string;
    platform: SocialPlatform;
    date: string; // ISO date string
    status: PostStatus;
    mediaUrl?: string; // Placeholder for image/video
    hashtags?: string;
    likes?: number; // For analytics (future)
    uploaderType?: 'COMPANY' | 'WORKER';
    uploaderId?: string; // If WORKER
    creatorId?: string; // Worker ID
    time?: string; // HH:mm
    stats24h?: SocialStats;
    stats1w?: SocialStats;
}

export interface SocialStats {
    // Generic
    likes?: number; // Or reactions
    views?: number;
    comments?: number;
    shares?: number;
    clicks?: number;

    // LinkedIn specific
    impressions?: number;
    reached?: number; // Miembros alcanzados
    profileViews?: number;
    followers?: number;
    saves?: number;
    sends?: number;
}
