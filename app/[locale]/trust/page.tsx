import { getTranslations } from "next-intl/server";
import { TrustPageClient } from "./trust-page-client";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "trust" });
  return {
    title: t("title"),
    description: t("description"),
  };
}

export default function TrustPage() {
  return <TrustPageClient />;
}
