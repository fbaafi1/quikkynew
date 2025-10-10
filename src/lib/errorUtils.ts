type SafeError = {
  message: string;
  statusCode: number;
  isOperational: boolean;
  code?: string;
  details?: any;
};

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;
  code?: string;
  details?: any;

  constructor(message: string, statusCode: number, code?: string, details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.code = code;
    this.details = details;

    // This ensures the stack trace is captured properly
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (error: any): SafeError => {
  // Default to a generic error
  let safeError: SafeError = {
    message: 'An unexpected error occurred',
    statusCode: 500,
    isOperational: false,
  };

  // Handle known error types
  if (error instanceof AppError) {
    safeError = {
      message: error.message,
      statusCode: error.statusCode,
      isOperational: error.isOperational,
      code: error.code,
    };
  } 
  // Handle Supabase errors
  else if (error?.code?.startsWith('PGRST') || error?.code?.startsWith('22') || error?.code?.startsWith('23')) {
    safeError = {
      message: 'A database error occurred',
      statusCode: 500,
      isOperational: false,
      code: 'DB_ERROR',
    };
  }
  // Handle other error types
  else if (error instanceof Error) {
    safeError = {
      message: error.message,
      statusCode: 500,
      isOperational: false,
    };
  }

  // In production, don't expose stack traces or sensitive error details
  if (process.env.NODE_ENV === 'production') {
    // Log the full error for debugging (in a real app, use a proper logging service)
    console.error('Error:', error);
    
    // Return a sanitized error with required statusCode
    return {
      message: safeError.message,
      statusCode: safeError.statusCode || 500, // Ensure statusCode is always set
      isOperational: safeError.isOperational,
      code: safeError.code,
    };
  }

    // In development, include more details
    const devError: any = { ...safeError };
    if (error instanceof Error) {
      devError.stack = error.stack;
    }
    if (error?.details) {
      devError.details = error.details;
    }
    return devError;
};

// Helper type for Supabase query responses
type SupabaseQueryResponse<T> = {
  data: T | null;
  error: any | null;
};

export const handleAsync = async <T>(
  promise: Promise<SupabaseQueryResponse<T>> | (() => Promise<SupabaseQueryResponse<T>>),
  errorMessage?: string,
  statusCode: number = 500,
  errorCode?: string
): Promise<{ data: T | null; error: SafeError | null }> => {
  try {
    // Handle both direct promises and functions that return promises
    const result = await (typeof promise === 'function' ? promise() : promise);
    
    // If there's a Supabase error, handle it
    if (result.error) {
      throw result.error;
    }
    
    return { data: result.data, error: null };
  } catch (error) {
    const safeError = errorHandler(error);
    
    // Override with custom message if provided
    if (errorMessage) {
      safeError.message = errorMessage;
    }
    
    if (statusCode) {
      safeError.statusCode = statusCode;
    }
    
    if (errorCode) {
      safeError.code = errorCode;
    }
    
    return { data: null, error: safeError };
  }
};
