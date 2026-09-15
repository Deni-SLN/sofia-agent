"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, TrendingUp, Brain, Wallet, FlaskConical } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { label: "Home", href: "/dashboard", icon: LayoutDashboard },
  { label: "AI", href: "/ai", icon: Brain },
  { label: "Trade", href: "/trading", icon: TrendingUp },
  { label: "Backtest", href: "/backtest", icon: FlaskConical },
  { label: "Portfolio", href: "/portfolio", icon: Wallet },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-surface/95 backdrop-blur-sm lg:hidden">
      <div className="flex items-center justify-around h-16">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-2 text-xs transition-colors",
                isActive ? "text-primary" : "text-text-muted"
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
