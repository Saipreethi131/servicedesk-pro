import { Link } from "react-router";
import { useAuth } from "../AuthContext.jsx";
import useDocumentTitle from "../useDocumentTitle.js";

export default function NotFound() {
  useDocumentTitle("Page not found");
  const { user, loading } = useAuth();

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm space-y-3 rounded border border-gray-200 bg-white p-6 text-center">
        <h1 className="text-xl font-semibold">Page not found</h1>
        <p className="text-sm text-gray-600">There is nothing at this address.</p>
        {/* Wait for the startup check: until it finishes we cannot tell which link is right. */}
        {!loading && (
          <Link to={user ? "/" : "/login"} className="inline-block text-sm text-blue-600 hover:underline">
            {user ? "Back to the dashboard" : "Go to login"}
          </Link>
        )}
      </div>
    </div>
  );
}
