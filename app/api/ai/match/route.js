import { NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

export async function POST(request) {
  try {
    const auth = await requireAuth(['user']);
    if (auth.error) return NextResponse.json(auth, { status: auth.status });

    if (!GEMINI_API_KEY) {
      return NextResponse.json({ error: '系統未設定 GEMINI_API_KEY，無法使用 AI 功能。' }, { status: 500 });
    }

    const { userRequirement } = await request.json();

    if (!userRequirement || typeof userRequirement !== 'string' || userRequirement.trim() === '') {
      return NextResponse.json({ error: '請填寫您的學習需求。' }, { status: 400 });
    }
    
    if (userRequirement.length > 1000) {
      return NextResponse.json({ error: '需求描述過長，請限制在 1000 字以內。' }, { status: 400 });
    }

    const adminSupabase = getAdminSupabase();

    // 1. 取得所有教練資料 (包含姓名與簡介)
    const { data: coaches, error: coachError } = await adminSupabase
      .from('coaches')
      .select('user_id, university, location, service_areas, experience, philosophy, target_audience, users!inner(name)')
      .eq('approval_status', 'approved');

    const activeCoaches = coaches || [];

    if (activeCoaches.length === 0) {
      return NextResponse.json({ 
        recommendations: [], 
        message: '目前尚無通過審核的教練可供媒合。' 
      }, { status: 200 });
    }

    // 2. 準備給 AI 的資料
    const coachesContext = activeCoaches.map(c => 
      `教練 ID: ${c.user_id}\n姓名: ${c.users?.name || '未知'}\n地區: ${c.location || ''}\n服務項目: ${c.service_areas || ''}\n教學理念與經驗: ${c.philosophy || ''} ${c.experience || ''}\n適合對象: ${c.target_audience || ''}`
    ).join('\n\n---\n\n');

    const prompt = `
你是一位專業的運動與技能學習媒合顧問。
請根據學員的需求，從以下教練名單中，挑選出最適合的 1 到 3 位教練。

【學員需求】
${userRequirement}

【教練名單】
${coachesContext}

請以 JSON 格式回傳，格式如下：
[
  {
    "coach_id": "選中的教練 ID",
    "reasoning": "用一段溫暖、專業的口吻，直接對學員說話，解釋為什麼推薦這位教練（大約 50-80 字）。例如：『這名教練的教學理念非常注重基礎，且服務地區與您相近，非常適合目前的您！』"
  }
]
只回傳純 JSON 陣列，不要包含 \`\`\`json 標籤或其他文字。
`;

    // 3. 呼叫 Gemini API
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2 } // 低溫度確保穩定的 JSON 輸出
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Gemini API Error:', errorData);
      return NextResponse.json({ error: 'AI 媒合失敗，請稍後再試。' }, { status: 500 });
    }

    const data = await response.json();
    let generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
    
    // 清理可能包含的 Markdown 標籤
    generatedText = generatedText.replace(/```json/g, '').replace(/```/g, '').trim();

    let recommendations = [];
    try {
      const parsed = JSON.parse(generatedText);
      if (!Array.isArray(parsed)) throw new Error('Root must be array');
      
      recommendations = parsed.filter(item => 
        item && 
        typeof item.coach_id === 'string' && 
        typeof item.reasoning === 'string'
      ).slice(0, 3); // 最多 3 筆
    } catch (parseError) {
      console.error('JSON parse error or invalid schema:', generatedText);
      return NextResponse.json({ error: 'AI 回傳格式錯誤。' }, { status: 500 });
    }

    // 4. 根據 AI 回傳的 coach_id，撈取完整的教練卡片資訊
    const recommendedCoachIds = recommendations.map(r => r.coach_id);
    if (recommendedCoachIds.length === 0) {
      return NextResponse.json({ recommendations: [] });
    }
    
    const { data: fullCoaches } = await adminSupabase
      .from('coaches')
      .select('*, users!inner(name, avatar_url)')
      .in('user_id', recommendedCoachIds);

    // 組合最終結果
    const finalResult = recommendations.map(rec => {
      const coachData = fullCoaches?.find(c => c.user_id === rec.coach_id);
      return {
        coach: coachData ? {
          ...coachData,
          name: coachData.users?.name,
          avatar_url: coachData.users?.avatar_url,
          users: undefined
        } : null,
        reasoning: rec.reasoning
      };
    }).filter(r => r.coach !== null);

    return NextResponse.json({ recommendations: finalResult });

  } catch (error) {
    console.error('Matchmaking error:', error);
    return NextResponse.json({ error: '伺服器內部錯誤' }, { status: 500 });
  }
}
