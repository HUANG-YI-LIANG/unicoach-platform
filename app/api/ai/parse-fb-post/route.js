import { NextResponse } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { parseFbPostWithOllama } from '@/lib/ollamaProfileParser.mjs';

// Optional: Upstash Ratelimit
const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
let ratelimit = null;
if (redisUrl && redisToken) {
  ratelimit = new Ratelimit({
    redis: new Redis({ url: redisUrl, token: redisToken }),
    limiter: Ratelimit.slidingWindow(5, '1 h'), // 5 parses per hour per user
  });
}

export async function POST(req) {
  try {
    // 1. Auth Check
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          get(name) {
            return cookieStore.get(name)?.value;
          },
          set(name, value, options) {},
          remove(name, options) {},
        },
      }
    );
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Rate Limit Check
    if (ratelimit) {
      const { success } = await ratelimit.limit(session.user.id);
      if (!success) {
        return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
      }
    }

    // 3. Request Validation
    const { text } = await req.json();
    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid text' }, { status: 400 });
    }

    if (text.length > 3000) {
      return NextResponse.json({ error: 'Text too long (max 3000 chars)' }, { status: 400 });
    }

    // 4. Ollama Parsing
    const parsedData = await parseFbPostWithOllama({ text });

    return NextResponse.json(parsedData);
  } catch (error) {
    console.error('AI Parse Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
