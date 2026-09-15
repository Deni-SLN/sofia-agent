"use client";

import { Menu, Wifi, WifiOff, Brain, Search, User, LogOut, Settings, Moon, Sun } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store/app-store";
import { Badge } from "@/components/ui/badge";
import { NotificationBell } from "@/components/layout/notification-bell";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

export function Header() {
  const { toggleSidebar, autoTradingMode, autoTradingActive, exchangeConnected, theme, setTheme } = useAppStore();
  const router = useRouter();
  const demoMode = !(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  async function handleLogout() {
    if (!demoMode) {
      try {
        const { createClient } = await import("@/lib/supabase/client");
        const sb = createClient();
        await sb.auth.signOut();
      } catch { /* tetap arahkan ke login */ }
    }
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 h-16 border-b border-border bg-surface/80 backdrop-blur-sm">
      <div className="flex h-full items-center justify-between px-4 gap-4">
        <div className="flex items-center gap-3">
          <button onClick={toggleSidebar} className="lg:hidden text-text-muted hover:text-text-primary">
            <Menu className="h-6 w-6" />
          </button>
          <div className="hidden md:flex items-center gap-2 bg-background rounded-btn px-3 py-2 w-64">
            <Search className="h-4 w-4 text-text-muted" />
            <input
              type="text"
              placeholder="Search..."
              className="bg-transparent border-none outline-none text-sm text-text-primary placeholder:text-text-muted w-full"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2">
            <Badge variant={autoTradingActive ? "success" : "default"} className="gap-1.5">
              <Brain className="h-3 w-3" />
              <span className="text-xs">
                {autoTradingActive ? autoTradingMode.replace("_", " ") : "AI OFF"}
              </span>
            </Badge>

            <Badge variant={exchangeConnected ? "success" : "danger"} className="gap-1.5">
              {exchangeConnected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
              <span className="text-xs">{exchangeConnected ? "Connected" : "Disconnected"}</span>
            </Badge>
          </div>

          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="text-text-muted hover:text-text-primary p-2 rounded-btn hover:bg-surface-elevated transition-colors"
          >
            {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>

          <NotificationBell />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-btn p-1.5 hover:bg-surface-elevated transition-colors">
                <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
                  <User className="h-4 w-4 text-primary" />
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Denis Sulaeman</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="gap-2 cursor-pointer">
                <User className="h-4 w-4" /> Profile
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2 cursor-pointer">
                <Settings className="h-4 w-4" /> Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="gap-2 cursor-pointer text-danger" onClick={handleLogout}>
                <LogOut className="h-4 w-4" /> Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
