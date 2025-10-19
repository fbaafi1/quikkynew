'use client';

import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

interface PageLoaderProps {
  isLoading: boolean;
  children: React.ReactNode;
  className?: string;
}

export function PageLoader({ isLoading, children, className = '' }: PageLoaderProps) {
  if (isLoading) {
    return (
      <div className={`flex min-h-[60vh] items-center justify-center ${className}`}>
        <LoadingSpinner size={32} />
      </div>
    );
  }

  return <>{children}</>;
}

// Higher-Order Component for pages with data fetching
export function withPageLoader<T>(
  WrappedComponent: React.ComponentType<T>,
  dataFetcher: () => Promise<any>
) {
  return function WithPageLoader(props: T) {
    const [isLoading, setIsLoading] = useState(true);
    const [data, setData] = useState<any>(null);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
      const fetchData = async () => {
        try {
          setIsLoading(true);
          const result = await dataFetcher();
          setData(result);
        } catch (err) {
          setError(err instanceof Error ? err : new Error('An error occurred'));
        } finally {
          setIsLoading(false);
        }
      };

      fetchData();
    }, []);

    if (error) {
      return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center">
          <div className="text-destructive">Error: {error.message}</div>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 text-sm text-primary hover:underline"
          >
            Try again
          </button>
        </div>
      );
    }

    return (
      <PageLoader isLoading={isLoading}>
        <WrappedComponent {...props} data={data} />
      </PageLoader>
    );
  };
}
