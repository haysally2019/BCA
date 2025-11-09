import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from 'react-error-boundary';
import './index.css';

const ErrorFallback = ({ error }: { error: Error }) => (
  <div className="p-6 text-center">
    <h2 className="text-xl font-bold text-red-600 mb-4">Something went wrong</h2>
    <pre className="text-sm text-gray-500">{error.message}</pre>
    <button
      onClick={() => window.location.reload()}
      className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg"
    >
      Reload
    </button>
  </div>
);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <React.Suspense fallback={<div className="p-6 text-center">Loading...</div>}>
        <App />
      </React.Suspense>
    </ErrorBoundary>
  </React.StrictMode>
);
