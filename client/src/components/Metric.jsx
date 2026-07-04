import React from 'react';
import { TrendingUp } from 'lucide-react';

/**
 * Metric Card Component for Dashboard
 */
export function Metric({ icon, label, value, note, positive, danger }) {
  return (
    <article className="metric card">
      <div className="metric-top">
        <span>{icon}</span>
        <TrendingUp size={17} />
      </div>
      <small>{label}</small>
      <strong>{value}</strong>
      <p className={danger ? 'danger-text' : positive ? 'positive-text' : ''}>
        {positive && '↗ '}
        {note}
      </p>
    </article>
  );
}
export default Metric;
