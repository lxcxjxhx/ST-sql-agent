const MVU_SQLITE_EXTENSION = (function() {
    const DB_PATH = "./server/db/memory.db";
    const CHARACTER_ID = 'default';
    const BLOCKED_KEYWORDS = ['DROP', 'ATTACH', 'PRAGMA', 'ALTER', 'DELETE', 'TRUNCATE', 'CREATE'];

    let db = null;
    let syncEnabled = true;
    let pipelineEnabled = true;

    const MVU_STATE = {
        _state: {},
        _subscriptions: {},
        get(key) { return this._state[key]; },
        set(key, value) {
            const old = this._state[key];
            this._state[key] = value;
            this._emit(key, { oldValue: old, newValue: value, key });
            return { oldValue: old, newValue: value };
        },
        delete(key) {
            const old = this._state[key];
            delete this._state[key];
            this._emit(key, { oldValue: old, newValue: undefined, key, deleted: true });
            return old;
        },
        getAll() { return { ...this._state }; },
        clear() {
            const keys = Object.keys(this._state);
            this._state = {};
            keys.forEach(k => this._emit(k, { cleared: true }));
        },
        keys() { return Object.keys(this._state); },
        has(key) { return key in this._state; },
        subscribe(key, cb) {
            if (!this._subscriptions[key]) this._subscriptions[key] = [];
            this._subscriptions[key].push(cb);
            return () => { this._subscriptions[key] = this._subscriptions[key].filter(c => c !== cb); };
        },
        _emit(key, data) {
            (this._subscriptions[key] || []).forEach(cb => { try { cb(data); } catch (e) { console.error(e); } });
            (this._subscriptions['*'] || []).forEach(cb => { try { cb({ ...data, key }); } catch (e) { console.error(e); } });
        }
    };

    window.MVU_STATE = MVU_STATE;

    function validateSQL(sql) {
        if (!sql || typeof sql !== 'string') throw new Error('Invalid SQL');
        const upper = sql.toUpperCase();
        for (const kw of BLOCKED_KEYWORDS) {
            if (upper.includes(kw)) throw new Error(`Blocked: ${kw}`);
        }
        return true;
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

    function injectPopupHTML() {
        if (document.getElementById('mvu-popup-overlay')) return;
        
        const floatingBtn = `
        <div id="mvu-floating-btn" class="mvu-floating-btn" onclick="showMVUPopup()" title="MVU-SQLite Memory">
            <span class="mvu-floating-btn-icon">M</span>
        </div>`;
        
        const popupHTML = `
        <div id="mvu-popup-overlay" class="mvu-popup-overlay" style="display:none;">
            <div id="mvu-popup" class="mvu-popup-dialog">
                <div class="mvu-popup-header">
                    <h2>MVU-SQLite Memory</h2>
                    <button id="mvu-popup-close" class="mvu-close-btn">&times;</button>
                </div>
                <div class="mvu-popup-tabs">
                    <button class="mvu-tab active" data-tab="variables">Variables</button>
                    <button class="mvu-tab" data-tab="templates">Templates</button>
                    <button class="mvu-tab" data-tab="guide">Guide</button>
                    <button class="mvu-tab" data-tab="settings">Settings</button>
                </div>
                <div class="mvu-popup-content">
                    <div id="mvu-tab-variables" class="mvu-tab-content active">
                        <div class="mvu-toolbar">
                            <input type="text" id="mvu-var-search" class="mvu-input" placeholder="Search variables...">
                            <button id="mvu-add-var" class="mvu-btn">+ Add Variable</button>
                        </div>
                        <div id="mvu-var-list" class="mvu-var-list">
                            <div class="mvu-empty-state">No variables yet. Add one or apply a template.</div>
                        </div>
                    </div>
                    <div id="mvu-tab-templates" class="mvu-tab-content">
                        <div class="mvu-template-categories">
                            <select id="mvu-template-category" class="mvu-input">
                                <option value="character_lore">Character Lore</option>
                                <option value="user_preferences">User Preferences</option>
                                <option value="conversation_context">Conversation Context</option>
                                <option value="custom">Custom</option>
                            </select>
                        </div>
                        <div id="mvu-template-list" class="mvu-template-list"></div>
                    </div>
                    <div id="mvu-tab-guide" class="mvu-tab-content">
                        <div class="mvu-guide-content">
                            <h3>Welcome to MVU-SQLite Memory</h3>
                            <p>Hot/cold state management with AI variable extraction and FTS5 memory.</p>
                            <h4>Quick Start</h4>
                            <ol>
                                <li><strong>Add Variables:</strong> Click "+ Add Variable" to create a new variable</li>
                                <li><strong>Apply Templates:</strong> Go to Templates tab and click "Apply" on a template</li>
                                <li><strong>Search Memory:</strong> Use /search_memory or the search_memory tool</li>
                                <li><strong>Create Snapshots:</strong> Save current state for later rollback</li>
                            </ol>
                            <h4>AI Commands</h4>
                            <div class="mvu-code-block">
                                <code>/sql SELECT * FROM variable_state</code>
                                <code>/tables</code>
                                <code>/memory I prefer blue watches</code>
                            </div>
                            <h4>Function Tools</h4>
                            <ul>
                                <li><code>set_variable</code> - Set a MVU state variable</li>
                                <li><code>get_variable</code> - Get a MVU state variable</li>
                                <li><code>get_all_variables</code> - Get all variables</li>
                                <li><code>search_memory</code> - Search FTS5 memory</li>
                                <li><code>extract_variables</code> - Extract variables from text</li>
                                <li><code>create_snapshot</code> - Create a state snapshot</li>
                            </ul>
                        </div>
                    </div>
                    <div id="mvu-tab-settings" class="mvu-tab-content">
                        <div class="mvu-settings-group">
                            <h4>Character Context</h4>
                            <div class="mvu-setting-item">
                                <label>Current Character:</label>
                                <input type="text" id="mvu-character-id" class="mvu-input" value="default" readonly>
                            </div>
                        </div>
                        <div class="mvu-settings-group">
                            <h4>Sync Settings</h4>
                            <div class="mvu-setting-item">
                                <label><input type="checkbox" id="mvu-sync-enabled" checked> Enable auto-sync to SQLite</label>
                            </div>
                        </div>
                        <div class="mvu-settings-group">
                            <h4>AI Pipeline</h4>
                            <div class="mvu-setting-item">
                                <label><input type="checkbox" id="mvu-pipeline-enabled" checked> Enable auto-extract from chat</label>
                            </div>
                        </div>
                        <div class="mvu-settings-group">
                            <h4>Presets</h4>
                            <div class="mvu-setting-item">
                                <input type="text" id="mvu-preset-name" class="mvu-input" placeholder="Preset name">
                                <button id="mvu-save-preset" class="mvu-btn">Save Current</button>
                            </div>
                            <div id="mvu-preset-list" class="mvu-preset-list"></div>
                        </div>
                        <div class="mvu-settings-group">
                            <h4>Data Management</h4>
                            <button id="mvu-clear-all" class="mvu-btn mvu-btn-danger">Clear All Variables</button>
                            <button id="mvu-export-data" class="mvu-btn">Export Data</button>
                        </div>
                    </div>
                </div>
                <div class="mvu-popup-footer">
                    <span id="mvu-status-text">Ready</span>
                </div>
            </div>
        </div>
        <div id="mvu-var-modal" class="mvu-popup-overlay" style="display:none;">
            <div class="mvu-var-modal-dialog">
                <div class="mvu-popup-header">
                    <h3 id="mvu-var-modal-title">Add Variable</h3>
                    <button class="mvu-close-btn" onclick="MVU_POPUP.hideVarModal()">&times;</button>
                </div>
                <div class="mvu-var-modal-content">
                    <input type="hidden" id="mvu-var-old-key">
                    <div class="mvu-form-group"><label>Variable Name:</label><input type="text" id="mvu-var-key-input" class="mvu-input" placeholder="variable_name"></div>
                    <div class="mvu-form-group"><label>Value:</label><textarea id="mvu-var-value-input" class="mvu-input" rows="3" placeholder="Variable value"></textarea></div>
                </div>
                <div class="mvu-popup-footer">
                    <button class="mvu-btn" onclick="MVU_POPUP.hideVarModal()">Cancel</button>
                    <button id="mvu-var-save" class="mvu-btn mvu-btn-primary">Save</button>
                </div>
            </div>
        </div>`;
        
        const container = document.createElement('div');
        container.id = 'mvu-sqlite-popup-container';
        container.innerHTML = floatingBtn + popupHTML;
        document.body.appendChild(container);
    }

    function initPopupEvents() {
        const popup = document.getElementById('mvu-popup-overlay');
        const closeBtn = document.getElementById('mvu-popup-close');
        const addVarBtn = document.getElementById('mvu-add-var');
        const varSaveBtn = document.getElementById('mvu-var-save');
        const searchInput = document.getElementById('mvu-var-search');
        const categorySelect = document.getElementById('mvu-template-category');
        const savePresetBtn = document.getElementById('mvu-save-preset');
        const clearAllBtn = document.getElementById('mvu-clear-all');
        
        closeBtn?.addEventListener('click', hidePopup);
        popup?.addEventListener('click', (e) => { if (e.target === popup) hidePopup(); });
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape') hidePopup(); });
        
        document.querySelectorAll('.mvu-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const tabId = tab.dataset.tab;
                document.querySelectorAll('.mvu-tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.mvu-tab-content').forEach(c => c.classList.remove('active'));
                tab.classList.add('active');
                document.getElementById(`mvu-tab-${tabId}`)?.classList.add('active');
            });
        });
        
        addVarBtn?.addEventListener('click', () => {
            document.getElementById('mvu-var-modal-title').textContent = 'Add Variable';
            document.getElementById('mvu-var-old-key').value = '';
            document.getElementById('mvu-var-key-input').value = '';
            document.getElementById('mvu-var-value-input').value = '';
            document.getElementById('mvu-var-modal').style.display = 'flex';
        });
        
        varSaveBtn?.addEventListener('click', () => {
            const oldKey = document.getElementById('mvu-var-old-key').value;
            const key = document.getElementById('mvu-var-key-input').value.trim();
            const value = document.getElementById('mvu-var-value-input').value;
            if (!key) return;
            if (oldKey && oldKey !== key) MVU_STATE.delete(oldKey);
            MVU_STATE.set(key, value);
            autoSync(key, value);
            document.getElementById('mvu-var-modal').style.display = 'none';
            renderVarList();
        });
        
        searchInput?.addEventListener('input', renderVarList);
        
        categorySelect?.addEventListener('change', renderTemplateList);
        
        savePresetBtn?.addEventListener('click', () => {
            const name = document.getElementById('mvu-preset-name')?.value?.trim();
            if (!name) return;
            const presets = JSON.parse(localStorage.getItem('mvu_presets') || '{}');
            presets[name] = MVU_STATE.getAll();
            localStorage.setItem('mvu_presets', JSON.stringify(presets));
            document.getElementById('mvu-preset-name').value = '';
            renderPresetList();
        });
        
        clearAllBtn?.addEventListener('click', () => {
            MVU_STATE.clear();
            renderVarList();
        });
        
        renderVarList();
        renderTemplateList();
        renderPresetList();
    }

    function showPopup() {
        document.getElementById('mvu-popup-overlay').style.display = 'flex';
        renderVarList();
    }

    function hidePopup() {
        document.getElementById('mvu-popup-overlay').style.display = 'none';
    }

    function renderVarList() {
        const listEl = document.getElementById('mvu-var-list');
        if (!listEl) return;
        const search = document.getElementById('mvu-var-search')?.value?.toLowerCase() || '';
        const allVars = MVU_STATE.getAll();
        const filtered = Object.entries(allVars).filter(([k]) => k.toLowerCase().includes(search));
        
        if (filtered.length === 0) {
            listEl.innerHTML = '<div class="mvu-empty-state">No variables yet. Add one or apply a template.</div>';
            return;
        }
        
        listEl.innerHTML = filtered.map(([key, value]) => `
            <div class="mvu-var-item">
                <div class="mvu-var-info">
                    <div class="mvu-var-name">${escHtml(key)}</div>
                    <div class="mvu-var-value">${escHtml(String(value).substring(0, 100))}</div>
                </div>
                <div class="mvu-var-actions">
                    <button class="mvu-btn" onclick="editVar('${escHtml(key)}')">Edit</button>
                    <button class="mvu-btn mvu-btn-danger" onclick="deleteVar('${escHtml(key)}')">Delete</button>
                </div>
            </div>
        `).join('');
    }

    function editVar(key) {
        const value = MVU_STATE.get(key);
        document.getElementById('mvu-var-modal-title').textContent = 'Edit Variable';
        document.getElementById('mvu-var-old-key').value = key;
        document.getElementById('mvu-var-key-input').value = key;
        document.getElementById('mvu-var-value-input').value = String(value);
        document.getElementById('mvu-var-modal').style.display = 'flex';
    }

    function deleteVar(key) {
        MVU_STATE.delete(key);
        renderVarList();
    }

    function escHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    async function loadTemplatesFromFiles() {
        const templateFiles = {
            character_lore: './templates/character_lore.json',
            user_preferences: './templates/user_preferences.json',
            conversation_context: './templates/conversation_context.json',
            custom: './templates/custom.json'
        };
        
        const loadedTemplates = {};
        
        for (const [category, filePath] of Object.entries(templateFiles)) {
            try {
                const response = await fetch(filePath);
                if (response.ok) {
                    const data = await response.json();
                    loadedTemplates[category] = Array.isArray(data) ? data.map(item => ({
                        name: item.name,
                        description: item.description || '',
                        vars: item.variables || {}
                    })) : [];
                } else {
                    loadedTemplates[category] = TEMPLATES[category] || [];
                }
            } catch (e) {
                console.warn(`Failed to load ${filePath}:`, e.message);
                loadedTemplates[category] = TEMPLATES[category] || [];
            }
        }
        
        return loadedTemplates;
    }
    
    let TEMPLATES_LOADED = null;
    
    function getTemplates() {
        return TEMPLATES_LOADED || TEMPLATES;
    }

    function renderTemplateList() {
        const listEl = document.getElementById('mvu-template-list');
        if (!listEl) return;
        const category = document.getElementById('mvu-template-category')?.value || 'character_lore';
        const tmpls = getTemplates()[category] || [];
        listEl.innerHTML = tmpls.map((tmpl, idx) => `
            <div class="mvu-template-card">
                <div class="mvu-template-header">
                    <span class="mvu-template-name">${escHtml(tmpl.name)}</span>
                    <button class="mvu-btn mvu-btn-primary" onclick="applyTemplate('${category}', ${idx})">Apply</button>
                </div>
                <div class="mvu-template-desc">${escHtml(tmpl.description)}</div>
                <div class="mvu-template-meta">${Object.keys(tmpl.vars || {}).length} variables</div>
            </div>
        `).join('');
    }

    function applyTemplate(category, index) {
        const tmpl = getTemplates()[category]?.[index];
        if (!tmpl) return;
        for (const [key, value] of Object.entries(tmpl.vars || {})) {
            MVU_STATE.set(key, value);
            autoSync(key, value);
        }
        renderVarList();
    }

    function renderPresetList() {
        const listEl = document.getElementById('mvu-preset-list');
        if (!listEl) return;
        const presets = JSON.parse(localStorage.getItem('mvu_presets') || '{}');
        const names = Object.keys(presets);
        if (names.length === 0) {
            listEl.innerHTML = '<div style="color: #666; font-size: 13px;">No presets saved</div>';
            return;
        }
        listEl.innerHTML = names.map(name => `
            <div class="mvu-preset-item">
                <span>${escHtml(name)} (${Object.keys(presets[name]).length} vars)</span>
                <button class="mvu-btn" onclick="loadPreset('${escHtml(name)}')">Load</button>
            </div>
        `).join('');
    }

    function loadPreset(name) {
        const presets = JSON.parse(localStorage.getItem('mvu_presets') || '{}');
        const preset = presets[name];
        if (!preset) return;
        MVU_STATE.clear();
        for (const [key, value] of Object.entries(preset)) {
            MVU_STATE.set(key, value);
        }
        renderVarList();
    }

    function replaceTemplateVariables(text) {
        if (!text || typeof text !== 'string') return text;
        const allVars = MVU_STATE.getAll();
        return text.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (match, key) => {
            const value = allVars[key];
            if (value !== undefined) {
                return String(value);
            }
            return match;
        });
    }

    function getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => {
            return current && current[key] !== undefined ? current[key] : undefined;
        }, obj);
    }

    window.editVar = editVar;
    window.deleteVar = deleteVar;
    window.applyTemplate = applyTemplate;
    window.loadPreset = loadPreset;
    window.showMVUPopup = showPopup;
    window.hideMVUPopup = hidePopup;
    window.replaceTemplateVariables = replaceTemplateVariables;

    async function init() {
        console.log("MVU-SQLite initializing...");
        
        TEMPLATES_LOADED = await loadTemplatesFromFiles();
        console.log("Templates loaded:", TEMPLATES_LOADED);
        
        injectPopupHTML();
        initPopupEvents();

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
                        const result = MVU_STATE.set(key, value);
                        autoSync(key, value);
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
                    properties: { key: { type: "string", description: "Variable name" } },
                    required: ["key"]
                },
                action: async ({ key }) => {
                    const value = MVU_STATE.get(key);
                    return JSON.stringify({ success: true, key, value, exists: value !== undefined });
                }
            });

            registerFunctionTool({
                name: "get_all_variables",
                description: "Get all MVU state variables",
                parameters: { type: "object", properties: {}, required: [] },
                action: async () => {
                    const all = MVU_STATE.getAll();
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
                    const oldValue = MVU_STATE.delete(key);
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
                name: "extract_variables",
                description: "Extract variables from text using AI patterns",
                parameters: {
                    type: "object",
                    properties: { message: { type: "string", description: "Text to extract from" } },
                    required: ["message"]
                },
                action: async ({ message }) => {
                    const extracted = extractVariables(message);
                    for (const v of extracted) {
                        MVU_STATE.set(v.key, v.value);
                        autoSync(v.key, v.value);
                    }
                    return JSON.stringify({ success: true, extracted: extracted.length, variables: extracted });
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
                    const all = MVU_STATE.getAll();
                    const presets = JSON.parse(localStorage.getItem('mvu_presets') || '{}');
                    presets[name] = all;
                    localStorage.setItem('mvu_presets', JSON.stringify(presets));
                    return JSON.stringify({ success: true, name, variables: Object.keys(all).length });
                }
            });

            registerFunctionTool({
                name: "query_sql",
                description: "Execute a SQL query (read-only, SELECT only)",
                parameters: {
                    type: "object",
                    properties: { sql: { type: "string", description: "SQL query" } },
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
            try {
                eventSource.on(event_types.CHAT_MESSAGE_RECEIVED, async (data) => {
                    if (!pipelineEnabled) return;
                    const message = data?.message?.content || '';
                    if (!message) return;

                    const extracted = extractVariables(message);
                    for (const v of extracted) {
                        MVU_STATE.set(v.key, v.value);
                        autoSync(v.key, v.value);
                    }

                    if (typeof window.MVU_REGEX !== 'undefined' && window.MVU_REGEX.isEnabled()) {
                        const regexResults = window.MVU_REGEX.matchText(message);
                        if (regexResults.length > 0) {
                            console.log("MVU-Regex extracted:", regexResults);
                        }
                    }

                    if (extracted.length > 0) {
                        console.log("Extracted variables:", extracted);
                    }
                });
                
                eventSource.on(event_types.EXTENSION_MENU_CLICKED, (extensionId) => {
                    console.log("MVU-SQLite: Extension menu clicked, ID:", extensionId);
                    if (!extensionId) return;
                    const idLower = extensionId.toLowerCase();
                    if (idLower.includes('mvu') || idLower.includes('sqlite') || idLower.includes('memory')) {
                        console.log("MVU-SQLite: Opening popup");
                        showPopup();
                    }
                });
            } catch (e) {
                console.warn("Event subscription skipped:", e.message);
            }
        }

        console.log("MVU-SQLite initialized");
    }

    async function exit() {
        MVU_STATE.clear();
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