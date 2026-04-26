const TABLES = {
    variable_state: `
        CREATE TABLE IF NOT EXISTS variable_state (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            variable_name TEXT UNIQUE NOT NULL,
            variable_value TEXT,
            character_id TEXT DEFAULT 'default',
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    `,
    variable_history: `
        CREATE TABLE IF NOT EXISTS variable_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            variable_name TEXT NOT NULL,
            old_value TEXT,
            new_value TEXT,
            character_id TEXT DEFAULT 'default',
            timestamp TEXT DEFAULT CURRENT_TIMESTAMP
        )
    `,
    snapshots: `
        CREATE TABLE IF NOT EXISTS snapshots (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            character_id TEXT DEFAULT 'default',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            data TEXT NOT NULL
        )
    `,
    fts_memory: `
        CREATE VIRTUAL TABLE IF NOT EXISTS fts_memory USING fts5(
            content,
            tag,
            context,
            character_id DEFAULT 'default'
        )
    `
};

function initSchema(database) {
    const results = [];
    for (const [name, sql] of Object.entries(TABLES)) {
        try {
            database.run(sql);
            results.push({ table: name, success: true });
        } catch (e) {
            results.push({ table: name, success: false, error: e.message });
        }
    }
    return results;
}

function getTableSQL(tableName) {
    return TABLES[tableName];
}

module.exports = {
    TABLES,
    initSchema,
    getTableSQL
};