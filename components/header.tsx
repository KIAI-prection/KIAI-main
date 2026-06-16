"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations, useLocale } from "next-intl";
import { Search, Menu, ChevronDown, Sun, Moon } from "lucide-react";
import { useTheme } from "../components/theme-provider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { WalletConnect } from "@/components/wallet-connect";
import { cn } from "@/lib/utils";
import { usePathname, useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

type NavItem = {
  key: "markets" | "live" | "social" | "trust" | "research";
  href: "/markets" | "/live" | "/social" | "/trust" | "/research";
  badge?: number;
  hasDropdown?: boolean;
};

const navItems: readonly NavItem[] = [
  { key: "markets", href: "/markets" },
  { key: "live", href: "/live", badge: 66 },
  { key: "social", href: "/social" },
  { key: "trust", href: "/trust", hasDropdown: true },
  { key: "research", href: "/research" },
];

export function Header() {
  const t = useTranslations("nav");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const { setTheme, resolvedTheme } = useTheme();
  const [searchQuery, setSearchQuery] = useState("");

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = searchQuery.trim();
    if (!query) {
      router.push("/" + locale + "/markets");
      return;
    }

    router.push(
      "/" + locale + "/markets?q=" + encodeURIComponent(query)
    );
  }

  return (
    <header className="sticky top-0 z-50 h-16 border-b border-border bg-background">
      <div className="mx-auto flex h-full max-w-[1440px] items-center justify-between px-4 lg:px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-1">
          <span className="text-xl font-bold tracking-tight text-foreground">
            KIAI
          </span>
          <span className="text-xl font-bold text-primary">!</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-1 lg:flex">
          {navItems.map((item) => {
            const isActive = pathname.includes(item.href);

            if (item.hasDropdown) {
              return (
                <DropdownMenu key={item.key}>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className={cn(
                        "gap-1 text-sm font-medium",
                        isActive && "text-primary"
                      )}
                    >
                      {t(item.key)}
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem asChild>
                      <Link href="/trust">About Trust</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/trust/faq">FAQ</Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              );
            }

            return (
              <Link key={item.key} href={item.href}>
                <Button
                  variant="ghost"
                  className={cn(
                    "gap-1.5 text-sm font-medium",
                    isActive && "text-primary"
                  )}
                >
                  {t(item.key)}
                  {item.badge && (
                    <span className="rounded-full bg-muted px-1.5 py-0.5 text-xs tabular-nums text-foreground-secondary">
                      {item.badge}
                    </span>
                  )}
                </Button>
              </Link>
            );
          })}
        </nav>

        {/* Search Bar */}
        <div className="hidden max-w-[480px] flex-1 px-8 md:block">
          <form className="relative" role="search" onSubmit={submitSearch}>
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-muted" />
            <input
              type="text"
              suppressHydrationWarning
              placeholder={t("search")}
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="h-10 w-full rounded-lg border border-border bg-background pl-10 pr-4 text-sm placeholder:text-foreground-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </form>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button className="hidden bg-primary text-primary-foreground hover:bg-primary-hover sm:flex">
                {t("deposit")}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Wallets</DialogTitle>
                <DialogDescription>
                  Connect a Base or Sui testnet wallet before placing a real trade.
                </DialogDescription>
              </DialogHeader>
              <WalletConnect />
            </DialogContent>
          </Dialog>

          <Button variant="ghost" size="icon" className="hidden lg:flex" onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}>
            {resolvedTheme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>



          {/* Mobile Menu */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80">
              <nav className="flex flex-col gap-4 pt-8">
                {navItems.map((item) => (
                  <Link
                    key={item.key}
                    href={item.href}
                    className="flex items-center justify-between py-2 text-lg font-medium"
                  >
                    {t(item.key)}
                    {item.badge && (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-sm tabular-nums">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                ))}
                <div className="border-t border-border pt-4">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button className="w-full bg-primary text-primary-foreground hover:bg-primary-hover">
                        {t("deposit")}
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Wallets</DialogTitle>
                        <DialogDescription>
                          Connect a Base or Sui testnet wallet before placing a real trade.
                        </DialogDescription>
                      </DialogHeader>
                      <WalletConnect />
                    </DialogContent>
                  </Dialog>
                </div>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
