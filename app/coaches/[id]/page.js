'use client';
import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import VideoGallery from '@/components/VideoGallery';

export default function CoachDetailPage({ params }) {
  const { id } = use(params);
  const router = useRouter();
  const [coach, setCoach] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);

  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [bookingForm, setBookingForm] = useState({
    grade: '',
    gender: '',
    attendeesCount: 1,
    learningStatus: '初學者',
    address: '',
    couponId: null,
    couponDiscount: 0
  });
  const [userProfile, setUserProfile] = useState(null);

  useEffect(() => {
    fetch(`/api/coaches/${id}`)
      .then(res => res.json())
      .then(data => {
        if (data.coach) setCoach(data.coach);
        if (data.reviews) setReviews(data.reviews);
        if (data.videos) setVideos(data.videos);
        setLoading(false);
      });
    
    // Fetch user profile for addresses
    fetch('/api/auth/profile')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data) setUserProfile(data.profile);
      });
  }, [id]);

  const handleChat = async () => {
    const res = await fetch('/api/chat/rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ coachId: coach.user_id || coach.id })
    });
    const data = await res.json();
    if (res.ok) router.push(`/chat/${data.roomId}`);
    else alert('發起聊天失敗，請先登入用戶帳號。');
  };

  const handleBook = async () => {
    if (!bookingForm.grade || !bookingForm.gender || !bookingForm.address) {
      alert('請填寫完整預約資料');
      return;
    }

    const res = await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        coachId: coach.user_id || coach.id, 
        expectedTime: new Date(Date.now() + 86400000).toISOString(),
        ...bookingForm
      })
    });
    const data = await res.json();
    if (res.ok) {
      alert('預約成功！');
      router.push('/dashboard/user');
    } else {
      alert(data.error || '預約失敗，請確認已登入用戶帳號');
    }
  };

  if (loading) return <div className="text-center p-10">載入中...</div>;
  if (!coach) return <div className="text-center p-10">找不到該教練</div>;

  let frequentAddresses = [];
  try {
    frequentAddresses = userProfile?.frequent_addresses ? JSON.parse(userProfile.frequent_addresses) : [];
  } catch(e) {
    console.error('Frequent addresses parse error:', e);
  }

  return (
    <div className="pb-24">
      {/* ... (Header remains same) ... */}
      <div className="bg-blue-600 p-8 text-white text-center rounded-b-3xl mb-6 shadow-md relative">
        <button onClick={() => router.back()} className="absolute top-4 left-4 p-2 text-xl">←</button>
        <div className="w-24 h-24 bg-white/20 rounded-full mx-auto mb-4 backdrop-blur-sm border-2 border-white/50 overflow-hidden flex items-center justify-center font-bold text-2xl">
          {coach.avatar_url ? (
            <img src={coach.avatar_url} alt={coach.name} className="w-full h-full object-cover" />
          ) : (
            coach.name[0]
          )}
        </div>
        <h1 className="text-3xl font-bold">{coach.name}</h1>
        <p className="opacity-90">{coach.university || '頂尖教練'}</p>
      </div>

      {/* ... (Existing sections) ... */}
      <div className="px-4 space-y-4">
        {/* ... (Instruction/Reviews sections) ... */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-400 mb-2 text-sm uppercase tracking-wider">教學資訊</h3>
          <div className="grid grid-cols-2 gap-4">
            <div><span className="text-gray-500 text-sm">單堂定價</span><div className="font-bold text-lg">${coach.base_price}</div></div>
            <div><span className="text-gray-500 text-sm">授課地區</span><div className="font-bold text-lg">{coach.location || '平台全區'}</div></div>
          </div>
        </div>
        
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-400 mb-2 text-sm uppercase tracking-wider">教練介紹</h3>
          <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{coach.philosophy || '此教練尚未填寫詳細介紹，您可以直接透過聊天室詢問細節唷！'}</p>
        </div>

        {/* ── Video Gallery Section ────────────────────────────── */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-400 mb-4 text-sm uppercase tracking-wider">教練展示影片 ({videos.length})</h3>
          <VideoGallery videos={videos} />
        </div>

        {/* ── Reviews Section ────────────────────────────────── */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-400 mb-4 text-sm uppercase tracking-wider">學員評價 ({reviews.length})</h3>
          {/* ... (Reviews logic) ... */}
          {reviews.length === 0 ? (
            <p className="text-gray-400 text-center py-6">目前尚無評價</p>
          ) : (
            <div className="space-y-6">
              {reviews.map(r => (
                <div key={r.id} className="border-b border-gray-50 pb-4 last:border-0 last:pb-0">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex text-yellow-500">
                      {[...Array(5)].map((_, i) => (
                        <span key={i} className={i < r.rating ? "text-yellow-500" : "text-gray-200"}>★</span>
                      ))}
                    </div>
                    <span className="text-xs text-gray-400">{new Date(r.created_at).toLocaleDateString()}</span>
                  </div>
                  <p className="text-gray-600 text-sm leading-relaxed">{r.comment || '無評論內容'}</p>
                  <div className="text-xs text-gray-400 mt-2">— {r.reviewer_name || '學員'}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="fixed bottom-16 left-0 right-0 p-4 bg-white border-t border-gray-100 flex gap-3">
        <button onClick={handleChat} className="flex-1 bg-gray-100 text-gray-800 py-3 rounded-xl font-bold active:scale-95 transition-transform">
          💬 聊聊
        </button>
        <button onClick={() => setIsBookingModalOpen(true)} className="flex-[2] bg-blue-600 text-white py-3 rounded-xl font-bold active:scale-95 transition-transform shadow-lg shadow-blue-600/30">
          立即預約
        </button>
      </div>

      {/* ── Booking Data Entry Modal ───────────────────────── */}
      {isBookingModalOpen && (
        <div className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-black text-slate-800">填寫預約詳細資料</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">學員年級</label>
                <select 
                  className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl font-bold text-slate-700"
                  value={bookingForm.grade}
                  onChange={e => setBookingForm({...bookingForm, grade: e.target.value})}
                >
                  <option value="">選擇年級</option>
                  <option value="國小">國小</option>
                  <option value="國中">國中</option>
                  <option value="高中">高中</option>
                  <option value="大學">大學</option>
                  <option value="成人">成人</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">性別</label>
                  <select 
                    className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl font-bold text-slate-700"
                    value={bookingForm.gender}
                    onChange={e => setBookingForm({...bookingForm, gender: e.target.value})}
                  >
                    <option value="">選擇性別</option>
                    <option value="男">男</option>
                    <option value="女">女</option>
                    <option value="不願透露">不願透露</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">人數 (1-5)</label>
                  <input 
                    type="number" min="1" max="5"
                    className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl font-bold text-slate-700"
                    value={bookingForm.attendeesCount}
                    onChange={e => setBookingForm({...bookingForm, attendeesCount: parseInt(e.target.value) || 1})}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">學習狀況</label>
                <div className="flex gap-4">
                  {['初學者', '進階'].map(s => (
                    <button 
                      key={s}
                      onClick={() => setBookingForm({...bookingForm, learningStatus: s})}
                      className={`flex-1 py-3 rounded-xl font-bold transition-all ${bookingForm.learningStatus === s ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-50 text-slate-500'}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">上課地址</label>
                {/* Frequent addresses dropdown */}
                {frequentAddresses.length > 0 && (
                  <select 
                    className="w-full p-2 mb-2 bg-blue-50 border border-blue-100 rounded-lg text-xs font-bold text-blue-600"
                    onChange={e => setBookingForm({...bookingForm, address: e.target.value})}
                  >
                    <option value="">從常用地址選取...</option>
                    {frequentAddresses.map((a, i) => (
                      <option key={i} value={a.address}>【{a.label}】{a.address}</option>
                    ))}
                  </select>
                )}
                <input 
                  type="text"
                  placeholder="請輸入或選取上課地址"
                  className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl font-bold text-slate-700"
                  value={bookingForm.address}
                  onChange={e => setBookingForm({...bookingForm, address: e.target.value})}
                />
              </div>

              {/* Coupon Selection Section */}
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">套用優惠券 (選填)</label>
                <div className="flex gap-2 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
                  {userProfile?.coupons?.map(c => (
                    <button 
                      key={c.id}
                      onClick={() => setBookingForm(prev => ({ 
                        ...prev, 
                        couponId: prev.couponId === c.id ? null : c.id,
                        couponDiscount: prev.couponId === c.id ? 0 : c.discount 
                      }))}
                      className={`flex-shrink-0 p-3 rounded-xl border-2 transition-all text-left ${bookingForm.couponId === c.id ? 'border-blue-600 bg-blue-50' : 'border-slate-100 bg-white'}`}
                      style={{ minWidth: '100px' }}
                    >
                      <p className={`text-lg font-black ${bookingForm.couponId === c.id ? 'text-blue-600' : 'text-slate-600'}`}>{c.discount}%</p>
                      <p className="text-[10px] font-bold text-slate-400">{c.label || '折扣券'}</p>
                    </button>
                  ))}
                  {(!userProfile?.coupons || userProfile.coupons.length === 0) && (
                    <p className="text-xs text-slate-400 font-medium italic">目前無可用優惠券</p>
                  )}
                </div>
              </div>

              {/* Price Calculation Summary - Sync with Backend via Profile */}
              {(() => {
                  const level = userProfile?.level || 1;
                  const baseDiscount = userProfile?.base_discount || 0;
                  const couponDiscount = bookingForm.couponDiscount || 0;
                  const totalDiscountPercent = baseDiscount + couponDiscount;
                  const estimatedSaving = Math.round(coach.base_price * (totalDiscountPercent / 100));
                  const finalEstimated = coach.base_price - estimatedSaving;

                  return (
                    <div className="bg-slate-50 p-4 rounded-2xl border border-dashed border-slate-200">
                      <div className="flex justify-between text-xs font-bold text-slate-500 mb-1">
                        <span>單堂原價</span>
                        <span>${coach.base_price}</span>
                      </div>
                      
                      <div className="flex justify-between text-xs font-bold text-green-600 mb-1">
                        <span>基礎折扣 ({baseDiscount === 15 ? '首單優惠' : `Lv${level} 等級`})</span>
                        <span>-{baseDiscount}%</span>
                      </div>

                    {couponDiscount > 0 && (
                      <div className="flex justify-between text-xs font-bold text-blue-500 mb-1">
                        <span>優惠券折扣累加</span>
                        <span>-{couponDiscount}%</span>
                      </div>
                    )}

                    <div className="flex justify-between items-center pt-2 mt-2 border-t border-slate-200">
                      <div>
                        <span className="text-sm font-black text-slate-800">累計總折扣</span>
                        <span className="ml-2 text-xs font-bold text-white bg-blue-500 px-2 py-0.5 rounded-full">{totalDiscountPercent}% OFF</span>
                      </div>
                      <span className="text-xl font-black text-blue-600">
                        ${finalEstimated}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-2 font-medium">* 最終折扣金額以訂單成立時結算為準（上限 $300）</p>
                  </div>
                );
              })()}
            </div>

            <div className="flex gap-3 pt-4">
              <button onClick={() => setIsBookingModalOpen(false)} className="flex-1 py-3 font-bold text-slate-400 hover:text-slate-600">取消</button>
              <button onClick={handleBook} className="flex-[2] bg-blue-600 text-white py-3 rounded-xl font-bold active:scale-95 transition-transform shadow-lg shadow-blue-600/30">
                確認預約
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
