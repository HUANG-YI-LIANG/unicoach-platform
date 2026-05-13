const fs = require('fs');
const files = [
  'app/api/auth/forgot-password/route.js',
  'app/api/auth/reset-password/route.js',
  'app/api/auth/login/route.js',
  'app/api/bookings/route.js',
  'app/api/coaches/route.js',
  'app/api/videos/feed/route.js',
  'app/api/reviews/route.js',
  'lib/safeLogging.js',
  'lib/coachPerformance.js',
  'tests/deep-hygiene.test.mjs'
];
files.forEach(f => {
  console.log('Copying ' + f);
  fs.copyFileSync('D:/HermesSpace/AMIKE/platform/' + f, 'D:/Codex/AMIKE/platform/' + f);
});
