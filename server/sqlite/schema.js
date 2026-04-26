function inferType(value) {
    if (value === null || value === undefined) {
        return "TEXT";
    }
    if (typeof value === "number") {
        if (Number.isInteger(value)) {
            return "INTEGER";
        }
        return "REAL";
    }
    return "TEXT";
}

function generateCreateTableSQL(tableName, data) {
    if (!data || typeof data !== "object") {
        throw new Error("Data must be a non-null object");
    }

    const columns = [];
    for (const [key, value] of Object.entries(data)) {
        const safeKey = key.replace(/[^a-zA-Z0-9_]/g, "_");
        columns.push(`${safeKey} ${inferType(value)}`);
    }

    return `CREATE TABLE IF NOT EXISTS ${tableName} (${columns.join(", ")})`;
}

function generateInsertSQL(tableName, data) {
    if (!data || typeof data !== "object") {
        throw new Error("Data must be a non-null object");
    }

    const keys = [];
    const placeholders = [];
    const values = [];

    for (const [key, value] of Object.entries(data)) {
        const safeKey = key.replace(/[^a-zA-Z0-9_]/g, "_");
        keys.push(safeKey);
        placeholders.push("?");
        values.push(value);
    }

    return {
        sql: `INSERT INTO ${tableName} (${keys.join(", ")}) VALUES (${placeholders.join(", ")})`,
        values
    };
}

module.exports = {
    inferType,
    generateCreateTableSQL,
    generateInsertSQL
};