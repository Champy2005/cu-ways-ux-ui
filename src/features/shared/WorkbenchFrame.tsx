import type { ComponentProps } from "react";
import {
  AppFrame,
  type NavigationItem,
} from "../../design-system/compositions/layout";
/** Preview routes belong to the workbench adapter, never the reusable frame. */
export const previewHref = (id: string) =>
  `?id=us${id}--${id === "025" ? "l-02" : "a-01"}&viewMode=story`;
const navigation: NavigationItem[] = [
  { id: "025", label: "My Jobs", icon: "jobs" },
  { id: "026", label: "Proof", icon: "services" },
  { id: "027", label: "Completion", icon: "invites" },
  { id: "028", label: "Cancellation", icon: "close" },
  { id: "034", label: "Reviews", icon: "profile" },
].map((item) => ({ ...item, href: previewHref(item.id) })) as NavigationItem[];
const mobileNavigation: NavigationItem[] = [
  { id: "home", label: "Home", href: previewHref("025"), icon: "home" },
  { id: "026", label: "Services", href: previewHref("026"), icon: "services" },
  { id: "025", label: "Jobs", href: previewHref("025"), icon: "jobs" },
  { id: "027", label: "Invites", href: previewHref("027"), icon: "invites" },
  { id: "034", label: "Profile", href: previewHref("034"), icon: "profile" },
];
type Props = Omit<
  ComponentProps<typeof AppFrame>,
  | "activeKey"
  | "navigation"
  | "mobileNavigation"
  | "brandHref"
  | "workspaceLinks"
> & { feature: string };
export function WorkbenchFrame({ feature, ...props }: Props) {
  return (
    <AppFrame
      {...props}
      backLabel={props.backLabel ?? "Story library"}
      activeKey={feature}
      navigation={navigation}
      mobileNavigation={mobileNavigation}
      brandHref={previewHref("025")}
      workspaceLinks={[
        { label: "Marketer workspace", href: previewHref("025") },
        { label: "Creator workspace", href: previewHref("027") },
      ]}
    />
  );
}
