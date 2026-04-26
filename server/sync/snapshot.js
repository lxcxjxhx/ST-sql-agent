const { stateStore } = require('../mvu/state');
const { query } = require('../sqlite/engine');

async function createSnapshot(name, description = '', characterId = 'default') {
    try {
        const allState = stateStore.getAll();
        const data = JSON.stringify(allState);

        query(
            'INSERT INTO snapshots (name, description, character_id, data) VALUES (?, ?, ?, ?)',
            [name, description, characterId, data]
        );

        return { success: true, name, variables: Object.keys(allState).length };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

function listSnapshots(characterId = 'default') {
    try {
        return query(
            'SELECT id, name, description, created_at FROM snapshots WHERE character_id = ? ORDER BY created_at DESC',
            [characterId]
        );
    } catch (e) {
        console.error('List snapshots error:', e);
        return [];
    }
}

async function rollbackSnapshot(snapshotId, characterId = 'default') {
    try {
        const rows = query('SELECT data FROM snapshots WHERE id = ? AND character_id = ?', [snapshotId, characterId]);

        if (rows.length === 0) {
            return { success: false, error: 'Snapshot not found' };
        }

        const data = JSON.parse(rows[0].data);

        stateStore.clear();

        for (const [key, value] of Object.entries(data)) {
            stateStore.set(key, value);
        }

        return { success: true, restored: Object.keys(data).length };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

function deleteSnapshot(snapshotId, characterId = 'default') {
    try {
        query('DELETE FROM snapshots WHERE id = ? AND character_id = ?', [snapshotId, characterId]);
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

module.exports = {
    createSnapshot,
    listSnapshots,
    rollbackSnapshot,
    deleteSnapshot
};