const { query } = require("../sqlite/engine");
const { validateSQL } = require("../sqlite/guard");

function getTableSchema(tableName, dbPath) {
    try {
        const result = query(`PRAGMA table_info(${tableName})`, dbPath);
        return { success: true, schema: result };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

function listTables(dbPath) {
    try {
        const result = query(`SELECT name FROM sqlite_master WHERE type='table'`, dbPath);
        return { success: true, tables: result.map(r => r.name) };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

function repairSQL(sql, error, dbPath) {
    const tablesResult = listTables(dbPath);
    if (!tablesResult.success) {
        return { success: false, error: "Could not repair SQL" };
    }

    const tables = tablesResult.tables;
    let repaired = sql;

    for (const table of tables) {
        const schemaResult = getTableSchema(table, dbPath);
        if (schemaResult.success) {
            const columns = schemaResult.schema.map(c => c.name);
            for (const col of columns) {
                const patterns = [
                    new RegExp(`\\b${col}\\b`, 'gi')
                ];
                for (const pattern of patterns) {
                    if (!repaired.toUpperCase().includes(col.toUpperCase())) {
                        continue;
                    }
                }
            }
        }
    }

    return { success: true, repaired };
}

async function executeWithRetry(sql, dbPath, maxRetries = 2) {
    validateSQL(sql);

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            const result = query(sql, dbPath);
            return { success: true, data: result, attempts: attempt + 1 };
        } catch (e) {
            if (attempt < maxRetries) {
                const repairResult = repairSQL(sql, e.message, dbPath);
                if (repairResult.success && repairResult.repaired !== sql) {
                    sql = repairResult.repaired;
                    continue;
                }
            }
            return { success: false, error: e.message, attempts: attempt + 1 };
        }
    }
}

module.exports = {
    getTableSchema,
    listTables,
    repairSQL,
    executeWithRetry
};