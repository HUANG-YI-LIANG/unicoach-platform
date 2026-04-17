const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://sudwmlrfhbopkgisvnqv.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1ZHdtbHJmaGJvcGtnaXN2bnF2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTY2MDk0NSwiZXhwIjoyMDkxMjM2OTQ1fQ.zK1JTdpPP6w9488tVC-4Ok8ZVVb7voxjLlEA0nwtLE0';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function cleanup(email) {
  console.log(`Cleaning up user: ${email}`);
  
  // 1. Get User ID from Auth
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    console.error('Error listing users:', listError);
    return;
  }
  // 2. Get User ID from DB (in case Auth entry is missing)
  const { data: dbUsers, error: dbFetchError } = await supabase.from('users').select('id').eq('email', email.toLowerCase());
  const dbUser = dbUsers && dbUsers[0];
  
  const authUser = users.find(u => u.email === email.toLowerCase());
  const finalId = authUser?.id || dbUser?.id;

  if (!finalId) {
    console.log('User not found in Auth or DB.');
  } else {
    const userId = finalId;
    // 3. Delete from dependent tables
    console.log(`Deleting data for user ID: ${userId}...`);
    await supabase.from('terms_consents').delete().eq('user_id', userId);
    await supabase.from('coaches').delete().eq('user_id', userId);
    await supabase.from('audit_logs').delete().eq('actor_id', userId);
    
    // 4. Delete from users table
    const { error: dbError } = await supabase.from('users').delete().eq('id', userId);
    if (dbError) console.error('Error deleting from users table:', dbError);
    else console.log('Deleted from users table.');

    // 5. Delete from Auth
    if (authUser) {
      const { error: authError } = await supabase.auth.admin.deleteUser(authUser.id);
      if (authError) console.error('Error deleting from Auth:', authError);
      else console.log('Deleted from Auth.');
    }
  }
}

const targetEmail = process.argv[2] || 'user_verify_v1@example.com';
cleanup(targetEmail);
