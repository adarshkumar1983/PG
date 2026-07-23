import React from 'react';
import { CheckCircle2, Clock, ShieldCheck, Zap, Building2, AlertCircle } from 'lucide-react';

export default function SettlementTimeline({ payment }) {
  const isPaid = payment?.status === 'paid';
  const settlementStatus = payment?.settlementStatus || (isPaid ? 'processing' : 'pending');

  const getStepStatus = (stepIndex) => {
    if (!isPaid) return stepIndex === 0 ? 'current' : 'upcoming';
    
    if (settlementStatus === 'completed') return 'completed';
    
    if (settlementStatus === 'failed') {
      if (stepIndex < 3) return 'completed';
      if (stepIndex === 3) return 'failed';
      return 'upcoming';
    }

    // Processing status
    if (stepIndex <= 3) return 'completed';
    return 'current';
  };

  const steps = [
    {
      title: 'Resident Paid Rent',
      desc: `${payment?.residentName || 'Resident'} authorized transaction`,
      icon: Zap,
      time: payment?.paidAt ? new Date(payment.paidAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : 'Pending'
    },
    {
      title: 'Payment Verified by StayZen',
      desc: 'HMAC signature validated · Fee split (2% / 98%)',
      icon: ShieldCheck,
      time: payment?.paidAt ? new Date(payment.paidAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : 'Pending'
    },
    {
      title: 'Transfer Initiated',
      desc: payment?.transferId ? `Transfer ID: ${payment.transferId}` : 'Razorpay Route transfer created',
      icon: CheckCircle2,
      time: payment?.paidAt ? new Date(payment.paidAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : 'Processing'
    },
    {
      title: 'Settlement In Progress',
      desc: 'Expected completion: 1–2 business days',
      icon: Clock,
      time: payment?.expectedSettlementDate ? new Date(payment.expectedSettlementDate).toLocaleDateString('en-IN') : '1–2 days'
    },
    {
      title: 'Funds Transferred to Owner Bank',
      desc: `A/C Settlement ₹${new Intl.NumberFormat('en-IN').format(payment?.ownerAmount || payment?.amount || 0)}`,
      icon: Building2,
      time: payment?.settledAt ? new Date(payment.settledAt).toLocaleDateString('en-IN') : 'Scheduled'
    }
  ];

  return (
    <div className="settlement-timeline" style={{ padding: '16px 0' }}>
      <h4 style={{ fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
        Settlement Progress Timeline
      </h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', position: 'relative' }}>
        {steps.map((step, idx) => {
          const status = getStepStatus(idx);
          const Icon = status === 'failed' ? AlertCircle : step.icon;

          let iconBg = 'var(--table-head-bg)';
          let iconColor = 'var(--text-secondary)';
          let borderStyle = '1px solid var(--border)';

          if (status === 'completed') {
            iconBg = '#e6efe9';
            iconColor = 'var(--green)';
            borderStyle = '1px solid #c2ffd4';
          } else if (status === 'current') {
            iconBg = '#ebf5ff';
            iconColor = '#2563eb';
            borderStyle = '1px solid #bfdbfe';
          } else if (status === 'failed') {
            iconBg = '#fde8e4';
            iconColor = '#b45309';
            borderStyle = '1px solid #fed7aa';
          }

          return (
            <div key={step.title} style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', position: 'relative' }}>
              {idx < steps.length - 1 && (
                <div 
                  style={{
                    position: 'absolute',
                    left: '17px',
                    top: '36px',
                    bottom: '-20px',
                    width: '2px',
                    backgroundColor: status === 'completed' ? 'var(--green)' : 'var(--border)',
                    transition: 'background-color 0.3s'
                  }}
                />
              )}
              <div 
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  backgroundColor: iconBg,
                  color: iconColor,
                  border: borderStyle,
                  display: 'grid',
                  placeItems: 'center',
                  zIndex: 2,
                  flexShrink: 0,
                  transition: 'all 0.3s'
                }}
              >
                <Icon size={18} />
              </div>
              <div style={{ flex: 1, marginTop: '2px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ fontSize: '14px', color: 'var(--text-primary)', fontWeight: '600' }}>
                    {step.title}
                  </strong>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '500' }}>
                    {step.time}
                  </span>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
                  {step.desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
