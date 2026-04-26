function importMarkdown(content) {
    const lines = content.trim().split("\n");
    const data = [];
    let headers = [];
    let inTable = false;
    let skipNext = false;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        if (!line.startsWith("|")) continue;

        const cells = line.split("|").map(c => c.trim()).filter(c => c !== "");

        if (cells.length === 0) continue;

        if (line.match(/^\|[\s\-:|]+\|$/)) {
            if (headers.length > 0) {
                skipNext = true;
            }
            continue;
        }

        if (skipNext) {
            skipNext = false;
            continue;
        }

        if (!inTable) {
            headers = cells;
            inTable = true;
            continue;
        }

        if (headers.length === cells.length) {
            const row = {};
            for (let j = 0; j < headers.length; j++) {
                row[headers[j]] = cells[j];
            }
            data.push(row);
        }
    }

    if (headers.length === 0) {
        throw new Error("No markdown table found");
    }

    return {
        fields: headers,
        data: data,
        rowCount: data.length
    };
}

module.exports = {
    importMarkdown
};
