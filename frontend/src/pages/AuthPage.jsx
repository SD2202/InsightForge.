import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import {
  Circle,
  Globe,
  GitBranch,
  Eye,
  EyeOff,
  ArrowRight,
  Mail,
  Lock,
  User,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { api } from '../api/client';

/* ─── Reusable Sub-Components ──────────────────────────────────────────────── */

function StepItem({ number, text, active = false }) {
  return (
    <div
      className={`flex items-center gap-3 rounded-2xl px-4 py-3 transition-all duration-300 ${
        active
          ? 'bg-white text-black border border-white'
          : 'bg-[#1A1A1A] text-white border-none'
      }`}
    >
      <span
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
          active ? 'bg-black text-white' : 'bg-white/10 text-white/40'
        }`}
      >
        {number}
      </span>
      <span className="text-sm font-medium">{text}</span>
    </div>
  );
}

function SocialButton({ icon: Icon, label }) {
  return (
    <button
      type="button"
      className="flex items-center justify-center gap-2.5 rounded-xl border border-white/10 bg-black px-4 py-3 text-sm font-medium text-white transition-all duration-200 hover:bg-white/5 active:scale-[0.97]"
    >
      <Icon size={16} strokeWidth={1.8} />
      {label}
    </button>
  );
}

function ErrorBanner({ message }) {
  if (!message) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400"
    >
      <AlertCircle size={16} className="mt-0.5 shrink-0" />
      <span>{message}</span>
    </motion.div>
  );
}

/* ─── Animation Variants ───────────────────────────────────────────────────── */

const heroContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15, delayChildren: 0.2 },
  },
};

const heroChildVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const panelVariants = {
  hidden: { opacity: 0, x: 20 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.4, ease: 'easeOut' } },
  exit: { opacity: 0, x: -20, transition: { duration: 0.25 } },
};

/* ─── Sign Up Panel ────────────────────────────────────────────────────────── */

function SignUpPanel({ onSwitchToLogin }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.username.trim() || !form.email.trim() || !form.password.trim()) {
      setError('All fields are required.');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      const data = await api.signup(form.username.trim(), form.email.trim(), form.password);
      localStorage.setItem('token', data.access_token);
      navigate('/portfolio');
    } catch (err) {
      setError(err.response?.data?.detail || 'Sign up failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      key="signup"
      variants={panelVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="w-full max-w-xl space-y-6"
    >
      {/* Header */}
      <div className="space-y-1.5">
        <h1 className="text-3xl font-medium tracking-tight text-white">
          Create New Profile
        </h1>
        <p className="text-sm text-white/40">
          Input your basic details to begin the journey.
        </p>
      </div>

      {/* Social Buttons */}
      <div className="grid grid-cols-2 gap-4">
        <SocialButton icon={Globe} label="Google" />
        <SocialButton icon={GitBranch} label="GitHub" />
      </div>

      {/* Divider */}
      <div className="relative flex items-center">
        <div className="flex-1 border-t border-white/10" />
        <span className="mx-4 bg-black px-4 text-xs font-medium text-white/40 uppercase tracking-widest">
          Or
        </span>
        <div className="flex-1 border-t border-white/10" />
      </div>

      {/* Error */}
      <ErrorBanner message={error} />

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Username */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-white">Username</label>
          <div className="relative">
            <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              name="username"
              type="text"
              value={form.username}
              onChange={handleChange}
              placeholder="johndoe"
              autoComplete="username"
              className="w-full rounded-xl bg-[#1A1A1A] border-none h-11 pl-10 pr-4 text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-white/20 transition-all duration-200"
            />
          </div>
        </div>

        {/* Email */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-white">Email</label>
          <div className="relative">
            <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder="john@example.com"
              autoComplete="email"
              className="w-full rounded-xl bg-[#1A1A1A] border-none h-11 pl-10 pr-4 text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-white/20 transition-all duration-200"
            />
          </div>
        </div>

        {/* Password */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-white">Password</label>
          <div className="relative">
            <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              name="password"
              type={showPassword ? 'text' : 'password'}
              value={form.password}
              onChange={handleChange}
              placeholder="••••••••"
              autoComplete="new-password"
              className="w-full rounded-xl bg-[#1A1A1A] border-none h-11 pl-10 pr-12 text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-white/20 transition-all duration-200"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-colors duration-200"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <p className="text-xs text-white/30 mt-0.5">
            Min 6 chars · One uppercase · One digit
          </p>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full h-14 bg-white text-black font-semibold rounded-xl hover:bg-white/90 active:scale-[0.98] transition-all duration-200 mt-4 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <>
              Create Account
              <ArrowRight size={16} strokeWidth={2.5} />
            </>
          )}
        </button>
      </form>

      {/* Footer */}
      <p className="text-center text-sm text-white/40">
        Member of the team?{' '}
        <button
          type="button"
          onClick={onSwitchToLogin}
          className="text-white font-medium hover:text-white/80 underline underline-offset-4 transition-colors"
        >
          Log in
        </button>
      </p>
    </motion.div>
  );
}

/* ─── Login Panel ──────────────────────────────────────────────────────────── */

function LoginPanel({ onSwitchToSignUp }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.username.trim() || !form.password.trim()) {
      setError('Username and password are required.');
      return;
    }

    setLoading(true);
    try {
      const data = await api.login(form.username.trim(), form.password);
      localStorage.setItem('token', data.access_token);
      navigate('/portfolio');
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(
        typeof detail === 'string' ? detail : 'Incorrect username or password.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      key="login"
      variants={panelVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="w-full max-w-xl space-y-6"
    >
      {/* Header */}
      <div className="space-y-1.5">
        <h1 className="text-3xl font-medium tracking-tight text-white">
          Welcome Back
        </h1>
        <p className="text-sm text-white/40">
          Sign in to continue your InsightForge journey.
        </p>
      </div>

      {/* Social Buttons */}
      <div className="grid grid-cols-2 gap-4">
        <SocialButton icon={Globe} label="Google" />
        <SocialButton icon={GitBranch} label="GitHub" />
      </div>

      {/* Divider */}
      <div className="relative flex items-center">
        <div className="flex-1 border-t border-white/10" />
        <span className="mx-4 bg-black px-4 text-xs font-medium text-white/40 uppercase tracking-widest">
          Or
        </span>
        <div className="flex-1 border-t border-white/10" />
      </div>

      {/* Error */}
      <ErrorBanner message={error} />

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Username */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-white">Username</label>
          <div className="relative">
            <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              name="username"
              type="text"
              value={form.username}
              onChange={handleChange}
              placeholder="johndoe"
              autoComplete="username"
              className="w-full rounded-xl bg-[#1A1A1A] border-none h-11 pl-10 pr-4 text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-white/20 transition-all duration-200"
            />
          </div>
        </div>

        {/* Password */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-white">Password</label>
            <button
              type="button"
              className="text-xs text-white/40 hover:text-white/70 transition-colors"
            >
              Forgot password?
            </button>
          </div>
          <div className="relative">
            <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              name="password"
              type={showPassword ? 'text' : 'password'}
              value={form.password}
              onChange={handleChange}
              placeholder="••••••••"
              autoComplete="current-password"
              className="w-full rounded-xl bg-[#1A1A1A] border-none h-11 pl-10 pr-12 text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-white/20 transition-all duration-200"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-colors duration-200"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full h-14 bg-white text-black font-semibold rounded-xl hover:bg-white/90 active:scale-[0.98] transition-all duration-200 mt-4 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <>
              Sign In
              <ArrowRight size={16} strokeWidth={2.5} />
            </>
          )}
        </button>
      </form>

      {/* Footer */}
      <p className="text-center text-sm text-white/40">
        New to InsightForge?{' '}
        <button
          type="button"
          onClick={onSwitchToSignUp}
          className="text-white font-medium hover:text-white/80 underline underline-offset-4 transition-colors"
        >
          Create an account
        </button>
      </p>
    </motion.div>
  );
}

/* ─── Main Auth Page ───────────────────────────────────────────────────────── */

export default function AuthPage({ defaultMode = 'login' }) {
  const [mode, setMode] = useState(defaultMode);

  const heroSteps =
    mode === 'signup'
      ? [
          { text: 'Register your identity', active: true },
          { text: 'Configure your studio', active: false },
          { text: 'Finalize your profile', active: false },
        ]
      : [
          { text: 'Verify your identity', active: true },
          { text: 'Access your studio', active: false },
          { text: 'Explore your dashboard', active: false },
        ];

  const heroTitle = mode === 'signup' ? 'Join InsightForge' : 'Back to InsightForge';
  const heroDesc =
    mode === 'signup'
      ? 'Follow these 3 quick phases to activate your space.'
      : 'Sign in to pick up exactly where you left off.';

  return (
    <main className="flex min-h-screen w-full bg-black selection:bg-white/30 p-2 transition-all duration-500 lg:h-screen lg:overflow-hidden lg:p-4">
      {/* ── Left Column: Hero ─────────────────────────────────────────────── */}
      <div className="hidden w-[52%] relative flex-col items-center justify-end pb-32 px-12 rounded-3xl overflow-hidden shadow-2xl h-full lg:flex">
        {/* Background Video */}
        <video
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source
            src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260506_081238_406ed0e3-5d83-436e-a512-0bbff7ec5b95.mp4"
            type="video/mp4"
          />
        </video>

        {/* Hero Content */}
        <motion.div
          key={mode}
          variants={heroContainerVariants}
          initial="hidden"
          animate="visible"
          className="relative z-10 w-full max-w-xs space-y-8"
        >
          {/* Brand */}
          <motion.div variants={heroChildVariants} className="flex items-center gap-2">
            <Circle size={18} fill="white" className="text-white" />
            <span className="text-xl font-semibold tracking-tight text-white">
              InsightForge
            </span>
          </motion.div>

          {/* Heading Block */}
          <motion.div variants={heroChildVariants} className="space-y-2">
            <h2 className="text-4xl font-medium tracking-tight whitespace-nowrap text-white">
              {heroTitle}
            </h2>
            <p className="text-white/60 text-sm leading-relaxed px-4">
              {heroDesc}
            </p>
          </motion.div>

          {/* Steps */}
          <motion.div variants={heroChildVariants} className="space-y-2.5">
            {heroSteps.map((step, i) => (
              <StepItem
                key={step.text}
                number={i + 1}
                text={step.text}
                active={step.active}
              />
            ))}
          </motion.div>
        </motion.div>
      </div>

      {/* ── Right Column: Form ────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center py-12 lg:py-6 px-4 sm:px-12 lg:px-16 xl:px-24 overflow-y-auto lg:overflow-hidden">
        {/* Mobile brand */}
        <div className="flex lg:hidden items-center gap-2 mb-10">
          <Circle size={18} fill="white" className="text-white" />
          <span className="text-xl font-semibold tracking-tight text-white">
            InsightForge
          </span>
        </div>

        <AnimatePresence mode="wait">
          {mode === 'signup' ? (
            <SignUpPanel key="signup" onSwitchToLogin={() => setMode('login')} />
          ) : (
            <LoginPanel key="login" onSwitchToSignUp={() => setMode('signup')} />
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
