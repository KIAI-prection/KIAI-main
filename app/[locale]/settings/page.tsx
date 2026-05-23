import { getTranslations } from "next-intl/server";
import { SettingsPageClient } from "./settings-page-client";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "settings" });
  return {
    title: t("title"),
    description: t("description"),
  };
}

export default function SettingsPage() {
  return <SettingsPageClient />;
}
