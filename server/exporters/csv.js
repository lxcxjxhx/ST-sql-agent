function exportCSV(rows) {
    if (!rows || rows.length === 0) {
        return "";
    }

    const headers = Object.keys(rows[0]);
    const lines = [headers.join(",")];

    for (const row of rows) {
        const values = headers.map(h => {
            const val = row[h];
            if (val === null || val === undefined) {
                return "";
            }
            const str = String(val);
            if (str.includes(",") || str.includes('"') || str.includes("\n")) {
                return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
        });
        lines.push(values.join(","));
    }

    return lines.join("\n");
}

module.exports = {
    exportCSV
};