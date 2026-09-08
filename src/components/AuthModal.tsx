import React, { useState } from 'react';
import { X, Lock, Mail, Key, ShieldCheck, AlertCircle, Sparkles, UserCheck } from 'lucide-react';
import { useInvestments } from '../context/InvestmentContext';
import { useToast } from './Toast';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { signIn, signUp } = useInvestments();
  const { showToast } = useToast();

  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);
    try {
      if (isSignUp) {
        const result = await signUp(email.trim(), password);
        if (result.error) {
          setError(result.error);
        } else {
          showToast('Account created and private portfolio secured!', 'success');
          onClose();
        }
      } else {
        const result = await signIn(email.trim(), password);
        if (result.error) {
          setError(result.error);
        } else {
          showToast('Welcome back! Private portfolio unlocked.', 'success');
          onClose();
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-fade-in">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden animate-slide-up">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-brand-500/10 border border-brand-500/30 flex items-center justify-center text-brand-400">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                {isSignUp ? 'Create Private Account' : 'Sign In to Your Portfolio'}
              </h2>
              <p className="text-xs text-slate-400">
                Encrypted with Supabase Row Level Security
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Toggle */}
        <div className="grid grid-cols-2 p-1.5 m-6 mb-4 rounded-xl bg-slate-950 border border-slate-800">
          <button
            type="button"
            onClick={() => { setIsSignUp(false); setError(null); }}
            className={`py-2 text-xs font-semibold rounded-lg transition-colors ${
              !isSignUp ? 'bg-brand-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setIsSignUp(true); setError(null); }}
            className={`py-2 text-xs font-semibold rounded-lg transition-colors ${
              isSignUp ? 'bg-brand-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-4">
          
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2 text-xs text-rose-300">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-10 pr-3.5 py-2.5 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500 transition-colors"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Password</label>
            <div className="relative">
              <Key className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-10 pr-3.5 py-2.5 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500 transition-colors"
              />
            </div>
          </div>

          {/* Data preservation notice */}
          <div className="p-3 rounded-xl bg-brand-500/10 border border-brand-500/20 text-xs text-brand-300 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-brand-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong>Zero Data Loss Guarantee:</strong> Any investments already created will be automatically linked and preserved under your private account upon signing in.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold bg-gradient-to-r from-brand-500 to-emerald-500 text-slate-950 hover:from-brand-600 hover:to-emerald-600 shadow-lg shadow-brand-500/20 active:scale-95 transition-all disabled:opacity-50"
          >
            {isSignUp ? <Sparkles className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
            <span>{loading ? 'Processing...' : isSignUp ? 'Create My Account' : 'Sign In'}</span>
          </button>

        </form>

      </div>
    </div>
  );
};
