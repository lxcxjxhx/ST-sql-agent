const Database = require("better-sqlite3");
const path = require("path");

let db = null;

function getDb(dbPath) {
    if (!db) {
        db = new Database(dbPath);
        db.pragma("journal_mode = WAL");
    }
    return db;
}

function query(sql, dbPath) {
    const database = getDb(dbPath);
    try {
        const stmt = database.prepare(sql);
        if (stmt.reader) {
            return stmt.all();
        } else {
            return { changes: stmt.changes, lastInsertRowid: stmt.lastInsertRowid };
        }
    } catch (e) {
        throw new Error(`SQL Error: ${e.message}`);
    }
}

function close() {
    if (db) {
        db.close();
        db = null;
    }
}

module.exports = {
    query,
    close,
    getDb
};