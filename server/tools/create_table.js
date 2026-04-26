const { query } = require("../sqlite/engine");
const { generateCreateTableSQL, generateInsertSQL } = require("../sqlite/schema");

async function executeCreateTable(tableName, dataSample, dbPath) {
    try {
        const createSQL = generateCreateTableSQL(tableName, dataSample);
        query(createSQL, dbPath);
        
        return { success: true, message: `Table '${tableName}' created successfully` };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

module.exports = {
    executeCreateTable
};
