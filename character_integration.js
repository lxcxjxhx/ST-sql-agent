const MVU_CHARACTER = (function() {
    let currentCharacterId = 'default';
    let characterData = null;

    function getCurrentCharacterId() {
        try {
            if (typeof character_id !== 'undefined' && character_id) {
                currentCharacterId = character_id;
            } else if (typeof chat_metadata !== 'undefined' && chat_metadata?.character_id) {
                currentCharacterId = chat_metadata.character_id;
            } else if (typeof localStorage !== 'undefined') {
                const savedChar = localStorage.getItem('selectedCharacter');
                if (savedChar) {
                    currentCharacterId = savedChar;
                }
            }
        } catch (e) {
            console.warn('Could not detect character:', e);
        }

        return currentCharacterId || 'default';
    }

    function setCurrentCharacterId(id) {
        currentCharacterId = id || 'default';
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem('mvu_current_character', currentCharacterId);
        }
        onCharacterChanged(currentCharacterId);
    }

    function onCharacterChanged(newCharacterId) {
        console.log('MVU: Character changed to:', newCharacterId);

        if (typeof window.MVU_STATE !== 'undefined' && window.MVU_STATE) {
            console.log('MVU: Current state keys:', window.MVU_STATE.keys());
        }

        if (typeof eventSource !== 'undefined') {
            eventSource.emit(event_types.CHAT_CHANGED, { characterId: newCharacterId });
        }
    }

    function extractLoreFromCharacterCard(characterCard) {
        if (!characterCard) return [];

        const variables = [];

        if (characterCard.name) {
            variables.push({ key: 'character_name', value: characterCard.name, type: 'lore' });
        }

        if (characterCard.description) {
            variables.push({ key: 'character_description', value: characterCard.description.substring(0, 500), type: 'lore' });
        }

        if (characterCard.personality) {
            variables.push({ key: 'character_personality', value: characterCard.personality, type: 'lore' });
        }

        if (characterCard.background) {
            variables.push({ key: 'character_background', value: characterCard.background, type: 'lore' });
        }

        if (characterCard.mes_example) {
            variables.push({ key: 'character_example_message', value: characterCard.mes_example, type: 'lore' });
        }

        if (characterCard.world && characterCard.world !== 'none') {
            variables.push({ key: 'character_world', value: characterCard.world, type: 'world' });
        }

        if (characterCard.creator && characterCard.creator !== 'anonymous') {
            variables.push({ key: 'character_creator', value: characterCard.creator, type: 'meta' });
        }

        if (characterCard.tags && Array.isArray(characterCard.tags)) {
            variables.push({ key: 'character_tags', value: characterCard.tags.join(', '), type: 'meta' });
        }

        return variables;
    }

    function importCharacterLore(characterCard) {
        const extracted = extractLoreFromCharacterCard(characterCard);

        if (typeof window.MVU_STATE !== 'undefined' && window.MVU_STATE) {
            for (const v of extracted) {
                window.MVU_STATE.set(v.key, v.value);
            }
        }

        return {
            success: true,
            imported: extracted.length,
            variables: extracted
        };
    }

    function getCharacterVariables(characterId) {
        const targetCharId = characterId || getCurrentCharacterId();

        if (typeof window.MVU_STATE === 'undefined' || !window.MVU_STATE) {
            return [];
        }

        return window.MVU_STATE.keys()
            .filter(k => k.startsWith(`${targetCharId}:`))
            .map(k => ({
                key: k,
                value: window.MVU_STATE.get(k)
            }));
    }

    function setCharacterVariable(key, value, characterId) {
        const targetCharId = characterId || getCurrentCharacterId();
        const scopedKey = `${targetCharId}:${key}`;

        if (typeof window.MVU_STATE !== 'undefined' && window.MVU_STATE) {
            window.MVU_STATE.set(scopedKey, value);
        }

        return { key: scopedKey, value };
    }

    function getCharacterContext() {
        return {
            characterId: getCurrentCharacterId(),
            timestamp: new Date().toISOString(),
            variableCount: typeof window.MVU_STATE !== 'undefined' ? window.MVU_STATE.keys().length : 0
        };
    }

    function init() {
        currentCharacterId = getCurrentCharacterId();

        if (typeof localStorage !== 'undefined') {
            localStorage.setItem('mvu_current_character', currentCharacterId);
        }

        if (typeof eventSource !== 'undefined') {
            try {
                eventSource.on(event_types.CHARACTER_ACTIVATED, (data) => {
                    if (data?.character_id) {
                        setCurrentCharacterId(data.character_id);
                    }
                });
            } catch (e) {
                console.warn('Could not subscribe to CHARACTER_ACTIVATED:', e);
            }
        }

        console.log('MVU Character Integration initialized for:', currentCharacterId);
    }

    return {
        init,
        getCurrentCharacterId,
        setCurrentCharacterId,
        extractLoreFromCharacterCard,
        importCharacterLore,
        getCharacterVariables,
        setCharacterVariable,
        getCharacterContext
    };
})();

$(function() {
    MVU_CHARACTER.init();
});