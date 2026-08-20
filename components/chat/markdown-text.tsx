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
 * - Inline code `code`
 * - Code blocks ``` ... ```
 * - Bullet lists (- or *) and numbered lists
 * - Paragraphs and line breaks
 */
export function MarkdownText({ content, className = "" }: MarkdownTextProps) {
  if (!content) return null;

  // Split into lines/blocks
  const lines = content.split("\n");

  const renderInline = (text: string): React.ReactNode[] => {
    // Regex for markdown formatting:
    // 1. Links: \[([^\]]+)\]\((https?:\/\/[^\s)]+)\)
    // 2. Bold: \*\*([^*]+)\*\* | __([^_]+)__
    // 3. Italic: \*([^*]+)\* | _([^_]+)_
    // 4. Code: `([^`]+)`
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
            className="font-semibold text-jumpa-primary-600 underline hover:text-jumpa-primary-700 break-all transition-colors"
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
          <strong key={index} className="font-bold text-jumpa-black">
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

      // 4. Inline code match
      const codeMatch = part.match(/^`([^`]+)`$/);
      if (codeMatch) {
        return (
          <code
            key={index}
            className="rounded bg-jumpa-neutral-100 px-1 py-0.5 font-mono text-xs text-jumpa-primary-950"
          >
            {codeMatch[1]}
          </code>
        );
      }

      // Normal text
      return <React.Fragment key={index}>{part}</React.Fragment>;
    });
  };

  let inCodeBlock = false;
  let codeBlockBuffer: string[] = [];
  const elements: React.ReactNode[] = [];

  lines.forEach((line, idx) => {
    // Code block toggle
    if (line.trim().startsWith("```")) {
      if (inCodeBlock) {
        // Close code block
        elements.push(
          <pre
            key={`code-${idx}`}
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
      return;
    }

    if (inCodeBlock) {
      codeBlockBuffer.push(line);
      return;
    }

    const trimmed = line.trim();

    // Empty line
    if (!trimmed) {
      elements.push(<div key={`sp-${idx}`} className="h-1.5" />);
      return;
    }

    // Bullet list items
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      elements.push(
        <div key={`li-${idx}`} className="flex items-start gap-1.5 pl-1 my-0.5">
          <span className="text-jumpa-primary-600 font-bold">•</span>
          <div className="flex-1 leading-4.5">
            {renderInline(trimmed.slice(2))}
          </div>
        </div>,
      );
      return;
    }

    // Numbered list items
    const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
    if (numMatch) {
      elements.push(
        <div
          key={`num-${idx}`}
          className="flex items-start gap-1.5 pl-1 my-0.5"
        >
          <span className="font-semibold text-jumpa-primary-600 text-xs">
            {numMatch[1]}.
          </span>
          <div className="flex-1 leading-4.5">{renderInline(numMatch[2])}</div>
        </div>,
      );
      return;
    }

    // Regular line
    elements.push(
      <div key={`line-${idx}`} className="leading-4.5">
        {renderInline(line)}
      </div>,
    );
  });

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

  return <div className={`flex flex-col gap-1 ${className}`}>{elements}</div>;
}
