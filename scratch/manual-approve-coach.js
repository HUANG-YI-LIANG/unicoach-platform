const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://sudwmlrfhbopkgisvnqv.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1ZHdtbHJmaGJvcGtnaXN2bnF2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTY2MDk0NSwiZXhwIjoyMDkxMjM2OTQ1fQ.zK1JTdpPP6w9488tVC-4Ok8ZVVb7voxjLlEA0nwtLE0';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function approveCoach(email, fileId, adminId) {
  console.log(`Approving coach: ${email} (File ID: ${fileId})`);
  
  // 1. Get User ID
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id')
    .eq('email', email.toLowerCase())
    .single();
    
  if (userError || !user) {
    console.error('User not found:', userError);
    return;
  }

  const userId = user.id;

  // 2. Update user_files
  const { error: fileError } = await supabase
    .from('user_files')
    .update({
      verification_status: 'approved',
      reviewed_by: adminId,
      reviewed_at: new Date().toISOString()
    })
    .eq('id', fileId);
    
  if (fileError) {
    console.error('Error updating user_files:', fileError);
    return;
  }
  
  // 3. Update coaches table
  const { error: coachError } = await supabase
    .from('coaches')
    .update({
      verification_status: 'approved',
      verified_at: new Date().toISOString(),
      verified_by: adminId
    })
    .eq('user_id', userId);
    
  if (coachError) {
    console.error('Error updating coaches table:', coachError);
    return;
  }
  
  // 4. Audit Log
  await supabase.from('audit_logs').insert([{
     action: 'FILE_APPROVED',
     actor_role: 'admin',
     target_id: fileId,
     target_type: 'file',
     details: JSON.stringify({ reason: 'Manual Script Approval', user_id: userId })
  }]);

  console.log('Successfully approved coach and synchronized status.');
}

const targetEmail = 'coach_verify_v1_v3@example.com';
const fileId = 'bd86c880-56c6-44d3-b9ed-92240681ee31';
const adminId = 'd59ebe7c-5223-4e81-a42f-a270dff72aab'; // Correct ID of admin@test.com

approveCoach(targetEmail, fileId, adminId);
