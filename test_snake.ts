
const toSnake = (s: string) => s.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);

const mapKeysToSnake = (obj: any): any => {
    if (obj === undefined || obj === null) return obj;
    if (Array.isArray(obj)) return obj.map(v => mapKeysToSnake(v));
    if (obj.constructor === Object) {
        return Object.keys(obj).reduce((result, key) => ({
            ...result,
            [toSnake(key)]: mapKeysToSnake(obj[key]),
        }), {});
    }
    return obj;
};

const testObj = {
    stats24h: { views: 10 },
    stats1w: { views: 100 },
    camelCase: 1
};

console.log(JSON.stringify(mapKeysToSnake(testObj), null, 2));
