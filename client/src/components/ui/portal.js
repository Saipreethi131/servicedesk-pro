import { createContext, useContext } from "react";

// Overlays (Select, Dropdown, Popover, Tooltip, Dialog, Drawer) render in a portal on <body>, outside whatever theme a parent
// element forces. A parent can provide a container element here and the overlays render inside it instead. The app never needs
// this (it has one theme at a time); the dev kit uses it to show an overlay in the light pane and the dark pane.
const PortalContainerContext = createContext(undefined);

export const PortalContainerProvider = PortalContainerContext.Provider;
export const usePortalContainer = () => useContext(PortalContainerContext);
