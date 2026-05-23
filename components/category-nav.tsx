"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  TrendingUp,
  Vote,
  Landmark,
  Trophy,
  Clapperboard,
  Bitcoin,
  Package,
  Cloud,
  DollarSign,
  Users,
  PiggyBank,
  Cpu,
} from "lucide-react";

const categories = [
  { key: "trending", href: "/", icon: TrendingUp },
  { key: "elections", href: "/markets?category=elections", icon: Vote },
  { key: "politics", href: "/markets?category=politics", icon: Landmark },
  { key: "sports", href: "/markets?category=sports", icon: Trophy },
  { key: "culture", href: "/markets?category=culture", icon: Clapperboard },
  { key: "crypto", href: "/markets?category=crypto", icon: Bitcoin },
  { key: "commodities", href: "/markets?category=commodities", icon: Package },
  { key: "climate", href: "/markets?category=climate", icon: Cloud },
  { key: "economics", href: "/markets?category=economics", icon: DollarSign },
  { key: "mentions", href: "/markets?category=mentions", icon: Users },
  { key: "finance", href: "/markets?category=finance", icon: PiggyBank },
  { key: "tech", href: "/markets?category=tech", icon: Cpu },
] as const;

export function CategoryNav() {
  const t = useTranslations("categories");
  const pathname = usePathname();

  return (
    <div className="border-b border-border bg-background">
      <div className="mx-auto max-w-[1440px] px-4 lg:px-6">
        <ScrollArea className="w-full whitespace-nowrap">
          <nav className="flex items-center gap-1 py-2">
            {categories.map((category) => {
              const Icon = category.icon;
              const isActive =
                (category.key === "trending" && pathname.endsWith("/")) ||
                pathname.includes(category.key);

              return (
                <Link
                  key={category.key}
                  href={category.href}
                  className={cn(
                    "relative flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "text-primary"
                      : "text-foreground-secondary hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{t(category.key)}</span>
                  {isActive && (
                    <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-primary" />
                  )}
                </Link>
              );
            })}
          </nav>
          <ScrollBar orientation="horizontal" className="invisible" />
        </ScrollArea>
      </div>
    </div>
  );
}
