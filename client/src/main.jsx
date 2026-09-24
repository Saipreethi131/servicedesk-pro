import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import { isApiUrlMissing } from "./api.js";
import "./index.css";

// Plain screen for a deploy or dev setup mistake, so it is visible instead of a white page.
function ConfigError() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div role="alert" className="w-full max-w-md space-y-2 rounded border border-red-200 bg-white p-6">
        <h1 className="text-xl font-semibold text-red-700">Configuration error: VITE_API_URL is not set</h1>
        <p className="text-sm text-gray-600">
          Locally, copy client/.env.example to client/.env and restart the dev server. On Vercel, set it in the project's
          environment variables and redeploy: the value is baked in at build time.
        </p>
      </div>
    </div>
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
