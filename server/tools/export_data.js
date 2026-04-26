const { query } = require("../sqlite/engine");
const { exportCSV } = require("../exporters/csv");
const { exportJSON } = require("../exporters/json");
const { exportMarkdown } = require("../exporters/markdown");
const { validateSQL } = require("../sqlite/guard");

async function exportData(sqlQuery, format, dbPath) {
    try {
        validateSQL(sqlQuery);
        const data = query(sqlQuery, dbPath);

        switch (format.toLowerCase()) {
            case "csv":
                return exportCSV(data);
            case "json":
                return exportJSON(data);
            case "markdown":
            case "md":
                return exportMarkdown(data);
            default:
                return JSON.stringify({ error: `Unknown format: ${format}` });
        }
    } catch (e) {
        return JSON.stringify({ error: e.message });
    }
}

module.exports = {
    exportData
};