const { query, getDb } = require("../sqlite/engine");

function createMemoryTable(dbPath) {
    query(`CREATE VIRTUAL TABLE IF NOT EXISTS memory USING fts5(content, tag)`, dbPath);
}

function insertMemory(content, dbPath, tag = "") {
    try {
        const safeContent = content.replace(/"/g, '""');
        const safeTag = tag.replace(/"/g, '""');
        query(`INSERT INTO memory (content, tag) VALUES ("${safeContent}", "${safeTag}")`, dbPath);
        return { success: true, message: "Memory stored" };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

function searchMemory(searchQuery, dbPath) {
    try {
        const safeQuery = searchQuery.replace(/"/g, '""');
        const results = query(`SELECT * FROM memory WHERE content MATCH "${safeQuery}"`, dbPath);
        return { success: true, data: results };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

function deleteMemory(id, dbPath) {
    try {
        query(`DELETE FROM memory WHERE rowid = ${id}`, dbPath);
        return { success: true, message: "Memory deleted" };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

function getAllMemory(dbPath) {
    try {
        const results = query(`SELECT rowid, content, tag FROM memory`, dbPath);
        return { success: true, data: results };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

module.exports = {
    createMemoryTable,
    insertMemory,
    searchMemory,
    deleteMemory,
    getAllMemory
};