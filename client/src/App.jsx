import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  Bell, BedDouble, Building2, CalendarDays, ChevronDown, ChevronRight,
  IndianRupee, FileText, HelpCircle, LayoutDashboard, LogIn, Mail, Menu,
  MoreHorizontal, Plus, Search, Settings, ShieldCheck, TrendingUp, Users, WalletCards, X
} from 'lucide-react';

// Automatically handle expired tokens or secret key changes by resetting the session on 401
const originalFetch = window.fetch;
window.fetch = async (...args) => {
  const response = await originalFetch(...args);
  if (response.status === 401 && typeof args[0] === 'string' && !args[0].includes('/api/auth/login')) {
    localStorage.removeItem('stayzen-session');
    window.location.reload();
  }
  return response;
};

const fallback = {
  property: 'Greenview Residency', owner: 'Adarsh', month: 'June 2026',
  stats: { residents: 84, rooms: 38, occupiedBeds: 84, totalBeds: 102, collected: 462500, pending: 87500 },
  attention: [
    { id: 1, type: 'danger', icon: '₹', title: '11 rent payments overdue', meta: '₹68,500 outstanding', action: 'Review dues' },
    { id: 2, type: 'warn', icon: '⌛', title: '4 agreements expiring', meta: 'Within the next 30 days', action: 'View residents' },
    { id: 3, type: 'info', icon: '▦', title: '18 beds are available', meta: 'Across 9 rooms', action: 'View inventory' }
  ],
  payments: [
    { name: 'Arjun Mehta', room: 'A-204 · Bed 2', amount: 8500, status: 'Overdue', date: 'Due 5 Jun', initials: 'AM', color: '#efb36f' },
    { name: 'Nikhil Sharma', room: 'B-102 · Bed 1', amount: 7500, status: 'Due soon', date: 'Due 28 Jun', initials: 'NS', color: '#7ab4aa' },
    { name: 'Rahul Verma', room: 'A-103 · Bed 3', amount: 8000, status: 'Paid', date: 'Paid 3 Jun', initials: 'RV', color: '#8ca4d8' },
    { name: 'Kabir Khan', room: 'C-301 · Bed 1', amount: 9000, status: 'Paid', date: 'Paid 2 Jun', initials: 'KK', color: '#c196d2' }
  ]
};

const nav = [
  ['Overview', LayoutDashboard], ['My PG', Building2], ['Members', Users], ['Residents', Users], ['Rooms & beds', BedDouble],
  ['Payments', WalletCards], ['Expenses', IndianRupee], ['Reports', FileText]
];
const money = n => `₹${new Intl.NumberFormat('en-IN').format(n)}`;

function App() {
  const [session, setSession] = useState(() => {
    try { return JSON.parse(localStorage.getItem('stayzen-session')); } catch { return null; }
  });
  const [view, setView] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has('token')) return 'accept-invite';
    return 'login';
  });
  const handleLogin = value => { localStorage.setItem('stayzen-session', JSON.stringify(value)); setSession(value); };
  const handleLogout = () => { localStorage.removeItem('stayzen-session'); setSession(null); setView('login'); };
  if (session) {
    return <Dashboard session={session} onLogout={handleLogout}/>;
  }
  return view === 'login' 
    ? <Login onLogin={handleLogin} onSwitchView={() => setView('register')} /> 
    : view === 'register'
    ? <Register onSwitchView={() => setView('login')} />
    : <AcceptInvite onSwitchView={() => setView('login')} />;
}

function Login({onLogin, onSwitchView}) {
  const [email, setEmail] = useState('owner@stayzen.demo');
  const [password, setPassword] = useState('demo1234');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const submit = async e => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const response = await fetch('/api/auth/login', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({email,password}) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Unable to sign in.');
      onLogin({ ...result, organizationId: result.organizations?.[0]?.id || 'demo-org' });
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };
  return <main className="auth-page"><section className="auth-story"><div className="auth-brand"><span className="brand-mark"><Building2 size={20}/></span>StayZen</div><div><span className="trust-pill"><ShieldCheck size={15}/> Secure multi-tenant workspace</span><h1>Run every property<br/>from one calm place.</h1><p>Residents, rooms, rent, expenses and staff access—organized for growing PG businesses.</p><div className="auth-proof"><span><b>100%</b><small>Tenant-isolated</small></span><span><b>4 roles</b><small>Permission controlled</small></span><span><b>24×7</b><small>Payment tracking</small></span></div></div><small>Built for modern PG owners in India</small></section><section className="auth-form-wrap"><form className="auth-form" onSubmit={submit}><div className="mobile-auth-brand"><span className="brand-mark"><Building2 size={20}/></span>StayZen</div><p className="eyebrow">Owner workspace</p><h2>Welcome back</h2><p>Sign in to manage your properties.</p>{error && <div className="form-error">{error}</div>}<label>Email address<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required/></label><label>Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} required/></label><div className="remember"><label><input type="checkbox" defaultChecked/> Remember me</label><button type="button">Forgot password?</button></div><button className="primary auth-submit" disabled={loading}><LogIn size={17}/>{loading ? 'Signing in…' : 'Sign in securely'}</button><div className="demo-note"><b>Demo account</b><span>owner@stayzen.demo · demo1234</span></div><p className="signup-copy">New PG owner? <button type="button" onClick={onSwitchView}>Create an account</button></p></form></section></main>;
}

function Register({onSwitchView}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async e => {
    e.preventDefault(); setError(''); setSuccess(''); setLoading(true);
    try {
      const response = await fetch('/api/auth/register', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ name, email, mobile, password, organizationName }) 
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Unable to register account.');
      setSuccess(result.message);
      setName(''); setEmail(''); setMobile(''); setPassword(''); setOrganizationName('');
    } catch (err) { 
      setError(err.message); 
    } finally { 
      setLoading(false); 
    }
  };

  return <main className="auth-page">
    <section className="auth-story">
      <div className="auth-brand"><span className="brand-mark"><Building2 size={20}/></span>StayZen</div>
      <div>
        <span className="trust-pill"><ShieldCheck size={15}/> Secure multi-tenant workspace</span>
        <h1>Run every property<br/>from one calm place.</h1>
        <p>Residents, rooms, rent, expenses and staff access—organized for growing PG businesses.</p>
        <div className="auth-proof">
          <span><b>100%</b><small>Tenant-isolated</small></span>
          <span><b>4 roles</b><small>Permission controlled</small></span>
          <span><b>24×7</b><small>Payment tracking</small></span>
        </div>
      </div>
      <small>Built for modern PG owners in India</small>
    </section>
    <section className="auth-form-wrap">
      <form className="auth-form" onSubmit={submit}>
        <div className="mobile-auth-brand"><span className="brand-mark"><Building2 size={20}/></span>StayZen</div>
        <p className="eyebrow">Owner workspace</p>
        <h2>Create an account</h2>
        <p>Register your PG business and start managing it today.</p>
        
        {error && <div className="form-error">{error}</div>}
        {success && <div className="form-error" style={{ background: '#e3f1e9', color: '#287154', borderColor: '#bdd6c9' }}>{success}</div>}
        
        <label>Full name *
          <input value={name} onChange={e=>setName(e.target.value)} required placeholder="e.g. Adarsh Kumar"/>
        </label>
        
        <div className="form-row">
          <label>Email address *
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)} required placeholder="e.g. owner@stayzen.demo"/>
          </label>
          <label>Mobile number
            <input value={mobile} onChange={e=>setMobile(e.target.value)} placeholder="e.g. +91 98765 43210"/>
          </label>
        </div>

        <label>Password *
          <input type="password" value={password} onChange={e=>setPassword(e.target.value)} required placeholder="Minimum 6 characters"/>
        </label>

        <label>PG / Property name *
          <input value={organizationName} onChange={e=>setOrganizationName(e.target.value)} required placeholder="e.g. Greenview Residency"/>
        </label>

        <button className="primary auth-submit" style={{ marginTop: '20px' }} disabled={loading}>
          {loading ? 'Creating account…' : 'Create account'}
        </button>

        <p className="signup-copy" style={{ marginTop: '20px' }}>
          Already have an account? <button type="button" onClick={onSwitchView}>Sign in instead</button>
        </p>
      </form>
    </section>
  </main>;
}

function AcceptInvite({onSwitchView}) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  
  const token = new URLSearchParams(window.location.search).get('token');

  const submit = async e => {
    e.preventDefault(); setError(''); setSuccess('');
    if (password !== confirmPassword) return setError('Passwords do not match.');
    if (password.length < 6) return setError('Password must be at least 6 characters.');
    setLoading(true);
    try {
      const response = await fetch('/api/auth/accept-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Unable to accept invitation.');
      setSuccess(result.message);
      window.history.replaceState({}, document.title, window.location.pathname);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return <main className="auth-page">
    <section className="auth-story">
      <div className="auth-brand"><span className="brand-mark"><Building2 size={20}/></span>StayZen</div>
      <div>
        <span className="trust-pill"><ShieldCheck size={15}/> Secure invitation workspace</span>
        <h1>Activate your profile</h1>
        <p>Set a secure password to join your organization's PG workspace.</p>
      </div>
      <small>Welcome to StayZen</small>
    </section>
    <section className="auth-form-wrap">
      <form className="auth-form" onSubmit={submit}>
        <div className="mobile-auth-brand"><span className="brand-mark"><Building2 size={20}/></span>StayZen</div>
        <p className="eyebrow">Onboarding</p>
        <h2>Accept Invitation</h2>
        <p>Set a password to complete your registration.</p>

        {error && <div className="form-error">{error}</div>}
        {success && <div className="form-error" style={{ background: '#e3f1e9', color: '#287154', borderColor: '#bdd6c9' }}>{success}</div>}

        {!success && <>
          <label>New Password *
            <input type="password" value={password} onChange={e=>setPassword(e.target.value)} required placeholder="Minimum 6 characters" autoFocus/>
          </label>
          <label>Confirm Password *
            <input type="password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} required placeholder="Repeat password"/>
          </label>
          <button className="primary auth-submit" style={{ marginTop: '20px' }} disabled={loading}>
            {loading ? 'Activating account…' : 'Activate Account'}
          </button>
        </>}

        <p className="signup-copy" style={{ marginTop: '20px' }}>
          <button type="button" onClick={onSwitchView}>Return to sign in</button>
        </p>
      </form>
    </section>
  </main>;
}

function Dashboard({session, onLogout}) {
  console.log('CURRENT SESSION:', session);
  const [data, setData] = useState(fallback);
  const [properties, setProperties] = useState([]);
  const [members, setMembers] = useState([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState('');
  const [active, setActive] = useState('Overview');
  const [menuOpen, setMenuOpen] = useState(false);
  const [modal, setModal] = useState(false);
  const [toast, setToast] = useState('');

  const refreshDashboardData = useCallback(() => {
    fetch('/api/tenant/dashboard', {headers:{Authorization:`Bearer ${session.accessToken}`,'x-organization-id':session.organizationId}}).then(r => r.ok ? r.json() : Promise.reject()).then(result => result.stats ? setData(result) : null).catch(() => {});
    
    fetch('/api/tenant/properties', {headers:{Authorization:`Bearer ${session.accessToken}`,'x-organization-id':session.organizationId}}).then(r => r.ok ? r.json() : Promise.reject()).then(result => {
      setProperties(result);
      if (result.length > 0 && !selectedPropertyId) {
        setSelectedPropertyId(result[0]._id);
      }
    }).catch(() => {});

    fetch('/api/tenant/members', {headers:{Authorization:`Bearer ${session.accessToken}`,'x-organization-id':session.organizationId}}).then(r => r.ok ? r.json() : Promise.reject()).then(result => {
      setMembers(result);
    }).catch(() => {});
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
  const notify = message => { setToast(message); setTimeout(() => setToast(''), 2600); };
  const visibleNav = useMemo(() => {
    if (data.role === 'resident') {
      return nav.filter(([label]) => ['Overview', 'Payments'].includes(label));
    }
    return nav;
  }, [data.role]);

  return <div className="app-shell">
    <aside className={menuOpen ? 'sidebar open' : 'sidebar'}>
      <div className="brand"><span className="brand-mark"><Building2 size={20}/></span><span>StayZen</span><button className="mobile-close" onClick={() => setMenuOpen(false)}><X/></button></div>
      <div className="property-switch" style={{position:'relative'}}>
        <span className="property-icon"><Building2 size={18}/></span>
        <span style={{flex:1, display:'flex', flexDirection:'column'}}>
          <b>{activeProperty ? activeProperty.name : data.property}</b>
          {data.role !== 'resident' && <small>Switch property</small>}
        </span>
        {data.role !== 'resident' && (
          <>
            <ChevronDown size={16} style={{position:'absolute', right:12, pointerEvents:'none'}}/>
            <select 
              value={selectedPropertyId} 
              onChange={e => setSelectedPropertyId(e.target.value)}
              style={{position:'absolute', inset:0, opacity:0, cursor:'pointer', width:'100%'}}
            >
              {properties.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
              {properties.length === 0 && <option value="">No properties</option>}
            </select>
          </>
        )}
      </div>
      <nav>{visibleNav.map(([label, Icon]) => <button key={label} className={active === label ? 'active' : ''} onClick={() => {setActive(label); setMenuOpen(false); !['Overview','My PG','Members','Rooms & beds'].includes(label) && notify(`${label} module is next in the MVP`);}}><Icon size={19}/>{label}{label === 'Payments' && (data.role === 'resident' ? (data.stats.pending > 0 ? <i>1</i> : null) : <i>11</i>)}</button>)}</nav>
      <div className="sidebar-bottom">
        <button><Settings size={19}/>Settings</button><button><HelpCircle size={19}/>Help & support</button>
        <button className="account" onClick={onLogout} title={session.user?.email || 'No email set'}><span className="avatar small">{session.user?.name ? session.user.name.split(' ').map(x => x[0]).slice(0, 2).join('').toUpperCase() : 'AK'}</span><span><b>{session.user?.name || 'Adarsh Kumar'}</b><small>{data.role ? data.role.charAt(0).toUpperCase() + data.role.slice(1) : (session.user?.role || 'Owner')} · Sign out</small></span><MoreHorizontal size={18}/></button>
      </div>
    </aside>

    <main>
      <header><button className="menu-button" onClick={() => setMenuOpen(true)}><Menu/></button><div className="search"><Search size={18}/><input placeholder="Search residents, rooms, payments..."/><kbd>⌘ K</kbd></div><button className="icon-button"><Bell size={20}/><em/></button><div className="header-avatar" title={session.user?.email || 'No email set'}>{session.user?.name ? session.user.name.split(' ').map(x => x[0]).slice(0, 2).join('').toUpperCase() : 'AK'}</div></header>
      <section className="content">
        {active === 'My PG' ? <PropertySetup session={session} onDone={(newProp) => {
          setProperties(prev => [...prev, newProp]);
          setSelectedPropertyId(newProp._id);
          setActive('Rooms & beds');
          notify('PG details saved—now manage your rooms');
        }}/> : active === 'Members' ? <MembersPage session={session} properties={properties} onRefresh={refreshDashboardData}/> : active === 'Rooms & beds' ? <RoomsPage session={session} property={activeProperty} members={members} onUpdate={(updated) => {
          setProperties(prev => prev.map(p => p._id === updated._id ? updated : p));
        }}/> : <>
        <div className="welcome"><div><p className="eyebrow">{data.month}</p><h1>Good morning, {data.owner} <span>👋</span></h1><p>{data.role === 'resident' ? 'Here is your PG and payment overview today.' : 'Here’s what’s happening across your property today.'}</p></div>{data.role !== 'resident' && <button className="primary" onClick={() => setModal(true)}><Plus size={18}/> Add resident</button>}</div>

        {data.role === 'resident' ? (
          <div className="metrics">
            <Metric icon={<Building2/>} label="My PG Property" value={data.residentDetails?.propertyName || 'Assigned PG'} note={data.residentDetails?.address || 'Property Address'} />
            <Metric icon={<BedDouble/>} label="Room & Bed" value={data.residentDetails?.roomNumber ? `Room ${data.residentDetails.roomNumber} · ${data.residentDetails.bedLabel}` : 'Not Assigned'} note={data.residentDetails?.checkInDate ? `Check-in: ${new Date(data.residentDetails.checkInDate).toLocaleDateString('en-IN')}` : 'N/A'} />
            <Metric icon={<IndianRupee/>} label="Monthly Rent" value={money(data.residentDetails?.rentAmount || 0)} note="Base rent" positive />
            <Metric icon={<CalendarDays/>} label="Pending Dues" value={money(data.stats.pending)} note={data.stats.pending > 0 ? "Please pay soon" : "All dues cleared"} danger={data.stats.pending > 0} positive={data.stats.pending === 0} />
          </div>
        ) : (
          <div className="metrics">
            <Metric icon={<Users/>} label="Total residents" value={activeProperty ? activeProperty.rooms.reduce((acc, r) => acc + r.beds.filter(b => b.status === 'occupied').length, 0) : data.stats.residents} note="Dynamic live count" positive />
            <Metric icon={<BedDouble/>} label="Occupancy" value={`${occupancy}%`} note={`${vacantBeds} beds available`} />
            <Metric icon={<IndianRupee/>} label="Rent collected" value={money(data.stats.collected)} note={`${collectionPercent}% of this month`} positive />
            <Metric icon={<CalendarDays/>} label="Pending dues" value={money(data.stats.pending)} note="11 residents overdue" danger />
          </div>
        )}

        {data.role === 'resident' ? (
          <div className="dashboard-grid">
            <section className="card rent-card"><div className="card-head"><div><h2>My Rent Status</h2><p>Payment summary for this month</p></div></div>
              <div className="rent-body">
                <div className="ring" style={{'--percent': data.stats.pending > 0 ? '0%' : '100%'}}>
                  <div><strong>{data.stats.pending > 0 ? '0%' : '100%'}</strong><small>paid</small></div>
                </div>
                <div className="rent-numbers">
                  <span><i className="green-dot"/><small>Paid</small><b>{money(data.stats.collected)}</b></span>
                  <span><i className="orange-dot"/><small>Pending</small><b>{money(data.stats.pending)}</b></span>
                  <hr/>
                  <span className="total"><small>Total Rent Due</small><b>{money(data.stats.collected + data.stats.pending)}</b></span>
                </div>
              </div>
            </section>
            <section className="card attention"><div className="card-head"><div><h2>PG Guidelines</h2><p>General rules & support</p></div></div>
              <div style={{ padding: '20px', fontSize: '13px', lineHeight: '1.6', color: '#53605c' }}>
                <p style={{ margin: '0 0 10px' }}>🏡 <b>Support & Assistance:</b> If you face any issues or want to raise a maintenance query, please contact the manager.</p>
                <p style={{ margin: '0 0 10px' }}>⚡ <b>Electricity Bills:</b> Meter reading is taken on the 1st of every month and bills are updated by the 5th.</p>
                <p style={{ margin: '0' }}>⏰ <b>Gate Timings:</b> Main gate is closed from 11:00 PM to 6:00 AM daily.</p>
              </div>
            </section>
          </div>
        ) : (
          <div className="dashboard-grid">
            <section className="card rent-card"><div className="card-head"><div><h2>Rent collection</h2><p>{data.month} performance</p></div><button className="ghost">This month <ChevronDown size={15}/></button></div>
              <div className="rent-body"><div className="ring" style={{'--percent': `${collectionPercent}%`}}><div><strong>{collectionPercent}%</strong><small>collected</small></div></div><div className="rent-numbers"><span><i className="green-dot"/><small>Collected</small><b>{money(data.stats.collected)}</b></span><span><i className="orange-dot"/><small>Pending</small><b>{money(data.stats.pending)}</b></span><hr/><span className="total"><small>Expected this month</small><b>{money(data.stats.collected + data.stats.pending)}</b></span></div></div>
            </section>
            <section className="card attention"><div className="card-head"><div><h2>Needs attention</h2><p>Items that require your action</p></div><button className="text-button">View all <ChevronRight size={16}/></button></div>
              <div>{data.attention.map(item => <button className="attention-row" key={item.id} onClick={() => notify(item.action)}><span className={`alert-icon ${item.type}`}>{item.icon}</span><span><b>{item.title}</b><small>{item.meta}</small></span><ChevronRight size={18}/></button>)}</div>
            </section>
          </div>
        )}

        <section className="card recent"><div className="card-head"><div><h2>{data.role === 'resident' ? 'My Recent Payments' : 'Recent payments'}</h2><p>{data.role === 'resident' ? 'Your rent transaction history' : 'Latest rent activity from residents'}</p></div>{data.role !== 'resident' && <button className="text-button">View all payments <ChevronRight size={16}/></button>}</div>
          <div className="table"><div className="tr table-head"><span>{data.role === 'resident' ? 'Recipient' : 'Resident'}</span><span>Amount</span><span>Status</span><span>Date</span><span/></div>{data.payments.map(p => <div className="tr" key={p.name}><span className="resident"><i style={{background:p.color}}>{p.initials}</i><span><b>{data.role === 'resident' ? data.property : p.name}</b><small>{p.room}</small></span></span><strong>{money(p.amount)}</strong><span><i className={`pill ${p.status.toLowerCase().replace(' ','-')}`}>{p.status}</i></span><span className="date">{p.date}</span><button className="more"><MoreHorizontal size={18}/></button></div>)}</div>
        </section>
        </>}
      </section>
    </main>

    {modal && <div className="modal-backdrop" onMouseDown={() => setModal(false)}><form className="modal" onMouseDown={e => e.stopPropagation()} onSubmit={e => {e.preventDefault(); setModal(false); notify('Resident draft created');}}><button type="button" className="modal-x" onClick={() => setModal(false)}><X/></button><span className="modal-icon"><Users/></span><h2>Add a new resident</h2><p>Create the resident profile first. Room and rent details can be added next.</p><label>Full name<input required placeholder="e.g. Aman Gupta" autoFocus/></label><label>Mobile number<input required placeholder="+91 98765 43210"/></label><div className="form-row"><label>Check-in date<input type="date" required/></label><label>Property<select><option>{data.property}</option></select></label></div><div className="modal-actions"><button type="button" className="secondary" onClick={() => setModal(false)}>Cancel</button><button className="primary">Create resident</button></div></form></div>}
    {toast && <div className="toast">✓ {toast}</div>}
  </div>;
}

function MembersPage({session, properties = [], onRefresh}) {
  const seed = [
    {id:'1',name:'Adarsh Kumar',email:'owner@stayzen.demo',mobile:'+91 98765 43210',role:'owner',status:'active'},
    {id:'2',name:'Rohan Singh',email:'manager@greenview.demo',mobile:'+91 99887 76655',role:'staff',status:'active'},
    {id:'3',name:'Arjun Mehta',email:'arjun@example.com',mobile:'+91 90000 11223',role:'resident',status:'invited'}
  ];
  const [members,setMembers]=useState(seed); 
  const [open,setOpen]=useState(false); 
  const [error,setError]=useState(''); 
  const [saving,setSaving]=useState(false);
  const [form,setForm]=useState({name:'',email:'',mobile:'',role:'staff',propertyId:'',roomId:'',bedId:''});
  const [inviteLink, setInviteLink] = useState('');

  const [editingMember, setEditingMember] = useState(null);
  const [editRole, setEditRole] = useState('staff');
  const [editPropertyId, setEditPropertyId] = useState('');
  const [editRoomId, setEditRoomId] = useState('');
  const [editBedId, setEditBedId] = useState('');
  const [updating, setUpdating] = useState(false);
  const [editError, setEditError] = useState('');
 
  useEffect(()=>{fetch('/api/tenant/members',{headers:{Authorization:`Bearer ${session.accessToken}`,'x-organization-id':session.organizationId}}).then(r=>r.ok?r.json():Promise.reject()).then(setMembers).catch(()=>{});},[session]);

  const handlePropertyChange = (propId) => {
    const prop = properties.find(p => p._id === propId);
    const firstRoomId = prop?.rooms?.[0]?._id || '';
    const firstRoom = prop?.rooms?.[0];
    const firstBedId = firstRoom?.beds?.find(b => b.status === 'vacant')?._id || '';
    setForm(prev => ({ ...prev, propertyId: propId, roomId: firstRoomId, bedId: firstBedId }));
  };

  const handleRoomChange = (rId) => {
    const prop = properties.find(p => p._id === form.propertyId);
    const room = prop?.rooms?.find(r => r._id === rId);
    const firstBedId = room?.beds?.find(b => b.status === 'vacant')?._id || '';
    setForm(prev => ({ ...prev, roomId: rId, bedId: firstBedId }));
  };

  const handleRoleChange = (newRole) => {
    setForm(prev => {
      const update = { ...prev, role: newRole };
      if (newRole === 'resident' && properties.length > 0 && !prev.propertyId) {
        update.propertyId = properties[0]._id;
        update.roomId = properties[0].rooms?.[0]?._id || '';
        update.bedId = properties[0].rooms?.[0]?.beds?.find(b => b.status === 'vacant')?._id || '';
      }
      return update;
    });
  };

  const openAddModal = () => {
    setOpen(true);
    const propId = properties[0]?._id || '';
    const prop = properties.find(p => p._id === propId);
    const roomId = prop?.rooms?.[0]?._id || '';
    const room = prop?.rooms?.find(r => r._id === roomId);
    const bedId = room?.beds?.find(b => b.status === 'vacant')?._id || '';

    setForm({
      name: '',
      email: '',
      mobile: '',
      role: 'staff',
      propertyId: propId,
      roomId: roomId,
      bedId: bedId
    });
  };

  const startEditing = (m) => {
    setEditingMember(m);
    setEditRole(m.role);
    
    const propId = m.propertyId || properties[0]?._id || '';
    const prop = properties.find(p => p._id === propId);
    const roomId = m.roomId || prop?.rooms?.[0]?._id || '';
    const room = prop?.rooms?.find(r => r._id === roomId);
    const bedId = m.bedId || room?.beds?.find(b => b.status === 'vacant')?._id || '';

    setEditPropertyId(propId);
    setEditRoomId(roomId);
    setEditBedId(bedId);
  };

  const handleEditPropertyChange = (propId) => {
    const prop = properties.find(p => p._id === propId);
    const firstRoomId = prop?.rooms?.[0]?._id || '';
    const firstRoom = prop?.rooms?.[0];
    const firstBedId = firstRoom?.beds?.find(b => b.status === 'vacant')?._id || '';
    setEditPropertyId(propId);
    setEditRoomId(firstRoomId);
    setEditBedId(firstBedId);
  };

  const handleEditRoomChange = (rId) => {
    const prop = properties.find(p => p._id === editPropertyId);
    const room = prop?.rooms?.find(r => r._id === rId);
    const firstBedId = room?.beds?.find(b => b.status === 'vacant')?._id || '';
    setEditRoomId(rId);
    setEditBedId(firstBedId);
  };

  const handleEditRoleChange = (newRole) => {
    setEditRole(newRole);
    if (newRole === 'resident' && !editPropertyId && properties.length > 0) {
      setEditPropertyId(properties[0]._id);
      setEditRoomId(properties[0].rooms?.[0]?._id || '');
      setEditBedId(properties[0].rooms?.[0]?.beds?.find(b => b.status === 'vacant')?._id || '');
    }
  };
  
  const submit=async e=>{
    e.preventDefault();setError('');setSaving(true);
    try{
      const response=await fetch('/api/tenant/members',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.accessToken}`,'x-organization-id':session.organizationId},body:JSON.stringify(form)});
      const result=await response.json();
      if(!response.ok)throw new Error(result.message);
      setMembers(v=>[result,...v]);
      if (onRefresh) onRefresh();
      if (result.inviteLink) {
        setInviteLink(result.inviteLink);
      } else {
        setOpen(false);
        setForm({name:'',email:'',mobile:'',role:'staff',propertyId:'',roomId:'',bedId:''});
      }
    }catch(err){
      setError(err.message||'Could not add member.');
    }finally{
      setSaving(false);
    }
  };

  const handleEditSubmit = async e => {
    e.preventDefault();
    setEditError('');
    setUpdating(true);
    try {
      const response = await fetch(`/api/tenant/members/${editingMember.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.accessToken}`,
          'x-organization-id': session.organizationId
        },
        body: JSON.stringify({ role: editRole, propertyId: editPropertyId, roomId: editRoomId, bedId: editBedId })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Unable to update member role.');
      setMembers(prev => prev.map(m => m.id === result.id ? result : m));
      if (onRefresh) onRefresh();
      setEditingMember(null);
    } catch (err) {
      setEditError(err.message || 'Could not update member role.');
    } finally {
      setUpdating(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setInviteLink('');
    setForm({name:'',email:'',mobile:'',role:'staff',propertyId:'',roomId:'',bedId:''});
    setError('');
  };

  const roleCopy={owner:'Full access to PG settings, billing and members',staff:'Manage residents, payments, occupancy and expenses',resident:'View own rent, receipts and raise complaints'};
  
  const getAllocationText = (m) => {
    if (m.role !== 'resident') return roleCopy[m.role];
    if (!m.propertyId) return 'Resident (Not allocated)';
    const prop = properties.find(p => p._id === m.propertyId);
    if (!prop) return 'Resident (Allocated)';
    const room = prop.rooms?.find(r => r._id === m.roomId);
    const bed = room?.beds?.find(b => b._id === m.bedId);
    return `Allocated: ${prop.name} · Room ${room?.number || '—'} · ${bed?.label || '—'}`;
  };

  return <div className="members-page"><div className="setup-heading"><div><p className="eyebrow">Access management</p><h1>PG members</h1><p>Add your staff and residents, then decide what each person can access.</p></div><button className="primary" onClick={openAddModal}><Plus size={17}/> Add member</button></div>
    <div className="member-stats"><article className="card"><span><Users/></span><div><b>{members.length}</b><small>Total members</small></div></article><article className="card"><span><ShieldCheck/></span><div><b>{members.filter(m=>m.role==='owner').length}</b><small>Owners and admins</small></div></article><article className="card"><span><Building2/></span><div><b>{members.filter(m=>m.role==='staff').length}</b><small>Staff members</small></div></article><article className="card"><span><Mail/></span><div><b>{members.filter(m=>m.status==='invited').length}</b><small>Pending invitations</small></div></article></div>
    <section className="card member-table-card"><div className="member-toolbar"><div className="search"><Search size={17}/><input placeholder="Search by name, email or phone"/></div><button className="ghost">All roles <ChevronDown size={15}/></button></div><div className="member-table"><div className="member-row member-head"><span>Member</span><span>Role and access</span><span>Status</span><span>Contact</span><span/></div>{members.map(m=><div className="member-row" key={m.id}><span className="member-person"><i>{m.name.split(' ').map(x=>x[0]).slice(0,2).join('')}</i><span><b>{m.name}</b><small>{m.email}</small></span></span><span className="role-cell"><b className={`role-badge ${m.role}`}>{m.role==='owner'?'Owner / Admin':m.role==='staff'?'Staff / Manager':'Resident'}</b><small>{getAllocationText(m)}</small></span><span><i className={`member-status ${m.status}`}>{m.status}</i></span><span className="contact-cell">{m.mobile||'—'}</span><button className="more" onClick={() => startEditing(m)} title="Change member role / allocation"><MoreHorizontal size={18}/></button></div>)}</div></section>
    {open&&<div className="modal-backdrop" onMouseDown={handleClose}><form className="modal member-modal" onMouseDown={e=>e.stopPropagation()} onSubmit={submit}><button type="button" className="modal-x" onClick={handleClose}><X/></button>
      {inviteLink ? (
        <div style={{ textAlign: 'center', padding: '10px 0' }}>
          <span className="modal-icon" style={{ margin: '0 auto', background: '#e3f1e9', color: '#287154' }}><ShieldCheck/></span>
          <h2 style={{ color: '#287154', margin: '15px 0 10px' }}>Invitation Created!</h2>
          <p style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: '1.5' }}>Since email notifications are not active, copy and share the invitation link below with the member to set their password and activate their account:</p>
          
          <div style={{ position: 'relative', margin: '20px 0 15px' }}>
            <input 
              readOnly 
              value={inviteLink} 
              style={{ width: '100%', paddingRight: '90px', background: '#f5f7f5', color: 'var(--muted)', height: '42px', border: '1px solid #dce3de', borderRadius: '8px', fontSize: '12px', paddingLeft: '10px' }}
            />
            <button 
              type="button" 
              className="primary" 
              onClick={() => {
                navigator.clipboard.writeText(inviteLink);
                alert('Invitation link copied to clipboard!');
              }}
              style={{ position: 'absolute', right: '4px', top: '4px', bottom: '4px', height: '34px', padding: '0 12px', fontSize: '11px', boxShadow: 'none' }}
            >
              Copy Link
            </button>
          </div>
          
          <button type="button" className="secondary" onClick={handleClose} style={{ width: '100%', marginTop: '10px' }}>
            Close Dialog
          </button>
        </div>
      ) : (
        <>
          <span className="modal-icon"><Users/></span>
          <h2>Add PG member</h2>
          <p>They’ll receive an invitation to join your PG workspace.</p>
          {error&&<div className="form-error">{error}</div>}
          <label>Full name *<input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} required placeholder="Member name"/></label>
          <div className="form-row">
            <label>Email address<input type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="name@example.com"/></label>
            <label>Mobile number *<input value={form.mobile} onChange={e=>setForm({...form,mobile:e.target.value})} required placeholder="+91 98765 43210"/></label>
          </div>
          <label>Member role<select value={form.role} onChange={e=>handleRoleChange(e.target.value)}>
            <option value="owner">Owner / Admin</option>
            <option value="staff">Staff / Manager</option>
            <option value="resident">Resident / Tenant</option>
          </select></label>
          
          {form.role === 'resident' && properties.length > 0 && (
            <div style={{ marginTop: '14px', borderTop: '1px dashed #dce3de', paddingTop: '14px' }}>
              <p className="eyebrow" style={{ marginBottom: '8px' }}>Room Allocation</p>
              <div className="form-row">
                <label>Property *
                  <select value={form.propertyId} onChange={e => handlePropertyChange(e.target.value)}>
                    {properties.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                  </select>
                </label>
                <label>Room *
                  <select value={form.roomId} onChange={e => handleRoomChange(e.target.value)}>
                    {(properties.find(p => p._id === form.propertyId)?.rooms || []).map(r => (
                      <option key={r._id} value={r._id}>Room {r.number} ({r.sharingType})</option>
                    ))}
                    {(properties.find(p => p._id === form.propertyId)?.rooms || []).length === 0 && (
                      <option value="">No rooms</option>
                    )}
                  </select>
                </label>
              </div>
              <label>Bed *
                <select value={form.bedId} onChange={e => setForm({ ...form, bedId: e.target.value })}>
                  {(properties.find(p => p._id === form.propertyId)?.rooms?.find(r => r._id === form.roomId)?.beds || [])
                    .filter(b => b.status === 'vacant')
                    .map(b => <option key={b._id} value={b._id}>{b.label} (₹{b.monthlyRent}/mo)</option>)
                  }
                  {(properties.find(p => p._id === form.propertyId)?.rooms?.find(r => r._id === form.roomId)?.beds || [])
                    .filter(b => b.status === 'vacant').length === 0 && <option value="">No vacant beds available</option>
                  }
                </select>
              </label>
            </div>
          )}

          <div className="role-explainer">
            <ShieldCheck/>
            <span>
              <b>{form.role==='owner'?'Full owner access':form.role==='staff'?'Operational access':'Personal resident access'}</b>
              <small>{roleCopy[form.role]}</small>
            </span>
          </div>
          <div className="modal-actions">
            <button type="button" className="secondary" onClick={handleClose}>Cancel</button>
            <button className="primary" disabled={saving}>{saving?'Adding…':'Add and invite member'}</button>
          </div>
        </>
      )}
    </form></div>}

    {editingMember && <div className="modal-backdrop" onMouseDown={() => setEditingMember(null)}><form className="modal member-modal" onMouseDown={e=>e.stopPropagation()} onSubmit={handleEditSubmit}><button type="button" className="modal-x" onClick={() => setEditingMember(null)}><X/></button>
      <span className="modal-icon"><Users/></span>
      <h2>Change member role / allocation</h2>
      <p>Update the access level and room allocation for <b>{editingMember.name}</b>.</p>
      {editError && <div className="form-error">{editError}</div>}
      <label>Member role<select value={editRole} onChange={e=>handleEditRoleChange(e.target.value)}>
        <option value="owner">Owner / Admin</option>
        <option value="staff">Staff / Manager</option>
        <option value="resident">Resident / Tenant</option>
      </select></label>

      {editRole === 'resident' && properties.length > 0 && (
        <div style={{ marginTop: '14px', borderTop: '1px dashed #dce3de', paddingTop: '14px' }}>
          <p className="eyebrow" style={{ marginBottom: '8px' }}>Room Allocation</p>
          <div className="form-row">
            <label>Property *
              <select value={editPropertyId} onChange={e => handleEditPropertyChange(e.target.value)}>
                {properties.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
              </select>
            </label>
            <label>Room *
              <select value={editRoomId} onChange={e => handleEditRoomChange(e.target.value)}>
                {(properties.find(p => p._id === editPropertyId)?.rooms || []).map(r => (
                  <option key={r._id} value={r._id}>Room {r.number} ({r.sharingType})</option>
                ))}
                {(properties.find(p => p._id === editPropertyId)?.rooms || []).length === 0 && (
                  <option value="">No rooms</option>
                )}
              </select>
            </label>
          </div>
          <label>Bed *
            <select value={editBedId} onChange={e => setEditBedId(e.target.value)}>
              {(properties.find(p => p._id === editPropertyId)?.rooms?.find(r => r._id === editRoomId)?.beds || [])
                .filter(b => b.status === 'vacant' || b._id === editingMember.bedId)
                .map(b => <option key={b._id} value={b._id}>{b.label} {b._id === editingMember.bedId ? '(Currently Occupied by user)' : `(₹${b.monthlyRent}/mo)`}</option>)
              }
              {(properties.find(p => p._id === editPropertyId)?.rooms?.find(r => r._id === editRoomId)?.beds || [])
                .filter(b => b.status === 'vacant' || b._id === editingMember.bedId).length === 0 && <option value="">No vacant beds available</option>
              }
            </select>
          </label>
        </div>
      )}

      <div className="role-explainer">
        <ShieldCheck/>
        <span>
          <b>{editRole==='owner'?'Full owner access':editRole==='staff'?'Operational access':'Personal resident access'}</b>
          <small>{roleCopy[editRole]}</small>
        </span>
      </div>
      <div className="modal-actions">
        <button type="button" className="secondary" onClick={() => setEditingMember(null)}>Cancel</button>
        <button className="primary" disabled={updating}>{updating ? 'Updating…' : 'Save Changes'}</button>
      </div>
    </form></div>}
  </div>;
}

function PropertySetup({session, onDone}) {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name:'', propertyType:'Mens PG', contactNumber:'', address:'', city:'', state:'Karnataka', pincode:'', gstNumber:'', floors:1, rooms:10, defaultBeds:2, defaultRent:7500, amenities:['Wi-Fi','Power backup'] });
  const amenities = ['Wi-Fi','Power backup','Meals','Laundry','Parking','CCTV','AC','Housekeeping'];
  const update = (key, value) => setForm(current => ({...current,[key]:value}));
  const toggleAmenity = name => update('amenities', form.amenities.includes(name) ? form.amenities.filter(x=>x!==name) : [...form.amenities,name]);
  const next = e => { e.preventDefault(); setError(''); if (!form.name || !form.contactNumber || !form.address || !form.city || !form.pincode) return setError('Complete all required property and address fields.'); setStep(2); };
  const submit = async e => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      const rooms = Array.from({length:Number(form.rooms)}, (_,i) => {
        const bedCount = Number(form.defaultBeds);
        const sharingType = bedCount === 1 ? 'single' : bedCount === 2 ? 'double' : bedCount === 3 ? 'triple' : 'four-sharing';
        return {
          number: String(i+1).padStart(3,'0'),
          floor: String(Math.floor(i/Math.max(1,Math.ceil(form.rooms/form.floors)))+1),
          category: form.propertyType,
          acType: 'non-ac',
          sharingType,
          beds: Array.from({length:bedCount},(_,j)=>({label:`Bed ${String.fromCharCode(65 + j)}`,monthlyRent:Number(form.defaultRent),status:'vacant'}))
        };
      });
      const response = await fetch('/api/tenant/properties',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.accessToken}`,'x-organization-id':session.organizationId},body:JSON.stringify({...form,rooms})});
      const result = await response.json(); if(!response.ok) throw new Error(result.message || 'Could not create property.'); onDone(result);
    } catch(err) { setError(err.message); } finally { setSaving(false); }
  };
  return <div className="setup-page"><div className="setup-heading"><div><p className="eyebrow">Property management</p><h1>Add a new PG</h1><p>Set up the property now. You can customize individual rooms and beds later.</p></div><span className="draft-chip">Saved as draft</span></div>
    <div className="stepper"><span className={step>=1?'done':''}><i>{step>1?'✓':'1'}</i><b>PG details</b><small>Identity and location</small></span><hr/><span className={step>=2?'done':''}><i>2</i><b>Rooms and pricing</b><small>Initial inventory</small></span><hr/><span><i>3</i><b>Invite residents</b><small>Optional, do later</small></span></div>
    <form className="setup-layout" onSubmit={step===1?next:submit}><section className="card setup-form-card">{step===1 ? <>
      <div className="section-title"><span><Building2/></span><div><h2>PG information</h2><p>Basic details residents will see on receipts and notices.</p></div></div>{error&&<div className="form-error">{error}</div>}
      <div className="field-grid"><label className="wide">PG name *<input value={form.name} onChange={e=>update('name',e.target.value)} placeholder="e.g. Sunrise Men's PG"/></label><label>Property type *<select value={form.propertyType} onChange={e=>update('propertyType',e.target.value)}><option>Mens PG</option><option>Womens PG</option><option>Co-living</option><option>Student hostel</option></select></label><label>Contact number *<input value={form.contactNumber} onChange={e=>update('contactNumber',e.target.value)} placeholder="+91 98765 43210"/></label><label className="wide">Street address *<textarea value={form.address} onChange={e=>update('address',e.target.value)} placeholder="Building, street and landmark"/></label><label>City *<input value={form.city} onChange={e=>update('city',e.target.value)} placeholder="Bengaluru"/></label><label>State *<select value={form.state} onChange={e=>update('state',e.target.value)}><option>Karnataka</option><option>Maharashtra</option><option>Delhi</option><option>Telangana</option><option>Tamil Nadu</option><option>Uttar Pradesh</option><option>Other</option></select></label><label>PIN code *<input value={form.pincode} onChange={e=>update('pincode',e.target.value)} maxLength="6" placeholder="560001"/></label><label>GST number <span>(optional)</span><input value={form.gstNumber} onChange={e=>update('gstNumber',e.target.value.toUpperCase())} placeholder="29ABCDE1234F1Z5"/></label></div>
      <div className="amenity-block"><h3>Amenities</h3><p>Select everything available at this property.</p><div>{amenities.map(item=><button type="button" key={item} className={form.amenities.includes(item)?'selected':''} onClick={()=>toggleAmenity(item)}>{form.amenities.includes(item)?'✓ ':'+ '}{item}</button>)}</div></div>
    </> : <>
      <div className="section-title"><span><BedDouble/></span><div><h2>Rooms, beds and pricing</h2><p>Create a starter inventory. Every room can be edited after setup.</p></div></div>{error&&<div className="form-error">{error}</div>}
      <div className="inventory-callout"><b>Quick setup</b><span>We’ll generate room numbers and vacant beds automatically.</span></div><div className="field-grid"><label>Number of floors<input type="number" min="1" max="30" value={form.floors} onChange={e=>update('floors',e.target.value)}/></label><label>Total rooms<input type="number" min="1" max="500" value={form.rooms} onChange={e=>update('rooms',e.target.value)}/></label><label>Beds per room<input type="number" min="1" max="10" value={form.defaultBeds} onChange={e=>update('defaultBeds',e.target.value)}/></label><label>Default monthly rent (₹)<input type="number" min="0" value={form.defaultRent} onChange={e=>update('defaultRent',e.target.value)}/></label></div><div className="inventory-preview"><div><span><BedDouble/></span><p><b>{form.rooms*form.defaultBeds} beds</b><small>Across {form.rooms} rooms and {form.floors} floor{form.floors>1?'s':''}</small></p></div><strong>{money(form.rooms*form.defaultBeds*form.defaultRent)}<small>maximum monthly rent</small></strong></div>
    </>}</section>
    <aside><section className="card setup-help"><span className="help-illustration"><Building2/></span><h3>{step===1?'A few things to keep ready':'You can refine this later'}</h3><ul>{step===1?<><li>Property contact number</li><li>Complete postal address</li><li>GST number, if registered</li><li>Amenities offered to residents</li></>:<><li>Change rent for individual beds</li><li>Add room categories and deposits</li><li>Mark rooms under maintenance</li><li>Import residents using CSV</li></>}</ul></section><section className="security-note"><ShieldCheck/><span><b>Your workspace stays isolated</b><small>Only authorized users in your organization can access this PG.</small></span></section></aside>
    <footer><button type="button" className="secondary" onClick={()=>step===2?setStep(1):onDone()}>← {step===2?'Back':'Cancel'}</button><button className="primary">{step===1?'Continue to rooms':saving?'Creating PG…':'Create PG'} {step===1&&<ChevronRight size={17}/>}</button></footer></form></div>;
}

function Metric({icon, label, value, note, positive, danger}) {
  return <article className="metric card"><div className="metric-top"><span>{icon}</span><TrendingUp size={17}/></div><small>{label}</small><strong>{value}</strong><p className={danger ? 'danger-text' : positive ? 'positive-text' : ''}>{positive && '↗ '}{note}</p></article>;
}

function RoomsPage({ session, property, members = [], onUpdate }) {
  const [rooms, setRooms] = useState([]);
  const [openAdd, setOpenAdd] = useState(false);
  const [openEdit, setOpenEdit] = useState(null);
  const [toast, setToast] = useState('');
  const [saving, setSaving] = useState(false);

  const getOccupantName = (bedId) => {
    if (!members || members.length === 0) return null;
    const occ = members.find(m => m.role === 'resident' && m.bedId?.toString() === bedId?.toString());
    return occ ? occ.name : null;
  };

  useEffect(() => {
    if (property) {
      setRooms(property.rooms || []);
    }
  }, [property]);

  const notify = msg => { setToast(msg); setTimeout(() => setToast(''), 2600); };

  if (!property) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', margin: '40px auto', maxWidth: '500px' }} className="card">
        <Building2 size={48} style={{ color: 'var(--green)', marginBottom: '16px' }} />
        <h2>No Property Found</h2>
        <p style={{ color: 'var(--muted)', marginBottom: '20px' }}>Please set up a property first under the "My PG" tab.</p>
      </div>
    );
  }

  const totalRooms = rooms.length;
  const totalBeds = rooms.reduce((acc, r) => acc + r.beds.length, 0);
  const occupiedBeds = rooms.reduce((acc, r) => acc + r.beds.filter(b => b.status === 'occupied').length, 0);
  const vacantBeds = rooms.reduce((acc, r) => acc + r.beds.filter(b => b.status === 'vacant').length, 0);
  const maintenanceBeds = rooms.reduce((acc, r) => acc + r.beds.filter(b => b.status === 'maintenance').length, 0);

  const floors = rooms.reduce((acc, r) => {
    const f = r.floor || '1';
    if (!acc[f]) acc[f] = [];
    acc[f].push(r);
    return acc;
  }, {});

  const sortedFloors = Object.keys(floors).sort((a, b) => Number(a) - Number(b));
  sortedFloors.forEach(f => {
    floors[f].sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true }));
  });

  const handleSaveProperty = async (updatedRooms) => {
    setSaving(true);
    try {
      const response = await fetch(`/api/tenant/properties/${property._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.accessToken}`,
          'x-organization-id': session.organizationId
        },
        body: JSON.stringify({ ...property, rooms: updatedRooms })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Failed to update property');
      onUpdate(result);
      notify('Property inventory saved successfully!');
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAddRoom = (newRoom) => {
    const updated = [...rooms, newRoom];
    setRooms(updated);
    handleSaveProperty(updated);
    setOpenAdd(false);
  };

  const handleEditRoom = (editedRoom) => {
    const updated = rooms.map(r => r._id === editedRoom._id ? editedRoom : r);
    setRooms(updated);
    handleSaveProperty(updated);
    setOpenEdit(null);
  };

  return (
    <div className="rooms-page">
      <div className="setup-heading">
        <div>
          <p className="eyebrow">Property Inventory</p>
          <h1>Rooms & Beds</h1>
          <p>Configure room details, pricing, AC status, and view real-time occupancy status.</p>
        </div>
        <button className="primary" onClick={() => setOpenAdd(true)}>
          <Plus size={17} /> Add Room
        </button>
      </div>

      <div className="room-stats">
        <article className="card metric" style={{ padding: '16px' }}>
          <small>Total Rooms</small>
          <strong>{totalRooms}</strong>
        </article>
        <article className="card metric" style={{ padding: '16px' }}>
          <small>Total Beds</small>
          <strong>{totalBeds}</strong>
        </article>
        <article className="card metric" style={{ padding: '16px' }}>
          <small>Occupied Beds</small>
          <strong style={{ color: 'var(--green)' }}>{occupiedBeds}</strong>
        </article>
        <article className="card metric" style={{ padding: '16px' }}>
          <small>Vacant Beds</small>
          <strong style={{ color: '#287154' }}>{vacantBeds}</strong>
        </article>
        <article className="card metric" style={{ padding: '16px' }}>
          <small>Maintenance</small>
          <strong style={{ color: '#9b6919' }}>{maintenanceBeds}</strong>
        </article>
      </div>

      {sortedFloors.map(floor => (
        <div key={floor} className="floor-section">
          <h2 className="floor-title">Floor {floor}</h2>
          <div className="rooms-grid">
            {floors[floor].map(room => {
              const baseRent = room.beds[0]?.monthlyRent || 0;
              const hasDifferingRents = room.beds.some(b => b.monthlyRent !== baseRent);
              const rentString = hasDifferingRents ? 'Varies' : `₹${new Intl.NumberFormat('en-IN').format(baseRent)}`;

              return (
                <div key={room._id} className="card room-card" onClick={() => setOpenEdit(room)}>
                  <div className="room-card-header">
                    <h3>Room {room.number}</h3>
                    <div className="room-badges">
                      <span className={`badge ${room.acType === 'ac' ? 'ac' : 'non-ac'}`}>
                        {room.acType === 'ac' ? 'AC' : 'Non-AC'}
                      </span>
                      <span className="badge sharing">
                        {room.sharingType}
                      </span>
                    </div>
                  </div>

                  <div className="bed-list">
                    {room.beds.map((bed, idx) => {
                      const occupantName = getOccupantName(bed._id);
                      return (
                        <div key={bed._id || idx} className="bed-item">
                          <div className="bed-info">
                            <span className={`bed-dot ${bed.status || 'vacant'}`} />
                            <span>{bed.label}</span>
                          </div>
                          <span style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'capitalize' }}>
                            {occupantName ? `Occupied: ${occupantName}` : bed.status}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="room-card-footer">
                    <span>Rent per bed</span>
                    <strong>{rentString}</strong>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {openAdd && (
        <AddRoomModal 
          onClose={() => setOpenAdd(false)} 
          onAdd={handleAddRoom} 
        />
      )}

      {openEdit && (
        <EditRoomModal 
          room={openEdit} 
          onClose={() => setOpenEdit(null)} 
          onSave={handleEditRoom} 
        />
      )}

      {toast && <div className="toast">✓ {toast}</div>}
    </div>
  );
}

function AddRoomModal({ onClose, onAdd }) {
  const [number, setNumber] = useState('');
  const [floor, setFloor] = useState('1');
  const [acType, setAcType] = useState('non-ac');
  const [sharingType, setSharingType] = useState('double');
  const [rent, setRent] = useState('7500');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!number || !floor || !rent) return;

    const bedCount = sharingType === 'single' ? 1 : sharingType === 'double' ? 2 : sharingType === 'triple' ? 3 : 4;
    const beds = Array.from({ length: bedCount }, (_, i) => ({
      _id: `bed-${Date.now()}-${i}`,
      label: `Bed ${String.fromCharCode(65 + i)}`,
      monthlyRent: Number(rent),
      status: 'vacant'
    }));

    onAdd({
      _id: `room-${Date.now()}`,
      number,
      floor,
      category: `${acType === 'ac' ? 'AC' : 'Non-AC'} ${sharingType.charAt(0).toUpperCase() + sharingType.slice(1)}`,
      acType,
      sharingType,
      beds
    });
  };

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <form className="modal" onMouseDown={e => e.stopPropagation()} onSubmit={handleSubmit}>
        <button type="button" className="modal-x" onClick={onClose}><X /></button>
        <span className="modal-icon"><Plus /></span>
        <h2>Add Room</h2>
        <p>Configure a new room space for your residents.</p>
        
        <div className="form-row">
          <label>Room Number *
            <input required value={number} onChange={e => setNumber(e.target.value)} placeholder="e.g. 301" autoFocus />
          </label>
          <label>Floor *
            <input required type="number" min="1" max="30" value={floor} onChange={e => setFloor(e.target.value)} />
          </label>
        </div>

        <div className="form-row">
          <label>AC Status
            <select value={acType} onChange={e => setAcType(e.target.value)}>
              <option value="non-ac">Non-AC</option>
              <option value="ac">AC</option>
            </select>
          </label>
          <label>Sharing Type
            <select value={sharingType} onChange={e => setSharingType(e.target.value)}>
              <option value="single">Single Sharing</option>
              <option value="double">Double Sharing</option>
              <option value="triple">Triple Sharing</option>
              <option value="four-sharing">Four Sharing</option>
            </select>
          </label>
        </div>

        <label>Rent per bed (₹/month) *
          <input required type="number" min="0" value={rent} onChange={e => setRent(e.target.value)} />
        </label>

        <div className="modal-actions">
          <button type="button" className="secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="primary">Add Room</button>
        </div>
      </form>
    </div>
  );
}

function EditRoomModal({ room, onClose, onSave }) {
  const [number, setNumber] = useState(room.number || '');
  const [floor, setFloor] = useState(room.floor || '1');
  const [acType, setAcType] = useState(room.acType || 'non-ac');
  const [sharingType, setSharingType] = useState(room.sharingType || 'double');
  const [rent, setRent] = useState(() => {
    return String(room.beds[0]?.monthlyRent || 7500);
  });
  const [beds, setBeds] = useState(room.beds || []);

  const handleRentChange = (newRent) => {
    setRent(newRent);
    setBeds(current => current.map(b => ({ ...b, monthlyRent: Number(newRent) })));
  };

  const handleSharingChange = (newSharing) => {
    setSharingType(newSharing);
    const targetCount = newSharing === 'single' ? 1 : newSharing === 'double' ? 2 : newSharing === 'triple' ? 3 : 4;
    
    setBeds(current => {
      let updatedBeds = [];
      for (let i = 0; i < targetCount; i++) {
        if (current[i]) {
          updatedBeds.push(current[i]);
        } else {
          updatedBeds.push({
            _id: `bed-${Date.now()}-${i}`,
            label: `Bed ${String.fromCharCode(65 + i)}`,
            monthlyRent: Number(rent),
            status: 'vacant'
          });
        }
      }
      return updatedBeds;
    });
  };

  const handleBedStatusChange = (index, newStatus) => {
    setBeds(current => current.map((b, idx) => idx === index ? { ...b, status: newStatus } : b));
  };

  const handleBedLabelChange = (index, newLabel) => {
    setBeds(current => current.map((b, idx) => idx === index ? { ...b, label: newLabel } : b));
  };

  const handleBedRentChange = (index, newBedRent) => {
    setBeds(current => current.map((b, idx) => idx === index ? { ...b, monthlyRent: Number(newBedRent) } : b));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!number || !floor) return;

    onSave({
      ...room,
      number,
      floor,
      category: `${acType === 'ac' ? 'AC' : 'Non-AC'} ${sharingType.charAt(0).toUpperCase() + sharingType.slice(1)}`,
      acType,
      sharingType,
      beds
    });
  };

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <form className="modal" style={{ width: 'min(580px, 100%)' }} onMouseDown={e => e.stopPropagation()} onSubmit={handleSubmit}>
        <button type="button" className="modal-x" onClick={onClose}><X /></button>
        <span className="modal-icon"><BedDouble /></span>
        <h2>Edit Room {room.number}</h2>
        <p>Modify room settings, AC/sharing config, and set custom pricing for beds.</p>

        <div className="form-row">
          <label>Room Number *
            <input required value={number} onChange={e => setNumber(e.target.value)} />
          </label>
          <label>Floor *
            <input required type="number" min="1" max="30" value={floor} onChange={e => setFloor(e.target.value)} />
          </label>
        </div>

        <div className="form-row">
          <label>AC Status
            <select value={acType} onChange={e => setAcType(e.target.value)}>
              <option value="non-ac">Non-AC</option>
              <option value="ac">AC</option>
            </select>
          </label>
          <label>Sharing Type
            <select value={sharingType} onChange={e => handleSharingChange(e.target.value)}>
              <option value="single">Single Sharing</option>
              <option value="double">Double Sharing</option>
              <option value="triple">Triple Sharing</option>
              <option value="four-sharing">Four Sharing</option>
            </select>
          </label>
        </div>

        <label>Common Rent per bed (₹/month)
          <input type="number" min="0" value={rent} onChange={e => handleRentChange(e.target.value)} placeholder="Applies to all beds" />
        </label>

        <div style={{ marginTop: '20px', borderTop: '1px solid var(--border)', paddingTop: '15px' }}>
          <h3 style={{ font: '700 13px Manrope', margin: '0 0 10px' }}>Configure Beds</h3>
          {beds.map((bed, idx) => (
            <div key={bed._id || idx} className="bed-edit-row">
              <input 
                required 
                placeholder="Bed Label" 
                value={bed.label} 
                onChange={e => handleBedLabelChange(idx, e.target.value)} 
                style={{ height: '36px', fontSize: '12px' }}
              />
              <select 
                value={bed.status} 
                onChange={e => handleBedStatusChange(idx, e.target.value)}
                style={{ height: '36px', fontSize: '12px' }}
              >
                <option value="vacant">Vacant</option>
                <option value="occupied">Occupied</option>
                <option value="maintenance">Maintenance</option>
              </select>
              <input 
                required 
                type="number" 
                min="0" 
                placeholder="Rent" 
                value={bed.monthlyRent} 
                onChange={e => handleBedRentChange(idx, e.target.value)}
                style={{ height: '36px', fontSize: '12px' }}
              />
            </div>
          ))}
        </div>

        <div className="modal-actions">
          <button type="button" className="secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="primary">Save Changes</button>
        </div>
      </form>
    </div>
  );
}

export default App;
