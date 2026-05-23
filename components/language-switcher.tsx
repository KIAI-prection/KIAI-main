"use client";

import { useLocale } from "next-intl";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const switchLocale = (newLocale: string) => {
    // Replace the current locale in the path
    const segments = pathname.split("/");
    segments[1] = newLocale;
    router.push(segments.join("/"));
  };

  return (
    <div className="flex items-center rounded-lg border border-border bg-background p-0.5">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => switchLocale("ja")}
        className={cn(
          "h-7 rounded-md px-2.5 text-xs font-medium",
          locale === "ja"
            ? "bg-foreground text-background"
            : "text-foreground-muted hover:text-foreground"
        )}
      >
        JA
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => switchLocale("en")}
        className={cn(
          "h-7 rounded-md px-2.5 text-xs font-medium",
          locale === "en"
            ? "bg-foreground text-background"
            : "text-foreground-muted hover:text-foreground"
        )}
      >
        EN
      </Button>
    </div>
  );
}
