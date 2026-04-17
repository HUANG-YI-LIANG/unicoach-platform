const { spawnSync } = require('child_process');

function addEnv(key, val) {
  console.log('Adding ' + key + '...');
  spawnSync('npx.cmd', ['vercel', 'env', 'rm', key, 'production', '--yes']);
  spawnSync('npx.cmd', ['vercel', 'env', 'rm', key, 'preview', '--yes']);
  spawnSync('npx.cmd', ['vercel', 'env', 'rm', key, 'development', '--yes']);
  
  const envs = ['production', 'preview', 'development'];
  for (const e of envs) {
    const p = spawnSync('npx.cmd', ['vercel', 'env', 'add', key, e], { 
      input: val,
      encoding: 'utf-8'
    });
  }
}

addEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://sudwmlrfhbopkgisvnqv.supabase.co');
addEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1ZHdtbHJmaGJvcGtnaXN2bnF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2NjA5NDUsImV4cCI6MjA5MTIzNjk0NX0.pZiNap7DlbSvjM6593P8TL8xluD7LoYoN1tMUqOn_VQ');
addEnv('SUPABASE_SERVICE_ROLE_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1ZHdtbHJmaGJvcGtnaXN2bnF2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTY2MDk0NSwiZXhwIjoyMDkxMjM2OTQ1fQ.zK1JTdpPP6w9488tVC-4Ok8ZVVb7voxjLlEA0nwtLE0');
addEnv('JWT_SECRET', 'super_secret_key_for_this_demo_only_in_real_app_use_env');

console.log('Finished pushing env vars.');
