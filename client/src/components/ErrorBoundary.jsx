import { Component } from "react";
import Card from "./ui/Card.jsx";
import Button from "./ui/Button.jsx";

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
      <div className="auth-shell">
        <Card role="alert" className="auth-card space-y-4 text-center">
          <h1 className="auth-card-title">Something went wrong</h1>
          <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
            An unexpected error occurred. Reloading the page usually fixes it.
          </p>
          <Button type="button" variant="primary" onClick={() => window.location.reload()}>
            Reload
          </Button>
        </Card>
      </div>
    );
  }
}
