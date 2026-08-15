import React, { useState, useEffect, useMemo } from 'react';
import { Search, Plus, IndianRupee, Printer, Edit2, Trash2, Calendar, FileText, Check, X, ShieldAlert, ArrowRightLeft } from 'lucide-react';
import RecordPaymentModal from '../components/RecordPaymentModal.jsx';
import ReceiptModal from '../components/ReceiptModal.jsx';
import SettlementDetailsModal from '../components/SettlementDetailsModal.jsx';
import OwnerAnalyticsCard from '../components/OwnerAnalyticsCard.jsx';
import NotificationCenter from '../components/NotificationCenter.jsx';
import ResidentPaymentModal from '../components/ResidentPaymentModal.jsx';
import { money, formatInvoicePeriod } from '../utils/formatters.js';
import { fetchWithCache, invalidateCache } from '../utils/apiClient.js';
import { CardSkeleton, TableSkeleton } from '../components/Skeleton.jsx';

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
    fetchWithCache('/api/tenant/settlements/analytics', session, {
      onBackgroundUpdate: (data) => {
        if (data) setAnalytics(data);
      }
    })
      .then(data => { if (data) setAnalytics(data); })
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
      invalidateCache(['payments', 'settlements', 'dashboard', 'residents']);
      loadData(true);
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

  const isResident = userRole === 'resident';

  const loadData = (force = false) => {
    const fetchPay = fetchWithCache('/api/tenant/payments', session, {
      force,
      onBackgroundUpdate: (payData) => {
        if (Array.isArray(payData)) setPayments(payData);
      }
    });

    if (isResident) {
      fetchPay
        .then((payData) => {
          if (Array.isArray(payData)) setPayments(payData);
        })
        .catch(err => console.error("Error loading payments list:", err))
        .finally(() => setLoading(false));
      return;
    }

    const fetchRes = fetchWithCache('/api/tenant/residents', session, {
      force,
      onBackgroundUpdate: (resData) => {
        if (Array.isArray(resData)) setResidents(resData);
      }
    });

    Promise.all([fetchPay, fetchRes])
      .then(([payData, resData]) => {
        if (Array.isArray(payData)) setPayments(payData);
        if (Array.isArray(resData)) setResidents(resData);
      })
      .catch(err => console.error("Error loading payments list:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [session]);

  // Compute stats dynamically for owner/staff
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

  // Compute resident-specific metrics
  const residentStats = useMemo(() => {
    let totalPaid = 0;
    let pendingDues = 0;
    let securityDeposit = 0;
    let totalInvoices = payments.length;

    payments.forEach(p => {
      totalPaid += p.receivedAmount || (p.status === 'paid' ? p.amount : 0);
      if (p.purpose === 'security_deposit') {
        securityDeposit += p.amount || 0;
      }
      if (['due', 'pending', 'partially_paid'].includes(p.status)) {
        pendingDues += Math.max(0, (p.amount || 0) - (p.receivedAmount || 0));
      }
    });

    return { totalPaid, pendingDues, securityDeposit, totalInvoices };
  }, [payments]);

  // Filter payments safely
  const filteredPayments = useMemo(() => {
    return payments.filter(p => {
      const resName = p.residentId?.name || p.name || 'Resident';
      const refNum = p.referenceNumber || '';
      const invMonth = p.invoiceMonth || '';
      const purpose = p.purpose || '';

      const matchSearch = resName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        invMonth.toLowerCase().includes(searchQuery.toLowerCase()) ||
        purpose.toLowerCase().includes(searchQuery.toLowerCase()) ||
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
    return (
      <div className="payments-page" style={{ padding: '16px' }}>
        <div className="setup-heading" style={{ marginBottom: '24px' }}>
          <div>
            <p className="eyebrow">Financial Ledger</p>
            <h1>Payments Ledger</h1>
          </div>
        </div>
        <CardSkeleton count={4} height="95px" />
        <TableSkeleton rows={8} cols={6} />
      </div>
    );
  }

  return (
    <div className="payments-page">
      <div className="setup-heading">
        <div>
          <p className="eyebrow">{isResident ? 'My Invoices & Receipts' : 'Financial Ledger'}</p>
          <h1>{isResident ? 'My Payments' : 'Payments Ledger'}</h1>
          <p>{isResident ? 'View your monthly rent breakdown, make secure payments, and download payment receipts.' : 'Track cash, card, UPI, bank transfers, and online settlement status in a single unified ledger.'}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <NotificationCenter session={session} onSelectPayment={(p) => setSelectedSettlement(p)} />
          {!isResident && (
            <button className="primary" onClick={() => setRecordModal(true)} style={{ backgroundColor: 'var(--green)' }}>
              <Plus size={17} /> Record Cash Payment
            </button>
          )}
        </div>
      </div>

      {/* Metrics Bar */}
      <div className="room-stats" style={{ marginBottom: '30px' }}>
        {isResident ? (
          <>
            <article className="card metric" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <small style={{ textTransform: 'uppercase', fontSize: '10px', color: 'var(--text-muted)' }}>Total Paid</small>
              <strong style={{ color: 'var(--green)', fontSize: '20px' }}>{money(residentStats.totalPaid)}</strong>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>All verified payments</span>
            </article>

            <article className="card metric" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <small style={{ textTransform: 'uppercase', fontSize: '10px', color: 'var(--text-muted)' }}>Pending Dues</small>
              <strong style={{ color: residentStats.pendingDues > 0 ? 'var(--color-danger)' : 'var(--green)', fontSize: '20px' }}>{money(residentStats.pendingDues)}</strong>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{residentStats.pendingDues > 0 ? 'Outstanding balance' : 'All clear'}</span>
            </article>

            <article className="card metric" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <small style={{ textTransform: 'uppercase', fontSize: '10px', color: 'var(--text-muted)' }}>Security Deposit</small>
              <strong style={{ color: 'var(--green)', fontSize: '20px' }}>{money(residentStats.securityDeposit)}</strong>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Refundable deposit</span>
            </article>

            <article className="card metric" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <small style={{ textTransform: 'uppercase', fontSize: '10px', color: 'var(--text-muted)' }}>Total Statements</small>
              <strong style={{ color: 'var(--green)', fontSize: '20px' }}>{residentStats.totalInvoices}</strong>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Issued invoices</span>
            </article>
          </>
        ) : (
          <>
            <article className="card metric" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <small style={{ textTransform: 'uppercase', fontSize: '10px', color: 'var(--text-muted)' }}>Cash Collected Today</small>
              <strong style={{ color: 'var(--green)', fontSize: '20px' }}>{money(stats.collectedToday)}</strong>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Offline cash reconciliation</span>
            </article>

            <article className="card metric" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <small style={{ textTransform: 'uppercase', fontSize: '10px', color: 'var(--text-muted)' }}>Cash This Month</small>
              <strong style={{ color: 'var(--green)', fontSize: '20px' }}>{money(stats.collectedMonth)}</strong>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Monthly Collections</span>
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
          </>
        )}
      </div>

      {!isResident && analytics && (
        <OwnerAnalyticsCard analytics={analytics} onSelectPayment={(p) => setSelectedSettlement(p)} />
      )}

      {/* Filters and Search Bar */}
      <div className="payments-filters-row">
        <div className="search">
          <Search size={18} />
          <input
            placeholder={isResident ? "Search by month, purpose, or reference number..." : "Search by resident name, month, receipt number..."}
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
      <section className="card" style={{ padding: 0, overflowX: 'auto', border: '1px solid var(--border)', borderRadius: '14px' }}>
        <div style={{ minWidth: '940px' }}>
          {/* Table Header */}
          <div
            style={{
              borderBottom: '1px solid var(--border)',
              padding: '14px 20px',
              background: 'var(--table-head-bg)',
              display: 'grid',
              gridTemplateColumns: 'minmax(180px, 1.8fr) minmax(130px, 1.2fr) minmax(100px, 0.9fr) minmax(100px, 0.9fr) minmax(110px, 1fr) minmax(105px, 0.9fr) minmax(230px, 2fr)',
              alignItems: 'center',
              gap: '14px',
              fontSize: '11px',
              fontWeight: '700',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              color: 'var(--text-muted)'
            }}
          >
            <span>{isResident ? 'Property & Details' : 'Resident'}</span>
            <span>Purpose & Month</span>
            <span style={{ textAlign: 'right' }}>Total Invoice</span>
            <span style={{ textAlign: 'right' }}>Amount Paid</span>
            <span style={{ textAlign: 'center' }}>Method</span>
            <span style={{ textAlign: 'center' }}>Status</span>
            <span style={{ textAlign: 'right' }}>{isResident ? 'Actions / Receipt' : 'Actions'}</span>
          </div>

          {filteredPayments.map(p => {
            const resName = p.residentId?.name || p.name || 'Resident';
            const initials = resName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();

            // Map status classes & labels
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
            const isReceivedPositive = (p.receivedAmount || 0) > 0 || p.status === 'paid';

            // Method Badge Style Resolver
            const getMethodBadgeStyle = (method) => {
              const m = (method || '').toLowerCase();
              if (m === 'cash') {
                return { bg: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b', border: 'rgba(245, 158, 11, 0.28)' };
              }
              if (m === 'upi') {
                return { bg: 'rgba(14, 165, 233, 0.12)', color: '#0ea5e9', border: 'rgba(14, 165, 233, 0.28)' };
              }
              if (m === 'online_gateway' || m === 'online') {
                return { bg: 'rgba(16, 185, 129, 0.12)', color: '#10b981', border: 'rgba(16, 185, 129, 0.28)' };
              }
              if (m === 'bank_transfer') {
                return { bg: 'rgba(139, 92, 246, 0.12)', color: '#8b5cf6', border: 'rgba(139, 92, 246, 0.28)' };
              }
              if (m === 'card') {
                return { bg: 'rgba(236, 72, 153, 0.12)', color: '#ec4899', border: 'rgba(236, 72, 153, 0.28)' };
              }
              return { bg: 'rgba(148, 163, 184, 0.1)', color: 'var(--text-muted)', border: 'var(--border)' };
            };

            // Status Pill Style Resolver
            const getStatusPillStyle = (stClass) => {
              if (stClass === 'paid') {
                return { bg: 'rgba(16, 185, 129, 0.12)', color: '#10b981', border: 'rgba(16, 185, 129, 0.3)' };
              }
              if (stClass === 'due') {
                return { bg: 'rgba(239, 68, 68, 0.12)', color: '#ef4444', border: 'rgba(239, 68, 68, 0.3)' };
              }
              if (stClass === 'pending' || stClass === 'partially-paid') {
                return { bg: 'rgba(245, 158, 11, 0.14)', color: '#f59e0b', border: 'rgba(245, 158, 11, 0.35)' };
              }
              if (stClass === 'pending-verification') {
                return { bg: 'rgba(234, 179, 8, 0.16)', color: '#d97706', border: 'rgba(234, 179, 8, 0.35)' };
              }
              return { bg: 'rgba(148, 163, 184, 0.12)', color: 'var(--text-muted)', border: 'var(--border)' };
            };

            const methodStyle = getMethodBadgeStyle(p.method);
            const statusStyle = getStatusPillStyle(statusClass);

            return (
              <div
                key={p._id}
                style={{
                  borderBottom: '1px solid var(--border)',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'background 0.2s'
                }}
                onMouseOver={e => e.currentTarget.style.backgroundColor = 'var(--table-row-hover)'}
                onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                {/* Main Row Columns in strict CSS Grid */}
                <div
                  style={{
                    padding: '14px 20px',
                    display: 'grid',
                    gridTemplateColumns: 'minmax(180px, 1.8fr) minmax(130px, 1.2fr) minmax(100px, 0.9fr) minmax(100px, 0.9fr) minmax(110px, 1fr) minmax(105px, 0.9fr) minmax(230px, 2fr)',
                    alignItems: 'center',
                    gap: '14px',
                    width: '100%'
                  }}
                >
                  {/* Column 1: Resident Details */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                    <i
                      style={{
                        background: avatarColor,
                        width: '32px',
                        height: '32px',
                        minWidth: '32px',
                        borderRadius: '50%',
                        color: '#fff',
                        fontStyle: 'normal',
                        display: 'grid',
                        placeItems: 'center',
                        fontSize: '11px',
                        fontWeight: '700'
                      }}
                    >
                      {initials}
                    </i>
                    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
                      <b style={{ fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={resName}>
                        {resName}
                      </b>
                      <small style={{ fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {p.propertyId?.name || 'Property'}
                      </small>
                    </div>
                  </div>

                  {/* Column 2: Purpose & Month */}
                  <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    <b style={{ textTransform: 'capitalize', fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {p.purpose || 'rent'}
                    </b>
                    <small style={{ fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {formatInvoicePeriod(p)}
                    </small>
                  </div>

                  {/* Column 3: Total Invoice Expected */}
                  <strong style={{ textAlign: 'right', fontSize: '13px', color: 'var(--text-primary)' }}>
                    {money(p.amount)}
                  </strong>

                  {/* Column 4: Amount Paid */}
                  <strong
                    style={{
                      textAlign: 'right',
                      fontSize: '13px',
                      color: isReceivedPositive ? 'var(--green)' : 'var(--text-muted)'
                    }}
                  >
                    {money(p.receivedAmount || (p.status === 'paid' ? p.amount : 0))}
                  </strong>

                  {/* Column 5: Payment Method Badge */}
                  <div style={{ textAlign: 'center', display: 'flex', justifyContent: 'center' }}>
                    <span
                      style={{
                        fontSize: '10px',
                        padding: '3px 9px',
                        borderRadius: '6px',
                        textTransform: 'uppercase',
                        fontWeight: '700',
                        backgroundColor: methodStyle.bg,
                        color: methodStyle.color,
                        border: `1px solid ${methodStyle.border}`,
                        whiteSpace: 'nowrap',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        letterSpacing: '0.4px'
                      }}
                    >
                      {p.method ? (p.method === 'online_gateway' ? 'online' : p.method.replace('_', ' ')) : 'Unspecified'}
                    </span>
                  </div>

                  {/* Column 6: Status Pill */}
                  <div style={{ textAlign: 'center', display: 'flex', justifyContent: 'center' }}>
                    <span
                      style={{
                        fontSize: '11px',
                        padding: '3px 10px',
                        borderRadius: '999px',
                        textTransform: 'capitalize',
                        fontWeight: '600',
                        backgroundColor: statusStyle.bg,
                        color: statusStyle.color,
                        border: `1px solid ${statusStyle.border}`,
                        whiteSpace: 'nowrap',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      {statusLabel}
                    </span>
                  </div>

                  {/* Column 7: Actions */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '6px', width: '100%' }}>
                    {p.status !== 'paid' && (
                      userRole === 'resident' ? (
                        p.referenceNumber ? (
                          <button
                            type="button"
                            className="primary"
                            disabled
                            style={{
                              padding: '5px 10px',
                              height: '30px',
                              fontSize: '11px',
                              backgroundColor: 'var(--border)',
                              color: 'var(--text-secondary)',
                              border: 'none',
                              borderRadius: '6px',
                              fontWeight: '600',
                              cursor: 'not-allowed',
                              display: 'inline-flex',
                              alignItems: 'center'
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
                              padding: '5px 12px',
                              height: '30px',
                              fontSize: '11px',
                              backgroundColor: 'var(--green)',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '6px',
                              fontWeight: '600',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center'
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
                              height: '30px',
                              fontSize: '11px',
                              backgroundColor: '#10b981',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '6px',
                              fontWeight: '600',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              whiteSpace: 'nowrap'
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
                              padding: '5px 12px',
                              height: '30px',
                              fontSize: '11px',
                              backgroundColor: 'var(--green)',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '6px',
                              fontWeight: '600',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              whiteSpace: 'nowrap'
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
                          padding: '5px 10px',
                          height: '30px',
                          fontSize: '11px',
                          backgroundColor: 'rgba(37, 99, 235, 0.1)',
                          color: '#3b82f6',
                          border: '1px solid rgba(59, 130, 246, 0.3)',
                          borderRadius: '6px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        <ArrowRightLeft size={13} /> Settlement
                      </button>
                    )}

                    {/* Print Receipt Icon Button */}
                    <button
                      title="View & Print Receipt"
                      onClick={() => setReceiptPayment(p)}
                      style={{
                        width: '30px',
                        height: '30px',
                        border: '1px solid var(--border)',
                        background: 'var(--card-bg)',
                        borderRadius: '6px',
                        color: 'var(--text-primary)',
                        display: 'grid',
                        placeItems: 'center',
                        cursor: 'pointer',
                        flexShrink: 0
                      }}
                    >
                      <Printer size={14} />
                    </button>

                    {/* Edit Cash Payment Icon Button */}
                    {isCash && userRole !== 'resident' && (
                      <button
                        title="Edit Cash Payment"
                        onClick={() => handleEditClick(p)}
                        style={{
                          width: '30px',
                          height: '30px',
                          border: '1px solid var(--border)',
                          background: 'var(--card-bg)',
                          borderRadius: '6px',
                          color: 'var(--green)',
                          display: 'grid',
                          placeItems: 'center',
                          cursor: 'pointer',
                          flexShrink: 0
                        }}
                      >
                        <Edit2 size={14} />
                      </button>
                    )}

                    {/* Delete Payment Icon Button */}
                    {isCash && userRole !== 'resident' && (
                      <button
                        title="Delete Payment"
                        onClick={() => setDeletePaymentId(p._id)}
                        style={{
                          width: '30px',
                          height: '30px',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          background: 'rgba(239, 68, 68, 0.08)',
                          borderRadius: '6px',
                          color: '#ef4444',
                          display: 'grid',
                          placeItems: 'center',
                          cursor: 'pointer',
                          flexShrink: 0
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
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
                          background: 'transparent',
                          border: '1px solid #d97706',
                          color: '#d97706',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '10px',
                          fontWeight: '700'
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
            <div style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
              {isResident
                ? 'You have no payment records or invoices matching the selected filters. Once rent dues are generated by your PG manager, they will appear here.'
                : 'No transactions match the selected filters.'}
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

      {selectedSettlement && (
        <SettlementDetailsModal
          payment={selectedSettlement}
          onClose={() => setSelectedSettlement(null)}
        />
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
