import { getTranslations } from "next-intl/server";
import { SignupPageClient } from "./signup-page-client";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "auth" });
  return {
    title: t("signup"),
    description: t("signupDescription"),
  };
}

export default function SignupPage() {
  return <SignupPageClient />;
}
