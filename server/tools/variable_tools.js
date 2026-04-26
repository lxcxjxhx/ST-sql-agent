const { stateStore } = require('../mvu/state');
const { update } = require('../mvu/updater');
const { hotToColdSync, coldToHotSync } = require('../sync/variable_sync');
const { getHistory } = require('../sync/history_tracker');

let characterId = 'default';

function setCharacterContext(id) {
    characterId = id;
}

async function setVariable(key, value) {
    try {
        const result = await update(key, value);

        if (result.success) {
            await hotToColdSync(key, value, characterId);
        }

        return {
            success: result.success,
            key,
            value,
            oldValue: result.oldValue
        };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

function getVariable(key) {
    const value = stateStore.get(key);
    return {
        success: true,
        key,
        value,
        exists: value !== undefined
    };
}

function getAllVariables() {
    const all = stateStore.getAll();
    return {
        success: true,
        count: Object.keys(all).length,
        variables: all
    };
}

async function deleteVariable(key) {
    try {
        const oldValue = stateStore.delete(key);

        if (typeof window !== 'undefined' && window.executeSql) {
            await window.executeSql(
                'DELETE FROM variable_state WHERE variable_name = ? AND character_id = ?',
                [key, characterId]
            );
        }

        return {
            success: true,
            key,
            oldValue
        };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

function getVariableHistory(key, limit = 50) {
    const history = getHistory(key, characterId, limit);
    return {
        success: true,
        key,
        count: history.length,
        history
    };
}

async function loadVariablesFromDb() {
    try {
        const result = await coldToHotSync(characterId);
        return result;
    } catch (e) {
        return { success: false, error: e.message };
    }
}

module.exports = {
    setCharacterContext,
    setVariable,
    getVariable,
    getAllVariables,
    deleteVariable,
    getVariableHistory,
    loadVariablesFromDb
};
