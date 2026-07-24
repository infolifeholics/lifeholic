'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class GlobalErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Unhandled runtime exception:', error, errorInfo);
    // Here we can log to a remote monitoring service if configured
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-[#f6f1ea] px-4 text-center">
          <div className="rounded-3xl border border-border bg-card p-8 max-w-md shadow-soft space-y-6">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-warning/10 text-warning">
              <AlertTriangle className="h-6 w-6" />
            </div>
            
            <div className="space-y-2">
              <h1 className="font-display text-2xl font-semibold text-foreground">Something went wrong</h1>
              <p className="text-sm text-muted-foreground leading-relaxed">
                An unexpected system error occurred. We have logged the diagnostics report and are addressing it.
              </p>
              {this.state.error && (
                <pre className="p-3 text-[10px] text-left bg-secondary/80 rounded-xl overflow-x-auto text-muted-foreground font-mono max-h-32">
                  {this.state.error.message}
                </pre>
              )}
            </div>

            <Button onClick={this.handleReset} className="w-full rounded-full bg-gold hover:bg-gold-hover text-gold-foreground gap-2">
              <RefreshCw className="h-4 w-4" />
              <span>Restore Workspace</span>
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
