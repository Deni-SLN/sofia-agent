"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  TrendingUp,
  BarChart3,
  Wallet,
  Brain,
  BookOpen,
  Settings,
  ChevronDown,
  ChevronLeft,
  Zap,
  ScanSearch,
  Star,
  Shield,
  X,
  FlaskConical,
  MessagesSquare,
  Cpu,
  Newspaper,
  FileBarChart,
  SlidersHorizontal,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";
import { ScrollArea } from "@/components/ui/scroll-area";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  children?: { label: string; href: string; icon: React.ElementType }[];
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Command Center", href: "/command-center", icon: Zap },
  {
    label: "Trading",
    href: "/trading",
    icon: TrendingUp,
    children: [
      { label: "Manual Trading", href: "/trading", icon: TrendingUp },
      { label: "Auto Trading", href: "/trading/auto", icon: Zap },
    ],
  },
  {
    label: "Market",
    href: "/market",
    icon: BarChart3,
    children: [
      { label: "Scanner", href: "/market", icon: ScanSearch },
      { label: "Watchlist", href: "/market/watchlist", icon: Star },
      { label: "News", href: "/market/news", icon: Newspaper },
    ],
  },
  { label: "Portfolio", href: "/portfolio", icon: Wallet },
  { label: "Backtest", href: "/backtest", icon: FlaskConical },
  { label: "Strategi", href: "/strategy", icon: SlidersHorizontal },
  { label: "Journal", href: "/journal", icon: BookOpen },
  { label: "Reports", href: "/reports", icon: FileBarChart },
  {
    label: "AI",
    href: "/ai",
    icon: Brain,
    children: [
      { label: "AI Insights", href: "/ai", icon: Brain },
      { label: "AI Performance", href: "/ai/performance", icon: BarChart3 },
      { label: "AI Router", href: "/ai/router", icon: Cpu },
      { label: "AI Prompts", href: "/ai/prompts", icon: BookOpen },
    ],
  },
  { label: "SOFIA Manager", href: "/manager", icon: MessagesSquare },
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
    children: [
      { label: "General", href: "/settings", icon: Settings },
      { label: "Risk", href: "/settings/risk", icon: Shield },
      { label: "Exchange", href: "/settings/exchange", icon: TrendingUp },
      { label: "Security", href: "/settings/security", icon: Shield },
      { label: "Notifications", href: "/settings/notifications", icon: Newspaper },
    ],
  },
];

function NavItemComponent({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(false);
  const isActive = pathname === item.href || item.children?.some((c) => pathname === c.href);
  const Icon = item.icon;

  if (item.children && !collapsed) {
    return (
      <div>
        <button
          onClick={() => setExpanded(!expanded)}
          className={cn(
            "flex w-full items-center gap-3 rounded-btn px-3 py-2.5 text-sm font-medium transition-colors",
            isActive ? "text-primary bg-primary/10" : "text-text-secondary hover:text-text-primary hover:bg-surface-elevated"
          )}
        >
          <Icon className="h-5 w-5 shrink-0" />
          <span className="flex-1 text-left">{item.label}</span>
          <ChevronDown className={cn("h-4 w-4 transition-transform", expanded && "rotate-180")} />
        </button>
        {expanded && (
          <div className="ml-4 mt-1 space-y-0.5 border-l border-border pl-3">
            {item.children.map((child) => {
              const ChildIcon = child.icon;
              const childActive = pathname === child.href;
              return (
                <Link
                  key={child.href}
                  href={child.href}
                  className={cn(
                    "flex items-center gap-3 rounded-btn px-3 py-2 text-sm transition-colors",
                    childActive ? "text-primary bg-primary/10" : "text-text-muted hover:text-text-primary hover:bg-surface-elevated"
                  )}
                >
                  <ChildIcon className="h-4 w-4 shrink-0" />
                  <span>{child.label}</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-3 rounded-btn px-3 py-2.5 text-sm font-medium transition-colors",
        isActive
          ? "text-primary bg-primary/10 border-l-2 border-primary"
          : "text-text-secondary hover:text-text-primary hover:bg-surface-elevated"
      )}
      title={collapsed ? item.label : undefined}
    >
      <Icon className="h-5 w-5 shrink-0" />
      {!collapsed && <span>{item.label}</span>}
    </Link>
  );
}

export function Sidebar() {
  const { sidebarOpen, setSidebarOpen, sidebarCollapsed, toggleSidebarCollapsed } = useAppStore();

  return (
    <>
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside
        className={cn(
          "fixed top-0 left-0 z-50 h-screen bg-surface border-r border-border flex flex-col transition-all duration-300",
          sidebarCollapsed ? "w-[68px]" : "w-60",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex items-center justify-between h-16 px-4 border-b border-border">
          {!sidebarCollapsed && (
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                <Zap className="h-5 w-5 text-white" />
              </div>
              <span className="text-lg font-bold text-text-primary">SOFIA</span>
            </Link>
          )}
          {sidebarCollapsed && (
            <div className="mx-auto h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <Zap className="h-5 w-5 text-white" />
            </div>
          )}
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-text-muted hover:text-text-primary">
            <X className="h-5 w-5" />
          </button>
        </div>

        <ScrollArea className="flex-1 py-4 px-3">
          <nav className="space-y-1">
            {navItems.map((item) => (
              <NavItemComponent key={item.href} item={item} collapsed={sidebarCollapsed} />
            ))}
          </nav>
        </ScrollArea>

        <div className="hidden lg:block border-t border-border p-3">
          <button
            onClick={toggleSidebarCollapsed}
            className="flex w-full items-center justify-center rounded-btn py-2 text-text-muted hover:text-text-primary hover:bg-surface-elevated transition-colors"
          >
            <ChevronLeft className={cn("h-5 w-5 transition-transform", sidebarCollapsed && "rotate-180")} />
          </button>
        </div>
      </aside>
    </>
  );
}
