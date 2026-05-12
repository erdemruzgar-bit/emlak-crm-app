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
// NOT: Global regex'ler lastIndex state'i taşır; bu yüzden modül seviyesinde
// reuse edilmez. matchAll() her çağrıda kendi iterator'üyle çalışır, state-leak yok.
const URL_PATTERN = "(?:https?:\\/\\/|www\\.)[^\\s<]+[^\\s<.,;!?'\")\\]]";

export function LinkifiedText({
  text,
  className,
}: {
  text: string | null | undefined;
  className?: string;
}) {
  if (!text) return null;

  // Her render'da YENİ regex — state taşımaz, immutability güvenli
  const urlRegex = new RegExp(URL_PATTERN, "gi");
  const matches = Array.from(text.matchAll(urlRegex));

  if (matches.length === 0) {
    return <span className={cn("whitespace-pre-line", className)}>{text}</span>;
  }

  const parts: Array<{ kind: "text" | "url"; value: string }> = [];
  let lastIndex = 0;
  for (const m of matches) {
    const start = m.index ?? 0;
    if (start > lastIndex) {
      parts.push({ kind: "text", value: text.slice(lastIndex, start) });
    }
    parts.push({ kind: "url", value: m[0] });
    lastIndex = start + m[0].length;
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
