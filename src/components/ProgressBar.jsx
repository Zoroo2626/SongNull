import React from 'react';

export default function ProgressBar({ current, total }) {
  const percentage = total === 0 ? 0 : Math.round((current / total) * 100);
  
  return (
    <div style={{ width: '100%', marginTop: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
        <span>Removing tracks...</span>
        <span>{percentage}% ({current}/{total})</span>
      </div>
      <div style={{ 
        width: '100%', 
        height: '8px', 
        backgroundColor: 'var(--color-bg-elevated)', 
        borderRadius: 'var(--radius-full)',
        overflow: 'hidden'
      }}>
        <div style={{
          height: '100%',
          width: `${percentage}%`,
          backgroundColor: 'var(--color-brand)',
          borderRadius: 'var(--radius-full)',
          transition: 'width var(--transition-normal)'
        }} />
      </div>
    </div>
  );
}
