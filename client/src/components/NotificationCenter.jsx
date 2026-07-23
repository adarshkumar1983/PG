import React, { useState, useEffect } from 'react';
import { Bell, CheckCheck, CreditCard, ShieldCheck, Zap, X } from 'lucide-react';

export default function NotificationCenter({ session, onSelectPayment }) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = () => {
    if (!session?.accessToken) return;
    setLoading(true);
    fetch('/api/tenant/notifications', {
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        'x-organization-id': session.organizationId
      }
    })
      .then(r => r.ok ? r.json() : [])
      .then(data => setNotifications(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000); // poll every 15s
    return () => clearInterval(interval);
  }, [session]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markRead = async (id) => {
    setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
    try {
      await fetch(`/api/tenant/notifications/${id}/read`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          'x-organization-id': session.organizationId
        }
      });
    } catch (err) {}
  };

  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{
          border: '1px solid var(--border)',
          background: 'var(--card-bg)',
          color: 'var(--text-primary)',
          padding: '8px',
          borderRadius: '10px',
          cursor: 'pointer',
          position: 'relative',
          display: 'grid',
          placeItems: 'center'
        }}
        title="Notifications"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span 
            style={{
              position: 'absolute',
              top: '-4px',
              right: '-4px',
              backgroundColor: '#ef4444',
              color: '#fff',
              fontSize: '10px',
              fontWeight: '800',
              borderRadius: '10px',
              padding: '1px 5px',
              lineHeight: 1
            }}
          >
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div 
          style={{
            position: 'absolute',
            top: '46px',
            right: 0,
            width: '360px',
            maxHeight: '480px',
            backgroundColor: 'var(--card-bg)',
            border: '1px solid var(--border)',
            borderRadius: '16px',
            boxShadow: '0 20px 40px -10px rgba(0,0,0,0.25)',
            zIndex: 999,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            animation: 'fadeIn 0.2s ease-out'
          }}
        >
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <strong style={{ fontSize: '14px' }}>Notifications</strong>
              {unreadCount > 0 && <span style={{ fontSize: '11px', color: 'var(--green)', fontWeight: '700' }}>{unreadCount} new</span>}
            </div>
            <button type="button" onClick={() => setOpen(false)} style={{ border: 0, background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}>
              <X size={16} />
            </button>
          </div>

          <div style={{ overflowY: 'auto', flex: 1, padding: '8px' }}>
            {notifications.length === 0 ? (
              <div style={{ padding: '30px 20px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
                No notifications yet
              </div>
            ) : (
              notifications.map(n => (
                <div 
                  key={n._id} 
                  onClick={() => { markRead(n._id); if (n.data?.paymentId) onSelectPayment?.(n.data); }}
                  style={{
                    padding: '12px',
                    borderRadius: '10px',
                    marginBottom: '6px',
                    backgroundColor: n.read ? 'transparent' : 'var(--table-head-bg)',
                    border: '1px solid ' + (n.read ? 'transparent' : 'var(--border)'),
                    cursor: 'pointer',
                    transition: 'background 0.2s'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <strong style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{n.title}</strong>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                      {new Date(n.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.4' }}>
                    {n.message}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
