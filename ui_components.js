const MVU_UI = (function() {
    const injectedPanels = new Map();
    const boundEvents = new Map();
    const modalFillers = new Map();

    const SOC_STYLES = `
        .mvu-panel {
            width: 100%;
            padding: 8px 10px;
            box-sizing: border-box;
            background: linear-gradient(135deg, #0a0e17 0%, #111827 100%);
            border: 1px solid #1e3a5f;
            border-radius: 6px;
            position: relative;
            overflow: hidden;
            color: #c8d6e5;
            font-family: 'Consolas', 'Courier New', monospace;
        }
        .mvu-panel::after {
            content: '';
            position: absolute;
            top: 0; left: 0; right: 0; height: 2px;
            background: linear-gradient(90deg, transparent, #00d4ff, transparent);
            animation: mvuScanLine 3s ease-in-out infinite;
            opacity: 0.4;
        }
        @keyframes mvuScanLine {
            0% { left: -100%; }
            50% { left: 100%; }
            100% { left: 100%; }
        }
        .mvu-panel-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 6px;
            border-bottom: 1px solid #1e3a5f;
            padding-bottom: 4px;
        }
        .mvu-panel-title {
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 2px;
            color: #00d4ff;
            text-shadow: 0 0 6px rgba(0,212,255,0.3);
        }
        .mvu-panel-datetime {
            font-size: 10px;
            color: #5a7a9a;
            letter-spacing: 1px;
        }
        .mvu-card {
            background: rgba(13, 27, 48, 0.7);
            border: 1px solid #1a2f4a;
            border-radius: 4px;
            padding: 5px 8px;
            flex: 1 1 0;
            min-width: 80px;
            position: relative;
            cursor: pointer;
            transition: border-color 0.2s, box-shadow 0.2s;
        }
        .mvu-card:hover {
            border-color: #00d4ff;
            box-shadow: 0 0 8px rgba(0,212,255,0.15);
        }
        .mvu-card-label {
            font-size: 8px;
            color: #5a7a9a;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 2px;
        }
        .mvu-card-value {
            font-size: 14px;
            font-weight: 700;
            letter-spacing: 1px;
        }
        .mvu-threat-low { color: #2ecc71; }
        .mvu-threat-medium { color: #f39c12; }
        .mvu-threat-high { color: #e74c3c; }
        .mvu-threat-critical { color: #ff0040; animation: mvuPulse 1.2s ease-in-out infinite; }
        @keyframes mvuPulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }
        .mvu-status-normal { color: #2ecc71; }
        .mvu-status-busy { color: #f39c12; }
        .mvu-status-emergency { color: #e74c3c; }
        .mvu-modal-overlay {
            display: none;
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.7);
            z-index: 99999;
            justify-content: center;
            align-items: center;
        }
        .mvu-modal-overlay.active {
            display: flex;
        }
        .mvu-modal-box {
            background: linear-gradient(135deg, #0d1b30 0%, #111827 100%);
            border: 1px solid #1e3a5f;
            border-radius: 8px;
            width: 90%;
            max-width: 520px;
            max-height: 80%;
            overflow-y: auto;
            padding: 16px 18px;
            color: #c8d6e5;
            font-family: 'Consolas', 'Courier New', monospace;
            box-shadow: 0 0 30px rgba(0,212,255,0.08);
            position: relative;
        }
        .mvu-modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid #1a2f4a;
            padding-bottom: 8px;
            margin-bottom: 10px;
        }
        .mvu-modal-title {
            font-size: 12px;
            font-weight: 700;
            letter-spacing: 2px;
            color: #00d4ff;
        }
        .mvu-modal-close {
            cursor: pointer;
            color: #5a7a9a;
            font-size: 14px;
            padding: 0 4px;
            transition: color 0.2s;
        }
        .mvu-modal-close:hover {
            color: #e74c3c;
        }
        .mvu-modal-body {
            font-size: 10px;
            line-height: 1.6;
        }
        .mvu-modal-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 4px;
        }
        .mvu-modal-table th {
            font-size: 8px;
            color: #5a7a9a;
            text-transform: uppercase;
            letter-spacing: 1px;
            text-align: left;
            padding: 3px 4px;
            border-bottom: 1px solid #1a2f4a;
        }
        .mvu-modal-table td {
            font-size: 9px;
            padding: 3px 4px;
            border-bottom: 1px solid rgba(26,47,74,0.4);
        }
        .mvu-modal-stat-row {
            display: flex;
            justify-content: space-between;
            padding: 4px 0;
            border-bottom: 1px solid rgba(26,47,74,0.3);
        }
        .mvu-modal-stat-label {
            color: #5a7a9a;
        }
        .mvu-modal-stat-value {
            font-weight: 700;
            color: #c8d6e5;
        }
        .mvu-empty {
            color: #2ecc71;
            font-size: 10px;
            padding: 8px 0;
            text-align: center;
        }
        .mvu-summary-item {
            display: flex;
            align-items: center;
            gap: 4px;
            font-size: 9px;
            color: #5a7a9a;
            cursor: pointer;
            padding: 2px 4px;
            border-radius: 3px;
            transition: background 0.2s;
        }
        .mvu-summary-item:hover {
            background: rgba(0,212,255,0.06);
        }
        .mvu-dot {
            display: inline-block;
            width: 6px;
            height: 6px;
            border-radius: 50%;
        }
        .mvu-dot-green { background: #2ecc71; }
        .mvu-dot-yellow { background: #f39c12; }
        .mvu-dot-red { background: #e74c3c; }
        .mvu-dot-cyan { background: #00d4ff; }
    `;

    let stylesInjected = false;

    function injectStyles() {
        if (stylesInjected) return;
        const styleEl = document.createElement('style');
        styleEl.id = 'mvu-ui-styles';
        styleEl.textContent = SOC_STYLES;
        document.head.appendChild(styleEl);
        stylesInjected = true;
    }

    function injectPanel(panelId, html, options = {}) {
        const { container = 'body', position = 'beforeend' } = options;

        injectStyles();

        let existingPanel = document.getElementById(panelId);
        if (existingPanel) {
            existingPanel.remove();
        }

        const containerEl = typeof container === 'string' ? document.querySelector(container) : container;
        if (!containerEl) {
            console.error(`MVU-UI: Container not found: ${container}`);
            return { success: false, error: 'Container not found' };
        }

        const wrapper = document.createElement('div');
        wrapper.id = `${panelId}-wrapper`;
        wrapper.innerHTML = html;

        if (position === 'beforeend') {
            containerEl.appendChild(wrapper);
        } else if (position === 'afterbegin') {
            containerEl.insertBefore(wrapper, containerEl.firstChild);
        } else {
            containerEl.insertAdjacentHTML(position, html);
        }

        injectedPanels.set(panelId, {
            id: panelId,
            wrapper: wrapper,
            container: containerEl
        });

        return { success: true, panelId };
    }

    function removePanel(panelId) {
        const panel = injectedPanels.get(panelId);
        if (panel && panel.wrapper) {
            panel.wrapper.remove();
            injectedPanels.delete(panelId);
            return { success: true };
        }
        return { success: false, error: 'Panel not found' };
    }

    function openModal(modalId, fillFn) {
        let modal = document.getElementById(modalId);
        if (!modal) {
            console.warn(`MVU-UI: Modal ${modalId} not found, creating default`);
            const defaultModal = `
                <div id="${modalId}" class="mvu-modal-overlay">
                    <div class="mvu-modal-box">
                        <div class="mvu-modal-header">
                            <span class="mvu-modal-title">详情</span>
                            <span class="mvu-modal-close" onclick="MVU_UI.closeModal('${modalId}')">&times;</span>
                        </div>
                        <div class="mvu-modal-body" id="${modalId}-body"></div>
                    </div>
                </div>`;
            document.body.insertAdjacentHTML('beforeend', defaultModal);
            modal = document.getElementById(modalId);

            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    MVU_UI.closeModal(modalId);
                }
            });
        }

        if (typeof fillFn === 'function') {
            const bodyEl = document.getElementById(`${modalId}-body`);
            if (bodyEl) {
                fillFn(bodyEl);
            }
        }

        modal.classList.add('active');
        modalFillers.set(modalId, fillFn);

        return { success: true, modalId };
    }

    function closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
            return { success: true };
        }
        return { success: false, error: 'Modal not found' };
    }

    function bindPanelEvents(panelId, eventsMap) {
        const panel = document.getElementById(panelId);
        if (!panel) {
            return { success: false, error: 'Panel not found' };
        }

        const bindings = [];
        for (const [selector, handler] of Object.entries(eventsMap)) {
            const elements = panel.querySelectorAll(selector);
            elements.forEach(el => {
                el.addEventListener('click', handler);
                bindings.push({ element: el, selector, handler });
            });
        }

        boundEvents.set(panelId, bindings);
        return { success: true, bindingsCount: bindings.length };
    }

    function unbindPanelEvents(panelId) {
        const bindings = boundEvents.get(panelId);
        if (bindings) {
            bindings.forEach(({ element, handler }) => {
                element.removeEventListener('click', handler);
            });
            boundEvents.delete(panelId);
        }
        return { success: true };
    }

    function getPanelElement(panelId, selector) {
        const panel = document.getElementById(panelId);
        if (!panel) return null;
        return panel.querySelector(selector);
    }

    function updatePanelContent(panelId, selector, content) {
        const el = getPanelElement(panelId, selector);
        if (el) {
            el.innerHTML = content;
            return { success: true };
        }
        return { success: false, error: 'Element not found' };
    }

    window.MVU_UI = {
        injectPanel,
        removePanel,
        openModal,
        closeModal,
        bindPanelEvents,
        unbindPanelEvents,
        getPanelElement,
        updatePanelContent,
        injectStyles
    };

    return window.MVU_UI;
})();

$(function() {
    console.log('MVU-UI module loaded');
});
