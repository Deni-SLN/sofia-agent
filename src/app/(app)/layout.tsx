"use client";

import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { BottomNav } from "@/components/layout/bottom-nav";
import { useAppStore } from "@/store/app-store";
import { cn } from "@/lib/utils";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { sidebarCollapsed } = useAppStore();

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className={cn("transition-all duration-300", sidebarCollapsed ? "lg:pl-[68px]" : "lg:pl-60")}>
        <Header />
        <main className="p-4 md:p-6 pb-20 lg:pb-6">{children}</main>
      </div>
      <BottomNav />
    </div>
  );
}
