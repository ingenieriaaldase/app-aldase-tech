import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { storage } from '../services/storage';
import { Client } from '../types';
import { Plus, Search, Building2, Phone, Mail } from 'lucide-react';

import { useAuth } from '../hooks/useAuth';
import { exportToCSV } from '../utils/csvExporter';
import { Download } from 'lucide-react';

export default function ClientList() {
    const { user } = useAuth();
    const [clients, setClients] = useState<Client[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        setClients(storage.getClients());
    }, []);

    const filtered = clients.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.contactName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleExport = () => {
        exportToCSV(clients, `clientes_${new Date().toISOString().split('T')[0]}`);
    };

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const { parseCSV } = await import('../utils/csvImporter');
            const data = await parseCSV(file);

            const newClients: Client[] = data.map((row: any) => ({
                id: crypto.randomUUID(),
                name: row['name'] || row['Nombre'] || 'Sin Nombre',
                cif: row['cif'] || row['CIF'] || '',
                address: row['address'] || row['Dirección'] || '',
                city: '',
                zipCode: '',
                contactName: row['contactName'] || row['Contacto'] || '',
                email: row['email'] || row['Email'] || '',
                phone: row['phone'] || row['Teléfono'] || '',
                notes: row['notes'] || row['Notas'] || '',
                clientType: 'EMPRESA', // Default
                createdAt: new Date().toISOString()
            }));

            const current = storage.getClients();
            storage.setData('crm_clients', [...current, ...newClients]);
            setClients(storage.getClients()); // Reload
            alert(`Importados ${newClients.length} clientes correctamente.`);
        } catch (error) {
            console.error(error);
            alert('Error al importar CSV');
        }
        e.target.value = '';
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Clientes</h1>
                    <p className="text-slate-500 dark:text-slate-400">Cartera de clientes y contactos</p>
                </div>
                <div className="flex gap-2">
                    {user?.role === 'ADMIN' && (
                        <Button variant="outline" onClick={handleExport}>
                            <Download className="w-4 h-4 mr-2" />
                            Exportar CSV
                        </Button>
                    )}
                    {user?.role === 'ADMIN' && (
                        <div className="relative">
                            <input
                                type="file"
                                accept=".csv"
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                onChange={handleImport}
                            />
                            <Button variant="outline">
                                <Download className="w-4 h-4 mr-2 rotate-180" />
                                Importar CSV
                            </Button>
                        </div>
                    )}
                    <Link to="/clients/new">
                        <Button>
                            <Plus className="w-4 h-4 mr-2" />
                            Nuevo Cliente
                        </Button>
                    </Link>
                </div>
            </div>

            <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500 dark:text-slate-400" />
                <Input
                    placeholder="Buscar clientes..."
                    className="pl-9 max-w-md"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filtered.map((client) => (
                    <Link key={client.id} to={`/clients/${client.id}`}>
                        <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
                            <CardContent className="p-6">
                                <div className="flex items-center space-x-4 mb-4">
                                    <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center">
                                        <Building2 className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-lg text-slate-900 dark:text-white">{client.name}</h3>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">CIF: {client.cif}</p>
                                    </div>
                                </div>

                                <div className="space-y-2 text-sm">
                                    <div className="flex items-center text-slate-600 dark:text-slate-300">
                                        <UserIcon className="w-4 h-4 mr-2 text-slate-400 dark:text-slate-500" />
                                        {client.contactName}
                                    </div>
                                    <div className="flex items-center text-slate-600 dark:text-slate-300">
                                        <Mail className="w-4 h-4 mr-2 text-slate-400 dark:text-slate-500" />
                                        {client.email}
                                    </div>
                                    <div className="flex items-center text-slate-600 dark:text-slate-300">
                                        <Phone className="w-4 h-4 mr-2 text-slate-400 dark:text-slate-500" />
                                        {client.phone}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </Link>
                ))}
                {filtered.length === 0 && (
                    <div className="col-span-full text-center py-12 text-slate-500 dark:text-slate-400">
                        No se encontraron clientes
                    </div>
                )}
            </div>
        </div>
    );
}

const UserIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
)
