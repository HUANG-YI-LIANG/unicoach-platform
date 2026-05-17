throw new Error('This is an example script. Copy it locally and provide secrets interactively. Do not commit real secrets.');

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

addEnv('NEXT_PUBLIC_SUPABASE_URL', 'YOUR_SUPABASE_URL');
addEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'YOUR_SUPABASE_ANON_KEY');
addEnv('SUPABASE_SERVICE_ROLE_KEY', 'YOUR_SUPABASE_SERVICE_ROLE_KEY');
addEnv('JWT_SECRET', 'YOUR_JWT_SECRET');

console.log('Finished pushing env vars.');
