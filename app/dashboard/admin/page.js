'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { 
  ShieldCheck, ArrowRight, Activity, Settings, Wallet
} from 'lucide-react';

export default function AdminDashboard() {
  const [profile, setProfile] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { logout } = useAuth();

  useEffect(() => {
    Promise.all([
      fetch('/api/auth/profile'),
      fetch('/api/bookings')
    ]).then(async ([profRes, bookRes]) => {
      if (!profRes.ok) return router.push('/login');
      const pData = await profRes.json();
      const bData = await bookRes.json();
      if (pData.profile) setProfile(pData.profile);
      if (bData.bookings) setBookings(bData.bookings);
      setLoading(false);
    });
  }, [router]);

  // Local logout removed

  if (loading) return <div className="text-center p-10">載入中...</div>;

  return (
      <div className="p-4 space-y-4 -mt-4 relative z-10">
        {/* -- Admin Management Center -- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div 
            onClick={() => router.push('/admin/verification')}
            className="bg-white p-6 rounded-2xl shadow-md border border-blue-100 flex items-center justify-between cursor-pointer hover:bg-blue-50 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="bg-blue-100 p-3 rounded-xl text-blue-600">
                <ShieldCheck size={28} />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">教練驗證中心</h3>
                <p className="text-sm text-gray-500">審核證照與學生證</p>
              </div>
            </div>
            <ArrowRight className="text-gray-300" />
          </div>

          <div 
            onClick={() => router.push('/admin/settings')}
            className="bg-white p-6 rounded-2xl shadow-md border border-gray-100 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="bg-gray-100 p-3 rounded-xl text-gray-600">
                <Settings size={28} />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">全域參數設定</h3>
                <p className="text-sm text-gray-500">調整曠課、抽成等參數</p>
              </div>
            </div>
            <ArrowRight className="text-gray-300" />
          </div>

          <div 
            onClick={() => router.push('/admin/settlements')}
            className="bg-white p-6 rounded-2xl shadow-md border border-emerald-100 flex items-center justify-between cursor-pointer hover:bg-emerald-50 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="bg-emerald-100 p-3 rounded-xl text-emerald-600">
                <Wallet size={28} />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">結算管理</h3>
                <p className="text-sm text-gray-500">產生與確認教練撥款</p>
              </div>
            </div>
            <ArrowRight className="text-gray-300" />
          </div>
        </div>

        <h2 className="text-xl font-bold px-2 text-gray-800 flex items-center gap-2">
          <Activity size={20} className="text-blue-500" />
          全站交易紀錄
        </h2>
        {bookings.length === 0 ? (
          <div className="bg-white p-8 text-center rounded-2xl shadow-sm text-gray-400">系統尚無訂單</div>
        ) : (
          bookings.map(b => (
            <div key={b.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-1">
               <div className="flex justify-between items-center mb-2">
                <span className="font-bold text-sm">#{b.id.substring(0,8)}</span>
                <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded font-bold">{b.status}</span>
               </div>
               <div className="text-xs text-gray-500">從 {b.user_id.substring(0,6)} 到教練 {b.coach_id.substring(0,6)}</div>
               <div className="text-xs font-bold mt-1 text-green-600">總付: ${b.final_amount || b.original_amount} / 抽成參數: {b.commission_rate}%</div>
            </div>
          ))
        )}
      </div>
    );
}
