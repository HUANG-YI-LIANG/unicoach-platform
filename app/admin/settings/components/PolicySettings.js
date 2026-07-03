import React, { useState } from 'react';
import { Save, AlertTriangle, FileText, XCircle } from 'lucide-react';

export default function PolicySettings({ settings, onSave, saving }) {
  const [localSettings, setLocalSettings] = useState({
    no_show_threshold: settings.no_show_threshold || '15',
  });

  const [coachReviewTitles, setCoachReviewTitles] = useState(() => {
    try { return JSON.parse(settings.coach_review_titles || '[]'); } catch(e) { return []; }
  });
  
  const [studentReviewTitles, setStudentReviewTitles] = useState(() => {
    try { return JSON.parse(settings.student_review_titles || '[]'); } catch(e) { return []; }
  });

  const handleChange = (k, v) => setLocalSettings(prev => ({ ...prev, [k]: v }));

  const handleSaveCoachTitles = () => onSave('coach_review_titles', coachReviewTitles, '教練評價標籤');
  const handleSaveStudentTitles = () => onSave('student_review_titles', studentReviewTitles, '學生評價標籤');

  return (
    <div className="settings-panel">
      <div className="panel-header">
        <h2>平台政策與規範 (Policy)</h2>
        <p>管理遲到曠課判定標準、評價標籤等系統營運規則。</p>
      </div>

      <div className="setting-group">
        <h3><AlertTriangle className="w-5 h-5 text-orange-400 inline-block mr-2" />出勤與違規政策</h3>
        
        <div className="setting-item">
          <label>曠課判定門檻 (分鐘)</label>
          <p className="desc">課程開始後，若遲到超過此時間，系統將自動判定為「無故曠課 (No-show)」。這將直接影響退款與扣款邏輯。</p>
          <div className="input-with-btn">
            <input 
              type="number" 
              value={localSettings.no_show_threshold}
              onChange={e => handleChange('no_show_threshold', e.target.value)}
            />
            <button onClick={() => onSave('no_show_threshold', localSettings.no_show_threshold, '曠課判定門檻')} disabled={saving}>
              儲存
            </button>
          </div>
        </div>
      </div>

      <div className="policy-layout">
        <div className="setting-group">
          <h3><FileText className="w-5 h-5 text-blue-400 inline-block mr-2" />給「教練」的評價標籤</h3>
          <p className="desc">學生完課後，可以快速點選這些標籤給予教練評價。</p>
          
          <div className="tag-list">
            {coachReviewTitles.map((title, i) => (
              <span key={i} className="badge coach">
                {title} 
                <XCircle 
                  className="w-4 h-4 ml-1 cursor-pointer hover:text-red-400 transition" 
                  onClick={() => setCoachReviewTitles(coachReviewTitles.filter((_, idx) => idx !== i))}
                />
              </span>
            ))}
          </div>
          
          <div className="add-tag-box">
            <input 
              type="text" 
              placeholder="輸入新標籤..." 
              onKeyDown={e => {
                if (e.key === 'Enter' && e.target.value.trim()) {
                  setCoachReviewTitles([...coachReviewTitles, e.target.value.trim()]);
                  e.target.value = '';
                }
              }} 
            />
            <button className="save-btn" onClick={handleSaveCoachTitles} disabled={saving}>
              <Save className="w-4 h-4" /> 儲存教練標籤
            </button>
          </div>
        </div>

        <div className="setting-group">
          <h3><FileText className="w-5 h-5 text-green-400 inline-block mr-2" />給「學生」的評價標籤</h3>
          <p className="desc">教練完課後，可以點選這些標籤回饋給學生。</p>
          
          <div className="tag-list">
            {studentReviewTitles.map((title, i) => (
              <span key={i} className="badge student">
                {title} 
                <XCircle 
                  className="w-4 h-4 ml-1 cursor-pointer hover:text-red-400 transition" 
                  onClick={() => setStudentReviewTitles(studentReviewTitles.filter((_, idx) => idx !== i))}
                />
              </span>
            ))}
          </div>
          
          <div className="add-tag-box">
            <input 
              type="text" 
              placeholder="輸入新標籤..." 
              onKeyDown={e => {
                if (e.key === 'Enter' && e.target.value.trim()) {
                  setStudentReviewTitles([...studentReviewTitles, e.target.value.trim()]);
                  e.target.value = '';
                }
              }} 
            />
            <button className="save-btn" onClick={handleSaveStudentTitles} disabled={saving}>
              <Save className="w-4 h-4" /> 儲存學生標籤
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        .settings-panel { animation: fadeIn 0.3s ease; }
        .panel-header { margin-bottom: 30px; }
        .panel-header h2 { font-size: 22px; margin: 0 0 8px 0; }
        .panel-header p { color: var(--color-text-muted); margin: 0; }
        
        .policy-layout {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
        }
        @media (max-width: 800px) {
          .policy-layout { grid-template-columns: 1fr; }
        }

        .setting-group {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.05);
          border-radius: 16px;
          padding: 24px;
          margin-bottom: 24px;
        }
        .setting-group h3 { margin: 0 0 8px 0; font-size: 18px; color: #fff; }
        .setting-item { margin-bottom: 20px; }
        label { display: block; font-weight: 600; margin-bottom: 4px; }
        .desc { font-size: 13px; color: #94a3b8; margin-bottom: 16px; }
        
        .input-with-btn { display: flex; gap: 12px; max-width: 400px; }
        input[type="number"], input[type="text"] {
          background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1);
          color: #fff; padding: 10px 16px; border-radius: 8px; flex: 1;
          outline: none;
        }
        input:focus { border-color: #60a5fa; }
        
        button {
          background: #4f46e5; color: white; border: none; padding: 0 20px;
          border-radius: 8px; font-weight: 600; cursor: pointer; transition: 0.2s;
        }
        button:hover:not(:disabled) { background: #4338ca; }

        .tag-list {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-bottom: 20px;
          min-height: 40px;
        }
        .badge {
          display: flex; align-items: center; gap: 4px;
          padding: 6px 12px; border-radius: 20px; font-size: 13px; font-weight: bold;
        }
        .badge.coach { background: rgba(96, 165, 250, 0.2); border: 1px solid rgba(96, 165, 250, 0.4); color: #93c5fd; }
        .badge.student { background: rgba(74, 222, 128, 0.2); border: 1px solid rgba(74, 222, 128, 0.4); color: #86efac; }
        
        .add-tag-box {
          display: flex; gap: 12px;
        }
        .save-btn {
          display: flex; align-items: center; gap: 8px; padding: 10px 16px;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
