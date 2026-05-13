import fs from 'fs';

const files = [
  'supabase_migration_referral_code.sql',
  'supabase_migration_booking_safety.sql',
  'supabase_migration_booking_completion.sql',
  'supabase_migration_cancel_fault.sql'
];

let out = '';
for (const f of files) {
  out += '-- ' + f + '\n';
  out += fs.readFileSync(f, 'utf8') + '\n\n';
}

fs.writeFileSync('consolidated_migrations.sql', out, 'utf8');
console.log('Fixed consolidated_migrations.sql');
