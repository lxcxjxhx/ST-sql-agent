const { query } = require('../sqlite/engine');

async function recordChange(variableName, oldValue, newValue, characterId = 'default') {
    try {
        query(
            'INSERT INTO variable_history (variable_name, old_value, new_value, character_id) VALUES (?, ?, ?, ?)',
            [
                variableName,
                oldValue !== undefined ? JSON.stringify(oldValue) : null,
                newValue !== undefined ? JSON.stringify(newValue) : null,
                characterId
            ]
        );
        return { success: true };
    } catch (e) {
        console.error('Record change error:', e);
        return { success: false, error: e.message };
    }
}

function getHistory(variableName, characterId = 'default', limit = 50, offset = 0) {
    try {
        const rows = query(
            'SELECT * FROM variable_history WHERE variable_name = ? AND character_id = ? ORDER BY timestamp DESC LIMIT ? OFFSET ?',
            [variableName, characterId, limit, offset]
        );

        return rows.map(row => ({
            ...row,
            old_value: row.old_value ? JSON.parse(row.old_value) : undefined,
            new_value: row.new_value ? JSON.parse(row.new_value) : undefined
        }));
    } catch (e) {
        console.error('Get history error:', e);
        return [];
    }
}

function getAllHistory(characterId = 'default', limit = 100, offset = 0) {
    try {
        return query(
            'SELECT * FROM variable_history WHERE character_id = ? ORDER BY timestamp DESC LIMIT ? OFFSET ?',
            [characterId, limit, offset]
        );
    } catch (e) {
        console.error('Get all history error:', e);
        return [];
    }
}

function clearHistory(variableName = null, characterId = 'default') {
    try {
        if (variableName) {
            query('DELETE FROM variable_history WHERE variable_name = ? AND character_id = ?', [variableName, characterId]);
        } else {
            query('DELETE FROM variable_history WHERE character_id = ?', [characterId]);
        }
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

module.exports = {
    recordChange,
    getHistory,
    getAllHistory,
    clearHistory
};