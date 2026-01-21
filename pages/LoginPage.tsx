import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useToast } from '../components/ui/Toast';

interface LoginPageProps {
  onLogin: () => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const { success, error: toastError } = useToast();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === 'login') {
        const { error: authError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (authError) throw authError;
        success(`Bem-vindo de volta!`);
        setTimeout(onLogin, 1000); // Delay for toast
      } else {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name: fullName,
              avatar_url: `https://ui-avatars.com/api/?name=${fullName}&background=random`
            }
          }
        });
        if (signUpError) throw signUpError;
        success('Cadastro realizado! Verifique seu email.');
        // Don't auto-switch used ID, user might want to read the message? 
        // Actually standard flow is to switch to login to force them to check email (often required). 
        // But for this simplified flow, let's switch.
        setMode('login');
      }
    } catch (err: any) {
      toastError(err.message || 'Ocorreu um erro.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-black font-display antialiased selection:bg-primary/30 selection:text-white">

      {/* Background Elements */}
      <div className="absolute inset-0 z-0">
        {/* Base Image with heavy dark overlay */}
        <div
          className="absolute inset-0 bg-cover bg-center opacity-20 saturate-0 mix-blend-overlay transition-all duration-[3000ms] hover:scale-105 transform-gpu"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2670&auto=format&fit=crop')" }}
        />
        {/* Animated/Static Gradients for Mood */}
        <div className="absolute inset-0 bg-gradient-to-br from-black via-black/95 to-primary/5" />

        {/* Hypnotic Orbs */}
        <div className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] bg-primary/10 rounded-full blur-[100px] mix-blend-screen opacity-20 animate-pulse-slow" style={{ animationDuration: '8s' }} />
        <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-amber-500/10 rounded-full blur-[100px] mix-blend-screen opacity-10 animate-pulse-slow" style={{ animationDuration: '10s', animationDelay: '1s' }} />
        <div className="absolute top-[40%] left-[20%] w-[400px] h-[400px] bg-white/5 rounded-full blur-[80px] mix-blend-overlay opacity-10 animate-float" style={{ animationDuration: '20s' }} />
      </div>

      {/* Main Container */}
      <div className="relative z-10 w-full max-w-[480px] p-6 animate-fade-in-up">

        {/* Glass Card */}
        <div className="glass-card relative overflow-hidden rounded-3xl border border-white/10 bg-black/60 shadow-2xl backdrop-blur-xl">

          {/* Specular Highlight on Card */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-50"></div>

          <div className="p-8 sm:p-10">

            {/* Header Section */}
            <div className="text-center mb-10">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10 shadow-[0_0_15px_rgba(255,255,255,0.05)] mb-6">
                <span className="material-symbols-outlined text-[28px] text-primary drop-shadow-sm">account_balance</span>
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-white mb-2">
                CRM <span className="text-primary">K&O</span>
              </h1>
              <p className="text-sm font-medium text-white/40 uppercase tracking-widest">Recuperação Tributária de Alta Performance</p>
            </div>

            {/* Mode Toggle (Segmented Control) */}
            <div className="mb-8 p-1 rounded-xl bg-black/40 border border-white/5 flex relative isolate">
              <div
                className={`absolute inset-y-1 rounded-lg bg-white/10 border border-white/10 shadow-sm transition-all duration-300 ease-out z-[-1] pointer-events-none ${mode === 'login' ? 'left-1 w-[calc(50%-4px)]' : 'left-[calc(50%+2px)] w-[calc(50%-4px)]'}`}
              />
              <button
                onClick={() => setMode('login')}
                className={`flex-1 py-2.5 text-sm font-bold transition-colors duration-300 ${mode === 'login' ? 'text-white' : 'text-white/40 hover:text-white/70'}`}
              >
                Login
              </button>
              <button
                onClick={() => setMode('register')}
                className={`flex-1 py-2.5 text-sm font-bold transition-colors duration-300 ${mode === 'register' ? 'text-white' : 'text-white/40 hover:text-white/70'}`}
              >
                Novo Acesso
              </button>
            </div>

            {/* Auth Form */}
            <form onSubmit={handleAuth} className="space-y-6">

              {mode === 'register' && (
                <div className="space-y-1.5 animate-fade-in">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/50 pl-1">Nome Completo</label>
                  <div className="relative group">
                    <span className="material-symbols-outlined absolute left-4 top-3.5 text-white/30 group-focus-within:text-primary transition-colors">person</span>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full h-12 rounded-xl bg-black/20 border border-white/5 pl-11 pr-4 text-sm text-white focus:border-primary/50 focus:bg-black/40 outline-none transition-all placeholder:text-white/20 hover:border-white/10"
                      placeholder="Digite seu nome"
                      required
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-white/50 pl-1">E-mail Corporativo</label>
                <div className="relative group">
                  <span className="material-symbols-outlined absolute left-4 top-3.5 text-white/30 group-focus-within:text-primary transition-colors">mail</span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full h-12 rounded-xl bg-black/20 border border-white/5 pl-11 pr-4 text-sm text-white focus:border-primary/50 focus:bg-black/40 outline-none transition-all placeholder:text-white/20 hover:border-white/10"
                    placeholder="seu@email.com"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-white/50 pl-1">Senha</label>
                <div className="relative group">
                  <span className="material-symbols-outlined absolute left-4 top-3.5 text-white/30 group-focus-within:text-primary transition-colors">lock</span>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full h-12 rounded-xl bg-black/20 border border-white/5 pl-11 pr-4 text-sm text-white focus:border-primary/50 focus:bg-black/40 outline-none transition-all placeholder:text-white/20 hover:border-white/10"
                    placeholder="••••••••"
                    required
                  />
                </div>
                {mode === 'login' && (
                  <div className="flex justify-end">
                    <a href="#" className="text-xs text-white/40 hover:text-primary transition-colors">Esqueceu a senha?</a>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="relative w-full h-14 overflow-hidden rounded-xl bg-gradient-to-r from-[#d4af37] to-[#f59e0b] shadow-[0_0_20px_rgba(212,175,55,0.3)] hover:shadow-[0_0_30px_rgba(212,175,55,0.5)] transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed group"
              >
                <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative flex items-center justify-center gap-2 text-black font-bold tracking-wide">
                  {loading ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-[20px]">sync</span>
                      <span>Autenticando...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[20px]">{mode === 'login' ? 'login' : 'verified_user'}</span>
                      <span>{mode === 'login' ? 'Acessar Plataforma' : 'Criar Conta'}</span>
                    </>
                  )}
                </div>
              </button>

            </form>
          </div>

          {/* Footer Security Badge */}
          <div className="bg-black/40 border-t border-white/5 py-4 text-center">
            <p className="text-[10px] text-white/30 flex items-center justify-center gap-1.5">
              <span className="material-symbols-outlined text-[12px] text-emerald-500">security</span>
              Ambiente criptografado e monitorado por <span className="font-bold text-white/50">K&O Security</span>
            </p>
          </div>

        </div>

        {/* Floating Background Glow Effect behind card */}
        <div className="absolute -inset-4 bg-primary/20 rounded-[40px] blur-3xl -z-10 opacity-30 animate-pulse-slow pointer-events-none"></div>

      </div>
    </div>
  );
}