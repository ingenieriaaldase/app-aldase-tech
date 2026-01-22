
import React from 'react';

export const PROVINCES = [
    'Álava', 'Albacete', 'Alicante', 'Almería', 'Asturias', 'Ávila', 'Badajoz', 'Barcelona', 'Burgos', 'Cáceres',
    'Cádiz', 'Cantabria', 'Castellón', 'Ciudad Real', 'Córdoba', 'La Coruña', 'Cuenca', 'Gerona', 'Granada', 'Guadalajara',
    'Guipúzcoa', 'Huelva', 'Huesca', 'Islas Baleares', 'Jaén', 'León', 'Lérida', 'Lugo', 'Madrid', 'Málaga', 'Murcia', 'Navarra',
    'Orense', 'Palencia', 'Las Palmas', 'Pontevedra', 'La Rioja', 'Salamanca', 'Segovia', 'Sevilla', 'Soria', 'Tarragona',
    'Santa Cruz de Tenerife', 'Teruel', 'Toledo', 'Valencia', 'Valladolid', 'Vizcaya', 'Zamora', 'Zaragoza', 'Ceuta', 'Melilla'
].sort();

interface ProvinceSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    label?: string;
    error?: string;
}

export const ProvinceSelect = React.forwardRef<HTMLSelectElement, ProvinceSelectProps>(
    ({ className, label, error, ...props }, ref) => {
        return (
            <div className="w-full">
                {label && <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>}
                <select
                    ref={ref}
                    className={`
                        w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm 
                        focus:outline-none focus:ring-2 focus:ring-primary-500
                        disabled:bg-slate-100 disabled:text-slate-500
                        ${error ? 'border-red-500' : ''}
                        ${className || ''}
                    `}
                    {...props}
                >
                    <option value="">Seleccionar Provincia...</option>
                    {PROVINCES.map(province => (
                        <option key={province} value={province}>{province}</option>
                    ))}
                </select>
                {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
            </div>
        );
    }
);

ProvinceSelect.displayName = 'ProvinceSelect';
