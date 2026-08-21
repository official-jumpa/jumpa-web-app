import React from "react";

interface MarkdownTextProps {
  content: string;
  className?: string;
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
export function MarkdownText({ content, className = "" }: MarkdownTextProps) {
  if (!content) return null;

  const lines = content.split("\n");

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
            className="font-semibold text-jumpa-primary-600 underline hover:text-jumpa-primary-700 break-all [overflow-wrap:anywhere] transition-colors"
          >
            {linkMatch[1]}
          </a>
        );
      }

      // 2. Bold match
      const boldMatch =
        part.match(/^\*\*([^*]+)\*\*$/) || part.match(/^__([^_]+)__$/);
      if (boldMatch) {
        return (
          <strong
            key={index}
            className="font-bold text-jumpa-black break-words [overflow-wrap:anywhere]"
          >
            {boldMatch[1]}
          </strong>
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
            className="rounded bg-black/[0.06] px-1 py-0.5 font-mono text-xs text-jumpa-black break-all [overflow-wrap:anywhere] inline max-w-full"
          >
            {codeMatch[1]}
          </code>
        );
      }

      // Normal text
      return (
        <span key={index} className="break-words [overflow-wrap:anywhere]">
          {part}
        </span>
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
                        className="px-2.5 py-2 font-mono text-xs text-jumpa-grey-800 break-all [overflow-wrap:anywhere]"
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
          <div className="flex-1 leading-5.5 break-words [overflow-wrap:anywhere] min-w-0">
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
          <div className="flex-1 leading-5.5 break-words [overflow-wrap:anywhere] min-w-0">
            {renderInline(numMatch[2])}
          </div>
        </div>,
      );
      i++;
      continue;
    }

    // Regular line
    elements.push(
      <div
        key={`line-${i}`}
        className="leading-5.5 break-words [overflow-wrap:anywhere]"
      >
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
