'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Uncaught error:', {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
    });
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-surface-50 p-6">
          <div className="max-w-md w-full text-center space-y-4">
            <div className="w-14 h-14 mx-auto rounded-full bg-red-500/10 flex items-center justify-center">
              <svg className="w-7 h-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-text-primary">Something went wrong</h2>
            <p className="text-sm text-text-tertiary">
              An unexpected error occurred. Your data is safe — please reload to continue.
            </p>
            {this.state.error && (
              <p className="text-xs text-text-tertiary bg-surface-200 rounded-lg p-3 font-mono break-all">
                {this.state.error.message}
              </p>
            )}
            <button
              onClick={this.handleReload}
              className="px-6 py-2.5 bg-brand text-white rounded-xl text-sm font-medium hover:bg-brand/90 transition-colors"
            >
              Reload App
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
