import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Invoice, Expense, Client } from '../../types';
import { storage } from '../../services/storage';
import { TrendingUp, TrendingDown, DollarSign, FileText, Receipt, Calendar, AlertCircle, Users, ShoppingBag } from 'lucide-react';

export default function TaxAnalysis() {
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedQuarter, setSelectedQuarter] = useState<number | 'all'>('all');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const [inv, exp, cli] = await Promise.all([
            storage.getInvoices(),
            storage.getExpenses(),
            storage.getClients()
        ]);
        setInvoices(inv);
        setExpenses(exp);
        setClients(cli);
    };

    // Filter data by selected period
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

    // Metrics (Cash Flow)
    const totalIncome = paidInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
    const pendingIncome = pendingInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
    const totalExpenses = filteredExpenses.reduce((sum, exp) => sum + exp.totalAmount, 0);

    const netProfit = totalIncome - totalExpenses; // Cash Flow Neto

    // Taxes (Calculated on ALL issued invoices/registered expenses for the period)
    const ivaCollected = filteredInvoices.reduce((sum, inv) => sum + inv.ivaAmount, 0);
    const ivaPaid = filteredExpenses.reduce((sum, exp) => sum + exp.ivaAmount, 0);
    const ivaBalance = ivaCollected - ivaPaid;

    const irpfBase = filteredInvoices.reduce((sum, inv) => sum + inv.baseAmount, 0);
    const irpfDeductibleExpenses = filteredExpenses
        .filter(exp => exp.irpfDeductible)
        .reduce((sum, exp) => sum + exp.baseAmount, 0);
    const totalIrpfRetentions = filteredExpenses.reduce((sum, exp) => sum + (exp.irpfAmount || 0), 0);

    const baseImponibleEstimada = irpfBase - irpfDeductibleExpenses;
    const estimatedTaxes = baseImponibleEstimada * 0.25; // Estimación ~25% Impuesto / IRPF
    const profitAfterTaxes = baseImponibleEstimada - estimatedTaxes;

    // Metrics by Client and Supplier
    const incomeByClient: Record<string, number> = {};
    filteredInvoices.forEach(inv => {
        if (!incomeByClient[inv.clientId]) incomeByClient[inv.clientId] = 0;
        incomeByClient[inv.clientId] += inv.baseAmount;
    });

    const topClients = Object.entries(incomeByClient)
        .map(([clientId, amount]) => ({
            client: clients.find(c => c.id === clientId)?.name || 'Desconocido',
            amount
        }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5);

    const expensesBySupplier: Record<string, number> = {};
    filteredExpenses.forEach(exp => {
        const supplier = exp.supplier || 'Desconocido';
        if (!expensesBySupplier[supplier]) expensesBySupplier[supplier] = 0;
        expensesBySupplier[supplier] += exp.baseAmount;
    });

    const topSuppliers = Object.entries(expensesBySupplier)
        .map(([supplier, amount]) => ({ supplier, amount }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5);

    // Generate year options (current year and 5 years back)
    const yearOptions = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i);

    return (
        <div className="space-y-6 animate-fade-in">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">Análisis Financiero y Fiscal</h1>
                <p className="text-slate-500 text-sm mt-1">Resumen general, pendientes de cobro y obligaciones tributarias.</p>
            </div>

            {/* Period Selector */}
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

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <Card className="border-l-4 border-l-green-500">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-slate-500">Ingresado (Cobrado)</p>
                                <p className="text-xl font-bold text-slate-900 mt-1">
                                    {totalIncome.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                                </p>
                                <p className="text-xs text-slate-500 mt-1">{paidInvoices.length} facturas pagadas</p>
                            </div>
                            <div className="p-2 bg-green-100 rounded-full">
                                <TrendingUp className="w-5 h-5 text-green-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-yellow-500">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-slate-500">Pendiente de Cobro</p>
                                <p className="text-xl font-bold text-slate-900 mt-1">
                                    {pendingIncome.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                                </p>
                                <p className="text-xs text-slate-500 mt-1">{pendingInvoices.length} facturas pendientes</p>
                            </div>
                            <div className="p-2 bg-yellow-100 rounded-full">
                                <AlertCircle className="w-5 h-5 text-yellow-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-red-500">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-slate-500">Gastos (Total)</p>
                                <p className="text-xl font-bold text-slate-900 mt-1">
                                    {totalExpenses.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                                </p>
                                <p className="text-xs text-slate-500 mt-1">{filteredExpenses.length} gastos</p>
                            </div>
                            <div className="p-2 bg-red-100 rounded-full">
                                <TrendingDown className="w-5 h-5 text-red-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className={`border-l-4 ${netProfit >= 0 ? 'border-l-blue-500' : 'border-l-orange-500'}`}>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-slate-500">Saldo Caja (Ingresos - Gastos)</p>
                                <p className={`text-xl font-bold mt-1 ${netProfit >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                                    {netProfit.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                                </p>
                                <p className="text-xs text-slate-500 mt-1">
                                    Flujo de caja bruto
                                </p>
                            </div>
                            <div className={`p-2 rounded-full ${netProfit >= 0 ? 'bg-blue-100' : 'bg-orange-100'}`}>
                                <DollarSign className={`w-5 h-5 ${netProfit >= 0 ? 'text-blue-600' : 'text-orange-600'}`} />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-purple-500 bg-purple-50">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-slate-500">Beneficio Tras Impuestos</p>
                                <p className="text-xl font-bold text-purple-700 mt-1">
                                    {profitAfterTaxes.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                                </p>
                                <p className="text-xs text-slate-500 mt-1">
                                    Estimación aprox. (-25%)
                                </p>
                            </div>
                            <div className="p-2 bg-purple-200 rounded-full">
                                <DollarSign className="w-5 h-5 text-purple-700" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Income/Expense by Client/Supplier */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Users className="w-5 h-5 text-primary-600" /> Top Ingresos por Cliente
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {topClients.length > 0 ? (
                            <div className="space-y-4 mt-2">
                                {topClients.map((c, i) => (
                                    <div key={i} className="flex justify-between items-center text-sm border-b border-slate-100 pb-2 last:border-0 last:pb-0">
                                        <span className="font-medium text-slate-700 truncate pr-4">{c.client}</span>
                                        <span className="font-bold text-slate-900 bg-slate-50 px-2 py-1 rounded">
                                            {c.amount.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-slate-500 my-4">No hay facturas emitidas en este período.</p>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <ShoppingBag className="w-5 h-5 text-pink-600" /> Top Gastos por Proveedor
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {topSuppliers.length > 0 ? (
                            <div className="space-y-4 mt-2">
                                {topSuppliers.map((s, i) => (
                                    <div key={i} className="flex justify-between items-center text-sm border-b border-slate-100 pb-2 last:border-0 last:pb-0">
                                        <span className="font-medium text-slate-700 truncate pr-4">{s.supplier}</span>
                                        <span className="font-bold text-slate-900 bg-slate-50 px-2 py-1 rounded">
                                            {s.amount.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-slate-500 my-4">No hay gastos registrados en este período.</p>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* IRPF Analysis */}
            <Card>
                <CardHeader>
                    <CardTitle>Base Imponible IRPF e Impuestos</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                            <p className="text-sm font-medium text-slate-700 mb-2">Ingresos (Base Facturada)</p>
                            <p className="text-xl font-bold text-slate-900">
                                {irpfBase.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                            </p>
                        </div>

                        <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                            <p className="text-sm font-medium text-slate-700 mb-2">Gastos Deducibles</p>
                            <p className="text-xl font-bold text-slate-900">
                                {irpfDeductibleExpenses.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                            </p>
                        </div>

                        <div className="p-4 bg-primary-50 rounded-lg border border-primary-200">
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-sm font-medium text-primary-900">Base Imponible Beneficio</p>
                            </div>
                            <p className="text-xl font-bold text-primary-700">
                                {baseImponibleEstimada.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                            </p>
                            <p className="text-xs text-primary-600 mt-1">Ingresos - Gastos Deducibles</p>
                        </div>

                        <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                            <p className="text-sm font-medium text-red-900 mb-2">Retenciones IRPF Soportadas</p>
                            <p className="text-xl font-bold text-red-700">
                                {totalIrpfRetentions.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                            </p>
                            <p className="text-xs text-red-600 mt-1">IRPF de proveedores retenido</p>
                        </div>
                    </div>

                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <p className="text-xs text-amber-800">
                            <strong>Nota:</strong> Esta es una estimación simplificada del rendimiento asumiendo un 25% de impuesto sobre beneficios. Consulta con tu asesor fiscal para cálculos concretos del IS o IRPF.
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* IVA Analysis */}
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
                            <p className="text-xl font-bold text-green-700">
                                {ivaCollected.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                            </p>
                            <p className="text-xs text-green-600 mt-1">De tus facturas emitidas</p>
                        </div>

                        <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                            <div className="flex items-center gap-2 mb-2">
                                <Receipt className="w-4 h-4 text-red-600" />
                                <p className="text-sm font-medium text-red-900">IVA Soportado</p>
                            </div>
                            <p className="text-xl font-bold text-red-700">
                                {ivaPaid.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                            </p>
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
                                {Math.abs(ivaBalance).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                            </p>
                            <p className={`text-xs mt-1 ${ivaBalance >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                                Diferencia líquida del trimestre/año
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

