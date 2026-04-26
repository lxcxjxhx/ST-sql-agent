const { stateStore } = require('../mvu/state');
const { query } = require('../sqlite/engine');
const { initSchema } = require('../sqlite/schema');
const { recordChange } = require('./history_tracker');

let dbPath = './server/db/memory.db';
let syncEnabled = true;
let syncDebounce = null;
const SYNC_DELAY = 100;

function setDbPath(path) {
    dbPath = path;
}

async function hotToColdSync(key, value, characterId = 'default') {
    if (!syncEnabled) return;

    try {
        const existing = query(
            'SELECT id, variable_value FROM variable_state WHERE variable_name = ? AND character_id = ?',
            [key, characterId]
        );

        if (existing.length > 0) {
            query(
                'UPDATE variable_state SET variable_value = ?, updated_at = CURRENT_TIMESTAMP WHERE variable_name = ? AND character_id = ?',
                [JSON.stringify(value), key, characterId]
            );
        } else {
            query(
                'INSERT INTO variable_state (variable_name, variable_value, character_id) VALUES (?, ?, ?)',
                [key, JSON.stringify(value), characterId]
            );
        }

        await recordChange(key, null, value, characterId);
    } catch (e) {
        console.error('Hot to Cold sync error:', e);
    }
}

async function coldToHotSync(characterId = 'default') {
    try {
        const rows = query(
            'SELECT variable_name, variable_value FROM variable_state WHERE character_id = ?',
            [characterId]
        );

        for (const row of rows) {
            try {
                const value = JSON.parse(row.variable_value);
                stateStore.set(row.variable_name, value);
            } catch {
                stateStore.set(row.variable_name, row.variable_value);
            }
        }

        return { loaded: rows.length };
    } catch (e) {
        console.error('Cold to Hot sync error:', e);
        return { loaded: 0, error: e.message };
    }
}

function autoSync(key, value, characterId = 'default') {
    if (syncDebounce) {
        clearTimeout(syncDebounce);
    }

    syncDebounce = setTimeout(() => {
        hotToColdSync(key, value, characterId);
        syncDebounce = null;
    }, SYNC_DELAY);
}

function enableSync() {
    syncEnabled = true;
}

function disableSync() {
    syncEnabled = false;
}

function isSyncEnabled() {
    return syncEnabled;
}

stateStore.subscribe('*', (data) => {
    if (data.deleted || data.cleared) return;
    autoSync(data.key, data.newValue);
});

module.exports = {
    setDbPath,
    hotToColdSync,
    coldToHotSync,
    autoSync,
    enableSync,
    disableSync,
    isSyncEnabled
};