import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Search, Users, BedDouble, WalletCards, LayoutDashboard, Building2,
  Settings, Wrench, FileText, IndianRupee, X, Sparkles,
  CornerDownLeft
} from 'lucide-react';
import { money } from '../utils/formatters.js';
import { fetchWithCache } from '../utils/apiClient.js';
import './GlobalSearchModal.css';

export default function GlobalSearchModal({
  isOpen,
  onClose,
  session,
  userRole = 'owner',
  onNavigate
}) {
  const [query, setQuery] = useState('');
  const [residents, setResidents] = useState([]);
  const [properties, setProperties] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const itemRefs = useRef([]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);

      // Load search datasets
      if (session?.accessToken && userRole !== 'resident') {
        setLoading(true);
        const p1 = fetchWithCache('/api/tenant/residents', session).catch(() => []);
        const p2 = fetchWithCache('/api/tenant/properties', session).catch(() => []);
        const p3 = fetchWithCache('/api/tenant/payments', session).catch(() => []);

        Promise.all([p1, p2, p3])
          .then(([resData, propData, payData]) => {
            if (Array.isArray(resData)) setResidents(resData);
            if (Array.isArray(propData)) setProperties(propData);
            if (Array.isArray(payData)) setPayments(payData);
          })
          .finally(() => setLoading(false));
      } else if (session?.accessToken && userRole === 'resident') {
        setLoading(true);
        fetchWithCache('/api/tenant/payments', session)
          .then(payData => {
            if (Array.isArray(payData)) setPayments(payData);
          })
          .finally(() => setLoading(false));
      }
    }
  }, [isOpen, session, userRole]);

  // Quick navigation pages
  const navPages = useMemo(() => {
    if (userRole === 'resident') {
      return [
        { id: 'nav-overview', title: 'Dashboard Overview', subtitle: 'View room details & notifications', category: 'Navigation', page: 'Overview', icon: LayoutDashboard },
        { id: 'nav-payments', title: 'My Payments & Invoices', subtitle: 'Pay rent online & download receipts', category: 'Navigation', page: 'Payments', icon: WalletCards },
        { id: 'nav-maintenance', title: 'Maintenance & Complaints', subtitle: 'Submit repair or service tickets', category: 'Navigation', page: 'Maintenance', icon: Wrench },
      ];
    }
    return [
      { id: 'nav-overview', title: 'Dashboard Overview', subtitle: 'Occupancy metrics & attention alerts', category: 'Navigation', page: 'Overview', icon: LayoutDashboard },
      { id: 'nav-properties', title: 'My PG & Property Setup', subtitle: 'Manage properties, rules & amenities', category: 'Navigation', page: 'My PG', icon: Building2 },
      { id: 'nav-members', title: 'PG Members & Staff Access', subtitle: 'Invite staff managers & residents', category: 'Navigation', page: 'Members', icon: Users },
      { id: 'nav-residents', title: 'Residents Directory', subtitle: 'Active tenants, stays & KYC details', category: 'Navigation', page: 'Residents', icon: Users },
      { id: 'nav-rooms', title: 'Rooms & Bed Allocations', subtitle: 'Live inventory, pricing & vacancies', category: 'Navigation', page: 'Rooms & beds', icon: BedDouble },
      { id: 'nav-payments', title: 'Financial Payments Ledger', subtitle: 'Unified cash, UPI & online ledger', category: 'Navigation', page: 'Payments', icon: WalletCards },
      { id: 'nav-expenses', title: 'Expenses Tracker', subtitle: 'Log utility bills, repairs & costs', category: 'Navigation', page: 'Expenses', icon: IndianRupee },
      { id: 'nav-maintenance', title: 'Maintenance & Service Requests', subtitle: 'Track plumbing, electrical & cleaning', category: 'Navigation', page: 'Maintenance', icon: Wrench },
      { id: 'nav-reports', title: 'Analytics & Financial Reports', subtitle: 'Revenue forecasts & occupancy trends', category: 'Navigation', page: 'Reports', icon: FileText },
      { id: 'nav-settings', title: 'Organization & Bank Settings', subtitle: 'UPI IDs, bank accounts & gateways', category: 'Navigation', page: 'Settings', icon: Settings }
    ];
  }, [userRole]);

  // Extract all rooms and beds from properties
  const allRoomsAndBeds = useMemo(() => {
    const list = [];
    properties.forEach(p => {
      (p.rooms || []).forEach(r => {
        const vacantCount = (r.beds || []).filter(b => b.status === 'vacant').length;
        list.push({
          id: `room-${r._id}`,
          type: 'room',
          title: `Room ${r.number}`,
          subtitle: `${p.name} · ${r.sharingType} sharing · Floor ${r.floor || 'Ground'}`,
          category: 'Rooms & Beds',
          page: 'Rooms & beds',
          badge: `${vacantCount} vacant`,
          badgeType: vacantCount > 0 ? 'success' : 'neutral',
          icon: BedDouble
        });

        (r.beds || []).forEach(b => {
          list.push({
            id: `bed-${b._id}`,
            type: 'bed',
            title: `Room ${r.number} · Bed ${b.label}`,
            subtitle: `${p.name} · ₹${b.monthlyRent}/mo`,
            category: 'Rooms & Beds',
            page: 'Rooms & beds',
            badge: b.status === 'vacant' ? 'Vacant' : 'Occupied',
            badgeType: b.status === 'vacant' ? 'success' : 'neutral',
            icon: BedDouble
          });
        });
      });
    });
    return list;
  }, [properties]);

  // Search Results
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return navPages.slice(0, 6);
    }

    const matchedNav = navPages.filter(p => 
      p.title.toLowerCase().includes(q) || 
      p.subtitle.toLowerCase().includes(q) || 
      p.page.toLowerCase().includes(q)
    );

    const matchedResidents = residents
      .filter(r => {
        const name = (r.name || '').toLowerCase();
        const email = (r.email || '').toLowerCase();
        const mobile = (r.mobile || '').toLowerCase();
        return name.includes(q) || email.includes(q) || mobile.includes(q);
      })
      .map(r => ({
        id: `res-${r._id}`,
        title: r.name,
        subtitle: `${r.mobile || r.email || 'No contact details'} · Room ${r.roomId ? 'Allocated' : 'Unassigned'}`,
        category: 'Residents',
        page: 'Residents',
        badge: r.status === 'active' ? 'Active' : r.status,
        badgeType: r.status === 'active' ? 'success' : 'neutral',
        icon: Users
      }));

    const matchedRooms = allRoomsAndBeds.filter(rb => 
      rb.title.toLowerCase().includes(q) || rb.subtitle.toLowerCase().includes(q)
    );

    const matchedPayments = payments
      .filter(p => {
        const resName = (p.residentId?.name || p.name || '').toLowerCase();
        const invMonth = (p.invoiceMonth || '').toLowerCase();
        const purpose = (p.purpose || '').toLowerCase();
        const ref = (p.referenceNumber || '').toLowerCase();
        return resName.includes(q) || invMonth.includes(q) || purpose.includes(q) || ref.includes(q);
      })
      .map(p => ({
        id: `pay-${p._id}`,
        title: `${p.residentId?.name || p.name || 'Resident'} · ${p.purpose?.toUpperCase() || 'RENT'}`,
        subtitle: `${p.invoiceMonth || 'Invoice'} · Total: ${money(p.amount)} · Paid: ${money(p.receivedAmount || 0)}`,
        category: 'Payments',
        page: 'Payments',
        badge: p.status === 'paid' ? 'Paid' : p.status === 'due' ? 'Due' : p.status,
        badgeType: p.status === 'paid' ? 'success' : p.status === 'due' ? 'danger' : 'neutral',
        icon: WalletCards
      }));

    return [...matchedNav, ...matchedResidents, ...matchedRooms, ...matchedPayments].slice(0, 16);
  }, [query, navPages, residents, allRoomsAndBeds, payments]);

  // Keep item in view on keyboard arrow navigate
  useEffect(() => {
    if (itemRefs.current[selectedIndex]) {
      itemRefs.current[selectedIndex].scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  // Handle Keyboard Navigation
  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < results.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : results.length - 1));
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      e.preventDefault();
      handleSelect(results[selectedIndex]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  const handleSelect = (item) => {
    if (item.page && onNavigate) {
      onNavigate(item.page);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="cmd-backdrop" onMouseDown={onClose}>
      <div className="cmd-box" onMouseDown={e => e.stopPropagation()}>
        {/* Search Header Bar */}
        <div className="cmd-header">
          <Search size={19} className="cmd-search-icon" />
          <input
            ref={inputRef}
            type="text"
            className="cmd-input"
            value={query}
            onChange={e => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search residents, rooms, payments, invoices, or settings..."
          />
          {query && (
            <button
              type="button"
              className="cmd-clear-btn"
              onClick={() => {
                setQuery('');
                setSelectedIndex(0);
                inputRef.current?.focus();
              }}
              title="Clear search"
            >
              <X size={16} />
            </button>
          )}
          <kbd className="cmd-esc-badge">ESC</kbd>
        </div>

        {/* Results List */}
        <div className="cmd-list">
          {loading && results.length === 0 ? (
            <div style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
              Searching workspace data...
            </div>
          ) : results.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <p style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>No results found</p>
              <p style={{ margin: '4px 0 0', fontSize: '12px' }}>We couldn't find any residents, rooms, or records matching "{query}"</p>
            </div>
          ) : (
            results.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              const Icon = item.icon || Search;

              // Check if first item in category to render category header
              const showCategoryHeader = idx === 0 || results[idx - 1].category !== item.category;

              return (
                <React.Fragment key={item.id || idx}>
                  {showCategoryHeader && (
                    <div className="cmd-section-title">
                      {item.category}
                    </div>
                  )}
                  <div
                    ref={el => itemRefs.current[idx] = el}
                    className={`cmd-item ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleSelect(item)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                  >
                    <div className="cmd-item-left">
                      <div className="cmd-item-icon">
                        <Icon size={16} />
                      </div>
                      <div className="cmd-item-content">
                        <span className="cmd-item-title">
                          {item.title}
                        </span>
                        <span className="cmd-item-subtitle">
                          {item.subtitle}
                        </span>
                      </div>
                    </div>

                    <div className="cmd-item-right">
                      {item.badge && (
                        <span className={`cmd-badge ${item.badgeType || 'neutral'}`}>
                          {item.badge}
                        </span>
                      )}
                      <CornerDownLeft size={14} className="cmd-enter-icon" />
                    </div>
                  </div>
                </React.Fragment>
              );
            })
          )}
        </div>

        {/* Footer Shortcuts Bar */}
        <div className="cmd-footer">
          <div className="cmd-footer-shortcuts">
            <span>
              <kbd className="cmd-kbd">↑</kbd>
              <kbd className="cmd-kbd">↓</kbd>
              <span>to navigate</span>
            </span>
            <span>
              <kbd className="cmd-kbd">↵</kbd>
              <span>to select</span>
            </span>
            <span>
              <kbd className="cmd-kbd">ESC</kbd>
              <span>to close</span>
            </span>
          </div>
          <div className="cmd-brand">
            <Sparkles size={12} style={{ color: 'var(--green)' }} />
            <span>StayZen Search</span>
          </div>
        </div>
      </div>
    </div>
  );
}
