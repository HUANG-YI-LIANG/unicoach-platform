const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = 'https://sudwmlrfhbopkgisvnqv.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1ZHdtbHJmaGJvcGtnaXN2bnF2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTY2MDk0NSwiZXhwIjoyMDkxMjM2OTQ1fQ.zK1JTdpPP6w9488tVC-4Ok8ZVVb7voxjLlEA0nwtLE0';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testUpload() {
  console.log('Testing upload to Supabase Storage...');
  
  // Create a dummy buffer
  const buffer = Buffer.from('test image content');
  const filename = `test_${Date.now()}.txt`;
  
  const { data, error } = await supabase.storage
    .from('avatars')
    .upload(filename, buffer, {
      contentType: 'text/plain',
      upsert: true
    });
    
  if (error) {
    console.error('❌ Upload failed:', error.message);
  } else {
    console.log('✅ Upload successful:', data.path);
    
    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(filename);
      
    console.log('🔗 Public URL:', publicUrl);
  }
}

testUpload();
