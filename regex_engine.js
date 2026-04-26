const MVU_REGEX = (function() {
    const DEFAULT_PATTERNS = [
        {
            name: 'chinese_name',
            regex: /名字[是为]*(.+)/i,
            keyExtractor: (match) => ({ key: 'user_name', value: match[1].trim() }),
            description: '提取中文名字'
        },
        {
            name: 'chinese_age',
            regex: /(\d+)[岁年级]/,
            keyExtractor: (match) => ({ key: 'user_age', value: parseInt(match[1], 10) }),
            description: '提取中文年龄'
        },
        {
            name: 'chinese_preference',
            regex: /(?:喜欢|爱|偏好|钟爱)(.+?)[，,]?/g,
            keyExtractor: (match, index) => ({ key: `preference_${index + 1}`, value: match[1].trim() }),
            description: '提取中文偏好'
        },
        {
            name: 'chinese_dislike',
            regex: /(?:讨厌|不喜欢|厌恶|反感)(.+?)[，,]?/g,
            keyExtractor: (match, index) => ({ key: `dislike_${index + 1}`, value: match[1].trim() }),
            description: '提取中文不喜欢'
        },
        {
            name: 'english_name',
            regex: /(?:my name is|I am|I'm)\s*(.+)/i,
            keyExtractor: (match) => ({ key: 'user_name', value: match[1].trim() }),
            description: '提取英文名字'
        },
        {
            name: 'english_preference',
            regex: /(?:I prefer|I like|I love|my favorite is)\s*(.+?)(?:[.,]|and|$)/gi,
            keyExtractor: (match) => {
                const value = match[1].trim();
                const attr = value.split(/\s+/)[0].replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
                return { key: `preference_${attr}`, value };
            },
            description: '提取英文偏好'
        },
        {
            name: 'english_age',
            regex: /(?:I am|I'm|age is|aged?)\s*(\d+)/i,
            keyExtractor: (match) => ({ key: 'user_age', value: parseInt(match[1], 10) }),
            description: '提取英文年龄'
        },
        {
            name: 'status_update',
            regex: /(?:状态|status)[是为]*(.+)/i,
            keyExtractor: (match) => ({ key: 'current_status', value: match[1].trim() }),
            description: '提取状态更新'
        },
        {
            name: 'location',
            regex: /(?:在|位于|at|location is)\s*(.+?)(?:[。,.]|是|$)/gi,
            keyExtractor: (match) => ({ key: 'current_location', value: match[1].trim() }),
            description: '提取位置'
        },
        {
            name: 'mood',
            regex: /(?:感觉|觉得|心情|mood|feeling is)\s*(.+?)(?:[。,.]|是|$)/gi,
            keyExtractor: (match) => ({ key: 'current_mood', value: match[1].trim() }),
            description: '提取心情'
        }
    ];

    const customPatterns = [];
    let enabled = true;
    const STORAGE_KEY = 'mvu_regex_patterns';

    function loadCustomPatterns() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const patterns = JSON.parse(stored);
                customPatterns.length = 0;
                patterns.forEach(p => customPatterns.push(p));
            }
        } catch (e) {
            console.warn('MVU-Regex: Failed to load custom patterns:', e);
        }
    }

    function saveCustomPatterns() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(customPatterns));
        } catch (e) {
            console.warn('MVU-Regex: Failed to save custom patterns:', e);
        }
    }

    function addRegexPattern(name, regex, keyExtractor, options = {}) {
        const pattern = {
            name,
            regex: regex instanceof RegExp ? regex : new RegExp(regex, 'gi'),
            keyExtractor: typeof keyExtractor === 'function' ? keyExtractor : (match) => ({ key: name, value: match[0] }),
            description: options.description || '',
            enabled: options.enabled !== false,
            autoSync: options.autoSync !== false
        };

        const existingIndex = customPatterns.findIndex(p => p.name === name);
        if (existingIndex >= 0) {
            customPatterns[existingIndex] = pattern;
        } else {
            customPatterns.push(pattern);
        }

        saveCustomPatterns();
        console.log(`MVU-Regex: Added pattern "${name}"`);

        return { success: true, pattern };
    }

    function removeRegexPattern(name) {
        const index = customPatterns.findIndex(p => p.name === name);
        if (index >= 0) {
            customPatterns.splice(index, 1);
            saveCustomPatterns();
            return { success: true };
        }
        return { success: false, error: 'Pattern not found' };
    }

    function getAllPatterns() {
        return [...DEFAULT_PATTERNS, ...customPatterns.filter(p => p.enabled)];
    }

    function matchText(text) {
        if (!enabled || !text || typeof text !== 'string') {
            return [];
        }

        const results = [];
        const allPatterns = getAllPatterns();

        for (const pattern of allPatterns) {
            try {
                const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
                let match;

                while ((match = regex.exec(text)) !== null) {
                    const extracted = pattern.keyExtractor(match, results.length);

                    if (extracted && extracted.key) {
                        const result = {
                            patternName: pattern.name,
                            key: extracted.key,
                            value: extracted.value,
                            autoSync: pattern.autoSync,
                            confidence: 0.8
                        };

                        results.push(result);

                        if (result.autoSync && typeof window.MVU_STATE !== 'undefined') {
                            window.MVU_STATE.set(result.key, result.value);

                            if (typeof window.executeSql === 'function') {
                                const sql = `INSERT OR REPLACE INTO variable_state (variable_name, variable_value, character_id) VALUES (?, ?, ?)`;
                                window.executeSql(sql, [result.key, JSON.stringify(result.value), 'default']).catch(() => {});
                            }
                        }
                    }

                    if (!pattern.regex.global) break;
                }
            } catch (e) {
                console.warn(`MVU-Regex: Pattern "${pattern.name}" failed:`, e.message);
            }
        }

        if (results.length > 0) {
            console.log(`MVU-Regex: Extracted ${results.length} variables from text`);
        }

        return results;
    }

    function setEnabled(value) {
        enabled = value !== false;
        return enabled;
    }

    function isEnabled() {
        return enabled;
    }

    function getCustomPatterns() {
        return customPatterns.map(p => ({
            name: p.name,
            description: p.description,
            enabled: p.enabled,
            regex: p.regex.source
        }));
    }

    function togglePattern(name) {
        const pattern = customPatterns.find(p => p.name === name);
        if (pattern) {
            pattern.enabled = !pattern.enabled;
            saveCustomPatterns();
            return { success: true, enabled: pattern.enabled };
        }
        return { success: false, error: 'Pattern not found' };
    }

    loadCustomPatterns();

    window.MVU_REGEX = {
        addPattern: addRegexPattern,
        removePattern: removeRegexPattern,
        matchText,
        setEnabled,
        isEnabled,
        getCustomPatterns,
        getAllPatterns,
        togglePattern
    };

    return window.MVU_REGEX;
})();

$(function() {
    console.log('MVU-Regex module loaded');
});
