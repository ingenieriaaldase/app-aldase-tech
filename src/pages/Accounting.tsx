import { useState, useEffect } from 'react';
import { storage } from '../services/storage';
import { Invoice, Quote, Client, Project, Concept } from '../types';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { generatePDF } from '../utils/pdfGenerator';
import { Plus, FileText, Printer, CheckCircle } from 'lucide-react';


export default function Accounting() {
    const [activeTab, setActiveTab] = useState<'INVOICES' | 'QUOTES'>('QUOTES');
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [quotes, setQuotes] = useState<Quote[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);

    // Simple Modal State for CRUD (Can be extracted)


    useEffect(() => {
        const loadData = async () => {
            const [inv, quo, cli, pro] = await Promise.all([
                storage.getInvoices(),
                storage.getQuotes(),
                storage.getClients(),
                storage.getProjects()
            ]);
            setInvoices(inv);
            setQuotes(quo);
            setClients(cli);
            setProjects(pro);
        };
        loadData();
    }, []);

    const handleGeneratePDF = (item: Invoice | Quote) => {
        const client = clients.find(c => c.id === item.clientId);
        const project = projects.find(p => p.id === item.projectId);
        const runPDF = async () => {
            const config = await storage.getConfig();
            if (client && project) {
                generatePDF(activeTab === 'INVOICES' ? 'FACTURA' : 'PRESUPUESTO', item, client, project, config);
            }
        };
        runPDF();
    };

    const createDummyDocument = async () => {
        // Just a quick way to demo - in real app would use full form
        if (clients.length === 0 || projects.length === 0) {
            alert('Necesitas clientes y proyectos para crear docs');
            return;
        }

        const config = await storage.getConfig();
        const client = clients[0];
        const project = projects[0];

        const concepts: Concept[] = [
            { description: 'Consultoría Técnica', quantity: 10, price: 50 },
            { description: 'Materiales Varios', quantity: 1, price: 500 }
        ];

        const base = 1000;
        const iva = 210;

        if (activeTab === 'QUOTES') {
            const newQuote: Quote = {
                id: crypto.randomUUID(),
                number: `PRE-2024-${String(config.quoteSequence).padStart(3, '0')}`,
                clientId: client.id,
                projectId: project.id,
                date: new Date().toISOString(),
                expiryDate: new Date(Date.now() + 86400000 * 30).toISOString(),
                concepts,
                baseAmount: base, ivaRate: 0.21, ivaAmount: iva, totalAmount: base + iva,
                status: 'PENDIENTE'
            };
            await storage.add('crm_quotes', newQuote);
            config.quoteSequence++;
            await storage.updateConfig(config);
            setQuotes(await storage.getQuotes());
        } else {
            const newInvoice: Invoice = {
                id: crypto.randomUUID(),
                number: `FAC-2024-${String(config.invoiceSequence).padStart(3, '0')}`,
                clientId: client.id,
                projectId: project.id,
                date: new Date().toISOString(),
                expiryDate: new Date(Date.now() + 86400000 * 30).toISOString(),
                concepts,
                baseAmount: base, ivaRate: 0.21, ivaAmount: iva, totalAmount: base + iva,
                status: 'PENDIENTE'
            };
            await storage.add('crm_invoices', newInvoice);
            config.invoiceSequence++;
            await storage.updateConfig(config);
            setInvoices(await storage.getInvoices());
        }
    };

    const getClientName = (id: string) => clients.find(c => c.id === id)?.name;
    const getProjectName = (id: string) => projects.find(p => p.id === id)?.name;

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">Contabilidad</h1>
                <Button onClick={createDummyDocument}>
                    <Plus className="w-4 h-4 mr-2" />
                    Crear {activeTab === 'QUOTES' ? 'Presupuesto' : 'Factura'} Demo
                </Button>
            </div>

            <div className="border-b border-slate-200">
                <nav className="-mb-px flex space-x-8">
                    <button onClick={() => setActiveTab('QUOTES')} className={`pb-4 px-1 border-b-2 font-medium ${activeTab === 'QUOTES' ? 'border-primary-500 text-primary-600' : 'border-transparent text-slate-500'}`}>
                        Presupuestos
                    </button>
                    <button onClick={() => setActiveTab('INVOICES')} className={`pb-4 px-1 border-b-2 font-medium ${activeTab === 'INVOICES' ? 'border-primary-500 text-primary-600' : 'border-transparent text-slate-500'}`}>
                        Facturas
                    </button>
                </nav>
            </div>

            <div className="space-y-4">
                {(activeTab === 'QUOTES' ? quotes : invoices).map((item) => (
                    <Card key={item.id} className="hover:shadow-sm transition-shadow">
                        <CardContent className="p-4 flex flex-col md:flex-row items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-slate-100 rounded-full">
                                    <FileText className="w-6 h-6 text-slate-600" />
                                </div>
                                <div>
                                    <p className="font-bold text-slate-900">{item.number}</p>
                                    <p className="text-sm text-slate-500">{new Date(item.date).toLocaleDateString()} — {getClientName(item.clientId)}</p>
                                    <p className="text-xs text-slate-400">{getProjectName(item.projectId)}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-6">
                                <div className="text-right">
                                    <p className="font-bold text-lg">{item.totalAmount.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</p>
                                    <Badge variant={item.status === 'PAGADA' || item.status === 'ACEPTADO' ? 'success' : item.status === 'VENCIDA' || item.status === 'RECHAZADO' ? 'danger' : 'warning'}>
                                        {item.status}
                                    </Badge>
                                </div>
                                <div className="flex gap-2">
                                    <Button variant="ghost" size="sm" onClick={() => handleGeneratePDF(item)}>
                                        <Printer className="w-4 h-4 text-slate-600" />
                                    </Button>
                                    {activeTab === 'QUOTES' && item.status === 'PENDIENTE' && (
                                        <Button variant="ghost" size="sm" className="text-green-600 hover:text-green-700 hover:bg-green-50" title="Aprobar y Convertir">
                                            <CheckCircle className="w-4 h-4" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
                {quotes.length === 0 && activeTab === 'QUOTES' && <p className="text-center text-slate-500 py-8">No hay presupuestos registrados.</p>}
                {invoices.length === 0 && activeTab === 'INVOICES' && <p className="text-center text-slate-500 py-8">No hay facturas registradas.</p>}
            </div>
        </div>
    );
}
