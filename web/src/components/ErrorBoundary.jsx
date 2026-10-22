import { Component } from 'react';

/** Last line of defence: a crash anywhere shows a way forward instead of a blank page. */
export default class ErrorBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    console.error(error);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main className="flex min-h-screen items-center justify-center bg-canvas px-5">
        <div className="max-w-[380px] text-center">
          <p className="text-[28px] font-semibold tracking-display">One moment.</p>
          <p className="mt-2 text-[16px] text-ink-500">This page needs a quick reload.</p>
          <button onClick={() => window.location.reload()} className="btn-primary mt-6 h-11 px-6 text-[16px]">Reload</button>
        </div>
      </main>
    );
  }
}
