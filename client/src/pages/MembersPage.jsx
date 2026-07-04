import React, { useState, useEffect } from 'react';
import { Search, Plus, ShieldCheck, Mail, Users, Building2, MoreHorizontal, X, ChevronDown } from 'lucide-react';

export function MembersPage({ session, properties = [], onRefresh }) {
  const seed = [
    { id: '1', name: 'Adarsh Kumar', email: 'owner@stayzen.demo', mobile: '+91 98765 43210', role: 'owner', status: 'active' },
    { id: '2', name: 'Rohan Singh', email: 'manager@greenview.demo', mobile: '+91 99887 76655', role: 'staff', status: 'active' },
    { id: '3', name: 'Arjun Mehta', email: 'arjun@example.com', mobile: '+91 90000 11223', role: 'resident', status: 'invited' }
  ];
  const [members, setMembers] = useState(seed);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', mobile: '', role: 'staff', propertyId: '', roomId: '', bedId: '' });
  const [toast, setToast] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('all');
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);

  const [editingMember, setEditingMember] = useState(null);
  const [editRole, setEditRole] = useState('staff');
  const [editPropertyId, setEditPropertyId] = useState('');
  const [editRoomId, setEditRoomId] = useState('');
  const [editBedId, setEditBedId] = useState('');
  const [updating, setUpdating] = useState(false);
  const [editError, setEditError] = useState('');

  const triggerToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  useEffect(() => {
    fetch('/api/tenant/members', {
      headers: { Authorization: `Bearer ${session.accessToken}`, 'x-organization-id': session.organizationId }
    })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(setMembers)
      .catch(() => { });
  }, [session]);

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

  const handleResendInvite = async (m) => {
    try {
      const response = await fetch(`/api/tenant/members/${m.id}/resend-invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.accessToken}`,
          'x-organization-id': session.organizationId
        }
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Failed to resend invitation');

      setMembers(prev => prev.map(item => item.id === result.id ? result : item));
      triggerToast(`Invitation email sent automatically to ${m.email || m.mobile}!`);
    } catch (err) {
      alert(err.message || 'Could not resend invitation.');
    }
  };

  const submit = async e => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const response = await fetch('/api/tenant/members', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.accessToken}`,
          'x-organization-id': session.organizationId
        },
        body: JSON.stringify(form)
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message);
      setMembers(v => [result, ...v]);
      if (onRefresh) onRefresh();
      setOpen(false);
      setForm({ name: '', email: '', mobile: '', role: 'staff', propertyId: '', roomId: '', bedId: '' });
      triggerToast(`Invitation email sent automatically to ${result.email || result.mobile}!`);
    } catch (err) {
      setError(err.message || 'Could not add member.');
    } finally {
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
    setForm({ name: '', email: '', mobile: '', role: 'staff', propertyId: '', roomId: '', bedId: '' });
    setError('');
  };

  const roleCopy = {
    owner: 'Full access to PG settings, billing and members',
    staff: 'Manage residents, payments, occupancy and expenses',
    resident: 'View own rent, receipts and raise complaints'
  };

  const getAllocationText = (m) => {
    if (m.role !== 'resident') return roleCopy[m.role];
    if (!m.propertyId) return 'Resident (Not allocated)';
    const prop = properties.find(p => p._id === m.propertyId);
    if (!prop) return 'Resident (Allocated)';
    const room = prop.rooms?.find(r => r._id === m.roomId);
    const bed = room?.beds?.find(b => b._id === m.bedId);
    return `Allocated: ${prop.name} · Room ${room?.number || '—'} · ${bed?.label || '—'}`;
  };

  const roleLabels = {
    all: 'All roles',
    owner: 'Owners & Admins',
    staff: 'Staff & Managers',
    resident: 'Residents / Tenants'
  };

  const filteredMembers = members.filter(m => {
    if (selectedRoleFilter !== 'all' && m.role !== selectedRoleFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      return (
        m.name?.toLowerCase().includes(query) ||
        m.email?.toLowerCase().includes(query) ||
        m.mobile?.toLowerCase().includes(query)
      );
    }
    return true;
  });

  return (
    <div className="members-page">
      <div className="setup-heading">
        <div>
          <p className="eyebrow">Access management</p>
          <h1>PG members</h1>
          <p>Add your staff and residents, then decide what each person can access.</p>
        </div>
        <button className="primary" onClick={openAddModal}><Plus size={17} /> Add member</button>
      </div>

      <div className="member-stats">
        <article className="card">
          <span><Users /></span>
          <div>
            <b>{members.length}</b>
            <small>Total members</small>
          </div>
        </article>
        <article className="card">
          <span><ShieldCheck /></span>
          <div>
            <b>{members.filter(m => m.role === 'owner').length}</b>
            <small>Owners and admins</small>
          </div>
        </article>
        <article className="card">
          <span><Building2 /></span>
          <div>
            <b>{members.filter(m => m.role === 'staff').length}</b>
            <small>Staff members</small>
          </div>
        </article>
        <article className="card">
          <span><Mail /></span>
          <div>
            <b>{members.filter(m => m.status === 'invited').length}</b>
            <small>Pending invitations</small>
          </div>
        </article>
      </div>

      <section className="card member-table-card">
        <div className="member-toolbar">
          <div className="search">
            <Search size={17} />
            <input 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by name, email or phone" 
            />
          </div>
          <div className="filter-dropdown-container" style={{ position: 'relative' }}>
            <button 
              type="button"
              className="ghost" 
              onClick={() => setRoleMenuOpen(!roleMenuOpen)}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              {roleLabels[selectedRoleFilter]} 
              <ChevronDown 
                size={15} 
                style={{ 
                  transform: roleMenuOpen ? 'rotate(180deg)' : 'rotate(0deg)', 
                  transition: 'transform 0.2s ease' 
                }} 
              />
            </button>
            {roleMenuOpen && (
              <>
                <div 
                  className="dropdown-overlay" 
                  onClick={() => setRoleMenuOpen(false)} 
                  style={{ position: 'fixed', inset: 0, zIndex: 99 }} 
                />
                <div 
                  className="dropdown-menu" 
                  style={{ 
                    position: 'absolute', 
                    right: 0, 
                    top: 'calc(100% + 6px)', 
                    background: '#fff', 
                    border: '1px solid var(--border)', 
                    borderRadius: '10px', 
                    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.02)', 
                    padding: '6px', 
                    minWidth: '160px', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '2px', 
                    zIndex: 100,
                    animation: 'dropdown-slide 0.18s cubic-bezier(0.16, 1, 0.3, 1) forwards'
                  }}
                >
                  {Object.entries(roleLabels).map(([roleKey, labelText]) => (
                    <button
                      key={roleKey}
                      type="button"
                      onClick={() => {
                        setSelectedRoleFilter(roleKey);
                        setRoleMenuOpen(false);
                      }}
                      style={{
                        border: 0,
                        background: selectedRoleFilter === roleKey ? 'var(--mint)' : 'transparent',
                        color: selectedRoleFilter === roleKey ? 'var(--green)' : '#53605c',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: selectedRoleFilter === roleKey ? '600' : '500',
                        textAlign: 'left',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        transition: 'background-color 0.15s, color 0.15s'
                      }}
                      className="dropdown-item"
                    >
                      {labelText}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
        <div className="member-table">
          <div className="member-row member-head">
            <span>Member</span>
            <span>Role and access</span>
            <span>Status</span>
            <span>Contact</span>
            <span />
          </div>
          {filteredMembers.map(m => (
            <div className="member-row" key={m.id}>
              <span className="member-person">
                <i>{m.name ? m.name.split(' ').map(x => x[0]).slice(0, 2).join('').toUpperCase() : 'M'}</i>
                <span>
                  <b>{m.name || 'Invited User'}</b>
                  <small>{m.email}</small>
                </span>
              </span>
              <span className="role-cell">
                <b className={`role-badge ${m.role}`}>{m.role === 'owner' ? 'Owner / Admin' : m.role === 'staff' ? 'Staff / Manager' : 'Resident'}</b>
                <small>{getAllocationText(m)}</small>
              </span>
              <span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className={`member-status ${m.status}`}>{m.status}</i>
                  {m.status === 'invited' && (
                    <button type="button" onClick={() => handleResendInvite(m)} title="Reset & Resend invitation link" style={{ background: '#fff0d7', border: '1px solid #ffe8cc', color: '#9b6919', borderRadius: '6px', cursor: 'pointer', fontSize: '9px', fontWeight: '600', padding: '2px 6px', whiteSpace: 'nowrap', height: '18px', display: 'flex', alignItems: 'center' }}>Resend</button>
                  )}
                </div>
              </span>
              <span className="contact-cell">{m.mobile || '—'}</span>
              <button className="more" onClick={() => startEditing(m)} title="Change member role / allocation"><MoreHorizontal size={18} /></button>
            </div>
          ))}
          {filteredMembers.length === 0 && (
            <div style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--muted)' }}>
              <Users size={36} style={{ color: '#cedad3', marginBottom: '12px' }} />
              <p style={{ margin: 0, fontSize: '13px', fontWeight: '600', color: '#34423e' }}>No members found</p>
              <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#9aa39f' }}>We couldn't find anyone matching your search or selected role.</p>
            </div>
          )}
        </div>
      </section>

      {open && (
        <div className="modal-backdrop" onMouseDown={handleClose}>
          <form className="modal member-modal" onMouseDown={e => e.stopPropagation()} onSubmit={submit}>
            <button type="button" className="modal-x" onClick={handleClose}><X /></button>
            <span className="modal-icon"><Users /></span>
            <h2>Add PG member</h2>
            <p>They’ll receive an invitation to join your PG workspace.</p>
            {error && <div className="form-error">{error}</div>}

            <label>Full name *
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required placeholder="Member name" />
            </label>
            <div className="form-row">
              <label>Email address *
                <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required placeholder="name@example.com" />
              </label>
              <label>Mobile number
                <input value={form.mobile} onChange={e => setForm({ ...form, mobile: e.target.value })} placeholder="+91 98765 43210" />
              </label>
            </div>

            <label>Member role
              <select value={form.role} onChange={e => handleRoleChange(e.target.value)}>
                <option value="owner">Owner / Admin</option>
                <option value="staff">Staff / Manager</option>
                <option value="resident">Resident / Tenant</option>
              </select>
            </label>

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
              <ShieldCheck />
              <span>
                <b>{form.role === 'owner' ? 'Full owner access' : form.role === 'staff' ? 'Operational access' : 'Personal resident access'}</b>
                <small>{roleCopy[form.role]}</small>
              </span>
            </div>

            <div className="modal-actions">
              <button type="button" className="secondary" onClick={handleClose}>Cancel</button>
              <button className="primary" disabled={saving}>{saving ? 'Adding…' : 'Add and invite member'}</button>
            </div>
          </form>
        </div>
      )}

      {editingMember && (
        <div className="modal-backdrop" onMouseDown={() => setEditingMember(null)}>
          <form className="modal member-modal" onMouseDown={e => e.stopPropagation()} onSubmit={handleEditSubmit}>
            <button type="button" className="modal-x" onClick={() => setEditingMember(null)}><X /></button>
            <span className="modal-icon"><Users /></span>
            <h2>Change member role / allocation</h2>
            <p>Update the access level and room allocation for <b>{editingMember.name}</b>.</p>
            {editError && <div className="form-error">{editError}</div>}

            <label>Member role
              <select value={editRole} onChange={e => handleEditRoleChange(e.target.value)}>
                <option value="owner">Owner / Admin</option>
                <option value="staff">Staff / Manager</option>
                <option value="resident">Resident / Tenant</option>
              </select>
            </label>

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
                      .map(b => <option key={b._id} value={b._id}>{b.label} {b._id === editingMember.bedId ? '(Currently Occupied)' : `(₹${b.monthlyRent}/mo)`}</option>)
                    }
                    {(properties.find(p => p._id === editPropertyId)?.rooms?.find(r => r._id === editRoomId)?.beds || [])
                      .filter(b => b.status === 'vacant' || b._id === editingMember.bedId).length === 0 && <option value="">No vacant beds available</option>
                    }
                  </select>
                </label>
              </div>
            )}

            {editingMember.status === 'invited' && (
              <div style={{ marginTop: '14px', borderTop: '1px dashed #dce3de', paddingTop: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <p className="eyebrow" style={{ color: '#9b6919', marginBottom: '4px' }}>Pending Invitation</p>
                <div style={{ background: '#fff9e6', border: '1px solid #ffe8cc', borderRadius: '8px', padding: '10px 12px', fontSize: '11px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#9b6919', fontWeight: '500', lineHeight: '1.4', textAlign: 'left' }}>User has not registered yet. If they lost or missed their link:</span>
                  <button
                    type="button"
                    className="primary"
                    onClick={() => {
                      const memberToResend = editingMember;
                      setEditingMember(null);
                      handleResendInvite(memberToResend);
                    }}
                    style={{ background: '#e28743', borderColor: '#e28743', fontSize: '10px', height: '28px', padding: '0 10px', flexShrink: 0, marginLeft: '10px', boxShadow: 'none' }}
                  >
                    Resend Link
                  </button>
                </div>
              </div>
            )}

            <div className="role-explainer">
              <ShieldCheck />
              <span>
                <b>{editRole === 'owner' ? 'Full owner access' : editRole === 'staff' ? 'Operational access' : 'Personal resident access'}</b>
                <small>{roleCopy[editRole]}</small>
              </span>
            </div>

            <div className="modal-actions">
              <button type="button" className="secondary" onClick={() => setEditingMember(null)}>Cancel</button>
              <button className="primary" disabled={updating}>{updating ? 'Updating…' : 'Save Changes'}</button>
            </div>
          </form>
        </div>
      )}

      {toast && <div className="toast">✓ {toast}</div>}
    </div>
  );
}
export default MembersPage;
