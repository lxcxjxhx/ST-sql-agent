function exportMarkdown(rows) {
    if (!rows || rows.length === 0) {
        return "";
    }

    const headers = Object.keys(rows[0]);
    const separator = headers.map(() => "---");

    let md = "| " + headers.join(" | ") + " |\n";
    md += "| " + separator.join(" | ") + " |\n";

    for (const row of rows) {
        const values = headers.map(h => {
            const val = row[h];
            if (val === null || val === undefined) {
                return "";
            }
            return String(val);
        });
        md += "| " + values.join(" | ") + " |\n";
    }

    return md;
}

module.exports = {
    exportMarkdown
};