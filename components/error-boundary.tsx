import { Component, type ReactNode } from 'react';

export class ErrorBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error) {
    console.error('[dashboard] render failed', error);
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
