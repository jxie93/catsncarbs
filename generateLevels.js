const fs = require('fs');
const path = require('path');

// Where your source levels are
const levelsDir = path.join(__dirname, '_assets/levels'); // adjust if needed
const outputFile = path.join(__dirname, '_assets/levels.json'); // JSON output

const levels = {};

// Read all level folders
fs.readdirSync(levelsDir, { withFileTypes: true }).forEach(dirent => {
  if (dirent.isDirectory()) {
    const levelFolder = dirent.name; // e.g., "level 1"
    const levelNumber = parseInt(levelFolder.replace(/\D/g, ""), 10);
    const levelPath = path.join(levelsDir, levelFolder); // use folder name, not number

    levels[levelNumber] = { ob: [], bd: [] };

    ['ob', 'bd'].forEach(type => {
      const typePath = path.join(levelPath, type);
      if (fs.existsSync(typePath)) {
        const files = fs.readdirSync(typePath)
          .filter(f => f.endsWith('.png'))
          .map(f => path.join('_assets/levels', levelFolder, type, f).replace(/\\/g, '/'));
        levels[levelNumber][type] = files;
      }
    });
  }
});

// Write JSON
fs.writeFileSync(outputFile, JSON.stringify(levels, null, 2));
console.log(`levels.json generated at ${outputFile}`);