import { useEffect, useState } from "react";
import { useAuth } from "../AuthContext.jsx";
import { roleLabel } from "../roles.js";
import useDocumentTitle from "../useDocumentTitle.js";

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
      {notice && (
        <p role="status" className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {notice}
        </p>
      )}
      <div className="rounded border border-gray-200 bg-white p-6">
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <dl className="mt-4 grid grid-cols-[6rem_1fr] gap-y-2 text-sm">
          <dt className="text-gray-500">Name</dt>
          <dd>{user.fullName}</dd>
          <dt className="text-gray-500">Role</dt>
          <dd>{roleLabel(user.role)}</dd>
          <dt className="text-gray-500">Email</dt>
          <dd>{user.email}</dd>
        </dl>
      </div>
    </div>
  );
}
