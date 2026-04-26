const { searchMemory, insertMemory, getAllMemory, deleteMemory } = require('../memory/fts');
const { getAllHistory } = require('../sync/history_tracker');

let characterId = 'default';

function setCharacterContext(id) {
    characterId = id;
}

async function searchMemoryTool(query, limit = 20) {
    const result = await searchMemory(query, characterId, limit);
    return {
        success: result.success,
        query,
        count: result.data?.length || 0,
        results: result.data || [],
        error: result.error
    };
}

async function storeMemoryTool(content, tag = 'manual', context = '') {
    const result = await insertMemory(content, tag, context, characterId);
    return {
        success: result.success,
        content: content.substring(0, 50),
        tag,
        error: result.error
    };
}

function getAllMemoryTool(limit = 100) {
    const result = getAllMemory(characterId, limit);
    return {
        success: result.success,
        count: result.data?.length || 0,
        memories: result.data || [],
        error: result.error
    };
}

async function deleteMemoryTool(rowId) {
    const result = deleteMemory(rowId, characterId);
    return {
        success: result.success,
        rowId,
        error: result.error
    };
}

function getMemoryHistoryTool(limit = 100, offset = 0) {
    const history = getAllHistory(characterId, limit, offset);
    return {
        success: true,
        count: history.length,
        history
    };
}

module.exports = {
    setCharacterContext,
    searchMemoryTool,
    storeMemoryTool,
    getAllMemoryTool,
    deleteMemoryTool,
    getMemoryHistoryTool
};
