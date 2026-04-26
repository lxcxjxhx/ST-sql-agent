const PREFERENCE_PATTERNS = [
    { regex: /I prefer ([^.,]+)/i, key: 'preference_{attr}', attrIndex: 1 },
    { regex: /I like ([^.,]+)/i, key: 'preference_{attr}', attrIndex: 1 },
    { regex: /my favorite is ([^.,]+)/i, key: 'favorite_{attr}', attrIndex: 1 },
    { regex: /I love ([^.,]+)/i, key: 'loves_{attr}', attrIndex: 1 },
    { regex: /我喜欢([^.,]+)/i, key: 'preference_zh_{attr}', attrIndex: 1 },
    { regex: /我喜欢(.+)手表/i, key: 'watch_preference', attrIndex: 0 }
];

const FACT_PATTERNS = [
    { regex: /I am ([^.,]+)/i, key: 'is_{attr}', attrIndex: 1 },
    { regex: /I have ([^.,]+)/i, key: 'has_{attr}', attrIndex: 1 },
    { regex: /I('m| am) a(?:n)? ([^.,]+)/i, key: 'identity_{attr}', attrIndex: 2 },
    { regex: /我是([^.,]+)/i, key: 'identity_zh_{attr}', attrIndex: 1 }
];

const NEGATIVE_PATTERNS = [
    { regex: /I hate ([^.,]+)/i, key: 'dislikes_{attr}', attrIndex: 1 },
    { regex: /I don't like ([^.,]+)/i, key: 'dislikes_{attr}', attrIndex: 1 },
    { regex: /I dislike ([^.,]+)/i, key: 'dislikes_{attr}', attrIndex: 1 },
    { regex: /I can't stand ([^.,]+)/i, key: 'intolerant_{attr}', attrIndex: 1 },
    { regex: /I dislike (.+)手表/i, key: 'watch_dislikes', attrIndex: 0 }
];

function extractAttributes(text) {
    const attributes = ['color', 'watch', 'food', 'music', 'movie', 'book', 'person', 'place', 'thing'];
    const found = [];

    for (const attr of attributes) {
        if (text.toLowerCase().includes(attr)) {
            found.push(attr);
        }
    }

    return found;
}

function sanitizeKey(key) {
    return key.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
}

function extractFromMessage(message) {
    const results = [];

    const allPatterns = [
        ...PREFERENCE_PATTERNS.map(p => ({ ...p, type: 'preference' })),
        ...FACT_PATTERNS.map(p => ({ ...p, type: 'fact' })),
        ...NEGATIVE_PATTERNS.map(p => ({ ...p, type: 'negative' }))
    ];

    for (const pattern of allPatterns) {
        const match = message.match(pattern.regex);
        if (match) {
            const value = match[pattern.attrIndex]?.trim();
            const attributes = extractAttributes(value || message);

            let key = pattern.key;

            if (attributes.length > 0) {
                key = key.replace('{attr}', attributes[0]);
            } else {
                const words = value?.split(/\s+/) || [];
                if (words.length > 0 && words[0].length > 2) {
                    key = key.replace('{attr}', sanitizeKey(words[0]));
                }
            }

            if (key.includes('{attr}')) continue;

            results.push({
                key: sanitizeKey(key),
                value: value,
                type: pattern.type,
                confidence: 0.8,
                source: 'ai_extraction',
                matchedPattern: pattern.regex.source
            });
        }
    }

    return results;
}

function extractSimplePatterns(message) {
    const results = [];

    const simpleRules = [
        { pattern: /喜欢(.{2,10})(?:手表)?/i, key: 'watch_style', extract: m => m[1] },
        { pattern: /讨厌(.{2,10})/i, key: 'dislikes', extract: m => m[1] },
        { pattern: /prefer ([a-z]+(?: [a-z]+)?)/i, key: 'preference_general', extract: m => m[1] },
        { pattern: /hate ([a-z]+(?: [a-z]+)?)/i, key: 'dislikes_general', extract: m => m[1] }
    ];

    for (const rule of simpleRules) {
        const match = message.match(rule.pattern);
        if (match) {
            results.push({
                key: sanitizeKey(rule.key),
                value: rule.extract(match),
                type: 'simple_extraction',
                confidence: 0.6,
                source: 'pattern_match',
                matchedPattern: rule.pattern.source
            });
        }
    }

    return results;
}

function deduplicateResults(results) {
    const seen = new Map();

    for (const result of results) {
        if (!seen.has(result.key)) {
            seen.set(result.key, result);
        } else {
            const existing = seen.get(result.key);
            if (result.confidence > existing.confidence) {
                seen.set(result.key, result);
            }
        }
    }

    return Array.from(seen.values());
}

function extractVariables(message) {
    const extracted = extractFromMessage(message);
    const simple = extractSimplePatterns(message);
    const combined = [...extracted, ...simple];
    const deduplicated = deduplicateResults(combined);

    return deduplicated;
}

module.exports = {
    extractVariables,
    extractFromMessage,
    extractSimplePatterns,
    sanitizeKey,
    PREFERENCE_PATTERNS,
    FACT_PATTERNS,
    NEGATIVE_PATTERNS
};