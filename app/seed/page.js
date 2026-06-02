'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ArrowRight, CheckCircle2, ChevronRight, Play, Star, MapPin, Check, Video, Search, MessageSquare, CreditCard, Clock } from 'lucide-react';

const THEME = {
  bg: '#050505',
  card: '#0A0A0A',
  border: 'rgba(255,255,255,0.08)',
  textMain: '#EDEDED',
  textMuted: '#A1A1AA',
  accent: '#E6E6E6', // Notion style accent (subtle)
  orange: '#F97316',
};

const STATS = [
  { label: '已加入種子教練', value: '24 位' },
  { label: '平均媒合時間', value: '< 24 小時' },
  { label: '完成課堂數', value: '186 堂' },
  { label: '學員滿意度', value: '4.9/5' },
];

export default function SeedRecruitPage() {
  const router = useRouter();
  
  // Hero Section AI Interactive State
  const [fbText, setFbText] = useState("大家好！我是台大外文系的 Sarah，多益 950 分。想找想把英文口說練好的學生！\n\n上課方式：線上或大安區咖啡廳\n收費：600/hr\n教學理念：我會幫你建立全英文的環境，鼓勵你多開口，不要怕犯錯！適合完全不敢開口的初學者。");
  const [parsingStep, setParsingStep] = useState(0); 
  // 0: Initial, 1: Parsing (typing effect), 2: Generated Card

  const handleStartParsing = () => {
    if (parsingStep > 0) return;
    setParsingStep(1);
    setTimeout(() => setParsingStep(2), 2500);
  };

  return (
    <div style={{ backgroundColor: THEME.bg, color: THEME.textMain, minHeight: '100vh', fontFamily: 'Inter, system-ui, sans-serif', overflowX: 'hidden' }}>
      
      {/* 導覽列 */}
      <nav style={{ 
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, 
        padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: 'rgba(5,5,5,0.7)', backdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${THEME.border}`
      }}>
        <div style={{ fontWeight: 900, fontSize: 18, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 12, height: 12, borderRadius: 2, background: THEME.orange }} />
          UniCoach
        </div>
        <button 
          onClick={() => router.push('/coach/profile/edit')}
          style={{ 
            background: THEME.textMain, color: THEME.bg, border: 'none', 
            padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
            transition: 'opacity 0.2s'
          }}
          onMouseOver={e => e.currentTarget.style.opacity = 0.8}
          onMouseOut={e => e.currentTarget.style.opacity = 1}
        >
          申請 Early Access
        </button>
      </nav>

      {/* Hero Section */}
      <section style={{ 
        padding: '120px 20px 60px', maxWidth: 1080, margin: '0 auto', 
        display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' 
      }}>
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}
        >
          <div style={{ 
            padding: '6px 14px', borderRadius: 100, border: `1px solid ${THEME.border}`, 
            background: 'rgba(255,255,255,0.03)', fontSize: 12, fontWeight: 500, color: THEME.textMuted,
            marginBottom: 24, display: 'flex', alignItems: 'center', gap: 6
          }}>
            <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#10B981', boxShadow: '0 0 8px #10B981' }} />
            目前正開放第 1 期種子教練邀請
          </div>
          
          <h1 style={{ fontSize: 'clamp(36px, 6vw, 64px)', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.03em', margin: '0 0 20px', maxWidth: 800 }}>
            不用重打履歷。<br/>
            <span style={{ color: THEME.textMuted }}>貼上 FB 貼文，30 秒開始接案。</span>
          </h1>
          
          <p style={{ fontSize: 16, color: THEME.textMuted, maxWidth: 500, lineHeight: 1.6, margin: '0 0 40px' }}>
            我們知道你有多討厭每天在社團發文。UniCoach AI 助理能自動擷取你的經歷與價格，瞬間建立專屬的高級教練頁面。
          </p>
        </motion.div>

        {/* Interactive AI Demo */}
        <motion.div 
          initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.2 }}
          style={{ 
            width: '100%', maxWidth: 760, background: THEME.card, border: `1px solid ${THEME.border}`, 
            borderRadius: 24, padding: 24, boxShadow: '0 24px 60px rgba(0,0,0,0.4)',
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24,
            textAlign: 'left', position: 'relative'
          }}
        >
          {/* Left: Input */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: THEME.textMuted, fontSize: 13, fontWeight: 500 }}>
              <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#1877F2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF' }}>
                <span style={{ fontSize: 14, fontWeight: 900, fontFamily: 'serif' }}>f</span>
              </div>
              貼上你常用的社團自我介紹
            </div>
            <textarea 
              value={fbText}
              onChange={(e) => setFbText(e.target.value)}
              disabled={parsingStep > 0}
              style={{ 
                flex: 1, minHeight: 180, background: 'rgba(255,255,255,0.03)', border: `1px solid ${THEME.border}`, 
                borderRadius: 16, padding: 16, color: THEME.textMain, fontSize: 14, lineHeight: 1.6, resize: 'none', outline: 'none'
              }}
            />
            <button 
              onClick={handleStartParsing}
              disabled={parsingStep > 0}
              style={{
                width: '100%', padding: 14, borderRadius: 12, border: 'none',
                background: parsingStep === 0 ? THEME.textMain : 'rgba(255,255,255,0.1)',
                color: parsingStep === 0 ? THEME.bg : THEME.textMuted,
                fontSize: 14, fontWeight: 600, cursor: parsingStep === 0 ? 'pointer' : 'default',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                transition: 'all 0.2s'
              }}
            >
              {parsingStep === 0 ? <><Sparkles size={16} /> 魔法生成教練頁面</> : '生成中...'}
            </button>
          </div>

          {/* Right: Output Mockup */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: 16, border: `1px dashed ${THEME.border}`, minHeight: 320 }}>
            <AnimatePresence mode="wait">
              {parsingStep === 0 && (
                <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ color: THEME.textMuted, fontSize: 13, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                  <Sparkles size={24} style={{ opacity: 0.5 }} />
                  右側將自動產生專屬頁面
                </motion.div>
              )}
              
              {parsingStep === 1 && (
                <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%', padding: 24 }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', animation: 'pulse 1.5s infinite' }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ width: '40%', height: 14, borderRadius: 4, background: 'rgba(255,255,255,0.05)', marginBottom: 8, animation: 'pulse 1.5s infinite' }} />
                      <div style={{ width: '60%', height: 10, borderRadius: 4, background: 'rgba(255,255,255,0.05)', animation: 'pulse 1.5s infinite 0.2s' }} />
                    </div>
                  </div>
                  <div style={{ width: '100%', height: 60, borderRadius: 12, background: 'rgba(255,255,255,0.05)', animation: 'pulse 1.5s infinite 0.4s' }} />
                  <div style={{ fontSize: 12, color: THEME.orange, display: 'flex', alignItems: 'center', gap: 6, fontWeight: 500, justifyContent: 'center', marginTop: 12 }}>
                    <Sparkles size={14} /> AI 正在分析經歷與價格...
                  </div>
                </motion.div>
              )}

              {parsingStep === 2 && (
                <motion.div key="result" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }} style={{ width: '100%', height: '100%', padding: 16 }}>
                  {/* Generated Card Mockup */}
                  <div style={{ background: '#111', borderRadius: 16, padding: 16, border: `1px solid ${THEME.border}`, boxShadow: '0 8px 30px rgba(0,0,0,0.5)', height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                      <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'linear-gradient(135deg, #F97316, #FDBA74)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 800 }}>
                        S
                      </div>
                      <div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: '#FFF' }}>Sarah</div>
                        <div style={{ fontSize: 12, color: THEME.textMuted, display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                          <MapPin size={12} /> 大安區・線上
                        </div>
                      </div>
                    </div>
                    
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#FFF', marginBottom: 8, lineHeight: 1.4 }}>
                      幫助零基礎開口說！<br/>台大外文多益 950
                    </div>
                    
                    <div style={{ fontSize: 12, color: THEME.textMuted, background: 'rgba(255,255,255,0.03)', padding: 10, borderRadius: 8, marginBottom: 'auto', lineHeight: 1.6 }}>
                      「建立全英文的環境，鼓勵你多開口，不要怕犯錯！」
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: `1px solid ${THEME.border}`, paddingTop: 12, marginTop: 16 }}>
                      <div style={{ fontSize: 12, color: THEME.textMuted }}>單堂體驗價</div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: '#FFF' }}>NT$ 600</div>
                    </div>
                    <button style={{ width: '100%', padding: '10px', background: THEME.textMain, color: THEME.bg, border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 13, marginTop: 12 }}>
                      先聊聊了解
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.3; }
          }
        `}} />
      </section>

      {/* Social Proof Stats */}
      <section style={{ borderTop: `1px solid ${THEME.border}`, borderBottom: `1px solid ${THEME.border}`, background: 'rgba(255,255,255,0.01)' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto', padding: '40px 20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 32 }}>
          {STATS.map((stat, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <div style={{ fontSize: 32, fontWeight: 900, color: THEME.textMain, letterSpacing: '-0.02em' }}>{stat.value}</div>
              <div style={{ fontSize: 13, color: THEME.textMuted, fontWeight: 500 }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Pain Points vs UniCoach */}
      <section style={{ padding: '120px 20px', maxWidth: 1080, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <h2 style={{ fontSize: 36, fontWeight: 800, margin: '0 0 16px', letterSpacing: '-0.02em' }}>接案教學，不該這麼心累。</h2>
          <p style={{ fontSize: 16, color: THEME.textMuted, maxWidth: 500, margin: '0 auto' }}>我們把繁瑣的溝通、排程與金流，全部濃縮進這 個 App 裡。</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
          {/* Card 1 */}
          <div style={{ background: THEME.card, border: `1px solid ${THEME.border}`, borderRadius: 24, padding: 32 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
              <Search size={24} color={THEME.textMain} />
            </div>
            <h3 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 12px' }}>不再被社團貼文淹沒</h3>
            <p style={{ fontSize: 14, color: THEME.textMuted, lineHeight: 1.6, margin: '0 0 24px' }}>
              過去：每天在 FB 頂文，一下就沉下去。<br/>
              現在：你的專屬頁面 24 小時在線，學生像滑 TikTok 一樣探索，優質教練自動獲得推薦。
            </p>
            {/* Mockup visual */}
            <div style={{ background: '#111', borderRadius: 16, border: `1px solid ${THEME.border}`, height: 160, overflow: 'hidden', position: 'relative' }}>
              <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(to bottom, transparent, #000)' }} />
              <div style={{ position: 'absolute', bottom: 16, left: 16, right: 16 }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#FFF' }}>讓內向學生開口說英文</div>
                <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                  <span style={{ fontSize: 10, padding: '4px 8px', background: 'rgba(255,255,255,0.2)', borderRadius: 100 }}>#台大外文</span>
                  <span style={{ fontSize: 10, padding: '4px 8px', background: 'rgba(255,255,255,0.2)', borderRadius: 100 }}>#多益950</span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2 */}
          <div style={{ background: THEME.card, border: `1px solid ${THEME.border}`, borderRadius: 24, padding: 32 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
              <MessageSquare size={24} color={THEME.textMain} />
            </div>
            <h3 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 12px' }}>少回 10 次一樣的問題</h3>
            <p style={{ fontSize: 14, color: THEME.textMuted, lineHeight: 1.6, margin: '0 0 24px' }}>
              過去：「教練請問一堂課多少？」「哪裡上課？」<br/>
              現在：價格、地區一目了然！學生確認 OK 才預約體驗，省下無效溝通的時間。
            </p>
            {/* Mockup visual */}
            <div style={{ background: '#111', borderRadius: 16, border: `1px solid ${THEME.border}`, height: 160, padding: 16, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: 8 }}>
               <div style={{ alignSelf: 'flex-start', background: 'rgba(255,255,255,0.05)', padding: '10px 14px', borderRadius: '16px 16px 16px 4px', fontSize: 12, color: '#FFF' }}>
                 教練你好！我看了你的影片想預約體驗課
               </div>
               <div style={{ alignSelf: 'flex-end', background: THEME.orange, padding: '10px 14px', borderRadius: '16px 16px 4px 16px', fontSize: 12, color: '#FFF' }}>
                 沒問題，可以直接點擊下方選擇時段喔！
               </div>
            </div>
          </div>

          {/* Card 3 */}
          <div style={{ background: THEME.card, border: `1px solid ${THEME.border}`, borderRadius: 24, padding: 32 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
              <CreditCard size={24} color={THEME.textMain} />
            </div>
            <h3 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 12px' }}>不怕被放鴿子</h3>
            <p style={{ fontSize: 14, color: THEME.textMuted, lineHeight: 1.6, margin: '0 0 24px' }}>
              過去：到了現場學生沒出現，車資自己吸收。<br/>
              現在：平台金流履約保障，學生先付費才排程，上完課直接撥款，安全有保障。
            </p>
            {/* Mockup visual */}
            <div style={{ background: '#111', borderRadius: 16, border: `1px solid ${THEME.border}`, height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
               <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10B981' }}>
                 <Check size={24} />
               </div>
               <div style={{ fontSize: 14, fontWeight: 700, color: '#FFF' }}>已收到學員付款，課程排程成功</div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonial */}
      <section style={{ padding: '60px 20px', maxWidth: 800, margin: '0 auto', textAlign: 'center' }}>
        <div style={{ fontSize: 24, fontWeight: 700, lineHeight: 1.5, margin: '0 0 24px', letterSpacing: '-0.01em' }}>
          "以前在社團推文常常覺得很像在推銷自己。現在我只要把 UniCoach 的連結放在 IG 主頁，有興趣的學生自己會預約，真的輕鬆很多。"
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg, #3B82F6, #93C5FD)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>J</div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>Jason</div>
            <div style={{ fontSize: 12, color: THEME.textMuted }}>台大羽球校隊教練・已完課 42 堂</div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section style={{ padding: '120px 20px', textAlign: 'center' }}>
        <h2 style={{ fontSize: 'clamp(32px, 5vw, 48px)', fontWeight: 800, margin: '0 0 24px', letterSpacing: '-0.02em' }}>
          準備好開始接案了嗎？
        </h2>
        <p style={{ fontSize: 16, color: THEME.textMuted, margin: '0 0 40px' }}>
          目前僅開放邀請與審核制。<br/>越早加入，越早享受平台早期流量推薦。
        </p>
        <button 
          onClick={() => router.push('/coach/profile/edit')}
          style={{ 
            background: THEME.textMain, color: THEME.bg, border: 'none', 
            padding: '16px 32px', borderRadius: 12, fontSize: 16, fontWeight: 700, cursor: 'pointer',
            transition: 'transform 0.2s', boxShadow: '0 8px 30px rgba(255,255,255,0.2)'
          }}
          onMouseOver={e => e.currentTarget.style.transform = 'scale(1.05)'}
          onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
        >
          立即建立教練頁面 🚀
        </button>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: `1px solid ${THEME.border}`, padding: '40px 20px', textAlign: 'center', color: THEME.textMuted, fontSize: 13 }}>
        © 2026 UniCoach. All rights reserved.
      </footer>
    </div>
  );
}
