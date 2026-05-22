function renderGame() {
    // Ensure main container has proper styling
    mainPhraseContainer.className = '';
    mainPhraseContainer.innerHTML = '';
    cluesContainer.innerHTML = '';
    
    const words = currentPhraseText.split(' ');
    words.forEach(word => {
        const wordBlock = document.createElement('div');
        wordBlock.className = 'word-block';
        for (let ch of word) {
            const tile = document.createElement('div');
            tile.className = 'tile';
            if (/[A-Z]/.test(ch)) {
                const num = currentLetterMap[ch];
                tile.innerHTML = `<input type="text" maxlength="1" class="tile-input" data-num="${num}" data-char="${ch}"><span>${num}</span>`;
            } else {
                tile.innerHTML = `<span style="font-size:24px; font-weight:bold; line-height:34px;">${ch}</span>`;
            }
            wordBlock.appendChild(tile);
        }
        mainPhraseContainer.appendChild(wordBlock);
    });
    
    currentClues.forEach(clue => {
        const row = document.createElement('div');
        row.className = 'clue-row';
        const textDiv = document.createElement('div');
        textDiv.className = 'clue-text';
        textDiv.innerHTML = `<strong>Definition:</strong> ${clue.definition}`;
        const inputsDiv = document.createElement('div');
        inputsDiv.className = 'clue-inputs';
        for (let letter of clue.word) {
            const tile = document.createElement('div');
            tile.className = 'tile';
            const num = currentLetterMap[letter];
            tile.innerHTML = `<input type="text" maxlength="1" class="tile-input" data-num="${num}" data-char="${letter}"><span>${num}</span>`;
            inputsDiv.appendChild(tile);
        }
        row.appendChild(textDiv);
        row.appendChild(inputsDiv);
        cluesContainer.appendChild(row);
    });
    
    attachSyncAndWinDetection();
}
