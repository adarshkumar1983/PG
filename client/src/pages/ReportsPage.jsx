import React, { useState, useEffect, useMemo } from 'react';
import { Search, IndianRupee, TrendingUp, ShieldAlert, BarChart3, Clock, AlertTriangle, FileSpreadsheet, Plus, HelpCircle } from 'lucide-react';
import { money } from '../utils/formatters.js';

export default function ReportsPage({ session, properties = [] }) {
  const [payments, setPayments] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Cash Drawer Closing State
  const [closingInput, setClosingInput] = useState('');
  const [closingNotes, setClosingNotes] = useState('');
  const [reconciliationHistory, setReconciliationHistory] = useState([
    { id: '1', date: '2026-07-04', expected: 15500, actual: 15500, difference: 0, operator: 'Adarsh Kumar', status: 'Reconciled', notes: 'Drawer matched' },
    { id: '2', date: '2026-07-03', expected: 12000, actual: 11950, difference: -50, operator: 'Rohan Singh', status: 'Shortage', notes: 'Given 50 change shortage' }
  ]);
  const [reconciliationToast, setReconciliationToast] = useState('');

  // Fetch reports data
  const loadReportsData = () => {
    const fetchPay = fetch('/api/tenant/payments', {
      headers: { Authorization: `Bearer ${session.accessToken}`, 'x-organization-id': session.organizationId }
    }).then(r => r.ok ? r.json() : Promise.reject());

    const fetchExp = fetch('/api/tenant/expenses', {
      headers: { Authorization: `Bearer ${session.accessToken}`, 'x-organization-id': session.organizationId }
    }).then(r => r.ok ? r.json() : Promise.reject());

    const fetchAudit = fetch('/api/tenant/audit-logs', {
      headers: { Authorization: `Bearer ${session.accessToken}`, 'x-organization-id': session.organizationId }
    }).then(r => r.ok ? r.json() : Promise.reject());

    Promise.all([fetchPay, fetchExp, fetchAudit])
      .then(([payData, expData, auditData]) => {
        setPayments(payData);
        setExpenses(expData);
        setAuditLogs(auditData);
      })
      .catch(err => console.error("Error loading reports data:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadReportsData();
  }, [session]);

  // Compute metrics
  const metrics = useMemo(() => {
    let cashToday = 0;
    let cashMonth = 0;
    let outstanding = 0;
    let totalRevenue = 0;
    
    // Method breakdowns
    let methodBreakdowns = { cash: 0, upi: 0, bank_transfer: 0, card: 0, online_gateway: 0 };
    // Purpose breakdowns
    let purposeBreakdowns = { rent: 0, security_deposit: 0, electricity: 0, water: 0, maintenance: 0, fine: 0, other: 0 };

    // Detailed Maintenance Analytics
    let maintCollected = 0;
    let maintPending = 0;
    let maintByProperty = {};
    let maintByRoom = {};
    let maintByMember = {};

    const todayStr = new Date().toDateString();
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    payments.forEach(p => {
      const pAmt = p.receivedAmount || 0;
      totalRevenue += pAmt;

      // Outstanding dues
      if (['due', 'pending', 'partially_paid'].includes(p.status)) {
        outstanding += Math.max(0, p.amount - (p.receivedAmount || 0));
      }

      // Method totals
      if (p.method && methodBreakdowns[p.method] !== undefined) {
        methodBreakdowns[p.method] += pAmt;
      }
      
      // Purpose totals
      if (p.purpose && purposeBreakdowns[p.purpose] !== undefined) {
        purposeBreakdowns[p.purpose] += pAmt;
      }

      // Detailed Maintenance Extraction
      if (p.purpose === 'maintenance') {
        maintCollected += pAmt;
        if (['due', 'pending', 'partially_paid'].includes(p.status)) {
          maintPending += Math.max(0, p.amount - pAmt);
        }

        const propName = p.propertyId?.name || 'Greenview Residency';
        maintByProperty[propName] = (maintByProperty[propName] || 0) + pAmt;

        let roomLabel = 'General';
        if (p.residentId) {
          const resObj = p.residentId;
          const propObj = properties.find(pr => pr._id.toString() === p.propertyId?._id?.toString() || pr._id.toString() === p.propertyId?.toString());
          if (propObj) {
            const room = propObj.rooms?.find(r => r._id.toString() === resObj.roomId?.toString() || r._id.toString() === p.residentId?.roomId?.toString());
            if (room) {
              roomLabel = `Room ${room.number}`;
            }
          }
        }
        maintByRoom[roomLabel] = (maintByRoom[roomLabel] || 0) + pAmt;

        const resName = p.residentId?.name || p.name || 'Resident';
        maintByMember[resName] = (maintByMember[resName] || 0) + pAmt;
      }

      // Sum cash collected
      if (p.transactions) {
        p.transactions.forEach(t => {
          const tDate = new Date(t.paidAt);
          if (t.method === 'cash') {
            if (tDate.toDateString() === todayStr) {
              cashToday += t.amount;
            }
            if (tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear) {
              cashMonth += t.amount;
            }
          }
        });
      } else if (p.status === 'paid' && p.method === 'cash') {
        const pDate = new Date(p.paidAt || p.updatedAt);
        if (pDate.toDateString() === todayStr) {
          cashToday += p.amount;
        }
        if (pDate.getMonth() === currentMonth && pDate.getFullYear() === currentYear) {
          cashMonth += p.amount;
        }
      }
    });

    return { 
      cashToday, 
      cashMonth, 
      outstanding, 
      totalRevenue, 
      methodBreakdowns, 
      purposeBreakdowns,
      maintCollected,
      maintPending,
      maintByProperty,
      maintByRoom,
      maintByMember
    };
  }, [payments, properties]);

  // Handle drawer reconciliation submission
  const handleReconcileSubmit = (e) => {
    e.preventDefault();
    if (!closingInput) return;

    const actual = Number(closingInput);
    const expected = metrics.cashToday;
    const difference = actual - expected;
    let status = 'Reconciled';
    if (difference < 0) status = 'Shortage';
    if (difference > 0) status = 'Surplus';

    const newRecord = {
      id: `reconcile-${Date.now()}`,
      date: new Date().toISOString().slice(0, 10),
      expected,
      actual,
      difference,
      operator: session.user?.name || 'Owner',
      status,
      notes: closingNotes || 'Drawer closed'
    };

    setReconciliationHistory(prev => [newRecord, ...prev]);
    setClosingInput('');
    setClosingNotes('');
    
    setReconciliationToast('Reconciliation saved and logged!');
    setTimeout(() => setReconciliationToast(''), 3000);
  };

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading financial reports...</div>;
  }

  return (
    <div className="reports-page">
      <div className="setup-heading">
        <div>
          <p className="eyebrow">Financial Analytics</p>
          <h1>Revenue & Reports</h1>
          <p>Analyze collections, perform cash drawer reconciliations, and review organizational financial audit logs.</p>
        </div>
      </div>

      {/* Metrics Summary Grid */}
      <div className="room-stats" style={{ marginBottom: '32px' }}>
        <article className="card metric" style={{ padding: '20px' }}>
          <small>Cash Collected Today</small>
          <strong style={{ color: 'var(--green)', fontSize: '24px' }}>{money(metrics.cashToday)}</strong>
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Today's cash receipts</span>
        </article>
        <article className="card metric" style={{ padding: '20px' }}>
          <small>Cash Collected This Month</small>
          <strong style={{ color: 'var(--green)', fontSize: '24px' }}>{money(metrics.cashMonth)}</strong>
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Month's cash receipts</span>
        </article>
        <article className="card metric" style={{ padding: '20px' }}>
          <small>Outstanding Rent Dues</small>
          <strong style={{ color: 'var(--color-danger)', fontSize: '24px' }}>{money(metrics.outstanding)}</strong>
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Unsettled invoices balance</span>
        </article>
        <article className="card metric" style={{ padding: '20px' }}>
          <small>Total Revenue</small>
          <strong style={{ color: 'var(--green)', fontSize: '24px' }}>{money(metrics.totalRevenue)}</strong>
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Total received ledger</span>
        </article>
      </div>

      <div className="reports-grid">
        
        {/* Breakdown Charts */}
        <section className="card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '800' }}>Collections Breakdown</h2>
            <BarChart3 size={18} style={{ color: 'var(--muted)' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* By Payment Method */}
            <div>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '12px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>By Payment Method</h4>
              <div style={{ display: 'grid', gap: '8px' }}>
                {Object.entries(metrics.methodBreakdowns).map(([method, amount]) => {
                  const percent = metrics.totalRevenue > 0 ? Math.round((amount / metrics.totalRevenue) * 100) : 0;
                  return (
                    <div key={method} style={{ fontSize: '13px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ textTransform: 'capitalize' }}>{method.replace('_', ' ')}</span>
                        <span>{money(amount)} ({percent}%)</span>
                      </div>
                      <div style={{ height: '6px', background: 'var(--app-bg)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ width: `${percent}%`, height: '100%', background: method === 'cash' ? 'var(--color-warning)' : 'var(--green)', borderRadius: '3px' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* By Purpose */}
            <div style={{ marginTop: '10px' }}>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '12px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>By Purpose Category</h4>
              <div style={{ display: 'grid', gap: '8px' }}>
                {Object.entries(metrics.purposeBreakdowns).map(([purpose, amount]) => {
                  const percent = metrics.totalRevenue > 0 ? Math.round((amount / metrics.totalRevenue) * 100) : 0;
                  return (
                    <div key={purpose} style={{ fontSize: '13px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ textTransform: 'capitalize' }}>{purpose}</span>
                        <span>{money(amount)} ({percent}%)</span>
                      </div>
                      <div style={{ height: '6px', background: 'var(--app-bg)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ width: `${percent}%`, height: '100%', background: 'var(--green)', borderRadius: '3px' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* Maintenance Collection Reports */}
        <section className="card" style={{ padding: '24px', gridColumn: '1 / -1' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: '800' }}>Maintenance Collection Reports</h2>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>Detailed breakdown of operational maintenance collections and pending dues.</p>
            </div>
            <BarChart3 size={18} style={{ color: 'var(--muted)' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
            {/* Summary */}
            <div style={{ background: 'var(--app-bg)', padding: '16px', borderRadius: '10px', border: '1px solid var(--border)' }}>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '12px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Summary</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Total Collected:</span>
                  <strong style={{ color: 'var(--green)' }}>{money(metrics.maintCollected)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Total Outstanding:</span>
                  <strong style={{ color: 'var(--color-danger)' }}>{money(metrics.maintPending)}</strong>
                </div>
              </div>
            </div>

            {/* By Property */}
            <div style={{ background: 'var(--app-bg)', padding: '16px', borderRadius: '10px', border: '1px solid var(--border)' }}>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '12px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>By Property</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', maxHeight: '120px', overflowY: 'auto' }}>
                {Object.entries(metrics.maintByProperty).map(([propName, amount]) => (
                  <div key={propName} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>{propName}:</span>
                    <strong>{money(amount)}</strong>
                  </div>
                ))}
                {Object.keys(metrics.maintByProperty).length === 0 && (
                  <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No records</span>
                )}
              </div>
            </div>

            {/* By Room */}
            <div style={{ background: 'var(--app-bg)', padding: '16px', borderRadius: '10px', border: '1px solid var(--border)' }}>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '12px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>By Room</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', maxHeight: '120px', overflowY: 'auto' }}>
                {Object.entries(metrics.maintByRoom).map(([roomLabel, amount]) => (
                  <div key={roomLabel} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>{roomLabel}:</span>
                    <strong>{money(amount)}</strong>
                  </div>
                ))}
                {Object.keys(metrics.maintByRoom).length === 0 && (
                  <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No records</span>
                )}
              </div>
            </div>

            {/* By Member */}
            <div style={{ background: 'var(--app-bg)', padding: '16px', borderRadius: '10px', border: '1px solid var(--border)' }}>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '12px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>By Resident</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', maxHeight: '120px', overflowY: 'auto' }}>
                {Object.entries(metrics.maintByMember).map(([resName, amount]) => (
                  <div key={resName} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>{resName}:</span>
                    <strong>{money(amount)}</strong>
                  </div>
                ))}
                {Object.keys(metrics.maintByMember).length === 0 && (
                  <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No records</span>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Daily Cash Closing Drawer Reconciliation */}
        <section className="card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '800' }}>Daily Cash Closing</h2>
            <Clock size={18} style={{ color: 'var(--muted)' }} />
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 20px 0' }}>Reconcile expected cash collections in StayZen with actual physical drawer cash.</p>

          <form onSubmit={handleReconcileSubmit} style={{ display: 'grid', gap: '12px', background: 'var(--app-bg)', padding: '16px', borderRadius: '10px', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
              <span>Expected Cash Today:</span>
              <strong style={{ color: 'var(--green)' }}>{money(metrics.cashToday)}</strong>
            </div>

            <label style={{ fontSize: '13px' }}>Actual Drawer Cash (₹)
              <input 
                type="number" 
                value={closingInput} 
                onChange={e => setClosingInput(e.target.value)}
                placeholder="Count physical cash & enter here" 
                required 
                style={{ marginTop: '4px' }}
              />
            </label>

            <label style={{ fontSize: '13px' }}>Notes / Memo
              <input 
                value={closingNotes} 
                onChange={e => setClosingNotes(e.target.value)}
                placeholder="e.g. Shift 1 drawer closing matches" 
                style={{ marginTop: '4px' }}
              />
            </label>

            <button type="submit" className="primary" style={{ backgroundColor: 'var(--green)', marginTop: '4px' }}>
              Confirm & Save Closing
            </button>
          </form>

          {/* Closing history list */}
          <div style={{ marginTop: '20px' }}>
            <h4 style={{ margin: '0 0 10px 0', fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Closing Log</h4>
            <div style={{ display: 'grid', gap: '8px', maxHeight: '160px', overflowY: 'auto' }}>
              {reconciliationHistory.map(rec => (
                <div key={rec.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', borderBottom: '1px dashed var(--border)', paddingBottom: '6px' }}>
                  <div>
                    <b>{new Date(rec.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</b>
                    <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '11px' }}>Reconciled by: {rec.operator}</p>
                    <i style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>"{rec.notes}"</i>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontWeight: '700' }}>{money(rec.actual)}</span>
                    <span 
                      className={`pill ${rec.status.toLowerCase()}`}
                      style={{ 
                        display: 'block', 
                        fontSize: '9px', 
                        padding: '1px 4px', 
                        marginTop: '2px',
                        backgroundColor: rec.difference === 0 ? 'var(--color-success-bg)' : 'var(--color-danger-bg)',
                        color: rec.difference === 0 ? 'var(--color-success)' : 'var(--color-danger)'
                      }}
                    >
                      {rec.difference === 0 ? 'Match' : `Diff: ${money(rec.difference)}`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      {/* Central Audit Trail */}
      <section className="card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: '800' }}>Central Activity Audit Trail</h2>
            <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>System logs of creations, payments, edits, and deletions for financial compliance.</p>
          </div>
          <ShieldAlert size={20} style={{ color: 'var(--color-warning)' }} />
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', minWidth: '700px' }}>
            <thead>
              <tr style={{ background: 'var(--table-head-bg)', borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '12px 10px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: '600' }}>Timestamp</th>
                <th style={{ padding: '12px 10px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: '600' }}>Action</th>
                <th style={{ padding: '12px 10px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: '600' }}>Resident</th>
                <th style={{ padding: '12px 10px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: '600' }}>Entity</th>
                <th style={{ padding: '12px 10px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: '600' }}>Operator</th>
                <th style={{ padding: '12px 10px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: '600' }}>Audit details</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.map(log => {
                const operatorName = log.performedBy?.name || 'Owner';
                const residentName = log.details?.residentName || 'N/A';
                
                // Set badge colors
                let actionBadgeStyle = {};
                if (log.action === 'record_payment') {
                  actionBadgeStyle = { backgroundColor: 'var(--color-success-bg)', color: 'var(--color-success)' };
                } else if (log.action === 'edit') {
                  actionBadgeStyle = { backgroundColor: 'var(--color-info-bg)', color: 'var(--color-info)' };
                } else if (log.action === 'delete') {
                  actionBadgeStyle = { backgroundColor: 'var(--color-danger-bg)', color: 'var(--color-danger)' };
                }

                return (
                  <tr key={log._id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '12px 10px', color: 'var(--text-muted)' }}>
                      {new Date(log.createdAt).toLocaleString('en-IN')}
                    </td>
                    <td style={{ padding: '12px 10px' }}>
                      <span className="pill" style={{ fontSize: '10px', padding: '2px 6px', textTransform: 'uppercase', display: 'inline-block', whiteSpace: 'nowrap', ...actionBadgeStyle }}>
                        {log.action.replace('_', ' ')}
                      </span>
                    </td>
                    <td style={{ padding: '12px 10px', fontWeight: '600' }}>{residentName}</td>
                    <td style={{ padding: '12px 10px', color: 'var(--text-secondary)' }}>{log.entityType}</td>
                    <td style={{ padding: '12px 10px' }}>{operatorName}</td>
                    <td style={{ padding: '12px 10px', color: 'var(--text-secondary)', fontSize: '12px' }}>
                      {log.action === 'record_payment' && (
                        <span>Recorded offline payment of <b>{money(log.details.amount)}</b> for {log.details.purpose}</span>
                      )}
                      {log.action === 'edit' && (
                        <span>Updated billing month <b>{log.details.invoiceMonth}</b> expected <b>{money(log.details.newValue?.amount || log.details.oldValue?.amount)}</b></span>
                      )}
                      {log.action === 'delete' && (
                        <span>Deleted billing record worth <b>{money(log.details.amount || 0)}</b></span>
                      )}
                      {log.action === 'create' && (
                        <span>Created {log.entityType} record</span>
                      )}
                    </td>
                  </tr>
                );
              })}

              {auditLogs.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No audit records logged yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {reconciliationToast && <div className="toast">✓ {reconciliationToast}</div>}
    </div>
  );
}
