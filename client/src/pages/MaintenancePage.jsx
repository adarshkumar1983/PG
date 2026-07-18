import React, { useState, useEffect, useMemo } from 'react';
import { Search, IndianRupee, Wrench, ShieldAlert, Calendar, Plus, Trash2, Edit, Play, AlertCircle, ArrowUpRight, BarChart } from 'lucide-react';
import { money } from '../utils/formatters.js';
import RecordPaymentModal from '../components/RecordPaymentModal.jsx';
import ReceiptModal from '../components/ReceiptModal.jsx';

export default function MaintenancePage({ session, properties = [], members = [], onRefresh }) {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  
  // Modals / Dialog controls
  const [editModal, setEditModal] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [recordModal, setRecordModal] = useState(false);
  const [receiptPayment, setReceiptPayment] = useState(null);
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState(null);
  const [saving, setSaving] = useState(false);

  // Form State for property-level config
  const [form, setForm] = useState({
    maintenanceEnabled: false,
    maintenanceAmount: 0,
    maintenanceFrequency: 'monthly',
    maintenanceCustomMonths: 1,
    maintenanceNextDueDate: '',
    maintenanceSeparateInvoice: false
  });
  
  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const triggerToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const loadPayments = () => {
    setLoading(true);
    fetch('/api/tenant/payments', {
      headers: { Authorization: `Bearer ${session.accessToken}`, 'x-organization-id': session.organizationId }
    })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(paymentData => {
        // Filter payments to only those with purpose = 'maintenance'
        setPayments(paymentData.filter(p => p.purpose === 'maintenance'));
      })
      .catch(err => console.error("Error loading maintenance payments:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadPayments();
  }, [session]);

  // Aggregate Metrics
  const metrics = useMemo(() => {
    let collectedThisMonth = 0;
    let pendingDues = 0;
    let totalRevenue = 0;
    let overdueCount = 0;
    let todaysCollections = 0;

    const today = new Date();
    const todayStr = today.toDateString();
    const currentMonthStr = today.toISOString().slice(0, 7); // "YYYY-MM"

    payments.forEach(p => {
      const pAmt = p.receivedAmount || 0;
      totalRevenue += pAmt;

      // Collected today
      if (p.transactions) {
        p.transactions.forEach(t => {
          if (new Date(t.paidAt).toDateString() === todayStr) {
            todaysCollections += t.amount || 0;
          }
        });
      } else if (p.status === 'paid' && p.paidAt && new Date(p.paidAt).toDateString() === todayStr) {
        todaysCollections += p.receivedAmount || 0;
      }

      // Collected this month
      if (p.paidAt && p.paidAt.slice(0, 7) === currentMonthStr) {
        collectedThisMonth += pAmt;
      }

      // Outstanding dues
      if (['due', 'pending', 'partially_paid'].includes(p.status)) {
        const remaining = p.amount - pAmt;
        pendingDues += Math.max(0, remaining);

        // Check if overdue (invoiceMonth is past current month)
        if (p.invoiceMonth < currentMonthStr) {
          overdueCount++;
        }
      }
    });

    // Next due date across properties
    let nextDueDate = null;
    properties.forEach(prop => {
      if (prop.maintenanceEnabled && prop.maintenanceNextDueDate) {
        const d = new Date(prop.maintenanceNextDueDate);
        if (!nextDueDate || d < nextDueDate) {
          nextDueDate = d;
        }
      }
    });

    return { 
      collectedThisMonth, 
      pendingDues, 
      totalRevenue, 
      overdueCount, 
      todaysCollections,
      nextDueDate: nextDueDate ? nextDueDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'
    };
  }, [payments, properties]);

  // Open edit settings modal
  const openEditModal = (prop) => {
    setSelectedProperty(prop);
    setForm({
      maintenanceEnabled: prop.maintenanceEnabled || false,
      maintenanceAmount: prop.maintenanceAmount || 0,
      maintenanceFrequency: prop.maintenanceFrequency || 'monthly',
      maintenanceCustomMonths: prop.maintenanceCustomMonths || 1,
      maintenanceNextDueDate: prop.maintenanceNextDueDate ? prop.maintenanceNextDueDate.slice(0, 10) : new Date().toISOString().slice(0, 10),
      maintenanceSeparateInvoice: prop.maintenanceSeparateInvoice || false
    });
    setEditModal(true);
  };

  // Submit edit settings
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const response = await fetch(`/api/tenant/properties/${selectedProperty._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.accessToken}`,
          'x-organization-id': session.organizationId
        },
        body: JSON.stringify({
          ...selectedProperty,
          maintenanceEnabled: form.maintenanceEnabled,
          maintenanceAmount: Number(form.maintenanceAmount),
          maintenanceFrequency: form.maintenanceFrequency,
          maintenanceCustomMonths: Number(form.maintenanceCustomMonths),
          maintenanceNextDueDate: new Date(form.maintenanceNextDueDate),
          maintenanceSeparateInvoice: form.maintenanceSeparateInvoice
        })
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Failed to update property settings');

      triggerToast('Property maintenance charges configured successfully!');
      setEditModal(false);
      loadPayments();
      if (onRefresh) onRefresh();
    } catch (err) {
      alert(err.message || 'Could not update configuration');
    } finally {
      setSaving(false);
    }
  };

  // Trigger automated scheduler run
  const handleManualTrigger = async () => {
    try {
      const response = await fetch('/api/tenant/maintenance-configs/trigger', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.accessToken}`, 'x-organization-id': session.organizationId }
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message);
      triggerToast(result.message || 'Schedules processed and invoices raised!');
      loadPayments();
      if (onRefresh) onRefresh();
    } catch (err) {
      alert(err.message || 'Error triggering scheduler check.');
    }
  };

  // Generate Visual Recurrence Timeline Data (Next 12 Months)
  const timelineData = useMemo(() => {
    const months = [];
    const today = new Date();
    
    // Setup next 12 months array
    for (let i = 0; i < 12; i++) {
      const targetMonth = new Date(today.getFullYear(), today.getMonth() + i, 1);
      months.push({
        label: targetMonth.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }),
        year: targetMonth.getFullYear(),
        month: targetMonth.getMonth(),
        monthKey: `${targetMonth.getFullYear()}-${String(targetMonth.getMonth() + 1).padStart(2, '0')}`,
        charges: []
      });
    }

    // Helper to calculate intervals
    const getNextScheduledMonths = (start, freq, customM) => {
      let interval = 1;
      switch (freq) {
        case 'monthly': interval = 1; break;
        case '2_months': interval = 2; break;
        case '3_months': interval = 3; break;
        case '4_months': interval = 4; break;
        case '6_months': interval = 6; break;
        case 'yearly': interval = 12; break;
        case 'custom': interval = customM || 1; break;
      }
      return interval;
    };

    properties.forEach(p => {
      if (p.maintenanceEnabled && p.maintenanceNextDueDate) {
        const start = new Date(p.maintenanceNextDueDate);
        const interval = getNextScheduledMonths(start, p.maintenanceFrequency, p.maintenanceCustomMonths);
        
        months.forEach(m => {
          const target = new Date(m.year, m.month, start.getDate());
          if (target >= start) {
            const diffMonths = (m.year - start.getFullYear()) * 12 + (m.month - start.getMonth());
            if (diffMonths % interval === 0) {
              m.charges.push({
                propertyName: p.name,
                amount: p.maintenanceAmount,
                dueDate: start.getDate()
              });
            }
          }
        });
      }
    });

    return months;
  }, [properties]);

  // Filtered ledger payments
  const filteredLedger = useMemo(() => {
    return payments.filter(p => {
      const residentName = p.residentId?.name || '';
      const matchSearch = residentName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (p.notes && p.notes.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchStatus = statusFilter === 'all' ? true : p.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [payments, searchQuery, statusFilter]);

  return (
    <div className="maintenance-page">
      <div className="setup-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <p className="eyebrow">Property Operations</p>
          <h1>PG Maintenance Charge Center</h1>
          <p>Automate recurring maintenance fees, manage due dates, and track collection ledgers.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="primary" onClick={handleManualTrigger} title="Daily check trigger to raise due maintenance charges">
            <Play size={15} style={{ marginRight: '6px' }} /> Trigger Daily Check
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="room-stats" style={{ marginBottom: '28px' }}>
        <article className="card metric" style={{ padding: '20px' }}>
          <small>Today's Collections</small>
          <strong style={{ color: 'var(--green)', fontSize: '24px' }}>{money(metrics.todaysCollections)}</strong>
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Collected via cash/UPI today</span>
        </article>
        <article className="card metric" style={{ padding: '20px' }}>
          <small>Pending Dues</small>
          <strong style={{ color: 'var(--color-danger)', fontSize: '24px' }}>{money(metrics.pendingDues)}</strong>
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Outstanding maintenance dues</span>
        </article>
        <article className="card metric" style={{ padding: '20px' }}>
          <small>Next Due Date</small>
          <strong style={{ color: 'var(--color-warning)', fontSize: '24px' }}>{metrics.nextDueDate}</strong>
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Earliest schedule run</span>
        </article>
        <article className="card metric" style={{ padding: '20px' }}>
          <small>Total Revenue</small>
          <strong style={{ color: 'var(--green)', fontSize: '24px' }}>{money(metrics.totalRevenue)}</strong>
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>All-time maintenance ledger</span>
        </article>
      </div>

      {/* Recurrence Timeline Graph */}
      <section className="card" style={{ padding: '24px', marginBottom: '28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: '800' }}>Schedule Timeline Forecast (Next 12 Months)</h2>
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>Scroll horizontally to view upcoming scheduled auto-billing cycles.</p>
          </div>
          <Calendar size={18} style={{ color: 'var(--muted)' }} />
        </div>

        <div style={{ display: 'flex', gap: '14px', overflowX: 'auto', paddingBottom: '12px', scrollBehavior: 'smooth' }}>
          {timelineData.map(m => (
            <div 
              key={m.monthKey} 
              style={{ 
                minWidth: '160px', 
                flex: '0 0 160px', 
                background: 'var(--app-bg)', 
                border: '1px solid var(--border)', 
                borderRadius: '10px', 
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}
            >
              <span style={{ fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', paddingBottom: '4px' }}>
                {m.label}
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, justifyContent: 'flex-start' }}>
                {m.charges.map((c, idx) => (
                  <div key={idx} style={{ fontSize: '12px', background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '6px', padding: '6px 8px' }}>
                    <div style={{ fontWeight: '700', fontSize: '11px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={c.propertyName}>
                      {c.propertyName}
                    </div>
                    <div style={{ color: 'var(--green)', fontSize: '10px', marginTop: '2px', fontWeight: '600' }}>
                      {money(c.amount)}
                    </div>
                    <span style={{ fontSize: '8px', color: 'var(--text-muted)', display: 'block', marginTop: '2px' }}>
                      Due Day: {c.dueDate}
                    </span>
                  </div>
                ))}
                {m.charges.length === 0 && (
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontStyle: 'italic', padding: '10px 0', textAlign: 'center' }}>
                    No charges
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Grid Layout: Configured Properties & Ledger */}
      <div className="maintenance-grid">
        
        {/* Configured PG Settings list */}
        <section className="card" style={{ padding: '24px', height: 'fit-content' }}>
          <h2 style={{ fontSize: '16px', fontWeight: '800', marginBottom: '16px' }}>PG Billing Rules</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {properties.map(p => (
              <div 
                key={p._id} 
                style={{ 
                  padding: '16px', 
                  border: '1px solid var(--border)', 
                  borderRadius: '10px', 
                  background: 'var(--app-bg)',
                  position: 'relative'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '700' }}>{p.name}</h4>
                  <button 
                    onClick={() => openEditModal(p)} 
                    style={{ background: 'transparent', border: 'none', color: 'var(--green)', cursor: 'pointer', padding: 0 }}
                    title="Configure maintenance charges"
                  >
                    <Edit size={14} />
                  </button>
                </div>

                <div style={{ display: 'grid', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)', marginTop: '8px' }}>
                  <div>Status: <b style={{ color: p.maintenanceEnabled ? 'var(--green)' : 'var(--color-danger)' }}>{p.maintenanceEnabled ? 'Enabled' : 'Disabled'}</b></div>
                  {p.maintenanceEnabled && (
                    <>
                      <div>Amount: <b style={{ color: 'var(--green)' }}>{money(p.maintenanceAmount)}</b></div>
                      <div>Frequency: <span style={{ textTransform: 'capitalize' }}>{p.maintenanceFrequency?.replace('_', ' ')}</span></div>
                      {p.maintenanceNextDueDate && (
                        <div>Next Due: <b>{new Date(p.maintenanceNextDueDate).toLocaleDateString('en-IN')}</b></div>
                      )}
                      <div>Billing Mode: <b>{p.maintenanceSeparateInvoice ? 'Separate Invoice' : 'Merged in Rent Bill'}</b></div>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Maintenance Ledger */}
        <section className="card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '800' }}>Maintenance Payments Ledger</h2>
            
            <div className="maintenance-toolbar">
              <div className="search" style={{ height: '42px', padding: '0 12px', background: 'var(--app-bg)', border: '1px solid var(--border)', borderRadius: '10px' }}>
                <Search size={15} />
                <input 
                  placeholder="Search ledger..." 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{ fontSize: '12px' }}
                />
              </div>

              <select 
                value={statusFilter} 
                onChange={e => setStatusFilter(e.target.value)}
                style={{ padding: '0 14px', height: '42px', borderRadius: '10px', border: '1px solid var(--border)', fontSize: '12px', background: 'var(--card-bg)' }}
              >
                <option value="all">All Statuses</option>
                <option value="due">Pending</option>
                <option value="partially_paid">Partially Paid</option>
                <option value="paid">Paid</option>
              </select>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: 'var(--table-head-bg)', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '10px', textAlign: 'left', color: 'var(--text-muted)' }}>Resident</th>
                  <th style={{ padding: '10px', textAlign: 'left', color: 'var(--text-muted)' }}>PG Property</th>
                  <th style={{ padding: '10px', textAlign: 'left', color: 'var(--text-muted)' }}>Period</th>
                  <th style={{ padding: '10px', textAlign: 'right', color: 'var(--text-muted)' }}>Amount</th>
                  <th style={{ padding: '10px', textAlign: 'right', color: 'var(--text-muted)' }}>Collected</th>
                  <th style={{ padding: '10px', textAlign: 'center', color: 'var(--text-muted)' }}>Status</th>
                  <th style={{ padding: '10px', textAlign: 'center', color: 'var(--text-muted)' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredLedger.map(item => {
                  const name = item.residentId?.name || 'Resident';
                  const propName = item.propertyId?.name || 'Greenview Residency';
                  
                  return (
                    <tr key={item._id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '10px' }}><b>{name}</b></td>
                      <td style={{ padding: '10px', color: 'var(--text-secondary)' }}>{propName}</td>
                      <td style={{ padding: '10px', color: 'var(--text-muted)' }}>{item.invoiceMonth}</td>
                      <td style={{ padding: '10px', textAlign: 'right', fontWeight: '600' }}>{money(item.amount)}</td>
                      <td style={{ padding: '10px', textAlign: 'right', color: 'var(--green)' }}>{money(item.receivedAmount)}</td>
                      <td style={{ padding: '10px', textAlign: 'center' }}>
                        <span className={`pill ${item.status.toLowerCase().replace(' ', '-')}`}>
                          {item.status === 'due' ? 'Pending' : item.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td style={{ padding: '10px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                          {item.status !== 'paid' && (
                            <button 
                              className="secondary" 
                              onClick={() => {
                                setSelectedInvoiceForPayment(item);
                                setRecordModal(true);
                              }}
                              style={{ padding: '2px 8px', fontSize: '11px', height: '24px' }}
                            >
                              Collect
                            </button>
                          )}
                          <button 
                            className="secondary" 
                            onClick={() => setReceiptPayment(item)}
                            style={{ padding: '2px 8px', fontSize: '11px', height: '24px' }}
                          >
                            Receipt
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredLedger.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No maintenance payments recorded in the ledger matching selection.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* Configure PG Settings Modal */}
      {editModal && selectedProperty && (
        <div className="modal-backdrop" onMouseDown={() => setEditModal(false)}>
          <form className="modal" onMouseDown={e => e.stopPropagation()} onSubmit={handleEditSubmit}>
            <span className="modal-icon"><Wrench /></span>
            <h2>Configure Maintenance: {selectedProperty.name}</h2>
            <p>Setup property-level automated maintenance bill cycles.</p>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', margin: '14px 0 20px 0' }}>
              <input 
                type="checkbox" 
                id="modalMaintEnabled"
                checked={form.maintenanceEnabled} 
                onChange={e => setForm({ ...form, maintenanceEnabled: e.target.checked })} 
                style={{ width: 'auto' }}
              />
              <label htmlFor="modalMaintEnabled" style={{ margin: 0, fontWeight: '600', cursor: 'pointer' }}>
                Enable Maintenance Charges for this PG
              </label>
            </div>

            {form.maintenanceEnabled && (
              <>
                <div className="form-row">
                  <label>Maintenance Amount (₹) *
                    <input 
                      type="number" 
                      value={form.maintenanceAmount} 
                      onChange={e => setForm({ ...form, maintenanceAmount: e.target.value })} 
                      min={0}
                      required 
                    />
                  </label>
                  <label>Billing Frequency *
                    <select 
                      value={form.maintenanceFrequency} 
                      onChange={e => setForm({ ...form, maintenanceFrequency: e.target.value })}
                    >
                      <option value="monthly">Monthly</option>
                      <option value="2_months">Every 2 Months</option>
                      <option value="3_months">Every 3 Months</option>
                      <option value="4_months">Every 4 Months</option>
                      <option value="6_months">Every 6 Months</option>
                      <option value="yearly">Yearly</option>
                      <option value="custom">Custom interval (X Months)</option>
                    </select>
                  </label>
                </div>

                {form.maintenanceFrequency === 'custom' && (
                  <label>Custom Months *
                    <input 
                      type="number" 
                      value={form.maintenanceCustomMonths} 
                      onChange={e => setForm({ ...form, maintenanceCustomMonths: e.target.value })} 
                      min={1} 
                      required 
                    />
                  </label>
                )}

                <div className="form-row">
                  <label>Next Due Date *
                    <input 
                      type="date" 
                      value={form.maintenanceNextDueDate} 
                      onChange={e => setForm({ ...form, maintenanceNextDueDate: e.target.value })} 
                      required 
                    />
                  </label>
                  <label>Billing Mode *
                    <select 
                      value={form.maintenanceSeparateInvoice ? 'separate' : 'merged'} 
                      onChange={e => setForm({ ...form, maintenanceSeparateInvoice: e.target.value === 'separate' })}
                    >
                      <option value="merged">Add to resident's monthly rent invoice</option>
                      <option value="separate">Create separate maintenance invoice</option>
                    </select>
                  </label>
                </div>
              </>
            )}

            <div className="modal-actions" style={{ marginTop: '20px' }}>
              <button type="button" className="secondary" onClick={() => setEditModal(false)}>Cancel</button>
              <button className="primary" disabled={saving}>{saving ? 'Saving...' : 'Save Configuration'}</button>
            </div>
          </form>
        </div>
      )}

      {/* Record Payment Modal */}
      {recordModal && selectedInvoiceForPayment && (
        <RecordPaymentModal 
          session={session}
          resident={selectedInvoiceForPayment.residentId}
          invoices={[selectedInvoiceForPayment]}
          onClose={() => {
            setRecordModal(false);
            setSelectedInvoiceForPayment(null);
          }}
          onSuccess={() => {
            setRecordModal(false);
            setSelectedInvoiceForPayment(null);
            triggerToast('Maintenance payment collected successfully!');
            loadPayments();
            if (onRefresh) onRefresh();
          }}
        />
      )}

      {/* Receipt Modal */}
      {receiptPayment && (
        <ReceiptModal 
          session={session}
          payment={receiptPayment}
          resident={receiptPayment.residentId}
          properties={properties}
          onClose={() => setReceiptPayment(null)}
        />
      )}

      {toast && <div className="toast">✓ {toast}</div>}
    </div>
  );
}
