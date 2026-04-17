import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  "https://sudwmlrfhbopkgisvnqv.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1ZHdtbHJmaGJvcGtnaXN2bnF2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTY2MDk0NSwiZXhwIjoyMDkxMjM2OTQ1fQ.zK1JTdpPP6w9488tVC-4Ok8ZVVb7voxjLlEA0nwtLE0"
);

async function inspect() {
  const { data, error } = await supabase.from('bookings').select('*').limit(1);
  if (data && data.length > 0) {
    console.log('Bookings columns:', Object.keys(data[0]));
  } else {
    // If table is empty, we can try to get column names from another way or just assume it's missing if we can't find it
    console.log('No data in bookings to inspect columns. Error:', error);
  }
}
inspect();
