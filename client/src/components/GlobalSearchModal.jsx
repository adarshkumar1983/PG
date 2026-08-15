import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Search, Users, BedDouble, WalletCards, LayoutDashboard, Building2,
  Settings, Wrench, FileText, IndianRupee, ArrowRight, X, Sparkles,
  CheckCircle2, Clock, AlertCircle, CornerDownLeft
} from 'lucide-react';
import { money } from '../utils/formatters.js';
import { fetchWithCache } from '../utils/apiClient.js';

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
  const listRef = useRef(null);

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
        { id: 'nav-overview', title: 'Dashboard Overview', category: 'Navigation', page: 'Overview', icon: LayoutDashboard },
        { id: 'nav-payments', title: 'My Payments & Invoices', category: 'Navigation', page: 'Payments', icon: WalletCards },
        { id: 'nav-maintenance', title: 'Maintenance & Complaints', category: 'Navigation', page: 'Maintenance', icon: Wrench },
      ];
    }
    return [
      { id: 'nav-overview', title: 'Dashboard Overview', category: 'Navigation', page: 'Overview', icon: LayoutDashboard },
      { id: 'nav-properties', title: 'My PG & Property Setup', category: 'Navigation', page: 'My PG', icon: Building2 },
      { id: 'nav-members', title: 'PG Members & Staff Access', category: 'Navigation', page: 'Members', icon: Users },
      { id: 'nav-residents', title: 'Residents Directory', category: 'Navigation', page: 'Residents', icon: Users },
      { id: 'nav-rooms', title: 'Rooms & Bed Allocations', category: 'Navigation', page: 'Rooms & beds', icon: BedDouble },
      { id: 'nav-payments', title: 'Financial Payments Ledger', category: 'Navigation', page: 'Payments', icon: WalletCards },
      { id: 'nav-expenses', title: 'Expenses Tracker', category: 'Navigation', page: 'Expenses', icon: IndianRupee },
      { id: 'nav-maintenance', title: 'Maintenance & Service Requests', category: 'Navigation', page: 'Maintenance', icon: Wrench },
      { id: 'nav-reports', title: 'Analytics & Financial Reports', category: 'Navigation', page: 'Reports', icon: FileText },
      { id: 'nav-settings', title: 'Organization & Bank Settings', category: 'Navigation', page: 'Settings', icon: Settings }
    ];
  }, [userRole]);

  // Extract all rooms and beds from properties
  const allRoomsAndBeds = useMemo(() => {
    const list = [];
    properties.forEach(p => {
      (p.rooms || []).forEach(r => {
        list.push({
          id: `room-${r._id}`,
          type: 'room',
          title: `Room ${r.number}`,
          subtitle: `${p.name} · ${r.sharingType} sharing · Floor ${r.floor || 'Ground'}`,
          category: 'Rooms & Beds',
          page: 'Rooms & beds',
          badge: `${(r.beds || []).filter(b => b.status === 'vacant').length} vacant`,
          icon: BedDouble
        });

        (r.beds || []).forEach(b => {
          list.push({
            id: `bed-${b._id}`,
            type: 'bed',
            title: `Room ${r.number} · Bed ${b.label}`,
            subtitle: `${p.name} · ₹${b.monthlyRent}/mo · ${b.status === 'vacant' ? 'Vacant' : 'Occupied'}`,
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
      // Default: show quick pages and recent items
      return navPages.slice(0, 6);
    }

    const matchedNav = navPages.filter(p => p.title.toLowerCase().includes(q) || p.page.toLowerCase().includes(q));

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
        subtitle: `${r.mobile || r.email || 'No contact'} · Room ${r.roomId ? 'Allocated' : 'Unassigned'}`,
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

    return [...matchedNav, ...matchedResidents, ...matchedRooms, ...matchedPayments].slice(0, 15);
  }, [query, navPages, residents, allRoomsAndBeds, payments]);

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
    <div
      className="modal-backdrop global-search-backdrop"
      onMouseDown={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(8px)',
        zIndex: 99999,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        paddingTop: '12vh'
      }}
    >
      <div
        className="modal global-search-modal"
        onMouseDown={e => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '620px',
          background: 'var(--card-bg, #1a221f)',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05)',
          overflow: 'hidden',
          animation: 'modalSlideDown 0.18s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        {/* Search Input Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '16px 20px',
            borderBottom: '1px solid var(--border)',
            background: 'var(--table-head-bg)'
          }}
        >
          <Search size={20} style={{ color: 'var(--green)', flexShrink: 0 }} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search residents, rooms, payments, invoices, or settings..."
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              fontSize: '15px',
              color: 'var(--text-primary)',
              padding: 0
            }}
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '4px'
              }}
            >
              <X size={16} />
            </button>
          )}
          <kbd
            style={{
              padding: '2px 6px',
              fontSize: '11px',
              borderRadius: '4px',
              border: '1px solid var(--border)',
              background: 'var(--card-bg)',
              color: 'var(--text-muted)'
            }}
          >
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div
          ref={listRef}
          style={{
            maxHeight: '380px',
            overflowY: 'auto',
            padding: '8px 0'
          }}
        >
          {loading && results.length === 0 ? (
            <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
              Searching workspace data...
            </div>
          ) : results.length === 0 ? (
            <div style={{ padding: '36px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <p style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>No results found</p>
              <p style={{ margin: '4px 0 0', fontSize: '12px' }}>We couldn't find any residents, rooms, or records matching "{query}"</p>
            </div>
          ) : (
            results.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              const Icon = item.icon || Search;

              return (
                <div
                  key={item.id || idx}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 18px',
                    cursor: 'pointer',
                    backgroundColor: isSelected ? 'var(--mint, rgba(23, 100, 79, 0.12))' : 'transparent',
                    borderLeft: isSelected ? '3px solid var(--green)' : '3px solid transparent',
                    transition: 'all 0.1s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        backgroundColor: isSelected ? 'var(--green)' : 'var(--table-head-bg)',
                        color: isSelected ? '#ffffff' : 'var(--text-secondary)',
                        display: 'grid',
                        placeItems: 'center',
                        flexShrink: 0
                      }}
                    >
                      <Icon size={16} />
                    </div>
                    <div style={{ minWidth: 0, overflow: 'hidden' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span
                          style={{
                            fontSize: '13.5px',
                            fontWeight: isSelected ? '700' : '600',
                            color: 'var(--text-primary)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}
                        >
                          {item.title}
                        </span>
                        {item.category && (
                          <span
                            style={{
                              fontSize: '9.5px',
                              textTransform: 'uppercase',
                              letterSpacing: '0.4px',
                              padding: '1px 5px',
                              borderRadius: '4px',
                              backgroundColor: 'var(--table-head-bg)',
                              color: 'var(--text-muted)',
                              border: '1px solid var(--border)'
                            }}
                          >
                            {item.category}
                          </span>
                        )}
                      </div>
                      <p
                        style={{
                          margin: '2px 0 0',
                          fontSize: '11.5px',
                          color: 'var(--text-secondary)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                      >
                        {item.subtitle || `Jump to ${item.page}`}
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                    {item.badge && (
                      <span
                        style={{
                          fontSize: '10px',
                          padding: '2px 7px',
                          borderRadius: '5px',
                          fontWeight: '700',
                          textTransform: 'capitalize',
                          backgroundColor:
                            item.badgeType === 'success'
                              ? 'rgba(16, 185, 129, 0.15)'
                              : item.badgeType === 'danger'
                              ? 'rgba(239, 68, 68, 0.15)'
                              : 'var(--table-head-bg)',
                          color:
                            item.badgeType === 'success'
                              ? '#10b981'
                              : item.badgeType === 'danger'
                              ? '#ef4444'
                              : 'var(--text-secondary)',
                          border:
                            item.badgeType === 'success'
                              ? '1px solid rgba(16, 185, 129, 0.3)'
                              : item.badgeType === 'danger'
                              ? '1px solid rgba(239, 68, 68, 0.3)'
                              : '1px solid var(--border)'
                        }}
                      >
                        {item.badge}
                      </span>
                    )}
                    {isSelected && (
                      <CornerDownLeft size={14} style={{ color: 'var(--green)' }} />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Shortcut Bar */}
        <div
          style={{
            padding: '10px 18px',
            borderTop: '1px solid var(--border)',
            background: 'var(--table-head-bg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '11px',
            color: 'var(--text-muted)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <span><kbd style={{ padding: '1px 4px', borderRadius: '3px', border: '1px solid var(--border)', background: 'var(--card-bg)' }}>↑</kbd> <kbd style={{ padding: '1px 4px', borderRadius: '3px', border: '1px solid var(--border)', background: 'var(--card-bg)' }}>↓</kbd> to navigate</span>
            <span><kbd style={{ padding: '1px 4px', borderRadius: '3px', border: '1px solid var(--border)', background: 'var(--card-bg)' }}>↵</kbd> to select</span>
            <span><kbd style={{ padding: '1px 4px', borderRadius: '3px', border: '1px solid var(--border)', background: 'var(--card-bg)' }}>ESC</kbd> to close</span>
          </div>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Sparkles size={12} style={{ color: 'var(--green)' }} /> StayZen Quick Search
          </span>
        </div>
      </div>
    </div>
  );
}
