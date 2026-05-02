import fs from "node:fs/promises";
import path from "node:path";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Download } from "lucide-react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

interface DocConfig {
  title: string;
  mdFile: string;
  pdfPath: string;
}

const DOCS: Record<string, DocConfig> = {
  "hizli-baslangic": {
    title: "Hızlı Başlangıç",
    mdFile: "KULLANIM-OZET.md",
    pdfPath: "/docs/ART-CRM-Hizli-Baslangic.pdf",
  },
  "kullanim-kilavuzu": {
    title: "Detaylı Kullanım Kılavuzu",
    mdFile: "KULLANIM.md",
    pdfPath: "/docs/ART-CRM-Kullanim-Kilavuzu.pdf",
  },
  sunum: {
    title: "Ürün Sunumu",
    mdFile: "SUNUM.md",
    pdfPath: "/docs/ART-CRM-Sunum.pdf",
  },
  "kvkk-erisim": {
    title: "KVKK Hassas Veri Erişimi",
    mdFile: "docs/KVKK-Hassas-Veri-Erisimi.md",
    pdfPath: "",
  },
};

const components: Components = {
  h1: ({ children }) => (
    <h1 className="text-3xl font-black tracking-tighter text-on-surface mt-8 mb-4 first:mt-0">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-xl font-black tracking-tight text-on-surface mt-10 mb-3 pb-2 border-b border-outline-variant/20">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-base font-bold text-on-surface mt-6 mb-2">{children}</h3>
  ),
  p: ({ children }) => (
    <p className="text-sm text-on-surface leading-relaxed my-3">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="list-disc pl-6 my-3 space-y-1.5 text-sm text-on-surface">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal pl-6 my-3 space-y-1.5 text-sm text-on-surface">{children}</ol>
  ),
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  strong: ({ children }) => <strong className="font-bold text-on-surface">{children}</strong>,
  a: ({ href, children }) => (
    <a
      href={href}
      className="text-primary hover:underline"
      target={href?.startsWith("http") ? "_blank" : undefined}
      rel={href?.startsWith("http") ? "noopener noreferrer" : undefined}
    >
      {children}
    </a>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-4 border-primary bg-primary-fixed/30 py-2 px-4 my-4 rounded-r-lg text-sm text-on-surface">
      {children}
    </blockquote>
  ),
  code: ({ children, className }) => {
    const isBlock = className && className.startsWith("language-");
    if (isBlock) {
      return (
        <pre className="bg-surface-container-low rounded-xl p-4 my-4 overflow-x-auto">
          <code className="text-xs font-mono text-on-surface">{children}</code>
        </pre>
      );
    }
    return (
      <code className="bg-surface-container px-1.5 py-0.5 rounded text-xs font-mono text-primary">
        {children}
      </code>
    );
  },
  table: ({ children }) => (
    <div className="overflow-x-auto my-4">
      <table className="min-w-full text-sm border-collapse">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-surface-container-low">{children}</thead>,
  th: ({ children }) => (
    <th className="text-left p-3 font-bold text-on-surface text-xs uppercase tracking-wider">{children}</th>
  ),
  td: ({ children }) => (
    <td className="p-3 border-t border-outline-variant/10 text-on-surface">{children}</td>
  ),
  hr: () => <hr className="my-8 border-outline-variant/20" />,
  img: ({ src, alt }) => (
    <span className="block my-4 p-4 bg-surface-container-low rounded-xl text-xs text-on-surface-variant text-center italic">
      📷 {alt || "Ekran görüntüsü"}{" "}
      {src && <span className="opacity-60">({String(src).split("/").pop()})</span>}
    </span>
  ),
};

export default async function YardimDocPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const doc = DOCS[slug];
  if (!doc) notFound();

  const filePath = path.join(process.cwd(), doc.mdFile);
  let content: string;
  try {
    content = await fs.readFile(filePath, "utf-8");
  } catch {
    notFound();
  }

  // YAML frontmatter (--- ile başlar) varsa kaldır
  content = content.replace(/^---\n[\s\S]*?\n---\n/, "");

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <Link
          href="/yardim"
          className="flex items-center gap-2 text-sm text-on-surface-variant hover:text-on-surface transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          Tüm Dokümanlar
        </Link>
        {doc.pdfPath && (
          <a
            href={doc.pdfPath}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 rounded-xl text-sm font-bold primary-gradient text-white shadow-lg shadow-primary/10 hover:opacity-90 transition-all flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            PDF İndir
          </a>
        )}
      </div>

      <article className="bg-surface-container-lowest rounded-3xl shadow-[0_12px_32px_rgba(25,28,30,0.06)] p-8 md:p-10 border border-outline-variant/10">
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
          {content}
        </ReactMarkdown>
      </article>
    </div>
  );
}
