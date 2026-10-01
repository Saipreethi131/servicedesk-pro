import { Link } from "react-router";
import { useAuth } from "../AuthContext.jsx";
import useDocumentTitle from "../useDocumentTitle.js";
import Card from "../components/ui/Card.jsx";

export default function NotFound() {
  useDocumentTitle("Page not found");
  const { user, loading } = useAuth();

  return (
    <div className="auth-shell">
      <Card className="auth-card space-y-3 text-center">
        <h1 className="auth-card-title">Page not found</h1>
        <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
          There is nothing at this address.
        </p>
        {/* Wait for the startup check: until it finishes we cannot tell which link is right. */}
        {!loading && (
          <Link
            to={user ? "/" : "/login"}
            className="inline-block text-sm font-medium hover:underline"
            style={{ color: "var(--color-primary)" }}
          >
            {user ? "Back to the dashboard" : "Go to login"}
          </Link>
        )}
      </Card>
    </div>
  );
}
