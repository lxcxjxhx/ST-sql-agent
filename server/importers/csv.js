const Papa = require("papaparse");

function importCSV(content) {
    const result = Papa.parse(content, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: true
    });

    if (result.errors.length > 0) {
        throw new Error(`CSV parsing error: ${result.errors[0].message}`);
    }

    return {
        fields: result.meta.fields || [],
        data: result.data || [],
        rowCount: result.data.length
    };
}

module.exports = {
    importCSV
};
