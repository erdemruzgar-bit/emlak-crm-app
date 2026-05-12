"use client";

import { useEffect, useState } from "react";
import { HelpCircle, Loader2, ExternalLink } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Sheet } from "./sheet";
import { cn } from "@/lib/utils";

interface HelpButtonProps {
  page: string;
  title?: string;
  className?: string;
}

const cache = new Map<string, string>();

export function HelpButton({ page, title, className }: HelpButtonProps) {
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState<string | null>(cache.get(page) ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || content) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setError(null);
    fetch(`/api/help/${encodeURIComponent(page)}`)
      .then(async (r) => {
        if (!r.ok) throw new Error("Yardım içeriği bulunamadı");
        return r.text();
      })
      .then((txt) => {
        cache.set(page, txt);
        setContent(txt);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [open, page, content]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Bu sayfa hakkında yardım"
        aria-label="Bu sayfa hakkında yardım"
        className={cn(
          "inline-flex items-center justify-center w-8 h-8 rounded-full text-on-surface-variant hover:bg-primary-fixed hover:text-primary transition-colors",
          className
        )}
      >
        <HelpCircle className="w-5 h-5" />
      </button>

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title={title ? `Yardım — ${title}` : "Yardım"}
        description="Bu ekran ne işe yarar, nasıl kullanılır?"
      >
        {loading && (
          <div className="flex items-center justify-center py-12 text-on-surface-variant">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        )}
        {error && (
          <div className="bg-error-container text-on-error-container rounded-xl p-4 text-sm">
            {error}
          </div>
        )}
        {content && !loading && (
          <article className="help-prose text-sm leading-relaxed text-on-surface space-y-4">
            <ReactMarkdown
              components={{
                h1: ({ children }) => (
                  <h1 className="text-xl font-black tracking-tight text-on-surface mb-2 mt-1">{children}</h1>
                ),
                h2: ({ children }) => (
                  <h2 className="text-base font-black tracking-tight text-on-surface mt-5 mb-2 pt-2 border-t border-outline-variant/20 first:border-0 first:pt-0 first:mt-0">
                    {children}
                  </h2>
                ),
                h3: ({ children }) => (
                  <h3 className="text-sm font-black tracking-tight text-on-surface mt-3 mb-1">{children}</h3>
                ),
                p: ({ children }) => <p className="leading-relaxed">{children}</p>,
                ul: ({ children }) => <ul className="list-disc pl-5 space-y-1">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal pl-5 space-y-1.5">{children}</ol>,
                li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                strong: ({ children }) => <strong className="font-bold text-on-surface">{children}</strong>,
                code: ({ children }) => (
                  <code className="px-1.5 py-0.5 rounded bg-surface-container text-primary font-mono text-xs">
                    {children}
                  </code>
                ),
                blockquote: ({ children }) => (
                  <blockquote className="border-l-4 border-primary/40 bg-primary-fixed/30 pl-3 py-2 rounded-r text-on-surface-variant italic">
                    {children}
                  </blockquote>
                ),
                a: ({ href, children }) => (
                  <a
                    href={href}
                    target={href?.startsWith("http") ? "_blank" : undefined}
                    rel={href?.startsWith("http") ? "noopener noreferrer" : undefined}
                    className="text-primary font-bold inline-flex items-center gap-1 hover:underline"
                  >
                    {children}
                    {href?.startsWith("http") && <ExternalLink className="w-3 h-3" />}
                  </a>
                ),
                table: ({ children }) => (
                  <div className="overflow-x-auto -mx-2">
                    <table className="text-xs w-full border-collapse">{children}</table>
                  </div>
                ),
                th: ({ children }) => (
                  <th className="px-2 py-1.5 text-left font-black border-b border-outline-variant/30 bg-surface-container-low">
                    {children}
                  </th>
                ),
                td: ({ children }) => (
                  <td className="px-2 py-1.5 border-b border-outline-variant/10 align-top">{children}</td>
                ),
              }}
            >
              {content}
            </ReactMarkdown>
          </article>
        )}
      </Sheet>
    </>
  );
}
