const fs = require('fs');
const path = require('path');

const files = [
  'components/Navigation.js'
];

for (const f of files) {
  const p = path.join(__dirname, '..', f);
  if (fs.existsSync(p)) {
    let content = fs.readFileSync(p, 'utf8');
    // Remove backslashes before backticks and dollar signs
    content = content.replace(/\\`/g, '`');
    content = content.replace(/\\\$/g, '$');
    fs.writeFileSync(p, content);
    console.log('Fixed', f);
  } else {
    console.log('Not found', f);
  }
}
