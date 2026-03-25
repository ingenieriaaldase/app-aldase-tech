import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Invoice, Expense, Client, CompanyConfig } from '../../types';
import { storage } from '../../services/storage';
import { TrendingUp, TrendingDown, DollarSign, FileText, Receipt, Calendar, AlertCircle, Users, ShoppingBag, Search, BarChart2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#64748b'];

interface TaxAnalysisProps {
    invoices?: Invoice[];
    expenses?: Expense[];
}

export default function TaxAnalysis({ invoices: propInvoices, expenses: propExpenses }: TaxAnalysisProps = {}) {
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [config, setConfig] = useState<CompanyConfig | null>(null);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedQuarter, setSelectedQuarter] = useState<number | 'all'>('all');
    const [clientSearch, setClientSearch] = useState('');
    const [supplierSearch, setSupplierSearch] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const [inv, exp, cli, cfg] = await Promise.all([
            propInvoices === undefined ? storage.getInvoices() : Promise.resolve(propInvoices),
            propExpenses === undefined ? storage.getExpenses() : Promise.resolve(propExpenses),
            storage.getClients(),
            storage.getConfig()
        ]);
        if (propInvoices === undefined) setInvoices(inv);
        if (propExpenses === undefined) setExpenses(exp);
        setClients(cli);
        setConfig(cfg);
    };

    // Keep data in sync if props change
    useEffect(() => {
        if (propInvoices) setInvoices(propInvoices);
        if (propExpenses) setExpenses(propExpenses);
    }, [propInvoices, propExpenses]);

    const filterByPeriod = <T extends { date: string }>(items: T[]): T[] => {
        return items.filter(item => {
            const itemDate = new Date(item.date);
            const itemYear = itemDate.getFullYear();
            const itemQuarter = Math.floor(itemDate.getMonth() / 3) + 1;
            if (itemYear !== selectedYear) return false;
            if (selectedQuarter === 'all') return true;
            return itemQuarter === selectedQuarter;
        });
    };

    const filteredInvoices = filterByPeriod(invoices);
    const filteredExpenses = filterByPeriod(expenses);

    // Paid vs Pending
    const paidInvoices = filteredInvoices.filter(i => i.status === 'PAGADA');
    const pendingInvoices = filteredInvoices.filter(i => i.status === 'PENDIENTE' || i.status === 'VENCIDA');

    // ── Ingresos Cobrados (con y sin IVA) ──────────────────────────────────────
    const totalIncome = paidInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);       // Con IVA
    const totalIncomeBase = paidInvoices.reduce((sum, inv) => sum + inv.baseAmount, 0);    // Sin IVA
    const totalIncomeIVA = paidInvoices.reduce((sum, inv) => sum + inv.ivaAmount, 0);      // Solo IVA

    // ── Pendiente de Cobro (con y sin IVA) ────────────────────────────────────
    const pendingIncome = pendingInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);      // Con IVA
    const pendingIncomeBase = pendingInvoices.reduce((sum, inv) => sum + inv.baseAmount, 0);   // Sin IVA
    const pendingIncomeIVA = pendingInvoices.reduce((sum, inv) => sum + inv.ivaAmount, 0);     // Solo IVA

    // ── Gastos ────────────────────────────────────────────────────────────────
    // El IVA de los gastos se recupera en Hacienda, la base es el gasto real del negocio
    const totalExpensesBase = filteredExpenses.reduce((sum, exp) => sum + exp.baseAmount, 0);     // Sin IVA
    const totalExpensesIVA = filteredExpenses.reduce((sum, exp) => sum + exp.ivaAmount, 0);       // IVA recuperable
    const totalExpensesWithIVA = filteredExpenses.reduce((sum, exp) => sum + exp.totalAmount, 0); // Con IVA

    // ── Base Facturada (TODA la facturación emitida, fiscalmente correcta) ─────
    // Hacienda tributa sobre el devengo (emisión de factura), no sobre el cobro.
    const irpfBase = filteredInvoices.reduce((sum, inv) => sum + inv.baseAmount, 0);

    // ── Beneficio Bruto = Base Total Facturada - Base Total Gastos ─────────────
    const grossProfit = irpfBase - totalExpensesBase;

    // ── IVA ───────────────────────────────────────────────────────────────────
    const ivaCollected = filteredInvoices.reduce((sum, inv) => sum + inv.ivaAmount, 0); // IVA repercutido de toda la facturación
    const ivaPaid = filteredExpenses.reduce((sum, exp) => sum + exp.ivaAmount, 0);
    const ivaBalance = ivaCollected - ivaPaid;

    // ── Gastos deducibles IRPF: solo los explícitamente marcados como true ─────
    const irpfDeductibleExpenses = filteredExpenses
        .filter(exp => exp.irpfDeductible === true)
        .reduce((sum, exp) => sum + exp.baseAmount, 0);


    // IS rate from settings (default 25%)
    const isRate = ((config?.corporateTaxRate ?? 25)) / 100;

    // Base imponible IS = ingresos facturados - gastos deducibles marcados
    const baseImponibleEstimada = irpfBase - irpfDeductibleExpenses;
    const estimatedTaxes = baseImponibleEstimada > 0 ? baseImponibleEstimada * isRate : 0;
    const profitAfterTaxes = baseImponibleEstimada - estimatedTaxes;

    // ── Rankings por Cliente / Proveedor ─────────────────────────────────────
    const incomeByClient: Record<string, number> = {};
    filteredInvoices.forEach(inv => {
        if (!incomeByClient[inv.clientId]) incomeByClient[inv.clientId] = 0;
        incomeByClient[inv.clientId] += inv.baseAmount;
    });

    const filteredClientIncomes = Object.entries(incomeByClient)
        .map(([clientId, amount]) => ({
            client: clients.find(c => c.id === clientId)?.name || 'Desconocido',
            amount
        }))
        .filter(c => c.client.toLowerCase().includes(clientSearch.toLowerCase()))
        .sort((a, b) => b.amount - a.amount);

    const displayedClients = clientSearch ? filteredClientIncomes : filteredClientIncomes.slice(0, 5);

    const expensesBySupplier: Record<string, number> = {};
    filteredExpenses.forEach(exp => {
        const supplier = exp.supplier || 'Desconocido';
        if (!expensesBySupplier[supplier]) expensesBySupplier[supplier] = 0;
        expensesBySupplier[supplier] += exp.baseAmount;
    });

    const filteredSuppliers = Object.entries(expensesBySupplier)
        .map(([supplier, amount]) => ({ supplier, amount }))
        .filter(s => s.supplier.toLowerCase().includes(supplierSearch.toLowerCase()))
        .sort((a, b) => b.amount - a.amount);

    const displayedSuppliers = supplierSearch ? filteredSuppliers : filteredSuppliers.slice(0, 5);

    const yearOptions = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i);

    const fmt = (n: number) => n.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });

    // ── Datos para Gráficos ──────────────────────────────────────────────────
    const months = selectedQuarter === 'all'
        ? Array.from({ length: 12 }, (_, i) => i)
        : Array.from({ length: 3 }, (_, i) => (selectedQuarter === 1 ? 0 : selectedQuarter === 2 ? 3 : selectedQuarter === 3 ? 6 : 9) + i);

    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

    const monthlyData = months.map(m => {
        const monthInvoices = filteredInvoices.filter(i => new Date(i.date).getMonth() === m);
        const monthExpenses = filteredExpenses.filter(e => new Date(e.date).getMonth() === m);

        return {
            name: monthNames[m],
            Ingresos: monthInvoices.reduce((sum, i) => sum + i.baseAmount, 0),
            Gastos: monthExpenses.reduce((sum, e) => sum + e.baseAmount, 0),
        };
    });

    const baseClientIncomes = Object.entries(incomeByClient)
        .map(([clientId, amount]) => ({
            client: clients.find(c => c.id === clientId)?.name || 'Desconocido',
            amount
        }))
        .sort((a, b) => b.amount - a.amount);

    const clientChartData = (() => {
        if (baseClientIncomes.length <= 5) return baseClientIncomes.map(c => ({ name: c.client, value: c.amount }));
        const top5 = baseClientIncomes.slice(0, 5);
        const others = baseClientIncomes.slice(5).reduce((sum, c) => sum + c.amount, 0);
        return [...top5.map(c => ({ name: c.client, value: c.amount })), { name: 'Otros', value: others }];
    })();

    const baseSupplierExpenses = Object.entries(expensesBySupplier)
        .map(([supplier, amount]) => ({ supplier, amount }))
        .sort((a, b) => b.amount - a.amount);

    const supplierChartData = (() => {
        if (baseSupplierExpenses.length <= 5) return baseSupplierExpenses.map(s => ({ name: s.supplier, value: s.amount }));
        const top5 = baseSupplierExpenses.slice(0, 5);
        const others = baseSupplierExpenses.slice(5).reduce((sum, s) => sum + s.amount, 0);
        return [...top5.map(s => ({ name: s.supplier, value: s.amount })), { name: 'Otros', value: others }];
    })();

    const netProfitChartData = baseImponibleEstimada > 0 ? [
        { name: 'Beneficio Neto', value: profitAfterTaxes, fill: '#10b981' },
        { name: 'IS Estimado', value: estimatedTaxes, fill: '#ef4444' },
    ] : [];

    return (
        <div className="space-y-6 animate-fade-in">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">Análisis Financiero y Fiscal</h1>
                <p className="text-slate-500 text-sm mt-1">Resumen general, pendientes de cobro y obligaciones tributarias.</p>
            </div>

            {/* Filtros */}
            <Card>
                <CardContent className="p-4">
                    <div className="flex flex-wrap gap-4 items-center">
                        <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-slate-500" />
                            <label className="text-sm font-medium text-slate-700">Año:</label>
                            <select
                                value={selectedYear}
                                onChange={e => setSelectedYear(parseInt(e.target.value))}
                                className="px-3 py-1.5 rounded-md border border-slate-300 text-sm focus:ring-2 focus:ring-primary-500"
                            >
                                {yearOptions.map(year => (
                                    <option key={year} value={year}>{year}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex items-center gap-2">
                            <label className="text-sm font-medium text-slate-700">Trimestre:</label>
                            <select
                                value={selectedQuarter}
                                onChange={e => setSelectedQuarter(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
                                className="px-3 py-1.5 rounded-md border border-slate-300 text-sm focus:ring-2 focus:ring-primary-500"
                            >
                                <option value="all">Todo el año</option>
                                <option value={1}>Q1 (Ene-Mar)</option>
                                <option value={2}>Q2 (Abr-Jun)</option>
                                <option value={3}>Q3 (Jul-Sep)</option>
                                <option value={4}>Q4 (Oct-Dic)</option>
                            </select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Tarjetas resumen */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">

                {/* Ingresado (Cobrado) */}
                <Card className="border-l-4 border-l-green-500">
                    <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                            <div className="flex-1">
                                <p className="text-sm font-medium text-slate-500">Ingresado (Cobrado)</p>
                                <p className="text-xl font-bold text-slate-900 mt-1">{fmt(totalIncome)}</p>
                                <p className="text-xs text-slate-400 mt-0.5">con IVA · {paidInvoices.length} facturas</p>
                                <div className="mt-2 pt-2 border-t border-slate-100 space-y-0.5">
                                    <p className="text-xs text-slate-600">
                                        <span className="font-medium">s/IVA:</span> {fmt(totalIncomeBase)}
                                    </p>
                                    <p className="text-xs text-slate-500">
                                        <span className="font-medium">IVA:</span> {fmt(totalIncomeIVA)}
                                    </p>
                                </div>
                            </div>
                            <div className="p-2 bg-green-100 rounded-full ml-2 shrink-0">
                                <TrendingUp className="w-5 h-5 text-green-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Pendiente de Cobro */}
                <Card className="border-l-4 border-l-yellow-500">
                    <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                            <div className="flex-1">
                                <p className="text-sm font-medium text-slate-500">Pendiente de Cobro</p>
                                <p className="text-xl font-bold text-slate-900 mt-1">{fmt(pendingIncome)}</p>
                                <p className="text-xs text-slate-400 mt-0.5">con IVA · {pendingInvoices.length} facturas</p>
                                <div className="mt-2 pt-2 border-t border-slate-100 space-y-0.5">
                                    <p className="text-xs text-slate-600">
                                        <span className="font-medium">s/IVA:</span> {fmt(pendingIncomeBase)}
                                    </p>
                                    <p className="text-xs text-slate-500">
                                        <span className="font-medium">IVA:</span> {fmt(pendingIncomeIVA)}
                                    </p>
                                </div>
                            </div>
                            <div className="p-2 bg-yellow-100 rounded-full ml-2 shrink-0">
                                <AlertCircle className="w-5 h-5 text-yellow-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Gastos */}
                <Card className="border-l-4 border-l-red-500">
                    <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                            <div className="flex-1">
                                <p className="text-sm font-medium text-slate-500">Gastos</p>
                                <p className="text-xl font-bold text-slate-900 mt-1">{fmt(totalExpensesBase)}</p>
                                <p className="text-xs text-slate-400 mt-0.5">s/IVA · {filteredExpenses.length} gastos</p>
                                <div className="mt-2 pt-2 border-t border-slate-100 space-y-0.5">
                                    <p className="text-xs text-slate-600">
                                        <span className="font-medium">c/IVA:</span> {fmt(totalExpensesWithIVA)}
                                    </p>
                                    <p className="text-xs text-slate-500">
                                        <span className="font-medium">IVA recuperable:</span> {fmt(totalExpensesIVA)}
                                    </p>
                                </div>
                            </div>
                            <div className="p-2 bg-red-100 rounded-full ml-2 shrink-0">
                                <TrendingDown className="w-5 h-5 text-red-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Beneficio Bruto */}
                <Card className={`border-l-4 ${grossProfit >= 0 ? 'border-l-blue-500' : 'border-l-orange-500'}`}>
                    <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                            <div className="flex-1">
                                <p className="text-sm font-medium text-slate-500">Beneficio Bruto</p>
                                <p className={`text-xl font-bold mt-1 ${grossProfit >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                                    {fmt(grossProfit)}
                                </p>
                                <p className="text-xs text-slate-400 mt-0.5">Base facturada - Base gastos</p>
                                <div className="mt-2 pt-2 border-t border-slate-100 space-y-0.5">
                                    <p className="text-xs text-slate-600">
                                        <span className="font-medium">Facturado:</span> {fmt(irpfBase)}
                                    </p>
                                    <p className="text-xs text-slate-500">
                                        <span className="font-medium">Gastos:</span> {fmt(totalExpensesBase)}
                                    </p>
                                </div>
                            </div>
                            <div className={`p-2 rounded-full ml-2 shrink-0 ${grossProfit >= 0 ? 'bg-blue-100' : 'bg-orange-100'}`}>
                                <DollarSign className={`w-5 h-5 ${grossProfit >= 0 ? 'text-blue-600' : 'text-orange-600'}`} />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Beneficio Tras Impuestos */}
                <Card className="border-l-4 border-l-purple-500 bg-purple-50">
                    <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                            <div className="flex-1">
                                <p className="text-sm font-medium text-slate-500">Bº Tras Impuestos</p>
                                <p className="text-xl font-bold text-purple-700 mt-1">{fmt(profitAfterTaxes)}</p>
                                <p className="text-xs text-slate-400 mt-0.5">Est. -{(isRate * 100).toFixed(0)}% IS</p>
                                <div className="mt-2 pt-2 border-t border-purple-100 space-y-0.5">
                                    <p className="text-xs text-slate-600">
                                        <span className="font-medium">Base IS:</span> {fmt(baseImponibleEstimada)}
                                    </p>
                                    <p className="text-xs text-slate-500">
                                        <span className="font-medium">IS est. ({(isRate * 100).toFixed(0)}%):</span> {fmt(estimatedTaxes)}
                                    </p>
                                </div>
                            </div>
                            <div className="p-2 bg-purple-200 rounded-full ml-2 shrink-0">
                                <DollarSign className="w-5 h-5 text-purple-700" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Gráfico de Evolución */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <BarChart2 className="w-5 h-5 text-indigo-600" /> Evolución Ingresos vs Gastos
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-72 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} />
                                <YAxis axisLine={false} tickLine={false} tickFormatter={(value) => `€${value.toLocaleString()}`} tick={{ fontSize: 12, fill: '#64748B' }} />
                                <RechartsTooltip formatter={(value: number) => fmt(value)} cursor={{ fill: '#F1F5F9' }} />
                                <Legend />
                                <Bar dataKey="Ingresos" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                                <Bar dataKey="Gastos" fill="#EF4444" radius={[4, 4, 0, 0]} maxBarSize={40} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

            {/* Rankings por cliente / proveedor */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="flex flex-col">
                    <CardHeader className="pb-2">
                        <div className="flex justify-between items-center mb-2">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Users className="w-5 h-5 text-primary-600" /> Ingresos por Cliente
                            </CardTitle>
                        </div>
                        <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Buscar cliente..."
                                value={clientSearch}
                                onChange={(e) => setClientSearch(e.target.value)}
                                className="w-full pl-9 pr-3 py-1.5 text-sm rounded-md border border-slate-300 focus:ring-primary-500 focus:border-primary-500"
                            />
                        </div>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-hidden flex flex-col pt-2">
                        {!clientSearch && clientChartData.length > 0 && (
                            <div className="h-48 w-full mb-4 shrink-0">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={clientChartData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={2} dataKey="value">
                                            {clientChartData.map((_, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <RechartsTooltip formatter={(value: number) => fmt(value)} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                            {displayedClients.length > 0 ? (
                                displayedClients.map((c, i) => (
                                    <div key={i} className="flex justify-between items-center text-sm border-b border-slate-100 pb-2 last:border-0 last:pb-0">
                                        <span className="font-medium text-slate-700 truncate pr-4">{c.client}</span>
                                        <div className="text-right shrink-0">
                                            <span className="font-bold text-slate-900">{fmt(c.amount)}</span>
                                            <p className="text-xs text-slate-400">s/IVA</p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-slate-500 my-4 text-center">No se encontraron clientes.</p>
                            )}
                            {!clientSearch && filteredClientIncomes.length > 5 && (
                                <p className="text-xs text-slate-400 text-center mt-2 pt-2 border-t border-slate-100">
                                    Mostrando top 5 — usa el buscador para ver más.
                                </p>
                            )}
                        </div>
                    </CardContent>
                </Card>

                <Card className="flex flex-col">
                    <CardHeader className="pb-2">
                        <div className="flex justify-between items-center mb-2">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <ShoppingBag className="w-5 h-5 text-pink-600" /> Gastos por Proveedor
                            </CardTitle>
                        </div>
                        <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Buscar proveedor..."
                                value={supplierSearch}
                                onChange={(e) => setSupplierSearch(e.target.value)}
                                className="w-full pl-9 pr-3 py-1.5 text-sm rounded-md border border-slate-300 focus:ring-primary-500 focus:border-primary-500"
                            />
                        </div>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-hidden flex flex-col pt-2">
                        {!supplierSearch && supplierChartData.length > 0 && (
                            <div className="h-48 w-full mb-4 shrink-0">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={supplierChartData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={2} dataKey="value">
                                            {supplierChartData.map((_, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <RechartsTooltip formatter={(value: number) => fmt(value)} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                            {displayedSuppliers.length > 0 ? (
                                displayedSuppliers.map((s, i) => (
                                    <div key={i} className="flex justify-between items-center text-sm border-b border-slate-100 pb-2 last:border-0 last:pb-0">
                                        <span className="font-medium text-slate-700 truncate pr-4">{s.supplier}</span>
                                        <div className="text-right shrink-0">
                                            <span className="font-bold text-slate-900">{fmt(s.amount)}</span>
                                            <p className="text-xs text-slate-400">s/IVA</p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-slate-500 my-4 text-center">No se encontraron proveedores.</p>
                            )}
                            {!supplierSearch && filteredSuppliers.length > 5 && (
                                <p className="text-xs text-slate-400 text-center mt-2 pt-2 border-t border-slate-100">
                                    Mostrando top 5 — usa el buscador para ver más.
                                </p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* IS / Base Imponible */}
            <Card>
                <CardHeader>
                    <CardTitle>Impuesto de Sociedades (IS) — Base Imponible Estimada</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex flex-col lg:flex-row gap-6">
                        {netProfitChartData.length > 0 && (
                            <div className="w-full lg:w-56 h-48 shrink-0">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={netProfitChartData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={2} dataKey="value">
                                            {netProfitChartData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.fill} />
                                            ))}
                                        </Pie>
                                        <RechartsTooltip formatter={(value: number) => fmt(value)} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
                            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                                <p className="text-sm font-medium text-slate-700 mb-1">Ingresos Facturados (s/IVA)</p>
                                <p className="text-xl font-bold text-slate-900">{fmt(irpfBase)}</p>
                                <p className="text-xs text-slate-500 mt-1">Toda la facturación emitida del período</p>
                            </div>

                            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                                <p className="text-sm font-medium text-slate-700 mb-1">Gastos Deducibles IS</p>
                                <p className="text-xl font-bold text-slate-900">{fmt(irpfDeductibleExpenses)}</p>
                                <p className="text-xs text-slate-500 mt-1">Solo gastos marcados como deducibles</p>
                            </div>

                            <div className="p-4 bg-primary-50 rounded-lg border border-primary-200">
                                <p className="text-sm font-medium text-primary-900 mb-1">Base Imponible Estimada</p>
                                <p className="text-xl font-bold text-primary-700">{fmt(baseImponibleEstimada)}</p>
                                <p className="text-xs text-primary-600 mt-1">Ingresos Facturados - Gastos Deducibles</p>
                            </div>

                            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                                <p className="text-sm font-medium text-red-900 mb-1">IS Estimado ({(isRate * 100).toFixed(0)}%)</p>
                                <p className="text-xl font-bold text-red-700">{fmt(estimatedTaxes)}</p>
                                <p className="text-xs text-red-600 mt-1">Se puede configurar en Ajustes</p>
                            </div>
                        </div>
                    </div>

                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <p className="text-xs text-amber-800">
                            <strong>Nota:</strong> IS calculado al {(isRate * 100).toFixed(0)}%. Modifica el tipo en <em>Ajustes → Configuración Empresa → Facturación</em>. Consulta con tu asesor fiscal.
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* IVA */}
            <Card>
                <CardHeader>
                    <CardTitle>Análisis de IVA</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                            <div className="flex items-center gap-2 mb-2">
                                <FileText className="w-4 h-4 text-green-600" />
                                <p className="text-sm font-medium text-green-900">IVA Repercutido</p>
                            </div>
                            <p className="text-xl font-bold text-green-700">{fmt(ivaCollected)}</p>
                            <p className="text-xs text-green-600 mt-1">De toda la facturación emitida</p>
                        </div>

                        <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                            <div className="flex items-center gap-2 mb-2">
                                <Receipt className="w-4 h-4 text-red-600" />
                                <p className="text-sm font-medium text-red-900">IVA Soportado</p>
                            </div>
                            <p className="text-xl font-bold text-red-700">{fmt(ivaPaid)}</p>
                            <p className="text-xs text-red-600 mt-1">De tus facturas de gastos</p>
                        </div>

                        <div className={`p-4 rounded-lg border ${ivaBalance >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-orange-50 border-orange-200'}`}>
                            <div className="flex items-center gap-2 mb-2">
                                <DollarSign className={`w-4 h-4 ${ivaBalance >= 0 ? 'text-blue-600' : 'text-orange-600'}`} />
                                <p className={`text-sm font-medium ${ivaBalance >= 0 ? 'text-blue-900' : 'text-orange-900'}`}>
                                    {ivaBalance >= 0 ? 'IVA a Pagar' : 'IVA a Compensar'}
                                </p>
                            </div>
                            <p className={`text-xl font-bold ${ivaBalance >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>
                                {fmt(Math.abs(ivaBalance))}
                            </p>
                            <p className={`text-xs mt-1 ${ivaBalance >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                                Repercutido - Soportado
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
