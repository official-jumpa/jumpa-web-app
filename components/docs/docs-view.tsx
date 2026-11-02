"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  FiChevronRight,
  FiClock,
  FiCalendar,
  FiArrowLeft,
  FiArrowRight,
  FiCheck,
  FiCopy,
  FiInfo,
  FiCheckCircle,
  FiAlertCircle,
  FiAlertTriangle,
} from "react-icons/fi";
import { DOCS_CATEGORIES, DOCS_PAGES, type DocPage, type DocSection } from "@/lib/docs/content";

interface DocsCalloutProps {
  type?: "note" | "tip" | "important" | "warning";
  title?: string;
  children: ReactNode;
}

function DocsCallout({ type = "note", title, children }: DocsCalloutProps) {
  const configs = {
    note: {
      border: "border-blue-200 dark:border-blue-800/60 bg-blue-50/60 dark:bg-blue-950/20 text-blue-950 dark:text-blue-200",
      icon: <FiInfo className="h-4.5 w-4.5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />,
      defaultTitle: "Note",
    },
    tip: {
      border: "border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/60 dark:bg-emerald-950/20 text-emerald-950 dark:text-emerald-200",
      icon: <FiCheckCircle className="h-4.5 w-4.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />,
      defaultTitle: "Tip",
    },
    important: {
      border: "border-purple-200 dark:border-purple-800/60 bg-purple-50/60 dark:bg-purple-950/20 text-purple-950 dark:text-purple-200",
      icon: <FiAlertCircle className="h-4.5 w-4.5 text-jumpa-primary-600 dark:text-jumpa-primary-400 shrink-0 mt-0.5" />,
      defaultTitle: "Important",
    },
    warning: {
      border: "border-amber-200 dark:border-amber-800/60 bg-amber-50/60 dark:bg-amber-950/20 text-amber-950 dark:text-amber-200",
      icon: <FiAlertTriangle className="h-4.5 w-4.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />,
      defaultTitle: "Warning",
    },
  };

  const config = configs[type];

  return (
    <div className={`my-5 flex gap-3 rounded-xl border p-4 text-[14px] leading-6 ${config.border}`}>
      {config.icon}
      <div className="flex-1">
        <p className="font-semibold">{title || config.defaultTitle}</p>
        <div className="mt-1 opacity-90">{children}</div>
      </div>
    </div>
  );
}

interface DocsCodeBlockProps {
  code: string;
  language?: string;
  filename?: string;
}

function DocsCodeBlock({ code, language, filename }: DocsCodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-5 overflow-hidden rounded-xl border border-jumpa-neutral-100 dark:border-white/10 bg-[#0d0f12] text-white">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5 text-xs text-white/60">
        <span className="font-mono">{filename || language || "code"}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 text-xs text-white/70 transition-colors hover:bg-white/10 hover:text-white"
        >
          {copied ? (
            <>
              <FiCheck className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-emerald-400">Copied</span>
            </>
          ) : (
            <>
              <FiCopy className="h-3.5 w-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 text-[13px] leading-relaxed font-mono text-white/90">
        <code>{code}</code>
      </pre>
    </div>
  );
}

//  Table of Contents (Sticky on Right)
interface DocsTocProps {
  sections: DocSection[];
}

function DocsToc({ sections }: DocsTocProps) {
  const [activeId, setActiveId] = useState<string>(sections[0]?.id || "");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      { rootMargin: "-80px 0% -60% 0%" }
    );

    sections.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [sections]);

  if (!sections || sections.length === 0) return null;

  return (
    <div className="sticky top-20 hidden w-56 shrink-0 self-start xl:block max-h-[calc(100dvh-6rem)] overflow-y-auto py-1">
      <p className="text-[11px] font-bold tracking-wider text-jumpa-neutral-425 dark:text-neutral-400 uppercase">
        On this page
      </p>
      <ul className="mt-3 flex flex-col gap-2 border-l border-jumpa-neutral-100 dark:border-white/10 pl-3 text-[13px]">
        {sections.map((s) => {
          const isActive = activeId === s.id;
          return (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                className={`block transition-colors ${isActive
                    ? "font-semibold text-jumpa-primary-600 dark:text-jumpa-primary-400"
                    : "text-jumpa-neutral-600 dark:text-neutral-400 hover:text-jumpa-black dark:hover:text-white"
                  }`}
              >
                {s.title}
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// Markdown Parser (Links, Bold, Inline Code)
function FormattedText({ text }: { text: string }) {
  const tokenRegex = /(\[[^\]]+\]\([^)]+\)|\*\*.*?\*\*|`.*?`)/g;
  const parts = text.split(tokenRegex);

  return (
    <>
      {parts.map((part, i) => {
        if (!part) return null;

        // Markdown Link: [label](href)
        const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
        if (linkMatch) {
          const [, label, href] = linkMatch;
          const isInternal = href.startsWith("/") || href.startsWith("#");
          if (isInternal) {
            return (
              <Link
                key={i}
                href={href}
                className="font-medium text-jumpa-primary-600 dark:text-jumpa-primary-400 underline decoration-jumpa-primary-300 underline-offset-4 hover:decoration-jumpa-primary-600 transition-colors"
              >
                {label}
              </Link>
            );
          }
          return (
            <a
              key={i}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-jumpa-primary-600 dark:text-jumpa-primary-400 underline decoration-jumpa-primary-300 underline-offset-4 hover:decoration-jumpa-primary-600 transition-colors"
            >
              {label}
            </a>
          );
        }

        // Bold: **text**
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <strong key={i} className="font-semibold text-jumpa-black dark:text-white">
              {part.slice(2, -2)}
            </strong>
          );
        }

        // Inline Code: `code`
        if (part.startsWith("`") && part.endsWith("`")) {
          return (
            <code
              key={i}
              className="rounded bg-jumpa-neutral-100 dark:bg-white/10 px-1.5 py-0.5 font-mono text-[13px] font-medium text-jumpa-primary-700 dark:text-jumpa-primary-300"
            >
              {part.slice(1, -1)}
            </code>
          );
        }

        return part;
      })}
    </>
  );
}

// Main Article View
export function DocsView({ page }: { page: DocPage }) {
  // Find previous and next pages across all categories
  const allItems: { title: string; id: string }[] = [];
  DOCS_CATEGORIES.forEach((cat) => {
    cat.items.forEach((item) => {
      if (DOCS_PAGES[item.id]) {
        allItems.push({ title: item.title, id: item.id });
      }
    });
  });

  const currentIndex = allItems.findIndex((item) => item.id === page.id);
  const prevPage = currentIndex > 0 ? allItems[currentIndex - 1] : null;
  const nextPage = currentIndex < allItems.length - 1 ? allItems[currentIndex + 1] : null;

  return (
    <div className="flex w-full items-start justify-between gap-10 px-4 py-8 md:px-10 lg:px-12 xl:gap-14">
      {/* Main Reading Column */}
      <article className="w-full max-w-3xl min-w-0">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-xs text-jumpa-neutral-425 dark:text-neutral-400">
          <Link href="/docs" className="hover:text-jumpa-black dark:hover:text-white transition-colors">
            Docs
          </Link>
          <FiChevronRight className="h-3 w-3" />
          <span>{page.category}</span>
          <FiChevronRight className="h-3 w-3" />
          <span className="font-medium text-jumpa-neutral-700 dark:text-neutral-200">{page.title}</span>
        </div>

        {/* Header */}
        <header className="mt-4 border-b border-jumpa-neutral-100 dark:border-white/10 pb-6">
          <h1 className="text-3xl font-bold tracking-tight text-jumpa-black dark:text-white md:text-4xl">
            {page.title}
          </h1>
          <p className="mt-3 text-base leading-relaxed text-jumpa-neutral-600 dark:text-neutral-300">
            {page.description}
          </p>
          <div className="mt-4 flex items-center gap-4 text-xs text-jumpa-neutral-425 dark:text-neutral-400">
            <span className="flex items-center gap-1.5">
              <FiClock className="h-3.5 w-3.5 text-jumpa-primary-600 dark:text-jumpa-primary-400" />
              {page.readTime}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5">
              <FiCalendar className="h-3.5 w-3.5 text-jumpa-primary-600 dark:text-jumpa-primary-400" />
              Updated {page.lastUpdated}
            </span>
          </div>
        </header>

        {/* Content Sections */}
        <div className="mt-8 flex flex-col gap-10">
          {page.sections.map((section) => (
            <section key={section.id} id={section.id} className="scroll-mt-24">
              <h2 className="text-xl font-bold text-jumpa-black dark:text-white md:text-2xl">
                {section.title}
              </h2>

              <div className="mt-3 space-y-4 text-[15px] leading-7 text-jumpa-neutral-700 dark:text-neutral-300">
                {section.content.split("\n\n").map((para, i) => {
                  if (para.startsWith("- ") || para.startsWith("1. ")) {
                    const lines = para.split("\n");
                    const isOrdered = para.startsWith("1. ");
                    const ListTag = isOrdered ? "ol" : "ul";
                    return (
                      <ListTag
                        key={i}
                        className={`space-y-2 pl-5 ${isOrdered
                            ? "list-decimal"
                            : "list-disc marker:text-jumpa-primary-600 dark:marker:text-jumpa-primary-400"
                          }`}
                      >
                        {lines.map((line, liIdx) => (
                          <li key={liIdx}>
                            <FormattedText text={line.replace(/^[-*\d.]+\s*/, "")} />
                          </li>
                        ))}
                      </ListTag>
                    );
                  }
                  return (
                    <p key={i}>
                      <FormattedText text={para} />
                    </p>
                  );
                })}
              </div>

              {/* Optional Callout */}
              {section.callout && (
                <DocsCallout type={section.callout.type} title={section.callout.title}>
                  {section.callout.text}
                </DocsCallout>
              )}

              {/* Optional Code Block */}
              {section.codeBlock && (
                <DocsCodeBlock
                  code={section.codeBlock.code}
                  language={section.codeBlock.language}
                  filename={section.codeBlock.filename}
                />
              )}

              {/* Optional Table */}
              {section.table && (
                <div className="my-5 overflow-hidden rounded-xl border border-jumpa-neutral-100 dark:border-white/10">
                  <table className="w-full text-left text-xs md:text-sm">
                    <thead className="border-b border-jumpa-neutral-100 dark:border-white/10 bg-jumpa-neutral-50 dark:bg-white/5 font-semibold text-jumpa-black dark:text-white">
                      <tr>
                        {section.table.headers.map((h, hIdx) => (
                          <th key={hIdx} className="px-4 py-3">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-jumpa-neutral-100 dark:divide-white/5 text-jumpa-neutral-700 dark:text-neutral-300">
                      {section.table.rows.map((row, rIdx) => (
                        <tr key={rIdx} className="hover:bg-jumpa-neutral-50/50 dark:hover:bg-white/5 transition-colors">
                          {row.map((cell, cIdx) => (
                            <td key={cIdx} className="px-4 py-3 align-top leading-relaxed">
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          ))}
        </div>

        {/* Previous & Next Chapter Navigation */}
        <div className="mt-14 flex items-center justify-between border-t border-jumpa-neutral-100 dark:border-white/10 pt-8">
          {prevPage ? (
            <Link
              href={`/docs/${prevPage.id}`}
              className="group flex flex-col gap-1 rounded-xl border border-jumpa-neutral-100 dark:border-white/10 p-4 transition-colors hover:border-jumpa-primary-200 dark:hover:border-jumpa-primary-800 hover:bg-jumpa-primary-50/30 dark:hover:bg-jumpa-primary-950/20"
            >
              <span className="flex items-center gap-1.5 text-xs text-jumpa-neutral-425 dark:text-neutral-400 group-hover:text-jumpa-primary-600 dark:group-hover:text-jumpa-primary-400">
                <FiArrowLeft className="h-3 w-3" />
                Previous
              </span>
              <span className="text-sm font-semibold text-jumpa-black dark:text-white">
                {prevPage.title}
              </span>
            </Link>
          ) : (
            <div />
          )}

          {nextPage && (
            <Link
              href={`/docs/${nextPage.id}`}
              className="group flex flex-col items-end gap-1 rounded-xl border border-jumpa-neutral-100 dark:border-white/10 p-4 transition-colors hover:border-jumpa-primary-200 dark:hover:border-jumpa-primary-800 hover:bg-jumpa-primary-50/30 dark:hover:bg-jumpa-primary-950/20"
            >
              <span className="flex items-center gap-1.5 text-xs text-jumpa-neutral-425 dark:text-neutral-400 group-hover:text-jumpa-primary-600 dark:group-hover:text-jumpa-primary-400">
                Next
                <FiArrowRight className="h-3 w-3" />
              </span>
              <span className="text-sm font-semibold text-jumpa-black dark:text-white">
                {nextPage.title}
              </span>
            </Link>
          )}
        </div>
      </article>

      {/* Right Column: On-page Table of Contents */}
      <DocsToc sections={page.sections} />
    </div>
  );
}
