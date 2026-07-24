import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Bell, BedDouble, Building2, CalendarDays, ChevronDown, ChevronRight,
  IndianRupee, FileText, HelpCircle, LayoutDashboard, LogOut, Menu,
  MoreHorizontal, Plus, Search, Settings, ShieldCheck, Users, WalletCards, X,
  Sun, Moon, Monitor, Wrench
} from 'lucide-react';
import { money } from '../utils/formatters.js';
import { fallback } from '../constants/fallbackData.js';
import Metric from '../components/Metric.jsx';
import RoomsPage from './RoomsPage.jsx';
import MembersPage from './MembersPage.jsx';
import PropertySetup from './PropertySetup.jsx';
import ThemeToggle from '../components/ThemeToggle.jsx';
import ResidentsPage from './ResidentsPage.jsx';
import PaymentsPage from './PaymentsPage.jsx';
import ExpensesPage from './ExpensesPage.jsx';
import ReportsPage from './ReportsPage.jsx';
import MaintenancePage from './MaintenancePage.jsx';
import SettingsPage from './SettingsPage.jsx';
import NotificationCenter from '../components/NotificationCenter.jsx';

const nav = [
  ['Overview', LayoutDashboard], ['My PG', Building2], ['Members', Users], ['Residents', Users], ['Rooms & beds', BedDouble],
  ['Payments', WalletCards], ['Expenses', IndianRupee], ['Maintenance', Wrench], ['Reports', FileText]
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
  const [toast, setToast] = useState('');
  const [modal, setModal] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentStatusText, setPaymentStatusText] = useState('');

  const handlePayOnline = (paymentId, amount, label) => {
    import('../utils/razorpay.js').then(({ processOnlinePayment }) => {
      processOnlinePayment({
        paymentId,
        session,
        amountLabel: `${label} (₹${amount})`,
        pgName: data.property || "StayZen Residency",
        onSuccess: (msg) => {
          notify(msg);
          refreshDashboardData();
        },
        onFailure: (msg) => {
          notify(`Payment failed: ${msg}`);
        },
        onProgress: (loading, text) => {
          setPaymentLoading(loading);
          setPaymentStatusText(text);
        }
      });
    });
  };

  const [coords, setCoords] = useState({ top: 0, height: 0 });
  const [ready, setReady] = useState(false);
  const navContainerRef = useRef(null);
  const activeBtnRef = useRef(null);



  useEffect(() => {
    const updateCoords = () => {
      if (activeBtnRef.current && navContainerRef.current) {
        const containerRect = navContainerRef.current.getBoundingClientRect();
        const btnRect = activeBtnRef.current.getBoundingClientRect();
        setCoords({
          top: btnRect.top - containerRect.top,
          height: btnRect.height
        });
        if (!ready) {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              setReady(true);
            });
          });
        }
      } else {
        setCoords({ top: 0, height: 0 });
      }
    };

    updateCoords();

    let observer;
    if (navContainerRef.current) {
      observer = new ResizeObserver(updateCoords);
      observer.observe(navContainerRef.current);
    }

    const timer = setTimeout(updateCoords, 100);

    return () => {
      if (observer) observer.disconnect();
      clearTimeout(timer);
    };
  }, [active, ready]);

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
      <div style={{ display: 'grid', placeItems: 'center', height: '100vh', background: 'var(--app-bg)', color: 'var(--text-primary)', fontFamily: 'Manrope, Arial, sans-serif' }}>
        <div style={{ textAlign: 'center' }}>
          <Building2 size={48} style={{ color: 'var(--green)', marginBottom: '16px' }} />
          <h2 style={{ fontSize: '18px', fontWeight: '700' }}>Loading StayZen...</h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '6px' }}>Fetching your workspace details</p>
        </div>
      </div>
    );
  }

  const pendingInvoice = data.payments?.find(p => p.rawStatus === 'due' || p.rawStatus === 'pending' || p.rawStatus === 'partially_paid');

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

        <nav ref={navContainerRef}>
          <div
            className="nav-indicator"
            style={{
              transform: `translateY(${coords.top}px)`,
              height: `${coords.height}px`,
              opacity: coords.height ? 1 : 0,
              transition: ready
                ? 'transform 0.38s cubic-bezier(0.25, 1, 0.5, 1), height 0.38s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.2s'
                : 'none'
            }}
          />
          {visibleNav.map(([label, Icon]) => (
            <button
              key={label}
              ref={active === label ? activeBtnRef : null}
              className={active === label ? 'active' : ''}
              onClick={() => {
                setActive(label);
                setMenuOpen(false);
              }}
            >
              <Icon size={19} />
              {label}
              {label === 'Payments' && (data.role === 'resident' ? (data.stats.pending > 0 ? <i>1</i> : null) : <i>11</i>)}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          {data.role !== 'resident' && (
            <button
              type="button"
              className={active === 'Settings' ? 'active' : ''}
              onClick={() => { setActive('Settings'); setMenuOpen(false); }}
              style={{
                background: active === 'Settings' ? 'var(--sidebar-active-bg)' : 'transparent',
                color: active === 'Settings' ? 'var(--green)' : 'var(--text-secondary)'
              }}
            >
              <Settings size={19} />Settings
            </button>
          )}
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
          <NotificationCenter session={session} />

          <ThemeToggle />

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
          ) : active === 'Residents' ? (
            <ResidentsPage
              session={session}
              properties={properties}
              members={members}
              onRefresh={refreshDashboardData}
            />
          ) : active === 'Payments' ? (
            <PaymentsPage
              session={session}
              properties={properties}
              members={members}
              userRole={data.role}
              onRefresh={refreshDashboardData}
            />
          ) : active === 'Expenses' ? (
            <ExpensesPage
              session={session}
              properties={properties}
              onRefresh={refreshDashboardData}
            />
          ) : active === 'Maintenance' ? (
            <MaintenancePage
              session={session}
              properties={properties}
              members={members}
              onRefresh={refreshDashboardData}
            />
          ) : active === 'Reports' ? (
            <ReportsPage
              session={session}
              properties={properties}
              onRefresh={refreshDashboardData}
            />
          ) : active === 'Settings' ? (
            <SettingsPage
              session={session}
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
                <>
                  <div className="metrics">
                    <Metric icon={<Users />} label="Total residents" value={activeProperty ? activeProperty.rooms.reduce((acc, r) => acc + r.beds.filter(b => b.status === 'occupied').length, 0) : data.stats.residents} note="Dynamic live count" positive />
                    <Metric icon={<BedDouble />} label="Occupancy" value={`${occupancy}%`} note={`${vacantBeds} beds available`} />
                    <Metric icon={<IndianRupee />} label="Rent collected" value={money(data.stats.collected)} note={`${collectionPercent}% of this month`} positive />
                    <Metric icon={<CalendarDays />} label="Pending dues" value={money(data.stats.pending)} note="11 residents overdue" danger />
                  </div>

                  {data.maintenanceStats && (
                    <div className="maintenance-stats-grid">
                      <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '10px', padding: '12px' }}>
                        <span style={{ fontSize: '10px', color: 'var(--text-secondary)', display: 'block', textTransform: 'uppercase', fontWeight: '800' }}>Upcoming Maint.</span>
                        <strong style={{ fontSize: '15px', display: 'block', marginTop: '4px', fontWeight: '800' }}>{money(data.maintenanceStats.upcomingMaintenanceCharges)}</strong>
                      </div>
                      <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '10px', padding: '12px' }}>
                        <span style={{ fontSize: '10px', color: 'var(--text-secondary)', display: 'block', textTransform: 'uppercase', fontWeight: '800' }}>Today's Coll.</span>
                        <strong style={{ fontSize: '15px', display: 'block', marginTop: '4px', color: 'var(--green)', fontWeight: '800' }}>{money(data.maintenanceStats.todaysMaintenanceCollections)}</strong>
                      </div>
                      <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '10px', padding: '12px' }}>
                        <span style={{ fontSize: '10px', color: 'var(--text-secondary)', display: 'block', textTransform: 'uppercase', fontWeight: '800' }}>Pending Maint.</span>
                        <strong style={{ fontSize: '15px', display: 'block', marginTop: '4px', color: 'var(--color-danger)', fontWeight: '800' }}>{money(data.maintenanceStats.pendingMaintenancePayments)}</strong>
                      </div>
                      <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '10px', padding: '12px' }}>
                        <span style={{ fontSize: '10px', color: 'var(--text-secondary)', display: 'block', textTransform: 'uppercase', fontWeight: '800' }}>Next Due Date</span>
                        <strong style={{ fontSize: '15px', display: 'block', marginTop: '4px', color: 'var(--color-warning)', fontWeight: '800' }}>
                          {data.maintenanceStats.nextMaintenanceDueDate ? new Date(data.maintenanceStats.nextMaintenanceDueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'N/A'}
                        </strong>
                      </div>
                      <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '10px', padding: '12px' }}>
                        <span style={{ fontSize: '10px', color: 'var(--text-secondary)', display: 'block', textTransform: 'uppercase', fontWeight: '800' }}>Total Revenue</span>
                        <strong style={{ fontSize: '15px', display: 'block', marginTop: '4px', color: 'var(--green)', fontWeight: '800' }}>{money(data.maintenanceStats.totalMaintenanceRevenue)}</strong>
                      </div>
                    </div>
                  )}
                </>
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
                    {pendingInvoice && (
                      <div style={{ padding: '0 28px 24px 28px', marginTop: '-10px' }}>
                        <button
                          type="button"
                          className="primary"
                          onClick={() => handlePayOnline(pendingInvoice._id, pendingInvoice.amount, pendingInvoice.date)}
                          style={{
                            width: '100%',
                            padding: '12px',
                            backgroundColor: 'var(--green)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '8px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            gap: '8px',
                            transition: 'opacity 0.2s'
                          }}
                          onMouseOver={e => e.currentTarget.style.opacity = '0.9'}
                          onMouseOut={e => e.currentTarget.style.opacity = '1'}
                        >
                          Pay Rent Online ({money(data.stats.pending)})
                        </button>
                      </div>
                    )}
                  </section>
                  <section className="card attention">
                    <div className="card-head">
                      <div>
                        <h2>PG Guidelines</h2>
                        <p>General rules & support</p>
                      </div>
                    </div>
                    <div style={{ padding: '20px', fontSize: '13px', lineHeight: '1.6', color: 'var(--text-secondary)' }}>
                      <p style={{ margin: '0 0 10px' }}>🏡 <b>Support & Assistance:</b> If you face any issues or want to raise a maintenance query, please contact the manager.</p>
                      <p style={{ margin: '0 0 10px' }}>⚡ <b>Electricity Bills:</b> Meter reading is taken on the 1st of every month and bills are updated by the 5th.</p>
                      <p style={{ margin: '0' }}>⏰ <b>Gate Timings:</b> Main gate is closed from 11:00 PM to 6:00 AM daily.</p>
                    </div>
                  </section>

                  {((data.upiId) || (data.bankDetails && data.bankDetails.accountNumber)) && (
                    <section className="card">
                      <div className="card-head">
                        <div>
                          <h2>Settlement Details</h2>
                          <p>Direct payment accounts</p>
                        </div>
                      </div>
                      <div style={{ padding: '20px', fontSize: '13px', lineHeight: '1.6', color: 'var(--text-secondary)' }}>
                        {data.upiId && (
                          <div style={{ marginBottom: '14px' }}>
                            <span style={{ display: 'block', fontWeight: 'bold', color: 'var(--text-primary)', fontSize: '11px', textTransform: 'uppercase', marginBottom: '2px' }}>UPI ID</span>
                            <code style={{ background: 'var(--table-head-bg)', padding: '4px 8px', borderRadius: '4px', display: 'inline-block', fontFamily: 'monospace', color: 'var(--text-primary)' }}>{data.upiId}</code>
                          </div>
                        )}
                        {data.bankDetails && data.bankDetails.accountNumber && (
                          <div>
                            <span style={{ display: 'block', fontWeight: 'bold', color: 'var(--text-primary)', fontSize: '11px', textTransform: 'uppercase', marginBottom: '4px' }}>Bank Transfer</span>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', background: 'var(--card-bg)', border: '1px solid var(--border)', padding: '10px', borderRadius: '6px' }}>
                              <div><strong>A/C Name:</strong> {data.bankDetails.accountName}</div>
                              <div><strong>A/C Number:</strong> {data.bankDetails.accountNumber}</div>
                              <div><strong>Bank:</strong> {data.bankDetails.bankName}</div>
                              <div><strong>IFSC:</strong> {data.bankDetails.ifscCode}</div>
                            </div>
                          </div>
                        )}
                      </div>
                    </section>
                  )}
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
                      {data.role === 'resident' && p.rawStatus !== 'paid' ? (
                        <button
                          type="button"
                          className="primary"
                          onClick={() => handlePayOnline(p._id, p.amount, p.date)}
                          style={{
                            padding: '6px 12px',
                            fontSize: '12px',
                            backgroundColor: 'var(--green)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '6px',
                            fontWeight: '600',
                            cursor: 'pointer'
                          }}
                        >
                          Pay Online
                        </button>
                      ) : (
                        <button className="more"><MoreHorizontal size={18} /></button>
                      )}
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
      {paymentLoading && (
        <div className="toast" style={{ backgroundColor: '#e0efe3', color: '#17644f', border: '1px solid #c2ffd4' }}>
          🔄 {paymentStatusText || 'Processing payment...'}
        </div>
      )}
    </div>
  );
}
export default Dashboard;
