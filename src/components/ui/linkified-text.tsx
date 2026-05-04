import { Fragment } from "react";
import { cn } from "@/lib/utils";

/**
 * Düz metin içindeki URL'leri otomatik tıklanabilir link'e dönüştürür.
 *
 * Desteklenen örnekler:
 *   https://drive.google.com/file/...
 *   http://example.com
 *   www.foo.com
 *
 * Güvenlik:
 *   - rel="noopener noreferrer" + target="_blank"
 *   - Link metni kullanıcıdan gelir, dangerouslySetInnerHTML kullanılmaz
 *
 * Çoklu satır (\n) destekli — whitespace-pre-line ile birlikte kullan.
 */

// http(s):// veya www. ile başlayan URL'ler. Sondaki noktalama işaretlerini
// match'e dahil etme (yan etkilerden kaçınmak için).
const URL_REGEX =
  /\b((?:https?:\/\/|www\.)[^\s<]+[^\s<.,;!?'")\]])/gi;

export function LinkifiedText({
  text,
  className,
}: {
  text: string | null | undefined;
  className?: string;
}) {
  if (!text) return null;

  // Çok kısa metin veya hiç URL yoksa direkt yazdır
  if (!URL_REGEX.test(text)) {
    URL_REGEX.lastIndex = 0;
    return <span className={cn("whitespace-pre-line", className)}>{text}</span>;
  }
  URL_REGEX.lastIndex = 0;

  const parts: Array<{ kind: "text" | "url"; value: string }> = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = URL_REGEX.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ kind: "text", value: text.slice(lastIndex, match.index) });
    }
    parts.push({ kind: "url", value: match[0] });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    parts.push({ kind: "text", value: text.slice(lastIndex) });
  }

  return (
    <span className={cn("whitespace-pre-line", className)}>
      {parts.map((p, i) =>
        p.kind === "url" ? (
          <a
            key={i}
            href={p.value.startsWith("http") ? p.value : `https://${p.value}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline break-all font-medium"
          >
            {p.value}
          </a>
        ) : (
          <Fragment key={i}>{p.value}</Fragment>
        )
      )}
    </span>
  );
}
