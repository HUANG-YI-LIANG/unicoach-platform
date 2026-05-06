const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Read .env.local to get Supabase credentials
const envPath = '.env.local';
let url = '';
let key = '';

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split('\n');
  for (const line of lines) {
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) url = line.split('=')[1].trim();
    if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) key = line.split('=')[1].trim();
  }
}

const supabase = createClient(url, key);

async function run() {
  try {
    console.log('Fetching a user and a coach...');
    // 1. Get a random user who is not a coach
    const { data: users } = await supabase.from('users').select('*').eq('role', 'user').limit(1);
    const user = users?.[0];
    
    // 2. Get a random coach
    const { data: coaches } = await supabase.from('coaches').select('*').limit(1);
    const coach = coaches?.[0];

    if (!user || !coach) {
      console.log('No user or coach found.');
      return;
    }

    console.log('Coach keys:', Object.keys(coach));
    const coachId = coach.id || coach.user_id;

    console.log(`Setting user ${user.id} to Lv4`);
    // Student level is stored directly in users table (level: 4)
    await supabase.from('users').update({ level: 4 }).eq('id', user.id);

    console.log(`Setting coach ${coachId} to Lv4 by inserting mock completed bookings and ratings...`);
    // Coach level is dynamic, need to meet:
    // monthly_lessons >= 6
    // average_rating >= 4.8
    // average_response_time <= 15
    // completion_rate >= 98
    // malicious_cancels = 0
    // intro_video_uploaded = true

    // Set intro video
    const { data: vids } = await supabase.from('coach_videos').select('*').eq('coach_id', coachId);
    if (!vids || vids.length === 0) {
      await supabase.from('coach_videos').insert({
        coach_id: coachId,
        video_url: 'https://example.com/video.mp4'
      });
    }

    // Insert 10 completed bookings in the last 30 days
    const recentDate = new Date();
    recentDate.setDate(recentDate.getDate() - 5);
    const bookingsToInsert = Array.from({ length: 10 }).map(() => ({
      user_id: user.id,
      coach_id: coachId,
      status: 'completed',
      created_at: recentDate.toISOString(),
      expected_time: recentDate.toISOString(),
      base_price: 1000,
      final_price: 1000,
      platform_fee: 200,
      coach_earnings: 800,
    }));
    await supabase.from('bookings').insert(bookingsToInsert);

    // Insert 10 5-star reviews
    const reviewsToInsert = Array.from({ length: 10 }).map(() => ({
      user_id: user.id,
      coach_id: coachId,
      rating: 5,
      content: 'Excellent coach!',
      created_at: recentDate.toISOString()
    }));
    await supabase.from('reviews').insert(reviewsToInsert);

    // Fix response time by inserting a chat room and messages
    const { data: roomData } = await supabase.from('chat_rooms').insert({
      user_id: user.id,
      coach_id: coachId,
      created_at: recentDate.toISOString()
    }).select();
    
    if (roomData && roomData[0]) {
      const roomId = roomData[0].id;
      // User message
      await supabase.from('chat_messages').insert({
        room_id: roomId,
        sender_id: user.id,
        content: 'Hi coach!',
        created_at: recentDate.toISOString()
      });
      // Coach reply 5 minutes later
      const replyDate = new Date(recentDate);
      replyDate.setMinutes(replyDate.getMinutes() + 5);
      await supabase.from('chat_messages').insert({
        room_id: roomId,
        sender_id: coachId,
        content: 'Hello!',
        created_at: replyDate.toISOString()
      });
    }

    const { data: coachUser } = await supabase.from('users').select('name').eq('id', coachId).maybeSingle();
    const coachName = coachUser?.name || 'Unknown';
    console.log(`Success! User ${user.name} and Coach ${coachName} (${coachId}) have been artificially boosted to Lv.4.`);
  } catch (error) {
    console.error('Error:', error);
  }
}

run();
