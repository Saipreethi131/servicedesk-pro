import { Card, EmptyState } from "./ui/index.js";

// A calm full-screen state: one icon, a heading, a sentence and a way forward. Used where there is no app shell to show
// (page not found, a render crash, a setup mistake). `role="alert"` is for the crash case, where the user should hear about it.
export default function StatePage({ icon, title, description, action, role }) {
  return (
    <div className="grid min-h-screen place-items-center bg-canvas p-6">
      <Card role={role} className="w-full max-w-md">
        <EmptyState icon={icon} titleAs="h1" title={title} description={description} action={action} />
      </Card>
    </div>
  );
}
