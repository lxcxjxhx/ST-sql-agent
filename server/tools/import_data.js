const { query } = require("../sqlite/engine");
const { importCSV } = require("../importers/csv");
const { importJSON } = require("../importers/json");
const { importMarkdown } = require("../importers/markdown");
const { importLogs } = require("../importers/logs");
const { generateCreateTableSQL, generateInsertSQL } = require("../sqlite/schema");

async function importData(format, content, tableName, dbPath) {
    let parsed;

    switch (format.toLowerCase()) {
        case "csv":
            parsed = importCSV(content);
            break;
        case "json":
            parsed = importJSON(content);
            break;
        case "markdown":
        case "md":
            parsed = importMarkdown(content);
            break;
        case "logs":
        case "log":
            parsed = importLogs(content);
            break;
        default:
            return { success: false, error: `Unknown format: ${format}` };
    }

    if (!parsed.fields || parsed.fields.length === 0) {
        return { success: false, error: "No fields found in data" };
    }

    const sampleData = {};
    for (const field of parsed.fields) {
        sampleData[field] = parsed.data.length > 0 ? parsed.data[0][field] : "";
    }

    try {
        const createSQL = generateCreateTableSQL(tableName, sampleData);
        query(createSQL, dbPath);

        let insertedCount = 0;
        for (const row of parsed.data) {
            const { sql, values } = generateInsertSQL(tableName, row);
            query(sql, dbPath);
            insertedCount++;
        }

        return {
            success: true,
            message: `Imported ${insertedCount} rows into '${tableName}'`,
            rowCount: insertedCount
        };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

module.exports = {
    importData
};