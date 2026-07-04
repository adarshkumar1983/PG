import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Bell, BedDouble, Building2, CalendarDays, ChevronDown, ChevronRight,
  IndianRupee, FileText, HelpCircle, LayoutDashboard, LogOut, Menu,
  MoreHorizontal, Plus, Search, Settings, ShieldCheck, Users, WalletCards, X 
} from 'lucide-react';
import { money } from '../utils/formatters.js';
import { fallback } from '../constants/fallbackData.js';
import Metric from '../components/Metric.jsx';
import RoomsPage from './RoomsPage.jsx';
import MembersPage from './MembersPage.jsx';
import PropertySetup from './PropertySetup.jsx';

const nav = [
  ['Overview', LayoutDashboard], ['My PG', Building2], ['Members', Users], ['Residents', Users], ['Rooms & beds', BedDouble],
  ['Payments', WalletCards], ['Expenses', IndianRupee], ['Reports', FileText]
];

const emptyData = {
  property: 'My PG',
  owner: 'Owner',
  month: new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
  stats: { residents: 0, rooms: 0, occupiedBeds: 0, totalBeds: 0, collected: 0, pending: 0 },
  attention: [],
  payments: [],
  role: 'owner'
};

export function Dashboard({ session, onLogout }) {
  console.log('CURRENT SESSION:', session);
  const [data, setData] = useState(emptyData);
  const [loading, setLoading] = useState(true);
  const [properties, setProperties] = useState([]);
  const [members, setMembers] = useState([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState('');
  const [active, setActive] = useState('Overview');
  const [menuOpen, setMenuOpen] = useState(false);
  const [modal, setModal] = useState(false);
  const [toast, setToast] = useState('');

  const refreshDashboardData = useCallback(() => {
    const fetchDashboard = fetch('/api/tenant/dashboard', {
      headers: { Authorization: `Bearer ${session.accessToken}`, 'x-organization-id': session.organizationId }
    })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(result => {
        if (result.stats) setData(result);
      });
    
    const fetchProperties = fetch('/api/tenant/properties', {
      headers: { Authorization: `Bearer ${session.accessToken}`, 'x-organization-id': session.organizationId }
    })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(result => {
        setProperties(result);
        if (result.length > 0 && !selectedPropertyId) {
          setSelectedPropertyId(result[0]._id);
        }
      });

    const fetchMembers = fetch('/api/tenant/members', {
      headers: { Authorization: `Bearer ${session.accessToken}`, 'x-organization-id': session.organizationId }
    })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(result => {
        setMembers(result);
      });

    Promise.allSettled([fetchDashboard, fetchProperties, fetchMembers])
      .finally(() => {
        setLoading(false);
      });
  }, [session, selectedPropertyId]);

  useEffect(() => {
    refreshDashboardData();
  }, [session]);


  const activeProperty = useMemo(() => properties.find(p => p._id === selectedPropertyId), [properties, selectedPropertyId]);

  const totalBeds = useMemo(() => {
    if (!activeProperty) return data.stats.totalBeds;
    return activeProperty.rooms.reduce((acc, r) => acc + r.beds.length, 0);
  }, [activeProperty, data.stats.totalBeds]);

  const occupiedBeds = useMemo(() => {
    if (!activeProperty) return data.stats.occupiedBeds;
    return activeProperty.rooms.reduce((acc, r) => acc + r.beds.filter(b => b.status === 'occupied').length, 0);
  }, [activeProperty, data.stats.occupiedBeds]);

  const vacantBeds = useMemo(() => totalBeds - occupiedBeds, [totalBeds, occupiedBeds]);
  const occupancy = useMemo(() => totalBeds > 0 ? Math.round(occupiedBeds / totalBeds * 100) : 0, [totalBeds, occupiedBeds]);
  const collectionPercent = useMemo(() => {
    const totalExpected = data.stats.collected + data.stats.pending;
    if (totalExpected === 0) return 0;
    return Math.round((data.stats.collected / totalExpected) * 100);
  }, [data.stats.collected, data.stats.pending]);

  const notify = message => {
    setToast(message);
    setTimeout(() => setToast(''), 2600);
  };

  const visibleNav = useMemo(() => {
    if (data.role === 'resident') {
      return nav.filter(([label]) => ['Overview', 'Payments'].includes(label));
    }
    return nav;
  }, [data.role]);

  if (loading) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', height: '100vh', background: '#f4f6f3', color: '#1b2724', fontFamily: 'Manrope, Arial, sans-serif' }}>
        <div style={{ textAlign: 'center' }}>
          <Building2 size={48} style={{ color: '#0b4438', marginBottom: '16px' }} />
          <h2 style={{ fontSize: '18px', fontWeight: '700' }}>Loading StayZen...</h2>
          <p style={{ fontSize: '13px', color: '#85908c', marginTop: '6px' }}>Fetching your workspace details</p>
        </div>
      </div>
    );
  }

  return (

    <div className="app-shell">
      <aside className={menuOpen ? 'sidebar open' : 'sidebar'}>
        <div className="brand">
          <span className="brand-mark"><Building2 size={20} /></span>
          <span>StayZen</span>
          <button className="mobile-close" onClick={() => setMenuOpen(false)}><X /></button>
        </div>
        
        <div className="property-switch" style={{ position: 'relative' }}>
          <span className="property-icon"><Building2 size={18} /></span>
          <span style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <b>{activeProperty ? activeProperty.name : data.property}</b>
            {data.role !== 'resident' && <small>Switch property</small>}
          </span>
          {data.role !== 'resident' && (
            <>
              <ChevronDown size={16} style={{ position: 'absolute', right: 12, pointerEvents: 'none' }} />
              <select 
                value={selectedPropertyId} 
                onChange={e => setSelectedPropertyId(e.target.value)}
                style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%' }}
              >
                {properties.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                {properties.length === 0 && <option value="">No properties</option>}
              </select>
            </>
          )}
        </div>

        <nav>
          {visibleNav.map(([label, Icon]) => (
            <button 
              key={label} 
              className={active === label ? 'active' : ''} 
              onClick={() => {
                setActive(label);
                setMenuOpen(false);
                if (!['Overview', 'My PG', 'Members', 'Rooms & beds'].includes(label)) {
                  notify(`${label} module is next in the MVP`);
                }
              }}
            >
              <Icon size={19} />
              {label}
              {label === 'Payments' && (data.role === 'resident' ? (data.stats.pending > 0 ? <i>1</i> : null) : <i>11</i>)}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <button><Settings size={19} />Settings</button>
          <button><HelpCircle size={19} />Help & support</button>
          <div className="account" title={session.user?.email || 'No email set'}>
            <span className="avatar small">{session.user?.name ? session.user.name.split(' ').map(x => x[0]).slice(0, 2).join('').toUpperCase() : 'AK'}</span>
            <span>
              <b>{session.user?.name || 'Adarsh Kumar'}</b>
              <small>{data.role ? data.role.charAt(0).toUpperCase() + data.role.slice(1) : (session.user?.role || 'Owner')}</small>
            </span>
            <button 
              type="button" 
              className="logout-btn" 
              onClick={onLogout} 
              title="Sign out"
              style={{ 
                marginLeft: 'auto', 
                border: 0, 
                background: 'transparent', 
                padding: '6px', 
                borderRadius: '6px', 
                display: 'grid', 
                placeItems: 'center', 
                color: '#bc503d',
                cursor: 'pointer',
                transition: 'background 0.2s, color 0.2s'
              }}
              onMouseOver={e => {
                e.currentTarget.style.background = '#fae8e4';
                e.currentTarget.style.color = '#a94130';
              }}
              onMouseOut={e => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = '#bc503d';
              }}
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      <main>
        <header>
          <button className="menu-button" onClick={() => setMenuOpen(true)}><Menu /></button>
          <div className="search">
            <Search size={18} />
            <input placeholder="Search residents, rooms, payments..." />
            <kbd>⌘ K</kbd>
          </div>
          <button className="icon-button"><Bell size={20} /><em /></button>
          <div className="header-avatar" title={session.user?.email || 'No email set'}>
            {session.user?.name ? session.user.name.split(' ').map(x => x[0]).slice(0, 2).join('').toUpperCase() : 'AK'}
          </div>
        </header>

        <section className="content">
          {active === 'My PG' ? (
            <PropertySetup 
              session={session} 
              onDone={(newProp) => {
                setProperties(prev => [...prev, newProp]);
                setSelectedPropertyId(newProp._id);
                setActive('Rooms & beds');
                notify('PG details saved—now manage your rooms');
              }}
            />
          ) : active === 'Members' ? (
            <MembersPage 
              session={session} 
              properties={properties} 
              onRefresh={refreshDashboardData} 
            />
          ) : active === 'Rooms & beds' ? (
            <RoomsPage 
              session={session} 
              property={activeProperty} 
              members={members} 
              onUpdate={(updated) => {
                setProperties(prev => prev.map(p => p._id === updated._id ? updated : p));
              }}
            />
          ) : (
            <>
              <div className="welcome">
                <div>
                  <p className="eyebrow">{data.month}</p>
                  <h1>Good morning, {data.owner} <span>👋</span></h1>
                  <p>{data.role === 'resident' ? 'Here is your PG and payment overview today.' : 'Here’s what’s happening across your property today.'}</p>
                </div>
                {data.role !== 'resident' && <button className="primary" onClick={() => setModal(true)}><Plus size={18} /> Add resident</button>}
              </div>

              {data.role === 'resident' ? (
                <div className="metrics">
                  <Metric icon={<Building2 />} label="My PG Property" value={data.residentDetails?.propertyName || 'Assigned PG'} note={data.residentDetails?.address || 'Property Address'} />
                  <Metric icon={<BedDouble />} label="Room & Bed" value={data.residentDetails?.roomNumber ? `Room ${data.residentDetails.roomNumber} · ${data.residentDetails.bedLabel}` : 'Not Assigned'} note={data.residentDetails?.checkInDate ? `Check-in: ${new Date(data.residentDetails.checkInDate).toLocaleDateString('en-IN')}` : 'N/A'} />
                  <Metric icon={<IndianRupee />} label="Monthly Rent" value={money(data.residentDetails?.rentAmount || 0)} note="Base rent" positive />
                  <Metric icon={<CalendarDays />} label="Pending Dues" value={money(data.stats.pending)} note={data.stats.pending > 0 ? "Please pay soon" : "All dues cleared"} danger={data.stats.pending > 0} positive={data.stats.pending === 0} />
                </div>
              ) : (
                <div className="metrics">
                  <Metric icon={<Users />} label="Total residents" value={activeProperty ? activeProperty.rooms.reduce((acc, r) => acc + r.beds.filter(b => b.status === 'occupied').length, 0) : data.stats.residents} note="Dynamic live count" positive />
                  <Metric icon={<BedDouble />} label="Occupancy" value={`${occupancy}%`} note={`${vacantBeds} beds available`} />
                  <Metric icon={<IndianRupee />} label="Rent collected" value={money(data.stats.collected)} note={`${collectionPercent}% of this month`} positive />
                  <Metric icon={<CalendarDays />} label="Pending dues" value={money(data.stats.pending)} note="11 residents overdue" danger />
                </div>
              )}

              {data.role === 'resident' ? (
                <div className="dashboard-grid">
                  <section className="card rent-card">
                    <div className="card-head">
                      <div>
                        <h2>My Rent Status</h2>
                        <p>Payment summary for this month</p>
                      </div>
                    </div>
                    <div className="rent-body">
                      <div className="ring" style={{ '--percent': data.stats.pending > 0 ? '0%' : '100%' }}>
                        <div><strong>{data.stats.pending > 0 ? '0%' : '100%'}</strong><small>paid</small></div>
                      </div>
                      <div className="rent-numbers">
                        <span><i className="green-dot" /><small>Paid</small><b>{money(data.stats.collected)}</b></span>
                        <span><i className="orange-dot" /><small>Pending</small><b>{money(data.stats.pending)}</b></span>
                        <hr />
                        <span className="total"><small>Total Rent Due</small><b>{money(data.stats.collected + data.stats.pending)}</b></span>
                      </div>
                    </div>
                  </section>
                  <section className="card attention">
                    <div className="card-head">
                      <div>
                        <h2>PG Guidelines</h2>
                        <p>General rules & support</p>
                      </div>
                    </div>
                    <div style={{ padding: '20px', fontSize: '13px', lineHeight: '1.6', color: '#53605c' }}>
                      <p style={{ margin: '0 0 10px' }}>🏡 <b>Support & Assistance:</b> If you face any issues or want to raise a maintenance query, please contact the manager.</p>
                      <p style={{ margin: '0 0 10px' }}>⚡ <b>Electricity Bills:</b> Meter reading is taken on the 1st of every month and bills are updated by the 5th.</p>
                      <p style={{ margin: '0' }}>⏰ <b>Gate Timings:</b> Main gate is closed from 11:00 PM to 6:00 AM daily.</p>
                    </div>
                  </section>
                </div>
              ) : (
                <div className="dashboard-grid">
                  <section className="card rent-card">
                    <div className="card-head">
                      <div>
                        <h2>Rent collection</h2>
                        <p>{data.month} performance</p>
                      </div>
                      <button className="ghost">This month <ChevronDown size={15} /></button>
                    </div>
                    <div className="rent-body">
                      <div className="ring" style={{ '--percent': `${collectionPercent}%` }}>
                        <div><strong>{collectionPercent}%</strong><small>collected</small></div>
                      </div>
                      <div className="rent-numbers">
                        <span><i className="green-dot" /><small>Collected</small><b>{money(data.stats.collected)}</b></span>
                        <span><i className="orange-dot" /><small>Pending</small><b>{money(data.stats.pending)}</b></span>
                        <hr />
                        <span className="total"><small>Expected this month</small><b>{money(data.stats.collected + data.stats.pending)}</b></span>
                      </div>
                    </div>
                  </section>
                  <section className="card attention">
                    <div className="card-head">
                      <div>
                        <h2>Needs attention</h2>
                        <p>Items that require your action</p>
                      </div>
                      <button className="text-button">View all <ChevronRight size={16} /></button>
                    </div>
                    <div>
                      {data.attention.map(item => (
                        <button className="attention-row" key={item.id} onClick={() => notify(item.action)}>
                          <span className={`alert-icon ${item.type}`}>{item.icon}</span>
                          <span><b>{item.title}</b><small>{item.meta}</small></span>
                          <ChevronRight size={18} />
                        </button>
                      ))}
                    </div>
                  </section>
                </div>
              )}

              <section className="card recent">
                <div className="card-head">
                  <div>
                    <h2>{data.role === 'resident' ? 'My Recent Payments' : 'Recent payments'}</h2>
                    <p>{data.role === 'resident' ? 'Your rent transaction history' : 'Latest rent activity from residents'}</p>
                  </div>
                  {data.role !== 'resident' && <button className="text-button">View all payments <ChevronRight size={16} /></button>}
                </div>
                <div className="table">
                  <div className="tr table-head">
                    <span>{data.role === 'resident' ? 'Recipient' : 'Resident'}</span>
                    <span>Amount</span>
                    <span>Status</span>
                    <span>Date</span>
                    <span />
                  </div>
                  {data.payments.map(p => (
                    <div className="tr" key={p.name}>
                      <span className="resident">
                        <i style={{ background: p.color }}>{p.initials}</i>
                        <span>
                          <b>{data.role === 'resident' ? data.property : p.name}</b>
                          <small>{p.room}</small>
                        </span>
                      </span>
                      <strong>{money(p.amount)}</strong>
                      <span><i className={`pill ${p.status.toLowerCase().replace(' ', '-')}`}>{p.status}</i></span>
                      <span className="date">{p.date}</span>
                      <button className="more"><MoreHorizontal size={18} /></button>
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}
        </section>
      </main>

      {modal && (
        <div className="modal-backdrop" onMouseDown={() => setModal(false)}>
          <form className="modal" onMouseDown={e => e.stopPropagation()} onSubmit={e => { e.preventDefault(); setModal(false); notify('Resident draft created'); }}>
            <button type="button" className="modal-x" onClick={() => setModal(false)}><X /></button>
            <span className="modal-icon"><Users /></span>
            <h2>Add a new resident</h2>
            <p>Create the resident profile first. Room and rent details can be added next.</p>
            <label>Full name
              <input required placeholder="e.g. Aman Gupta" autoFocus />
            </label>
            <label>Mobile number
              <input required placeholder="+91 98765 43210" />
            </label>
            <div className="form-row">
              <label>Check-in date
                <input type="date" required />
              </label>
              <label>Property
                <select><option>{data.property}</option></select>
              </label>
            </div>
            <div className="modal-actions">
              <button type="button" className="secondary" onClick={() => setModal(false)}>Cancel</button>
              <button className="primary">Create resident</button>
            </div>
          </form>
        </div>
      )}
      {toast && <div className="toast">✓ {toast}</div>}
    </div>
  );
}
export default Dashboard;
