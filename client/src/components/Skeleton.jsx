import React from 'react';

/**
 * Basic Shimmer Block
 */
export function SkeletonBlock({ width = '100%', height = '16px', borderRadius = '6px', style = {} }) {
  return (
    <div
      className="skeleton-shimmer"
      style={{
        width,
        height,
        borderRadius,
        ...style
      }}
    />
  );
}

/**
 * Card Skeleton (for metrics / widgets)
 */
export function CardSkeleton({ count = 4, height = '90px' }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(200px, 1fr))`, gap: '16px', width: '100%', marginBottom: '20px' }}>
      {Array.from({ length: count }).map((_, idx) => (
        <div key={idx} className="skeleton-card" style={{ minHeight: height }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <SkeletonBlock width="32px" height="32px" borderRadius="8px" />
            <SkeletonBlock width="50%" height="14px" />
          </div>
          <SkeletonBlock width="70%" height="24px" borderRadius="6px" />
          <SkeletonBlock width="40%" height="12px" />
        </div>
      ))}
    </div>
  );
}

/**
 * Table Skeleton (for lists and data tables)
 */
export function TableSkeleton({ rows = 6, cols = 5 }) {
  return (
    <div style={{ width: '100%', background: 'var(--card-bg, #ffffff)', border: '1px solid var(--border, #e5e7eb)', borderRadius: '14px', overflow: 'hidden' }}>
      {/* Table Header Placeholder */}
      <div style={{ display: 'flex', gap: '16px', padding: '14px 18px', background: 'var(--table-head-bg, #f9fafb)', borderBottom: '1px solid var(--border, #e5e7eb)' }}>
        {Array.from({ length: cols }).map((_, idx) => (
          <SkeletonBlock key={idx} width={`${Math.max(15, 100 / cols - 5)}%`} height="14px" />
        ))}
      </div>

      {/* Table Rows */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div key={rowIdx} className="skeleton-row" style={{ display: 'flex', gap: '16px', padding: '16px 18px' }}>
          {Array.from({ length: cols }).map((_, colIdx) => (
            <div key={colIdx} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
              {colIdx === 0 && <SkeletonBlock width="28px" height="28px" borderRadius="50%" />}
              <SkeletonBlock width={`${colIdx === 0 ? '60%' : colIdx === cols - 1 ? '40%' : '75%'}`} height="14px" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * Generic Content Skeleton
 */
export function ContentSkeleton({ lines = 4 }) {
  return (
    <div className="skeleton-card" style={{ width: '100%', gap: '14px' }}>
      <SkeletonBlock width="35%" height="20px" />
      {Array.from({ length: lines }).map((_, idx) => (
        <SkeletonBlock key={idx} width={`${90 - (idx % 3) * 15}%`} height="14px" />
      ))}
    </div>
  );
}
