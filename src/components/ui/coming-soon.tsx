"use client";

import { motion } from "motion/react";
import { Sparkles, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export interface PlannedFeature {
  title: string;
  description: string;
}

interface ComingSoonPageProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
  description: string;
  plannedFeatures: PlannedFeature[];
  eta?: string; // örn: "Faz 2"
  integrations?: string[]; // entegre olacağı yerler
}

export function ComingSoonPage({
  icon: Icon,
  title,
  subtitle,
  description,
  plannedFeatures,
  eta,
  integrations,
}: ComingSoonPageProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto space-y-8"
    >
      {/* Header */}
      <div className="flex items-start gap-5">
        <div className="w-16 h-16 primary-gradient rounded-2xl flex items-center justify-center text-white shadow-lg shadow-primary/10 shrink-0">
          <Icon className="w-8 h-8" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl font-black tracking-tighter text-on-surface">{title}</h1>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-tertiary-fixed text-tertiary text-xs font-black rounded-full uppercase tracking-wider">
              <Sparkles className="w-3 h-3" />
              Yakında
            </span>
            {eta && (
              <span className="px-3 py-1 bg-surface-container-low text-on-surface-variant text-xs font-bold rounded-full">
                {eta}
              </span>
            )}
          </div>
          <p className="text-sm text-on-surface-variant font-medium mt-2">{subtitle}</p>
        </div>
      </div>

      {/* Description */}
      <div className="bg-surface-container-lowest rounded-3xl p-8 shadow-[0_12px_32px_rgba(25,28,30,0.06)] border border-outline-variant/10">
        <p className="text-base text-on-surface leading-relaxed">{description}</p>
      </div>

      {/* Planlanan Özellikler */}
      <div className="bg-surface-container-lowest rounded-3xl p-8 shadow-[0_12px_32px_rgba(25,28,30,0.06)] border border-outline-variant/10">
        <h2 className="text-lg font-bold text-on-surface mb-6 tracking-tight">Planlanan Özellikler</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {plannedFeatures.map((f) => (
            <div key={f.title} className="flex items-start gap-3 p-4 bg-surface-container-low rounded-2xl">
              <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-bold text-on-surface">{f.title}</h3>
                <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">{f.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Entegrasyonlar */}
      {integrations && integrations.length > 0 && (
        <div className="bg-surface-container-lowest rounded-3xl p-8 shadow-[0_12px_32px_rgba(25,28,30,0.06)] border border-outline-variant/10">
          <h2 className="text-lg font-bold text-on-surface mb-4 tracking-tight">Planlanan Entegrasyonlar</h2>
          <div className="flex flex-wrap gap-2">
            {integrations.map((i) => (
              <span key={i} className="px-4 py-2 bg-primary-fixed text-primary text-sm font-bold rounded-xl">
                {i}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Geri dön */}
      <div className="flex justify-center pt-4">
        <Link href="/dashboard"
          className="text-sm font-bold text-on-surface-variant hover:text-primary transition-colors">
          ← Panele Dön
        </Link>
      </div>
    </motion.div>
  );
}
