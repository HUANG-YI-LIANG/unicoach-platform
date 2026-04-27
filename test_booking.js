const fs = require('fs');
const envText = fs.readFileSync('.env.local', 'utf8');
envText.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) process.env[match[1]] = match[2];
});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function test() {
  const { data: users } = await supabase.from('users').select('id').limit(2);
  const userId = users[0].id;
  const coachId = users[1].id;

  const bookingsToInsert = [{
    user_id: userId,
    coach_id: coachId,
    expected_time: new Date().toISOString(),
    base_price: 1000,
    discount_amount: 0,
    final_price: 1000,
    deposit_paid: 300,
    platform_fee: 100,
    coach_payout: 900,
    grade: 'Test',
    gender: 'Male',
    attendees_count: 1,
    learning_status: 'New',
    coupon_id: null,
    coupon_discount: 0,
    status: 'pending_payment',
    series_id: null,
    recurrence_pattern: 'none',
    session_number: 1,
    duration_minutes: 60,
    payment_expires_at: new Date().toISOString(),
    plan_id: 'test-id',
    plan_title: 'Test Plan',
    plan_snapshot: '{}'
  }];

  const { data, error } = await supabase.from('bookings').insert(bookingsToInsert).select('id');
  if (error) console.log('INSERT ERROR:', error);
  else console.log('INSERT SUCCESS:', data);

  // also test chat rooms
  const { error: chatErr } = await supabase.from('chat_rooms').insert([{
    user_id: userId,
    coach_id: coachId,
    booking_id: data ? data[0].id : null
  }]);
  if (chatErr) console.log('CHAT ROOM ERROR:', chatErr);
  else console.log('CHAT ROOM SUCCESS');
}
test();
