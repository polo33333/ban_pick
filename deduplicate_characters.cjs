const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'character_local.json');

try {
    const data = fs.readFileSync(filePath, 'utf8');
    const characters = JSON.parse(data);
    const newCharacters = {};
    const seenEn = new Set();
    let removedCount = 0;

    for (const [id, char] of Object.entries(characters)) {
        if (!seenEn.has(char.en)) {
            seenEn.add(char.en);
            char.isActive = true;
            newCharacters[id] = char;
        } else {
            console.log(`Removing duplicate: ${char.en} (ID: ${id})`);
            removedCount++;
        }
    }

    fs.writeFileSync(filePath, JSON.stringify(newCharacters, null, 2), 'utf8');
    console.log(`Processed ${Object.keys(characters).length} entries.`);
    console.log(`Removed ${removedCount} duplicates.`);
    console.log(`Saved ${Object.keys(newCharacters).length} entries to ${filePath}`);

} catch (err) {
    console.error('Error processing file:', err);
}
