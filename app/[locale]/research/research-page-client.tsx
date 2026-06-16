"use client";

import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { mockArticles } from "@/lib/mock-data";
import { Clock, User, BookOpen } from "lucide-react";

export function ResearchPageClient() {
  const t = useTranslations("research");

  return (
    <div className="container max-w-4xl mx-auto py-6">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-foreground mb-2">
          {t("title")}
        </h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>

      <div className="space-y-6">
        {mockArticles.map((article) => (
          <Card
            key={article.id}
            className="p-6 hover:border-brand transition-colors cursor-pointer group"
          >
            <div className="flex items-start gap-2 mb-3">
              <Badge variant="outline" className="text-xs">
                {article.category}
              </Badge>
              <div className="flex items-center gap-3 text-sm text-muted-foreground ml-auto">
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {article.readTime} {t("minRead")}
                </span>
                <span>{article.date}</span>
              </div>
            </div>

            <h2 className="text-xl font-semibold text-foreground group-hover:text-brand transition-colors mb-2">
              {article.title.en}
            </h2>

            <p className="text-muted-foreground mb-4">
              {article.excerpt.en}
            </p>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="h-4 w-4" />
              <span>{article.author}</span>
            </div>
          </Card>
        ))}
      </div>

      {/* Coming Soon */}
      <Card className="p-8 mt-8 text-center border-dashed">
        <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-2">
          {t("moreComingSoon")}
        </h3>
        <p className="text-muted-foreground">{t("stayTuned")}</p>
      </Card>
    </div>
  );
}
