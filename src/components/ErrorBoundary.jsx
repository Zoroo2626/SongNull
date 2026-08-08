import React from 'react';
import { AlertCircle } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          padding: 'var(--space-6)',
          textAlign: 'center',
          backgroundColor: 'var(--color-bg-base)'
        }}>
          <AlertCircle size={48} color="var(--color-error)" style={{ marginBottom: 'var(--space-4)' }} />
          <h1 style={{ fontSize: '2rem', marginBottom: 'var(--space-2)' }}>Something went wrong</h1>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-6)', maxWidth: '400px' }}>
            {this.state.error?.message || "An unexpected error occurred in the application."}
          </p>
          <button 
            className="btn btn-primary"
            onClick={() => window.location.href = '/'}
          >
            Reload Application
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
