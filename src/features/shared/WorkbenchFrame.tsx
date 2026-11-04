import type { ComponentProps } from "react";
import {
  AppFrame,
  type NavigationItem,
} from "../../design-system/compositions/layout";
/** Preview routes belong to the workbench adapter, never the reusable frame. */
export const previewHref = (id: string) =>
  `?id=us${id}--${id === "025" ? "l-02" : "a-01"}&viewMode=story`;
const navigation: NavigationItem[] = [
  { id: "home", label: "Overview", icon: "home", href: "#overview" },
  { id: "services", label: "Services", icon: "services", href: "#services" },
  { id: "jobs", label: "My Jobs", icon: "jobs", href: previewHref("025") },
  {
    id: "invites",
    label: "Invitations",
    icon: "invites",
    href: "#invitations",
  },
  { id: "profile", label: "Profile", icon: "profile", href: "#profile" },
];
const mobileNavigation: NavigationItem[] = [
  { id: "home", label: "Home", icon: "home" },
  { id: "services", label: "Services", icon: "services" },
  { id: "jobs", label: "Jobs", href: previewHref("025"), icon: "jobs" },
  { id: "invites", label: "Invites", icon: "invites" },
  {
    id: "profile",
    label: "Profile",
    href: previewHref("034"),
    icon: "profile",
  },
];
type Props = Omit<
  ComponentProps<typeof AppFrame>,
  | "activeKey"
  | "mobileActiveKey"
  | "navigation"
  | "mobileNavigation"
  | "brandHref"
  | "workspaceLinks"
> & { feature: string };
export function WorkbenchFrame({ feature, ...props }: Props) {
  const route = (item: NavigationItem) =>
    feature === "025" && item.id === "jobs"
      ? { ...item, onNavigate: props.onBack }
      : item;
  return (
    <AppFrame
      {...props}
      kind={feature === "025" ? "jobs" : feature === "026" ? "proof" : "story"}
      backLabel={props.backLabel ?? "Story library"}
      activeKey={feature === "034" ? "profile" : "jobs"}
      mobileActiveKey={feature === "034" ? "profile" : "jobs"}
      navigation={navigation.map(route)}
      mobileNavigation={mobileNavigation.map(route)}
      brandHref={previewHref("025")}
      workspaceLinks={[
        { label: "Marketer workspace", href: previewHref("025") },
        { label: "Creator workspace", href: previewHref("027") },
      ]}
    />
  );
}
