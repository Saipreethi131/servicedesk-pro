import { NavList } from "./Sidebar.jsx";
import { Drawer, DrawerContent } from "./ui/index.js";

// The sidebar's links as a slide-over from the left, for screens under 768px. It is a modal dialog (focus trapped, Escape and
// the X close it), and choosing a link closes it.
export default function MobileNav({ open, onOpenChange, role }) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent side="left" title="ServiceDesk Pro" className="max-w-72">
        <NavList role={role} onNavigate={() => onOpenChange(false)} />
      </DrawerContent>
    </Drawer>
  );
}
