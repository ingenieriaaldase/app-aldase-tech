export const parseCSV = async (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target?.result as string;
            if (!text) {
                resolve([]);
                return;
            }
            const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
            if (lines.length < 2) {
                resolve([]);
                return;
            }

            const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
            const results = [];

            for (let i = 1; i < lines.length; i++) {
                const currentLine = lines[i];
                const row: any = {};
                const rowValues = parseCSVLine(currentLine);

                headers.forEach((header, index) => {
                    let val = rowValues[index];
                    if (val) {
                        val = val.trim().replace(/^"|"$/g, '').replace(/""/g, '"');
                    }
                    row[header] = val;
                });
                results.push(row);
            }
            resolve(results);
        };
        reader.onerror = (error) => reject(error);
        reader.readAsText(file);
    });
};

const parseCSVLine = (text: string): string[] => {
    const result = [];
    let startValue = 0;
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(text.substring(startValue, i));
            startValue = i + 1;
        }
    }
    result.push(text.substring(startValue));
    return result;
};
