import React, { useState, useEffect, useMemo } from 'react';
import { Search, Plus, IndianRupee, Printer, Edit2, Trash2, Calendar, FileText, Check, X, ShieldAlert, ArrowRightLeft } from 'lucide-react';
import RecordPaymentModal from '../components/RecordPaymentModal.jsx';
import ReceiptModal from '../components/ReceiptModal.jsx';
import SettlementDetailsModal from '../components/SettlementDetailsModal.jsx';
import OwnerAnalyticsCard from '../components/OwnerAnalyticsCard.jsx';
import NotificationCenter from '../components/NotificationCenter.jsx';
import ResidentPaymentModal from '../components/ResidentPaymentModal.jsx';
import { money, formatInvoicePeriod } from '../utils/formatters.js';

export default function PaymentsPage({ session, properties = [], members = [], userRole, upiId, bankDetails, directSettlementEnabled, onlineGatewayEnabled, onRefresh }) {
  const [payments, setPayments] = useState([]);
  const [residents, setResidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [analytics, setAnalytics] = useState(null);
  const [selectedSettlement, setSelectedSettlement] = useState(null);

  // Filters
  const [methodFilter, setMethodFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [purposeFilter, setPurposeFilter] = useState('all');

  // Modals state
  const [recordModal, setRecordModal] = useState(false);
  const [receiptPayment, setReceiptPayment] = useState(null);

  useEffect(() => {
    if (!session?.accessToken || userRole === 'resident') return;
    fetch('/api/tenant/settlements/analytics', {
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        'x-organization-id': session.organizationId
      }
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => setAnalytics(data))
      .catch(() => { });
  }, [session, userRole]);
  const [editPayment, setEditPayment] = useState(null);
  const [deletePaymentId, setDeletePaymentId] = useState(null);
  const [toast, setToast] = useState('');
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentStatusText, setPaymentStatusText] = useState('');
  const [showResidentPayModal, setShowResidentPayModal] = useState(false);
  const [paymentForResidentModal, setPaymentForResidentModal] = useState(null);
  const [viewScreenshotUrl, setViewScreenshotUrl] = useState('');
  const [approvePaymentId, setApprovePaymentId] = useState(null);
  const [approveStatusOption, setApproveStatusOption] = useState('pending');
  const [paymentForRecord, setPaymentForRecord] = useState(null);

  const handleApproveOffline = async (paymentId) => {
    setPaymentLoading(true);
    setPaymentStatusText('Approving offline payment...');
    try {
      const response = await fetch(`/api/tenant/payments/${paymentId}/approve-offline`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          'x-organization-id': session.organizationId
        }
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Failed to approve payment.');

      notify('Offline payment approved and verified successfully.');
      loadData();
      if (onRefresh) onRefresh();
    } catch (err) {
      notify(`Error: ${err.message}`);
    } finally {
      setPaymentLoading(false);
      setPaymentStatusText('');
    }
  };

  const handlePayOnline = async (paymentId, amount, label) => {
    setPaymentLoading(true);
    setPaymentStatusText("Initializing gateway...");
    try {
      const orderResponse = await fetch(`/api/tenant/payments/${paymentId}/initiate-charge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.accessToken}`,
          'x-organization-id': session.organizationId
        }
      });

      const orderData = await orderResponse.json();
      if (!orderResponse.ok) {
        throw new Error(orderData.message || "Failed to create order on server.");
      }

      if (!orderData.paymentSessionId) {
        throw new Error("Online payment gateway response is invalid (missing paymentSessionId).");
      }

      const { processCashfreePaymentDirect } = await import('../utils/cashfreeDirect.js');
      await processCashfreePaymentDirect({
        orderData,
        session,
        amountLabel: `${label} (₹${amount})`,
        onSuccess: (msg) => {
          notify(msg);
          loadData();
          if (onRefresh) onRefresh();
        },
        onFailure: (msg) => {
          notify(`Payment failed: ${msg}`);
        },
        onProgress: (loading, text) => {
          setPaymentLoading(loading);
          setPaymentStatusText(text);
        }
      });
    } catch (err) {
      notify(`Payment failed: ${err.message}`);
      setPaymentLoading(false);
      setPaymentStatusText('');
    }
  };
  const [actionError, setActionError] = useState('');
  const [actionSaving, setActionSaving] = useState(false);

  // Edit fields
  const [editForm, setEditForm] = useState({
    amount: '',
    receivedAmount: '',
    invoiceMonth: '',
    purpose: '',
    referenceNumber: '',
    notes: '',
    status: ''
  });

  const notify = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const loadData = () => {
    const fetchPay = fetch('/api/tenant/payments', {
      headers: { Authorization: `Bearer ${session.accessToken}`, 'x-organization-id': session.organizationId }
    }).then(r => r.ok ? r.json() : Promise.reject());

    const fetchRes = fetch('/api/tenant/residents', {
      headers: { Authorization: `Bearer ${session.accessToken}`, 'x-organization-id': session.organizationId }
    }).then(r => r.ok ? r.json() : Promise.reject());

    Promise.all([fetchPay, fetchRes])
      .then(([payData, resData]) => {
        setPayments(payData);
        setResidents(resData);
      })
      .catch(err => console.error("Error loading payments list:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [session]);

  // Compute stats dynamically
  const stats = useMemo(() => {
    let collectedToday = 0;
    let collectedMonth = 0;
    let outstanding = 0;
    let totalRevenue = 0;

    const todayStr = new Date().toDateString();
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    payments.forEach(p => {
      // Sum all collections
      totalRevenue += p.receivedAmount || 0;

      // Sum outstanding dues
      if (['due', 'pending', 'partially_paid'].includes(p.status)) {
        outstanding += Math.max(0, p.amount - (p.receivedAmount || 0));
      }

      // Sum cash collected specifically
      if (p.transactions) {
        p.transactions.forEach(t => {
          const tDate = new Date(t.paidAt);
          if (t.method === 'cash') {
            if (tDate.toDateString() === todayStr) {
              collectedToday += t.amount;
            }
            if (tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear) {
              collectedMonth += t.amount;
            }
          }
        });
      } else if (p.status === 'paid' && p.method === 'cash') {
        const pDate = new Date(p.paidAt || p.updatedAt);
        if (pDate.toDateString() === todayStr) {
          collectedToday += p.amount;
        }
        if (pDate.getMonth() === currentMonth && pDate.getFullYear() === currentYear) {
          collectedMonth += p.amount;
        }
      }
    });

    return { collectedToday, collectedMonth, outstanding, totalRevenue };
  }, [payments]);

  // Filter payments
  const filteredPayments = useMemo(() => {
    return payments.filter(p => {
      const resName = p.residentId?.name || p.name || 'Resident';
      const refNum = p.referenceNumber || '';

      const matchSearch = resName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.invoiceMonth.includes(searchQuery) ||
        refNum.toLowerCase().includes(searchQuery.toLowerCase());

      const matchMethod = methodFilter === 'all' ? true : p.method === methodFilter;
      const matchStatus = statusFilter === 'all' ? true : p.status === statusFilter;
      const matchPurpose = purposeFilter === 'all' ? true : p.purpose === purposeFilter;

      return matchSearch && matchMethod && matchStatus && matchPurpose;
    });
  }, [payments, searchQuery, methodFilter, statusFilter, purposeFilter]);

  // Open edit modal
  const handleEditClick = (p) => {
    setEditPayment(p);
    setEditForm({
      amount: p.amount,
      receivedAmount: p.receivedAmount || 0,
      invoiceMonth: p.invoiceMonth,
      purpose: p.purpose,
      referenceNumber: p.referenceNumber || '',
      notes: p.notes || '',
      status: p.status
    });
    setActionError('');
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setActionSaving(true);
    setActionError('');

    try {
      const response = await fetch(`/api/tenant/payments/${editPayment._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.accessToken}`,
          'x-organization-id': session.organizationId
        },
        body: JSON.stringify({
          amount: Number(editForm.amount),
          receivedAmount: Number(editForm.receivedAmount),
          invoiceMonth: editForm.invoiceMonth,
          purpose: editForm.purpose,
          referenceNumber: editForm.referenceNumber,
          notes: editForm.notes,
          status: editForm.status
        })
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Failed to update payment record');

      notify('Payment record updated successfully.');
      setEditPayment(null);
      loadData();
      if (onRefresh) onRefresh();
    } catch (err) {
      setActionError(err.message || 'Failed to update record.');
    } finally {
      setActionSaving(false);
    }
  };

  const handleDeleteSubmit = async () => {
    setActionSaving(true);
    setActionError('');

    try {
      const response = await fetch(`/api/tenant/payments/${deletePaymentId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          'x-organization-id': session.organizationId
        }
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Failed to delete payment record');

      notify('Payment record deleted successfully.');
      setDeletePaymentId(null);
      loadData();
      if (onRefresh) onRefresh();
    } catch (err) {
      setActionError(err.message || 'Failed to delete record.');
    } finally {
      setActionSaving(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading payments data...</div>;
  }

  return (
    <div className="payments-page">
      <div className="setup-heading">
        <div>
          <p className="eyebrow">Financial Ledger</p>
          <h1>Payments Ledger</h1>
          <p>Track cash, card, UPI, bank transfers, and online settlement status in a single unified ledger.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <NotificationCenter session={session} onSelectPayment={(p) => setSelectedSettlement(p)} />
          {userRole !== 'resident' && (
            <button className="primary" onClick={() => setRecordModal(true)} style={{ backgroundColor: 'var(--green)' }}>
              <Plus size={17} /> Record Cash Payment
            </button>
          )}
        </div>
      </div>

      {/* Metrics Bar */}
      <div className="room-stats" style={{ marginBottom: '30px' }}>
        <article className="card metric" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <small style={{ textTransform: 'uppercase', fontSize: '10px', color: 'var(--text-muted)' }}>Cash Collected Today</small>
          <strong style={{ color: 'var(--green)', fontSize: '20px' }}>{money(stats.collectedToday)}</strong>
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Offline cash reconciliation</span>
        </article>

        <article className="card metric" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <small style={{ textTransform: 'uppercase', fontSize: '10px', color: 'var(--text-muted)' }}>Cash This Month</small>
          <strong style={{ color: 'var(--green)', fontSize: '20px' }}>{money(stats.collectedMonth)}</strong>
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>June Collections</span>
        </article>

        <article className="card metric" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <small style={{ textTransform: 'uppercase', fontSize: '10px', color: 'var(--text-muted)' }}>Outstanding Rent</small>
          <strong style={{ color: 'var(--color-danger)', fontSize: '20px' }}>{money(stats.outstanding)}</strong>
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Due from residents</span>
        </article>

        <article className="card metric" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <small style={{ textTransform: 'uppercase', fontSize: '10px', color: 'var(--text-muted)' }}>Total Revenue (All)</small>
          <strong style={{ color: 'var(--green)', fontSize: '20px' }}>{money(stats.totalRevenue)}</strong>
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Unified ledger total</span>
        </article>
      </div>

      {userRole !== 'resident' && analytics && (
        <OwnerAnalyticsCard analytics={analytics} onSelectPayment={(p) => setSelectedSettlement(p)} />
      )}

      {/* Filters and Search Bar */}
      <div className="payments-filters-row">
        <div className="search">
          <Search size={18} />
          <input
            placeholder="Search by resident name, month, receipt number..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        <select
          value={methodFilter}
          onChange={e => setMethodFilter(e.target.value)}
        >
          <option value="all">All Methods</option>
          <option value="cash">Cash Payments</option>
          <option value="upi">UPI</option>
          <option value="bank_transfer">Bank Transfer</option>
          <option value="card">Cards</option>
          <option value="online_gateway">Online Gateway</option>
        </select>

        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
        >
          <option value="all">All Statuses</option>
          <option value="paid">Paid</option>
          <option value="partially_paid">Partially Paid</option>
          <option value="due">Overdue / Due</option>
          <option value="pending">Pending</option>
        </select>

        <select
          value={purposeFilter}
          onChange={e => setPurposeFilter(e.target.value)}
        >
          <option value="all">All Purposes</option>
          <option value="rent">Rent</option>
          <option value="security_deposit">Security Deposit</option>
          <option value="electricity">Electricity</option>
          <option value="water">Water</option>
          <option value="maintenance">Maintenance</option>
          <option value="fine">Fine</option>
          <option value="other">Other</option>
        </select>
      </div>

      {/* Ledger Table */}
      <section className="card" style={{ padding: 0, overflowX: 'auto' }}>
        <div style={{ minWidth: '800px' }}>
          <div className="tr table-head" style={{ borderBottom: '1px solid var(--border)', padding: '14px 20px', background: 'var(--table-head-bg)', display: 'flex', alignItems: 'center' }}>
            <span style={{ flex: 1.5 }}>Resident</span>
            <span style={{ flex: 1 }}>Purpose & Month</span>
            <span style={{ flex: 1, textAlign: 'right' }}>Total Invoice</span>
            <span style={{ flex: 1, textAlign: 'right' }}>Amount Paid</span>
            <span style={{ flex: 1.2, textAlign: 'center' }}>Method</span>
            <span style={{ flex: 1.2, textAlign: 'center' }}>Status</span>
            <span style={{ flex: 1.5, textAlign: 'right' }}>Actions</span>
          </div>

          {filteredPayments.map(p => {
            const resName = p.residentId?.name || p.name || 'Resident';
            const initials = resName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();

            // Map status classes
            let statusClass = p.status.toLowerCase().replace('_', '-');
            let statusLabel = p.status.replace('_', ' ');

            if (p.referenceNumber && p.status !== 'paid') {
              statusClass = 'pending-verification';
              statusLabel = 'Pending Verification';
            }

            const colors = ['#efb36f', '#7ab4aa', '#8ca4d8', '#c196d2', '#d97b7b'];
            const charCodeSum = resName.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
            const avatarColor = colors[charCodeSum % colors.length];

            const isCash = p.method === 'cash' || (!p.method && p.status === 'paid');

            return (
              <div
                key={p._id}
                style={{
                  borderBottom: '1px solid var(--border)',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'background 0.2s',
                  minWidth: '800px'
                }}
                onMouseOver={e => e.currentTarget.style.backgroundColor = 'var(--table-row-hover)'}
                onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                {/* Main Row Columns */}
                <div
                  className="tr"
                  style={{
                    padding: '14px 20px',
                    borderBottom: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    width: '100%',
                    minWidth: '800px'
                  }}
                >
                  {/* Resident Details */}
                  <span className="resident" style={{ flex: 1.5, display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <i style={{ background: avatarColor, width: '30px', height: '30px', borderRadius: '50%', color: '#fff', fontStyle: 'normal', display: 'grid', placeItems: 'center', fontSize: '11px', fontWeight: 'bold' }}>{initials}</i>
                    <span style={{ display: 'flex', flexDirection: 'column' }}>
                      <b style={{ fontSize: '13px' }}>{resName}</b>
                      <small style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {p.propertyId?.name || 'Property'}
                      </small>
                    </span>
                  </span>

                  {/* Purpose & Month */}
                  <span style={{ flex: 1, display: 'flex', flexDirection: 'column', fontSize: '13px' }}>
                    <b style={{ textTransform: 'capitalize' }}>{p.purpose || 'rent'}</b>
                    <small style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{formatInvoicePeriod(p)}</small>
                  </span>

                  {/* Total invoice Expected */}
                  <strong style={{ flex: 1, textAlign: 'right', fontSize: '13px' }}>{money(p.amount)}</strong>

                  {/* Received Amount */}
                  <strong style={{ flex: 1, textAlign: 'right', fontSize: '13px', color: 'var(--green)' }}>
                    {money(p.receivedAmount || (p.status === 'paid' ? p.amount : 0))}
                  </strong>

                  {/* Payment Method Badge */}
                  <span style={{ flex: 1.2, textAlign: 'center' }}>
                    {p.method ? (
                      <span
                        className={`badge method-${p.method}`}
                        style={{
                          fontSize: '11px',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          textTransform: 'uppercase',
                          fontWeight: '700',
                          backgroundColor: p.method === 'cash' ? '#fde8e4' : '#e6efe9',
                          color: p.method === 'cash' ? '#b45309' : 'var(--green)',
                          border: p.method === 'cash' ? '1px solid #fed7aa' : '1px solid #c2ffd4',
                          whiteSpace: 'nowrap',
                          display: 'inline-block'
                        }}
                      >
                        {p.method === 'online_gateway' ? 'online' : p.method.replace('_', ' ')}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Unspecified</span>
                    )}
                  </span>

                  {/* Status Pill */}
                  <span style={{ flex: 1.2, textAlign: 'center' }}>
                    <span
                      className={`pill ${statusClass}`}
                      style={{
                        fontSize: '11px',
                        padding: '3px 8px',
                        textTransform: 'capitalize',
                        whiteSpace: 'nowrap',
                        display: 'inline-block',
                        ...(statusClass === 'pending-verification' ? {
                          backgroundColor: '#fef3c7',
                          color: '#d97706',
                          border: '1px solid #fde68a'
                        } : {})
                      }}
                    >
                      {statusLabel}
                    </span>
                  </span>

                  {/* Actions */}
                  <span style={{ flex: 1.5, display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                    {p.status !== 'paid' && (
                      userRole === 'resident' ? (
                        p.referenceNumber ? (
                          <button
                            type="button"
                            className="primary"
                            disabled
                            style={{
                              padding: '5px 10px',
                              fontSize: '11px',
                              backgroundColor: 'var(--border)',
                              color: 'var(--text-secondary)',
                              border: 'none',
                              borderRadius: '6px',
                              fontWeight: '600',
                              cursor: 'not-allowed'
                            }}
                          >
                            Pending
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="primary"
                            onClick={() => {
                              setPaymentForResidentModal(p);
                              setShowResidentPayModal(true);
                            }}
                            style={{
                              padding: '5px 10px',
                              fontSize: '11px',
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
                        )
                      ) : (
                        p.referenceNumber ? (
                          <button
                            type="button"
                            className="primary"
                            onClick={() => { setApprovePaymentId(p._id); setApproveStatusOption('pending'); }}
                            style={{
                              padding: '5px 10px',
                              fontSize: '11px',
                              backgroundColor: '#10b981',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '6px',
                              fontWeight: '600',
                              cursor: 'pointer'
                            }}
                          >
                            Approve Payment
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="primary"
                            onClick={() => setPaymentForRecord(p)}
                            style={{
                              padding: '5px 10px',
                              fontSize: '11px',
                              backgroundColor: 'var(--green)',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '6px',
                              fontWeight: '600',
                              cursor: 'pointer'
                            }}
                          >
                            Record Payment
                          </button>
                        )
                      )
                    )}

                    {p.status === 'paid' && (
                      <button
                        type="button"
                        title="View Settlement Details & Timeline"
                        onClick={() => setSelectedSettlement(p)}
                        style={{
                          padding: '4px 8px',
                          fontSize: '11px',
                          backgroundColor: '#ebf5ff',
                          color: '#2563eb',
                          border: '1px solid #bfdbfe',
                          borderRadius: '6px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <ArrowRightLeft size={12} /> Settlement
                      </button>
                    )}

                    <button
                      title="View & Print Receipt"
                      onClick={() => setReceiptPayment(p)}
                      style={{ border: '1px solid var(--border)', background: 'var(--card-bg)', padding: '6px', borderRadius: '6px', color: 'var(--text-primary)' }}
                    >
                      <Printer size={14} />
                    </button>

                    {isCash && userRole !== 'resident' && (
                      <>
                        <button
                          title="Edit Cash Payment"
                          onClick={() => handleEditClick(p)}
                          style={{ border: '1px solid var(--border)', background: 'var(--card-bg)', padding: '6px', borderRadius: '6px', color: 'var(--green)' }}
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          title="Delete Payment"
                          onClick={() => setDeletePaymentId(p._id)}
                          style={{ border: '1px solid var(--border)', background: 'var(--card-bg)', padding: '6px', borderRadius: '6px', color: 'red' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </span>
                </div>

                {/* Verification Details Sub-row */}
                {p.referenceNumber && p.status !== 'paid' && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 20px 10px 60px',
                    background: 'rgba(245, 158, 11, 0.04)',
                    borderTop: '1px dashed rgba(245, 158, 11, 0.15)',
                    fontSize: '11px',
                    color: '#b45309'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: '700', textTransform: 'uppercase', fontSize: '9px', letterSpacing: '0.5px', color: '#b45309', background: '#fef3c7', padding: '2px 6px', borderRadius: '4px' }}>Reported Info</span>
                      <span>Ref: <strong>{p.referenceNumber}</strong></span>
                      <span style={{ color: 'rgba(180, 83, 9, 0.2)' }}>|</span>
                      <span>Method: <strong style={{ textTransform: 'uppercase' }}>{p.method ? p.method.replace('_', ' ') : 'OFFLINE'}</strong></span>
                      <span style={{ color: 'rgba(180, 83, 9, 0.2)' }}>|</span>
                      <span>Reported Amount: <strong>{money(p.reportedAmount || p.amount)}</strong></span>
                    </div>

                    {p.screenshot && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setViewScreenshotUrl(p.screenshot);
                        }}
                        style={{
                          background: 'var(--green)',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '4px 10px',
                          cursor: 'pointer',
                          fontSize: '10px',
                          fontWeight: '700',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                          transition: 'opacity 0.15s'
                        }}
                        onMouseOver={e => e.currentTarget.style.opacity = '0.9'}
                        onMouseOut={e => e.currentTarget.style.opacity = '1'}
                      >
                        View Screenshot Proof
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {filteredPayments.length === 0 && (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              No transactions match the selected filters.
            </div>
          )}
        </div>
      </section>

      {/* Record Cash Payment Modal */}
      {(recordModal || paymentForRecord) && (
        <RecordPaymentModal
          session={session}
          onClose={() => {
            setRecordModal(false);
            setPaymentForRecord(null);
          }}
          onSuccess={(msg) => {
            setRecordModal(false);
            setPaymentForRecord(null);
            notify(msg);
            loadData();
            if (onRefresh) onRefresh();
          }}
          residents={residents}
          payments={payments}
          preselectedInvoice={paymentForRecord}
          preselectedResident={paymentForRecord?.residentId}
        />
      )}

      {/* Receipt Modal */}
      {receiptPayment && (
        <ReceiptModal
          payment={receiptPayment}
          properties={properties}
          onClose={() => setReceiptPayment(null)}
          pgName={properties[0]?.name || "StayZen Residency"}
        />
      )}

      {/* Edit Payment Modal */}
      {editPayment && (
        <div className="modal-backdrop" onMouseDown={() => setEditPayment(null)}>
          <form className="modal" onMouseDown={e => e.stopPropagation()} onSubmit={handleEditSubmit} style={{ maxWidth: '450px' }}>
            <button type="button" className="modal-x" onClick={() => setEditPayment(null)}><X size={18} /></button>
            <span className="modal-icon" style={{ backgroundColor: 'var(--mint)', color: 'var(--green)' }}><Edit2 /></span>
            <h2>Edit Cash Payment</h2>
            <p>Update ledger entry for {editPayment.residentId?.name || editPayment.name}.</p>

            {actionError && (
              <div className="alert danger" style={{ padding: '8px 12px', fontSize: '12px', marginBottom: '12px' }}>
                {actionError}
              </div>
            )}

            <div style={{ display: 'grid', gap: '12px', textAlign: 'left' }}>
              <div className="form-row">
                <label>Expected Amount (₹)
                  <input
                    type="number"
                    value={editForm.amount}
                    onChange={e => setEditForm(prev => ({ ...prev, amount: e.target.value }))}
                    required
                  />
                </label>

                <label>Received Amount (₹)
                  <input
                    type="number"
                    value={editForm.receivedAmount}
                    onChange={e => setEditForm(prev => ({ ...prev, receivedAmount: e.target.value }))}
                    required
                  />
                </label>
              </div>

              <div className="form-row">
                <label>Rent Month
                  <input
                    type="text"
                    value={editForm.invoiceMonth}
                    onChange={e => setEditForm(prev => ({ ...prev, invoiceMonth: e.target.value }))}
                    required
                  />
                </label>

                <label>Purpose
                  <select
                    value={editForm.purpose}
                    onChange={e => setEditForm(prev => ({ ...prev, purpose: e.target.value }))}
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
              </div>

              <div className="form-row">
                <label>Receipt/Ref Number
                  <input
                    value={editForm.referenceNumber}
                    onChange={e => setEditForm(prev => ({ ...prev, referenceNumber: e.target.value }))}
                  />
                </label>

                <label>Ledger Status
                  <select
                    value={editForm.status}
                    onChange={e => setEditForm(prev => ({ ...prev, status: e.target.value }))}
                    required
                  >
                    <option value="due">Due / Overdue</option>
                    <option value="pending">Pending</option>
                    <option value="partially_paid">Partially Paid</option>
                    <option value="paid">Fully Paid</option>
                    <option value="failed">Failed</option>
                    <option value="refunded">Refunded</option>
                  </select>
                </label>
              </div>

              <label>Notes
                <textarea
                  value={editForm.notes}
                  onChange={e => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                  rows={2}
                  style={{ width: '100%', padding: '8px', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--input-bg)', color: 'var(--text-primary)' }}
                />
              </label>
            </div>

            <div className="modal-actions" style={{ marginTop: '16px' }}>
              <button type="button" className="secondary" onClick={() => setEditPayment(null)} disabled={actionSaving}>Cancel</button>
              <button className="primary" style={{ backgroundColor: 'var(--green)' }} disabled={actionSaving}>
                {actionSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletePaymentId && (
        <div className="modal-backdrop" onMouseDown={() => setDeletePaymentId(null)}>
          <div className="modal" onMouseDown={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <button type="button" className="modal-x" onClick={() => setDeletePaymentId(null)}><X size={18} /></button>
            <span className="modal-icon" style={{ backgroundColor: 'var(--color-danger-bg)', color: 'var(--color-danger)' }}><ShieldAlert /></span>
            <h2>Delete Payment Record?</h2>
            <p style={{ color: 'var(--text-secondary)' }}>Are you sure you want to permanently delete this cash ledger entry? This action will reverse the credit status of the invoice and log the deletion in the audit trail.</p>

            {actionError && (
              <div className="alert danger" style={{ padding: '8px 12px', fontSize: '12px', marginBottom: '12px' }}>
                {actionError}
              </div>
            )}

            <div className="modal-actions">
              <button className="secondary" onClick={() => setDeletePaymentId(null)} disabled={actionSaving}>Cancel</button>
              <button
                type="button"
                className="primary"
                onClick={handleDeleteSubmit}
                disabled={actionSaving}
                style={{ backgroundColor: 'var(--color-danger)' }}
              >
                {actionSaving ? 'Deleting...' : 'Permanently Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approve Confirmation Modal */}
      {approvePaymentId && (
        <div className="modal-backdrop" onMouseDown={() => setApprovePaymentId(null)}>
          <div className="modal" onMouseDown={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <button type="button" className="modal-x" onClick={() => setApprovePaymentId(null)}><X size={18} /></button>
            <span className="modal-icon" style={{ backgroundColor: 'var(--mint)', color: 'var(--green)' }}><Check size={20} /></span>
            <h2>Confirm Payment Action</h2>
            <p style={{ color: 'var(--text-secondary)' }}>Select how to process this reported offline payment. Default is pending to prevent accidental clicks:</p>

            <div style={{ marginTop: '16px', marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
                <input
                  type="radio"
                  name="approveOption"
                  value="pending"
                  checked={approveStatusOption === 'pending'}
                  onChange={() => setApproveStatusOption('pending')}
                />
                <span><strong>Keep Pending Verification</strong> (No change)</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: 'var(--green)' }}>
                <input
                  type="radio"
                  name="approveOption"
                  value="received"
                  checked={approveStatusOption === 'received'}
                  onChange={() => setApproveStatusOption('received')}
                />
                <span><strong>Mark as Paid (Received)</strong> (Credits account & sends receipt)</span>
              </label>
            </div>

            <div className="modal-actions">
              <button className="secondary" onClick={() => setApprovePaymentId(null)} disabled={paymentLoading}>Cancel</button>
              {approveStatusOption === 'received' ? (
                <button
                  type="button"
                  className="primary"
                  onClick={async () => {
                    const id = approvePaymentId;
                    setApprovePaymentId(null);
                    await handleApproveOffline(id);
                  }}
                  disabled={paymentLoading}
                  style={{ backgroundColor: 'var(--green)' }}
                >
                  {paymentLoading ? 'Approving...' : 'Confirm & Mark Paid'}
                </button>
              ) : (
                <button
                  type="button"
                  className="primary"
                  onClick={() => setApprovePaymentId(null)}
                  style={{ backgroundColor: 'var(--text-secondary)' }}
                >
                  Close (Keep Pending)
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {showResidentPayModal && paymentForResidentModal && (
        <ResidentPaymentModal
          session={session}
          payment={paymentForResidentModal}
          upiId={upiId}
          bankDetails={bankDetails}
          directSettlementEnabled={directSettlementEnabled}
          onlineGatewayEnabled={onlineGatewayEnabled}
          pgName={properties[0]?.name || "StayZen Residency"}
          onClose={() => {
            setShowResidentPayModal(false);
            setPaymentForResidentModal(null);
          }}
          onSuccess={(msg) => {
            notify(msg);
            loadData();
            if (onRefresh) onRefresh();
          }}
          handlePayOnline={handlePayOnline}
        />
      )}

      {viewScreenshotUrl && (
        <div className="modal-backdrop" onMouseDown={() => setViewScreenshotUrl('')} style={{ display: 'grid', placeItems: 'center', zIndex: 1100 }}>
          <div className="modal" onMouseDown={e => e.stopPropagation()} style={{ maxWidth: '600px', width: '90%', textAlign: 'center', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700' }}>Payment Proof Screenshot</h3>
              <button type="button" onClick={() => setViewScreenshotUrl('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}><X size={18} /></button>
            </div>
            <div style={{ maxHeight: '70vh', overflowY: 'auto', background: '#f3f4f6', borderRadius: '12px', padding: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center', border: '1px solid var(--border)' }}>
              <img
                src={viewScreenshotUrl}
                alt="Payment Proof"
                style={{ maxWidth: '100%', maxHeight: '60vh', borderRadius: '8px', objectFit: 'contain' }}
              />
            </div>
            <div className="modal-actions" style={{ marginTop: '20px' }}>
              <button type="button" className="primary" onClick={() => setViewScreenshotUrl('')}>Close Preview</button>
            </div>
          </div>
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
