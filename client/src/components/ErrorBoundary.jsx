import { Component } from "react";
import { AlertCircle } from "lucide-react";
import StatePage from "./StatePage.jsx";
import { Button } from "./ui/index.js";

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
      <StatePage
        role="alert"
        icon={AlertCircle}
        title="Something went wrong"
        description="An unexpected error occurred. Reloading the page usually fixes it."
        action={
          <Button type="button" variant="primary" onClick={() => window.location.reload()}>
            Reload
          </Button>
        }
      />
    );
  }
}
