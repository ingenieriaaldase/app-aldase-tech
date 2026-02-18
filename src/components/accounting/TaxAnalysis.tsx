import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Invoice, Expense } from '../../types';
import { storage } from '../../services/storage';
import { TrendingUp, TrendingDown, DollarSign, FileText, Receipt, Calendar } from 'lucide-react';

export default function TaxAnalysis() {
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedQuarter, setSelectedQuarter] = useState<number | 'all'>('all');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const [inv, exp] = await Promise.all([
            storage.getInvoices(),
            storage.getExpenses()
        ]);
        setInvoices(inv.filter(i => i.status === 'PAGADA'));
        setExpenses(exp);
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

    // Calculate metrics
    const totalIncome = filteredInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
    const totalExpenses = filteredExpenses.reduce((sum, exp) => sum + exp.totalAmount, 0);
    const netProfit = totalIncome - totalExpenses;

    const ivaCollected = filteredInvoices.reduce((sum, inv) => sum + inv.ivaAmount, 0);
    const ivaPaid = filteredExpenses.reduce((sum, exp) => sum + exp.ivaAmount, 0);
    const ivaBalance = ivaCollected - ivaPaid;

    const irpfBase = filteredInvoices.reduce((sum, inv) => sum + inv.baseAmount, 0);
    const irpfDeductibleExpenses = filteredExpenses
        .filter(exp => exp.irpfDeductible)
        .reduce((sum, exp) => sum + exp.baseAmount, 0);
    const totalIrpfRetentions = filteredExpenses.reduce((sum, exp) => sum + (exp.irpfAmount || 0), 0);

    // Generate year options (current year and 5 years back)
    const yearOptions = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i);

    return (
        <div className="space-y-6 animate-fade-in">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">Análisis Fiscal</h1>
                <p className="text-slate-500 text-sm mt-1">Resumen de IVA, IRPF y resultados por período</p>
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-l-4 border-l-green-500">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-slate-500">Ingresos</p>
                                <p className="text-2xl font-bold text-slate-900 mt-1">
                                    {totalIncome.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                                </p>
                                <p className="text-xs text-slate-500 mt-1">{filteredInvoices.length} facturas</p>
                            </div>
                            <div className="p-3 bg-green-100 rounded-full">
                                <TrendingUp className="w-6 h-6 text-green-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-red-500">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-slate-500">Gastos</p>
                                <p className="text-2xl font-bold text-slate-900 mt-1">
                                    {totalExpenses.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                                </p>
                                <p className="text-xs text-slate-500 mt-1">{filteredExpenses.length} gastos</p>
                            </div>
                            <div className="p-3 bg-red-100 rounded-full">
                                <TrendingDown className="w-6 h-6 text-red-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className={`border-l-4 ${netProfit >= 0 ? 'border-l-blue-500' : 'border-l-orange-500'}`}>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-slate-500">Beneficio Neto</p>
                                <p className={`text-2xl font-bold mt-1 ${netProfit >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                                    {netProfit.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                                </p>
                                <p className="text-xs text-slate-500 mt-1">
                                    {netProfit >= 0 ? 'Positivo' : 'Negativo'}
                                </p>
                            </div>
                            <div className={`p-3 rounded-full ${netProfit >= 0 ? 'bg-blue-100' : 'bg-orange-100'}`}>
                                <DollarSign className={`w-6 h-6 ${netProfit >= 0 ? 'text-blue-600' : 'text-orange-600'}`} />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

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
                            <p className="text-xs text-green-600 mt-1">De facturas emitidas</p>
                        </div>

                        <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                            <div className="flex items-center gap-2 mb-2">
                                <Receipt className="w-4 h-4 text-red-600" />
                                <p className="text-sm font-medium text-red-900">IVA Soportado</p>
                            </div>
                            <p className="text-xl font-bold text-red-700">
                                {ivaPaid.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                            </p>
                            <p className="text-xs text-red-600 mt-1">De gastos registrados</p>
                        </div>

                        <div className={`p-4 rounded-lg border ${ivaBalance >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-orange-50 border-orange-200'}`}>
                            <div className="flex items-center gap-2 mb-2">
                                <DollarSign className={`w-4 h-4 ${ivaBalance >= 0 ? 'text-blue-600' : 'text-orange-600'}`} />
                                <p className={`text-sm font-medium ${ivaBalance >= 0 ? 'text-blue-900' : 'text-orange-900'}`}>
                                    {ivaBalance >= 0 ? 'A Pagar' : 'A Compensar'}
                                </p>
                            </div>
                            <p className={`text-xl font-bold ${ivaBalance >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>
                                {Math.abs(ivaBalance).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                            </p>
                            <p className={`text-xs mt-1 ${ivaBalance >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                                Diferencia neta
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* IRPF Analysis */}
            <Card>
                <CardHeader>
                    <CardTitle>Base Imponible IRPF</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                            <p className="text-sm font-medium text-slate-700 mb-2">Ingresos (Base)</p>
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

                        <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                            <p className="text-sm font-medium text-red-900 mb-2">Retenciones IRPF Practicadas</p>
                            <p className="text-xl font-bold text-red-700">
                                {totalIrpfRetentions.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                            </p>
                            <p className="text-xs text-red-600 mt-1">De facturas de autónomos</p>
                        </div>

                        <div className="p-4 bg-primary-50 rounded-lg border border-primary-200">
                            <p className="text-sm font-medium text-primary-900 mb-2">Base Imponible Estimada</p>
                            <p className="text-xl font-bold text-primary-700">
                                {(irpfBase - irpfDeductibleExpenses).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                            </p>
                        </div>
                    </div>

                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <p className="text-xs text-amber-800">
                            <strong>Nota:</strong> Esta es una estimación simplificada. Consulta con tu asesor fiscal para cálculos precisos.
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
