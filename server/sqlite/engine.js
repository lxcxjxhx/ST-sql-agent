let initSqlJs;
try {
    initSqlJs = require('sql.js');
} catch (e) {
    console.warn('sql.js not available, using mock:', e.message);
    initSqlJs = null;
}

let db = null;
let dbPromise = null;

async function initDatabase(dbPath) {
    if (db) return db;

    if (!initSqlJs) {
        console.warn('sql.js not loaded, using localStorage fallback');
        db = createLocalStorageDB();
        return db;
    }

    try {
        const SQL = await initSqlJs();
        const savedData = localStorage.getItem('mvu_sqlite_db');

        if (savedData) {
            const data = new Uint8Array(JSON.parse(savedData));
            db = new SQL.Database(data);
        } else {
            db = new SQL.Database();
        }

        db清香 = () => {
            const data = db.export();
            localStorage.setItem('mvu_sqlite_db', JSON.stringify(Array.from(data)));
        };

        return db;
    } catch (e) {
        console.error('Failed to init database:', e);
        db = createLocalStorageDB();
        return db;
    }
}

function createLocalStorageDB() {
    return {
        data: {},
        run(sql, params = []) {
            if (sql.trim().toUpperCase().startsWith('CREATE')) {
                return { changes: 0 };
            }
            const tableMatch = sql.match(/INSERT INTO (\w+)/i);
            if (tableMatch) {
                const table = tableMatch[1];
                if (!this.data[table]) this.data[table] = [];
                const newId = this.data[table].length + 1;
                const obj = { id: newId };
                const cols = sql.match(/\((\w+)\)/g);
                if (cols) {
                    params.forEach((p, i) => {
                        obj[`col_${i}`] = p;
                    });
                }
                this.data[table].push(obj);
            }
            return { changes: 1, lastInsertRowid: this.data[table]?.length || 1 };
        },
        exec(sql) {
            const results = [];
            for (const table of Object.keys(this.data)) {
                if (sql.includes('SELECT') && sql.includes(table)) {
                    results.push({
                        columns: Object.keys(this.data[table][0] || { id: 'id' }),
                        values: this.data[table].map(row => Object.values(row))
                    });
                }
            }
            return results;
        },
        prepare(sql) {
            const self = this;
            return {
                bind() { return this; },
                step() { return false; },
                getAsObject() { return {}; },
                free() { return true; }
            };
        },
        export() {
            return new Uint8Array([]);
        },
        close() {}
    };
}

function query(sql, params = []) {
    if (!db) {
        throw new Error('Database not initialized');
    }

    try {
        if (sql.trim().toUpperCase().startsWith('SELECT')) {
            const results = [];
            const stmt = db.prepare(sql);
            stmt.bind(params);
            while (stmt.step()) {
                results.push(stmt.getAsObject());
            }
            stmt.free();
            return results;
        } else {
            db.run(sql, params);
            return { changes: db.getRowsModified(), lastInsertRowid: 1 };
        }
    } catch (e) {
        console.error('Query error:', e.message);
        throw e;
    }
}

function getDb() {
    return db;
}

function closeDatabase() {
    if (db && db.close) {
        db.close();
        db = null;
    }
}

module.exports = {
    initDatabase,
    query,
    getDb,
    closeDatabase
};