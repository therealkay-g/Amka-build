"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  Zap,
  Sparkles,
  Copy,
  Check,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Logo } from "@/components/ui/Logo";
import { CENTER_INFO } from "@/lib/constants";



export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (signInError) {
      setError("Identifiants incorrects ou compte inactif. Veuillez réessayer.");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }



  return (
    <main className="min-h-screen flex bg-background font-sans">
      {/* Left Section - Branding & Value Proposition (40%) */}
      <aside className="hidden lg:flex w-[40%] relative overflow-hidden flex-col justify-between p-12 text-white">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <img 
            src="/hospital-view.png" 
            alt="AMKA Hospital" 
            className="w-full h-full object-cover"
          />
          {/* Dark Overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-black/60 via-black/50 to-black/70"></div>
        </div>
        
        {/* Subtle dot overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_2px_2px,rgba(255,255,255,0.06)_1px,transparent_0)] bg-[size:32px_32px] opacity-70 pointer-events-none z-10"></div>

        <div className="relative z-20">
          <div className="mb-16 bg-white p-3.5 rounded-2xl w-fit shadow-lg shadow-black/30">
            <Logo size="sm" />
          </div>

          <div className="space-y-6">
            <h2 className="text-4xl lg:text-5xl font-black leading-tight tracking-tight max-w-md">
              {CENTER_INFO.name}
            </h2>
            <p className="text-lg text-white/90 leading-relaxed max-w-sm">
              Prise en charge des personnes en situation de handicap à Kindu — {CENTER_INFO.phone}
            </p>
          </div>
        </div>

        <div className="relative z-20 text-xs text-white/60">
          © 2026 {CENTER_INFO.shortName}. Tous droits réservés.
        </div>
      </aside>

      {/* Right Section - Login Form (60%) */}
      <main className="w-full lg:w-[60%] bg-background flex flex-col justify-center items-center p-6 md:p-12 overflow-y-auto">
        <div className="w-full max-w-[480px]">
          {/* Header Logo */}
          <div className="flex flex-col items-center mb-10">
            <Logo size="lg" />
          </div>

          <header className="mb-8">
            <h2 className="text-3xl font-black text-text mb-2">Bienvenue</h2>
            <p className="text-muted text-sm">
              Connectez-vous à votre espace professionnel pour continuer.
            </p>
          </header>

          <form className="space-y-5" onSubmit={onSubmit}>
            {/* Email Field */}
            <div className="space-y-2">
              <label className="block text-sm font-bold text-text" htmlFor="email">
                Adresse e-mail
              </label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-primary transition-colors" size={20} />
                <input
                  id="email"
                  className="w-full pl-12 pr-4 py-4 bg-white border-2 border-border group-focus-within:border-primary rounded-xl focus:ring-4 focus:ring-primary/10 outline-none transition-all duration-200 text-base font-semibold text-text placeholder:text-muted/50 tracking-wide"
                  placeholder="nom@amka.cd"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="block text-sm font-bold text-text" htmlFor="password">
                  Mot de passe
                </label>
                <a className="text-xs text-primary font-semibold hover:underline" href="#">
                  Mot de passe oublié ?
                </a>
              </div>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-primary transition-colors" size={20} />
                <input
                  id="password"
                  className="w-full pl-12 pr-12 py-4 bg-white border-2 border-border group-focus-within:border-primary rounded-xl focus:ring-4 focus:ring-primary/10 outline-none transition-all duration-200 text-base font-semibold text-text placeholder:text-muted/50 tracking-widest"
                  placeholder="••••••••"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted hover:text-primary transition-colors focus:outline-none"
                  onClick={() => setShowPassword(!showPassword)}
                  type="button"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  className="w-5 h-5 rounded border-border text-primary focus:ring-primary/20 cursor-pointer"
                  type="checkbox"
                />
                <span className="text-sm text-muted group-hover:text-text transition-colors">
                  Se souvenir de moi
                </span>
              </label>
            </div>

            {error && (
              <p className="bg-error/10 text-error rounded-xl px-4 py-3 text-xs font-semibold border border-error/20">
                {error}
              </p>
            )}

            {/* Submit Button */}
            <button
              disabled={loading}
              className="w-full bg-primary hover:bg-[#3839aa] text-white font-semibold py-4 rounded-xl shadow-lg shadow-primary/15 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-75 disabled:cursor-not-allowed"
              type="submit"
            >
              <span>{loading ? "Connexion en cours..." : "Se connecter"}</span>
              <ArrowRight size={18} />
            </button>
          </form>

          <footer className="mt-10 pt-6 border-t border-border/60">
            <p className="text-center text-sm text-muted">
              Nouveau membre du personnel ?{" "}
              <Link href="/register" className="font-semibold text-primary hover:underline">
                Créer un compte
              </Link>
            </p>
          </footer>
        </div>
      </main>
    </main>
  );
}
