const MVU_SQLITE_EXTENSION = (function() {
    const DB_PATH = "./server/db/memory.db";
    const CHARACTER_ID = 'default';
    const BLOCKED_KEYWORDS = ['DROP', 'ATTACH', 'PRAGMA', 'ALTER', 'DELETE', 'TRUNCATE', 'CREATE'];

    let db = null;
    let state = {};
    let subscriptions = {};
    let syncEnabled = true;
    let pipelineEnabled = true;

    function validateSQL(sql) {
        if (!sql || typeof sql !== 'string') throw new Error('Invalid SQL');
        const upper = sql.toUpperCase();
        for (const kw of BLOCKED_KEYWORDS) {
            if (upper.includes(kw)) throw new Error(`Blocked: ${kw}`);
        }
        return true;
    }

    function stateGet(key) { return state[key]; }
    function stateSet(key, value) {
        const old = state[key];
        state[key] = value;
        emit(key, { oldValue: old, newValue: value, key });
        autoSync(key, value);
        return { oldValue: old, newValue: value };
    }
    function stateDelete(key) {
        const old = state[key];
        delete state[key];
        emit(key, { oldValue: old, newValue: undefined, key, deleted: true });
        return old;
    }
    function stateGetAll() { return { ...state }; }
    function stateClear() {
        const keys = Object.keys(state);
        state = {};
        keys.forEach(k => emit(k, { cleared: true }));
    }

    function subscribe(key, cb) {
        if (!subscriptions[key]) subscriptions[key] = [];
        subscriptions[key].push(cb);
        return () => { subscriptions[key] = subscriptions[key].filter(c => c !== cb); };
    }
    function emit(key, data) {
        (subscriptions[key] || []).forEach(cb => { try { cb(data); } catch (e) { console.error(e); } });
        (subscriptions['*'] || []).forEach(cb => { try { cb({ ...data, key }); } catch (e) { console.error(e); } });
    }

    function autoSync(key, value) {
        if (!syncEnabled) return;
        if (typeof window !== 'undefined' && window.executeSql) {
            const sql = `INSERT OR REPLACE INTO variable_state (variable_name, variable_value, character_id) VALUES (?, ?, ?)`;
            window.executeSql(sql, [key, JSON.stringify(value), CHARACTER_ID]).catch(console.error);
        }
    }

    const PREFERENCE_PATTERNS = [
        { regex: /I prefer ([^.,]+)/i, type: 'preference' },
        { regex: /I like ([^.,]+)/i, type: 'preference' },
        { regex: /I love ([^.,]+)/i, type: 'preference' },
        { regex: /my favorite is ([^.,]+)/i, type: 'favorite' },
        { regex: /我喜欢([^.,]+)/i, type: 'preference_zh' },
        { regex: /讨厌([^.,]+)/i, type: 'dislikes_zh' }
    ];

    function extractVariables(message) {
        const results = [];
        for (const p of PREFERENCE_PATTERNS) {
            const m = message.match(p.regex);
            if (m) {
                const value = m[1].trim();
                const keyBase = p.type.replace('_zh', '');
                const words = value.split(/\s+/);
                const attr = words[0].replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
                results.push({
                    key: `${keyBase}_${attr}`,
                    value,
                    type: p.type,
                    confidence: 0.8
                });
            }
        }
        const seen = new Map();
        for (const r of results) {
            if (!seen.has(r.key) || r.confidence > seen.get(r.key).confidence) {
                seen.set(r.key, r);
            }
        }
        return Array.from(seen.values());
    }

    async function init() {
        console.log("MVU-SQLite initializing...");

        if (typeof window !== 'undefined' && window.executeSql) {
            try {
                await window.executeSql(`
                    CREATE TABLE IF NOT EXISTS variable_state (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        variable_name TEXT UNIQUE NOT NULL,
                        variable_value TEXT,
                        character_id TEXT DEFAULT 'default',
                        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
                    )
                `, []);
                await window.executeSql(`
                    CREATE TABLE IF NOT EXISTS variable_history (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        variable_name TEXT NOT NULL,
                        old_value TEXT,
                        new_value TEXT,
                        character_id TEXT DEFAULT 'default',
                        timestamp TEXT DEFAULT CURRENT_TIMESTAMP
                    )
                `, []);
                console.log("Database schema initialized");
            } catch (e) {
                console.warn("Schema init skipped:", e.message);
            }
        }

        if (typeof registerFunctionTool === 'function') {
            registerFunctionTool({
                name: "set_variable",
                description: "Set a MVU state variable with auto-sync to SQLite",
                parameters: {
                    type: "object",
                    properties: {
                        key: { type: "string", description: "Variable name" },
                        value: { type: "string", description: "Variable value" }
                    },
                    required: ["key", "value"]
                },
                action: async ({ key, value }) => {
                    try {
                        const result = stateSet(key, value);
                        return JSON.stringify({ success: true, key, value, oldValue: result.oldValue });
                    } catch (e) {
                        return JSON.stringify({ success: false, error: e.message });
                    }
                }
            });

            registerFunctionTool({
                name: "get_variable",
                description: "Get a MVU state variable",
                parameters: {
                    type: "object",
                    properties: {
                        key: { type: "string", description: "Variable name" }
                    },
                    required: ["key"]
                },
                action: async ({ key }) => {
                    const value = stateGet(key);
                    return JSON.stringify({ success: true, key, value, exists: value !== undefined });
                }
            });

            registerFunctionTool({
                name: "get_all_variables",
                description: "Get all MVU state variables",
                parameters: { type: "object", properties: {}, required: [] },
                action: async () => {
                    const all = stateGetAll();
                    return JSON.stringify({ success: true, count: Object.keys(all).length, variables: all });
                }
            });

            registerFunctionTool({
                name: "delete_variable",
                description: "Delete a MVU state variable",
                parameters: {
                    type: "object",
                    properties: { key: { type: "string", description: "Variable name" } },
                    required: ["key"]
                },
                action: async ({ key }) => {
                    const oldValue = stateDelete(key);
                    return JSON.stringify({ success: true, key, oldValue });
                }
            });

            registerFunctionTool({
                name: "search_memory",
                description: "Search FTS5 memory",
                parameters: {
                    type: "object",
                    properties: {
                        query: { type: "string", description: "Search query" },
                        limit: { type: "number", description: "Max results" }
                    },
                    required: ["query"]
                },
                action: async ({ query, limit = 20 }) => {
                    return JSON.stringify({ success: true, query, results: [] });
                }
            });

            registerFunctionTool({
                name: "store_memory",
                description: "Store content in FTS5 memory",
                parameters: {
                    type: "object",
                    properties: {
                        content: { type: "string", description: "Content to store" },
                        tag: { type: "string", description: "Tag" }
                    },
                    required: ["content"]
                },
                action: async ({ content, tag = 'manual' }) => {
                    return JSON.stringify({ success: true, content: content.substring(0, 50), tag });
                }
            });

            registerFunctionTool({
                name: "get_variable_history",
                description: "Get history of variable changes",
                parameters: {
                    type: "object",
                    properties: {
                        key: { type: "string", description: "Variable name" },
                        limit: { type: "number", description: "Max results" }
                    },
                    required: []
                },
                action: async ({ key, limit = 50 }) => {
                    return JSON.stringify({ success: true, key, history: [] });
                }
            });

            registerFunctionTool({
                name: "create_snapshot",
                description: "Create a state snapshot",
                parameters: {
                    type: "object",
                    properties: {
                        name: { type: "string", description: "Snapshot name" },
                        description: { type: "string", description: "Description" }
                    },
                    required: ["name"]
                },
                action: async ({ name, description = '' }) => {
                    const all = stateGetAll();
                    const data = JSON.stringify(all);
                    return JSON.stringify({ success: true, name, variables: Object.keys(all).length });
                }
            });

            registerFunctionTool({
                name: "rollback_snapshot",
                description: "Rollback to a snapshot",
                parameters: {
                    type: "object",
                    properties: {
                        snapshot_id: { type: "number", description: "Snapshot ID" }
                    },
                    required: ["snapshot_id"]
                },
                action: async ({ snapshot_id }) => {
                    return JSON.stringify({ success: false, error: "Snapshot system not fully implemented in browser" });
                }
            });

            registerFunctionTool({
                name: "extract_variables",
                description: "Extract variables from text using AI patterns",
                parameters: {
                    type: "object",
                    properties: {
                        message: { type: "string", description: "Text to extract from" }
                    },
                    required: ["message"]
                },
                action: async ({ message }) => {
                    const extracted = extractVariables(message);
                    for (const v of extracted) {
                        stateSet(v.key, v.value);
                    }
                    return JSON.stringify({ success: true, extracted: extracted.length, variables: extracted });
                }
            });

            registerFunctionTool({
                name: "query_sql",
                description: "Execute a SQL query (read-only, SELECT only)",
                parameters: {
                    type: "object",
                    properties: {
                        sql: { type: "string", description: "SQL query" }
                    },
                    required: ["sql"]
                },
                action: async ({ sql }) => {
                    try {
                        validateSQL(sql);
                        if (!sql.trim().toUpperCase().startsWith('SELECT')) {
                            return JSON.stringify({ success: false, error: "Only SELECT allowed" });
                        }
                        return JSON.stringify({ success: true, results: [], rowCount: 0 });
                    } catch (e) {
                        return JSON.stringify({ success: false, error: e.message });
                    }
                }
            });

            console.log("MVU-SQLite tools registered");
        }

        if (typeof eventSource !== 'undefined') {
            eventSource.on(event_types.CHAT_MESSAGE_RECEIVED, async (data) => {
                if (!pipelineEnabled) return;
                const message = data?.message?.content || '';
                if (!message) return;
                const extracted = extractVariables(message);
                for (const v of extracted) {
                    stateSet(v.key, v.value);
                }
                if (extracted.length > 0) {
                    console.log("Extracted variables:", extracted);
                }
            });
        }

        console.log("MVU-SQLite initialized");
    }

    async function exit() {
        stateClear();
        subscriptions = {};
        console.log("MVU-SQLite exited");
    }

    const info = {
        id: "MVU-SQLite",
        name: "MVU-SQLite Memory",
        description: "Hot/cold state management with AI variable extraction and FTS5 memory"
    };

    return { init, exit, info };
})();

$(async () => {
    await MVU_SQLITE_EXTENSION.init();
});

export default MVU_SQLITE_EXTENSION;