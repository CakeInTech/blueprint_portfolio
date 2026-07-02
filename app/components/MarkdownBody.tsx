"use client";

import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Blueprint-styled markdown. `**strong**` renders as the accent `.mark`
 * highlight and `*emphasis*` as upright ink-colored text, matching the
 * hand-tuned styling the About section used before markdown.
 */
export function MarkdownBody({ children }: { children: string }) {
  return (
    <div className="md-body">
      <Markdown
        remarkPlugins={[remarkGfm]}
        components={{
          strong: ({ children }) => <span className="mark">{children}</span>,
          em: ({ children }) => (
            <em style={{ fontStyle: "normal", color: "var(--ink)" }}>
              {children}
            </em>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              style={{ textDecoration: "underline", textUnderlineOffset: 3 }}
            >
              {children}
            </a>
          ),
        }}
      >
        {children}
      </Markdown>
    </div>
  );
}
