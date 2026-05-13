import { NextResponse } from 'next/server';
import { verifyConnection } from '@/lib/metaApi';

export async function GET() {
  try {
    const result = await verifyConnection();
    
    return NextResponse.json({
      status: 'success',
      message: '✅ Meta Graph API 連線成功！您的 Token 與權限設定皆正確。',
      details: result
    });
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      message: '❌ Meta Graph API 連線失敗。',
      error: error.message
    }, { status: 500 });
  }
}
