const { createSnapshot, listSnapshots, rollbackSnapshot, deleteSnapshot } = require('../sync/snapshot');

let characterId = 'default';

function setCharacterContext(id) {
    characterId = id;
}

async function createSnapshotTool(name, description = '') {
    const result = await createSnapshot(name, description, characterId);
    return {
        success: result.success,
        name,
        variables: result.variables,
        error: result.error
    };
}

function listSnapshotsTool() {
    const snapshots = listSnapshots(characterId);
    return {
        success: true,
        count: snapshots.length,
        snapshots
    };
}

async function rollbackSnapshotTool(snapshotId) {
    const result = await rollbackSnapshot(snapshotId, characterId);
    return {
        success: result.success,
        snapshotId,
        restored: result.restored,
        error: result.error
    };
}

function deleteSnapshotTool(snapshotId) {
    const result = deleteSnapshot(snapshotId, characterId);
    return {
        success: result.success,
        snapshotId,
        error: result.error
    };
}

module.exports = {
    setCharacterContext,
    createSnapshotTool,
    listSnapshotsTool,
    rollbackSnapshotTool,
    deleteSnapshotTool
};
