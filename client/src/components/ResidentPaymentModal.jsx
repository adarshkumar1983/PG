import React, { useState } from 'react';
import { X, Copy, Check, QrCode, Landmark, ShieldCheck, CreditCard, Loader2 } from 'lucide-react';
import { money, formatInvoicePeriod } from '../utils/formatters.js';
export default function ResidentPaymentModal({
  session,
  payment,
  upiId,
  bankDetails,
  directSettlementEnabled = true,
  onlineGatewayEnabled = true,
  pgName,
  onClose,
  onSuccess,
  handlePayOnline
}) {
  const showUpi = directSettlementEnabled !== false && !!upiId;
  const showBank = directSettlementEnabled !== false && bankDetails && !!bankDetails.accountNumber;
  const showGateway = onlineGatewayEnabled !== false;

  const [activeTab, setActiveTab] = useState(() => {
    if (showUpi) return 'upi';
    if (showBank) return 'bank';
    if (showGateway) return 'gateway';
    return '';
  });
  const outstandingAmount = payment.amount - (payment.receivedAmount || 0);
  const [reportedAmount, setReportedAmount] = useState(outstandingAmount.toString());
  const [copiedField, setCopiedField] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [screenshot, setScreenshot] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleScreenshotChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError('Screenshot file size must be less than 5MB.');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setScreenshot(reader.result);
    };
    reader.onerror = () => {
      setError('Failed to read screenshot file.');
    };
    reader.readAsDataURL(file);
  };

  const copyToClipboard = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(''), 2000);
  };

  const handleSubmitOffline = async (e) => {
    e.preventDefault();
    if (!referenceNumber.trim()) {
      setError('Transaction Reference Number (UTR) is required.');
      return;
    }
    if (referenceNumber.trim().length < 6) {
      setError('Please enter a valid Transaction Reference Number.');
      return;
    }

    const parsedAmount = Number(reportedAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Please enter a valid amount paid.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const response = await fetch(`/api/tenant/payments/${payment._id}/report-offline`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.accessToken}`,
          'x-organization-id': session.organizationId
        },
        body: JSON.stringify({
          method: activeTab === 'upi' ? 'upi' : 'bank_transfer',
          referenceNumber: referenceNumber.trim(),
          amount: parsedAmount,
          notes,
          screenshot
        })
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Failed to submit transaction reference.');

      onSuccess(`Payment reported successfully! Ref: ${referenceNumber}`);
      onClose();
    } catch (err) {
      setError(err.message || 'Error reporting payment.');
    } finally {
      setSubmitting(false);
    }
  };

  const invoiceLabel = `${formatInvoicePeriod(payment)} · ${payment.purpose ? payment.purpose.charAt(0).toUpperCase() + payment.purpose.slice(1) : 'Rent'}`;
  const upiUrl = upiId ? `upi://pay?pa=${upiId}&pn=${encodeURIComponent(pgName)}&am=${payment.amount}&cu=INR&tn=${encodeURIComponent(invoiceLabel)}` : '';

  const activeTabsCount = [showUpi, showBank, showGateway].filter(Boolean).length;

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <style dangerouslySetInnerHTML={{__html: `
        .pay-modal {
          max-width: 500px;
          width: 100%;
        }
        .pay-tab-buttons {
          display: grid;
          grid-template-columns: repeat(${activeTabsCount || 1}, 1fr);
          gap: 8px;
          margin-bottom: 20px;
          background: var(--table-head-bg);
          padding: 4px;
          border-radius: 10px;
        }
        .pay-tab-btn {
          border: none;
          background: transparent;
          color: var(--text-secondary);
          padding: 10px 4px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          border-radius: 8px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          transition: all 0.2s ease;
        }
        .pay-tab-btn.active {
          background: var(--card-bg);
          color: var(--green);
          box-shadow: 0 4px 10px rgba(0,0,0,0.04);
        }
        .copy-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: var(--table-head-bg);
          padding: 8px 12px;
          border-radius: 8px;
          font-family: monospace;
          font-size: 13px;
          border: 1px solid var(--border);
          margin-top: 4px;
          color: var(--text-primary);
        }
        .copy-btn {
          background: none;
          border: none;
          color: var(--green);
          cursor: pointer;
          padding: 4px;
          display: flex;
          align-items: center;
        }
        .qr-box {
          background: white;
          padding: 12px;
          border-radius: 12px;
          box-shadow: 0 4px 16px rgba(0,0,0,0.06);
          border: 1px solid var(--border);
          display: inline-block;
        }
      `}} />
      <div className="modal pay-modal" onMouseDown={e => e.stopPropagation()}>
        <button type="button" className="modal-x" onClick={onClose}><X size={18} /></button>
        <span className="modal-icon" style={{ backgroundColor: 'var(--mint)', color: 'var(--green)' }}><Landmark /></span>
        <h2>Pay Rent Dues</h2>
        <p style={{ marginBottom: '16px' }}>Invoice: <b>{invoiceLabel}</b> · Amount: <strong style={{ color: 'var(--green)' }}>{money(payment.amount)}</strong></p>

        {error && (
          <div className="alert danger" style={{ padding: '8px 12px', fontSize: '12px', marginBottom: '14px' }}>
            {error}
          </div>
        )}

        {activeTabsCount > 0 ? (
          <div className="pay-tab-buttons">
            {showUpi && (
              <button type="button" className={`pay-tab-btn ${activeTab === 'upi' ? 'active' : ''}`} onClick={() => setActiveTab('upi')}>
                <QrCode size={16} /> UPI QR Code
              </button>
            )}
            {showBank && (
              <button type="button" className={`pay-tab-btn ${activeTab === 'bank' ? 'active' : ''}`} onClick={() => setActiveTab('bank')}>
                <Landmark size={16} /> Bank Transfer
              </button>
            )}
            {showGateway && (
              <button type="button" className={`pay-tab-btn ${activeTab === 'gateway' ? 'active' : ''}`} onClick={() => setActiveTab('gateway')}>
                <CreditCard size={16} /> Pay Online
              </button>
            )}
          </div>
        ) : (
          <div className="alert warn" style={{ padding: '12px', fontSize: '13px', marginBottom: '20px', lineHeight: '1.5' }}>
            ⚠️ <b>Online Checkout Paused:</b> Direct UPI, Bank Transfer, and Gateway options are currently inactive for this property. Please coordinate payment directly with the PG management.
          </div>
        )}

        {activeTab === 'upi' && upiId && (
          <div className="fade-in-up" style={{ textAlign: 'center' }}>
            <p style={{ margin: '0 0 16px', fontSize: '12px', color: 'var(--text-secondary)' }}>
              Scan the QR Code below with any UPI App (GPay, PhonePe, Paytm, BHIM) to make the direct transfer.
            </p>
            
            <div className="qr-box">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(upiUrl)}`}
                alt="UPI QR Code"
                style={{ display: 'block', width: '200px', height: '200px' }}
              />
            </div>

            <div style={{ marginTop: '16px', textAlign: 'left' }}>
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-secondary)' }}>UPI ID</label>
              <div className="copy-row">
                <span>{upiId}</span>
                <button type="button" className="copy-btn" onClick={() => copyToClipboard(upiId, 'upiId')}>
                  {copiedField === 'upiId' ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmitOffline} style={{ marginTop: '20px', textAlign: 'left' }}>
               <label>Amount (₹)
                 <input
                   type="text"
                   disabled
                   value={money(outstandingAmount)}
                   style={{
                     width: '100%',
                     marginTop: '4px',
                     background: 'var(--table-head-bg)',
                     color: 'var(--text-secondary)',
                     cursor: 'not-allowed',
                     fontWeight: '700',
                     border: '1px solid var(--border)',
                     borderRadius: '8px',
                     padding: '10px 12px'
                   }}
                 />
               </label>
               
               <label style={{ marginTop: '10px', display: 'block' }}>Transaction UTR / UPI Ref ID
                 <input
                   required
                   placeholder="e.g. 12-digit UPI reference number"
                   value={referenceNumber}
                   onChange={e => setReferenceNumber(e.target.value.replace(/\D/g, '').slice(0, 12))}
                   style={{ width: '100%', marginTop: '4px' }}
                 />
               </label>
              <label style={{ marginTop: '10px', display: 'block' }}>Notes (optional)
                <input
                  placeholder="e.g. Paid via GPay"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  style={{ width: '100%', marginTop: '4px' }}
                />
              </label>
              
              <label style={{ marginTop: '10px', display: 'block' }}>Upload Screenshot / Proof of Payment (optional)
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleScreenshotChange}
                  style={{ width: '100%', marginTop: '4px', padding: '4px', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '12px', background: 'var(--input-bg)', color: 'var(--text-primary)' }}
                />
              </label>
              {screenshot && (
                <div style={{ marginTop: '10px', position: 'relative', display: 'inline-block' }}>
                  <img src={screenshot} alt="Screenshot Preview" style={{ maxWidth: '100px', maxHeight: '100px', borderRadius: '8px', border: '1px solid var(--border)' }} />
                  <button type="button" onClick={() => setScreenshot('')} style={{ position: 'absolute', top: '-5px', right: '-5px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '50%', width: '18px', height: '18px', display: 'grid', placeItems: 'center', cursor: 'pointer', fontSize: '10px', fontWeight: 'bold' }}>✕</button>
                </div>
              )}
              
              <div className="modal-actions" style={{ marginTop: '20px' }}>
                <button type="button" className="secondary" onClick={onClose} disabled={submitting}>Cancel</button>
                <button className="primary" style={{ backgroundColor: 'var(--green)' }} disabled={submitting}>
                  {submitting ? <Loader2 size={16} className="spin" /> : 'Submit for Verification'}
                </button>
              </div>
            </form>
          </div>
        )}

        {activeTab === 'bank' && bankDetails && bankDetails.accountNumber && (
          <div className="fade-in-up">
            <p style={{ margin: '0 0 16px', fontSize: '12px', color: 'var(--text-secondary)' }}>
              Transfer the exact rent amount to the PG bank account listed below.
            </p>

            <div style={{ display: 'grid', gap: '10px', background: 'var(--table-head-bg)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)' }}>
              <div>
                <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block' }}>Account Holder</span>
                <b style={{ color: 'var(--text-primary)', fontSize: '13px' }}>{bankDetails.accountName}</b>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block' }}>Account Number</span>
                  <b style={{ color: 'var(--text-primary)', fontSize: '13px', fontFamily: 'monospace' }}>{bankDetails.accountNumber}</b>
                </div>
                <button type="button" className="copy-btn" onClick={() => copyToClipboard(bankDetails.accountNumber, 'acc')}>
                  {copiedField === 'acc' ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>

              <div>
                <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block' }}>Bank Name</span>
                <b style={{ color: 'var(--text-primary)', fontSize: '13px' }}>{bankDetails.bankName}</b>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block' }}>IFSC Code</span>
                  <b style={{ color: 'var(--text-primary)', fontSize: '13px', fontFamily: 'monospace' }}>{bankDetails.ifscCode}</b>
                </div>
                <button type="button" className="copy-btn" onClick={() => copyToClipboard(bankDetails.ifscCode, 'ifsc')}>
                  {copiedField === 'ifsc' ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmitOffline} style={{ marginTop: '20px' }}>
               <label>Amount (₹)
                 <input
                   type="text"
                   disabled
                   value={money(outstandingAmount)}
                   style={{
                     width: '100%',
                     marginTop: '4px',
                     background: 'var(--table-head-bg)',
                     color: 'var(--text-secondary)',
                     cursor: 'not-allowed',
                     fontWeight: '700',
                     border: '1px solid var(--border)',
                     borderRadius: '8px',
                     padding: '10px 12px'
                   }}
                 />
               </label>

               <label style={{ marginTop: '10px', display: 'block' }}>Bank Transfer Reference / UTR
                 <input
                   required
                   placeholder="e.g. Bank transaction UTR number"
                   value={referenceNumber}
                   onChange={e => setReferenceNumber(e.target.value.replace(/\D/g, ''))}
                   style={{ width: '100%', marginTop: '4px' }}
                 />
               </label>
              <label style={{ marginTop: '10px', display: 'block' }}>Notes (optional)
                <input
                  placeholder="e.g. Netbanking IMPS"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  style={{ width: '100%', marginTop: '4px' }}
                />
              </label>

              <label style={{ marginTop: '10px', display: 'block' }}>Upload Screenshot / Proof of Payment (optional)
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleScreenshotChange}
                  style={{ width: '100%', marginTop: '4px', padding: '4px', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '12px', background: 'var(--input-bg)', color: 'var(--text-primary)' }}
                />
              </label>
              {screenshot && (
                <div style={{ marginTop: '10px', position: 'relative', display: 'inline-block' }}>
                  <img src={screenshot} alt="Screenshot Preview" style={{ maxWidth: '100px', maxHeight: '100px', borderRadius: '8px', border: '1px solid var(--border)' }} />
                  <button type="button" onClick={() => setScreenshot('')} style={{ position: 'absolute', top: '-5px', right: '-5px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '50%', width: '18px', height: '18px', display: 'grid', placeItems: 'center', cursor: 'pointer', fontSize: '10px', fontWeight: 'bold' }}>✕</button>
                </div>
              )}
              
              <div className="modal-actions" style={{ marginTop: '20px' }}>
                <button type="button" className="secondary" onClick={onClose} disabled={submitting}>Cancel</button>
                <button className="primary" style={{ backgroundColor: 'var(--green)' }} disabled={submitting}>
                  {submitting ? <Loader2 size={16} className="spin" /> : 'Submit for Verification'}
                </button>
              </div>
            </form>
          </div>
        )}

        {activeTab === 'gateway' && (
          <div className="fade-in-up" style={{ textAlign: 'center', padding: '10px 0' }}>
            <p style={{ margin: '0 0 20px', fontSize: '13px', color: 'var(--text-secondary)' }}>
              Pay instantly using Cards, UPI, Netbanking, or Wallets via secure online gateway.
            </p>
            <div style={{ padding: '24px', background: 'var(--table-head-bg)', borderRadius: '16px', border: '1px solid var(--border)', display: 'inline-block', width: '100%' }}>
              <ShieldCheck size={40} style={{ color: 'var(--green)', margin: '0 auto 12px' }} />
              <h4 style={{ margin: '0 0 4px', fontSize: '14px', fontWeight: '700' }}>Instant Payment Credit</h4>
              <p style={{ margin: '0 0 20px', fontSize: '11px', color: 'var(--text-secondary)' }}>Your rent receipt is generated automatically and instantly once the transaction is authorized.</p>
              
              <button
                type="button"
                className="primary"
                onClick={() => {
                  handlePayOnline(payment._id, payment.amount, payment.invoiceMonth);
                  onClose();
                }}
                style={{ width: '100%', backgroundColor: 'var(--green)' }}
              >
                Launch Checkout ({money(payment.amount)})
              </button>
            </div>
            
            <div className="modal-actions" style={{ marginTop: '20px' }}>
              <button type="button" className="secondary" onClick={onClose}>Cancel</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
