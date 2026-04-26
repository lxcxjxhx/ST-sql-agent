function importLogs(content) {
    const lines = content.trim().split("\n");
    const data = [];
    let headers = new Set();
    const rows = [];

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        const parts = trimmed.split(/\s+/);
        const entry = {};

        for (const part of parts) {
            const colonIndex = part.indexOf(":");
            if (colonIndex > 0) {
                const key = part.substring(0, colonIndex);
                const value = part.substring(colonIndex + 1);
                entry[key] = value;
                headers.add(key);
            } else {
                entry[`log_${rows.length}`] = part;
                headers.add(`log_${rows.length}`);
            }
        }

        if (Object.keys(entry).length > 0) {
            rows.push(entry);
        }
    }

    const headerArray = Array.from(headers);

    const dataRows = rows.map(row => {
        const newRow = {};
        for (const h of headerArray) {
            newRow[h] = row[h] || "";
        }
        return newRow;
    });

    return {
        fields: headerArray,
        data: dataRows,
        rowCount: dataRows.length
    };
}

module.exports = {
    importLogs
};
