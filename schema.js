const MVU_SCHEMA = (function() {
    const registeredSchemas = new Map();
    const schemaDefaults = new Map();

    function parseZodSchema(schema, prefix = '') {
        const defaults = {};
        const paths = {};

        if (!schema || typeof schema !== 'object') {
            return { defaults, paths };
        }

        if (schema._def && schema._def.typeName === 'ZodObject') {
            const shape = schema._def.shape();
            for (const [key, value] of Object.entries(shape)) {
                const newPrefix = prefix ? `${prefix}.${key}` : key;
                const result = parseZodSchema(value, newPrefix);
                Object.assign(defaults, result.defaults);
                Object.assign(paths, result.paths);
            }
        } else if (schema._def && schema._def.typeName === 'ZodRecord') {
            const newPrefix = prefix ? `${prefix}.*` : '*';
            paths[newPrefix] = { type: 'record', key: 'string' };
        } else if (schema._def && schema._def.typeName === 'ZodArray') {
            const newPrefix = prefix ? `${prefix}[]` : '[]';
            paths[newPrefix] = { type: 'array' };
        } else if (schema._def && schema._def.typeName === 'ZodOptional') {
            const inner = schema._def.innerType;
            const result = parseZodSchema(inner, prefix);
            Object.assign(defaults, result.defaults);
            Object.assign(paths, result.paths);
        } else if (schema._def && schema._def.typeName === 'ZodDefault') {
            const inner = schema._def.innerType;
            const defaultValue = schema._def.defaultValue;
            if (typeof defaultValue === 'function') {
                defaults[prefix] = defaultValue();
            } else {
                defaults[prefix] = defaultValue;
            }
            const result = parseZodSchema(inner, prefix);
            Object.assign(paths, result.paths);
        } else if (schema._def && schema._def.typeName === 'ZodEnum') {
            paths[prefix] = { type: 'enum', values: schema._def.values };
            defaults[prefix] = schema._def.values[0];
        } else if (schema._def && schema._def.typeName === 'ZodString') {
            paths[prefix] = { type: 'string' };
            defaults[prefix] = '';
        } else if (schema._def && schema._def.typeName === 'ZodNumber') {
            paths[prefix] = { type: 'number' };
            defaults[prefix] = 0;
        } else if (schema._def && schema._def.typeName === 'ZodBoolean') {
            paths[prefix] = { type: 'boolean' };
            defaults[prefix] = false;
        }

        return { defaults, paths };
    }

    function registerMvuSchema(schemaName, schema, options = {}) {
        const { autoInit = true, prefix = '' } = options;

        if (!schema || typeof schema !== 'object') {
            console.error('MVU-Schema: Invalid schema provided');
            return { success: false, error: 'Invalid schema' };
        }

        try {
            const { defaults, paths } = parseZodSchema(schema, prefix);
            registeredSchemas.set(schemaName, { schema, paths });
            schemaDefaults.set(schemaName, defaults);

            if (autoInit && typeof window.MVU_STATE !== 'undefined') {
                initializeSchemaDefaults(schemaName, defaults);
            }

            console.log(`MVU-Schema: Registered "${schemaName}" with ${Object.keys(defaults).length} default values`);

            return {
                success: true,
                schemaName,
                defaultsCount: Object.keys(defaults).length,
                pathsCount: Object.keys(paths).length
            };
        } catch (e) {
            console.error('MVU-Schema: Failed to register schema:', e);
            return { success: false, error: e.message };
        }
    }

    function initializeSchemaDefaults(schemaName, defaults) {
        if (!defaults) return;

        for (const [key, value] of Object.entries(defaults)) {
            if (value !== undefined && value !== null) {
                const currentValue = window.MVU_STATE.get(key);
                if (currentValue === undefined) {
                    window.MVU_STATE.set(key, value);
                }
            }
        }
    }

    function getSchema(schemaName) {
        return registeredSchemas.get(schemaName);
    }

    function getSchemaDefaults(schemaName) {
        return schemaDefaults.get(schemaName) || {};
    }

    function getAllSchemas() {
        return Array.from(registeredSchemas.keys());
    }

    function validateValue(schemaName, path, value) {
        const schemaInfo = registeredSchemas.get(schemaName);
        if (!schemaInfo) {
            return { valid: false, error: 'Schema not found' };
        }

        const { paths } = schemaInfo;
        const pathInfo = paths[path];

        if (!pathInfo) {
            return { valid: true, warning: 'Path not in schema' };
        }

        if (pathInfo.type === 'enum') {
            if (!pathInfo.values.includes(value)) {
                return {
                    valid: false,
                    error: `Value must be one of: ${pathInfo.values.join(', ')}`
                };
            }
        } else if (pathInfo.type === 'number') {
            if (typeof value !== 'number' || isNaN(value)) {
                return { valid: false, error: 'Value must be a number' };
            }
        } else if (pathInfo.type === 'boolean') {
            if (typeof value !== 'boolean') {
                return { valid: false, error: 'Value must be boolean' };
            }
        }

        return { valid: true };
    }

    function getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => {
            return current && current[key] !== undefined ? current[key] : undefined;
        }, obj);
    }

    function setNestedValue(obj, path, value) {
        const keys = path.split('.');
        const lastKey = keys.pop();
        const target = keys.reduce((current, key) => {
            if (!current[key]) current[key] = {};
            return current[key];
        }, obj);
        target[lastKey] = value;
    }

    window.registerMvuSchema = registerMvuSchema;
    window.MVU_SCHEMA = {
        register: registerMvuSchema,
        get: getSchema,
        getDefaults: getSchemaDefaults,
        getAll: getAllSchemas,
        validate: validateValue,
        getNestedValue,
        setNestedValue
    };

    return window.MVU_SCHEMA;
})();

$(function() {
    console.log('MVU-Schema module loaded');
});
