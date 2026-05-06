# UniCoach 動態教練績效與抽成系統完整原始碼

此文件包含了實作「動態教練績效與抽成系統」的所有核心檔案，請協助尋找隱藏的 Bug 或邏輯漏洞。

## File: lib/coachPerformance.js

```javascript
import { getAdminSupabase } from './supabase';

/**
 * 取得教練近 30 天的動態績效、符合的等級與對應的抽成率
 * @param {string} coachId 
 * @param {object} supabaseAdmin 
 */
export async function getCoachPerformance(coachId, supabaseAdmin) {
  const supabase = supabaseAdmin || getAdminSupabase();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysAgoIso = thirtyDaysAgo.toISOString();

  try {
    // 1. 取得全域設定的門檻參數
    const { data: settingsData } = await supabase.from('platform_settings').select('*');
    const settings = (settingsData || []).reduce((acc, curr) => {
      acc[curr.key] = Number(curr.value) || curr.value;
      return acc;
    }, {});

    const thresholds = {
      lv2_lessons: settings.coach_lv2_lessons ?? 2,
      lv3_lessons: settings.coach_lv3_lessons ?? 4,
      lv4_lessons: settings.coach_lv4_lessons ?? 6,
      lv1_commission: settings.coach_lv1_commission ?? 45,
      lv2_commission: settings.coach_lv2_commission ?? 35,
      lv3_commission: settings.coach_lv3_commission ?? 25,
      lv4_commission: settings.coach_lv4_commission ?? 20,
    };

    // 2. 撈取近 30 天 bookings 資料 (包含完課、逾期取消)
    const { data: recentBookings } = await supabase
      .from('bookings')
      .select('id, status, created_at, expected_time')
      .eq('coach_id', coachId)
      .gte('created_at', thirtyDaysAgoIso);

    const monthly_lessons = (recentBookings || []).filter(b => b.status === 'completed').length;
    // 逾期未接單算作惡意取消
    const malicious_cancels = (recentBookings || []).filter(b => b.status === 'expired').length;
    // 完課率 (完課數 / (完課數 + 逾期取消數))
    const totalValidBookings = monthly_lessons + malicious_cancels;
    const completion_rate = totalValidBookings === 0 ? 100 : Math.round((monthly_lessons / totalValidBookings) * 100);

    // 3. 撈取近 30 天評價平均
    const { data: reviews } = await supabase
      .from('reviews')
      .select('rating')
      .eq('coach_id', coachId)
      .gte('created_at', thirtyDaysAgoIso);
    
    let average_rating = 0;
    if (reviews && reviews.length > 0) {
      average_rating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
    } else {
      // 預設給予滿分，或是維持舊分數？(為避免新教練因無評價被降級，預設給 5)
      average_rating = 5.0; 
    }

    // 4. 撈取回覆速度與回覆率 (粗略估算：撈取教練參與的近 30 天聊天室)
    const { data: chatRooms } = await supabase
      .from('chat_rooms')
      .select('id, created_at')
      .eq('coach_id', coachId)
      .gte('created_at', thirtyDaysAgoIso);
    
    let average_response_time = 0; // 分鐘
    let response_rate = 100;
    
    if (chatRooms && chatRooms.length > 0) {
      const roomIds = chatRooms.map(r => r.id);
      const { data: messages } = await supabase
        .from('chat_messages')
        .select('room_id, sender_id, created_at')
        .in('room_id', roomIds)
        .order('created_at', { ascending: true });
        
      let totalResponseTime = 0;
      let respondedRooms = 0;
      let roomsWithUserMessage = 0;

      if (messages) {
        roomIds.forEach(roomId => {
          const roomMessages = messages.filter(m => m.room_id === roomId);
          const firstUserMsg = roomMessages.find(m => m.sender_id !== coachId);
          if (firstUserMsg) {
            roomsWithUserMessage++;
            // 找第一則教練的回覆
            const firstCoachReply = roomMessages.find(m => m.sender_id === coachId && new Date(m.created_at) > new Date(firstUserMsg.created_at));
            if (firstCoachReply) {
              respondedRooms++;
              const diffMins = (new Date(firstCoachReply.created_at) - new Date(firstUserMsg.created_at)) / 60000;
              totalResponseTime += diffMins;
            }
          }
        });
      }

      if (roomsWithUserMessage > 0) {
        response_rate = Math.round((respondedRooms / roomsWithUserMessage) * 100);
        if (respondedRooms > 0) {
          average_response_time = totalResponseTime / respondedRooms;
        } else {
          average_response_time = 9999; // 極大值代表未回覆
        }
      }
    }

    // 5. 判斷是否上傳自我介紹影片
    const { count: videoCount } = await supabase
      .from('coach_videos')
      .select('id', { count: 'exact', head: true })
      .eq('coach_id', coachId);
    const intro_video_uploaded = (videoCount || 0) > 0;

    // Fetch coach personal discount with error handling in case the column doesn't exist yet
    let personalDiscount = 0;
    try {
      const { data: coachData, error: coachError } = await supabase.from('coaches').select('commission_discount').eq('id', coachId).maybeSingle();
      if (!coachError && coachData) {
        personalDiscount = coachData.commission_discount || 0;
      }
    } catch (e) {
      console.warn('[Coach Performance] Missing commission_discount column', e);
    }

    let baseCommission = thresholds.lv1_commission;

    // 判斷 Lv4
    const isLv4 = 
      monthly_lessons >= thresholds.lv4_lessons &&
      average_rating >= 4.8 &&
      average_response_time <= 15 &&
      completion_rate >= 98 &&
      malicious_cancels === 0;

    const isLv3 = 
      monthly_lessons >= thresholds.lv3_lessons &&
      average_rating >= 4.7 &&
      average_response_time <= 60 &&
      completion_rate >= 95 &&
      malicious_cancels === 0 &&
      intro_video_uploaded;

    const isLv2 = 
      monthly_lessons >= thresholds.lv2_lessons &&
      average_rating >= 4.5 &&
      response_rate >= 80 &&
      malicious_cancels === 0;

    if (isLv4) {
      currentLevel = 4;
      baseCommission = thresholds.lv4_commission;
    } else if (isLv3) {
      currentLevel = 3;
      baseCommission = thresholds.lv3_commission;
    } else if (isLv2) {
      currentLevel = 2;
      baseCommission = thresholds.lv2_commission;
    }

    currentCommission = Math.max(0, baseCommission - personalDiscount);

    return {
      currentLevel,
      currentCommission,
      baseCommission,
      personalDiscount,
      metrics: {
        monthly_lessons,
        average_rating: average_rating.toFixed(1),
        response_rate,
        average_response_time: Math.round(average_response_time),
        completion_rate,
        malicious_cancels,
        intro_video_uploaded
      },
      thresholds
    };

  } catch (err) {
    console.error('[Coach Performance Error]', err);
    // 預設回退
    return {
      currentLevel: 1,
      currentCommission: 45,
      baseCommission: 45,
      personalDiscount: 0,
      metrics: {
        monthly_lessons: 0,
        average_rating: 5.0,
        response_rate: 100,
        average_response_time: 0,
        completion_rate: 100,
        malicious_cancels: 0,
        intro_video_uploaded: false
      },
      thresholds: {}
    };
  }
}

```

## File: app/admin/coach-performance/page.js

```javascript
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  CheckCircle2,
  Info,
  Loader2,
  Save,
  TrendingUp
} from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';

const BLUE = 'var(--color-primary)';
const DARK = 'var(--color-text)';
const MUTED = 'var(--color-text-muted)';
const BG = 'var(--color-bg)';

const DEFAULT_SETTINGS = {
  coach_lv2_lessons: 2,
  coach_lv3_lessons: 4,
  coach_lv4_lessons: 6,

  coach_lv1_commission: 45,
  coach_lv2_commission: 35,
  coach_lv3_commission: 25,
  coach_lv4_commission: 20,
};

export default function CoachPerformanceAdmin() {
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  useEffect(() => {
    if (!authLoading && user) {
      if (user.role !== 'admin') {
        window.location.href = '/dashboard/user';
        return;
      }
      fetchSettings();
    }
  }, [user, authLoading]);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/admin/settings');
      const data = await res.json();
      if (data.settings) {
        setSettings(prev => ({
          ...prev,
          ...data.settings
        }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      const keysToSave = Object.keys(settings);
      const promises = keysToSave.map(key => 
        fetch('/api/admin/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key, value: settings[key], description: '動態教練績效參數' })
        })
      );
      
      await Promise.all(promises);
      setMessage('設定已成功儲存！教練端績效面板與結帳抽成將立即生效。');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      console.error(err);
      setMessage('儲存失敗，請重試。');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  if (authLoading || loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: BG }}>
        <Loader2 className="spinner" size={24} color={BLUE} />
      </div>
    );
  }

  const renderInput = (label, key, unit, min = 0) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--color-surface)', borderRadius: 12, border: '1px solid var(--color-border)', marginBottom: 8 }}>
      <span style={{ fontSize: 15, color: DARK, fontWeight: 500 }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <input
          type="number"
          min={min}
          value={settings[key]}
          onChange={(e) => handleChange(key, Number(e.target.value))}
          style={{ width: 100, textAlign: 'right', padding: '6px 10px', borderRadius: 6, border: '1px solid var(--color-border)', background: 'var(--color-surface-soft)', color: BLUE, fontSize: 16, fontWeight: 700 }}
        />
        <span style={{ color: MUTED, fontSize: 14, width: 24 }}>{unit}</span>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: BG, padding: '40px 20px' }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
          <div>
            <Link href="/dashboard/admin" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: MUTED, textDecoration: 'none', fontSize: 14, marginBottom: 12, fontWeight: 500 }}>
              <ArrowLeft size={16} /> 返回主控台
            </Link>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: DARK, margin: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
              <TrendingUp size={28} color={BLUE} />
              動態教練績效門檻與抽成設定
            </h1>
            <p style={{ color: MUTED, marginTop: 8, fontSize: 14 }}>
              調整各教練等級的「近30天動態完課門檻」與對應的「平台抽成比例」。
            </p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{ display: 'flex', alignItems: 'center', gap: 8, background: BLUE, color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 100, fontWeight: 700, fontSize: 15, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}
          >
            {saving ? <Loader2 size={18} className="spinner" /> : <Save size={18} />}
            儲存所有變更
          </button>
        </div>

        {message && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(16, 185, 129, 0.1)', color: '#10B981', padding: '12px 16px', borderRadius: 12, marginBottom: 24, fontSize: 14, fontWeight: 500 }}>
            <CheckCircle2 size={18} /> {message}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 24, background: 'var(--color-surface-soft)', padding: 16, borderRadius: 12 }}>
          <Info size={20} color={MUTED} style={{ flexShrink: 0, marginTop: 2 }} />
          <div style={{ fontSize: 14, color: MUTED, lineHeight: 1.6 }}>
            <strong style={{ color: DARK }}>【運作規則說明】</strong><br/>
            教練的等級將根據「過去 30 天的表現」每天動態運算。如果教練 30 天內的完課數未達標，或出現惡意取消，將被系統自動降級，並立刻適用較高的平台抽成率。
            這裡您可以動態調整「每月完課要求」與「各階級抽成」，其餘品質指標（如評分 ≥ 4.7、回覆率等）為系統固定核心邏輯。
          </div>
        </div>

        {/* Section 1: 平台抽成比例 */}
        <div style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: DARK, marginBottom: 16 }}>💰 平台抽成比例設定 (Platform Commission)</h2>
          {renderInput('Lv.1 新手教練抽成', 'coach_lv1_commission', '%')}
          {renderInput('Lv.2 進階教練抽成', 'coach_lv2_commission', '%')}
          {renderInput('Lv.3 專業教練抽成', 'coach_lv3_commission', '%')}
          {renderInput('Lv.4 頂級教練抽成', 'coach_lv4_commission', '%')}
        </div>

        {/* Section 2: 近30天動態完課門檻 */}
        <div style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: DARK, marginBottom: 16 }}>📊 近 30 天完課要求 (Monthly Targets)</h2>
          {renderInput('維持 Lv.2 所需近30天完課', 'coach_lv2_lessons', '堂')}
          {renderInput('維持 Lv.3 所需近30天完課', 'coach_lv3_lessons', '堂')}
          {renderInput('維持 Lv.4 所需近30天完課', 'coach_lv4_lessons', '堂')}
          <div style={{ padding: '0 16px', fontSize: 13, color: MUTED }}>*Lv.1 為基礎預設等級，無需完課門檻。</div>
        </div>

      </div>
      <style>{`
        .spinner { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

```

## File: app/admin/promotions/page.js

```javascript
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  CheckCircle2,
  Info,
  Loader2,
  Mail,
  Percent,
  Send,
  Users,
} from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';

const BLUE = 'var(--color-primary)';
const DARK = 'var(--color-text)';
const MUTED = 'var(--color-text-muted)';
const WHITE = 'var(--text-light)';
const BG = 'var(--color-bg)';

const DEFAULT_LEVEL_DISCOUNTS = { 1: 0, 2: 3, 3: 6, 4: 12 };

export default function PromotionsAdmin() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [activeTab, setActiveTab] = useState('commissions');
  const [coaches, setCoaches] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [globalCommission, setGlobalCommission] = useState(20);
  const [levelDiscounts, setLevelDiscounts] = useState(DEFAULT_LEVEL_DISCOUNTS);
  const [loading, setLoading] = useState(true);

  const [notiTitle, setNotiTitle] = useState('');
  const [notiContent, setNotiContent] = useState('');
  const [notiCode, setNotiCode] = useState('');
  const [notiPercent, setNotiPercent] = useState('');
  const [sendingNoti, setSendingNoti] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user || user.role !== 'admin') {
      router.push('/dashboard/coach');
      return;
    }
    fetchData();
  }, [authLoading, router, user]);

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [settingsRes, coachesRes, usersRes] = await Promise.all([
        fetch('/api/admin/settings'),
        fetch('/api/admin/coaches'),
        fetch('/api/admin/users'),
      ]);

      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        if (settingsData.settings?.commission_rate !== undefined) {
          setGlobalCommission(Number(settingsData.settings.commission_rate));
        }

        setLevelDiscounts({
          1: settingsData.settings?.level_1_discount !== undefined ? Number(settingsData.settings.level_1_discount) : 5,
          2: settingsData.settings?.level_2_discount !== undefined ? Number(settingsData.settings.level_2_discount) : 10,
          3: settingsData.settings?.level_3_discount !== undefined ? Number(settingsData.settings.level_3_discount) : 15,
          4: settingsData.settings?.level_4_discount !== undefined ? Number(settingsData.settings.level_4_discount) : 20,
        });
      }

      if (coachesRes.ok) {
        const coachesData = await coachesRes.json();
        setCoaches(coachesData.coaches || []);
      }

      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsersList(usersData.users || []);
      }
    } catch (error) {
      console.error('[PROMOTIONS ADMIN FETCH ERROR]', error);
      showMessage('error', '載入推廣設定失敗');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateLevelDiscount = async (level, discount) => {
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: `level_${level}_discount`, value: discount }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || '更新等級折扣失敗');
      }

      setLevelDiscounts((prev) => ({ ...prev, [level]: discount }));
      showMessage('success', `Lv.${level} 折扣已更新`);
    } catch (error) {
      showMessage('error', error.message || '更新等級折扣失敗');
    }
  };

  const handleUpdateUser = async (userId, updates) => {
    const previousUsers = [...usersList];
    setUsersList((prev) => prev.map((item) => (item.id === userId ? { ...item, ...updates } : item)));

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || '更新使用者失敗');
      }

      showMessage('success', '使用者設定已更新');
    } catch (error) {
      setUsersList(previousUsers);
      showMessage('error', error.message || '更新使用者失敗');
    }
  };

  const handleUpdateCommission = async (coachUserId, newDiscount) => {
    try {
      const response = await fetch(`/api/admin/coaches/${coachUserId}/commission`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commission_discount: newDiscount }),
      });

      if (!response.ok) throw new Error();

      setCoaches((prev) =>
        prev.map((coach) =>
          coach.user_id === coachUserId ? { ...coach, commission_discount: newDiscount } : coach
        )
      );
      showMessage('success', '個人減免已更新');
    } catch (error) {
      console.error('[UPDATE COMMISSION ERROR]', error);
      showMessage('error', '更新失敗');
    }
  };

  const handleSendNotification = async () => {
    if (!notiTitle.trim() || !notiContent.trim()) {
      showMessage('error', '請填寫通知標題與內容');
      return;
    }

    setSendingNoti(true);
    try {
      const response = await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: notiTitle,
          content: notiContent,
          discount_code: notiCode || null,
          discount_percent: notiPercent ? Number(notiPercent) : null,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || '發送通知失敗');
      }

      setNotiTitle('');
      setNotiContent('');
      setNotiCode('');
      setNotiPercent('');
      showMessage('success', '通知已成功送出');
    } catch (error) {
      console.error('[SEND NOTIFICATION UI ERROR]', error);
      showMessage('error', error.message || '發送通知失敗');
    } finally {
      setSendingNoti(false);
    }
  };

  if (loading || authLoading) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          background: BG,
          color: MUTED,
        }}
      >
        <Loader2 className="animate-spin" size={40} style={{ marginBottom: 16 }} />
        <p>載入推廣設定中...</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: BG, padding: '24px 16px', fontFamily: 'sans-serif' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        <header
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 24,
            gap: 16,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <button
              onClick={() => router.push('/dashboard/admin')}
              style={{
                padding: 10,
                background: 'var(--color-surface)',
                border: 'none',
                borderRadius: 12,
                cursor: 'pointer',
                boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
              }}
            >
              <ArrowLeft size={20} color={DARK} />
            </button>
            <div>
              <h1
                style={{
                  margin: 0,
                  fontSize: 24,
                  fontWeight: 900,
                  color: DARK,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <Percent color={BLUE} size={24} />
                推廣與抽成管理
              </h1>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: MUTED }}>
                管理教練抽成、會員折扣與通知推播。
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', background: 'var(--color-border)', padding: 4, borderRadius: 14, flexWrap: 'wrap' }}>
            {[
              ['commissions', '教練抽成'],
              ['discounts', '通知與折扣'],
              ['members', '會員設定'],
            ].map(([key, label]) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 10,
                  border: 'none',
                  fontWeight: 800,
                  fontSize: 13,
                  cursor: 'pointer',
                  background: activeTab === key ? WHITE : 'transparent',
                  color: activeTab === key ? DARK : MUTED,
                  boxShadow: activeTab === key ? '0 2px 8px rgba(0,0,0,0.05)' : 'none',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </header>

        {message && (
          <div
            style={{
              marginBottom: 24,
              padding: 16,
              borderRadius: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              background: message.type === 'success' ? '#D1FAE5' : '#FEE2E2',
              color: message.type === 'success' ? '#065F46' : '#991B1B',
              fontWeight: 800,
            }}
          >
            {message.type === 'success' ? <CheckCircle2 size={20} /> : <Info size={20} />}
            <span>{message.text}</span>
          </div>
        )}

        {activeTab === 'commissions' && (
          <div
            style={{
              background: 'var(--color-surface)',
              borderRadius: 24,
              border: '1px solid var(--color-border)',
              boxShadow: '0 4px 20px rgba(15,23,42,0.03)',
              overflow: 'hidden',
            }}
          >
            <div style={{ padding: 24, borderBottom: '1px solid var(--color-surface-soft)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <Info size={18} color={BLUE} style={{ marginTop: 2, flexShrink: 0 }} />
                <div>
                  <div style={{ fontWeight: 800, color: DARK, fontSize: 14 }}>抽成計算公式：等級抽成比例 - 個人抽成減免 = 最終抽成比例</div>
                  <div style={{ color: MUTED, fontSize: 13, marginTop: 4 }}>
                    教練的基本抽成由其當前的動態績效等級決定，您可針對特定教練設定「個人減免」比例。
                  </div>
                </div>
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'var(--color-bg)', borderBottom: '1px solid var(--color-border)' }}>
                    <th style={{ padding: '16px 24px', color: MUTED, fontWeight: 800, fontSize: 13 }}>教練</th>
                    <th style={{ padding: '16px 24px', color: MUTED, fontWeight: 800, fontSize: 13 }}>當前等級</th>
                    <th style={{ padding: '16px 24px', color: MUTED, fontWeight: 800, fontSize: 13 }}>等級抽成</th>
                    <th style={{ padding: '16px 24px', color: MUTED, fontWeight: 800, fontSize: 13 }}>個人抽成減免</th>
                    <th style={{ padding: '16px 24px', color: MUTED, fontWeight: 800, fontSize: 13 }}>最終抽成比例</th>
                  </tr>
                </thead>
                <tbody>
                  {coaches.map((coach) => {
                    const perf = coach.performance || { currentLevel: 1, baseCommission: 45, personalDiscount: coach.commission_discount || 0, currentCommission: Math.max(0, 45 - (coach.commission_discount || 0)) };
                    const isCustom = perf.personalDiscount > 0;
                    const discountRate = perf.personalDiscount;

                    return (
                      <tr key={coach.user_id || coach.id} style={{ borderBottom: '1px solid var(--color-surface-soft)' }}>
                        <td style={{ padding: '16px 24px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            {coach.user?.avatar_url ? (
                              <img src={coach.user.avatar_url} alt="教練頭像" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }} />
                            ) : (
                              <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#EFF6FF', color: BLUE, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900 }}>
                                {coach.user?.name?.charAt(0) || 'C'}
                              </div>
                            )}
                            <div>
                              <div style={{ fontWeight: 800, color: DARK, fontSize: 14 }}>{coach.user?.name || '未命名教練'}</div>
                              <div style={{ color: MUTED, fontSize: 12, marginTop: 2 }}>{coach.user?.email || '-'}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '16px 24px' }}>
                          <span style={{ background: 'var(--color-surface-soft)', color: DARK, padding: '4px 10px', borderRadius: 8, fontSize: 12, fontWeight: 800 }}>
                            Lv.{perf.currentLevel}
                          </span>
                        </td>
                        <td style={{ padding: '16px 24px', fontWeight: 800, color: MUTED, fontSize: 14 }}>
                          {perf.baseCommission}%
                        </td>
                        <td style={{ padding: '16px 24px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontWeight: 800, color: DARK }}>-</span>
                            <input
                              type="number"
                              defaultValue={discountRate}
                              min={0}
                              max={100}
                              onBlur={(event) => {
                                const value = event.target.value;
                                if (value === '') {
                                  if (isCustom) handleUpdateCommission(coach.user_id, 0);
                                  event.target.value = '0';
                                  return;
                                }
                                const nextDiscount = Number(value);
                                if (!Number.isNaN(nextDiscount) && nextDiscount !== discountRate) {
                                  handleUpdateCommission(coach.user_id, nextDiscount);
                                }
                              }}
                              style={{
                                width: 70, padding: '8px 12px', borderRadius: 10, border: '1px solid var(--border-input)',
                                fontSize: 14, fontWeight: 800, color: DARK, background: isCustom ? '#FEF3C7' : WHITE,
                              }}
                            />
                            <span style={{ color: MUTED, fontSize: 13, fontWeight: 800 }}>%</span>
                          </div>
                        </td>
                        <td style={{ padding: '16px 24px', fontWeight: 900, color: '#D97706', fontSize: 15 }}>
                          = {perf.currentCommission}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'discounts' && (
          <div style={{ display: 'grid', gap: 24 }}>
            <div
              style={{
                background: 'var(--color-surface)',
                borderRadius: 24,
                border: '1px solid var(--color-border)',
                boxShadow: '0 4px 20px rgba(15,23,42,0.03)',
                padding: 32,
              }}
            >
              <h2 style={{ margin: '0 0 24px', fontSize: 18, fontWeight: 900, color: DARK, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Mail color={BLUE} /> 發送優惠通知
              </h2>

              <div style={{ display: 'grid', gap: 20 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: MUTED, marginBottom: 8 }}>通知標題 *</label>
                  <input value={notiTitle} onChange={(event) => setNotiTitle(event.target.value)} placeholder="例如：春季限定優惠開跑" style={inputStyle} />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: MUTED, marginBottom: 8 }}>通知內容 *</label>
                  <textarea value={notiContent} onChange={(event) => setNotiContent(event.target.value)} placeholder="輸入活動說明、使用方式或截止日期。" rows={4} style={{ ...inputStyle, resize: 'vertical' }} />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: MUTED, marginBottom: 8 }}>折扣資訊（選填）</label>
                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                    <input value={notiCode} onChange={(event) => setNotiCode(event.target.value.toUpperCase())} placeholder="例如 SPRING2026" style={{ ...inputStyle, flex: '2 1 260px', textTransform: 'uppercase' }} />
                    <div style={{ flex: '1 1 140px', position: 'relative' }}>
                      <input type="number" value={notiPercent} onChange={(event) => setNotiPercent(event.target.value)} placeholder="折扣％數" min="1" max="100" style={{ ...inputStyle, width: '100%' }} />
                      <span style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', color: MUTED, fontWeight: 800 }}>%</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleSendNotification}
                  disabled={sendingNoti}
                  style={{
                    width: '100%',
                    background: BLUE,
                    color: 'var(--text-light)',
                    border: 'none',
                    padding: 16,
                    borderRadius: 14,
                    fontWeight: 900,
                    fontSize: 15,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    opacity: sendingNoti ? 0.7 : 1,
                  }}
                >
                  {sendingNoti ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
                  送出通知
                </button>
              </div>
            </div>

            <div
              style={{
                background: 'var(--color-surface)',
                borderRadius: 24,
                border: '1px solid var(--color-border)',
                boxShadow: '0 4px 20px rgba(15,23,42,0.03)',
                padding: 32,
              }}
            >
              <h2 style={{ margin: '0 0 24px', fontSize: 18, fontWeight: 900, color: DARK, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Percent color={BLUE} /> 會員等級預設折扣
              </h2>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
                {[1, 2, 3, 4].map((level) => (
                  <div key={level} style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 18, padding: 18 }}>
                    <div style={{ fontSize: 14, fontWeight: 900, color: DARK, marginBottom: 10 }}>Lv.{level}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input
                        type="number"
                        defaultValue={levelDiscounts[level]}
                        min={0}
                        max={100}
                        onBlur={(event) => {
                          const discount = Number(event.target.value);
                          if (!Number.isNaN(discount) && discount !== levelDiscounts[level]) {
                            handleUpdateLevelDiscount(level, discount);
                          }
                        }}
                        style={{ ...inputStyle, width: 88 }}
                      />
                      <span style={{ color: MUTED, fontWeight: 800 }}>%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'members' && (
          <div
            style={{
              background: 'var(--color-surface)',
              borderRadius: 24,
              border: '1px solid var(--color-border)',
              boxShadow: '0 4px 20px rgba(15,23,42,0.03)',
              overflow: 'hidden',
            }}
          >
            <div style={{ padding: 24, borderBottom: '1px solid var(--color-surface-soft)' }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: DARK, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Users color={BLUE} size={20} /> 會員等級與個別折扣
              </h2>
              <p style={{ color: MUTED, fontSize: 13, marginTop: 8, marginBottom: 0 }}>
                調整會員等級時只會更新等級；只有你實際修改「個別折扣」時，才會寫入該會員的自訂折扣。
              </p>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'var(--color-bg)', borderBottom: '1px solid var(--color-border)' }}>
                    <th style={thStyle}>會員</th>
                    <th style={thStyle}>等級 (Lv)</th>
                    <th style={thStyle}>個別折扣 (%)</th>
                    <th style={thStyle}>最終總折扣 (%)</th>
                  </tr>
                </thead>
                <tbody>
                  {usersList.map((userItem) => (
                    <tr key={userItem.id} style={{ borderBottom: '1px solid var(--color-surface-soft)' }}>
                      <td style={tdStyle}>
                        <div style={{ fontWeight: 800, color: DARK, fontSize: 14 }}>{userItem.name || '未命名使用者'}</div>
                        <div style={{ color: MUTED, fontSize: 12, marginTop: 2 }}>{userItem.email || '-'}</div>
                      </td>
                      <td style={tdStyle}>
                        <select
                          value={userItem.level || 1}
                          onChange={(event) => handleUpdateUser(userItem.id, { level: Number(event.target.value) })}
                          style={selectStyle}
                        >
                          {[1, 2, 3, 4].map((level) => (
                            <option key={level} value={level}>
                              Lv.{level}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <input
                            type="number"
                            placeholder="無"
                            defaultValue={userItem.custom_discount ?? ''}
                            min={0}
                            max={100}
                            onBlur={(event) => {
                              const value = event.target.value;
                              const nextDiscount = value === '' ? null : Number(value);
                              if (nextDiscount !== userItem.custom_discount) {
                                handleUpdateUser(userItem.id, { custom_discount: nextDiscount });
                              }
                            }}
                            style={{
                              ...inputStyle,
                              width: 80,
                              background: userItem.custom_discount !== null ? '#FEF3C7' : WHITE,
                            }}
                          />
                          {userItem.custom_discount !== null && (
                            <span style={{ fontSize: 12, fontWeight: 800, color: '#D97706', background: '#FEF3C7', padding: '4px 8px', borderRadius: 6 }}>
                              個別設定
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={tdStyle}>
                        <div style={{ 
                          fontSize: 16, 
                          fontWeight: 900, 
                          color: userItem.custom_discount !== null ? '#D97706' : BLUE 
                        }}>
                          {(levelDiscounts[userItem.level || 1] ?? 0) + (userItem.custom_discount ?? 0)}%
                        </div>
                      </td>
                    </tr>
                  ))}
                  {usersList.length === 0 && (
                    <tr>
                      <td colSpan={3} style={{ padding: 40, textAlign: 'center', color: MUTED, fontSize: 14 }}>
                        目前沒有會員資料。
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const inputStyle = {
  width: '100%',
  padding: '14px 16px',
  borderRadius: 12,
  border: '1px solid var(--border-input)',
  fontSize: 15,
  fontWeight: 700,
  color: DARK,
  boxSizing: 'border-box',
};

const selectStyle = {
  padding: '8px 12px',
  borderRadius: 10,
  border: '1px solid var(--border-input)',
  fontSize: 14,
  fontWeight: 800,
  color: DARK,
  background: 'var(--color-surface)',
};

const thStyle = {
  padding: '16px 24px',
  color: MUTED,
  fontWeight: 800,
  fontSize: 13,
};

const tdStyle = {
  padding: '16px 24px',
};

```

## File: app/dashboard/coach/page.js

```javascript
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { getDashboardPathForRole } from '@/lib/authRedirects';
import {
  Menu,
  CheckCircle2,
  Copy,
  QrCode,
  ShoppingCart,
  User,
  Shield,
  Bell,
  Globe,
  ArrowUpRight,
  CreditCard,
  LogOut,
  ChevronRight,
  Wallet,
  Clock,
  MessageCircle,
  FileText,
  Check
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import VideoUpload from '@/components/VideoUpload';

const BG = 'var(--color-bg)';
const CARD = 'var(--color-surface)';
const ORANGE = 'var(--color-accent)';
const MUTED = 'var(--color-text-muted)';
const DARK_ORANGE = 'var(--color-warning)';
const TEXT_LIGHT = 'var(--color-text)';
const RADIUS = '20px';
const SHADOW = 'var(--shadow-card)';
const BORDER = 'var(--color-border)';

export default function CoachDashboard() {
  const [profile, setProfile] = useState(null);
  const [coachDetail, setCoachDetail] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [chatRooms, setChatRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState(false);
  const router = useRouter();
  const { logout } = useAuth();

  useEffect(() => {
    let isMounted = true;

    Promise.all([
      fetch('/api/auth/profile'),
      fetch('/api/bookings'),
      fetch('/api/chat/rooms')
    ])
      .then(async ([profileRes, bookingsRes, roomsRes]) => {
        if (!profileRes.ok) {
          router.push('/login');
          return;
        }

        const [profileData, bookingsData, roomsData] = await Promise.all([
          profileRes.json(),
          bookingsRes.ok ? bookingsRes.json() : Promise.resolve({ bookings: [] }),
          roomsRes.ok ? roomsRes.json() : Promise.resolve({ rooms: [] })
        ]);

        if (!isMounted) return;

        if (!profileData.profile) {
          router.replace('/login');
          return;
        }

        if (profileData.profile.role !== 'coach') {
          router.replace(getDashboardPathForRole(profileData.profile.role));
          return;
        }

        setProfile(profileData.profile);
        setCoachDetail(profileData.coach || null);
        setBookings(Array.isArray(bookingsData.bookings) ? bookingsData.bookings : []);
        setChatRooms(Array.isArray(roomsData.rooms) ? roomsData.rooms : []);
      })
      .catch((error) => {
        console.error('[COACH DASHBOARD LOAD ERROR]', error);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [router]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: BG }}>
        <p style={{ color: ORANGE, fontSize: 15, fontWeight: 800 }}>Loading Dashboard...</p>
      </div>
    );
  }

  const pendingMessages = chatRooms.reduce((sum, room) => sum + (room.unread_count || 0), 0);
  const netEarnings = bookings.reduce(
    (sum, booking) => (booking.status === 'completed' ? sum + (booking.coach_payout || 0) : sum),
    0
  );
  
  const referralCode = `UNICOACH-${profile?.name?.toUpperCase() || 'COACH'}`;

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(referralCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch (error) {
      console.error('[COPY ERROR]', error);
    }
  };

  const promotionUrl = typeof window !== 'undefined' ? `${window.location.origin}/register?ref=${referralCode}` : '';

  return (
    <div style={{
      background: BG,
      minHeight: '100vh',
      paddingBottom: 100,
      color: TEXT_LIGHT,
      position: 'relative',
      overflowX: 'hidden'
    }}>
      {/* Background Gradient Effect */}
      <div style={{
        position: 'absolute',
        top: -100,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '600px',
        height: '600px',
        background: 'radial-gradient(circle, rgba(249, 115, 22, 0.1) 0%, rgba(9, 14, 23, 0) 60%)',
        zIndex: 0,
        pointerEvents: 'none'
      }} />

      <div style={{ position: 'relative', zIndex: 1, padding: '24px 20px 0' }}>
        {/* Header */}
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button style={{ background: 'none', border: 'none', color: ORANGE, cursor: 'pointer', padding: 0 }}>
              <Menu size={24} />
            </button>
            <h1 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: ORANGE, fontStyle: 'italic', letterSpacing: '0.05em' }}>
              PRO COACH
            </h1>
          </div>
          <div style={{
            width: 36, height: 36, borderRadius: '50%', overflow: 'hidden', border: `2px solid ${MUTED}`
          }}>
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: '100%', height: '100%', background: 'var(--color-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: MUTED, fontWeight: 800 }}>
                {profile?.name?.charAt(0) ?? 'C'}
              </div>
            )}
          </div>
        </header>

        {/* Profile Avatar & Info */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 32 }}>
          <div style={{ position: 'relative', marginBottom: 16 }}>
            <div style={{
              width: 100, height: 100, borderRadius: '50%', border: `3px solid ${ORANGE}`,
              overflow: 'hidden', background: 'var(--color-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: `0 0 20px rgba(249, 115, 22, 0.3)`
            }}>
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ fontSize: 32, fontWeight: 900, color: MUTED }}>{profile?.name?.charAt(0) ?? 'C'}</span>
              )}
            </div>
            {coachDetail?.approval_status === 'approved' && (
              <div style={{
                position: 'absolute', bottom: 0, right: 0, background: ORANGE, borderRadius: '50%', padding: 4,
                border: `2px solid ${BG}`
              }}>
                <CheckCircle2 size={16} color={TEXT_LIGHT} />
              </div>
            )}
          </div>
          <h2 style={{ margin: 0, fontSize: 26, fontWeight: 900, letterSpacing: '0.02em' }}>
            {profile?.name?.toUpperCase() || 'COACH'}
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: MUTED }}>{profile?.email}</p>
        </div>

        {/* Stats Row & Dynamic Performance Panel */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
          <div style={{ background: 'var(--color-surface)', borderRadius: 16, padding: '20px 16px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <p style={{ margin: 0, fontSize: 10, fontWeight: 800, color: MUTED, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              CURRENT LEVEL
            </p>
            <p style={{ margin: '8px 0 4px', fontSize: 24, fontWeight: 900, color: ORANGE, letterSpacing: '0.05em' }}>
              Lv.{coachDetail?.level || 1}
            </p>
            <p style={{ margin: 0, fontSize: 12, color: MUTED, fontWeight: 600 }}>每月動態績效評估</p>
          </div>
          <div style={{ background: 'var(--color-surface)', borderRadius: 16, padding: '20px 16px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <p style={{ margin: 0, fontSize: 10, fontWeight: 800, color: MUTED, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              PLATFORM COMMISSION
            </p>
            <p style={{ margin: '8px 0 4px', fontSize: 24, fontWeight: 900 }}>
              {coachDetail?.commission_rate || 45}%
            </p>
            <p style={{ margin: 0, fontSize: 12, color: MUTED, fontWeight: 600 }}>平台抽成比例</p>
          </div>
        </div>

        {/* 30-Day Performance Details */}
        {coachDetail?.performance_metrics && (
          <div style={{ background: 'var(--color-surface)', borderRadius: 16, padding: '24px 20px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: TEXT_LIGHT }}>近 30 天績效目標</h3>
              <span style={{ background: 'rgba(249, 115, 22, 0.1)', color: ORANGE, padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 800 }}>
                次月等級預測：Lv.{coachDetail.level}
              </span>
            </div>
            <p style={{ fontSize: 13, color: MUTED, marginBottom: 20, lineHeight: 1.5 }}>
              💡 教練等級為「每月動態績效制」。系統會自動根據您過去 30 天的表現，決定您當下的等級與平台抽成率，請維持優質服務！
            </p>

            {/* Metrics List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {(() => {
                const metrics = coachDetail.performance_metrics;
                const targetLv = Math.min((coachDetail.level || 1) + 1, 4);
                const thresholds = coachDetail.performance_thresholds || {};
                
                const targetLessons = targetLv === 4 ? (thresholds.lv4_lessons||6) : targetLv === 3 ? (thresholds.lv3_lessons||4) : (thresholds.lv2_lessons||2);
                const targetRating = targetLv === 4 ? 4.8 : targetLv === 3 ? 4.7 : 4.5;
                const targetResponse = targetLv === 4 ? '< 15分' : targetLv === 3 ? '< 60分' : '> 80%';
                
                const renderMetric = (label, value, targetStr, isPass) => (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 12, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 24, height: 24, borderRadius: '50%', background: isPass ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {isPass ? <Check size={14} color="#10B981" /> : <div style={{ width: 8, height: 2, background: '#EF4444', borderRadius: 2 }} />}
                      </div>
                      <span style={{ fontSize: 14, fontWeight: 600, color: TEXT_LIGHT }}>{label}</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 14, fontWeight: 800, color: isPass ? '#10B981' : '#EF4444' }}>{value}</div>
                      <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>門檻: {targetStr}</div>
                    </div>
                  </div>
                );

                return (
                  <>
                    <div style={{ fontSize: 12, fontWeight: 800, color: ORANGE, marginBottom: 4 }}>目標：達到或維持 Lv.{targetLv}</div>
                    {renderMetric('近30天完課數', `${metrics.monthly_lessons} 堂`, `${targetLessons} 堂`, metrics.monthly_lessons >= targetLessons)}
                    {renderMetric('平均評分', `${metrics.average_rating} 顆星`, `≥ ${targetRating}`, Number(metrics.average_rating) >= targetRating)}
                    {renderMetric('回覆速度/率', targetLv < 3 ? `${metrics.response_rate}%` : `${metrics.average_response_time} 分鐘`, targetResponse, targetLv < 3 ? metrics.response_rate >= 80 : metrics.average_response_time <= (targetLv===4?15:60))}
                    {renderMetric('惡意取消紀錄', `${metrics.malicious_cancels} 次`, '0 次 (含逾期未接)', metrics.malicious_cancels === 0)}
                  </>
                );
              })()}
            </div>
          </div>
        )}

        {/* Wallet Balance Card */}
        <div style={{ background: 'var(--color-surface)', borderRadius: 16, padding: '20px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Wallet size={16} color={ORANGE} />
              <span style={{ fontSize: 11, fontWeight: 800, color: MUTED, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                WALLET BALANCE
              </span>
            </div>
            <span style={{ fontSize: 22, fontWeight: 900 }}>
              ${netEarnings.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button style={{
              flex: 1, padding: '12px', background: ORANGE, color: TEXT_LIGHT, borderRadius: 12,
              fontWeight: 800, fontSize: 14, border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
            }}>
              Top Up
            </button>
            <button onClick={() => router.push('/dashboard/coach/earnings')} style={{
              flex: 1, padding: '12px', background: 'transparent', color: TEXT_LIGHT, borderRadius: 12,
              fontWeight: 800, fontSize: 14, border: `1px solid ${MUTED}`, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
            }}>
              <Clock size={16} /> Details
            </button>
          </div>
        </div>

        {/* Refer a Fellow Coach */}
        <div style={{ padding: '0 0 32px 0' }}>
          <div style={{ background: 'var(--color-surface)', borderRadius: RADIUS, padding: 24, boxShadow: SHADOW, display: 'flex', flexDirection: 'column', gap: 24, border: `1px solid ${BORDER}` }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--color-surface-soft)', border: '1px solid var(--color-border)', padding: '16px 20px', borderRadius: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, background: 'rgba(255,255,255,0.1)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Wallet size={20} color={ORANGE} />
                </div>
                <div>
                  <div style={{ fontSize: 13, color: MUTED, fontWeight: 700, letterSpacing: '0.05em' }}>推廣獎勵 (待發放)</div>
                  <div style={{ fontSize: 24, fontWeight: 900, color: TEXT_LIGHT }}>NT$ 0</div>
                  <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>每邀請一位教練可獲得 $500</div>
                </div>
              </div>
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 800, color: MUTED, marginBottom: 8, display: 'block' }}>我的推廣碼</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  readOnly
                  value={referralCode}
                  style={{ flex: 1, padding: '12px 16px', background: 'var(--color-surface-soft)', border: `1px solid ${BORDER}`, borderRadius: 12, fontSize: 18, fontWeight: 900, color: TEXT_LIGHT, letterSpacing: '0.1em', textAlign: 'center' }}
                />
                <button onClick={handleCopyCode} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 16px', background: copiedCode ? 'var(--color-success)' : 'var(--color-surface-soft)', color: copiedCode ? 'var(--text-light)' : ORANGE, border: 'none', borderRadius: 12, cursor: 'pointer', transition: '0.2s', fontWeight: 800 }}>
                  {copiedCode ? <Check size={18} /> : <Copy size={18} />}
                </button>
              </div>
              <p style={{ fontSize: 12, color: MUTED, marginTop: 8, lineHeight: 1.5 }}>
                分享這個代碼或下方 QR Code 給其他教練。他們註冊並完成驗證後，系統會自動發放推廣獎勵！
              </p>
            </div>

            {promotionUrl && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20, background: 'var(--color-surface-soft)', borderRadius: 16, border: `1px dashed ${BORDER}` }}>
                <label style={{ fontSize: 12, fontWeight: 800, color: MUTED, marginBottom: 16 }}>推廣 QR Code</label>
                <div style={{ background: 'var(--color-surface)', padding: 12, borderRadius: 16, boxShadow: `0 0 20px rgba(249, 115, 22, 0.2)` }}>
                  <QRCodeSVG
                    value={promotionUrl}
                    size={160}
                    level="H"
                    imageSettings={{
                      src: '/apple-touch-icon.png',
                      x: undefined, y: undefined, height: 32, width: 32, excavate: true,
                    }}
                  />
                </div>
                <div style={{ fontSize: 12, color: MUTED, marginTop: 12, fontWeight: 700 }}>
                  可直接讓對方掃碼註冊成為教練
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Video Upload Section */}
        <div style={{ marginBottom: 32 }}>
          <VideoUpload />
        </div>

        {/* ACCOUNT SETTINGS */}
        <div style={{ marginBottom: 32 }}>
          <p style={{ margin: '0 0 16px', fontSize: 11, fontWeight: 800, color: MUTED, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            ACCOUNT SETTINGS
          </p>
          <div style={{ background: 'var(--color-surface)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)' }}>
            {[
              { icon: User, label: 'Personal Information', onClick: () => router.push('/coach/profile/edit') },
              { icon: Shield, label: 'Security & Password', onClick: () => router.push('/coach/profile/edit') },
              { icon: Clock, label: 'Schedule Settings', onClick: () => router.push('/coach/schedule') },
              { icon: MessageCircle, label: `Notifications (${pendingMessages} Unread)`, onClick: () => router.push('/chat') },
              { icon: FileText, label: 'Manage Plans', onClick: () => router.push('/coach/plans') },
              { icon: Globe, label: 'Language Preference', right: 'English' }
            ].map((item, idx) => (
              <div key={item.label} onClick={item.onClick} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px',
                borderBottom: idx === 5 ? 'none' : '1px solid rgba(255,255,255,0.05)', cursor: item.onClick ? 'pointer' : 'default'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <item.icon size={18} color={MUTED} />
                  <span style={{ fontSize: 14, fontWeight: 700 }}>{item.label}</span>
                </div>
                {item.right ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 13, color: MUTED, fontWeight: 600 }}>{item.right}</span>
                    <ChevronRight size={16} color={MUTED} />
                  </div>
                ) : (
                  <ChevronRight size={16} color={MUTED} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* RECENT ACTIVITY */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 800, color: MUTED, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              RECENT ACTIVITY
            </p>
            <button onClick={() => router.push('/bookings')} style={{ background: 'none', border: 'none', color: ORANGE, fontSize: 11, fontWeight: 800, cursor: 'pointer' }}>
              SEE ALL
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {bookings.slice(0, 2).map((booking, idx) => (
              <div key={booking.id} onClick={() => router.push('/bookings')} style={{
                background: 'var(--color-surface)', borderRadius: 16, padding: '16px 20px', border: '1px solid rgba(255,255,255,0.05)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 10, background: idx === 0 ? 'rgba(249, 115, 22, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: idx === 0 ? ORANGE : '#3B82F6'
                  }}>
                    {idx === 0 ? <ArrowUpRight size={20} /> : <CreditCard size={20} />}
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>{booking.user_name || 'Student'} Session</p>
                    <p style={{ margin: '4px 0 0', fontSize: 12, color: MUTED, fontStyle: 'italic' }}>
                      {booking.expected_time ? new Date(booking.expected_time).toLocaleDateString() : 'Pending'} • {booking.status === 'completed' ? 'Completed' : 'Pending'}
                    </p>
                  </div>
                </div>
                <span style={{ fontSize: 15, fontWeight: 800, color: booking.status === 'completed' ? '#10B981' : MUTED }}>
                  {booking.status === 'completed' ? '+' : ''}${booking.coach_payout || booking.final_price || booking.base_price || 0}
                </span>
              </div>
            ))}
            {bookings.length === 0 && (
              <div style={{ padding: 20, textAlign: 'center', background: 'var(--color-surface)', borderRadius: 16 }}>
                <p style={{ margin: 0, color: MUTED, fontSize: 13 }}>No recent activity.</p>
              </div>
            )}
          </div>
        </div>

        {/* SIGN OUT */}
        <div style={{ paddingBottom: 40 }}>
          <button onClick={logout} style={{
            width: '100%', padding: '16px', background: 'var(--color-surface-soft)', color: 'var(--color-danger)', border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 16, fontSize: 14, fontWeight: 800, cursor: 'pointer', transition: '0.2s',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
          }}>
            SIGN OUT
          </button>
        </div>

      </div>
    </div>
  );
}

```

## File: app/api/bookings/route.js

```javascript
import { NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';
import { calcBaseDiscount } from '@/lib/discountRules';
import { addWeeks } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import { getCoachSaleability, pickFormalPlanForBooking } from '@/lib/salableCoachRules';
import {
  assertFutureBookingTime,
  calculateBookingPrice,
  getServerCouponDiscount,
  isBookingTimeAllowed,
} from '@/lib/bookingSecurity';

const OPTIONAL_BOOKING_COLUMNS = new Set([
  'grade',
  'gender',
  'attendees_count',
  'learning_status',
  'coupon_id',
  'coupon_discount',
  'series_id',
  'recurrence_pattern',
  'session_number',
  'duration_minutes',
  'payment_expires_at',
  'plan_id',
  'plan_title',
  'plan_snapshot',
]);

function getMissingColumnName(error) {
  const text = [error?.message, error?.details, error?.hint]
    .filter(Boolean)
    .join(' ');

  return (
    text.match(/'([^']+)' column/)?.[1] ||
    text.match(/column "([^"]+)"/)?.[1] ||
    null
  );
}

async function fetchExistingBookings(adminSupabase, coachId, nowIso) {
  const optionalFields = ['payment_expires_at', 'duration_minutes'];
  let fields = ['id', 'expected_time', 'status', ...optionalFields];

  for (let attempt = 0; attempt <= optionalFields.length; attempt += 1) {
    const { data, error } = await adminSupabase
      .from('bookings')
      .select(fields.join(', '))
      .eq('coach_id', coachId)
      .gte('expected_time', nowIso)
      .in('status', ['pending_payment', 'scheduled', 'in_progress', 'pending_completion', 'completed']);

    if (!error) return data || [];

    const missingColumn = getMissingColumnName(error);
    if (!missingColumn || !fields.includes(missingColumn)) {
      throw error;
    }

    console.warn(`[BOOKING] Missing optional select column "${missingColumn}", retrying without it.`);
    fields = fields.filter((field) => field !== missingColumn);
  }

  return [];
}

async function insertBookingsWithSchemaFallback(adminSupabase, rows) {
  let currentRows = rows.map((row) => ({ ...row }));
  const removedColumns = [];

  for (let attempt = 0; attempt <= OPTIONAL_BOOKING_COLUMNS.size; attempt += 1) {
    const { data, error } = await adminSupabase
      .from('bookings')
      .insert(currentRows)
      .select('id');

    if (!error) {
      return { data, removedColumns };
    }

    const missingColumn = getMissingColumnName(error);
    if (!missingColumn || !OPTIONAL_BOOKING_COLUMNS.has(missingColumn)) {
      throw error;
    }

    removedColumns.push(missingColumn);
    console.warn(`[BOOKING] Missing optional insert column "${missingColumn}", retrying without it.`);
    currentRows = currentRows.map((row) => {
      const next = { ...row };
      delete next[missingColumn];
      return next;
    });
  }

  throw new Error('預約建立失敗，資料庫欄位缺失過多');
}

export async function POST(request) {
  try {
    const auth = await requireAuth(['user', 'admin']);
    if (auth.error) return NextResponse.json(auth, { status: auth.status });
    
    const adminSupabase = getAdminSupabase();
    const userId = auth.user.id;
    const { 
      coachId, 
      expectedTime, 
      grade, 
      age, // 新增：支援前端傳入的 age
      gender, 
      attendeesCount, 
      learningStatus,
      couponId = null,
      isRecurring = false,
      recurringWeeks = 1,
      planId
    } = await request.json();

    const finalGrade = age || grade; // 映射

    // 1. 獲取教練當前價格、抽成比例與審核狀態
    const { data: coach, error: coachErr } = await adminSupabase
      .from('coaches')
      .select('base_price, commission_rate, approval_status, available_times')
      .eq('user_id', coachId)
      .single();

    const normalizedExpectedTime = new Date(expectedTime);
    if (Number.isNaN(normalizedExpectedTime.getTime())) {
      return NextResponse.json({ error: 'Invalid booking time' }, { status: 400 });
    }

    const futureTimeCheck = assertFutureBookingTime(normalizedExpectedTime);
    if (!futureTimeCheck.ok) {
      return NextResponse.json({ error: futureTimeCheck.error }, { status: futureTimeCheck.status });
    }

    if (coachErr || !coach) return NextResponse.json({ error: '找不到該教練資料' }, { status: 404 });

    // ✅ 安全門檻：只有 'approved' 狀態的教練才能接受預約
    if (coach.approval_status !== 'approved') {
      return NextResponse.json({ 
        error: '該教練目前不接受預約（尚未審核通過或已被暫停）',
        status: coach.approval_status 
      }, { status: 403 });
    }

    const { data: coachPlans, error: coachPlansError } = await adminSupabase
      .from('coach_plans')
      .select('*')
      .eq('coach_id', coachId)
      .eq('is_active', true);

    if (coachPlansError) throw coachPlansError;

    const planPick = pickFormalPlanForBooking({
      requestedPlanId: planId,
      plans: coachPlans || [],
    });
    if (!planPick.ok) {
      return NextResponse.json({ error: planPick.error }, { status: planPick.status });
    }

    const selectedPlan = planPick.plan;

    const [{ data: availabilityRules, error: availabilityRulesError }, { data: availabilityExceptions, error: availabilityExceptionsError }] = await Promise.all([
      adminSupabase
        .from('coach_availability_rules')
        .select('weekday, start_time, end_time, slot_minutes, is_active')
        .eq('coach_id', coachId),
      adminSupabase
        .from('coach_availability_exceptions')
        .select('exception_date, exception_type, start_time, end_time')
        .eq('coach_id', coachId),
    ]);

    if (availabilityRulesError) throw availabilityRulesError;
    if (availabilityExceptionsError) throw availabilityExceptionsError;

    const saleability = getCoachSaleability({
      coach,
      plans: coachPlans || [],
      availabilityRules: availabilityRules || [],
    });
    if (!saleability.canSell) {
      return NextResponse.json({
        error: '該教練尚未完成正式課程方案或固定可預約時段設定，暫不開放預約',
        reasons: saleability.reasons,
      }, { status: 400 });
    }

    const durationMinutes = selectedPlan.duration_minutes;
    const planPrice = selectedPlan.price;

    const totalSessions = isRecurring ? parseInt(recurringWeeks) : 1;
    const seriesId = isRecurring ? uuidv4() : null;
    const recurrencePattern = isRecurring ? 'weekly' : null;

    // 獲取該教練未來的所有有效預約 (為了在記憶體中進行區間比對)
    const nowIso = new Date().toISOString();
    const existingBookings = await fetchExistingBookings(adminSupabase, coachId, nowIso);

    for (let i = 0; i < totalSessions; i++) {
      const sessionTime = isRecurring ? addWeeks(normalizedExpectedTime, i) : normalizedExpectedTime;
      const availabilityCheck = isBookingTimeAllowed({
        expectedTime: sessionTime,
        durationMinutes,
        rules: availabilityRules || [],
        exceptions: availabilityExceptions || [],
        legacyAvailableTimes: null,
      });
      if (!availabilityCheck.ok) {
        return NextResponse.json({ error: `第 ${i + 1} 堂課無法預約：${availabilityCheck.error}` }, { status: 400 });
      }

      const newStart = sessionTime.getTime();
      const newEnd = newStart + durationMinutes * 60 * 1000;

      // 嚴格比對時間區間重疊
      const hasOverlap = existingBookings?.some(booking => {
        // 若為 pending_payment 且已過期，則不視為衝突
        if (booking.status === 'pending_payment' && booking.payment_expires_at) {
          const expiresAt = new Date(booking.payment_expires_at).getTime();
          if (Date.now() > expiresAt) return false;
        }

        const existingStart = new Date(booking.expected_time).getTime();
        const existingDuration = booking.duration_minutes || 60; 
        const existingEnd = existingStart + existingDuration * 60 * 1000;
        
        // 區間重疊條件: (StartA < EndB) && (StartB < EndA)
        return (newStart < existingEnd) && (existingStart < newEnd);
      });

      if (hasOverlap) {
        return NextResponse.json({ error: `時段衝突：第 ${i + 1} 堂課的時段（包含課程長度）已與現有預約重疊。` }, { status: 409 });
      }
    }

    const basePrice = planPrice;

    // 2. 計算基礎折扣率 (基於用戶等級與預約歷史)
    const { count: userBookingsCount } = await adminSupabase
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);
    
    const { data: userData, error: userDataErr } = await adminSupabase
      .from('users')
      .select('level')
      .eq('id', userId)
      .maybeSingle();

    if (userDataErr) throw userDataErr;

    let couponResult;
    try {
      const { data: authUser, error: authUserError } = await adminSupabase.auth.admin.getUserById(userId);
      if (authUserError) throw authUserError;
      const metadata = authUser?.user?.user_metadata || {};
      couponResult = getServerCouponDiscount({
        requestedCouponId: couponId,
        claimedCoupons: metadata.coupons || [],
      });
    } catch (couponError) {
      return NextResponse.json({ error: couponError.message || '優惠券驗證失敗' }, { status: 400 });
    }
    
    const isFirst = (userBookingsCount || 0) === 0;
    // Fetch global level settings
    const { data: settings } = await adminSupabase
      .from('platform_settings')
      .select('*')
      .like('key', 'level_%_discount');
      
    const settingsObj = (settings || []).reduce((acc, curr) => {
      acc[curr.key] = Number(curr.value);
      return acc;
    }, {});

    const levelKey = `level_${userData?.level || 1}_discount`;
    let levelDiscount = 0;
    if (settingsObj[levelKey] !== undefined) {
      levelDiscount = settingsObj[levelKey];
    } else {
      const defaultDiscounts = { 1: 0, 2: 3, 3: 6, 4: 12 };
      levelDiscount = defaultDiscounts[userData?.level || 1] ?? 12;
    }

    const customDiscount = metadata.custom_discount !== undefined && metadata.custom_discount !== null 
      ? Number(metadata.custom_discount) 
      : 0;

    const baseDiscountPercent = calcBaseDiscount(levelDiscount + customDiscount, isFirst);

    // Fetch dynamic commission rate based on coach performance
    const { getCoachPerformance } = require('@/lib/coachPerformance');
    const coachPerformance = await getCoachPerformance(coachId, adminSupabase);
    const coachCommission = coachPerformance.currentCommission;

    // 3. 累加折扣 (基礎 + server 驗證後的優惠券)
    const couponDiscountPercent = couponResult.percent;
    const pricing = calculateBookingPrice({
      basePrice,
      attendeesCount,
      baseDiscountPercent,
      couponDiscountPercent,
      coachCommission,
    });
    const discountAmount = pricing.discountAmount;

    // 4. 計算金額拆分
    const finalPrice = pricing.finalPrice;
    const depositPaid = pricing.depositPaid;
    const platformFee = pricing.platformFee;
    const coachPayout = pricing.coachPayout;

    // 5. 建立預約紀錄
    const bookingsToInsert = [];
    const paymentExpiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    for (let i = 0; i < totalSessions; i++) {
      const sessionTime = isRecurring ? addWeeks(normalizedExpectedTime, i) : normalizedExpectedTime;
      bookingsToInsert.push({
        user_id: userId,
        coach_id: coachId,
        expected_time: sessionTime.toISOString(),
        base_price: basePrice,
        discount_amount: discountAmount,
        final_price: finalPrice,
        deposit_paid: depositPaid,
        platform_fee: platformFee,
        coach_payout: coachPayout,
        grade: finalGrade,
        gender: gender,
        attendees_count: attendeesCount,
        learning_status: learningStatus,
        coupon_id: couponResult.couponId,
        coupon_discount: couponDiscountPercent,
        status: 'pending_payment',
        series_id: seriesId,
        recurrence_pattern: recurrencePattern,
        session_number: i + 1,
        duration_minutes: durationMinutes,
        payment_expires_at: paymentExpiresAt,
        plan_id: selectedPlan.id,
        plan_title: selectedPlan.title,
        plan_snapshot: JSON.stringify({
          id: selectedPlan.id,
          title: selectedPlan.title,
          description: selectedPlan.description || '',
          duration_minutes: selectedPlan.duration_minutes,
          price: selectedPlan.price,
          is_default: selectedPlan.is_default,
        })
      });
    }

    const { data: bookings, removedColumns } = await insertBookingsWithSchemaFallback(adminSupabase, bookingsToInsert);

    if (removedColumns.length) {
      console.warn(`[BOOKING] Created booking with schema fallback. Missing columns: ${removedColumns.join(', ')}`);
    }

    if (!bookings || bookings.length === 0) {
      throw new Error('預約建立失敗，無回傳資料');
    }

    const bookingId = bookings[0].id;

    // 5. 自動建立或連結聊天室 (Auto-Chat Feature)
    try {
      // 檢查是否已有現存聊天室
      const { data: existingRoom } = await adminSupabase
        .from('chat_rooms')
        .select('id')
        .eq('user_id', userId)
        .eq('coach_id', coachId)
        .maybeSingle();

      if (existingRoom) {
        // 已有聊天室，更新關聯的 booking_id
        await adminSupabase
          .from('chat_rooms')
          .update({ booking_id: bookingId })
          .eq('id', existingRoom.id);
        console.log(`[AUTO-CHAT] Linked booking ${bookingId} to existing room ${existingRoom.id}`);
      } else {
        // 建立新聊天室
        const { data: newRoom, error: roomErr } = await adminSupabase
          .from('chat_rooms')
          .insert([{ 
            user_id: userId, 
            coach_id: coachId,
            booking_id: bookingId 
          }])
          .select('id')
          .single();
        
        if (!roomErr) {
          console.log(`[AUTO-CHAT] Created new room ${newRoom.id} for booking ${bookingId}`);
        }
      }
    } catch (chatErr) {
      console.error('[AUTO-CHAT ERROR] Failed to sync chat room:', chatErr);
      // 不要因為聊天室建立失敗而導致預約失敗，僅記錄錯誤
    }

    return NextResponse.json({ 
      success: true, 
      bookingId: bookings[0].id,
      seriesId: seriesId,
      perSessionFinalPrice: finalPrice,
      totalFinalPrice: finalPrice * totalSessions,
      finalPrice: finalPrice * totalSessions,
      perSessionDepositPaid: depositPaid,
      totalDepositPaid: depositPaid * totalSessions,
      depositPaid: depositPaid * totalSessions,
      totalSessions
    });
  } catch (error) {
    console.error('Booking creation error:', error);
    return NextResponse.json({ error: '預約失敗，伺服器內部錯誤' }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    const auth = await requireAuth();
    if (auth.error) return NextResponse.json(auth, { status: auth.status });

    const adminSupabase = getAdminSupabase();
    let query = adminSupabase
      .from('bookings')
      .select(`
        *, 
        users!bookings_user_id_fkey(name), 
        coaches:users!bookings_coach_id_fkey(name), 
        reviews(id)
      `)
      .order('created_at', { ascending: false });

    if (auth.user.role === 'admin') {
      // 管理員讀取全部
    } else if (auth.user.role === 'coach') {
      query = query.eq('coach_id', auth.user.id);
    } else {
      query = query.eq('user_id', auth.user.id);
    }

    const { data: bookings, error } = await query;
    if (error) throw error;

    // 5. 格式化回傳資料（確保安全取值），並過濾掉已過期的待付款訂單
    const formatted = (bookings || [])
      .filter(b => {
        if (b.status === 'pending_payment' && b.payment_expires_at) {
          const expiresAt = new Date(b.payment_expires_at).getTime();
          if (Date.now() > expiresAt) {
            return false; // 過期的待付款訂單直接消失
          }
        }
        return true;
      })
      .map(b => ({
      ...b,
      user_name: b.users?.name || '未知使用者',
      coach_name: b.coaches?.name || '未知教練',
      review_id: b.reviews && b.reviews.length > 0 ? b.reviews[0].id : null
    }));

    return NextResponse.json({ bookings: formatted });
  } catch (err) {
    console.error('Booking list error:', err);
    return NextResponse.json({ error: '無法取得預約資料' }, { status: 500 });
  }
}

```

## File: app/api/bookings/[id]/status/route.js

```javascript
import { getAdminSupabase } from "@/lib/supabase";
import { requireAuth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { canTransitionBookingStatus, buildExpiredPendingPaymentUpdate, getPendingPaymentExpirationState } from "@/lib/bookingWorkflow";

// ============================================================
// 預約狀態機：精確定義每個角色可執行的轉換
// ============================================================
const STATUS_TRANSITION_RULES = {
  // 目前狀態: { 角色: [允許轉換到的目標狀態] }
  pending_payment: {
    student: ["cancelled"],
    coach: ["cancelled"],
  },
  scheduled: {
    student: ["cancelled"],
    coach: ["in_progress", "completed", "cancelled"],
  },
  in_progress: {
    coach: ["pending_completion", "completed"],
  },
  pending_completion: {
    student: ["completed"], // 學生確認完課
  },
  completed: {},  // 終態
  cancelled: {},  // 終態
  refunded: {},   // 終態
};

export async function POST(request, { params }) {
  try {
    const auth = await requireAuth();
    if (auth.error) return NextResponse.json(auth, { status: auth.status });
    
    const { id } = await params;
    const { status: newStatus, cancelReason } = await request.json(); 
    
    const adminSupabase = getAdminSupabase();
    
    // 1. 讀取預約現況並驗證身份
    const { data: booking, error: bError } = await adminSupabase
      .from('bookings')
      .select('*, users!bookings_user_id_fkey(referred_by, referral_completed)')
      .eq('id', id)
      .single();

    if (bError || !booking) return NextResponse.json({ error: '找不到該預約記錄' }, { status: 404 });

    const expiration = getPendingPaymentExpirationState(booking);
    if (expiration.expired) {
      await adminSupabase
        .from('bookings')
        .update(buildExpiredPendingPaymentUpdate())
        .eq('id', id)
        .eq('status', 'pending_payment');

      return NextResponse.json({ error: expiration.error }, { status: expiration.status });
    }

    // 2. 角色判定與狀態機驗證
    let hasFinalReport = false;
    if (newStatus === 'completed') {
      const { data: report } = await adminSupabase
        .from('learning_reports')
        .select('id')
        .eq('booking_id', id)
        .neq('completed_items', '__AI_DRAFT__')
        .maybeSingle();
      hasFinalReport = Boolean(report);
    }

    const transition = canTransitionBookingStatus({
      actor: auth.user,
      booking,
      newStatus,
      hasFinalReport,
    });

    if (!transition.ok) {
      return NextResponse.json({
        error: transition.error,
        role: transition.role,
      }, { status: transition.status });
    }

    const role = transition.role;

    // 3. 執行更新
    const updateData = { status: newStatus };
    
    if (newStatus === 'completed') {
      updateData.completed_at = new Date().toISOString();
    } else if (newStatus === 'cancelled') {
      updateData.cancelled_at = new Date().toISOString();
      // 加入取消原因
      if (cancelReason) {
        updateData.cancel_reason = cancelReason;
      }
    } else if (newStatus === 'refunded') {
      updateData.refunded_at = new Date().toISOString();
    }

    const { error: updateError } = await adminSupabase
      .from('bookings')
      .update(updateData)
      .eq('id', id);

    if (updateError) throw updateError;

    // 4. 防作弊機制：推薦獎勵處理
    if (newStatus === 'completed') {
      const student = booking.users;
      // 規則 2 & 3：有推薦人且是首次完課
      if (student && student.referred_by && student.referral_completed === false) {
        // 更新學員標記，避免後續重複發放
        await adminSupabase.from('users').update({ referral_completed: true }).eq('id', booking.user_id);
        
        // 規則 4 & 8：產生 pending 狀態日誌，24小時後發放，記錄 IP
        const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
        const suspiciousFlags = { ip };
        const releaseTime = new Date();
        releaseTime.setHours(releaseTime.getHours() + 24);
        
        await adminSupabase.from('reward_logs').insert([{
          referrer_user_id: student.referred_by,
          referred_user_id: booking.user_id,
          order_id: id,
          reward_type: 'referral_bonus',
          reward_amount: 100, // 暫定推薦獎金 100，可後續從設定讀取
          status: 'pending',
          release_time: releaseTime.toISOString(),
          suspicious_flags: suspiciousFlags
        }]);
      }
    } else if (newStatus === 'cancelled' || newStatus === 'refunded') {
      // 規則 5：退款追回機制
      const { data: logs } = await adminSupabase.from('reward_logs').select('id, status').eq('order_id', id);
      if (logs && logs.length > 0) {
        for (const log of logs) {
          if (log.status === 'pending') {
            await adminSupabase.from('reward_logs')
              .update({ status: 'cancelled', cancelled_reason: `Order ${newStatus}` })
              .eq('id', log.id);
          } else if (log.status === 'released') {
            await adminSupabase.from('reward_logs')
              .update({ status: 'reversed', cancelled_reason: `Order ${newStatus} after release` })
              .eq('id', log.id);
          }
        }
      }
    }

    // 6. 管理員審計日誌
    if (role === 'admin') {
      try {
        await adminSupabase.from('audit_logs').insert([{
          actor_id: auth.user.id,
          actor_role: 'admin',
          action: 'UPDATE_BOOKING_STATUS',
          target_id: id,
          details: `From ${booking.status} to ${newStatus}`
        }]);
      } catch (auditError) {
        console.warn('[BOOKING STATUS AUDIT LOG ERROR]', auditError);
      }
    }

    return NextResponse.json({ success: true, newStatus });
  } catch (err) {
    console.error("[BOOKING STATUS ERROR]", err);
    return NextResponse.json({ error: '伺服器內部錯誤' }, { status: 500 });
  }
}

```

## File: app/bookings/page.js

```javascript
'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { ShoppingBag, Calendar, FileText, Loader2, Upload, ExternalLink, Wallet } from 'lucide-react';

const BLUE  = 'var(--color-primary)';
const DARK  = 'var(--color-text)';
const MUTED = 'var(--color-text-muted)';
const BG    = 'transparent';
const WHITE = 'var(--color-surface)';
const PAYMENT_SETTINGS_FALLBACK = {
  bank_name: '',
  bank_code: '',
  bank_account_name: '',
  bank_account_number: '',
};

const STATUS_MAP = {
  'pending_payment':    '待付款',
  'scheduled':          '已排程',
  'in_progress':        '進行中',
  'pending_completion': '等候完課',
  'completed':          '已完成',
  'disputed':           '爭議中',
  'cancelled':          '已取消',
  'refunded':           '已退款',
};

const STATUS_STYLE = {
  pending_payment: { bg: 'rgba(245, 158, 11, 0.15)', color: 'var(--color-warning)' },
  completed:   { bg: 'rgba(34, 197, 94, 0.15)', color: 'var(--color-success)' },
  scheduled:   { bg: 'rgba(96, 165, 250, 0.15)', color: 'var(--color-primary)' },
  in_progress: { bg: 'rgba(245, 158, 11, 0.15)', color: 'var(--color-warning)' },
  default:     { bg: 'rgba(239, 68, 68, 0.15)', color: 'var(--color-danger)' },
};

function statusStyle(status) {
  return STATUS_STYLE[status] || STATUS_STYLE.default;
}

export default function BookingsPage() {
  const { user, loading: authLoading } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewingBooking, setReviewingBooking] = useState(null);
  const [reviewData, setReviewData] = useState({ rating: 5, comment: '' });
  const [submittingReview, setSubmittingReview] = useState(false);
  const [paymentSettings, setPaymentSettings] = useState(PAYMENT_SETTINGS_FALLBACK);
  const [paymentModalBooking, setPaymentModalBooking] = useState(null);
  const [paymentReceiptFile, setPaymentReceiptFile] = useState(null);
  const [paymentReceiptPreview, setPaymentReceiptPreview] = useState('');
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [reportingPayment, setReportingPayment] = useState(false);
  
  const [cancelModalBooking, setCancelModalBooking] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [canceling, setCanceling] = useState(false);

  const router = useRouter();
  const isCoach = user?.role === 'coach' || user?.role === 'admin';

  useEffect(() => {
    if (!authLoading && !user) { router.push('/login'); return; }
    if (user) {
      fetchBookings();
      fetchPaymentSettings();
    }
  }, [user, authLoading]);

  const fetchBookings = async () => {
    try {
      const res = await fetch('/api/bookings');
      if (res.ok) {
        const data = await res.json();
        setBookings(data.bookings || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPaymentSettings = async () => {
    try {
      const res = await fetch('/api/admin/settings');
      if (!res.ok) return;
      const data = await res.json();
      if (data.settings) {
        setPaymentSettings((prev) => ({
          ...prev,
          ...data.settings,
        }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleStatusUpdate = async (bookingId, newStatus) => {
    const res = await fetch(`/api/bookings/${bookingId}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    const data = await res.json();
    if (res.ok) {
      fetchBookings();
    } else {
      // If completion blocked by missing report, go to report page
      if (data.error?.includes('learning report')) {
        router.push(`/reports/${bookingId}`);
      } else {
        alert(data.error || '操作失敗');
      }
    }
  };

  const [adjustingId, setAdjustingId] = useState(null);
  const [adjustmentValue, setAdjustmentValue] = useState(0);
  const [adjusting, setAdjusting] = useState(false);

  const handleConfirmPayment = async (bookingId) => {
    const res = await fetch(`/api/bookings/${bookingId}/confirm-payment`, {
      method: 'POST',
    });
    const data = await res.json();
    if (res.ok) {
      fetchBookings();
    } else {
      alert(data.error || '付款確認失敗');
    }
  };

  const handleSubmitReview = async () => {
    if (!reviewingBooking) return;
    setSubmittingReview(true);
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: reviewingBooking.id,
          rating: reviewData.rating,
          comment: reviewData.comment
        }),
      });
      if (res.ok) {
        alert('感謝您的評價！');
        setReviewingBooking(null);
        setReviewData({ rating: 5, comment: '' });
        fetchBookings();
      } else {
        const data = await res.json();
        alert(data.error || '提交失敗');
      }
    } catch (err) {
      console.error(err);
      alert('發生錯誤');
    } finally {
      setSubmittingReview(false);
    }
  };

  const resetPaymentModal = () => {
    if (paymentReceiptPreview) {
      URL.revokeObjectURL(paymentReceiptPreview);
    }
    setPaymentModalBooking(null);
    setPaymentReceiptFile(null);
    setPaymentReceiptPreview('');
    setUploadingReceipt(false);
    setReportingPayment(false);
  };

  const openPaymentModal = (booking) => {
    if (paymentReceiptPreview) {
      URL.revokeObjectURL(paymentReceiptPreview);
    }
    setPaymentModalBooking(booking);
    setPaymentReceiptFile(null);
    setPaymentReceiptPreview('');
  };

  const handleReceiptChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (paymentReceiptPreview) {
      URL.revokeObjectURL(paymentReceiptPreview);
    }
    setPaymentReceiptFile(file);
    setPaymentReceiptPreview(URL.createObjectURL(file));
  };

  const handleReportPayment = async () => {
    if (!paymentModalBooking) return;
    if (!paymentReceiptFile) {
      alert('請先選擇轉帳截圖');
      return;
    }

    setUploadingReceipt(true);
    try {
      const formData = new FormData();
      formData.append('file', paymentReceiptFile);
      formData.append('fileType', 'payment_receipt');

      const uploadRes = await fetch('/api/files/upload', {
        method: 'POST',
        body: formData,
      });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) {
        throw new Error(uploadData.error || '截圖上傳失敗');
      }

      setUploadingReceipt(false);
      setReportingPayment(true);

      const reportRes = await fetch(`/api/bookings/${paymentModalBooking.id}/report-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: uploadData.url }),
      });
      const reportData = await reportRes.json();
      if (!reportRes.ok) {
        throw new Error(reportData.error || '付款回報失敗');
      }

      await fetchBookings();
      resetPaymentModal();
      alert('已收到您的付款資訊，正在確認中（約1-10分鐘）');
    } catch (err) {
      console.error(err);
      alert(err.message || '付款回報失敗');
      setUploadingReceipt(false);
      setReportingPayment(false);
    }
  };

  const handleAdjustPrice = async (bookingId) => {
    const val = parseInt(adjustmentValue);
    if (isNaN(val) || val < -200 || val > 200) {
      return alert('調整金額限 ±200 元內');
    }

    setAdjusting(true);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/adjust-price`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adjustment: val }),
      });
      if (res.ok) {
        alert('金額已調整！');
        setAdjustingId(null);
        fetchBookings();
      } else {
        const data = await res.json();
        alert(data.error || '調整失敗');
      }
    } catch (err) {
      alert('發生系統錯誤');
    } finally {
      setAdjusting(false);
    }
  };

  const handleCancelBooking = async () => {
    if (!cancelReason.trim()) return alert('請填寫取消原因');
    setCanceling(true);
    try {
      const res = await fetch(`/api/bookings/${cancelModalBooking.id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled', cancelReason }),
      });
      const data = await res.json();
      if (res.ok) {
        alert('預約已取消，並送交後台審核');
        setCancelModalBooking(null);
        setCancelReason('');
        fetchBookings();
      } else {
        alert(data.error || '操作失敗');
      }
    } catch (err) {
      alert('發生錯誤');
    } finally {
      setCanceling(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh', color: MUTED }}>
        <Loader2 className="animate-spin" size={32} />
      </div>
    );
  }

  const hasPaymentAccountInfo = Boolean(
    paymentSettings.bank_name ||
    paymentSettings.bank_code ||
    paymentSettings.bank_account_name ||
    paymentSettings.bank_account_number
  );

  return (
    <div style={{ padding: '20px 16px', background: BG, minHeight: '100vh', paddingBottom: 100 }}>

      <header style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 900, color: DARK, display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
          <ShoppingBag size={24} />
          {isCoach ? '教學訂單' : '我的預約'}
        </h1>
        {isCoach && (
          <p style={{ margin: '6px 0 0', fontSize: 13, color: MUTED }}>
            課程進行中請填寫「學習紀錄卡」才可完課
          </p>
        )}
      </header>

      {bookings.length === 0 ? (
        <div style={{
          background: 'var(--color-surface)', borderRadius: 20, padding: '48px 20px',
          textAlign: 'center', boxShadow: 'var(--shadow-card)', border: '1px solid var(--color-border)'
        }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
          <p style={{ fontSize: 16, fontWeight: 700, color: DARK, margin: '0 0 6px' }}>目前沒有訂單</p>
          <p style={{ fontSize: 13, color: MUTED, margin: 0 }}>
            {isCoach ? '完善教練資料後學員就能找到你' : '去找一位教練開始預約吧！'}
          </p>
          {isCoach ? (
            <button
              onClick={() => router.push('/dashboard/coach')}
              style={{ marginTop: 20, padding: '10px 28px', background: BLUE, color: 'var(--text-light)', border: 'none', borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
            >
              完善個人資料 →
            </button>
          ) : (
            <button
              onClick={() => router.push('/coaches')}
              style={{ marginTop: 20, padding: '10px 28px', background: BLUE, color: 'var(--text-light)', border: 'none', borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
            >
              去找教練 →
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {bookings.map(b => {
            const ss = statusStyle(b.status);
            const canStartReport = isCoach && (b.status === 'scheduled' || b.status === 'in_progress');
            const isCompleted = b.status === 'completed';
            const isPendingPayment = b.status === 'pending_payment';
            const hasReceipt = Boolean(b.payment_reference);
            const paymentExpiresAt = b.payment_expires_at ? new Date(b.payment_expires_at) : null;
            return (
              <div key={b.id} style={{
                background: 'var(--color-surface)', borderRadius: 20, padding: 18,
                boxShadow: 'var(--shadow-card)',
                border: '1px solid var(--color-border)',
              }}>
                {/* Top row: person + status */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 44, height: 44, background: 'rgba(96, 165, 250, 0.1)', color: 'var(--color-primary)',
                      borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 900, fontSize: 16,
                    }}>
                      {(isCoach ? b.user_name : b.coach_name)?.charAt(0) || '?'}
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, color: DARK, fontSize: 14 }}>
                        {isCoach ? (b.user_name || '學員') : (b.coach_name || '教練')}
                      </div>
                      <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>
                        #{b.id.substring(0, 8)}
                      </div>
                    </div>
                  </div>
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: '5px 10px',
                    borderRadius: 100, background: ss.bg, color: ss.color,
                  }}>
                    {STATUS_MAP[b.status] || b.status}
                  </span>
                </div>

                {/* Meta row: date + price */}
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  borderTop: '1px solid var(--color-border)', paddingTop: 12, marginBottom: canStartReport || isCompleted || isPendingPayment ? 12 : 0,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: DARK, fontSize: 13, fontWeight: 700 }}>
                    <Calendar size={13} color={BLUE} />
                    {b.expected_time ? new Date(b.expected_time).toLocaleString('zh-TW', { 
                      year: 'numeric', month: 'long', day: 'numeric',
                      hour: '2-digit', minute: '2-digit'
                    }) : '時間待定'}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    {(b.discount_amount > 0 || b.price_adjustment !== 0) && (
                      <div style={{ fontSize: 11, color: MUTED, marginBottom: 2 }}>
                        ${b.base_price?.toLocaleString()} 
                        {b.discount_amount > 0 && ` - 折扣 $${b.discount_amount}`}
                        {b.price_adjustment !== 0 && ` ${b.price_adjustment > 0 ? '+' : ''} 議價 $${b.price_adjustment}`}
                      </div>
                    )}
                    <div style={{ fontWeight: 900, color: DARK, fontSize: 15 }}>
                      NT${b.final_price?.toLocaleString() ?? '--'}
                    </div>
                  </div>
                </div>

                {isPendingPayment && (
                  <div style={{
                    borderTop: '1px solid var(--color-border)', paddingTop: 12, marginTop: 12,
                    background: 'var(--warning-bg)', borderRadius: 14, padding: 12,
                    color: 'var(--warning)', fontSize: 12, fontWeight: 700, lineHeight: 1.5,
                  }}>
                    {isCoach
                      ? '此訂單尚未付款確認，請勿視為正式排程。'
                      : hasReceipt
                        ? '已收到您的付款資訊，正在確認中（約1-10分鐘）。'
                        : '為確保預約成功，請依照系統金額轉帳。轉帳後上傳截圖即可完成預約。'}
                    {paymentExpiresAt && (
                      <div style={{ fontWeight: 600, marginTop: 4 }}>
                        保留至：{paymentExpiresAt.toLocaleString('zh-TW', { hour: '2-digit', minute: '2-digit', month: 'numeric', day: 'numeric' })}
                      </div>
                    )}
                    {!isCoach && hasReceipt && (
                      <a
                        href={b.payment_reference}
                        target="_blank"
                        rel="noreferrer"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 8, color: 'var(--warning)', fontWeight: 800, textDecoration: 'none' }}
                      >
                        <ExternalLink size={14} />
                        查看已上傳截圖
                      </a>
                    )}
                  </div>
                )}

                {!isCoach && isPendingPayment && (
                  <div style={{ display: 'flex', gap: 8, borderTop: '1px solid var(--color-border)', paddingTop: 12, marginTop: 12 }}>
                    <button
                      onClick={() => openPaymentModal(b)}
                      style={{
                        flex: 1,
                        padding: '11px 14px',
                        borderRadius: 12,
                        border: 'none',
                        background: BLUE,
                        color: 'var(--text-light)',
                        fontWeight: 800,
                        fontSize: 13,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                      }}
                    >
                      <Upload size={15} />
                      {hasReceipt ? '重新上傳轉帳截圖' : '上傳轉帳截圖'}
                    </button>
                  </div>
                )}

                {/* Price Adjust Actions (Coach Only) */}
                {isCoach && !isCompleted && !isPendingPayment && b.status !== 'cancelled' && (
                  <div style={{ borderTop: '1px solid var(--color-border)', marginTop: 12, paddingTop: 12 }}>
                    {adjustingId === b.id ? (
                      <div style={{ display:'flex', alignItems:'center', gap: 8 }}>
                         <div style={{ flex: 1, position:'relative' }}>
                            <span style={{ position:'absolute', left: 10, top:'50%', transform:'translateY(-50%)', fontSize:12, color:MUTED }}>±</span>
                            <input 
                              type="number" 
                              value={adjustmentValue}
                              onChange={e => setAdjustmentValue(e.target.value)}
                              placeholder="金額 (限制 ±200)"
                              style={{ width:'100%', padding:'8px 8px 8px 24px', borderRadius:8, border:`1px solid var(--color-border)`, background: 'var(--color-surface-soft)', color: DARK, fontSize:13 }}
                            />
                         </div>
                         <button 
                           onClick={() => handleAdjustPrice(b.id)}
                           disabled={adjusting}
                           style={{ padding:'8px 16px', borderRadius:8, background:BLUE, color:'var(--text-light)', fontSize:12, fontWeight:700, border:'none', cursor:'pointer' }}
                         >
                           {adjusting ? '...' : '確認'}
                         </button>
                         <button 
                           onClick={() => setAdjustingId(null)}
                           style={{ padding:'8px 12px', borderRadius:8, background:'var(--color-surface-soft)', color:MUTED, fontSize:12, fontWeight:700, border:'none', cursor:'pointer' }}
                         >
                           取消
                         </button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => { setAdjustingId(b.id); setAdjustmentValue(b.price_adjustment || 0); }}
                        style={{ background:'none', border:`1px solid var(--color-border)`, padding:'6px 12px', borderRadius:8, fontSize:12, fontWeight:700, color:DARK, cursor:'pointer' }}
                      >
                        📝 議價 / 調整金額
                      </button>
                    )}
                  </div>
                )}

                {/* Coach action buttons */}
                {isCoach && !isCompleted && b.status !== 'cancelled' && (
                  <div style={{ display: 'flex', gap: 8, borderTop: '1px solid var(--color-border)', paddingTop: 12 }}>
                    {(b.status === 'pending_payment' || b.status === 'scheduled') && (
                      <button
                        onClick={() => setCancelModalBooking(b)}
                        style={{
                          padding: '10px 16px', borderRadius: 12, border: 'none',
                          background: 'var(--color-surface-soft)', color: 'var(--color-danger)', fontWeight: 700, fontSize: 13, cursor: 'pointer',
                        }}
                      >
                        取消預約
                      </button>
                    )}
                    {user?.role === 'admin' && isPendingPayment && (
                      <button
                        onClick={() => handleConfirmPayment(b.id)}
                        style={{
                          flex: 1, padding: '10px', borderRadius: 12, border: 'none',
                          background: 'var(--success)', color: 'var(--text-light)', fontWeight: 700, fontSize: 13, cursor: 'pointer',
                        }}
                      >
                        確認付款
                      </button>
                    )}
                    {b.status === 'scheduled' && (
                      <button
                        onClick={() => handleStatusUpdate(b.id, 'in_progress')}
                        style={{
                          flex: 1, padding: '10px', borderRadius: 12, border: 'none',
                          background: 'var(--warning-bg)', color: 'var(--warning)', fontWeight: 700, fontSize: 13, cursor: 'pointer',
                        }}
                      >
                        ▶ 開始上課
                      </button>
                    )}
                    {canStartReport && (
                      <button
                        onClick={() => router.push(`/reports/${b.id}`)}
                        style={{
                          flex: 2, padding: '10px', borderRadius: 12, border: 'none',
                          background: BLUE, color: 'var(--text-light)', fontWeight: 700, fontSize: 13, cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                          boxShadow: `var(--shadow-card)`,
                        }}
                      >
                        <FileText size={14} /> 填寫學習紀錄卡
                      </button>
                    )}
                  </div>
                )}

                {/* Completed badge and review actions */}
                {isCompleted && (
                  <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 12 }}>
                    {!isCoach && !b.review_id ? (
                      <button
                        onClick={() => setReviewingBooking(b)}
                        style={{
                          width: '100%', padding: '10px', borderRadius: 12, border: `1px solid ${BLUE}`,
                          background: 'var(--color-surface)', color: BLUE, fontWeight: 700, fontSize: 13, cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        }}
                      >
                        ⭐ 撰寫評價
                      </button>
                    ) : (
                      <div style={{
                        fontSize: 12, color: 'var(--success)', fontWeight: 700, textAlign: 'center',
                      }}>
                        ✅ {isCoach ? '課程已完成，學習紀錄卡已歸檔' : (b.review_id ? '感謝您的評價！' : '課程已完成')}
                      </div>
                    )}
                  </div>
                )}

                {!isCoach && b.status === 'scheduled' && (
                  <div style={{
                    borderTop: '1px solid var(--color-border)',
                    paddingTop: 12,
                    marginTop: 12,
                    fontSize: 12,
                    fontWeight: 800,
                    color: 'var(--success)',
                    background: 'var(--success-bg)',
                    borderRadius: 14,
                    padding: 12,
                  }}>
                    預約成功，教練已收到您的訂單。
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Review Modal ─────────────────────────────────────── */}
      {reviewingBooking && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 100, padding: 20,
        }}>
          <div style={{
            background: 'var(--color-surface)', borderRadius: 24, width: '100%', maxWidth: 400, padding: 24,
            boxShadow: 'var(--shadow-card)', border: '1px solid var(--color-border)'
          }}>
            <h2 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 900, color: DARK }}>撰寫評價</h2>
            <p style={{ margin: '0 0 20px', fontSize: 13, color: MUTED }}>
              為教練 <b>{reviewingBooking.coach_name}</b> 的表現評分
            </p>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 24 }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setReviewData({ ...reviewData, rating: star })}
                  style={{
                    background: 'none', border: 'none', fontSize: 32, cursor: 'pointer',
                    color: star <= reviewData.rating ? '#F59E0B' : 'var(--color-border)',
                    transition: 'transform 0.1s',
                    transform: star <= reviewData.rating ? 'scale(1.1)' : 'scale(1)',
                  }}
                >
                  ★
                </button>
              ))}
            </div>

            <textarea
              placeholder="說點什麼吧...（選填）"
              value={reviewData.comment}
              onChange={(e) => setReviewData({ ...reviewData, comment: e.target.value })}
              style={{
                width: '100%', minHeight: 100, padding: 16, borderRadius: 16, border: '1px solid var(--color-border)',
                background: 'var(--color-surface-soft)', color: DARK, fontSize: 14, marginBottom: 20, resize: 'none',
              }}
            />

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => { setReviewingBooking(null); setReviewData({ rating: 5, comment: '' }); }}
                style={{ flex: 1, padding: 14, borderRadius: 12, border: 'none', background: 'var(--color-surface-soft)', color: MUTED, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
              >
                取消
              </button>
              <button
                onClick={handleSubmitReview}
                disabled={submittingReview}
                style={{
                  flex: 2, padding: 14, borderRadius: 12, border: 'none', background: BLUE, color: 'var(--text-light)',
                  fontWeight: 700, fontSize: 14, cursor: 'pointer', opacity: submittingReview ? 0.7 : 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
              >
                {submittingReview ? <Loader2 className="animate-spin" size={18} /> : '提交評價'}
              </button>
            </div>
          </div>
        </div>
      )}

      {paymentModalBooking && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 120, padding: 16,
        }}>
          <div style={{
            width: '100%', maxWidth: 480, background: 'var(--color-surface)', borderRadius: 24, padding: 24,
            boxShadow: 'var(--shadow-card)', border: '1px solid var(--color-border)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 18 }}>
              <div>
                <h2 style={{ margin: 0, color: DARK, fontWeight: 900, fontSize: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Wallet size={18} color={BLUE} />
                  回報匯款截圖
                </h2>
                <p style={{ margin: '8px 0 0', color: MUTED, fontSize: 13, lineHeight: 1.6 }}>
                  請依照下列收款資訊完成轉帳，再上傳截圖。送出後管理員會進行人工對帳。
                </p>
              </div>
              <button
                onClick={resetPaymentModal}
                style={{ border: 'none', background: 'var(--color-surface-soft)', color: MUTED, width: 36, height: 36, borderRadius: 12, cursor: 'pointer', fontWeight: 900 }}
              >
                ×
              </button>
            </div>

            <div style={{ background: 'var(--color-surface-soft)', borderRadius: 18, padding: 16, marginBottom: 16, display: 'grid', gap: 10 }}>
              <div style={{ fontSize: 12, color: MUTED, fontWeight: 700 }}>平台收款帳號</div>
              <div style={{ display: 'grid', gap: 8, color: DARK, fontSize: 14, fontWeight: 700 }}>
                <div>銀行代碼：{paymentSettings.bank_code || '尚未設定'}</div>
                <div>帳號：{paymentSettings.bank_account_number || '尚未設定'}</div>
              </div>
              {!hasPaymentAccountInfo && (
                <div style={{ fontSize: 12, color: 'var(--warning)', fontWeight: 700, lineHeight: 1.6 }}>
                  管理員尚未設定正式收款帳號。請先補齊後台付款設定，再請學員進行匯款。
                </div>
              )}
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ color: DARK, fontSize: 14, fontWeight: 800, marginBottom: 8 }}>
                訂單金額：NT${paymentModalBooking.final_price?.toLocaleString() ?? '--'}
              </div>
              <label style={{
                display: 'block', border: '1px dashed var(--color-primary)', borderRadius: 18, padding: 18,
                background: 'rgba(96, 165, 250, 0.1)', cursor: 'pointer', textAlign: 'center',
              }}>
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleReceiptChange} />
                <div style={{ color: BLUE, fontWeight: 800, fontSize: 14 }}>選擇轉帳截圖</div>
                <div style={{ color: MUTED, fontSize: 12, marginTop: 6 }}>支援 JPG / PNG / WebP，檔案限制 5MB</div>
              </label>
            </div>

            {paymentReceiptPreview && (
              <div style={{ marginBottom: 18 }}>
                <img
                  src={paymentReceiptPreview}
                  alt="付款截圖預覽"
                  style={{ width: '100%', height: 220, objectFit: 'cover', borderRadius: 18, border: '1px solid var(--color-border)' }}
                />
              </div>
            )}

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={resetPaymentModal}
                style={{ flex: 1, padding: 14, borderRadius: 14, border: 'none', background: 'var(--color-surface-soft)', color: MUTED, fontWeight: 800, cursor: 'pointer' }}
              >
                取消
              </button>
              <button
                onClick={handleReportPayment}
                disabled={!hasPaymentAccountInfo || uploadingReceipt || reportingPayment}
                style={{
                  flex: 2,
                  padding: 14,
                  borderRadius: 14,
                  border: 'none',
                  background: BLUE,
                  color: 'var(--text-light)',
                  fontWeight: 800,
                  cursor: 'pointer',
                  opacity: !hasPaymentAccountInfo || uploadingReceipt || reportingPayment ? 0.65 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Cancel Booking Modal ───────────────────────────────── */}
      {cancelModalBooking && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 130, padding: 16,
        }}>
          <div style={{
            width: '100%', maxWidth: 400, background: 'var(--color-surface)', borderRadius: 24, padding: 24,
            boxShadow: 'var(--shadow-card)', border: '1px solid var(--color-border)'
          }}>
            <h2 style={{ margin: '0 0 8px', color: 'var(--color-danger)', fontWeight: 900, fontSize: 20 }}>
              取消預約 / 拒絕接單
            </h2>
            <p style={{ margin: '0 0 20px', color: MUTED, fontSize: 13, lineHeight: 1.6 }}>
              請填寫您取消的原因。此原因將送交平台管理員審核，若非合理不可抗力因素，可能會影響您的教練績效評分與抽成比例。
            </p>

            <textarea
              placeholder="請詳細說明取消的原因..."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              style={{
                width: '100%', minHeight: 120, padding: 16, borderRadius: 16, border: '1px solid var(--color-border)',
                background: 'var(--color-surface-soft)', color: DARK, fontSize: 14, marginBottom: 20, resize: 'none',
              }}
            />

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => { setCancelModalBooking(null); setCancelReason(''); }}
                style={{ flex: 1, padding: 14, borderRadius: 14, border: 'none', background: 'var(--color-surface-soft)', color: MUTED, fontWeight: 800, cursor: 'pointer' }}
              >
                返回
              </button>
              <button
                onClick={handleCancelBooking}
                disabled={canceling}
                style={{
                  flex: 1, padding: 14, borderRadius: 14, border: 'none', background: 'var(--color-danger)', color: 'white',
                  fontWeight: 800, cursor: 'pointer', opacity: canceling ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
                }}
              >
                {canceling ? <Loader2 className="animate-spin" size={16} /> : '確認取消'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

```

## File: app/api/auth/profile/route.js

```javascript
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getAdminSupabase } from '@/lib/supabase';
import { SAFE_USER_PROFILE_FIELDS, sanitizeUserProfile } from '@/lib/securityRules';

export async function GET(request) {
  try {
    const auth = await requireAuth();
    if (auth.error) return NextResponse.json(auth, { status: auth.status });

    const adminSupabase = getAdminSupabase();
    
    // 1. 讀取用戶資料 (users 表)
    const { data: user, error } = await adminSupabase
      .from('users')
      .select(SAFE_USER_PROFILE_FIELDS.join(', '))
      .eq('id', auth.user.id)
      .single();

    if (error) throw error;

    let referredByName = null;
    if (user.referred_by) {
      const { data: referrer } = await adminSupabase
        .from('users')
        .select('name')
        .eq('id', user.referred_by)
        .maybeSingle();
      if (referrer) {
        referredByName = referrer.name;
      }
    }

    // 2. 讀取 Auth metadata (for coupons)
    const { data: authUser } = await adminSupabase.auth.admin.getUserById(auth.user.id);
    const userMetadata = authUser?.user?.user_metadata || {};
    const claimedCoupons = userMetadata.coupons || [];
    const activeCoupon = userMetadata.active_coupon || null;

    // 3. 讀取教練資料 (coaches 表)
    let coachData = null;
    let coachPerformance = null;
    if (user.role === 'coach') {
      const { data: coach } = await adminSupabase
        .from('coaches')
        .select('*')
        .eq('user_id', user.id)
        .single();
      coachData = coach;
      
      const { getCoachPerformance } = require('@/lib/coachPerformance');
      coachPerformance = await getCoachPerformance(coach.id, adminSupabase);
      
      // Override level and commission rate dynamically
      if (coachData && coachPerformance) {
        coachData.level = coachPerformance.currentLevel;
        coachData.commission_rate = coachPerformance.currentCommission;
        coachData.performance_metrics = coachPerformance.metrics;
        coachData.performance_thresholds = coachPerformance.thresholds;
      }
    }


    // 4. 讀取等級折扣設定
    const { data: settings } = await adminSupabase
      .from('platform_settings')
      .select('*')
      .like('key', 'level_%_discount');
      
    const settingsObj = (settings || []).reduce((acc, curr) => {
      acc[curr.key] = Number(curr.value);
      return acc;
    }, {});

    // 5. 計算總折扣
    let levelDiscount = 0;
    const levelKey = `level_${user.level || 1}_discount`;
    
    if (settingsObj[levelKey] !== undefined) {
      levelDiscount = settingsObj[levelKey];
    } else {
      // 如果還沒有全域設定，使用預設值
      const defaultDiscounts = { 1: 0, 2: 3, 3: 6, 4: 12 };
      levelDiscount = defaultDiscounts[user.level || 1] ?? 12;
    }

    let customDiscount = 0;
    if (userMetadata.custom_discount !== undefined && userMetadata.custom_discount !== null) {
      customDiscount = Number(userMetadata.custom_discount);
    }

    let baseDiscount = levelDiscount + customDiscount;

    const totalDiscount = baseDiscount + (activeCoupon ? activeCoupon.discount : 0);

    return NextResponse.json({ 
      profile: { 
        ...sanitizeUserProfile(user), 
        base_discount: baseDiscount, 
        total_discount: totalDiscount,
        referred_by_name: referredByName, 
        coupons: claimedCoupons,
        active_coupon: activeCoupon
      }, 
      coach: coachData 
    });
  } catch (err) {
    console.error('Profile fetch error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const auth = await requireAuth();
    if (auth.error) return NextResponse.json(auth, { status: auth.status });

    const body = await request.json();
    const adminSupabase = getAdminSupabase();
    const userId = auth.user.id;

    // 1. 動態構建更新物件 (users 表)，避免 null/undefined 覆蓋現有資料
    const userUpdates = {};
    if (body.name !== undefined) userUpdates.name = body.name?.trim();
    if (body.phone !== undefined) userUpdates.phone = body.phone;
    if (body.address !== undefined) userUpdates.address = body.address;
    if (body.language !== undefined) userUpdates.language = body.language;
    if (body.learning_goals !== undefined) userUpdates.learning_goals = body.learning_goals;
    if (body.grade !== undefined) userUpdates.grade = body.grade;
    if (body.gender !== undefined) userUpdates.gender = body.gender;
    if (body.frequent_addresses !== undefined) {
      userUpdates.frequent_addresses = body.frequent_addresses ? JSON.stringify(body.frequent_addresses) : null;
    }

    if (Object.keys(userUpdates).length > 0) {
      const { error: userError } = await adminSupabase
        .from('users')
        .update(userUpdates)
        .eq('id', userId);
      if (userError) throw userError;
    }

    // 2. 如果是教練，更新教練特定欄位 (coaches 表)
    if (auth.user.role === 'coach') {
      const coachUpdates = { user_id: userId };
      if (body.university !== undefined) coachUpdates.university = body.university;
      if (body.location !== undefined) coachUpdates.location = body.location;
      if (body.service_areas !== undefined) coachUpdates.service_areas = body.service_areas?.trim() || '';
      if (body.languages !== undefined) coachUpdates.languages = body.languages;
      if (body.experience !== undefined) coachUpdates.experience = body.experience?.trim();
      if (body.philosophy !== undefined) coachUpdates.philosophy = body.philosophy?.trim();
      if (body.teaching_features !== undefined) coachUpdates.teaching_features = body.teaching_features?.trim();
      if (body.communication_style !== undefined) coachUpdates.communication_style = body.communication_style?.trim();
      if (body.policy_rules !== undefined) coachUpdates.policy_rules = body.policy_rules?.trim();
      if (body.trust_badges !== undefined) coachUpdates.trust_badges = body.trust_badges;
      if (body.base_price !== undefined) coachUpdates.base_price = parseInt(body.base_price) || 1000;
      if (body.available_times !== undefined) coachUpdates.available_times = body.available_times;

      if (Object.keys(coachUpdates).length > 1) { // 至少要有 user_id 以外的欄位
        const { error: coachError } = await adminSupabase
          .from('coaches')
          .upsert(coachUpdates);
        if (coachError) throw coachError;
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: '資料更新成功' 
    });
  } catch (err) {
    console.error('Profile update error:', err);
    return NextResponse.json({ error: err.message || '伺服器錯誤' }, { status: 500 });
  }
}

```

## File: app/api/admin/coaches/route.js

```javascript
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getAdminSupabase } from '@/lib/supabase';

/**
 * GET: 管理員取得所有教練列表及其審核狀態
 */
export async function GET(request) {
  try {
    const auth = await requireAuth(['admin']);
    if (auth.error) return NextResponse.json(auth, { status: auth.status });

    const adminSupabase = getAdminSupabase();
    const { data: coaches, error } = await adminSupabase
      .from('coaches')
      .select(`
        *,
        user:users(id, name, email, avatar_url)
      `);

    if (error) throw error;

    const { getCoachPerformance } = require('@/lib/coachPerformance');
    
    // 計算每位教練的當前動態績效與最終抽成
    const coachesWithPerformance = await Promise.all(
      coaches.map(async (coach) => {
        const perf = await getCoachPerformance(coach.id, adminSupabase);
        return {
          ...coach,
          performance: perf
        };
      })
    );

    return NextResponse.json({ coaches: coachesWithPerformance });
  } catch (err) {
    console.error('[ADMIN COACH LIST ERROR]', err);
    return NextResponse.json({ error: '無法獲取教練列表' }, { status: 500 });
  }
}

```

## File: app/api/admin/coaches/[id]/commission/route.js

```javascript
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getAdminSupabase } from '@/lib/supabase';

export async function PATCH(request, { params }) {
  try {
    const auth = await requireAuth(['admin']);
    if (auth.error) return NextResponse.json(auth, { status: auth.status });

    const { id: coachUserId } = await params;
    const body = await request.json();
    const { commission_discount } = body; // Can be a number or null

    // Normalize value
    const normalizedDiscount = 
      commission_discount === null || commission_discount === undefined || commission_discount === ''
        ? null
        : Number(commission_discount);

    // Validate if it's a valid number between 0-100 when provided
    if (normalizedDiscount !== null && (isNaN(normalizedDiscount) || normalizedDiscount < 0 || normalizedDiscount > 100)) {
      return NextResponse.json({ error: '減免比例必須是 0-100 之間的數字' }, { status: 400 });
    }

    const adminSupabase = getAdminSupabase();

    const { error } = await adminSupabase
      .from('coaches')
      .update({ commission_discount: normalizedDiscount })
      .eq('user_id', coachUserId);

    if (error) throw error;

    try {
      await adminSupabase.from('audit_logs').insert([{
        action: 'UPDATE_COACH_COMMISSION',
        actor_id: auth.user.id,
        actor_role: 'admin',
        target_id: coachUserId,
        details: JSON.stringify({ new_rate: normalizedRate })
      }]);
    } catch (auditError) {
      console.warn('[UPDATE COMMISSION AUDIT WARNING]', auditError);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[UPDATE COMMISSION ERROR]', err);
    return NextResponse.json({ error: '無法更新教練抽成比例' }, { status: 500 });
  }
}

```

## File: supabase_migration_coach_performance.sql

```sql
-- 針對教練動態績效系統的資料庫更新

-- 1. 在預約紀錄中新增「取消原因」欄位，供教練主動取消時填寫，留待後台審核
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS cancel_reason TEXT;

-- 2. 在 coaches 新增「個人抽成減免」欄位，供管理員設定該教練額外的降成比例
ALTER TABLE public.coaches 
ADD COLUMN IF NOT EXISTS commission_discount INT DEFAULT 0;

```

