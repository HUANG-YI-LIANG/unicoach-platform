const fs = require('fs');
const files = [
  'app/api/push/subscribe/route.js',
  'public/sw.js',
  'lib/pushManager.js',
  'app/notifications/page.js',
  'components/PushPrompt.js',
  'app/api/user/unread-counts/route.js',
  'app/api/chat/route.js',
  'app/chat/page.js',
  'components/Header.js',
  'components/Navigation.js',
  'supabase_migration_push_notifications.sql'
];

let out = '# Push Notifications & IG-like Chat Updates\n\nHere are the updated files for the push notification system.\n\n';

files.forEach(f => {
  if (fs.existsSync(f)) {
    out += '## ' + f + '\n```javascript\n' + fs.readFileSync(f, 'utf8') + '\n```\n\n';
  }
});

fs.writeFileSync('D:/HermesSpace/MIKE_PUSH_SYNC.md', out, 'utf8');
console.log('Successfully created D:/HermesSpace/MIKE_PUSH_SYNC.md');
