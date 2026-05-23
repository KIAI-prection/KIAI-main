import { getTranslations } from "next-intl/server";
import { LoginPageClient } from "./login-page-client";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "auth" });
  return {
    title: t("login"),
    description: t("loginDescription"),
  };
}

export default function LoginPage() {
  return <LoginPageClient />;
}
