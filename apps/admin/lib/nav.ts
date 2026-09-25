import {
  ActivityIcon,
  DollarSignIcon,
  HeartPulseIcon,
  LayoutDashboardIcon,
  MessageSquareTextIcon,
  SettingsIcon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  title: string;
  url: string;
  icon: LucideIcon;
}

export const NAV: NavItem[] = [
  { title: "Dashboard", url: "/", icon: LayoutDashboardIcon },
  { title: "Revenue", url: "/revenue", icon: DollarSignIcon },
  { title: "Users", url: "/users", icon: UsersIcon },
  { title: "Action log", url: "/actions", icon: ActivityIcon },
  { title: "Fleet health", url: "/health", icon: HeartPulseIcon },
  { title: "Comment drafts", url: "/drafts", icon: MessageSquareTextIcon },
  { title: "Settings", url: "/settings", icon: SettingsIcon },
];

export const isNavActive = (pathname: string, url: string): boolean =>
  url === "/" ? pathname === "/" : pathname.startsWith(url);

/** Title of the nav section the current route belongs to (shown in the header). */
export const navTitle = (pathname: string): string =>
  NAV.find((item) => isNavActive(pathname, item.url))?.title ?? "Admin";
