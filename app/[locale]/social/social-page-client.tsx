"use client";

import { useTranslations } from "next-intl";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SocialPost } from "@/components/social-post";
import { mockSocialPosts } from "@/lib/mock-data";
import { TrendingUp, Clock, Users } from "lucide-react";

export function SocialPageClient() {
  const t = useTranslations("social");

  return (
    <div className="container max-w-3xl mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground mb-2">
          {t("title")}
        </h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>

      <Tabs defaultValue="trending" className="mb-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="trending" className="gap-1.5">
            <TrendingUp className="h-4 w-4" />
            {t("tabs.trending")}
          </TabsTrigger>
          <TabsTrigger value="recent" className="gap-1.5">
            <Clock className="h-4 w-4" />
            {t("tabs.recent")}
          </TabsTrigger>
          <TabsTrigger value="following" className="gap-1.5">
            <Users className="h-4 w-4" />
            {t("tabs.following")}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="border border-border rounded-xl overflow-hidden bg-background">
        {mockSocialPosts.map((post) => (
          <SocialPost key={post.id} post={post} />
        ))}
      </div>
    </div>
  );
}
