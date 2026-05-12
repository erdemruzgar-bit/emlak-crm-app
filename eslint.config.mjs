import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

export default [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "prisma/migrations/**",
      "stitch/**",
      "public/**",
      "next-env.d.ts",
    ],
  },
  {
    // Kural seviyelendirme kararları:
    //
    //  ERROR (deploy'u bloke eder)
    //    - react-hooks/exhaustive-deps: gerçek "eski state" / "kaybolmuş güncelleme" bug'ı
    //    - react-hooks/preserve-manual-memoization: useMemo/useCallback bozulmuş
    //    - react-hooks/purity: render'da yan etki — runtime bug riski
    //
    //  WARN (raporlanır, deploy'u durdurmaz)
    //    - react-hooks/set-state-in-effect: çoğu zaman meşru state-sync (route change drawer kapat,
    //      prop değişince filter reset). React Compiler "smell" diyor ama runtime doğru.
    //    - react-hooks/immutability: "Cannot access before declared" çoğu false positive
    //      (function hoisting); "value cannot be modified" gerçekten önemli ama mevcut
    //      kullanımlar düşük etkili (regex.lastIndex vb.)
    //    - @next/next/no-img-element: performans iyileştirmesi, runtime sorun değil
    //    - @typescript-eslint/no-unused-vars: temizlik
    //    - react/no-unescaped-entities: tipografi
    //    - @next/next/no-page-custom-font: performans
    //    - import/no-anonymous-default-export: stil
    //    - @typescript-eslint/no-unused-expressions: rare
    //
    // Kural ad listesi için: https://github.com/vercel/next.js/blob/canary/packages/eslint-config-next
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/immutability": "warn",
      // <img> → <Image /> kullanımı performans iyileştirmesidir, runtime bug değil.
      // Mevcut 14 kullanım için SafeImage (src/components/ui/safe-image.tsx) helper'ı
      // mevcut; yer yer geçilir. Kural kapatıldı — yeni eklenen <img>'ler de yakalanmaz,
      // bu yüzden ekipçe code review'da dikkat edilir.
      "@next/next/no-img-element": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          // Underscore ile başlayan param/var'lar kasıtlı, uyarma (ör. _req: NextRequest)
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      // JSX text içinde Türkçe apostrof (örn. "PDF'i", "Excel'e") — runtime sorun yok,
      // sadece W3C HTML strictness uyarısı. Türkçe içerik için pratik değil, kapatıldı.
      "react/no-unescaped-entities": "off",
      // Google Fonts inline <link> — Next.js next/font/google'a geçişi öneriyor.
      // Mevcut kullanım çalışıyor; refactor sırada değil. Kapatıldı, ileride next/font'a geçilir.
      "@next/next/no-page-custom-font": "off",
      // ESLint config dosyasında anonim default export — eslint kendini analiz ederken
      // bu kuralı tetikliyor, sadece eslint.config.mjs'in kendisinde. Kapatıldı.
      "import/no-anonymous-default-export": "off",
      "@typescript-eslint/no-unused-expressions": "warn",
    },
  },
];
