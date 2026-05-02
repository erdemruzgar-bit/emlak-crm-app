"use client";

import { motion } from "motion/react";
import { Download, Eye, BookOpen, Zap, Presentation, Mail, FileText } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface DocCard {
  slug: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  pdfPath: string;
  pages: string;
  tone: "primary" | "tertiary" | "secondary";
}

const DOCS: DocCard[] = [
  {
    slug: "hizli-baslangic",
    title: "Hızlı Başlangıç",
    description:
      "Sisteme yeni başlayanlar için 1-2 sayfalık özet. Roller, 7 temel akış, KVKK kuralı, sık sorulan.",
    icon: Zap,
    pdfPath: "/docs/ART-CRM-Hizli-Baslangic.pdf",
    pages: "~3 sayfa",
    tone: "primary",
  },
  {
    slug: "kullanim-kilavuzu",
    title: "Detaylı Kullanım Kılavuzu",
    description:
      "Her modülü, butonu ve akışı adım adım açıklayan tam referans. Müşteri, ilan, sözleşme, finans, KVKK, kullanıcı yönetimi.",
    icon: BookOpen,
    pdfPath: "/docs/ART-CRM-Kullanim-Kilavuzu.pdf",
    pages: "~17 bölüm",
    tone: "tertiary",
  },
  {
    slug: "sunum",
    title: "Ürün Sunumu",
    description:
      "Sistemin yetenek özetini, demo akışını ve teknoloji altyapısını içeren satış/tanıtım dokümanı.",
    icon: Presentation,
    pdfPath: "/docs/ART-CRM-Sunum.pdf",
    pages: "~16 bölüm",
    tone: "secondary",
  },
];

const toneStyles: Record<DocCard["tone"], { bg: string; text: string }> = {
  primary: { bg: "bg-primary-fixed", text: "text-primary" },
  tertiary: { bg: "bg-tertiary-fixed", text: "text-tertiary" },
  secondary: { bg: "bg-secondary-container", text: "text-on-secondary-container" },
};

export default function YardimPage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 max-w-5xl"
    >
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-primary-fixed flex items-center justify-center text-primary">
          <BookOpen className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-3xl font-black tracking-tighter text-on-surface">
            Yardım & Kullanım Kılavuzu
          </h1>
          <p className="text-sm text-on-surface-variant">
            ART CRM dokümanları — çevrimiçi okuyun veya PDF olarak indirin
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {DOCS.map((doc) => {
          const Icon = doc.icon;
          const tone = toneStyles[doc.tone];
          return (
            <div
              key={doc.slug}
              className="bg-surface-container-lowest rounded-3xl shadow-[0_12px_32px_rgba(25,28,30,0.06)] p-6 border border-outline-variant/10 flex flex-col gap-4"
            >
              <div
                className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center",
                  tone.bg,
                  tone.text
                )}
              >
                <Icon className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-base font-black text-on-surface">{doc.title}</h3>
                  <span className="text-[10px] px-2 py-0.5 bg-surface-container rounded-full text-on-surface-variant font-bold">
                    {doc.pages}
                  </span>
                </div>
                <p className="text-sm text-on-surface-variant leading-relaxed">
                  {doc.description}
                </p>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <Link
                  href={`/yardim/${doc.slug}`}
                  className="flex-1 px-3 py-2.5 rounded-xl text-sm font-bold bg-surface-container-low text-on-surface hover:bg-surface-container transition-all flex items-center justify-center gap-2"
                >
                  <Eye className="w-4 h-4" />
                  Çevrimiçi Oku
                </Link>
                <a
                  href={doc.pdfPath}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 px-3 py-2.5 rounded-xl text-sm font-bold primary-gradient text-white shadow-lg shadow-primary/10 hover:opacity-90 transition-all flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  PDF İndir
                </a>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-surface-container-lowest rounded-3xl border border-outline-variant/10 p-6">
        <h3 className="text-sm font-bold text-on-surface mb-3 flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary" />
          Diğer Kaynaklar
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <Link
            href="/yardim/kvkk-erisim"
            className="p-3 rounded-xl bg-surface-container-low hover:bg-surface-container transition-all"
          >
            <p className="font-bold text-on-surface">KVKK Hassas Veri Erişimi</p>
            <p className="text-xs text-on-surface-variant mt-0.5">
              Telefon/e-posta/TC maskeleme, gerekçe modalı, sonuç notu
            </p>
          </Link>
          <a
            href="mailto:destek@artinvertsment.com"
            className="p-3 rounded-xl bg-surface-container-low hover:bg-surface-container transition-all flex items-start gap-3"
          >
            <Mail className="w-4 h-4 text-primary mt-0.5" />
            <div>
              <p className="font-bold text-on-surface">Destek</p>
              <p className="text-xs text-on-surface-variant mt-0.5">
                destek@artinvertsment.com
              </p>
            </div>
          </a>
        </div>
      </div>
    </motion.div>
  );
}
