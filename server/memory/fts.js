const { query } = require('../sqlite/engine');

let ftsAvailable = false;

function checkFtsAvailability() {
    try {
        query('SELECT COUNT(*) FROM fts_memory', []);
        ftsAvailable = true;
    } catch (e) {
        ftsAvailable = false;
    }
    return ftsAvailable;
}

async function insertMemory(content, tag = '', context = '', characterId = 'default') {
    try {
        if (!ftsAvailable) checkFtsAvailability();

        if (ftsAvailable) {
            const safeContent = content.replace(/"/g, '""');
            const safeTag = tag.replace(/"/g, '""');
            const safeContext = context.replace(/"/g, '""');
            query(
                'INSERT INTO fts_memory (content, tag, context, character_id) VALUES (?, ?, ?, ?)',
                [safeContent, safeTag, safeContext, characterId]
            );
        } else {
            const id = Date.now();
            const stored = JSON.parse(localStorage.getItem('fts_memory') || '[]');
            stored.push({ id, content, tag, context, character_id: characterId, created_at: new Date().toISOString() });
            localStorage.setItem('fts_memory', JSON.stringify(stored));
        }

        return { success: true, content: content.substring(0, 50) };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

function searchMemory(searchQuery, characterId = 'default', limit = 20) {
    try {
        if (!ftsAvailable) checkFtsAvailability();

        if (ftsAvailable) {
            const safeQuery = searchQuery.replace(/"/g, '""');
            const results = query(
                'SELECT * FROM fts_memory WHERE content MATCH ? AND character_id = ? LIMIT ?',
                [safeQuery, characterId, limit]
            );
            return { success: true, data: results };
        } else {
            const stored = JSON.parse(localStorage.getItem('fts_memory') || '[]');
            const filtered = stored.filter(m =>
                m.character_id === characterId &&
                (m.content.includes(searchQuery) || m.tag.includes(searchQuery))
            ).slice(0, limit);
            return { success: true, data: filtered };
        }
    } catch (e) {
        return { success: false, error: e.message };
    }
}

function deleteMemory(rowId, characterId = 'default') {
    try {
        if (!ftsAvailable) checkFtsAvailability();

        if (ftsAvailable) {
            query('DELETE FROM fts_memory WHERE rowid = ? AND character_id = ?', [rowId, characterId]);
        } else {
            const stored = JSON.parse(localStorage.getItem('fts_memory') || '[]');
            const filtered = stored.filter(m => !(m.id === rowId && m.character_id === characterId));
            localStorage.setItem('fts_memory', JSON.stringify(filtered));
        }

        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

function getAllMemory(characterId = 'default', limit = 100) {
    try {
        if (!ftsAvailable) checkFtsAvailability();

        if (ftsAvailable) {
            const results = query(
                'SELECT rowid, content, tag, context, created_at FROM fts_memory WHERE character_id = ? LIMIT ?',
                [characterId, limit]
            );
            return { success: true, data: results };
        } else {
            const stored = JSON.parse(localStorage.getItem('fts_memory') || '[]');
            const filtered = stored.filter(m => m.character_id === characterId).slice(0, limit);
            return { success: true, data: filtered };
        }
    } catch (e) {
        return { success: false, error: e.message };
    }
}

function clearMemory(characterId = 'default') {
    try {
        if (!ftsAvailable) checkFtsAvailability();

        if (ftsAvailable) {
            query('DELETE FROM fts_memory WHERE character_id = ?', [characterId]);
        } else {
            const stored = JSON.parse(localStorage.getItem('fts_memory') || '[]');
            const filtered = stored.filter(m => m.character_id !== characterId);
            localStorage.setItem('fts_memory', JSON.stringify(filtered));
        }

        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

module.exports = {
    insertMemory,
    searchMemory,
    deleteMemory,
    getAllMemory,
    clearMemory,
    checkFtsAvailability
};