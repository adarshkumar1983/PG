import React from 'react';
import { Building2 } from 'lucide-react';

export default function Logo({ size = 28, showTagline = false, className = '' }) {
  return (
    <div className={`brand-logo-container ${className}`} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <span className="brand-mark" style={{ display: 'grid', placeItems: 'center', width: `${size}px`, height: `${size}px` }}>
        <Building2 size={Math.round(size * 0.65)} />
      </span>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <span style={{ fontWeight: 800, fontSize: '18px', letterSpacing: '-0.02em', color: 'var(--text-primary)', lineHeight: 1.1 }}>
          Stay<span style={{ color: 'var(--green)' }}>Zen</span>
        </span>
        {showTagline && (
          <span style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            PG Platform
          </span>
        )}
      </div>
    </div>
  );
}
