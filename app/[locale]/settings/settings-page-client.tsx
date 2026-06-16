"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTheme } from "@/components/theme-provider";
import { Sun, Bell, Shield, User } from "lucide-react";

export function SettingsPageClient() {
  const t = useTranslations("settings");
  const { theme, setTheme } = useTheme();

  const [notifications, setNotifications] = useState({
    trades: true,
    priceAlerts: true,
    news: false,
    marketing: false,
  });

  return (
    <div className="container max-w-2xl mx-auto py-6">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-foreground mb-2">
          {t("title")}
        </h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>

      <div className="space-y-6">
        {/* Theme Settings */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Sun className="h-5 w-5 text-brand" />
            <h2 className="text-lg font-semibold text-foreground">
              {t("theme.title")}
            </h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="theme">{t("theme.select")}</Label>
              <Select
                value={theme ?? "light"}
                onValueChange={(value) =>
                  setTheme(value as "light" | "dark" | "system")
                }
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">{t("theme.light")}</SelectItem>
                  <SelectItem value="dark">{t("theme.dark")}</SelectItem>
                  <SelectItem value="system">{t("theme.system")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        {/* Notification Settings */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Bell className="h-5 w-5 text-brand" />
            <h2 className="text-lg font-semibold text-foreground">
              {t("notifications.title")}
            </h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>{t("notifications.trades")}</Label>
                <p className="text-sm text-muted-foreground">
                  {t("notifications.tradesDesc")}
                </p>
              </div>
              <Switch
                checked={notifications.trades}
                onCheckedChange={(checked) =>
                  setNotifications({ ...notifications, trades: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>{t("notifications.priceAlerts")}</Label>
                <p className="text-sm text-muted-foreground">
                  {t("notifications.priceAlertsDesc")}
                </p>
              </div>
              <Switch
                checked={notifications.priceAlerts}
                onCheckedChange={(checked) =>
                  setNotifications({ ...notifications, priceAlerts: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>{t("notifications.news")}</Label>
                <p className="text-sm text-muted-foreground">
                  {t("notifications.newsDesc")}
                </p>
              </div>
              <Switch
                checked={notifications.news}
                onCheckedChange={(checked) =>
                  setNotifications({ ...notifications, news: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>{t("notifications.marketing")}</Label>
                <p className="text-sm text-muted-foreground">
                  {t("notifications.marketingDesc")}
                </p>
              </div>
              <Switch
                checked={notifications.marketing}
                onCheckedChange={(checked) =>
                  setNotifications({ ...notifications, marketing: checked })
                }
              />
            </div>
          </div>
        </Card>

        {/* Account Settings */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <User className="h-5 w-5 text-brand" />
            <h2 className="text-lg font-semibold text-foreground">
              {t("account.title")}
            </h2>
          </div>

          <div className="space-y-3">
            <Button variant="outline" className="w-full justify-start">
              <Shield className="h-4 w-4 mr-2" />
              {t("account.security")}
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start text-destructive hover:text-destructive"
            >
              {t("account.deleteAccount")}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
