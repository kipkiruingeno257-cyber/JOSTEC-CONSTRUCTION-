import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
  isPermissionError: boolean;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = {
      hasError: false,
      errorMessage: '',
      isPermissionError: false,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    let parsedMessage = error.message;
    let isPermissionError = false;

    try {
      const parsed = JSON.parse(error.message);
      if (parsed && parsed.operationType && parsed.error) {
        parsedMessage = `${parsed.error} (operation: ${parsed.operationType}, path: ${parsed.path ?? 'unknown'})`;
        isPermissionError = String(parsed.error).toLowerCase().includes('permission');
      }
    } catch {
      isPermissionError = error.message.toLowerCase().includes('permission');
    }

    return {
      hasError: true,
      errorMessage: parsedMessage,
      isPermissionError,
    };
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-lg w-full bg-white border border-slate-200 rounded-lg p-8">
          <div className="flex items-center gap-3 text-orange-600 mb-4">
            <AlertTriangle className="w-6 h-6 shrink-0" />
            <h1 className="text-xl font-bold text-slate-900">
              {this.state.isPermissionError ? 'Authorization or Rules Error' : 'Application Error'}
            </h1>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed mb-4">
            {this.state.isPermissionError
              ? 'Firestore rejected an operation due to security rule permissions. Verify your administrator credentials or review your deployed rules.'
              : 'An unexpected error interrupted this view.'}
          </p>
          <pre className="bg-slate-900 text-slate-100 text-xs font-mono p-4 rounded-md overflow-x-auto mb-6">
            {this.state.errorMessage}
          </pre>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#0B1B2B] text-white text-sm font-medium rounded-md hover:bg-slate-800 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Reload Page
            </button>
            <a
              href="/"
              className="inline-flex items-center px-4 py-2 border border-slate-300 text-slate-700 text-sm font-medium rounded-md hover:bg-slate-50 transition-colors"
            >
              Return Home
            </a>
          </div>
        </div>
      </div>
    );
  }
}
