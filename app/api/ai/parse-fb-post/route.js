import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

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

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

export async function POST(req) {
  try {
    // 1. Auth Check
    const cookieStore = cookies();
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

    // 4. Gemini Parsing
    const prompt = `
You are an expert AI parser for a tutoring and coaching platform.
Your task is to read a Facebook post (written by a coach/tutor) and extract structured information.

STRICT RULES TO PREVENT HALLUCINATION:
1. ONLY extract information that is explicitly stated in the text.
2. If the text does not mention a price, set base_price to null.
3. If the text does not mention a location, DO NOT GUESS. Set location to an empty string.
4. DO NOT invent experiences, certificates, or features. 
5. Return ONLY a valid JSON object matching the schema below. No markdown formatting (\`\`\`json etc), no explanations.

JSON SCHEMA:
{
  "experience": "string",
  "philosophy": "string",
  "teaching_features": ["string", "string"],
  "location": "string",
  "base_price": number | null,
  "service_areas": ["string"]
}

TEXT TO PARSE:
${text}
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.1, // Low temperature for extraction task
      }
    });

    const outputText = response.text;
    if (!outputText) {
      throw new Error('No output from Gemini');
    }
    
    // Parse JSON
    let parsedData;
    try {
      parsedData = JSON.parse(outputText.trim());
    } catch (e) {
      console.error('Failed to parse Gemini output as JSON:', outputText);
      return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 });
    }

    return NextResponse.json(parsedData);
  } catch (error) {
    console.error('AI Parse Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
