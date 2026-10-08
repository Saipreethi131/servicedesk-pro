import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import { Settings as SettingsIcon } from "lucide-react";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import StatePage from "./components/StatePage.jsx";
import { isApiUrlMissing } from "./api.js";
import "./index.css";

// Plain screen for a deploy or dev setup mistake, so it is visible instead of a white page.
function ConfigError() {
  return (
    <StatePage
      role="alert"
      icon={SettingsIcon}
      title="Configuration error: VITE_API_URL is not set"
      description="Locally, copy client/.env.example to client/.env and restart the dev server. On Vercel, set it in the project's environment variables and redeploy: the value is baked in at build time."
    />
  );
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    {isApiUrlMissing ? (
      <ConfigError />
    ) : (
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    )}
  </StrictMode>
);
