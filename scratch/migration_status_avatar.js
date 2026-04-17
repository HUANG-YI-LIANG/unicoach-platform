const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function migrate() {
  console.log('🚀 Starting Database Migration...');

  const sql = `
    -- 1. Rename column in coaches table
    ALTER TABLE coaches RENAME COLUMN verification_status TO approval_status;

    -- 2. Update users table with avatar_url
    ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;

    -- 3. Update coaches constraints
    -- First, try to drop any existing status check constraint (it might have a default name)
    DO $$ 
    BEGIN 
      BEGIN
        ALTER TABLE coaches DROP CONSTRAINT IF EXISTS coaches_verification_status_check;
      EXCEPTION WHEN OTHERS THEN 
        NULL;
      END;
    END $$;

    ALTER TABLE coaches ADD CONSTRAINT coaches_approval_status_check 
    CHECK (approval_status IN ('pending', 'approved', 'rejected', 'suspended'));
  `;

  const { data, error } = await supabase.rpc('exec_sql', { sql });

  if (error) {
    console.error('❌ Migration failed:', error.message);
  } else {
    console.log('✅ Migration successful!');
  }
}

migrate();
