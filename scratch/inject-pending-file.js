const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://sudwmlrfhbopkgisvnqv.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1ZHdtbHJmaGJvcGtnaXN2bnF2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTY2MDk0NSwiZXhwIjoyMDkxMjM2OTQ1fQ.zK1JTdpPP6w9488tVC-4Ok8ZVVb7voxjLlEA0nwtLE0';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function inject(email) {
  console.log(`Injecting pending file for: ${email}`);
  
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
  
  // 2. Insert into user_files
  const fileData = {
    user_id: user.id,
    file_type: 'student_id',
    original_filename: 'mock_student_id.png',
    stored_filename: 'mock_student_id_1776007891621.png',
    file_size: 102400,
    mime_type: 'image/webp',
    thumbnail_url: '/uploads/verification/thumbnail_mock_student_id.webp',
    compressed_url: '/uploads/verification/medium_mock_student_id.webp',
    verification_status: 'pending',
    created_at: new Date().toISOString()
  };
  
  const { data: file, error: fileError } = await supabase
    .from('user_files')
    .insert([fileData])
    .select()
    .single();
    
  if (fileError) {
    console.error('Error injecting file:', fileError);
  } else {
    console.log('Successfully injected file:', file.id);
  }
}

const targetEmail = process.argv[2] || 'coach_verify_v1_v3@example.com';
inject(targetEmail);
