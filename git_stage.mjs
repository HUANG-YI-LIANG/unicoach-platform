import { execSync } from 'child_process';
const files = [
  'app/api/admin/coaches/[id]/commission/route.js',
  'app/api/admin/coaches/route.js',
  'app/api/admin/notifications/route.js',
  'app/api/admin/settings/route.js',
  'app/api/admin/settlements/[id]/route.js',
  'app/api/admin/settlements/route.js',
  'app/api/admin/users/[id]/route.js',
  'app/api/admin/users/route.js',
  'app/api/admin/verify/route.js',
  'app/api/ai/generate-report/route.js',
  'app/api/ai/match/route.js',
  'app/api/auth/forgot-password/route.js',
  'app/api/auth/login/route.js',
  'app/api/auth/logout/route.js',
  'app/api/auth/profile/route.js',
  'app/api/auth/register/route.js',
  'app/api/auth/reset-password/route.js',
  'app/api/auth/signout/route.js',
  'app/api/bookings/[id]/adjust-price/route.js',
  'app/api/bookings/[id]/confirm-payment/route.js',
  'app/api/bookings/[id]/report-payment/route.js',
  'app/api/bookings/[id]/status/route.js',
  'app/api/bookings/route.js',
  'app/api/chat/rooms/[id]/route.js',
  'app/api/chat/rooms/route.js',
  'app/api/chat/route.js',
  'app/api/coach/availability/exceptions/[id]/route.js',
  'app/api/coach/availability/exceptions/route.js',
  'app/api/coach/availability/route.js',
  'app/api/coach/plans/[id]/route.js',
  'app/api/coach/plans/route.js',
  'app/api/coaches/[id]/route.js',
  'app/api/coaches/route.js',
  'app/api/files/upload/route.js',
  'app/api/notifications/route.js',
  'app/api/reports/route.js',
  'app/api/reviews/route.js',
  'app/api/user/apply-code/route.js',
  'app/api/user/use-coupon/route.js',
  'app/api/videos/feed/route.js',
  'app/api/videos/interact/route.js',
  'app/api/videos/presigned-url/route.js',
  'app/api/videos/save-metadata/route.js',
  'app/api/videos/upload/route.js',
  'app/api/videos/video-link/route.js',
  'app/dashboard/coach/page.js',
  'components/Header.js',
  'components/VideoUpload.js',
  'components/CoachOnboardingTasks.js',
  'lib/auth.js',
  'lib/bookingSecurity.js',
  'lib/bookingWorkflow.js',
  'lib/coachPerformance.js',
  'lib/safeLogging.js',
  'supabase_migration_anti_cheat.sql',
  'supabase_migration_booking_completion.sql',
  'supabase_migration_booking_safety.sql',
  'supabase_migration_cancel_fault.sql',
  'supabase_migration_coach_performance.sql',
  'supabase_migration_referral_code.sql',
  'supabase_migration_tasks.sql',
  'tests/auth-flow.test.mjs',
  'tests/booking-workflow.test.mjs',
  'tests/settlement-rules.test.mjs',
  'tests/admin-users-privacy.test.mjs',
  'tests/booking-api-privacy.test.mjs',
  'tests/booking-completion-hardening.test.mjs',
  'tests/booking-performance-reliability.test.mjs',
  'tests/booking-safety-hardening.test.mjs',
  'tests/coach-dashboard-data.test.mjs',
  'tests/deep-hygiene.test.mjs',
  'tests/deployment-hygiene.test.mjs',
  'tests/profile-privacy.test.mjs',
  'tests/reports-hardening.test.mjs',
  'tests/video-api-security.test.mjs',
  // Hermes missed these new Push Notification and Chat files we just created:
  'app/api/push/subscribe/route.js',
  'public/sw.js',
  'lib/pushManager.js',
  'app/notifications/page.js',
  'components/PushPrompt.js',
  'app/api/user/unread-counts/route.js',
  'app/chat/page.js',
  'components/Navigation.js',
  'supabase_migration_push_notifications.sql'
];

try {
  console.log('Resetting git index...');
  execSync('git reset HEAD');
  
  console.log('Staging official files...');
  files.forEach(f => {
    try {
      execSync(`git add "${f}"`);
    } catch(e) {
      console.warn(`Could not stage: ${f}`);
    }
  });

  const status = execSync('git status --short').toString();
  console.log('\n--- Git Status ---');
  console.log(status);
} catch(e) {
  console.error(e.toString());
}
