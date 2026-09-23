import type React from "react";
import { Fragment } from "react";
import {
  CopyableAddress,
  isAddress,
  splitAddresses,
} from "@/components/chat/copyable-address";

interface MarkdownTextProps {
  content: string;
  className?: string;
  /** Reveal the copy word by word, for a reply that has just arrived. */
  reveal?: boolean;
}

/**
 * Parses and formats markdown elements:
 * - Markdown links [title](url)
 * - Bold **text** / __text__
 * - Italic *text* / _text_
 * - Inline code `code` (with break-all for wallet addresses & hashes)
 * - Code blocks ``` ... ```
 * - Markdown tables (| header | header |)
 * - Bullet lists (- or *) and numbered lists
 * - Paragraphs and line breaks
 */
export function MarkdownText({
  content,
  className = "",
  reveal = false,
}: MarkdownTextProps) {
  const textContent =
    typeof content === "string"
      ? content
      : content != null
        ? String(content)
        : "";
  if (!textContent) return null;

  const lines = textContent.split("\n");

  // Counts up across the whole message so the stagger reads left to right, not
  // per line. Reset every render, which is what we want — the reveal is a mount
  // animation and re-running it on a re-render would look identical.
  let wordIndex = 0;

  /**
   * Splits a run of plain text into per-word spans. The text is laid out in full
   * before it animates, so the bubble never resizes mid-reveal and the scroller
   * does not chase it.
   */
  const revealWords = (text: string, key: number) => (
    <span key={key} className="wrap-anywhere">
      {text.split(/(\s+)/).map((token, tokenIndex) =>
        token.trim() === "" ? (
          token
        ) : (
          <span
            // biome-ignore lint/suspicious/noArrayIndexKey: tokens never reorder
            key={tokenIndex}
            // `wrap-anywhere` is what lets the inline-block shrink: it counts
            // toward min-content, where `break-words` does not, so without it a
            // long token sits in a box too wide to wrap and runs off the bubble.
            className="inline-block max-w-full animate-word stagger-word wrap-anywhere whitespace-pre-wrap"
            style={{ "--i": wordIndex++ } as React.CSSProperties}
          >
            {token}
          </span>
        ),
      )}
    </span>
  );

  const renderInline = (text: string): React.ReactNode[] => {
    // 1. Links, Bold, Italic, Code
    const pattern =
      /(\[[^\]]+\]\(https?:\/\/[^\s)]+\)|\*\*[^*]+\*\*|__[^_]+__|\*[^*]+\*|_[^_]+_|`[^`]+`)/g;

    const parts = text.split(pattern);

    return parts.map((part, index) => {
      // 1. Link match
      const linkMatch = part.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/);
      if (linkMatch) {
        return (
          <a
            key={index}
            href={linkMatch[2]}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-jumpa-primary-600 underline hover:text-jumpa-primary-700 break-all wrap-anywhere transition-colors"
          >
            {linkMatch[1]}
          </a>
        );
      }

      // 2. Bold match
      const boldMatch =
        part.match(/^\*\*([^*]+)\*\*$/) || part.match(/^__([^_]+)__$/);
      if (boldMatch) {
        // An address arrives as a bold run; it gets the copy chip, not `strong`.
        const bold = boldMatch[1].trim();
        return (
          <Fragment key={index}>
            {isAddress(bold) ? (
              <CopyableAddress value={bold} />
            ) : (
              <strong className="font-bold text-jumpa-black wrap-anywhere">
                {/* Bold runs reveal with the rest, or a figure pops in ahead of
                    the words around it. */}
                {reveal ? revealWords(boldMatch[1], index) : boldMatch[1]}
              </strong>
            )}
          </Fragment>
        );
      }

      // 3. Italic match
      const italicMatch =
        part.match(/^\*([^*]+)\*$/) || part.match(/^_([^_]+)_$/);
      if (italicMatch) {
        return (
          <em key={index} className="italic text-inherit">
            {italicMatch[1]}
          </em>
        );
      }

      // 4. Inline code match (break-all for crypto addresses & keys)
      const codeMatch = part.match(/^`([^`]+)`$/);
      if (codeMatch) {
        return (
          <code
            key={index}
            className="rounded bg-black/[0.06] px-1 py-0.5 font-mono text-xs text-jumpa-black break-all wrap-anywhere inline max-w-full"
          >
            {codeMatch[1]}
          </code>
        );
      }

      // Normal text, with any bare address in it lifted out as a copy chip.
      return (
        <Fragment key={index}>
          {splitAddresses(part).map((chunk, chunkIndex) =>
            chunk.address ? (
              <CopyableAddress
                // biome-ignore lint/suspicious/noArrayIndexKey: chunks never reorder
                key={chunkIndex}
                value={chunk.text}
              />
            ) : reveal ? (
              revealWords(chunk.text, chunkIndex)
            ) : (
              <span
                // biome-ignore lint/suspicious/noArrayIndexKey: chunks never reorder
                key={chunkIndex}
                className="wrap-anywhere"
              >
                {chunk.text}
              </span>
            ),
          )}
        </Fragment>
      );
    });
  };

  let inCodeBlock = false;
  let codeBlockBuffer: string[] = [];
  const elements: React.ReactNode[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // Code block toggle
    if (line.trim().startsWith("```")) {
      if (inCodeBlock) {
        elements.push(
          <pre
            key={`code-${i}`}
            className="my-2 max-w-full overflow-x-auto rounded-lg bg-jumpa-grey-900 p-2.5 font-mono text-xs text-jumpa-white"
          >
            <code>{codeBlockBuffer.join("\n")}</code>
          </pre>,
        );
        codeBlockBuffer = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      i++;
      continue;
    }

    if (inCodeBlock) {
      codeBlockBuffer.push(line);
      i++;
      continue;
    }

    const trimmed = line.trim();

    // Empty line
    if (!trimmed) {
      elements.push(<div key={`sp-${i}`} className="h-1.5" />);
      i++;
      continue;
    }

    // Markdown Table Detection: Starts with | and next line has |---|
    if (
      trimmed.startsWith("|") &&
      trimmed.endsWith("|") &&
      i + 1 < lines.length &&
      lines[i + 1].includes("|-")
    ) {
      const tableLines: string[] = [];
      while (
        i < lines.length &&
        lines[i].trim().startsWith("|") &&
        lines[i].trim().endsWith("|")
      ) {
        tableLines.push(lines[i].trim());
        i++;
      }

      if (tableLines.length >= 2) {
        const headerCells = tableLines[0]
          .split("|")
          .slice(1, -1)
          .map((c) => c.trim());
        const dataRows = tableLines.slice(2).map((row) =>
          row
            .split("|")
            .slice(1, -1)
            .map((c) => c.trim()),
        );

        elements.push(
          <div
            key={`table-${i}`}
            className="my-2 max-w-full overflow-x-auto rounded-lg border border-black/10 bg-white/80 p-1 shadow-xs"
          >
            <table className="w-full text-left text-[13px] border-collapse">
              <thead>
                <tr className="border-b border-black/10 bg-black/[0.04]">
                  {headerCells.map((h, hIdx) => (
                    <th
                      key={hIdx}
                      className="px-2.5 py-2 font-bold text-jumpa-black"
                    >
                      {renderInline(h)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dataRows.map((row, rIdx) => (
                  <tr
                    key={rIdx}
                    className="border-b border-black/5 last:border-0 hover:bg-black/[0.02]"
                  >
                    {row.map((cell, cIdx) => (
                      <td
                        key={cIdx}
                        className="px-2.5 py-2 font-mono text-xs text-jumpa-grey-800 break-all wrap-anywhere"
                      >
                        {renderInline(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>,
        );
        continue;
      }
    }

    // Bullet list items
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      elements.push(
        <div
          key={`li-${i}`}
          className="flex items-start gap-1.5 pl-1 my-0.5 max-w-full"
        >
          <span className="text-jumpa-primary-600 font-bold shrink-0">•</span>
          <div className="flex-1 leading-5.5 wrap-anywhere min-w-0">
            {renderInline(trimmed.slice(2))}
          </div>
        </div>,
      );
      i++;
      continue;
    }

    // Numbered list items
    const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
    if (numMatch) {
      elements.push(
        <div
          key={`num-${i}`}
          className="flex items-start gap-1.5 pl-1 my-0.5 max-w-full"
        >
          <span className="font-semibold text-jumpa-primary-600 text-sm shrink-0">
            {numMatch[1]}.
          </span>
          <div className="flex-1 leading-5.5 wrap-anywhere min-w-0">
            {renderInline(numMatch[2])}
          </div>
        </div>,
      );
      i++;
      continue;
    }

    // Regular line
    elements.push(
      <div key={`line-${i}`} className="leading-5.5 wrap-anywhere">
        {renderInline(line)}
      </div>,
    );
    i++;
  }

  // Flush any unclosed code block
  if (inCodeBlock && codeBlockBuffer.length > 0) {
    elements.push(
      <pre
        key="unclosed-code"
        className="my-2 max-w-full overflow-x-auto rounded-lg bg-jumpa-grey-900 p-2.5 font-mono text-xs text-jumpa-white"
      >
        <code>{codeBlockBuffer.join("\n")}</code>
      </pre>,
    );
  }

  return (
    <div className={`flex flex-col gap-1 max-w-full ${className}`}>
      {elements}
    </div>
  );
}
