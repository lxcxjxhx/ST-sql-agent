const BLOCKED = ['DROP', 'ATTACH', 'PRAGMA', 'ALTER', 'DELETE', 'TRUNCATE', 'CREATE'];

function validateSQL(sql) {
    if (!sql || typeof sql !== 'string') {
        throw new Error('Invalid SQL: must be a non-empty string');
    }

    const upper = sql.toUpperCase();

    for (const keyword of BLOCKED) {
        if (upper.includes(keyword)) {
            throw new Error(`Blocked SQL operation: ${keyword}`);
        }
    }

    return true;
}

function isReadOnly(sql) {
    if (!sql) return true;
    const upper = sql.trim().toUpperCase();
    return upper.startsWith('SELECT');
}

module.exports = {
    validateSQL,
    isReadOnly,
    BLOCKED
};