import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface ErrorFallbackProps {
  error: Error | null;
  errorInfo: any;
  onReset: () => void;
}

export function ErrorFallback({ error, errorInfo, onReset }: ErrorFallbackProps) {
  const handleReload = () => {
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="max-w-2xl w-full p-8 shadow-lg">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <AlertCircle className="w-10 h-10 text-destructive" />
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-bold mb-2 text-foreground">
              Something went wrong
            </h1>
            <p className="text-muted-foreground mb-6 text-lg">
              The application encountered an unexpected error. You can try refreshing the page or contact support if the problem persists.
            </p>
            
            {error && (
              <details className="mb-6 bg-muted/50 rounded-lg p-4 border border-border">
                <summary className="cursor-pointer text-sm font-semibold mb-3 text-foreground hover:text-primary transition-colors">
                  Error Details
                </summary>
                <div className="space-y-2">
                  <div className="text-xs bg-background p-3 rounded border border-border overflow-auto max-h-48 font-mono text-muted-foreground">
                    <div className="font-semibold text-foreground mb-2">Error Message:</div>
                    <div className="mb-4">{error.toString()}</div>
                    {error.stack && (
                      <>
                        <div className="font-semibold text-foreground mb-2">Stack Trace:</div>
                        <div className="whitespace-pre-wrap break-words">{error.stack}</div>
                      </>
                    )}
                  </div>
                  {errorInfo?.componentStack && (
                    <div className="text-xs bg-background p-3 rounded border border-border overflow-auto max-h-48 font-mono text-muted-foreground">
                      <div className="font-semibold text-foreground mb-2">Component Stack:</div>
                      <div className="whitespace-pre-wrap break-words">{errorInfo.componentStack}</div>
                    </div>
                  )}
                </div>
              </details>
            )}
            
            <div className="flex gap-3 flex-wrap">
              <Button 
                onClick={onReset}
                className="gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </Button>
              <Button 
                variant="outline" 
                onClick={handleReload}
                className="gap-2"
              >
                <Home className="w-4 h-4" />
                Go Home
              </Button>
              <Button 
                variant="ghost"
                onClick={() => window.location.reload()}
                className="gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Reload Page
              </Button>
            </div>

            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-sm text-blue-900 dark:text-blue-100">
                <strong>Tip:</strong> If this error persists, try clearing your browser cache or opening the page in an incognito window.
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

