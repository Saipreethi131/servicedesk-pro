import { Link } from "react-router";
import { FileQuestion } from "lucide-react";
import { useAuth } from "../AuthContext.jsx";
import useDocumentTitle from "../useDocumentTitle.js";
import StatePage from "../components/StatePage.jsx";
import { buttonVariants } from "../components/ui/index.js";

export default function NotFound() {
  useDocumentTitle("Page not found");
  const { user, loading } = useAuth();

  return (
    <StatePage
      icon={FileQuestion}
      title="Page not found"
      description="There is nothing at this address. It may have moved, or the link may be mistyped."
      // Wait for the startup check: until it finishes we cannot tell which link is right.
      action={
        !loading && (
          <Link to={user ? "/" : "/login"} className={buttonVariants({ variant: "secondary" })}>
            {user ? "Back to the dashboard" : "Go to login"}
          </Link>
        )
      }
    />
  );
}
