const MVU_POPUP = (function() {
    let templates = {};
    let currentCharacterId = 'default';
    let syncEnabled = true;
    let pipelineEnabled = true;

    function loadTemplates() {
        templates = {
            character_lore: [
                { name: "Basic Character", description: "Essential character traits", variables: { character_name: "Character", character_age: "unknown", character_personality: "friendly" } },
                { name: "Fantasy Character", description: "Fantasy RPG character", variables: { character_name: "Hero", character_race: "Elf", character_class: "Mage" } },
                { name: "Sci-Fi Character", description: "Science fiction character", variables: { character_name: "Pilot", character_species: "Human", character_ship: "Stellar Voyager" } }
            ],
            user_preferences: [
                { name: "User Preferences", description: "Track user likes and dislikes", variables: { user_favorite_color: "", user_favorite_food: "", user_dislikes: "" } },
                { name: "Communication Style", description: "Communication preferences", variables: { user_tone_formal: "false", user_prefers_emoji: "true" } }
            ],
            conversation_context: [
                { name: "Session Context", description: "Current conversation session", variables: { session_topic: "", conversation_turns: "0" } },
                { name: "Story Progress", description: "Track ongoing story", variables: { story_chapter: "1", story_location: "unknown" } }
            ],
            custom: [
                { name: "Empty Template", description: "Start from scratch", variables: { custom_var_1: "", custom_var_2: "" } }
            ]
        };
    }

    function showPopup() {
        const overlay = document.getElementById('mvu-popup-overlay');
        if (overlay) {
            overlay.style.display = 'flex';
            loadVariables();
            loadTemplates();
            renderTemplateList();
            loadSettings();
        }
    }

    function hidePopup() {
        const overlay = document.getElementById('mvu-popup-overlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
    }

    function initTabs() {
        const tabs = document.querySelectorAll('.mvu-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const tabId = tab.dataset.tab;
                switchTab(tabId);
            });
        });
    }

    function switchTab(tabId) {
        document.querySelectorAll('.mvu-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.mvu-tab-content').forEach(c => c.classList.remove('active'));

        document.querySelector(`.mvu-tab[data-tab="${tabId}"]`)?.classList.add('active');
        document.getElementById(`mvu-tab-${tabId}`)?.classList.add('active');

        saveSettings();
    }

    function loadVariables() {
        const varList = document.getElementById('mvu-var-list');
        if (!varList) return;

        const allVars = window.MVU_STATE ? window.MVU_STATE.getAll() : {};
        const searchTerm = document.getElementById('mvu-var-search')?.value?.toLowerCase() || '';

        const filtered = Object.entries(allVars).filter(([key]) =>
            key.toLowerCase().includes(searchTerm)
        );

        if (filtered.length === 0) {
            varList.innerHTML = '<div class="mvu-empty-state">No variables yet. Add one or apply a template.</div>';
            return;
        }

        varList.innerHTML = filtered.map(([key, value]) => `
            <div class="mvu-var-item" data-key="${escapeHtml(key)}">
                <div class="mvu-var-info">
                    <div class="mvu-var-name">${escapeHtml(key)}</div>
                    <div class="mvu-var-value">${escapeHtml(String(value).substring(0, 100))}</div>
                </div>
                <div class="mvu-var-actions">
                    <button class="mvu-btn" onclick="MVU_POPUP.editVariable('${escapeHtml(key)}')">Edit</button>
                    <button class="mvu-btn mvu-btn-danger" onclick="MVU_POPUP.deleteVariable('${escapeHtml(key)}')">Delete</button>
                </div>
            </div>
        `).join('');
    }

    function addVariable() {
        document.getElementById('mvu-var-modal-title').textContent = 'Add Variable';
        document.getElementById('mvu-var-old-key').value = '';
        document.getElementById('mvu-var-key-input').value = '';
        document.getElementById('mvu-var-value-input').value = '';
        document.getElementById('mvu-var-modal').style.display = 'flex';
    }

    function editVariable(key) {
        const value = window.MVU_STATE ? window.MVU_STATE.get(key) : '';
        document.getElementById('mvu-var-modal-title').textContent = 'Edit Variable';
        document.getElementById('mvu-var-old-key').value = key;
        document.getElementById('mvu-var-key-input').value = key;
        document.getElementById('mvu-var-value-input').value = String(value);
        document.getElementById('mvu-var-modal').style.display = 'flex';
    }

    function hideVarModal() {
        document.getElementById('mvu-var-modal').style.display = 'none';
    }

    function saveVariable() {
        const oldKey = document.getElementById('mvu-var-old-key').value;
        const key = document.getElementById('mvu-var-key-input').value.trim();
        const value = document.getElementById('mvu-var-value-input').value;

        if (!key) {
            setStatus('Variable name is required', true);
            return;
        }

        if (window.MVU_STATE) {
            if (oldKey && oldKey !== key) {
                window.MVU_STATE.delete(oldKey);
            }
            window.MVU_STATE.set(key, value);
        }

        hideVarModal();
        loadVariables();
        setStatus(`Variable "${key}" saved`);
    }

    function deleteVariable(key) {
        if (window.MVU_STATE) {
            window.MVU_STATE.delete(key);
        }
        loadVariables();
        setStatus(`Variable "${key}" deleted`);
    }

    function renderTemplateList() {
        const category = document.getElementById('mvu-template-category')?.value || 'character_lore';
        const listEl = document.getElementById('mvu-template-list');
        if (!listEl) return;

        const categoryTemplates = templates[category] || [];

        listEl.innerHTML = categoryTemplates.map((tmpl, idx) => `
            <div class="mvu-template-card">
                <div class="mvu-template-header">
                    <span class="mvu-template-name">${escapeHtml(tmpl.name)}</span>
                    <button class="mvu-btn mvu-btn-primary" onclick="MVU_POPUP.applyTemplate('${category}', ${idx})">Apply</button>
                </div>
                <div class="mvu-template-desc">${escapeHtml(tmpl.description)}</div>
                <div class="mvu-template-meta">${Object.keys(tmpl.variables).length} variables</div>
            </div>
        `).join('');
    }

    function applyTemplate(category, index) {
        const tmpl = templates[category]?.[index];
        if (!tmpl) return;

        if (window.MVU_STATE) {
            for (const [key, value] of Object.entries(tmpl.variables)) {
                window.MVU_STATE.set(key, value);
            }
        }

        loadVariables();
        setStatus(`Applied template: ${tmpl.name}`);
    }

    function loadSettings() {
        const settings = JSON.parse(localStorage.getItem('mvu_settings') || '{}');
        currentCharacterId = settings.characterId || 'default';
        syncEnabled = settings.syncEnabled !== false;
        pipelineEnabled = settings.pipelineEnabled !== false;

        const charInput = document.getElementById('mvu-character-id');
        if (charInput) charInput.value = currentCharacterId;

        const syncCheck = document.getElementById('mvu-sync-enabled');
        if (syncCheck) syncCheck.checked = syncEnabled;

        const pipeCheck = document.getElementById('mvu-pipeline-enabled');
        if (pipeCheck) pipeCheck.checked = pipelineEnabled;
    }

    function saveSettings() {
        const charInput = document.getElementById('mvu-character-id');
        const syncCheck = document.getElementById('mvu-sync-enabled');
        const pipeCheck = document.getElementById('mvu-pipeline-enabled');

        const settings = {
            characterId: charInput?.value || 'default',
            syncEnabled: syncCheck?.checked ?? true,
            pipelineEnabled: pipeCheck?.checked ?? true,
            lastTab: document.querySelector('.mvu-tab.active')?.dataset.tab || 'variables'
        };

        localStorage.setItem('mvu_settings', JSON.stringify(settings));
    }

    function savePreset() {
        const name = document.getElementById('mvu-preset-name')?.value?.trim();
        if (!name) {
            setStatus('Please enter a preset name', true);
            return;
        }

        const allVars = window.MVU_STATE ? window.MVU_STATE.getAll() : {};
        const presets = JSON.parse(localStorage.getItem('mvu_presets') || '{}');
        presets[name] = allVars;
        localStorage.setItem('mvu_presets', JSON.stringify(presets));

        document.getElementById('mvu-preset-name').value = '';
        loadPresetList();
        setStatus(`Preset "${name}" saved`);
    }

    function loadPresetList() {
        const listEl = document.getElementById('mvu-preset-list');
        if (!listEl) return;

        const presets = JSON.parse(localStorage.getItem('mvu_presets') || '{}');
        const presetNames = Object.keys(presets);

        if (presetNames.length === 0) {
            listEl.innerHTML = '<div style="color: #666; font-size: 13px;">No presets saved</div>';
            return;
        }

        listEl.innerHTML = presetNames.map(name => `
            <div class="mvu-preset-item">
                <span>${escapeHtml(name)} (${Object.keys(presets[name]).length} vars)</span>
                <button class="mvu-btn" onclick="MVU_POPUP.loadPreset('${escapeHtml(name)}')">Load</button>
            </div>
        `).join('');
    }

    function loadPreset(name) {
        const presets = JSON.parse(localStorage.getItem('mvu_presets') || '{}');
        const preset = presets[name];
        if (!preset) return;

        if (window.MVU_STATE) {
            window.MVU_STATE.clear();
            for (const [key, value] of Object.entries(preset)) {
                window.MVU_STATE.set(key, value);
            }
        }

        loadVariables();
        setStatus(`Loaded preset: ${name}`);
    }

    function clearAllVariables() {
        if (window.MVU_STATE) {
            window.MVU_STATE.clear();
        }
        loadVariables();
        setStatus('All variables cleared');
    }

    function setStatus(text, isError = false) {
        const statusEl = document.getElementById('mvu-status-text');
        if (statusEl) {
            statusEl.textContent = text;
            statusEl.style.color = isError ? '#f44336' : '#888';
        }
    }

    function escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function init() {
        loadTemplates();

        document.getElementById('mvu-popup-close')?.addEventListener('click', hidePopup);
        document.getElementById('mvu-popup-overlay')?.addEventListener('click', (e) => {
            if (e.target.id === 'mvu-popup-overlay') hidePopup();
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') hidePopup();
        });

        initTabs();

        document.getElementById('mvu-var-search')?.addEventListener('input', loadVariables);
        document.getElementById('mvu-add-var')?.addEventListener('click', addVariable);
        document.getElementById('mvu-var-save')?.addEventListener('click', saveVariable);

        document.getElementById('mvu-template-category')?.addEventListener('change', renderTemplateList);

        document.getElementById('mvu-sync-enabled')?.addEventListener('change', (e) => {
            syncEnabled = e.target.checked;
            saveSettings();
        });

        document.getElementById('mvu-pipeline-enabled')?.addEventListener('change', (e) => {
            pipelineEnabled = e.target.checked;
            saveSettings();
        });

        document.getElementById('mvu-save-preset')?.addEventListener('click', savePreset);
        document.getElementById('mvu-clear-all')?.addEventListener('click', clearAllVariables);

        loadSettings();
        loadPresetList();

        const savedTab = JSON.parse(localStorage.getItem('mvu_settings') || '{}').lastTab;
        if (savedTab) switchTab(savedTab);

        window.showMVUPopup = showPopup;
        window.hideMVUPopup = hidePopup;
    }

    return {
        init,
        showPopup,
        hidePopup,
        loadVariables,
        addVariable,
        editVariable,
        hideVarModal,
        saveVariable,
        deleteVariable,
        applyTemplate,
        savePreset,
        loadPreset,
        clearAllVariables,
        setStatus
    };
})();

$(function() {
    MVU_POPUP.init();
});