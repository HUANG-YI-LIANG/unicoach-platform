$URL = "https://sudwmlrfhbopkgisvnqv.supabase.co"
$ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1ZHdtbHJmaGJvcGtnaXN2bnF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2NjA5NDUsImV4cCI6MjA5MTIzNjk0NX0.pZiNap7DlbSvjM6593P8TL8xluD7LoYoN1tMUqOn_VQ"
$ROLE = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1ZHdtbHJmaGJvcGtnaXN2bnF2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTY2MDk0NSwiZXhwIjoyMDkxMjM2OTQ1fQ.zK1JTdpPP6w9488tVC-4Ok8ZVVb7voxjLlEA0nwtLE0"
$JWT = "super_secret_key_for_this_demo_only_in_real_app_use_env"

npx.cmd vercel --prod --yes --force `
  --build-env NEXT_PUBLIC_SUPABASE_URL="$URL" `
  --env NEXT_PUBLIC_SUPABASE_URL="$URL" `
  --build-env NEXT_PUBLIC_SUPABASE_ANON_KEY="$ANON" `
  --env NEXT_PUBLIC_SUPABASE_ANON_KEY="$ANON" `
  --build-env SUPABASE_SERVICE_ROLE_KEY="$ROLE" `
  --env SUPABASE_SERVICE_ROLE_KEY="$ROLE" `
  --build-env JWT_SECRET="$JWT" `
  --env JWT_SECRET="$JWT"
