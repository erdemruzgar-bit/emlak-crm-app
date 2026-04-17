"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Home, AlertCircle, Loader2 } from "lucide-react";
import { motion } from "motion/react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("E-posta veya parola hatalı");
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface relative overflow-hidden">
      <div className="absolute top-[-200px] right-[-200px] w-[600px] h-[600px] primary-gradient rounded-full opacity-5 blur-3xl" />
      <div className="absolute bottom-[-150px] left-[-150px] w-[400px] h-[400px] bg-secondary-container rounded-full opacity-10 blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="bg-surface-container-lowest rounded-3xl shadow-2xl p-10">
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 primary-gradient rounded-2xl mb-5 shadow-lg shadow-primary/20">
              <Home className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-on-surface">
              Emlak CRM
            </h1>
            <p className="text-on-surface-variant mt-1 text-sm font-medium">
              Gayrimenkul Yönetim Sistemi
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-error-container text-on-error-container text-sm p-4 rounded-2xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2">
                E-posta
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary/20 focus:bg-surface-container-lowest outline-none transition-all text-sm"
                placeholder="ornek@emlak.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2">
                Parola
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary/20 focus:bg-surface-container-lowest outline-none transition-all text-sm"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full primary-gradient text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-primary/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 active:scale-[0.98] flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Giriş yapılıyor...
                </>
              ) : (
                "Giriş Yap"
              )}
            </button>
          </form>

          <p className="text-xs text-on-surface-variant text-center mt-8">
            Bu sisteme giriş yaparak KVKK kapsamındaki veri işleme politikamızı kabul etmiş olursunuz.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
