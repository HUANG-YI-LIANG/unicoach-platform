'use client';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { MessageCircle, CalendarCheck, Star, MapPin, Search, Filter } from 'lucide-react';

export default function CoachesPage() {
  const [coaches, setCoaches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSkill, setSelectedSkill] = useState('全部');
  const [showAllSkills, setShowAllSkills] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/coaches')
      .then(res => res.json())
      .then(data => {
        if (data.coaches) setCoaches(data.coaches);
      })
      .catch(err => console.error('Fetch error:', err))
      .finally(() => setLoading(false));
  }, []);

  const skillsData = useMemo(() => {
    const counts = {};
    coaches.forEach(c => {
       if (!c.service_areas) return;
       const skills = c.service_areas.split(/[,、]/).map(s => s.trim()).filter(Boolean);
       skills.forEach(s => counts[s] = (counts[s] || 0) + 1);
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [coaches]);

  const visibleSkills = showAllSkills ? skillsData : skillsData.slice(0, 5);
  const hasMoreSkills = skillsData.length > 5;

  const filteredCoaches = useMemo(() => {
    if (selectedSkill === '全部') return coaches;
    return coaches.filter(c => {
       if (!c.service_areas) return false;
       const skills = c.service_areas.split(/[,、]/).map(s => s.trim()).filter(Boolean);
       return skills.includes(selectedSkill);
    });
  }, [coaches, selectedSkill]);

  return (
    <div className="coach-page-wrapper">
      <style dangerouslySetInnerHTML={{__html: `
        .coach-page-wrapper { background-color: #F8FAFC; min-height: 100vh; padding-bottom: 100px; font-family: sans-serif; }
        .filter-sticky-header { position: sticky; top: 0; z-index: 50; background-color: rgba(255, 255, 255, 0.8); backdrop-filter: blur(12px); padding: 16px; border-bottom: 1px solid #F1F5F9; }
        .page-title { font-size: 20px; font-weight: 900; color: #0F172A; margin: 0 0 16px 0; }
        .filter-scroll-container { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 4px; scrollbar-width: none; }
        .filter-scroll-container::-webkit-scrollbar { display: none; }
        .filter-btn { padding: 8px 16px; border-radius: 100px; font-size: 13px; font-weight: 700; white-space: nowrap; transition: all 0.2s; border: 1px solid #E2E8F0; cursor: pointer; background-color: #FFFFFF; color: #64748B; }
        .filter-btn.active { background-color: #2563EB; color: #FFFFFF; border-color: #2563EB; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2); }
        .filter-badge { font-size: 10px; margin-left: 4px; opacity: 0.6; }
        .list-container { padding: 16px; display: flex; flex-direction: column; gap: 16px; }
        .coach-card { background: #FFFFFF; border-radius: 24px; padding: 20px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03); border: 1px solid #F1F5F9; }
        .tag-container { display: flex; gap: 6px; margin-bottom: 12px; }
        .tag { font-size: 10px; font-weight: 800; padding: 4px 8px; border-radius: 6px; text-transform: uppercase; }
        .coach-info { display: flex; gap: 16px; margin-bottom: 20px; cursor: pointer; }
        .avatar { width: 64px; height: 64px; border-radius: 20px; background: linear-gradient(135deg, #2563EB, #3B82F6); color: #FFFFFF; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: 900; }
        .name { font-size: 18px; font-weight: 900; color: #0F172A; margin: 0 0 4px 0; }
        .uni { font-size: 12px; color: #94A3B8; font-weight: 600; }
        .price-row { display: flex; justify-content: space-between; align-items: center; margin-top: 12px; padding-top: 12px; border-top: 1px dashed #F1F5F9; }
        .price-label { font-size: 12px; color: #94A3B8; font-weight: 600; }
        .price-val { font-size: 18px; font-weight: 900; color: #2563EB; }
        .card-actions { display: flex; gap: 10px; margin-top: 20px; }
        .btn-chat { flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px; background-color: #F1F5F9; color: #475569; padding: 14px; border-radius: 16px; border:none; font-size: 14px; font-weight: 700; cursor: pointer; }
        .btn-book { flex: 2; display: flex; align-items: center; justify-content: center; gap: 8px; background-color: #2563EB; color: #FFFFFF; padding: 14px; border-radius: 16px; border:none; font-size: 16px; font-weight: 800; cursor: pointer; }
      `}} />

      <div className="filter-sticky-header">
        <h1 className="page-title">找教練</h1>
        <div className="filter-scroll-container">
          <button 
             onClick={() => setSelectedSkill('全部')}
             className={'filter-btn ' + (selectedSkill === '全部' ? 'active' : '')}
          >全部</button>
          
          {visibleSkills.map(([skill, count]) => (
            <button 
               key={skill}
               onClick={() => setSelectedSkill(skill)}
               className={'filter-btn ' + (selectedSkill === skill ? 'active' : '')}
            >
               {skill} 
               <span className="filter-badge">{count}</span>
            </button>
          ))}

          {!showAllSkills && hasMoreSkills && (
            <button 
               onClick={() => setShowAllSkills(true)}
               className="filter-btn"
            >展開全部</button>
          )}
        </div>
      </div>

      <div className="list-container">
        {loading ? (
          <div style={{textAlign:'center', padding:'60px 0', color:'#94A3B8'}}>載入中...</div>
        ) : filteredCoaches.length === 0 ? (
          <div style={{textAlign:'center', padding:'60px 0', color:'#94A3B8'}}>找不到相關教練</div>
        ) : (
          filteredCoaches.map(coach => (
            <div key={coach.id} className="coach-card">
              <div className="tag-container">
                 <span className="tag" style={{background:'#DBEAFE', color:'#1E40AF'}}>⭐ {coach.rating_avg || '0.0'} ({coach.review_count || 0}則)</span>
                 {coach.review_count > 5 && <span className="tag" style={{background:'#FEE2E2', color:'#991B1B'}}>熱門推薦</span>}
              </div>

              <div className="coach-info" onClick={() => router.push(`/coaches/${coach.id}`)}>
                <div className="avatar">{coach.name ? coach.name[0] : '？'}</div>
                <div>
                  <h2 className="name">{coach.name}</h2>
                  <p className="uni">{coach.university || '頂尖教練'}</p>
                </div>
              </div>

              <div className="price-row">
                <span className="price-label">每堂課</span>
                <span className="price-val">${coach.base_price}</span>
              </div>

              <div className="card-actions">
                 <button 
                   onClick={async (e) => {
                     e.stopPropagation();
                     const res = await fetch('/api/chat/rooms', {
                       method: 'POST',
                       headers: { 'Content-Type': 'application/json' },
                       body: JSON.stringify({ coachId: coach.user_id || coach.id })
                     });
                     const data = await res.json();
                     if (data.roomId) router.push(`/chat/${data.roomId}`);
                     else alert('發起聊天失敗');
                   }}
                   className="btn-chat"
                 >
                   <MessageCircle size={18} /> 聊聊
                 </button>
                 <button 
                   onClick={async (e) => { 
                     e.stopPropagation(); 
                     if (!confirm(`確認預約 ${coach.name}？\n價格：$${coach.base_price}`)) return;
                     const res = await fetch('/api/bookings', {
                       method: 'POST',
                       headers: { 'Content-Type': 'application/json' },
                       body: JSON.stringify({ 
                         coachId: coach.user_id || coach.id,
                         expectedTime: new Date(Date.now() + 86400000).toISOString()
                       })
                     });
                     const data = await res.json();
                     if (data.success) {
                       alert('預約成功！');
                       router.push('/dashboard/user');
                     } else {
                       alert('預約失敗：' + (data.error || '請登入後再試'));
                     }
                   }}
                   className="btn-book"
                 >
                   <CalendarCheck size={18} /> 立即預約
                 </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
