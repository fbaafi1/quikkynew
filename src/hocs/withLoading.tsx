'use client';

import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

interface WithLoadingProps {
  isLoading?: boolean;
  error?: Error | null;
  [key: string]: any;
}

export function withLoading<T extends WithLoadingProps>(
  WrappedComponent: React.ComponentType<T>,
  options: {
    loadingMessage?: string;
    errorMessage?: string;
    fullPage?: boolean;
  } = {}
) {
  const {
    loadingMessage = 'Loading...',
    errorMessage = 'Failed to load data',
    fullPage = true,
  } = options;

  return function WithLoadingWrapper(props: Omit<T, 'isLoading' | 'error'>) {
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    // Handle loading state from props if provided
    const finalIsLoading = 'isLoading' in props ? props.isLoading : isLoading;
    const finalError = 'error' in props ? props.error : error;

    if (finalError) {
      return (
        <div className={`flex items-center justify-center ${fullPage ? 'min-h-[60vh]' : 'py-8'}`}>
          <div className="text-center">
            <div className="text-destructive">
              {errorMessage}
              {finalError.message && `: ${finalError.message}`}
            </div>
            <button
              onClick={() => window.location.reload()}
              className="mt-2 text-sm text-primary hover:underline"
            >
              Try again
            </button>
          </div>
        </div>
      );
    }

    if (finalIsLoading) {
      return (
        <div className={`flex flex-col items-center justify-center ${fullPage ? 'min-h-[60vh]' : 'py-8'}`}>
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="mt-2 text-sm text-muted-foreground">{loadingMessage}</p>
        </div>
      );
    }

    return <WrappedComponent {...(props as T)} />;
  };
}

// Page-level loading component
export function PageLoading({
  message = 'Loading...',
  className = '',
}: {
  message?: string;
  className?: string;
}) {
  return (
    <div className={`flex min-h-[60vh] flex-col items-center justify-center ${className}`}>
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="mt-2 text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
