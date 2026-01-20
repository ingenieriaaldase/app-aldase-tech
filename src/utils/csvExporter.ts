export const exportToCSV = (data: any[], filename: string) => {
    if (!data || data.length === 0) {
        alert("No hay datos para exportar.");
        return;
    }

    // Flatten object if needed or just take top level keys
    // For this simple app, top level keys or specific mapping is fine.
    // We'll use all keys from the first object.
    const headers = Object.keys(data[0]);

    // Create CSV content with BOM for Excel compatibility
    const csvContent = [
        headers.join(','),
        ...data.map(row => headers.map(fieldName => {
            let value = row[fieldName];

            // Handle null/undefined
            if (value === null || value === undefined) value = '';

            // Handle strings with commas or quotes
            if (typeof value === 'string') {
                value = `"${value.replace(/"/g, '""')}"`;
            }

            // Handle objects/arrays basic stringify
            if (typeof value === 'object') {
                value = `"${JSON.stringify(value).replace(/"/g, '""')}"`;
            }

            return value;
        }).join(','))
    ].join('\n');

    const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `${filename}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};
