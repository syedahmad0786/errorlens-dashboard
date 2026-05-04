const fs = require('fs');
const path = require('path');
const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'files-data.json'), 'utf8'));
for (const [filePath, b64] of Object.entries(data)) {
  const fullPath = path.join(__dirname, filePath);
  const dir = path.dirname(fullPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(fullPath, Buffer.from(b64, 'base64'));
  console.log('Wrote: ' + filePath);
}
console.log('Done! ' + Object.keys(data).length + ' files written.');
// Clean up
fs.unlinkSync(path.join(__dirname, 'files-data.json'));
fs.unlinkSync(path.join(__dirname, 'deploy.js'));
