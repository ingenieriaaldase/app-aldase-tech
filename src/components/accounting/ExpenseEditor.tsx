import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Expense, ExpenseCategory } from '../../types';
import { storage } from '../../services/storage';
import { X } from 'lucide-react';

interface ExpenseEditorProps {
    initialData: Expense | null;
    onSave: (expense: Expense) => void;
    onCancel: () => void;
}

export default function ExpenseEditor({ initialData, onSave, onCancel }: ExpenseEditorProps) {
    const [formData, setFormData] = useState({
        number: '',
        supplier: '',
        date: new Date().toISOString().split('T')[0],
        description: '',
        category: '',
        baseAmount: 0,
        ivaRate: 21,
        suppliesAmount: 0,
        irpfDeductible: false
    });
    const [categories, setCategories] = useState<ExpenseCategory[]>([]);

    useEffect(() => {
        loadCategories();
    }, []);

    const loadCategories = async () => {
        const cats = await storage.getExpenseCategories();
        setCategories(cats);
    };

    useEffect(() => {
        if (initialData) {
            setFormData({
                number: initialData.number,
                supplier: initialData.supplier,
                date: initialData.date.split('T')[0],
                description: initialData.description || '',
                category: initialData.category || '',
                baseAmount: initialData.baseAmount,
                ivaRate: initialData.ivaRate,
                suppliesAmount: initialData.suppliesAmount || 0,
                irpfDeductible: initialData.irpfDeductible || false
            });
        }
    }, [initialData]);

    const calculateTotals = () => {
        const base = formData.baseAmount || 0;
        const ivaAmount = base * (formData.ivaRate / 100);
        const supplies = formData.suppliesAmount || 0;
        const total = base + ivaAmount + supplies;
        return { ivaAmount, total };
    };

    const { ivaAmount, total } = calculateTotals();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const expense: Expense = {
            id: initialData?.id || crypto.randomUUID(),
            number: formData.number,
            supplier: formData.supplier,
            date: new Date(formData.date).toISOString(),
            description: formData.description,
            category: formData.category,
            baseAmount: formData.baseAmount,
            ivaRate: formData.ivaRate,
            ivaAmount,
            suppliesAmount: formData.suppliesAmount,
            totalAmount: total,
            irpfDeductible: formData.irpfDeductible
        };

        onSave(expense);
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                        {initialData ? 'Editar Gasto' : 'Nuevo Gasto'}
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">Registra una factura de proveedor</p>
                </div>
                <Button variant="ghost" onClick={onCancel}>
                    <X className="w-4 h-4 mr-2" />
                    Cancelar
                </Button>
            </div>

            <form onSubmit={handleSubmit}>
                <Card>
                    <CardHeader>
                        <CardTitle>Datos del Gasto</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input
                                label="Nº Factura Proveedor"
                                value={formData.number}
                                onChange={e => setFormData({ ...formData, number: e.target.value })}
                                required
                            />
                            <Input
                                label="Proveedor"
                                value={formData.supplier}
                                onChange={e => setFormData({ ...formData, supplier: e.target.value })}
                                required
                            />
                            <Input
                                label="Fecha"
                                type="date"
                                value={formData.date}
                                onChange={e => setFormData({ ...formData, date: e.target.value })}
                                required
                            />
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-slate-700">Categoría</label>
                                <select
                                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                    value={formData.category}
                                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                                >
                                    <option value="">Seleccionar categoría...</option>
                                    {categories.map(cat => (
                                        <option key={cat.id} value={cat.name}>{cat.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="text-sm font-medium text-slate-700">Descripción</label>
                            <textarea
                                className="w-full mt-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                rows={3}
                                placeholder="Descripción del gasto..."
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <Input
                                label="Base Imponible (€)"
                                type="number"
                                step="0.01"
                                value={formData.baseAmount}
                                onChange={e => setFormData({ ...formData, baseAmount: parseFloat(e.target.value) || 0 })}
                                required
                            />
                            <Input
                                label="IVA (%)"
                                type="number"
                                step="0.01"
                                value={formData.ivaRate}
                                onChange={e => setFormData({ ...formData, ivaRate: parseFloat(e.target.value) || 0 })}
                                required
                            />
                            <div>
                                <label className="text-sm font-medium text-slate-700">IVA (€)</label>
                                <div className="mt-1 px-3 py-2 bg-slate-50 rounded-md border border-slate-200 text-sm font-medium">
                                    {ivaAmount.toFixed(2)} €
                                </div>
                            </div>
                            <Input
                                label="Suplidos (€)"
                                type="number"
                                step="0.01"
                                value={formData.suppliesAmount}
                                onChange={e => setFormData({ ...formData, suppliesAmount: parseFloat(e.target.value) || 0 })}
                                placeholder="0.00"
                            />
                        </div>

                        <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-md">
                            <input
                                type="checkbox"
                                id="irpfDeductible"
                                checked={formData.irpfDeductible}
                                onChange={e => setFormData({ ...formData, irpfDeductible: e.target.checked })}
                                className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                            />
                            <label htmlFor="irpfDeductible" className="text-sm font-medium text-slate-700 cursor-pointer">
                                Deducible en IRPF
                            </label>
                        </div>

                        <div className="border-t pt-4">
                            <div className="flex justify-between items-center text-lg font-bold">
                                <span>Total:</span>
                                <span className="text-primary-600">{total.toFixed(2)} €</span>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-4">
                            <Button type="button" variant="outline" onClick={onCancel}>
                                Cancelar
                            </Button>
                            <Button type="submit">
                                Guardar Gasto
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </form>
        </div>
    );
}
