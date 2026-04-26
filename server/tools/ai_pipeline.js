const { extractVariables } = require('./variable_extractor');
const { update } = require('../mvu/updater');
const { insertMemory, searchMemory } = require('../memory/fts');
const { hotToColdSync } = require('../sync/variable_sync');

let characterId = 'default';
let pipelineEnabled = true;
let eventCallback = null;

function setCharacterId(id) {
    characterId = id;
}

function getCharacterId() {
    return characterId;
}

function enablePipeline() {
    pipelineEnabled = true;
}

function disablePipeline() {
    pipelineEnabled = false;
}

function isPipelineEnabled() {
    return pipelineEnabled;
}

function setEventCallback(callback) {
    eventCallback = callback;
}

async function processMessage(message, sender = 'user') {
    if (!pipelineEnabled) {
        return { processed: false, reason: 'pipeline_disabled' };
    }

    if (sender !== 'user' && sender !== 'ai') {
        return { processed: false, reason: 'unknown_sender' };
    }

    try {
        const extracted = extractVariables(message);

        if (extracted.length === 0) {
            return { processed: false, reason: 'no_variables_extracted', extracted: [] };
        }

        const stored = [];
        const errors = [];

        for (const variable of extracted) {
            try {
                const result = await update(variable.key, variable.value);

                if (result.success) {
                    await hotToColdSync(variable.key, variable.value, characterId);

                    await insertMemory(
                        `${variable.key}: ${variable.value}`,
                        variable.type,
                        `Extracted from ${sender} message`,
                        characterId
                    );

                    stored.push({
                        key: variable.key,
                        value: variable.value,
                        type: variable.type
                    });
                } else {
                    errors.push({ key: variable.key, error: result.error });
                }
            } catch (e) {
                errors.push({ key: variable.key, error: e.message });
            }
        }

        if (eventCallback && stored.length > 0) {
            eventCallback({
                type: 'variables_extracted',
                sender,
                variables: stored,
                message: message.substring(0, 100)
            });
        }

        return {
            processed: true,
            extracted: stored.length,
            variables: stored,
            errors: errors.length > 0 ? errors : undefined
        };
    } catch (e) {
        return {
            processed: false,
            reason: 'pipeline_error',
            error: e.message
        };
    }
}

async function recallRelated(query) {
    try {
        const searchResult = await searchMemory(query, characterId);

        if (searchResult.success && searchResult.data.length > 0) {
            const memories = searchResult.data.map(m => ({
                content: m.content,
                tag: m.tag,
                relevance: 'high'
            }));

            if (eventCallback) {
                eventCallback({
                    type: 'memory_recalled',
                    query,
                    memories
                });
            }

            return { success: true, memories };
        }

        return { success: true, memories: [] };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

async function storeManualMemory(content, tag = 'manual', context = '') {
    try {
        const result = await insertMemory(content, tag, context, characterId);

        if (eventCallback) {
            eventCallback({
                type: 'memory_stored',
                content: content.substring(0, 100),
                tag
            });
        }

        return result;
    } catch (e) {
        return { success: false, error: e.message };
    }
}

module.exports = {
    processMessage,
    recallRelated,
    storeManualMemory,
    setCharacterId,
    getCharacterId,
    enablePipeline,
    disablePipeline,
    isPipelineEnabled,
    setEventCallback
};