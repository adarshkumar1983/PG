import React from 'react';
import { Wallet, Clock, TrendingUp, ShieldAlert, ArrowUpRight, Percent } from 'lucide-react';

export default function OwnerAnalyticsCard({ analytics, onSelectPayment }) {
  const money = (num) => `₹${new Intl.NumberFormat('en-IN').format(num || 0)}`;

  const monthlyEarnings = analytics?.monthlyEarnings || 0;
  const pendingSettlements = analytics?.pendingSettlements || 0;
  const totalFeeCollected = analytics?.totalFeeCollected || 0;
  const completedCount = analytics?.completedSettlementsCount || 0;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '24px' }}>
      {/* Monthly Earnings Card */}
      <div 
        className="card"
        style={{
          padding: '20px',
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(5, 150, 105, 0.02) 100%)',
          border: '1px solid rgba(16, 185, 129, 0.2)',
          borderRadius: '16px',
          position: 'relative'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
          <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--green)', letterSpacing: '0.5px' }}>
            Monthly Net Earnings
          </span>
          <div style={{ width: '32px', height: '32px', borderRadius: '10px', backgroundColor: '#e6efe9', display: 'grid', placeItems: 'center', color: 'var(--green)' }}>
            <TrendingUp size={18} />
          </div>
        </div>
        <strong style={{ fontSize: '24px', fontWeight: '800', display: 'block', color: 'var(--text-primary)' }}>
          {money(monthlyEarnings)}
        </strong>
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '6px 0 0 0' }}>
          98% Net after StayZen Platform Fee
        </p>
      </div>

      {/* Pending Settlements Card */}
      <div 
        className="card"
        style={{
          padding: '20px',
          background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.08) 0%, rgba(29, 78, 216, 0.02) 100%)',
          border: '1px solid rgba(37, 99, 235, 0.2)',
          borderRadius: '16px',
          position: 'relative'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
          <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: '#2563eb', letterSpacing: '0.5px' }}>
            Pending Settlements
          </span>
          <div style={{ width: '32px', height: '32px', borderRadius: '10px', backgroundColor: '#ebf5ff', display: 'grid', placeItems: 'center', color: '#2563eb' }}>
            <Clock size={18} />
          </div>
        </div>
        <strong style={{ fontSize: '24px', fontWeight: '800', display: 'block', color: 'var(--text-primary)' }}>
          {money(pendingSettlements)}
        </strong>
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '6px 0 0 0' }}>
          In progress · Settling in 1–2 business days
        </p>
      </div>

      {/* Platform Fees & Settlement Rate */}
      <div 
        className="card"
        style={{
          padding: '20px',
          background: 'var(--card-bg)',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          position: 'relative'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
          <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.5px' }}>
            Platform Fee & Completed
          </span>
          <div style={{ width: '32px', height: '32px', borderRadius: '10px', backgroundColor: 'var(--table-head-bg)', display: 'grid', placeItems: 'center', color: 'var(--text-secondary)' }}>
            <Percent size={18} />
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <strong style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-primary)' }}>
            {money(totalFeeCollected)}
          </strong>
          <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--green)' }}>
            {completedCount} settled
          </span>
        </div>
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '6px 0 0 0' }}>
          2% StayZen service fee summary
        </p>
      </div>
    </div>
  );
}
