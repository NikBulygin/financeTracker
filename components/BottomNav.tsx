"use client";

import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface NavItem {
  path: string;
  label: string;
  icon: string;
}

const navItems: NavItem[] = [
  { path: "/", label: "Главная", icon: "🏠" },
  { path: "/transactions", label: "Транзакции", icon: "📋" },
  { path: "/upcoming", label: "Платежи", icon: "📅" },
  { path: "/analytics", label: "Графики", icon: "📊" },
  { path: "/investments", label: "Инвестиции", icon: "📈" },
  { path: "/rates", label: "Курсы", icon: "💱" },
  { path: "/profile", label: "Профиль", icon: "👤" },
];

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-zinc-200 bg-white dark:border-zinc-800 dark:bg-black">
      <div className="flex h-16 items-center justify-around">
        {navItems.map((item) => {
          const isActive = pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => router.push(item.path)}
              className={cn(
                "flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors touch-manipulation",
                isActive
                  ? "text-foreground"
                  : "text-zinc-500 dark:text-zinc-400"
              )}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

