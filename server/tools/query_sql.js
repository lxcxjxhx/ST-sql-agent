const { query } = require("../sqlite/engine");
const { validateSQL } = require("../sqlite/guard");

async function executeSQL(sql, dbPath) {
    validateSQL(sql);
    try {
        const result = query(sql, dbPath);
        return { success: true, data: result };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

module.exports = {
    executeSQL
};
