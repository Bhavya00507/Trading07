import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error inside ErrorBoundary:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          backgroundColor: '#121212',
          color: '#e0e0e0',
          fontFamily: "'Inter', sans-serif",
          padding: '20px',
          textAlign: 'center'
        }}>
          <h2 style={{ color: '#ff5252', marginBottom: '16px' }}>Something went wrong.</h2>
          <p style={{ maxWidth: '500px', marginBottom: '24px', color: '#aaaaaa', fontSize: '14px', lineHeight: '1.5' }}>
            The trading dashboard has encountered a rendering or runtime error. You can try refreshing the page or checking your connection.
          </p>
          <div style={{
            backgroundColor: '#1e1e1e',
            border: '1px solid #333',
            borderRadius: '4px',
            padding: '12px 16px',
            marginBottom: '24px',
            fontFamily: 'monospace',
            fontSize: '12px',
            color: '#ffb74d',
            maxWidth: '600px',
            overflowX: 'auto',
            textAlign: 'left'
          }}>
            {this.state.error?.toString()}
          </div>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '10px 20px',
              backgroundColor: '#1e90ff',
              color: '#ffffff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '14px',
              transition: 'background-color 0.2s'
            }}
            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#187bcd')}
            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#1e90ff')}
          >
            Reload Dashboard
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
