import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import { Analytics } from "@vercel/analytics/next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { ThemeProvider } from "@/components/theme-provider";
import { Header } from "@/components/header";
import { CategoryNav } from "@/components/category-nav";
import { WalletProvider } from "@/lib/providers/wallet-provider";
import "../globals.css";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "KIAI - Prediction Market Platform",
  description:
    "Trade yes/no contracts on politics, economics, sports, culture, technology, and other future events.",
  generator: "v0.app",
  icons: {
    icon: [
      {
        url: "/icon-light-32x32.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icon-dark-32x32.png",
        media: "(prefers-color-scheme: dark)",
      },
    ],
    apple: "/apple-icon.png",
  },
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as "en")) {
    notFound();
  }

  const messages = await getMessages();

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${geist.variable} ${geistMono.variable} bg-background`}
    >
      <body className="font-sans antialiased" suppressHydrationWarning>
        <Script
          id="extension-hydration-attribute-cleanup"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (() => {
                const injectedAttributePattern = /^(bis_|__processed_)/;
                const clean = (node) => {
                  if (!node || node.nodeType !== Node.ELEMENT_NODE) return;
                  for (const attribute of Array.from(node.attributes)) {
                    if (injectedAttributePattern.test(attribute.name)) {
                      node.removeAttribute(attribute.name);
                    }
                  }
                  for (const element of node.querySelectorAll("*")) {
                    for (const attribute of Array.from(element.attributes)) {
                      if (injectedAttributePattern.test(attribute.name)) {
                        element.removeAttribute(attribute.name);
                      }
                    }
                  }
                };

                clean(document.documentElement);
                const observer = new MutationObserver((mutations) => {
                  for (const mutation of mutations) {
                    if (mutation.type === "attributes") {
                      clean(mutation.target);
                    }
                    for (const node of mutation.addedNodes) {
                      clean(node);
                    }
                  }
                });
                observer.observe(document.documentElement, {
                  attributes: true,
                  childList: true,
                  subtree: true,
                });
                window.addEventListener("load", () => observer.disconnect(), {
                  once: true,
                });
              })();
            `,
          }}
        />
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <NextIntlClientProvider messages={messages}>
            <WalletProvider>
              <div className="flex min-h-screen flex-col">
                <Header />
                <CategoryNav />
                <main className="flex-1">{children}</main>
              </div>
            </WalletProvider>
          </NextIntlClientProvider>
        </ThemeProvider>
        {process.env.NODE_ENV === "production" && <Analytics />}
      </body>
    </html>
  );
}
