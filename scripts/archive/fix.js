const fs = require('fs');
const path = require('path');
function walk(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const p = path.join(dir, file);
    const stat = fs.statSync(p);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.next') {
        walk(p);
      }
    } else if (p.endsWith('.js')) {
      let content = fs.readFileSync(p, 'utf8');
      if (content.includes('\`')) {
        content = content.replace(/\`/g, '`');
        fs.writeFileSync(p, content);
        console.log('Fixed', p);
      }
    }
  }
}
walk('.');
