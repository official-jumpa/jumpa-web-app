"use client";

import { useState, useEffect, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FiMenu,
  FiX,
  FiSun,
  FiMoon,
  FiArrowRight,
  FiBookOpen,
  FiLayers,
  FiKey,
  FiShield,
  FiHelpCircle,
} from "react-icons/fi";
import { DOCS_CATEGORIES } from "@/lib/docs/content";

const CATEGORY_ICONS: Record<string, any> = {
  "getting-started": FiBookOpen,
  architecture: FiLayers,
  security: FiShield,
  support: FiHelpCircle,
};

interface DocsHeaderProps {
  onToggleSidebar?: () => void;
  isSidebarOpen?: boolean;
  theme?: "light" | "dark";
  onToggleTheme?: () => void;
}

function DocsHeader({
  onToggleSidebar,
  isSidebarOpen,
  theme = "light",
  onToggleTheme,
}: DocsHeaderProps) {
  return (
    <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-jumpa-neutral-100 dark:border-white/10 bg-jumpa-white/90 dark:bg-[#0B0D11]/90 px-4 backdrop-blur-md md:px-8 lg:px-12 transition-colors">
      <div className="flex items-center gap-4">
        {onToggleSidebar && (
          <button
            type="button"
            onClick={onToggleSidebar}
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-jumpa-neutral-100 dark:border-white/10 text-jumpa-neutral-700 dark:text-neutral-300 hover:bg-jumpa-neutral-50 dark:hover:bg-white/5 lg:hidden"
            aria-label="Toggle navigation"
          >
            {isSidebarOpen ? <FiX className="h-4 w-4" /> : <FiMenu className="h-4 w-4" />}
          </button>
        )}
        <Link href="/" className="flex items-center gap-2.5">
          <Image
            src="/logo/wordmark/purple.png"
            alt="Jumpa"
            width={90}
            height={20}
            className="h-5 w-auto object-contain dark:brightness-125"
          />
          <span className="rounded-md bg-jumpa-primary-50 dark:bg-jumpa-primary-950/60 px-2 py-0.5 text-[11px] font-semibold text-jumpa-primary-600 dark:text-jumpa-primary-400 tracking-wide uppercase">
            Docs
          </span>
        </Link>
      </div>

      <div className="flex items-center gap-3">
        {/* Dark Mode Toggle */}
        <button
          type="button"
          onClick={onToggleTheme}
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-jumpa-neutral-100 dark:border-white/10 text-jumpa-neutral-600 dark:text-neutral-300 transition-colors hover:bg-jumpa-neutral-50 dark:hover:bg-white/10 active:scale-95"
        >
          {theme === "dark" ? (
            <FiSun className="h-4 w-4 text-amber-400" />
          ) : (
            <FiMoon className="h-4 w-4 text-jumpa-neutral-700" />
          )}
        </button>

        {/* Get Started CTA */}
        <Link
          href="/sign-up"
          className="flex items-center gap-1.5 rounded-full bg-jumpa-black dark:bg-white px-4 py-2 text-xs font-semibold text-white dark:text-jumpa-black shadow-sm transition-transform active:scale-95 hover:bg-jumpa-neutral-700 dark:hover:bg-neutral-200"
        >
          <span>Get Started</span>
          <FiArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </header>
  );
}

interface DocsSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

function DocsSidebar({ isOpen, onClose }: DocsSidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-16 bottom-0 left-0 z-30 w-72 overflow-y-auto border-r border-jumpa-neutral-100 dark:border-white/10 bg-jumpa-white dark:bg-[#0E1116] px-5 py-6 transition-transform lg:sticky lg:top-16 lg:h-[calc(100dvh-4rem)] lg:w-64 lg:shrink-0 lg:translate-x-0 lg:overflow-y-auto ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <nav className="flex flex-col gap-7">
          {DOCS_CATEGORIES.map((cat) => {
            const Icon = CATEGORY_ICONS[cat.id] || FiBookOpen;
            return (
              <div key={cat.id} className="flex flex-col gap-2">
                <div className="flex items-center gap-2 px-2 text-[12px] font-bold tracking-wider text-jumpa-neutral-425 dark:text-neutral-400 uppercase">
                  <Icon className="h-3.5 w-3.5 text-jumpa-primary-600 dark:text-jumpa-primary-400" />
                  <span>{cat.title}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  {cat.items.map((item) => {
                    const href = `/docs/${item.id}`;
                    const isActive =
                      pathname === href || (item.id === "overview" && pathname === "/docs");

                    return (
                      <Link
                        key={item.id}
                        href={href}
                        onClick={onClose}
                        className={`group flex items-center justify-between rounded-lg px-2.5 py-1.5 text-[13px] font-medium transition-colors ${
                          isActive
                            ? "bg-jumpa-primary-50 dark:bg-jumpa-primary-950/60 font-semibold text-jumpa-primary-600 dark:text-jumpa-primary-300"
                            : "text-jumpa-neutral-700 dark:text-neutral-300 hover:bg-jumpa-neutral-50 dark:hover:bg-white/5 hover:text-jumpa-black dark:hover:text-white"
                        }`}
                      >
                        <span>{item.title}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>
      </aside>
    </>
  );
}

export default function DocsLayout({ children }: { children: ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    // Check saved theme or system preference
    const saved = localStorage.getItem("jumpa-docs-theme") as "light" | "dark" | null;
    let initial: "light" | "dark" = "light";
    if (saved === "dark" || saved === "light") {
      initial = saved;
    } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      initial = "dark";
    }
    setTheme(initial);
    applyTheme(initial);

    return () => {
      // Clean up when unmounting from docs
      document.documentElement.classList.remove("dark");
      document.documentElement.removeAttribute("data-theme");
    };
  }, []);

  const applyTheme = (t: "light" | "dark") => {
    if (t === "dark") {
      document.documentElement.classList.add("dark");
      document.documentElement.setAttribute("data-theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.setAttribute("data-theme", "light");
    }
  };

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    localStorage.setItem("jumpa-docs-theme", nextTheme);
    applyTheme(nextTheme);
  };

  return (
    <div
      data-theme={theme}
      className={`min-h-dvh w-full ${
        theme === "dark" ? "dark" : ""
      } bg-jumpa-white dark:bg-[#0B0D11] text-jumpa-black dark:text-[#E6EDF3] transition-colors`}
    >
      <DocsHeader
        theme={theme}
        onToggleTheme={toggleTheme}
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
      />
      <div className="mx-auto flex w-full max-w-[1440px] items-start">
        <DocsSidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
