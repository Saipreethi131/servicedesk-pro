import { Component } from "react";

// Catches errors thrown while React renders its children; without one, a render crash unmounts the whole app
// and leaves a white page. It cannot catch errors in event handlers or async code (those are shown by each page's
// error banner). Error boundaries must be class components: React has no hook equivalent.
export default class ErrorBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error, info) {
    console.error("Render error caught by ErrorBoundary:", error, info.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;

    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div role="alert" className="w-full max-w-sm space-y-4 rounded border border-gray-200 bg-white p-6 text-center">
          <h1 className="text-xl font-semibold">Something went wrong</h1>
          <p className="text-sm text-gray-600">An unexpected error occurred. Reloading the page usually fixes it.</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
          >
            Reload
          </button>
        </div>
      </div>
    );
  }
}
