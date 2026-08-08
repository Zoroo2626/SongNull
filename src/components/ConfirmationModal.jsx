import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import ProgressBar from './ProgressBar';

export default function ConfirmationModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  trackCount, 
  isDeleting, 
  progressCurrent, 
  progressTotal 
}) {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 100
    }}>
      <div className="glass-panel" style={{
        width: '100%',
        maxWidth: '450px',
        padding: 'var(--space-6)',
        borderRadius: 'var(--radius-md)',
        position: 'relative',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
      }}>
        {!isDeleting && (
          <button 
            onClick={onClose}
            style={{ position: 'absolute', top: '16px', right: '16px', color: 'var(--color-text-secondary)' }}
          >
            <X size={20} />
          </button>
        )}
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
          <div style={{ padding: '8px', backgroundColor: 'rgba(241, 94, 108, 0.1)', borderRadius: '50%', color: 'var(--color-error)' }}>
            <AlertTriangle size={24} />
          </div>
          <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Confirm Deletion</h2>
        </div>
        
        <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-6)' }}>
          You are about to remove <strong>{trackCount} tracks</strong> from your Liked Songs. 
          This action cannot be undone. Are you sure you want to proceed?
        </p>
        
        {isDeleting ? (
          <ProgressBar current={progressCurrent} total={progressTotal} />
        ) : (
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)' }}>
            <button className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button className="btn btn-danger solid" onClick={onConfirm}>
              Yes, Remove Tracks
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
