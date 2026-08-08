import React, { useState, useEffect } from 'react';
import {
  Utensils, Clock, Calendar, Edit3, Save, X, Coffee,
  Sun, Sunset, Moon, Leaf, UserX, TrendingDown, Users, Sparkles,
  Bell, Flame, Zap, Tag, TrendingUp, BarChart3, Star, Copy, Send,
  Download, Search, ShieldCheck, Package, Activity, RefreshCw,
  ChevronDown, Check
} from 'lucide-react';
import { fallback } from '../constants/fallbackData.js';

/* ── Constants ────────────────────────────────────────────── */

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];

const FESTIVAL = {
  Friday:    { emoji: '🎉', label: 'Diwali Special',       style: { background:'rgba(234,179,8,0.10)', borderColor:'rgba(234,179,8,0.28)', color:'#ca8a04' } },
  Sunday:    { emoji: '👑', label: 'Weekend Royal Thali',  style: { background:'rgba(139,92,246,0.10)', borderColor:'rgba(139,92,246,0.28)', color:'#7c3aed' } },
  Wednesday: { emoji: '🍨', label: "Chef's Dessert Day",   style: { background:'rgba(20,184,166,0.10)', borderColor:'rgba(20,184,166,0.28)', color:'#0f766e' } },
};

const MEAL_CFG = [
  { key:'breakfast', label:'Breakfast',     Icon:Coffee,  time:'08:00 – 10:00 AM', accent:'#e8880a', bg:'rgba(232,136,10,0.1)',  border:'rgba(232,136,10,0.2)',  progress:100, status:'Served & Closed',       statusStyle:{ background:'rgba(160,166,170,0.1)', color:'var(--muted)', border:'1px solid rgba(160,166,170,0.2)' } },
  { key:'lunch',     label:'Lunch',         Icon:Sun,     time:'01:00 – 03:00 PM', accent:'#2fa881', bg:'rgba(47,168,129,0.1)',  border:'rgba(47,168,129,0.2)',  progress:85,  status:'Cooking · 85% ready',  statusStyle:{ background:'rgba(47,168,129,0.1)', color:'#2fa881', border:'1px solid rgba(47,168,129,0.25)' } },
  { key:'snacks',    label:'Tea & Snacks',  Icon:Sunset,  time:'05:30 – 06:30 PM', accent:'#0ea5e9', bg:'rgba(14,165,233,0.1)', border:'rgba(14,165,233,0.2)', progress:30,  status:'Starts at 4:30 PM',    statusStyle:{ background:'rgba(14,165,233,0.1)', color:'#0ea5e9', border:'1px solid rgba(14,165,233,0.25)' } },
  { key:'dinner',    label:'Dinner',        Icon:Moon,    time:'08:00 – 10:00 PM', accent:'#7c3aed', bg:'rgba(124,58,237,0.1)', border:'rgba(124,58,237,0.2)', progress:10,  status:'Freeze Cutoff 06 PM',  statusStyle:{ background:'rgba(124,58,237,0.1)', color:'#7c3aed', border:'1px solid rgba(124,58,237,0.25)' } },
];

const ATTENDANCE_DATA = [
  { d:'Mon',v:92 },{ d:'Tue',v:88 },{ d:'Wed',v:95 },
  { d:'Thu',v:90 },{ d:'Fri',v:72 },{ d:'Sat',v:80 },{ d:'Sun',v:98 },
];

const POPULARITY_DATA = [
  { dish:'Veg / Chicken Biryani',  score:98, color:'#e8880a' },
  { dish:'Paneer Butter Masala',   score:94, color:'#2fa881' },
  { dish:'Chole Bhature & Lassi',  score:91, color:'#0ea5e9' },
  { dish:'Idli Vada Sambar',       score:86, color:'#7c3aed' },
];

const RATING_DIST = [
  { label:'5 ★', pct:78, color:'#2fa881' },
  { label:'4 ★', pct:16, color:'#0ea5e9' },
  { label:'3 ★', pct: 4, color:'#e8880a' },
  { label:'2 ★', pct: 2, color:'#e53e3e' },
];

const SAMPLE_REVIEWS = [
  { id:1, name:'Rohan Deshmukh',  room:'204', rating:5, emoji:'😍', comment:'The Friday Biryani was absolutely extraordinary — rich, fragrant, perfectly cooked!',             ago:'2 h ago'   },
  { id:2, name:'Ananya Roy',      room:'108', rating:4, emoji:'🙂', comment:'Chole Bhature was crispy and good. Would appreciate slightly less oil next time.',                   ago:'5 h ago'   },
  { id:3, name:'Vikram Malhotra', room:'312', rating:5, emoji:'😍', comment:'Paneer Butter Masala tasted restaurant-quality. Great job to the kitchen team!',                    ago:'Yesterday' },
];

const makeKPIs = ({ attendanceRate, totalSkipsToday }) => [
  { label:'Attendance Rate',       value:`${attendanceRate}%`, desc:'308 of 336 expected meals confirmed', trend:'+2.4%',   up:true,  Icon:Users,        accent:'#2fa881' },
  { label:'Meals Today',           value:'336',                 desc:'4 slots: Breakfast · Lunch · Snacks · Dinner', trend:'4 Slots', up:null,  Icon:Utensils,    accent:'#0ea5e9' },
  { label:'Kitchen Status',        value:'Live Prep',           desc:'Head cook executing lunch portions',  trend:'85% Done', up:true,  Icon:Flame,        accent:'#7c3aed' },
  { label:'Skip Requests',         value:`${totalSkipsToday}`, desc:'Portions adjusted automatically',    trend:'Logged',   up:false, Icon:UserX,        accent:'#e8880a' },
  { label:'Food Rating',           value:'4.8 / 5.0',          desc:'Based on 142 resident reviews',      trend:'Top Rated',up:true,  Icon:Star,         accent:'#e8880a' },
  { label:'Monthly Food Cost',     value:'₹1.24L',             desc:'₹1,480 per resident avg / month',    trend:'In Budget',up:true,  Icon:TrendingDown, accent:'#2fa881' },
  { label:'Food Waste',            value:'0.4 kg',             desc:'Surplus waste prevented today',      trend:'-92%',     up:true,  Icon:Leaf,         accent:'#0ea5e9' },
  { label:'Resident Satisfaction', value:'96%',                desc:'Based on weekly pulse survey',       trend:'+4%',      up:true,  Icon:Sparkles,     accent:'#7c3aed' },
];

const TABS = [
  { id:'overview',  label:'Overview',       Icon:Utensils  },
  { id:'planner',   label:'Weekly Planner', Icon:Calendar  },
  { id:'kitchen',   label:'Kitchen',        Icon:Flame     },
  { id:'analytics', label:'Analytics',      Icon:BarChart3 },
  { id:'feedback',  label:'Feedback',       Icon:Star      },
  { id:'residents', label:'Skip Register',  Icon:Users     },
  { id:'settings',  label:'Preferences',   Icon:Zap       },
];

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════ */

export default function MessManagementPage({ selectedPropertyId, session }) {
  const [activeTab,        setActiveTab]        = useState('overview');
  const [selectedProperty, setSelectedProperty] = useState('Greenview Residency');
  const [selectedDate,     setSelectedDate]     = useState(new Date().toISOString().split('T')[0]);
  const [searchQuery,      setSearchQuery]      = useState('');
  const [loading,          setLoading]          = useState(true);
  const [menu,             setMenu]             = useState(fallback.messMenu);
  const [skips,            setSkips]            = useState(fallback.mealSkips);

  const [showNotif,        setShowNotif]        = useState(false);
  const [showQA,           setShowQA]           = useState(false);
  const [showEditDrawer,   setShowEditDrawer]   = useState(false);
  const [showSkipModal,    setShowSkipModal]    = useState(false);

  const [editingDay, setEditingDay] = useState('Monday');
  const [editForm,   setEditForm]   = useState({
    breakfast: { items:'', timing:'08:00 AM - 10:00 AM', tag:'Veg' },
    lunch:     { items:'', timing:'01:00 PM - 03:00 PM', tag:'Veg' },
    snacks:    { items:'', timing:'05:30 PM - 06:30 PM', tag:'Veg' },
    dinner:    { items:'', timing:'08:00 PM - 10:00 PM', tag:'Veg / Non-Veg' },
  });

  const [selectedMeals, setSelectedMeals] = useState(['dinner']);
  const [skipReason,    setSkipReason]    = useState('Out of PG / Dining out');
  const [residentName,  setResidentName]  = useState('Aarav Sharma');
  const [roomNumber,    setRoomNumber]    = useState('101');

  const [fbEmoji,   setFbEmoji]   = useState('😍');
  const [fbRating,  setFbRating]  = useState(5);
  const [fbComment, setFbComment] = useState('');
  const [reviews,   setReviews]   = useState(SAMPLE_REVIEWS);

  const [toast, setToast] = useState('');

  const todayDay = new Date().toLocaleDateString('en-US', { weekday:'long' });
  const showToast = msg => { setToast(msg); setTimeout(() => setToast(''), 3500); };

  useEffect(() => { fetchData(); }, [selectedPropertyId, selectedDate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token   = session?.accessToken || session?.token;
      const headers = {
        'Content-Type': 'application/json',
        'x-organization-id': session?.organizationId || 'demo-org',
        ...(selectedPropertyId ? { 'x-property-id': selectedPropertyId } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };
      const qs = `propertyId=${selectedPropertyId || ''}`;
      const [mR, sR] = await Promise.all([
        fetch(`/api/tenant/mess/menu?${qs}`, { headers }),
        fetch(`/api/tenant/mess/skips?${qs}&date=${selectedDate}`, { headers }),
      ]);
      if (mR.ok) { const d = await mR.json(); setMenu(Array.isArray(d) && d.length ? d : fallback.messMenu); } else setMenu(fallback.messMenu);
      if (sR.ok) { const d = await sR.json(); setSkips(Array.isArray(d) ? d : fallback.mealSkips); }           else setSkips(fallback.mealSkips);
    } catch { setMenu(fallback.messMenu); setSkips(fallback.mealSkips); }
    finally  { setTimeout(() => setLoading(false), 300); }
  };

  const totalOccupants  = 84;
  const totalSkipsToday = skips.reduce((a, s) => a + (s.meals?.length || 0), 0);
  const skipCount = m => skips.filter(s => s.meals?.includes(m)).length;
  const attendanceRate  = Math.round(((totalOccupants * 4 - totalSkipsToday) / (totalOccupants * 4)) * 100);
  const todayMenu = menu.find(m => m.dayOfWeek === todayDay) || menu[0] || fallback.messMenu[0];
  const kpis = makeKPIs({ attendanceRate, totalSkipsToday });

  const filteredMenu = searchQuery
    ? menu.filter(m => {
        const q = searchQuery.toLowerCase();
        return m.dayOfWeek.toLowerCase().includes(q) ||
          [m.breakfast,m.lunch,m.snacks,m.dinner].some(s => s?.items?.toLowerCase().includes(q));
      })
    : menu;

  const openEditDrawer = dayName => {
    const obj = menu.find(m => m.dayOfWeek === dayName) || menu[0] || {};
    setEditingDay(dayName);
    setEditForm({
      breakfast: { ...(obj.breakfast||{}), tag: obj.breakfast?.tag || 'Veg' },
      lunch:     { ...(obj.lunch||{}),     tag: obj.lunch?.tag     || 'Veg' },
      snacks:    { ...(obj.snacks||{}),    tag: obj.snacks?.tag    || 'Veg' },
      dinner:    { ...(obj.dinner||{}),    tag: obj.dinner?.tag    || 'Veg / Non-Veg' },
    });
    setShowEditDrawer(true);
  };

  const handleSaveMenu = async () => {
    try {
      const token   = session?.accessToken || session?.token;
      const headers = { 'Content-Type':'application/json', 'x-organization-id': session?.organizationId || 'demo-org', ...(selectedPropertyId ? { 'x-property-id': selectedPropertyId } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) };
      const res = await fetch('/api/tenant/mess/menu', { method:'POST', headers, body: JSON.stringify({ propertyId: selectedPropertyId, dayOfWeek: editingDay, ...editForm }) });
      const updated = res.ok ? await res.json() : null;
      setMenu(p => p.map(m => m.dayOfWeek === editingDay ? (updated || { ...m, ...editForm }) : m));
      showToast(`Saved ${editingDay}'s menu`);
    } catch {
      setMenu(p => p.map(m => m.dayOfWeek === editingDay ? { ...m, ...editForm } : m));
      showToast(`Updated ${editingDay}'s menu`);
    } finally { setShowEditDrawer(false); }
  };

  const copyPreviousDay = idx => {
    if (idx === 0) { showToast('No previous day for Monday'); return; }
    const prev = DAYS[idx-1], curr = DAYS[idx];
    const src  = menu.find(m => m.dayOfWeek === prev);
    if (!src) return;
    setMenu(p => p.map(m => m.dayOfWeek === curr ? { ...m, breakfast:{...src.breakfast}, lunch:{...src.lunch}, snacks:{...src.snacks}, dinner:{...src.dinner} } : m));
    showToast(`Copied ${prev} → ${curr}`);
  };

  const handleSkipSubmit = async e => {
    e.preventDefault();
    if (!selectedMeals.length) { showToast('Select at least one meal'); return; }
    try {
      const token   = session?.accessToken || session?.token;
      const headers = { 'Content-Type':'application/json', 'x-organization-id': session?.organizationId || 'demo-org', ...(selectedPropertyId ? { 'x-property-id': selectedPropertyId } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) };
      await fetch('/api/tenant/mess/skips', { method:'POST', headers, body: JSON.stringify({ propertyId: selectedPropertyId, residentId: session?.user?.id || 'res-1', residentName, roomNumber, date: selectedDate, meals: selectedMeals, reason: skipReason }) });
    } catch {}
    setSkips(p => [{ _id:`skip-${Date.now()}`, residentName, roomNumber, date: selectedDate, meals: selectedMeals, reason: skipReason }, ...p]);
    showToast(`Skip logged for Room ${roomNumber}`);
    setShowSkipModal(false);
  };

  const handleFeedbackSubmit = e => {
    e.preventDefault();
    if (!fbComment.trim()) return;
    setReviews(p => [{ id:Date.now(), name: session?.user?.name||'Resident', room:'104', rating: fbRating, emoji: fbEmoji, comment: fbComment, ago:'Just now' }, ...p]);
    setFbComment(''); showToast('Thank you! Feedback submitted.');
  };

  const toggleMeal = m => setSelectedMeals(p => p.includes(m) ? p.filter(x=>x!==m) : [...p,m]);

  /* ──────────────────────────────────────────────────────── */
  return (
    <div className="mess-page">

      {/* TOAST */}
      {toast && (
        <div className="mess-toast">
          <div className="mess-toast-dot">✓</div>
          {toast}
        </div>
      )}

      {/* ── HEADER ── */}
      <div className="mess-header">
        <div className="mess-header-top">

          <div className="mess-title-area">
            <div className="mess-eyebrow">
              <span className="mess-eyebrow-dot" />
              Enterprise Operations
            </div>
            <h1 className="mess-page-title">Dining & Kitchen Hub</h1>
            <p className="mess-page-sub">Menu scheduling · portion intelligence · resident meal automation</p>
          </div>

          <div className="mess-controls">
            {/* Search */}
            <div className="mess-search-wrap">
              <Search size={14} className="mess-search-icon" />
              <input
                className="mess-search"
                type="text"
                placeholder="Search dishes, days…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Property */}
            <select className="mess-select" value={selectedProperty} onChange={e => setSelectedProperty(e.target.value)}>
              <option>Greenview Residency</option>
              <option>StayZen Prime (Indiranagar)</option>
              <option>StayZen Elite (HSR Layout)</option>
            </select>

            {/* Date */}
            <input className="mess-date" type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />

            {/* Notifications */}
            <div className="mess-dropdown">
              <button className="mess-notif-btn" onClick={() => { setShowNotif(v=>!v); setShowQA(false); }}>
                <Bell size={16} />
                <span className="mess-notif-badge">2</span>
              </button>
              {showNotif && (
                <div className="mess-notif-dropdown">
                  <div className="mess-notif-header">
                    <span>Kitchen Alerts</span>
                    <span className="mess-side-badge" style={{ background:'rgba(47,168,129,0.1)', color:'#2fa881', borderColor:'rgba(47,168,129,0.25)' }}>2 New</span>
                  </div>
                  {[
                    { title:'Dinner Freeze Approaching', body:'Cutoff locks at 06:00 PM. 14 residents logged skips.',           warn:true  },
                    { title:'Lunch Prep 85% Complete',   body:'Head cook updated headcount for 78 confirmed residents.',        warn:false },
                  ].map((n,i) => (
                    <div key={i} className="mess-notif-item"
                      style={ n.warn
                        ? { background:'rgba(232,136,10,0.08)',  borderColor:'rgba(232,136,10,0.22)'  }
                        : { background:'rgba(47,168,129,0.08)',  borderColor:'rgba(47,168,129,0.22)'  }
                      }>
                      <strong style={{ color: n.warn ? '#e8880a' : '#2fa881' }}>{n.title}</strong>
                      <p>{n.body}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Profile */}
            <div className="mess-profile-pill">
              <div className="mess-avatar">A</div>
              <div>
                <div className="mess-profile-name">Adarsh Kumar</div>
                <div className="mess-profile-role">Ops Lead</div>
              </div>
            </div>

            {/* Primary CTA */}
            <button className="mess-btn-primary" onClick={() => openEditDrawer(todayDay)}>
              <Edit3 size={14} /> Edit Menu
            </button>

            {/* Quick Actions */}
            <div className="mess-dropdown">
              <button className="mess-btn-secondary" onClick={() => { setShowQA(v=>!v); setShowNotif(false); }}>
                <Zap size={14} style={{ color:'#e8880a' }} /> Quick Actions <ChevronDown size={12} />
              </button>
              {showQA && (
                <div className="mess-dropdown-menu">
                  {[
                    { Icon:UserX,    color:'#e8880a', label:'Log Resident Skip',       action:() => { setShowSkipModal(true);  setShowQA(false); } },
                    { Icon:Bell,     color:'#2fa881', label:'Broadcast Menu',           action:() => { showToast('Broadcast sent!');          setShowQA(false); } },
                    { Icon:Download, color:'#0ea5e9', label:'Export Schedule PDF',      action:() => { showToast('Exported schedule!');        setShowQA(false); } },
                    { Icon:Copy,     color:'#7c3aed', label:'Duplicate Week',           action:() => { showToast('Week duplicated!');          setShowQA(false); } },
                  ].map(({ Icon, color, label, action }) => (
                    <button key={label} className="mess-dropdown-item" onClick={action}>
                      <Icon size={14} style={{ color }} /> {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* TABS */}
        <div className="mess-tabs">
          {TABS.map(({ id, label, Icon }) => (
            <button key={id} className={`mess-tab-btn${activeTab===id?' active':''}`} onClick={() => setActiveTab(id)}>
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── KPI CARDS ── */}
      <section>
        <div className="mess-section-label">
          <h3><Activity size={12} style={{ color:'#2fa881' }} /> Real-time Operational Metrics</h3>
          <span style={{ fontSize:11, color:'var(--muted)' }}>{selectedProperty}</span>
        </div>

        <div className="mess-kpi-grid">
          {kpis.map(({ label, value, desc, trend, up, Icon, accent }) => (
            <div key={label} className="mess-kpi-card" style={{ '--accent': accent }}>
              <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:`linear-gradient(90deg, ${accent}, transparent)`, borderRadius:'20px 20px 0 0' }} />

              <div className="mess-kpi-top">
                <span className="mess-kpi-label">{label}</span>
                <div className="mess-kpi-icon" style={{ background:`${accent}18` }}>
                  <Icon size={18} style={{ color: accent }} />
                </div>
              </div>

              <div className="mess-kpi-value">{value}</div>
              <p className="mess-kpi-desc">{desc}</p>

              <span className={`mess-kpi-badge ${up===true?'up':up===false?'down':'neu'}`}>
                {up===true && <TrendingUp size={13} style={{ marginRight: 3 }} />}
                {trend}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ── SKELETON ── */}
      {loading && (
        <div className="mess-skeleton">
          {[...Array(4)].map((_,i) => <div key={i} className="mess-skeleton-card" />)}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          OVERVIEW TAB
      ══════════════════════════════════════════════════════ */}
      {!loading && activeTab === 'overview' && (
        <div className="mess-main-grid">

          {/* LEFT 70% – TODAY'S MEALS */}
          <div>
            <div className="mess-section-head">
              <div>
                <h2><Sun size={20} style={{ color:'#e8880a' }} /> Today's Meals Timeline
                  <span style={{ fontSize:14, fontWeight:600, color:'var(--muted)', marginLeft:6 }}>({todayDay})</span>
                </h2>
                <p>Live portion counts & broadcast controls</p>
              </div>
              <div className="mess-live-badge">
                <span className="mess-live-dot" /> Live Sync
              </div>
            </div>

            <div className="mess-meal-list">
              {MEAL_CFG.map(m => {
                const sc       = skipCount(m.key);
                const mealData = todayMenu[m.key] || {};
                const items    = mealData.items || '—';
                return (
                  <div key={m.key} className="mess-meal-card">
                    {/* Accent strip */}
                    <div className="mess-meal-accent" style={{ background: `linear-gradient(90deg, ${m.accent}, transparent)` }} />

                    <div className="mess-meal-body">
                      {/* Header row */}
                      <div className="mess-meal-header-row">
                        <div className="mess-meal-title-group">
                          <div className="mess-meal-icon-wrap" style={{ background: m.bg, border: `1px solid ${m.border}` }}>
                            <m.Icon size={22} style={{ color: m.accent }} />
                          </div>
                          <div>
                            <h3 className="mess-meal-title">{m.label}</h3>
                            <div className="mess-meal-time">
                              <Clock size={12} /> {mealData.timing || m.time}
                            </div>
                          </div>
                        </div>

                        <div className="mess-meal-badges">
                          <span className="mess-badge" style={{ background: m.bg, color: m.accent, borderColor: m.border }}>
                            {mealData.tag || 'Veg'}
                          </span>
                          <span className="mess-badge" style={m.statusStyle}>
                            {m.status}
                          </span>
                        </div>
                      </div>

                      {/* Dish box */}
                      <div className="mess-dish-box">
                        <div className="mess-dish-label">
                          <span style={{ display:'flex', alignItems:'center', gap:5 }}>
                            <Tag size={10} style={{ color:'#2fa881' }} /> Scheduled Items
                          </span>
                          <button className="mess-dish-edit-link" onClick={() => openEditDrawer(todayDay)}>
                            <Edit3 size={11} /> Edit
                          </button>
                        </div>
                        <p className="mess-dish-text">{items}</p>
                      </div>

                      {/* Metrics */}
                      <div className="mess-meal-metrics">
                        {[
                          { lbl:'Expected',  val:84,       bg:'var(--app-bg)',               color:'var(--text-primary)', border:'var(--border)'              },
                          { lbl:'Confirmed', val:84-sc,    bg:'rgba(47,168,129,0.08)',        color:'#2fa881',             border:'rgba(47,168,129,0.2)'       },
                          { lbl:'Skipped',   val:sc,       bg:'rgba(232,136,10,0.08)',        color:'#e8880a',             border:'rgba(232,136,10,0.2)'       },
                        ].map(({ lbl, val, bg, color, border }) => (
                          <div key={lbl} className="mess-metric" style={{ background:bg, borderColor:border }}>
                            <span className="mess-metric-lbl" style={{ color }}>{lbl}</span>
                            <strong className="mess-metric-val" style={{ color }}>{val}</strong>
                          </div>
                        ))}
                      </div>

                      {/* Progress */}
                      <div className="mess-prog-wrap">
                        <div className="mess-prog-head">
                          <span>Preparation Progress</span>
                          <span style={{ color: m.accent, fontWeight:700 }}>{m.progress}%</span>
                        </div>
                        <div className="mess-prog-track">
                          <div className="mess-prog-fill" style={{ width:`${m.progress}%`, background:`linear-gradient(90deg, ${m.accent}, ${m.accent}aa)` }} />
                        </div>
                      </div>

                      {/* Footer */}
                      <div className="mess-meal-footer">
                        <div className="mess-meal-footer-left">
                          <ShieldCheck size={13} style={{ color:'#2fa881' }} /> Quality & Hygiene Verified
                        </div>
                        <div className="mess-meal-footer-actions">
                          <button className="mess-act-btn ghost" onClick={() => showToast(`Broadcasted ${m.label}!`)}>
                            <Send size={12} /> Broadcast
                          </button>
                          <button className="mess-act-btn accent" style={{ background: m.accent, borderColor:'transparent' }} onClick={() => openEditDrawer(todayDay)}>
                            <Edit3 size={12} /> Modify
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT 30% – SIDEBAR */}
          <aside className="mess-sidebar">

            {/* Prep Progress */}
            <div className="mess-side-card">
              <div className="mess-side-head">
                <div className="mess-side-title"><Flame size={14} style={{ color:'#e8880a' }} /> Preparation Progress</div>
                <span className="mess-side-badge" style={{ background:'rgba(47,168,129,0.1)', color:'#2fa881', borderColor:'rgba(47,168,129,0.25)' }}>On Track</span>
              </div>
              <div className="mess-side-body">
                <div style={{ marginBottom:14 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, fontWeight:600, marginBottom:6 }}>
                    <span>Lunch Preparation</span><span style={{ color:'#2fa881' }}>85%</span>
                  </div>
                  <div className="mess-prog-track">
                    <div className="mess-prog-fill" style={{ width:'85%', background:'linear-gradient(90deg,#2fa881,#0ea5e9)' }} />
                  </div>
                  <p style={{ fontSize:11, color:'var(--muted)', marginTop:6 }}>78 portions based on confirmed headcount</p>
                </div>
                <div className="mess-alert" style={{ background:'rgba(232,136,10,0.08)', borderColor:'rgba(232,136,10,0.22)' }}>
                  <strong style={{ color:'#e8880a' }}>Dinner Cutoff Freeze</strong>
                  <p style={{ color:'var(--text-primary)' }}>Portion lock at 06:00 PM. {skipCount('dinner')} skip{skipCount('dinner')!==1?'s':''} so far.</p>
                </div>
              </div>
            </div>

            {/* Inventory */}
            <div className="mess-side-card">
              <div className="mess-side-head">
                <div className="mess-side-title"><Package size={14} style={{ color:'#0ea5e9' }} /> Inventory Status</div>
                <button style={{ background:'none', border:'none', color:'var(--muted)', cursor:'pointer' }} onClick={() => showToast('Inventory refreshed!')}>
                  <RefreshCw size={13} />
                </button>
              </div>
              <div className="mess-side-body">
                {[
                  { name:'Fresh Paneer',  val:'12 kg',      warn:true  },
                  { name:'Commercial Gas',val:'4 Cylinders', warn:false },
                  { name:'Basmati Rice',  val:'45 kg',      warn:false },
                  { name:'Cooking Oil',   val:'28 L',       warn:false },
                ].map(({ name, val, warn }) => (
                  <div key={name} className="mess-inv-row">
                    <div className="mess-inv-name">
                      <span className="mess-inv-dot" style={{ background: warn ? '#e8880a' : '#2fa881' }} />
                      {name}
                    </div>
                    <span className="mess-inv-val"
                      style={ warn
                        ? { background:'rgba(232,136,10,0.1)', color:'#e8880a', borderColor:'rgba(232,136,10,0.25)' }
                        : { background:'rgba(47,168,129,0.1)',  color:'#2fa881', borderColor:'rgba(47,168,129,0.25)' }
                      }>
                      {val}{warn ? ' ⚠' : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Alerts */}
            <div className="mess-side-card">
              <div className="mess-side-head">
                <div className="mess-side-title"><Bell size={14} style={{ color:'#e8880a' }} /> Today's Alerts</div>
                <span className="mess-side-badge" style={{ background:'rgba(232,136,10,0.1)', color:'#e8880a', borderColor:'rgba(232,136,10,0.25)' }}>2 Active</span>
              </div>
              <div className="mess-side-body">
                <div className="mess-alert" style={{ background:'rgba(232,136,10,0.08)', borderColor:'rgba(232,136,10,0.22)' }}>
                  <strong style={{ color:'#e8880a' }}>Cutoff Approaching</strong>
                  <p>Dinner skip deadline at 06:00 PM sharp.</p>
                </div>
                <div className="mess-alert" style={{ background:'rgba(47,168,129,0.08)', borderColor:'rgba(47,168,129,0.22)' }}>
                  <strong style={{ color:'#2fa881' }}>Zero Waste Breakfast</strong>
                  <p>No unconsumed food in breakfast slot.</p>
                </div>
              </div>
            </div>

            {/* Feedback preview */}
            <div className="mess-side-card">
              <div className="mess-side-head">
                <div className="mess-side-title"><Star size={14} style={{ color:'#e8880a' }} /> Recent Feedback</div>
                <button style={{ background:'none', border:'none', color:'#2fa881', fontSize:12, fontWeight:700, cursor:'pointer' }} onClick={() => setActiveTab('feedback')}>All →</button>
              </div>
              <div className="mess-side-body">
                {reviews.slice(0,2).map(r => (
                  <div key={r.id} className="mess-fb-preview">
                    <div className="mess-fb-meta">
                      <span className="mess-fb-name">{r.name} <span style={{ color:'var(--muted)', fontWeight:400 }}>Rm {r.room}</span></span>
                      <span className="mess-fb-rating">{r.emoji} {r.rating}★</span>
                    </div>
                    <p className="mess-fb-quote">"{r.comment}"</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="mess-side-card">
              <div className="mess-side-head">
                <div className="mess-side-title"><Zap size={14} style={{ color:'#7c3aed' }} /> Quick Actions</div>
              </div>
              <div className="mess-side-body">
                {[
                  { Icon:UserX,    color:'#e8880a', label:'Log Resident Skip',  action:() => setShowSkipModal(true)                    },
                  { Icon:Bell,     color:'#2fa881', label:'Broadcast Menu',      action:() => showToast('Broadcast sent!')               },
                  { Icon:Download, color:'#0ea5e9', label:'Export PDF',          action:() => showToast('Exported schedule!')            },
                ].map(({ Icon, color, label, action }) => (
                  <button key={label} className="mess-quick-btn" onClick={action}>
                    <Icon size={14} style={{ color }} /> {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tomorrow teaser */}
            <div className="mess-tomorrow">
              <div className="mess-tomorrow-label">
                Tomorrow's Menu <Calendar size={13} />
              </div>
              <h4>Idli, Vada, Sambhar & Rajma Masala</h4>
              <p>Raw material procurement completed · 4 slots</p>
            </div>

          </aside>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          WEEKLY PLANNER TAB
      ══════════════════════════════════════════════════════ */}
      {!loading && activeTab === 'planner' && (
        <section>
          <div className="mess-planner-header">
            <div>
              <h2><Calendar size={20} style={{ color:'#2fa881' }} /> Weekly Calendar</h2>
              <p>Drag & drop meals, copy days, festival & holiday labels</p>
            </div>
            <div className="mess-planner-actions">
              <button className="mess-btn-secondary" onClick={() => showToast('Week duplicated!')}>
                <Copy size={13} style={{ color:'#0ea5e9' }} /> Duplicate Week
              </button>
              <button className="mess-btn-primary" onClick={() => showToast('Exported schedule!')}>
                <Download size={13} /> Export Schedule
              </button>
            </div>
          </div>

          <div className="mess-day-grid">
            {DAYS.map((dayName, idx) => {
              const dayObj   = filteredMenu.find(m => m.dayOfWeek === dayName) || { dayOfWeek: dayName };
              const festival = FESTIVAL[dayName];
              const isToday  = dayName === todayDay;

              return (
                <div key={dayName} className={`mess-day-card${isToday?' today':''}`}>
                  <div className="mess-day-head">
                    <span className="mess-day-name">
                      {dayName}
                      {isToday && <span className="mess-day-today-pill">Today</span>}
                    </span>
                  </div>

                  <div className="mess-day-body">
                    {festival && (
                      <div className="mess-festival-chip" style={festival.style}>
                        {festival.emoji} {festival.label}
                      </div>
                    )}
                    {[
                      { key:'breakfast', Icon:Coffee, color:'#e8880a', label:'Breakfast' },
                      { key:'lunch',     Icon:Sun,    color:'#2fa881', label:'Lunch'     },
                      { key:'snacks',    Icon:Sunset, color:'#0ea5e9', label:'Snacks'    },
                      { key:'dinner',    Icon:Moon,   color:'#7c3aed', label:'Dinner'    },
                    ].map(({ key, Icon, color, label }) => (
                      <div key={key} className="mess-slot">
                        <div className="mess-slot-label" style={{ color }}>
                          <Icon size={9} /> {label}
                        </div>
                        <div className="mess-slot-text">{dayObj[key]?.items || 'No menu set'}</div>
                      </div>
                    ))}
                  </div>

                  <div className="mess-day-actions">
                    <button className="mess-day-act ghost" disabled={idx===0} onClick={() => copyPreviousDay(idx)}>
                      <Copy size={10} /> Copy Prev
                    </button>
                    <button className="mess-day-act accent" onClick={() => openEditDrawer(dayName)}>
                      <Edit3 size={10} /> Edit
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ══════════════════════════════════════════════════════
          KITCHEN TAB
      ══════════════════════════════════════════════════════ */}
      {!loading && activeTab === 'kitchen' && (
        <section>
          <div className="mess-section-head">
            <div>
              <h2><Flame size={20} style={{ color:'#e8880a' }} /> Live Kitchen Dashboard</h2>
              <p>Real-time meal preparation progress & portion management</p>
            </div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
            {[
              { label:'Lunch Preparation',  pct:85, color:'#2fa881', confirmed:84-skipCount('lunch'),  skipped:skipCount('lunch'),  extra:null },
              { label:'Dinner Preparation', pct:15, color:'#7c3aed', confirmed:84-skipCount('dinner'), skipped:skipCount('dinner'), extra:`Freeze cutoff at 06:00 PM. ${skipCount('dinner')} skip${skipCount('dinner')!==1?'s':''} so far.` },
            ].map(({ label, pct, color, confirmed, skipped, extra }) => (
              <div key={label} className="mess-analytics-wrap">
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:14, fontWeight:700, marginBottom:16 }}>
                  <span>{label}</span>
                  <span style={{ color, fontFamily:'Manrope,sans-serif', fontWeight:800 }}>{pct}% Complete</span>
                </div>
                <div className="mess-prog-track" style={{ marginBottom:16 }}>
                  <div className="mess-prog-fill" style={{ width:`${pct}%`, background:color }} />
                </div>
                <div className="mess-meal-metrics">
                  {[
                    { lbl:'Confirmed', val:confirmed, bg:'rgba(47,168,129,0.08)',  color:'#2fa881', border:'rgba(47,168,129,0.2)'  },
                    { lbl:'Skipped',   val:skipped,   bg:'rgba(232,136,10,0.08)', color:'#e8880a', border:'rgba(232,136,10,0.2)'  },
                    { lbl:'Remaining', val:12,         bg:'var(--app-bg)',          color:'var(--text-primary)', border:'var(--border)' },
                  ].map(({ lbl, val, bg, color: c, border }) => (
                    <div key={lbl} className="mess-metric" style={{ background:bg, borderColor:border }}>
                      <span className="mess-metric-lbl" style={{ color:c }}>{lbl}</span>
                      <strong className="mess-metric-val" style={{ color:c }}>{val}</strong>
                    </div>
                  ))}
                </div>
                {extra && (
                  <div className="mess-alert" style={{ background:'rgba(232,136,10,0.08)', borderColor:'rgba(232,136,10,0.22)', marginBottom:0 }}>
                    <p style={{ color:'var(--text-primary)' }}>{extra}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ══════════════════════════════════════════════════════
          ANALYTICS TAB
      ══════════════════════════════════════════════════════ */}
      {!loading && activeTab === 'analytics' && (
        <div className="mess-analytics-wrap">
          <div className="mess-analytics-head">
            <h2><BarChart3 size={20} style={{ color:'#0ea5e9' }} /> Analytics & AI Insights</h2>
          </div>

          {/* AI insight cards */}
          <div className="mess-ai-cards">
            {[
              { accent:'#2fa881', tag:'AI Insight #1', title:'Friday Night Skip Spike',       body:'Consistent 34% dinner skip surge every Friday. Adjusting quantities saves ₹1,800/week.' },
              { accent:'#0ea5e9', tag:'AI Insight #2', title:'Sunday Feast Bulk Procurement', body:'98% Sunday attendance. Pre-ordering Paneer on Saturday cuts supplier cost by 8%.'         },
            ].map(({ accent, tag, title, body }) => (
              <div key={tag} className="mess-ai-card" style={{ background:`rgba(${accent==='#2fa881'?'47,168,129':'14,165,233'},0.06)`, borderColor:`${accent}35` }}>
                <div className="mess-ai-card-tag" style={{ color: accent }}>
                  <Sparkles size={11} /> {tag}
                </div>
                <h3>{title}</h3>
                <p>{body}</p>
              </div>
            ))}
          </div>

          {/* Charts */}
          <div className="mess-charts">
            {/* Bar chart – attendance */}
            <div className="mess-chart-card">
              <h4><Users size={14} style={{ color:'#2fa881' }} /> Weekly Attendance</h4>
              <div className="mess-bar-chart">
                {ATTENDANCE_DATA.map(({ d, v }) => (
                  <div key={d} className="mess-bar-col">
                    <span className="mess-bar-val">{v}%</span>
                    <div style={{ flex:1, display:'flex', alignItems:'flex-end', width:'100%' }}>
                      <div className="mess-bar" style={{ height:`${v}%`, background:`linear-gradient(0deg, #2fa881, #0ea5e9)` }} />
                    </div>
                    <span className="mess-bar-label">{d}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Popularity */}
            <div className="mess-chart-card">
              <h4><Star size={14} style={{ color:'#e8880a' }} /> Dish Popularity</h4>
              {POPULARITY_DATA.map(({ dish, score, color }) => (
                <div key={dish} className="mess-pop-row">
                  <span className="mess-pop-name">{dish}</span>
                  <div className="mess-pop-track">
                    <div className="mess-pop-fill" style={{ width:`${score}%`, background: color }} />
                  </div>
                  <span className="mess-pop-pct" style={{ color }}>{score}%</span>
                </div>
              ))}
            </div>

            {/* Cost */}
            <div className="mess-chart-card">
              <h4><TrendingDown size={14} style={{ color:'#2fa881' }} /> Cost vs Budget</h4>
              <div className="mess-cost-big">
                <span className="label">Monthly Spend</span>
                <div className="amount">₹1,24,500</div>
                <span className="target">Target: ₹1,50,000</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:'var(--muted)', marginBottom:6 }}>
                <span>Budget used</span><span style={{ color:'#2fa881', fontWeight:700 }}>83%</span>
              </div>
              <div className="mess-prog-track">
                <div className="mess-prog-fill" style={{ width:'83%', background:'linear-gradient(90deg,#2fa881,#0ea5e9)' }} />
              </div>
              <p style={{ fontSize:11, color:'var(--muted)', marginTop:6 }}>₹25,500 remaining this month</p>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          FEEDBACK TAB
      ══════════════════════════════════════════════════════ */}
      {!loading && activeTab === 'feedback' && (
        <div className="mess-feedback-wrap">
          <div className="mess-fb-head">
            <div>
              <h2><Star size={20} style={{ color:'#e8880a' }} /> Resident Feedback & Ratings</h2>
              <p style={{ fontSize:12, color:'var(--muted)', marginTop:4 }}>Continuous quality tracking & dish rating distribution</p>
            </div>
            <div className="mess-avg-score">
              <div className="score">4.8</div>
              <span className="of">out of 5.0</span>
            </div>
          </div>

          <div className="mess-fb-grid">
            {/* Submit feedback */}
            <div className="mess-fb-form-card">
              <span className="mess-fb-card-label">Leave a Review</span>
              <form onSubmit={handleFeedbackSubmit}>
                <div className="mess-emoji-row">
                  {['😍','🙂','😐','🙁'].map(e => (
                    <button type="button" key={e} className={`mess-emoji-btn${fbEmoji===e?' selected':''}`} onClick={() => setFbEmoji(e)}>{e}</button>
                  ))}
                </div>
                <div className="mess-stars">
                  {[1,2,3,4,5].map(s => (
                    <button type="button" key={s} className="mess-star-btn" onClick={() => setFbRating(s)}>
                      {s <= fbRating ? '★' : '☆'}
                    </button>
                  ))}
                </div>
                <textarea className="mess-fb-textarea" value={fbComment} onChange={e => setFbComment(e.target.value)} placeholder="Write your review…" />
                <button type="submit" className="mess-btn-primary" style={{ width:'100%', justifyContent:'center' }}>
                  <Send size={13} /> Submit Feedback
                </button>
              </form>
            </div>

            {/* Distribution */}
            <div className="mess-fb-dist-card">
              <span className="mess-fb-card-label">Rating Distribution</span>
              {RATING_DIST.map(({ label, pct, color }) => (
                <div key={label} className="mess-dist-row">
                  <span className="mess-dist-star">{label}</span>
                  <div className="mess-dist-track">
                    <div className="mess-dist-fill" style={{ width:`${pct}%`, background:color }} />
                  </div>
                  <span className="mess-dist-pct">{pct}%</span>
                </div>
              ))}
            </div>

            {/* Leaderboard */}
            <div className="mess-fb-leader-card">
              <span className="mess-fb-card-label">Dish Leaderboard</span>
              {[
                { dish:'Paneer Butter Masala', when:'Friday Dinner',      rating:4.9, good:true  },
                { dish:'Chole Bhature & Lassi',when:'Friday Breakfast',   rating:4.8, good:true  },
                { dish:'Kadhi Pakora',          when:'Needs improvement', rating:3.9, good:false },
              ].map(({ dish, when, rating, good }) => (
                <div key={dish} className="mess-leader-item"
                  style={ good
                    ? { background:'rgba(47,168,129,0.07)',  borderColor:'rgba(47,168,129,0.2)'  }
                    : { background:'rgba(232,136,10,0.07)', borderColor:'rgba(232,136,10,0.2)'  }
                  }>
                  <div>
                    <span className="mess-leader-name">{dish}</span>
                    <span className="mess-leader-when">{when}</span>
                  </div>
                  <span className="mess-leader-score">{rating} ★</span>
                </div>
              ))}
            </div>
          </div>

          {/* Review stream */}
          <div className="mess-review-stream">
            <h3>Recent Reviews ({reviews.length})</h3>
            <div className="mess-review-grid">
              {reviews.map(r => (
                <div key={r.id} className="mess-review-card">
                  <div className="mess-review-meta">
                    <div className="mess-review-author">
                      <div className="mess-review-initials">{r.name[0]}</div>
                      <div>
                        <div className="mess-review-name">{r.name}</div>
                        <div className="mess-review-room">Rm {r.room}</div>
                      </div>
                    </div>
                    <span className="mess-review-rating">{r.emoji} {r.rating}★</span>
                  </div>
                  <p className="mess-review-text">"{r.comment}"</p>
                  <span className="mess-review-ago">{r.ago}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          SKIP REGISTER TAB
      ══════════════════════════════════════════════════════ */}
      {!loading && activeTab === 'residents' && (
        <div className="mess-skip-wrap">
          <div className="mess-skip-head">
            <div>
              <h2><Users size={20} style={{ color:'#e8880a' }} /> Skip Register</h2>
              <p>{selectedDate} · Automated portion control audit trail</p>
            </div>
            <button className="mess-btn-primary" style={{ background:'#e8880a', boxShadow:'0 2px 12px rgba(232,136,10,0.35)' }} onClick={() => setShowSkipModal(true)}>
              <UserX size={13} /> Log Skip
            </button>
          </div>
          <div style={{ overflowX:'auto' }}>
            <table className="mess-tbl">
              <thead>
                <tr>
                  {['Resident','Room','Meals Skipped','Reason','Status'].map(h => <th key={h}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {skips.map(s => (
                  <tr key={s._id}>
                    <td style={{ fontWeight:600 }}>{s.residentName}</td>
                    <td style={{ fontFamily:'monospace', color:'var(--muted)' }}>{s.roomNumber}</td>
                    <td>
                      {s.meals?.map(m => <span key={m} className="mess-meal-chip">{m}</span>)}
                    </td>
                    <td style={{ color:'var(--muted)', fontStyle:'italic', fontSize:12 }}>{s.reason || 'Out of PG'}</td>
                    <td><span className="mess-status-chip">Adjusted</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          PREFERENCES TAB
      ══════════════════════════════════════════════════════ */}
      {!loading && activeTab === 'settings' && (
        <div className="mess-settings-wrap">
          <div className="mess-settings-head">
            <div className="mess-settings-icon"><Zap size={20} /></div>
            <div>
              <h2>Mess Preferences & Timing Rules</h2>
              <p>Dietary policies, cutoff deadlines & budget targets</p>
            </div>
          </div>
          <div className="mess-settings-grid">
            <div className="mess-settings-card">
              <h3>Meal Timings</h3>
              {[
                { label:'Breakfast Hours',       def:'08:00 AM - 10:00 AM' },
                { label:'Dinner Freeze Cutoff',  def:'06:00 PM'            },
              ].map(({ label, def }) => (
                <div key={label} className="mess-field">
                  <label>{label}</label>
                  <input type="text" defaultValue={def} />
                </div>
              ))}
            </div>
            <div className="mess-settings-card">
              <h3>Daily Budget Target</h3>
              <div className="mess-field">
                <label>Budget / Resident / Day (₹)</label>
                <input type="number" defaultValue={120} />
              </div>
              <button className="mess-btn-primary" style={{ width:'100%', justifyContent:'center', marginTop:8 }} onClick={() => showToast('Preferences saved!')}>
                <Save size={13} /> Save Preferences
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          EDIT MENU SLIDE-OVER DRAWER
      ══════════════════════════════════════════════════════ */}
      {showEditDrawer && (
        <div className="mess-overlay" onClick={e => { if(e.target===e.currentTarget) setShowEditDrawer(false); }}>
          <div className="mess-drawer">
            <div className="mess-drawer-head">
              <div>
                <div className="mess-drawer-title"><Edit3 size={17} style={{ color:'#2fa881' }} /> Edit Menu</div>
                <div className="mess-drawer-sub">{editingDay} · All 4 meal slots</div>
              </div>
              <button className="mess-drawer-close" onClick={() => setShowEditDrawer(false)}><X size={15} /></button>
            </div>

            <div className="mess-drawer-body">
              {['breakfast','lunch','snacks','dinner'].map(slot => {
                const cfg = MEAL_CFG.find(m => m.key === slot);
                return (
                  <div key={slot} className="mess-drawer-slot">
                    <div className="mess-drawer-slot-label" style={{ color: cfg?.accent || '#2fa881' }}>
                      {cfg && <cfg.Icon size={13} />} {slot}
                    </div>
                    <div className="mess-drawer-field">
                      <label>Menu Items</label>
                      <input className="mess-drawer-input" type="text" value={editForm[slot]?.items || ''}
                        onChange={e => setEditForm({ ...editForm, [slot]: { ...editForm[slot], items: e.target.value } })}
                        placeholder="e.g. Roti, Dal, Rice…" />
                    </div>
                    <div className="mess-drawer-row">
                      <div className="mess-drawer-field">
                        <label>Serving Hours</label>
                        <input className="mess-drawer-input" type="text" value={editForm[slot]?.timing || ''}
                          onChange={e => setEditForm({ ...editForm, [slot]: { ...editForm[slot], timing: e.target.value } })} />
                      </div>
                      <div className="mess-drawer-field">
                        <label>Diet Tag</label>
                        <select className="mess-drawer-input" value={editForm[slot]?.tag || 'Veg'}
                          onChange={e => setEditForm({ ...editForm, [slot]: { ...editForm[slot], tag: e.target.value } })}>
                          <option>Veg</option>
                          <option>Non-Veg</option>
                          <option>Veg / Non-Veg</option>
                        </select>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mess-drawer-foot">
              <button className="mess-btn-secondary" onClick={() => setShowEditDrawer(false)}>Cancel</button>
              <button className="mess-btn-primary" onClick={handleSaveMenu}><Save size={13} /> Save Schedule</button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          QUICK SKIP MODAL
      ══════════════════════════════════════════════════════ */}
      {showSkipModal && (
        <div className="mess-modal-overlay" onClick={e => { if(e.target===e.currentTarget) setShowSkipModal(false); }}>
          <div className="mess-modal">
            <div className="mess-modal-head">
              <div>
                <div className="mess-modal-title"><UserX size={16} style={{ color:'#e8880a' }} /> Log Meal Skip</div>
                <div className="mess-modal-sub">Notify kitchen to adjust portion counts</div>
              </div>
              <button className="mess-drawer-close" onClick={() => setShowSkipModal(false)}><X size={14} /></button>
            </div>

            <form onSubmit={handleSkipSubmit}>
              <div className="mess-modal-body">
                <div className="mess-modal-grid">
                  <div className="mess-modal-field">
                    <label>Resident Name</label>
                    <input className="mess-modal-input" type="text" value={residentName} onChange={e => setResidentName(e.target.value)} />
                  </div>
                  <div className="mess-modal-field">
                    <label>Room No.</label>
                    <input className="mess-modal-input" type="text" value={roomNumber} onChange={e => setRoomNumber(e.target.value)} />
                  </div>
                </div>

                <div className="mess-modal-field">
                  <label>Select Meals to Skip</label>
                  <div className="mess-modal-grid">
                    {['breakfast','lunch','snacks','dinner'].map(m => (
                      <button type="button" key={m} className={`mess-meal-toggle${selectedMeals.includes(m)?' selected':''}`} onClick={() => toggleMeal(m)}>
                        {m} {selectedMeals.includes(m) && <Check size={13} />}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mess-modal-field">
                  <label>Reason</label>
                  <input className="mess-modal-input" type="text" value={skipReason} onChange={e => setSkipReason(e.target.value)} placeholder="e.g. Traveling / Dining out" />
                </div>
              </div>

              <div className="mess-modal-foot">
                <button type="button" className="mess-btn-secondary" onClick={() => setShowSkipModal(false)}>Cancel</button>
                <button type="submit" className="mess-btn-primary" style={{ background:'#e8880a', boxShadow:'0 2px 12px rgba(232,136,10,0.35)' }}>
                  Confirm Skip
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
