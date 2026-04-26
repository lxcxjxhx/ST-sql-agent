const { query } = require('../sqlite/engine');
const { validateSQL, isReadOnly } = require('../sqlite/guard');

let characterId = 'default';

function setCharacterContext(id) {
    characterId = id;
}

async function executeQuery(sql, params = []) {
    try {
        validateSQL(sql);

        const result = query(sql, params);

        return {
            success: true,
            isReadOnly: isReadOnly(sql),
            results: result,
            rowCount: Array.isArray(result) ? result.length : 1
        };
    } catch (e) {
        return {
            success: false,
            error: e.message
        };
    }
}

module.exports = {
    setCharacterContext,
    executeQuery
};
