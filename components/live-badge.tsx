"use client";

import { useTranslations } from "next-intl";

interface LiveBadgeProps {
  info?: string;
}

export function LiveBadge({ info }: LiveBadgeProps) {
  const t = useTranslations("market");

  return (
    <div className="mb-3 flex items-center gap-1.5">
      <span className="h-2 w-2 animate-pulse-live rounded-full bg-live" />
      <span className="text-xs font-medium text-live">{t("live")}</span>
      {info && <span className="text-xs text-foreground-muted">{info}</span>}
    </div>
  );
}
