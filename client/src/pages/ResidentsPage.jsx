import React, { useState, useEffect, useMemo } from 'react';
import { Search, Plus, User, Building, Phone, Mail, ChevronRight, X, UserCheck, CreditCard, AlertCircle, FilePlus, Sparkles } from 'lucide-react';
import RecordPaymentModal from '../components/RecordPaymentModal.jsx';
import ReceiptModal from '../components/ReceiptModal.jsx';
import { money } from '../utils/formatters.js';

export default function ResidentsPage({ session, properties = [], members = [], onRefresh }) {
  const [residents, setResidents] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  
  // Drawer state
  const [selectedResident, setSelectedResident] = useState(null);
  
  // Modals state
  const [payModal, setPayModal] = useState(false);
  const [payPreselectedInvoice, setPayPreselectedInvoice] = useState(null);
  const [invoiceModal, setInvoiceModal] = useState(false);
  const [receiptPayment, setReceiptPayment] = useState(null);
  const [toast, setToast] = useState('');

  // Invoice Form Fields
  const [invoiceForm, setInvoiceForm] = useState({
    purpose: 'rent',
    amount: '',
    invoiceMonth: new Date().toISOString().slice(0, 7) // YYYY-MM
  });
  const [invoiceError, setInvoiceError] = useState('');
  const [invoiceSaving, setInvoiceSaving] = useState(false);

  const notify = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const fetchResidentsAndPayments = () => {
    const fetchRes = fetch('/api/tenant/residents', {
      headers: { Authorization: `Bearer ${session.accessToken}`, 'x-organization-id': session.organizationId }
    }).then(r => r.ok ? r.json() : Promise.reject());

    const fetchPay = fetch('/api/tenant/payments', {
      headers: { Authorization: `Bearer ${session.accessToken}`, 'x-organization-id': session.organizationId }
    }).then(r => r.ok ? r.json() : Promise.reject());

    Promise.all([fetchRes, fetchPay])
      .then(([resData, payData]) => {
        setResidents(resData);
        setPayments(payData);
        
        // Refresh selected resident drawer if open
        if (selectedResident) {
          const updatedRes = resData.find(r => r._id === selectedResident._id);
          if (updatedRes) setSelectedResident(updatedRes);
        }
      })
      .catch(err => console.error("Error loading residents/payments:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchResidentsAndPayments();
  }, [session, selectedResident?._id]);

  // Find property, room, bed details for a resident
  const getResidentRoomDetails = (resident) => {
    if (!resident || !properties.length) return { propertyName: 'N/A', roomNumber: 'N/A', bedLabel: 'N/A', monthlyRent: 0 };
    const prop = properties.find(p => p._id === resident.propertyId);
    if (!prop) return { propertyName: 'N/A', roomNumber: 'N/A', bedLabel: 'N/A', monthlyRent: 0 };
    
    const room = prop.rooms?.find(r => r._id === resident.roomId);
    if (!room) return { propertyName: prop.name, roomNumber: 'N/A', bedLabel: 'N/A', monthlyRent: 0 };
    
    const bed = room.beds?.find(b => b._id === resident.bedId);
    return {
      propertyName: prop.name,
      roomNumber: room.number,
      bedLabel: bed ? bed.label : 'N/A',
      monthlyRent: bed ? bed.monthlyRent : 0
    };
  };

  // Get outstanding dues for a resident
  const getResidentDues = (resId) => {
    const resPayments = payments.filter(p => p.residentId?._id === resId || p.residentId === resId);
    let totalDues = 0;
    let pendingCount = 0;
    
    resPayments.forEach(p => {
      if (['due', 'pending', 'partially_paid'].includes(p.status)) {
        totalDues += Math.max(0, p.amount - (p.receivedAmount || 0));
        pendingCount++;
      }
    });
    return { totalDues, pendingCount };
  };

  // Filter residents
  const filteredResidents = useMemo(() => {
    return residents.filter(r => {
      const matchSearch = r.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (r.mobile && r.mobile.includes(searchQuery)) ||
                          (r.email && r.email.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchStatus = statusFilter === 'all' ? true : r.status === statusFilter;
      
      const { totalDues } = getResidentDues(r._id);
      let matchPayment = true;
      if (paymentFilter === 'due') {
        matchPayment = totalDues > 0;
      } else if (paymentFilter === 'paid') {
        matchPayment = totalDues === 0;
      }

      return matchSearch && matchStatus && matchPayment;
    });
  }, [residents, payments, searchQuery, statusFilter, paymentFilter]);

  const handleCreateInvoiceSubmit = async (e) => {
    e.preventDefault();
    setInvoiceError('');
    setInvoiceSaving(true);
    
    try {
      const details = getResidentRoomDetails(selectedResident);
      const response = await fetch('/api/tenant/invoices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.accessToken}`,
          'x-organization-id': session.organizationId
        },
        body: JSON.stringify({
          propertyId: selectedResident.propertyId,
          residentId: selectedResident._id,
          invoiceMonth: invoiceForm.invoiceMonth,
          purpose: invoiceForm.purpose,
          amount: Number(invoiceForm.amount)
        })
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Failed to raise invoice');
      
      notify('New invoice raised successfully!');
      setInvoiceModal(false);
      setInvoiceForm({ purpose: 'rent', amount: '', invoiceMonth: new Date().toISOString().slice(0, 7) });
      fetchResidentsAndPayments();
    } catch (err) {
      setInvoiceError(err.message || 'Could not save invoice.');
    } finally {
      setInvoiceSaving(false);
    }
  };

  // Filter payments for selected resident in the drawer
  const selectedResidentPayments = useMemo(() => {
    if (!selectedResident) return [];
    return payments.filter(p => p.residentId?._id === selectedResident._id || p.residentId === selectedResident._id);
  }, [payments, selectedResident]);

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading residents data...</div>;
  }

  return (
    <div className="residents-page" style={{ position: 'relative', minHeight: '80vh' }}>
      <div className="setup-heading">
        <div>
          <p className="eyebrow">Resident Management</p>
          <h1>Residents Directory</h1>
          <p>View active occupancies, check payment ledger status, and record offline cash transactions.</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="payments-filters-row">
        <div className="search">
          <Search size={18} />
          <input 
            placeholder="Search residents by name, phone or email..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        <select 
          value={statusFilter} 
          onChange={e => setStatusFilter(e.target.value)}
        >
          <option value="all">All Residency States</option>
          <option value="active">Active Residents</option>
          <option value="draft">Drafts</option>
          <option value="notice_period">In Notice Period</option>
          <option value="checked_out">Checked Out</option>
        </select>

        <select 
          value={paymentFilter} 
          onChange={e => setPaymentFilter(e.target.value)}
        >
          <option value="all">All Payment States</option>
          <option value="due">With Outstanding Dues</option>
          <option value="paid">Fully Paid</option>
        </select>
      </div>

      {/* Grid of Residents */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
        {filteredResidents.map(res => {
          const { propertyName, roomNumber, bedLabel, monthlyRent } = getResidentRoomDetails(res);
          const { totalDues, pendingCount } = getResidentDues(res._id);
          
          const hasInvoices = payments.some(p => p.residentId?._id === res._id || p.residentId === res._id);
          
          return (
            <div 
              key={res._id} 
              className="card" 
              onClick={() => setSelectedResident(res)}
              style={{ 
                padding: '20px', 
                cursor: 'pointer', 
                transition: 'transform 0.2s, box-shadow 0.2s', 
                border: selectedResident?._id === res._id ? '2px solid var(--green)' : '1px solid var(--border)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                position: 'relative'
              }}
              onMouseOver={e => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.05)';
              }}
              onMouseOut={e => {
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ display: 'grid', placeItems: 'center', width: '38px', height: '38px', background: 'var(--app-bg)', borderRadius: '10px', color: 'var(--muted)' }}>
                      <User size={18} />
                    </span>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '700' }}>{res.name}</h3>
                      <small style={{ color: 'var(--text-muted)' }}>Status: <span style={{ textTransform: 'capitalize', fontWeight: '600' }}>{res.status.replace('_', ' ')}</span></small>
                    </div>
                  </div>
                  {totalDues > 0 ? (
                    <span className="pill overdue" style={{ color: 'var(--color-danger)', backgroundColor: 'var(--color-danger-bg)' }}>
                      ₹{new Intl.NumberFormat('en-IN').format(totalDues)} Due
                    </span>
                  ) : hasInvoices ? (
                    <span className="pill paid" style={{ color: 'var(--color-success)', backgroundColor: 'var(--color-success-bg)' }}>
                      Fully Paid
                    </span>
                  ) : (
                    <span className="pill pending" style={{ color: 'var(--color-info)', backgroundColor: 'var(--color-info-bg)' }}>
                      No Invoice Raised
                    </span>
                  )}
                </div>

                <div style={{ display: 'grid', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Building size={14} /> <span>{propertyName} · Rm {roomNumber} · {bedLabel}</span></div>
                  {res.mobile && <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Phone size={14} /> <span>{res.mobile}</span></div>}
                  {res.email && <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Mail size={14} /> <span>{res.email}</span></div>}
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--border)', marginTop: '16px', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Check-in: {new Date(res.checkInDate).toLocaleDateString('en-IN')}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--green)', fontSize: '13px', fontWeight: '600' }}>
                  View Profile <ChevronRight size={14} />
                </span>
              </div>
            </div>
          );
        })}

        {filteredResidents.length === 0 && (
          <div style={{ gridColumn: '1 / -1', padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No residents found matching the search/filter criteria.
          </div>
        )}
      </div>

      {/* Resident Profile Drawer (Side Pane) */}
      {selectedResident && (
        <div 
          className="drawer-backdrop" 
          onClick={() => setSelectedResident(null)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.4)',
            zIndex: 100,
            display: 'flex',
            justifyContent: 'flex-end',
            animation: 'fadeIn 0.2s ease-out'
          }}
        >
          <div 
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '550px',
              height: '100%',
              background: 'var(--modal-bg)',
              borderLeft: '1px solid var(--border)',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '-8px 0 32px rgba(0,0,0,0.1)',
              animation: 'slideIn 0.3s cubic-bezier(0.25, 1, 0.5, 1)'
            }}
          >
            {/* Drawer Header */}
            <div style={{ padding: '24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ display: 'grid', placeItems: 'center', width: '42px', height: '42px', background: 'var(--green)', color: '#fff', borderRadius: '12px' }}><User size={20} /></span>
                <div>
                  <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '800' }}>{selectedResident.name}</h2>
                  <small style={{ color: 'var(--text-muted)' }}>Check-in: {new Date(selectedResident.checkInDate).toLocaleDateString('en-IN')}</small>
                </div>
              </div>
              <button 
                onClick={() => setSelectedResident(null)}
                style={{ border: 0, background: 'transparent', color: 'var(--text-muted)', padding: '6px', borderRadius: '50%' }}
                onMouseOver={e => e.currentTarget.style.background = 'var(--app-bg)'}
                onMouseOut={e => e.currentTarget.style.background = 'transparent'}
              ><X size={20} /></button>
            </div>

            {/* Drawer Content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              {/* Room Rent details */}
              <div className="card drawer-grid" style={{ padding: '16px', background: 'var(--app-bg)' }}>
                <div>
                  <small style={{ color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase' }}>PG & Room assignment</small>
                  <p style={{ margin: '4px 0 0 0', fontWeight: '700', fontSize: '14px' }}>
                    {getResidentRoomDetails(selectedResident).propertyName}
                  </p>
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                    Room {getResidentRoomDetails(selectedResident).roomNumber} · {getResidentRoomDetails(selectedResident).bedLabel}
                  </span>
                </div>
                <div>
                  <small style={{ color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase' }}>Monthly Base Rent</small>
                  <p style={{ margin: '4px 0 0 0', fontWeight: '700', fontSize: '15px', color: 'var(--green)' }}>
                    {money(getResidentRoomDetails(selectedResident).monthlyRent)}
                  </p>
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Security Deposit: {money(selectedResident.securityDeposit || 0)}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '10px' }}>
                <button 
                  className="primary" 
                  onClick={() => {
                    setPayPreselectedInvoice(null);
                    setPayModal(true);
                  }}
                  style={{ flex: 1, backgroundColor: 'var(--green)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                >
                  <CreditCard size={16} /> Record Cash Payment
                </button>
                
                <button 
                  className="secondary" 
                  onClick={() => setInvoiceModal(true)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                >
                  <FilePlus size={16} /> Add Charge (Invoice)
                </button>
              </div>

              {/* Dues Alert Banner */}
              {getResidentDues(selectedResident._id).totalDues > 0 && (
                <div style={{ display: 'flex', gap: '10px', padding: '12px 16px', background: 'var(--color-danger-bg)', border: '1px solid rgba(255, 69, 58, 0.1)', borderRadius: '10px', color: 'var(--color-danger)', fontSize: '13px' }}>
                  <AlertCircle size={18} style={{ flexShrink: 0 }} />
                  <div>
                    <b>Outstanding Balance: {money(getResidentDues(selectedResident._id).totalDues)}</b>
                    <p style={{ margin: '2px 0 0 0', color: 'var(--text-secondary)' }}>Across {getResidentDues(selectedResident._id).pendingCount} unpaid billing items. Record a payment to close these balances.</p>
                  </div>
                </div>
              )}

              {/* Personal details */}
              <div>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '12px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Contact Information</h4>
                <div style={{ display: 'grid', gap: '8px', fontSize: '13px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Mobile Phone:</span>
                    <b>{selectedResident.mobile || 'N/A'}</b>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Email Address:</span>
                    <b>{selectedResident.email || 'N/A'}</b>
                  </div>
                </div>
              </div>

              {/* Emergency Contact */}
              {selectedResident.emergencyContact && (
                <div>
                  <h4 style={{ margin: '0 0 10px 0', fontSize: '12px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Emergency Contact</h4>
                  <div style={{ display: 'grid', gap: '8px', fontSize: '13px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Contact Name:</span>
                      <b>{selectedResident.emergencyContact.name || 'N/A'}</b>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Relationship:</span>
                      <b>{selectedResident.emergencyContact.relation || 'N/A'}</b>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Phone:</span>
                      <b>{selectedResident.emergencyContact.mobile || 'N/A'}</b>
                    </div>
                  </div>
                </div>
              )}

              {/* Ledger ledger history */}
              <div>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '12px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Unified Ledger (Invoices & Payments)</h4>
                <div style={{ display: 'grid', gap: '10px' }}>
                  {selectedResidentPayments.map(p => {
                    const outstanding = p.amount - (p.receivedAmount || 0);
                    return (
                      <div 
                        key={p._id} 
                        className="card" 
                        style={{ padding: '12px 14px', border: '1px solid var(--border)', background: 'var(--card-bg)', fontSize: '13px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <b style={{ textTransform: 'capitalize' }}>{p.purpose} ({p.invoiceMonth})</b>
                            <span className={`pill ${p.status.toLowerCase().replace('_', '-')}`} style={{ fontSize: '10px', padding: '2px 6px' }}>
                              {p.status.replace('_', ' ')}
                            </span>
                          </div>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            Expected: {money(p.amount)} · Paid: {money(p.receivedAmount || 0)}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {outstanding > 0 && (
                            <button 
                              className="text-button" 
                              onClick={() => {
                                setPayPreselectedInvoice(p);
                                setPayModal(true);
                              }}
                              style={{ color: 'var(--green)', fontSize: '12px', fontWeight: 'bold' }}
                            >
                              Collect
                            </button>
                          )}
                          {p.status === 'paid' && (
                            <button 
                              className="text-button" 
                              onClick={() => setReceiptPayment(p)}
                              style={{ color: 'var(--green)', fontSize: '12px' }}
                            >
                              Receipt
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {selectedResidentPayments.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '16px', color: 'var(--text-muted)', fontSize: '13px' }}>
                      No ledger history found for this resident.
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {payModal && (
        <RecordPaymentModal
          session={session}
          onClose={() => setPayModal(false)}
          onSuccess={(msg) => {
            notify(msg);
            fetchResidentsAndPayments();
          }}
          preselectedResident={selectedResident}
          preselectedInvoice={payPreselectedInvoice}
          residents={residents}
          payments={payments}
        />
      )}

      {/* Invoice modal */}
      {invoiceModal && (
        <div className="modal-backdrop" onMouseDown={() => setInvoiceModal(false)}>
          <form className="modal" onMouseDown={e => e.stopPropagation()} onSubmit={handleCreateInvoiceSubmit} style={{ maxWidth: '400px' }}>
            <button type="button" className="modal-x" onClick={() => setInvoiceModal(false)}><X size={18} /></button>
            <span className="modal-icon" style={{ backgroundColor: 'var(--mint)', color: 'var(--green)' }}><FilePlus /></span>
            <h2>Raise New Invoice</h2>
            <p>Create a due billing item for {selectedResident?.name}.</p>

            {invoiceError && (
              <div className="alert danger" style={{ padding: '8px 12px', fontSize: '12px', marginBottom: '12px', display: 'flex', gap: '6px' }}>
                <AlertCircle size={14} />
                <span>{invoiceError}</span>
              </div>
            )}

            <div style={{ display: 'grid', gap: '12px', textAlign: 'left' }}>
              <label>Billing Purpose
                <select 
                  value={invoiceForm.purpose} 
                  onChange={e => setInvoiceForm(prev => ({ ...prev, purpose: e.target.value }))}
                  required
                >
                  <option value="rent">Rent</option>
                  <option value="security_deposit">Security Deposit</option>
                  <option value="electricity">Electricity</option>
                  <option value="water">Water</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="fine">Fine</option>
                  <option value="other">Other</option>
                </select>
              </label>

              <label>Amount Due (₹)
                <input 
                  type="number" 
                  min="1" 
                  value={invoiceForm.amount} 
                  onChange={e => setInvoiceForm(prev => ({ ...prev, amount: e.target.value }))}
                  placeholder="e.g. 8500" 
                  required 
                />
              </label>

              <label>Invoice Month
                <input 
                  type="month" 
                  value={invoiceForm.invoiceMonth} 
                  onChange={e => setInvoiceForm(prev => ({ ...prev, invoiceMonth: e.target.value }))}
                  required 
                />
              </label>
            </div>

            <div className="modal-actions" style={{ marginTop: '16px' }}>
              <button type="button" className="secondary" onClick={() => setInvoiceModal(false)} disabled={invoiceSaving}>Cancel</button>
              <button className="primary" style={{ backgroundColor: 'var(--green)' }} disabled={invoiceSaving}>
                {invoiceSaving ? 'Creating...' : 'Raise Invoice'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Receipt Modal */}
      {receiptPayment && (
        <ReceiptModal 
          payment={receiptPayment}
          onClose={() => setReceiptPayment(null)}
          pgName={getResidentRoomDetails(selectedResident).propertyName}
        />
      )}

      {toast && <div className="toast">✓ {toast}</div>}
    </div>
  );
}
