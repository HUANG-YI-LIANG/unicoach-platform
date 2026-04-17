const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://sudwmlrfhbopkgisvnqv.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1ZHdtbHJmaGJvcGtnaXN2bnF2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTY2MDk0NSwiZXhwIjoyMDkxMjM2OTQ1fQ.zK1JTdpPP6w9488tVC-4Ok8ZVVb7voxjLlEA0nwtLE0';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function resetAdmin() {
  const email = 'admin@test.com';
  const newPassword = 'admin123';
  
  console.log(`Resetting admin password for: ${email}`);
  
  // 1. Find user in Auth
  const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();
  const adminUser = users.find(u => u.email === email);
  
  if (!adminUser) {
    console.error('Admin user not found in Auth.');
    return;
  }
  
  // 2. Update Auth password
  const { error: updateError } = await supabase.auth.admin.updateUserById(
    adminUser.id,
    { password: newPassword }
  );
  
  if (updateError) {
    console.error('Error updating password:', updateError);
    return;
  }
  
  console.log('Successfully reset admin password to admin123');
}

resetAdmin();
