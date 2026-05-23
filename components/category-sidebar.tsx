"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface CategoryItem {
  key: string;
  count: number;
  children?: CategoryItem[];
}

const sportsCategories: CategoryItem[] = [
  { key: "tennis", count: 155 },
  { key: "soccer", count: 285 },
  { key: "golf", count: 5 },
  { key: "basketball", count: 68 },
  { key: "hockey", count: 22 },
  { key: "baseball", count: 66 },
  { key: "cricket", count: 64 },
  { key: "football", count: 35 },
  { key: "boxing", count: 13 },
  { key: "racing", count: 8 },
  { key: "mma", count: 8 },
  { key: "rugby", count: 7 },
  { key: "afl", count: 5 },
  { key: "lacrosse", count: 2 },
  { key: "other", count: 68 },
];

interface CategorySidebarProps {
  selectedCategory: string | null;
  onSelectCategory: (category: string) => void;
}

export function CategorySidebar({
  selectedCategory,
  onSelectCategory,
}: CategorySidebarProps) {
  const t = useTranslations("sports");
  const tCategories = useTranslations("categories");
  const [expandedSections, setExpandedSections] = useState<string[]>(["sports"]);

  const toggleSection = (section: string) => {
    setExpandedSections((prev) =>
      prev.includes(section)
        ? prev.filter((s) => s !== section)
        : [...prev, section]
    );
  };

  return (
    <aside className="w-64 shrink-0 border-r border-border bg-background">
      <div className="sticky top-[112px] max-h-[calc(100vh-112px)] overflow-y-auto p-4">
        {/* What's Next Section */}
        <div className="mb-4">
          <button
            onClick={() => toggleSection("whats-next")}
            className="flex w-full items-center justify-between py-2 text-sm font-semibold text-foreground"
          >
            <span>{tCategories("trending")}</span>
            {expandedSections.includes("whats-next") ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
        </div>

        {/* Sports Section */}
        <div>
          <button
            onClick={() => toggleSection("sports")}
            className="flex w-full items-center justify-between py-2 text-sm font-semibold text-foreground"
          >
            <span>{tCategories("sports")}</span>
            {expandedSections.includes("sports") ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>

          {expandedSections.includes("sports") && (
            <div className="ml-2 space-y-0.5">
              {sportsCategories.map((category) => (
                <button
                  key={category.key}
                  onClick={() => onSelectCategory(category.key)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors",
                    selectedCategory === category.key
                      ? "bg-primary-light text-primary"
                      : "text-foreground-secondary hover:bg-muted hover:text-foreground"
                  )}
                >
                  <span>{t(category.key)}</span>
                  <span className="tabular-nums text-foreground-muted">
                    ({category.count})
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
