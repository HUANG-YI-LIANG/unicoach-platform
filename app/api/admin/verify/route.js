import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getAdminSupabase } from '@/lib/supabase';

/**
 * GET：管理員列出所有待審核的檔案
 */
export async function GET(request) {
  try {
    const auth = await requireAuth(['admin']);
    if (auth.error) return NextResponse.json(auth, { status: auth.status });

    const adminSupabase = getAdminSupabase();
    const { data: files, error } = await adminSupabase
      .from('user_files')
      .select(`
        *,
        user:users(id, name, email)
      `)
      .eq('verification_status', 'pending')
      .order('created_at', { ascending: true });

    if (error) throw error;
    return NextResponse.json({ files });
  } catch (err) {
    return NextResponse.json({ error: '無法獲取待審核列表', details: err.message }, { status: 500 });
  }
}

/**
 * POST：執行審核 (批准、拒絕、停用)
 */
export async function POST(request) {
  try {
    const auth = await requireAuth(['admin']);
    if (auth.error) return NextResponse.json(auth, { status: auth.status });

    const { fileId, coachUserId, action, reason } = await request.json();
    
    // 驗證參數
    const validActions = ['approve', 'reject', 'suspend', 'delete_coach'];
    if (!validActions.includes(action)) {
      return NextResponse.json({ error: '無效的操作' }, { status: 400 });
    }

    const adminSupabase = getAdminSupabase();
    const statusMap = { approve: 'approved', reject: 'rejected', suspend: 'suspended' };
    const targetStatus = statusMap[action];

    let targetUserId = coachUserId;

    // 處理特例：刪除教練資格 (轉回一般使用者)
    if (action === 'delete_coach') {
      if (!targetUserId) return NextResponse.json({ error: '缺少教練用戶 ID' }, { status: 400 });
      
      // 1. 刪除教練資料 (如果有依賴資料會自動級聯，或需要先手動清理，目前平台設計中只要刪除 coaches 即可)
      const { error: deleteError } = await adminSupabase.from('coaches').delete().eq('user_id', targetUserId);
      if (deleteError) throw deleteError;

      // 2. 將用戶身分改回 user
      const { error: userError } = await adminSupabase.from('users').update({ role: 'user' }).eq('id', targetUserId);
      if (userError) throw userError;

      // 3. 記錄審計日誌
      await adminSupabase.from('audit_logs').insert([{
        action: 'COACH_DELETED',
        actor_id: auth.user.id,
        actor_role: auth.user.role,
        target_id: String(targetUserId),
        details: JSON.stringify({ reason: reason || 'N/A' })
      }]);

      return NextResponse.json({ success: true, status: 'deleted' });
    }

    // 1. 如果有 fileId，更新檔案審核狀態
    if (fileId) {
      const { data: updatedFile, error: fileError } = await adminSupabase
        .from('user_files')
        .update({
          verification_status: targetStatus === 'approved' ? 'approved' : 'rejected',
          reviewed_by: auth.user.id,
          reviewed_at: new Date().toISOString(),
          rejection_reason: (action === 'reject' || action === 'suspend') ? reason : null
        })
        .eq('id', fileId)
        .select('user_id')
        .single();

      if (fileError) throw fileError;
      if (!targetUserId) targetUserId = updatedFile.user_id;
    }

    if (!targetUserId) {
       return NextResponse.json({ error: '缺少教練用戶 ID' }, { status: 400 });
    }

    // 2. 更新教練表狀態 (使用 approval_status)
    const updatePayload = {
      approval_status: targetStatus,
      verified_at: targetStatus === 'approved' ? new Date().toISOString() : null,
      verified_by: targetStatus === 'approved' ? auth.user.id : null
    };

    const { error: coachError } = await adminSupabase
      .from('coaches')
      .update(updatePayload)
      .eq('user_id', targetUserId);

    if (coachError) throw coachError;

    // 3. 記錄審計日誌
    await adminSupabase.from('audit_logs').insert([{
      action: `COACH_${action.toUpperCase()}`,
      actor_id: auth.user.id,
      actor_role: auth.user.role,
      target_id: String(targetUserId),
      details: JSON.stringify({ reason: reason || 'N/A', action, file_id: fileId })
    }]);

    return NextResponse.json({ success: true, status: targetStatus });
  } catch (err) {
    console.error('[ADMIN VERIFY ERROR]', err);
    return NextResponse.json({ error: '審核操作失敗' }, { status: 500 });
  }
}
