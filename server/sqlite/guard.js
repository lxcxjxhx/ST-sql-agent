const blocked = [
    "DROP",
    "ATTACH",
    "PRAGMA",
    "ALTER",
    "DELETE",
    "TRUNCATE"
];

function validateSQL(sql) {
    const upper = sql.toUpperCase();
    for (const keyword of blocked) {
        if (upper.includes(keyword)) {
            throw new Error(`Blocked SQL: ${keyword} operations are not allowed`);
        }
    }
    return true;
}

module.exports = {
    validateSQL,
    blocked
};