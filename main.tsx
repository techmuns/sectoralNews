import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import HomePage from './app/page';
import { ErrorBoundary } from './components/error-boundary';

const container = document.getElementById('root');
if (container) {
  createRoot(container).render(
    <StrictMode>
      <ErrorBoundary
        fallback={
          <div
            style={{
              display: 'flex',
              height: '100%',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 24,
              textAlign: 'center',
              color: '#374151',
              fontSize: 14,
              fontFamily: 'system-ui, sans-serif',
            }}
          >
            This dashboard could not be displayed. Please reload the page.
          </div>
        }
      >
        <HomePage />
      </ErrorBoundary>
    </StrictMode>,
  );
}
