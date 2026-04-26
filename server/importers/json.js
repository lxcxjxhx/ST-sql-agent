function importJSON(content) {
    let data;
    try {
        data = JSON.parse(content);
    } catch (e) {
        throw new Error(`Invalid JSON: ${e.message}`);
    }

    if (Array.isArray(data)) {
        if (data.length === 0) {
            throw new Error("JSON array is empty");
        }
        return {
            fields: Object.keys(data[0]),
            data: data,
            rowCount: data.length
        };
    } else if (typeof data === "object" && data !== null) {
        return {
            fields: Object.keys(data),
            data: [data],
            rowCount: 1
        };
    } else {
        throw new Error("JSON must be an object or array of objects");
    }
}

module.exports = {
    importJSON
};
