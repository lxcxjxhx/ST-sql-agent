const { stateStore } = require('./state');

const preHooks = [];
const postHooks = [];

function addPreHook(fn) {
    preHooks.push(fn);
}

function addPostHook(fn) {
    postHooks.push(fn);
}

function removePreHook(fn) {
    const idx = preHooks.indexOf(fn);
    if (idx !== -1) preHooks.splice(idx, 1);
}

function removePostHook(fn) {
    const idx = postHooks.indexOf(fn);
    if (idx !== -1) postHooks.splice(idx, 1);
}

async function update(key, value) {
    for (const hook of preHooks) {
        const result = hook(key, value);
        if (result === false) {
            return { success: false, error: 'Pre-hook rejected update' };
        }
        if (result && typeof result === 'object' && result.value !== undefined) {
            value = result.value;
        }
    }

    const result = stateStore.set(key, value);

    for (const hook of postHooks) {
        try {
            hook(key, result.newValue, result.oldValue);
        } catch (e) {
            console.error('Post-hook error:', e);
        }
    }

    return { success: true, oldValue: result.oldValue, newValue: result.newValue };
}

async function updateMultiple(updates) {
    const results = [];
    stateStore.startBatch();

    try {
        for (const { key, value } of updates) {
            const result = await update(key, value);
            results.push({ key, ...result });
        }
    } finally {
        stateStore.endBatch();
    }

    return results;
}

async function atomicUpdate(key, updaterFn) {
    const currentValue = stateStore.get(key);
    const newValue = await updaterFn(currentValue);
    return update(key, newValue);
}

module.exports = {
    update,
    updateMultiple,
    atomicUpdate,
    addPreHook,
    addPostHook,
    removePreHook,
    removePostHook
};