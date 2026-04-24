import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';

interface ErrorBoundaryProps {
  fallback?: ReactNode;
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    });
  };

  toggleDetails = (): void => {
    this.setState((prev) => ({ showDetails: !prev.showDetails }));
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isDev = process.env.NODE_ENV === 'development';
      const { error, errorInfo, showDetails } = this.state;

      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '48px 24px',
            minHeight: '300px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: '#fef2f2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '20px',
            }}
          >
            <AlertTriangle size={32} color="#dc2626" />
          </div>
          <h2
            style={{
              margin: '0 0 8px 0',
              fontSize: '22px',
              fontWeight: 600,
              color: '#111827',
            }}
          >
            Something went wrong
          </h2>
          <p
            style={{
              margin: '0 0 24px 0',
              fontSize: '14px',
              color: '#6b7280',
              maxWidth: '400px',
              lineHeight: '1.5',
            }}
          >
            An unexpected error occurred. Please try again. If the problem persists, contact support.
          </p>
          <button
            onClick={this.handleReset}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 24px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: '#6366f1',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
              marginBottom: '16px',
            }}
          >
            <RefreshCw size={16} />
            Try Again
          </button>

          {isDev && error && (
            <div style={{ width: '100%', maxWidth: '600px' }}>
              <button
                onClick={this.toggleDetails}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  margin: '0 auto',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: '1px solid #e5e7eb',
                  backgroundColor: '#f9fafb',
                  color: '#6b7280',
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                {showDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                {showDetails ? 'Hide' : 'Show'} Error Details
              </button>
              {showDetails && (
                <div
                  style={{
                    marginTop: '12px',
                    padding: '16px',
                    borderRadius: '8px',
                    backgroundColor: '#fef2f2',
                    border: '1px solid #fecaca',
                    textAlign: 'left',
                    overflowX: 'auto',
                  }}
                >
                  <p
                    style={{
                      margin: '0 0 8px 0',
                      fontSize: '13px',
                      fontWeight: 600,
                      color: '#991b1b',
                    }}
                  >
                    {error.name}: {error.message}
                  </p>
                  {errorInfo?.componentStack && (
                    <pre
                      style={{
                        margin: 0,
                        fontSize: '12px',
                        color: '#7f1d1d',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        lineHeight: '1.6',
                      }}
                    >
                      {errorInfo.componentStack}
                    </pre>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export { ErrorBoundary };
export default ErrorBoundary;
