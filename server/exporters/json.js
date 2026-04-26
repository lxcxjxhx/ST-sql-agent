function exportJSON(rows) {
    if (!rows || rows.length === 0) {
        return "[]";
    }
    return JSON.stringify(rows, null, 2);
}

module.exports = {
    exportJSON
};