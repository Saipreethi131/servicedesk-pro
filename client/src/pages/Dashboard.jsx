import { useEffect, useState } from "react";
import { useAuth } from "../AuthContext.jsx";
import useDocumentTitle from "../useDocumentTitle.js";
import PageHeader from "../components/ui/PageHeader.jsx";
import Card from "../components/ui/Card.jsx";
import Badge from "../components/ui/Badge.jsx";

export default function Dashboard() {
  useDocumentTitle("Dashboard");
  const { user, accessNotice, clearAccessNotice } = useAuth();

  // Copy the "no access" notice into local state and clear it from context, so it shows once and not on the next visit.
  // Done in an effect (not just at mount) so it works whichever of the two, the redirect or the notice, lands first.
  const [notice, setNotice] = useState(null);
  useEffect(() => {
    if (!accessNotice) return;
    setNotice(accessNotice);
    clearAccessNotice();
  }, [accessNotice, clearAccessNotice]);

  return (
    <div className="space-y-4">
      <PageHeader title="Dashboard" />

      {notice && (
        <p
          role="status"
          className="rounded-md border px-3 py-2 text-sm"
          style={{ borderColor: "#fde68a", backgroundColor: "#fffbeb", color: "#92400e" }}
        >
          {notice}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Card title="Name">
          <p className="text-sm">{user.fullName}</p>
        </Card>
        <Card title="Role">
          <Badge variant="role" value={user.role} />
        </Card>
        <Card title="Email">
          <p className="text-sm">{user.email}</p>
        </Card>
      </div>
    </div>
  );
}
