import React from 'react';
import { X, CheckCircle2, Shield, Calendar, CreditCard, ArrowRightLeft, DollarSign, Building } from 'lucide-react';
import SettlementTimeline from './SettlementTimeline.jsx';

export default function SettlementDetailsModal({ payment, onClose }) {
  if (!payment) return null;

  const money = (num) => `₹${new Intl.NumberFormat('en-IN').format(num || 0)}`;

  const amount = payment.amount || 0;
  const platformFee = payment.platformFee || Math.round(amount * 0.02 * 100) / 100;
  const ownerAmount = payment.ownerAmount || Math.round((amount - platformFee) * 100) / 100;
  const residentName = payment.residentName || payment.residentId?.name || payment.name || 'Resident';
  const invoiceMonth = payment.invoiceMonth || 'Rent Invoice';

  const isCompleted = payment.settlementStatus === 'completed';
  const isFailed = payment.settlementStatus === 'failed';

  let statusBg = '#ebf5ff';
  let statusColor = '#2563eb';
  let statusText = 'Processing';

  if (isCompleted) {
    statusBg = '#e6efe9';
    statusColor = 'var(--green)';
    statusText = 'Completed';
  } else if (isFailed) {
    statusBg = '#fde8e4';
    statusColor = '#b45309';
    statusText = 'Failed';
  }

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.45)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        display: 'grid',
        placeItems: 'center',
        zIndex: 1000,
        padding: '20px',
        animation: 'fadeIn 0.25s ease-out'
      }}
      onClick={onClose}
    >
      <div 
        style={{
          backgroundColor: 'var(--card-bg)',
          border: '1px solid var(--border)',
          borderRadius: '20px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          maxWidth: '680px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '28px',
          color: 'var(--text-primary)',
          position: 'relative'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span className="eyebrow" style={{ margin: 0 }}>Razorpay Route Settlement</span>
              <span 
                style={{ 
                  backgroundColor: statusBg, 
                  color: statusColor, 
                  fontSize: '11px', 
                  fontWeight: '700', 
                  padding: '2px 8px', 
                  borderRadius: '12px',
                  textTransform: 'uppercase'
                }}
              >
                {statusText}
              </span>
            </div>
            <h2 style={{ fontSize: '22px', fontWeight: '800', margin: 0 }}>Settlement Details</h2>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            style={{
              border: 0,
              background: 'var(--table-head-bg)',
              color: 'var(--text-secondary)',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              display: 'grid',
              placeItems: 'center',
              cursor: 'pointer'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Apple HIG Hero Banner */}
        <div 
          style={{
            background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.08) 0%, rgba(16, 185, 129, 0.08) 100%)',
            border: '1px solid var(--border)',
            borderRadius: '14px',
            padding: '20px',
            marginBottom: '24px'
          }}
        >
          <p style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)', margin: '0 0 10px 0', lineHeight: '1.5' }}>
            “{residentName} has successfully paid <b>{money(amount)}</b> for {invoiceMonth} rent.”
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginTop: '14px' }}>
            <div style={{ background: 'var(--card-bg)', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border)' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block' }}>StayZen Platform Fee (2%)</span>
              <strong style={{ fontSize: '15px', color: '#b45309' }}>{money(platformFee)}</strong>
            </div>
            <div style={{ background: 'var(--card-bg)', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border)' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block' }}>Amount to be Settled (98%)</span>
              <strong style={{ fontSize: '15px', color: 'var(--green)' }}>{money(ownerAmount)}</strong>
            </div>
            <div style={{ background: 'var(--card-bg)', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border)' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block' }}>Expected Settlement Time</span>
              <strong style={{ fontSize: '13px', color: 'var(--text-primary)' }}>1–2 business days</strong>
            </div>
          </div>
        </div>

        {/* Detailed Metadata Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', border: '1px solid var(--border)', borderRadius: '10px' }}>
            <CreditCard size={18} style={{ color: 'var(--green)' }} />
            <div>
              <small style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)' }}>Payment ID</small>
              <span style={{ fontSize: '13px', fontWeight: '600', fontFamily: 'monospace' }}>{payment.paymentId || payment.gatewayPaymentId || 'pay_live_verified'}</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', border: '1px solid var(--border)', borderRadius: '10px' }}>
            <ArrowRightLeft size={18} style={{ color: '#2563eb' }} />
            <div>
              <small style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)' }}>Route Transfer ID</small>
              <span style={{ fontSize: '13px', fontWeight: '600', fontFamily: 'monospace' }}>{payment.transferId || 'trf_route_auto'}</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', border: '1px solid var(--border)', borderRadius: '10px' }}>
            <Calendar size={18} style={{ color: 'var(--text-secondary)' }} />
            <div>
              <small style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)' }}>Payment Date</small>
              <span style={{ fontSize: '13px', fontWeight: '600' }}>
                {payment.paidAt ? new Date(payment.paidAt).toLocaleDateString('en-IN') : 'Today'}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', border: '1px solid var(--border)', borderRadius: '10px' }}>
            <Building size={18} style={{ color: 'var(--text-secondary)' }} />
            <div>
              <small style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)' }}>Expected Bank Settlement</small>
              <span style={{ fontSize: '13px', fontWeight: '600' }}>
                {payment.expectedSettlementDate ? new Date(payment.expectedSettlementDate).toLocaleDateString('en-IN') : '1–2 Days'}
              </span>
            </div>
          </div>
        </div>

        {/* Embedded Settlement Timeline */}
        <hr style={{ border: 0, borderTop: '1px solid var(--border)', margin: '20px 0' }} />
        <SettlementTimeline payment={payment} />

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
          <button className="primary" onClick={onClose} style={{ padding: '10px 20px', borderRadius: '10px' }}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
