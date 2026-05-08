'use client';

import { Component, type ReactNode } from 'react';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex items-center justify-center min-h-[400px] p-6" dir="rtl">
          <Card className="max-w-md w-full border-destructive/20 shadow-lg">
            <CardContent className="p-8 text-center">
              {/* Error Icon */}
              <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-destructive/10 mb-6">
                <AlertTriangle className="h-8 w-8 text-destructive" />
              </div>

              {/* Error Title */}
              <h2 className="text-xl font-bold text-foreground mb-2">
                حدث خطأ غير متوقع
              </h2>

              {/* Error Description */}
              <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                عذراً، حدث خطأ أثناء تحميل هذه الصفحة. يرجى المحاولة مرة أخرى أو العودة إلى الصفحة الرئيسية.
              </p>

              {/* Error Details (collapsible) */}
              {this.state.error && (
                <details className="mb-6 text-start">
                  <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
                    تفاصيل الخطأ
                  </summary>
                  <pre className="mt-2 p-3 bg-muted rounded-lg text-[10px] text-muted-foreground overflow-auto max-h-32 text-start" dir="ltr">
                    {this.state.error.message}
                  </pre>
                </details>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-3 justify-center">
                <Button
                  onClick={this.handleRetry}
                  variant="outline"
                  className="gap-2"
                >
                  <RotateCcw className="h-4 w-4" />
                  إعادة المحاولة
                </Button>
                <Button
                  onClick={() => window.location.href = '/'}
                  className="gap-2"
                >
                  <Home className="h-4 w-4" />
                  الصفحة الرئيسية
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
