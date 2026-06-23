const DEFAULT_OLLAMA_BASE_URL = 'http://127.0.0.1:11434';
const DEFAULT_OLLAMA_MODEL = 'qwen3:8b';

export function buildFbPostParsingPrompt(text) {
  return `
/no_think
你是家教/教練平台的資料整理器。請讀取下方 FB 自介文，整理成公開教練資料草稿。

嚴格規則：
1. 只能使用原文明確提到的資料，不能猜、不能補故事。
2. 沒有價格：base_price 用 null。
3. 沒有地點：location 用空字串，service_areas 用空陣列。
4. 不要輸出 thinking、推理過程、markdown、解釋文字、???、unknown、string、範例字。
5. 只輸出一個有效 JSON 物件。

請輸出以下欄位：
{
  "experience": "把明確學歷、經歷、成績整理成一段中文；沒有就空字串",
  "philosophy": "明確教學理念；沒有就空字串",
  "teaching_features": ["明確教學特色；沒有就空陣列"],
  "location": "明確上課地點、地區或縣市；沒有就空字串",
  "base_price": 明確價格數字或 null,
  "service_areas": ["明確服務項目、教授科目或分類 (例如：籃球、伴讀、數學)；沒有就空陣列"]
}

FB 自介文：
${text}
  `.trim();
}

function normalizeBaseUrl(baseUrl) {
  return String(baseUrl || DEFAULT_OLLAMA_BASE_URL).replace(/\/+$/, '');
}

function isPlaceholder(value) {
  return /^(?:\?+|unknown|null|undefined|string|n\/a|na)$/i.test(String(value || '').trim()) || String(value || '').includes('/think');
}

function asString(value) {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  return trimmed && !isPlaceholder(trimmed) ? trimmed : '';
}

function asStringArray(value) {
  if (Array.isArray(value)) {
    return value.map(asString).filter(Boolean);
  }
  if (typeof value === 'string' && value.trim()) {
    const normalized = asString(value);
    return normalized ? [normalized] : [];
  }
  return [];
}

function asNullableNumber(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() && !isPlaceholder(value)) {
    const normalized = value.replace(/[,，]/g, '').trim();
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function extractJsonFromModelText(outputText) {
  const cleaned = String(outputText || '')
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch (error) {
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
    }
    throw error;
  }
}

export function normalizeParsedProfile(data) {
  return {
    experience: asString(data?.experience),
    philosophy: asString(data?.philosophy),
    teaching_features: asStringArray(data?.teaching_features),
    location: asString(data?.location),
    base_price: asNullableNumber(data?.base_price),
    service_areas: asStringArray(data?.service_areas),
  };
}

import { GoogleGenAI } from '@google/genai';

export async function parseFbPostWithOllama({
  text,
  baseUrl = process.env.OLLAMA_BASE_URL || DEFAULT_OLLAMA_BASE_URL,
  model = process.env.OLLAMA_MODEL || DEFAULT_OLLAMA_MODEL,
  apiKey = process.env.OLLAMA_API_KEY || '',
  fetchImpl = fetch,
} = {}) {
  if (!text || typeof text !== 'string') {
    throw new Error('Missing or invalid text');
  }

  const prompt = buildFbPostParsingPrompt(text);

  if (process.env.GEMINI_API_KEY) {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });
      const outputText = response.text;
      if (!outputText) throw new Error('No output from Gemini');
      return normalizeParsedProfile(extractJsonFromModelText(outputText));
    } catch (error) {
      console.error('Gemini parsing error:', error);
      throw new Error(`Cannot reach AI API: ${error.message}`);
    }
  }

  // Fallback to Ollama if no Gemini key
  const endpoint = `${normalizeBaseUrl(baseUrl)}/api/generate`;
  const headers = { 'Content-Type': 'application/json' };
  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  }

  let response;
  try {
    response = await fetchImpl(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model,
        prompt,
        format: 'json',
        stream: false,
        options: {
          temperature: 0.1,
        },
      }),
    });
  } catch (error) {
    throw new Error(`Cannot reach Ollama at ${endpoint}: ${error.message}`);
  }

  if (!response.ok) {
    const errorText = typeof response.text === 'function' ? await response.text() : '';
    throw new Error(`Ollama request failed (${response.status}): ${errorText || 'Unknown error'}`);
  }

  const responseData = await response.json();
  const outputText = responseData?.response;
  if (!outputText) {
    throw new Error('No output from Ollama');
  }

  return normalizeParsedProfile(extractJsonFromModelText(outputText));
}
