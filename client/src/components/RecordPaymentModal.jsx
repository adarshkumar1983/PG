import React, { useState, useEffect } from 'react';
import { X, Calendar, IndianRupee, FileText, CheckCircle2, AlertTriangle, HelpCircle } from 'lucide-react';
import { money } from '../utils/formatters.js';

export default function RecordPaymentModal({
  session,
  onClose,
  onSuccess,
  preselectedResident = null,
  preselectedInvoice = null,
  residents = [],
  payments = []
}) {
  const [step, setStep] = useState(1); // 1 = Form, 2 = Confirmation
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Form Fields
  const [residentId, setResidentId] = useState(preselectedResident?._id || '');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(preselectedInvoice?._id || '');
  const [amount, setAmount] = useState('');
  const [paidAt, setPaidAt] = useState(() => {
    // Current local ISO date-time string
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  });
  const [purpose, setPurpose] = useState('rent');
  const [invoiceMonth, setInvoiceMonth] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [allowOverpayment, setAllowOverpayment] = useState(false);

  // Computed data
  const activeResident = residents.find(r => r._id === residentId);
  
  // Get all outstanding payments (invoices) for this resident
  const residentInvoices = payments.filter(p => 
    p.residentId?._id === residentId && 
    ['due', 'pending', 'partially_paid'].includes(p.status)
  );

  // If a pre-selected invoice is provided, set initial values
  useEffect(() => {
    if (preselectedInvoice) {
      setSelectedInvoiceId(preselectedInvoice._id);
      setPurpose(preselectedInvoice.purpose || 'rent');
      setInvoiceMonth(preselectedInvoice.invoiceMonth || '');
      const outstanding = preselectedInvoice.amount - (preselectedInvoice.receivedAmount || 0);
      setAmount(outstanding.toString());
    }
  }, [preselectedInvoice]);

  // When selected invoice changes, update purpose, month, and amount due
  const handleInvoiceChange = (invId) => {
    setSelectedInvoiceId(invId);
    if (!invId) {
      setAmount('');
      return;
    }
    const inv = residentInvoices.find(i => i._id === invId);
    if (inv) {
      setPurpose(inv.purpose || 'rent');
      setInvoiceMonth(inv.invoiceMonth || '');
      const outstanding = inv.amount - (inv.receivedAmount || 0);
      setAmount(outstanding.toString());
    }
  };

  // Auto fill details if no invoice is selected but resident changes
  useEffect(() => {
    if (preselectedResident && !residentId) {
      setResidentId(preselectedResident._id);
    }
  }, [preselectedResident]);

  // Get outstanding balance for selected invoice (if any)
  const selectedInvoice = residentInvoices.find(i => i._id === selectedInvoiceId);
  const outstandingAmount = selectedInvoice 
    ? selectedInvoice.amount - (selectedInvoice.receivedAmount || 0)
    : null;

  const validate = () => {
    setError('');
    if (!residentId) return 'Please select a resident.';
    if (!amount || Number(amount) <= 0) return 'Please enter a valid amount.';
    if (!invoiceMonth) return 'Please enter or select a rent month.';
    if (!purpose) return 'Please select a payment purpose.';

    const paymentNum = Number(amount);
    if (outstandingAmount !== null && paymentNum > outstandingAmount && !allowOverpayment) {
      return `Amount exceeds outstanding due of ₹${outstandingAmount}. Check "Allow overpayment" if intended.`;
    }
    
    // Duplicate payment check (mock or real)
    const isDuplicate = payments.some(p => 
      p.residentId?._id === residentId &&
      p.invoiceMonth === invoiceMonth &&
      p.purpose === purpose &&
      p.receivedAmount === paymentNum &&
      p.status === 'paid' &&
      (Date.now() - new Date(p.updatedAt).getTime() < 300000) // Recorded in last 5 minutes
    );

    if (isDuplicate) {
      return `Potential duplicate: A matching payment for ₹${paymentNum} was recorded recently.`;
    }

    return '';
  };

  const handleNext = (e) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setStep(2);
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    
    try {
      const response = await fetch('/api/tenant/payments/record-cash', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.accessToken}`,
          'x-organization-id': session.organizationId
        },
        body: JSON.stringify({
          paymentId: selectedInvoiceId || undefined,
          residentId,
          amount: Number(amount),
          paidAt: new Date(paidAt).toISOString(),
          purpose,
          invoiceMonth,
          referenceNumber,
          notes,
          allowOverpayment
        })
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Failed to record payment');
      
      onSuccess('Cash payment recorded successfully!');
      onClose();
    } catch (err) {
      setError(err.message || 'An error occurred.');
      setStep(1);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal" onMouseDown={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
        <button type="button" className="modal-x" onClick={onClose}><X size={18} /></button>
        
        {step === 1 ? (
          <form onSubmit={handleNext}>
            <span className="modal-icon" style={{ backgroundColor: 'var(--color-success-bg)', color: 'var(--color-success)' }}>
              <IndianRupee size={22} />
            </span>
            <h2>Record Cash Payment</h2>
            <p>Enter details of cash received from the resident.</p>

            {error && (
              <div className="alert danger" style={{ padding: '10px 14px', borderRadius: '8px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <AlertTriangle size={16} />
                <span>{error}</span>
              </div>
            )}

            <div style={{ display: 'grid', gap: '14px' }}>
              <label>Select Resident
                <select 
                  value={residentId} 
                  onChange={e => {
                    setResidentId(e.target.value);
                    setSelectedInvoiceId('');
                  }}
                  disabled={!!preselectedResident}
                  required
                >
                  <option value="">-- Choose Resident --</option>
                  {residents.filter(r => r.status === 'active').map(r => (
                    <option key={r._id} value={r._id}>{r.name} (Room {r.roomId ? 'Assigned' : 'N/A'})</option>
                  ))}
                </select>
              </label>

              {residentId && residentInvoices.length > 0 && (
                <label>Link to Outstanding Invoice
                  <select value={selectedInvoiceId} onChange={e => handleInvoiceChange(e.target.value)}>
                    <option value="">-- No Link (Direct Cash Record) --</option>
                    {residentInvoices.map(inv => (
                      <option key={inv._id} value={inv._id}>
                        {inv.purpose.toUpperCase()} ({inv.invoiceMonth}) - Due: {money(inv.amount - inv.receivedAmount)}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              <div className="form-row">
                <label>Amount Received (₹)
                  <input
                    type="number"
                    min="1"
                    step="any"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    placeholder="e.g. 5000"
                    required
                  />
                </label>

                <label>Rent Month
                  <input
                    type="month"
                    value={invoiceMonth}
                    onChange={e => setInvoiceMonth(e.target.value)}
                    required
                  />
                </label>
              </div>

              <div className="form-row">
                <label>Payment Purpose
                  <select value={purpose} onChange={e => setPurpose(e.target.value)} required>
                    <option value="rent">Rent</option>
                    <option value="security_deposit">Security Deposit</option>
                    <option value="electricity">Electricity</option>
                    <option value="water">Water</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="fine">Fine</option>
                    <option value="other">Other</option>
                  </select>
                </label>

                <label>Payment Date & Time
                  <input
                    type="datetime-local"
                    value={paidAt}
                    onChange={e => setPaidAt(e.target.value)}
                    required
                  />
                </label>
              </div>

              <div className="form-row">
                <label>Receipt/Ref Number (Optional)
                  <input
                    value={referenceNumber}
                    onChange={e => setReferenceNumber(e.target.value)}
                    placeholder="e.g. CSH-8742"
                  />
                </label>

                <label style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none', height: '100%', paddingTop: '20px' }}>
                  <input
                    type="checkbox"
                    checked={allowOverpayment}
                    onChange={e => setAllowOverpayment(e.target.checked)}
                    style={{ width: '18px', height: '18px', margin: 0 }}
                  />
                  <span style={{ fontSize: '13px' }}>Allow Overpayment</span>
                </label>
              </div>

              <label>Notes (Optional)
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="e.g. Paid in cash at counter"
                  rows={2}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text-primary)', resize: 'none' }}
                />
              </label>
            </div>

            <div className="modal-actions" style={{ marginTop: '20px' }}>
              <button type="button" className="secondary" onClick={onClose}>Cancel</button>
              <button type="submit" className="primary" style={{ backgroundColor: 'var(--green)' }}>Review & Confirm</button>
            </div>
          </form>
        ) : (
          <div>
            <span className="modal-icon" style={{ backgroundColor: 'var(--color-info-bg)', color: 'var(--color-info)' }}>
              <CheckCircle2 size={22} />
            </span>
            <h2>Confirm Cash Recording</h2>
            <p style={{ color: 'var(--text-secondary)' }}>Review the transaction details before committing to the financial ledger.</p>

            <div className="card" style={{ padding: '16px', background: 'var(--app-bg)', border: '1px solid var(--border)', borderRadius: '10px', margin: '20px 0', fontSize: '14px' }}>
              <div style={{ display: 'grid', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Resident:</span>
                  <b>{activeResident?.name || 'N/A'}</b>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Amount Paid:</span>
                  <b style={{ color: 'var(--green)', fontSize: '16px' }}>{money(Number(amount))}</b>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Purpose:</span>
                  <b style={{ textTransform: 'capitalize' }}>{purpose}</b>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Rent Month:</span>
                  <b>{invoiceMonth}</b>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Date & Time:</span>
                  <b>{new Date(paidAt).toLocaleString('en-IN')}</b>
                </div>
                {referenceNumber && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Receipt #:</span>
                    <b>{referenceNumber}</b>
                  </div>
                )}
                {notes && (
                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: '10px', marginTop: '4px' }}>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '12px' }}>Notes:</span>
                    <i style={{ color: 'var(--text-secondary)' }}>"{notes}"</i>
                  </div>
                )}
              </div>
            </div>

            {error && (
              <div className="alert danger" style={{ padding: '10px 14px', borderRadius: '8px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <AlertTriangle size={16} />
                <span>{error}</span>
              </div>
            )}

            <div className="modal-actions">
              <button type="button" className="secondary" onClick={() => setStep(1)} disabled={saving}>Back to Edit</button>
              <button 
                type="button" 
                className="primary" 
                onClick={handleSave} 
                disabled={saving}
                style={{ backgroundColor: 'var(--green)', position: 'relative' }}
              >
                {saving ? 'Recording...' : 'Confirm & Save'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
