import React, { useState, useEffect } from 'react';
import { Mail, Lock, User as UserIcon, ArrowRight, ShieldCheck, Sparkles, Chrome, Github, Disc, CircleDot, Info, KeyRound } from 'lucide-react';
import FalconLogo from './FalconLogo';

interface AuthModalProps {
  onSuccess: (user: any) => void;
  onClose?: () => void;
}

export default function AuthModal({ onSuccess, onClose }: AuthModalProps) {
  // Mode selection & view trackers
  const [isLogin, setIsLogin] = useState(true);
  const [forgotMode, setForgotMode] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [otpStep, setOtpStep] = useState(false);
  const [resetPasswordMode, setResetPasswordMode] = useState(false);

  // Core Form inputs
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [antiBotAnswer, setAntiBotAnswer] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // Status metrics
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [simulatedOtpHint, setSimulatedOtpHint] = useState('');
  const [simulatedResetToken, setSimulatedResetToken] = useState('');

  // Password strength computation
  const getPasswordStrength = (pass: string) => {
    if (!pass) return { label: 'EMPTY', color: 'bg-white/10 text-gray-400', percent: 0 };
    let score = 0;
    if (pass.length >= 8) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[a-z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[@$!%*?&]/.test(pass)) score++;

    if (score <= 2) return { label: 'WEAK', color: 'bg-rose-500/80 text-rose-100', percent: 30 };
    if (score <= 4) return { label: 'MEDIUM', color: 'bg-amber-500/80 text-amber-100', percent: 65 };
    return { label: 'STRONGLY ENCRYPTED', color: 'bg-emerald-500/80 text-emerald-100', percent: 100 };
  };

  const strength = getPasswordStrength(password);

  // Register & Login Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!isLogin) {
      if (password !== confirmPassword) {
        setError("Secret Key credentials do not match.");
        return;
      }
      if (!agreeTerms) {
        setError("You must agree to Falcon terms and safety protocols before synthesis.");
        return;
      }
    }

    setLoading(true);

    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
    
    // Support Username/Email login or full registers
    const payload = isLogin 
      ? { emailOrUsername: email, password, rememberMe } 
      : { name, username, email, password, confirmPassword, agreeTerms, antiBotAnswer };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const responseText = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(responseText);
      } catch (parseErr) {
        throw new Error(`Connection established, but server configuration issue returned: "${responseText.substring(0, 80)}..."`);
      }

      if (!res.ok) {
        throw new Error(data.error || 'Identity access handler rejected credentials.');
      }

      if (!isLogin && data.otpRequired) {
        // Switch to OTP verify mode
        setOtpStep(true);
        setSimulatedOtpHint(data.otpCode);
        setSuccess("Handshake registered! Simulating OTP dispatch.");
        return;
      }

      setSuccess(data.message || 'Falcon access confirmed!');
      
      // Store local credentials
      localStorage.setItem('falcon_token', data.token);
      localStorage.setItem('falcon_user', JSON.stringify(data.user));

      setTimeout(() => {
        onSuccess(data.user);
      }, 900);

    } catch (err: any) {
      setError(err.message || 'Connecting to secure AI authentication system failed.');
    } finally {
      setLoading(false);
    }
  };

  // Simulated OTP confirmation logic
  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otpCode: otpInput })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Now auto-sign in to retrieve the token
      const loginRes = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailOrUsername: email, password })
      });
      const loginData = await loginRes.json();
      if (!loginRes.ok) throw new Error(loginData.error);

      setSuccess("Identity confirmed! Loading workspace...");
      localStorage.setItem('falcon_token', loginData.token);
      localStorage.setItem('falcon_user', JSON.stringify(loginData.user));

      setTimeout(() => {
        onSuccess(loginData.user);
      }, 900);

    } catch (err: any) {
      setError(err.message || "OTP check failed.");
    } finally {
      setLoading(false);
    }
  };

  // Simulated Forgot Password Handshake Link
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Please provide your registered email identifier first.');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setResetSent(true);
      if (data.resetToken) {
        setSimulatedResetToken(data.resetToken);
      }
    } catch (err: any) {
      setError(err.message || 'ForgotPassword handshake failed.');
    } finally {
      setLoading(false);
    }
  };

  // Real Password Rewrite Callback
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resetToken, newPassword })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSuccess("Secret Password rewrite complete! Redirecting to Log In.");
      setTimeout(() => {
        setForgotMode(false);
        setResetPasswordMode(false);
        setResetSent(false);
        setSuccess('');
      }, 1500);
    } catch (err: any) {
      setError(err.message || "Reset request failed.");
    } finally {
      setLoading(false);
    }
  };

  // Elegant Social Continue handshakes
  const handleSocialAuth = async (provider: 'google' | 'github' | 'discord') => {
    setError('');
    setLoading(true);
    
    // Setup high identity mock coordinates to sync dynamically with backend Node API
    const profiles: Record<string, { email: string; name: string; avatar: string }> = {
      google: {
        email: 'ojassoni_partner@gmail.com',
        name: 'Ojas Creator Partner',
        avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?q=80&w=150&auto=format&fit=crop'
      },
      github: {
        email: 'awaneesh_contributor@github.com',
         name: 'Ojas Soni Developer',
         avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=150&auto=format&fit=crop'
      },
      discord: {
        email: 'falcon_enthusiast@discord.com',
        name: 'Falcon AI Envoy',
        avatar: 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?q=80&w=150&auto=format&fit=crop'
      }
    };

    const selected = profiles[provider];

    try {
      const res = await fetch('/api/auth/social', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: selected.email,
          name: selected.name,
          provider,
          avatar: selected.avatar
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSuccess(`Handshake connected & linked via ${provider.toUpperCase()}!`);
      localStorage.setItem('falcon_token', data.token);
      localStorage.setItem('falcon_user', JSON.stringify(data.user));

      setTimeout(() => {
        onSuccess(data.user);
        setLoading(false);
      }, 900);

    } catch (err: any) {
      setError(err.message || "Social identity syncing errored out.");
      setLoading(false);
    }
  };

  return (
    <div id="auth-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-2xl">
      {/* Cinematic Glowing Slates */}
      <div className="absolute top-[20%] left-[25%] w-[330px] h-[330px] bg-cyan-500/10 rounded-full blur-[110px] pointer-events-none animate-pulse-slow"></div>
      <div className="absolute bottom-[20%] right-[25%] w-[380px] h-[380px] bg-purple-500/15 rounded-full blur-[130px] pointer-events-none"></div>

      <div 
        id="auth-container" 
        className="w-full max-w-lg relative overflow-hidden rounded-3xl glass-panel text-white p-8 border border-cyan-400/20 shadow-[0_0_50px_rgba(34,211,238,0.15)] bg-[#040409]/80 max-h-[90vh] overflow-y-auto custom-scrollbar"
      >
        {/* Dynamic Neon Head Bar */}
        <div id="auth-neon-strip" className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-cyan-400 via-indigo-500 to-purple-500"></div>

        {/* Master Header Block */}
        <div className="text-center mb-6 relative">
          <div className="inline-flex items-center gap-2.5 justify-center px-4 py-2 rounded-2xl bg-[#0e1017]/90 border border-white/5 mb-5 scale-100 hover:scale-[1.03] transition-transform duration-500">
            <FalconLogo className="w-5 h-5 text-cyan-400 filter drop-shadow-[0_0_6px_rgba(34,211,238,0.5)]" />
            <span className="text-xs font-black tracking-[0.2em] bg-gradient-to-r from-white via-cyan-100 to-indigo-300 bg-clip-text text-transparent select-none uppercase font-display">
              FALCON SECURE ID
            </span>
          </div>

          <h2 className="text-2xl font-black tracking-tight bg-gradient-to-b from-white to-gray-400 bg-clip-text text-transparent font-display uppercase">
            {otpStep 
              ? 'Multi-Factor Sync' 
              : resetPasswordMode 
                ? 'Rewrite Credentials'
                : forgotMode 
                  ? 'Key Restoration' 
                  : isLogin 
                    ? 'Establish Access Bridge' 
                    : 'Compile Active Node'}
          </h2>
          
          <p className="text-[10px] text-gray-500 mt-2 font-mono uppercase tracking-widest font-bold">
            {otpStep 
              ? 'Security check: Identity confirmation digits' 
              : resetPasswordMode 
                ? 'Securing memory matrix configurations'
                : forgotMode 
                  ? 'Zero-knowledge cryptographical restore' 
                  : isLogin 
                    ? 'Sleek premium interface engineered by OJAS SONI' 
                    : 'Synthesize standard client or admin vectors'}
          </p>
        </div>

        {/* Info alerts */}
        {success && (
          <div id="auth-success-banner" className="mb-5 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[11px] text-center font-mono tracking-wide flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400 animate-spin" />
            <span>{success}</span>
          </div>
        )}

        {error && (
          <div id="auth-error-banner" className="mb-5 p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/25 text-rose-300 text-[11px] font-mono tracking-wide">
            ⚠️ {error}
          </div>
        )}

        {/* 1. OTP MULTI-FACTOR VERIFICATION SCREEN */}
        {otpStep ? (
          <form onSubmit={handleVerifyOTP} className="space-y-5 font-mono">
            <div>
              <p className="text-xs text-gray-400 font-sans leading-relaxed mb-4 text-center">
                A simulated verification code has been dispatched to <strong className="text-cyan-300">{email}</strong>. Please confirm the security digits below to boot.
              </p>
              
              <div className="space-y-1.5">
                <label className="block text-[9px] text-gray-400 uppercase tracking-widest font-bold">Verification OTP Key</label>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-400" />
                  <input
                    type="text"
                    required
                    maxLength={6}
                    id="otp-input"
                    value={otpInput}
                    onChange={(e) => setOtpInput(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="Enter 6-digit pin code"
                    className="w-full pl-11 pr-4 py-3.5 rounded-xl glass-input outline-none text-xs font-mono font-bold text-center tracking-[0.2em] text-cyan-200"
                  />
                </div>
              </div>
            </div>

            {simulatedOtpHint && (
              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 font-sans space-y-1">
                <span className="text-[10px] text-gray-500 font-mono uppercase tracking-widest block font-bold">💡 Dev Sandbox Simulated OTP Email Header</span>
                <p className="text-xs text-cyan-300/90 leading-normal flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>Your verification dispatch code key is strictly: <strong className="bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-400/20 font-mono text-white text-sm">{simulatedOtpHint}</strong></span>
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-xl font-bold text-xs uppercase text-black select-none transition-all duration-300 transform bg-cyan-400 hover:bg-white cursor-pointer tracking-widest shadow-[0_0_20px_rgba(34,211,238,0.25)] flex items-center justify-center gap-2"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin"></span>
              ) : (
                <>
                  <span>Handshake OTP code</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="text-center font-sans mt-3">
              <button
                type="button"
                onClick={() => { setOtpStep(false); setError(''); setSuccess(''); }}
                className="text-[10px] text-gray-500 hover:text-white uppercase transition-colors tracking-widest"
              >
                Back to registration details
              </button>
            </div>
          </form>
        ) : resetPasswordMode ? (
          /* 2. PASSWORD RESET SUBSTANCE WRITE WINDOW */
          <form onSubmit={handleResetPassword} className="space-y-4 font-mono">
            <div className="space-y-1.5">
              <label className="block text-[9px] text-gray-400 uppercase tracking-widest font-bold">Token Key Coordinate</label>
              <input
                type="text"
                required
                value={resetToken}
                onChange={(e) => setResetToken(e.target.value)}
                placeholder="Paste generated tokens here"
                className="w-full px-4 py-3 rounded-xl glass-input outline-none text-xs text-cyan-300"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[9px] text-gray-400 uppercase tracking-widest font-bold">New Super Password</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimal 8 chars with uppercase, symbols"
                className="w-full px-4 py-3 rounded-xl glass-input outline-none text-xs text-glow"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-xl font-black text-xs uppercase text-black select-none transition-all duration-300 transform bg-indigo-400 hover:bg-white cursor-pointer tracking-widest shadow-[0_0_20px_rgba(99,102,241,0.25)]"
            >
              {loading ? 'WRITING CRITERIA...' : 'REWRITE PASSWORD PASSWORD'}
            </button>

            <div className="text-center font-sans mt-3">
              <button
                type="button"
                onClick={() => { setResetPasswordMode(false); setForgotMode(false); }}
                className="text-[10px] text-gray-500 hover:text-white uppercase tracking-widest"
              >
                Cancel and back to login
              </button>
            </div>
          </form>
        ) : forgotMode ? (
          /* 3. FORGOT PASSWORD HANDSHAKE KEY GENERATOR */
          resetSent ? (
            <div id="reset-success-box" className="text-center py-6">
              <ShieldCheck className="w-16 h-16 mx-auto text-cyan-400 mb-4 filter drop-shadow-[0_0_10px_rgba(34,211,238,0.5)] animate-pulse" />
              <h3 className="text-lg font-bold mb-2 text-cyan-200 uppercase font-display">Handshake resetting matrix key synthesized</h3>
              
              <p className="text-xs text-gray-400 leading-relaxed font-sans mb-5">
                A secure login password recovery key has been dispatched to <strong className="text-gray-100">{email}</strong> in this testing sandbox environment.
              </p>

              {simulatedResetToken && (
                <div className="mb-6 p-4 rounded-2xl bg-indigo-950/20 border border-indigo-400/20 text-left space-y-2">
                  <span className="text-[10px] text-indigo-400 uppercase tracking-widest block font-bold font-mono">🔑 Simulated Restoring Key Generated</span>
                  <p className="text-xs text-gray-300 font-sans leading-relaxed">
                    Copy this token key and apply it below to finish password restoration:
                  </p>
                  <p className="font-mono bg-[#030307] p-2.5 rounded-xl border border-white/5 select-all text-sm text-center text-white font-bold tracking-wider">
                    {simulatedResetToken}
                  </p>
                </div>
              )}

              <div className="space-y-3 font-mono">
                <button
                  onClick={() => { setResetPasswordMode(true); }}
                  className="w-full py-3.5 rounded-xl font-bold text-xs uppercase text-black select-none transition-all duration-300 bg-cyan-300 hover:bg-white tracking-widest shadow-[0_0_15px_rgba(34,211,238,0.25)] cursor-pointer"
                >
                  Write New Password
                </button>
                
                <button
                  type="button"
                  onClick={() => { setForgotMode(false); setResetSent(false); }}
                  className="text-[10px] text-cyan-400 hover:text-white uppercase tracking-widest hover:underline block mx-auto pt-2 cursor-pointer"
                >
                  Back to secure login
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleForgotPassword} className="space-y-4 font-mono">
              <div className="space-y-1.5">
                <label className="block text-[9px] text-gray-400 uppercase tracking-widest font-bold">Email Identifier Handle</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full pl-11 pr-4 py-3.5 rounded-xl glass-input outline-none text-xs font-sans"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 rounded-xl font-bold text-xs uppercase text-black select-none transition-all duration-300 transform bg-cyan-300 hover:bg-white cursor-pointer tracking-widest shadow-[0_0_20px_rgba(34,211,238,0.3)]"
              >
                {loading ? 'SYNTHESIZING...' : 'EMIT PASSWORD RESET KEY'}
              </button>

              <div className="text-center mt-4">
                <button
                  type="button"
                  onClick={() => setForgotMode(false)}
                  className="text-[10px] text-gray-500 hover:text-white uppercase transition-colors cursor-pointer tracking-widest"
                >
                  Cancel and sign back in
                </button>
              </div>
            </form>
          )
        ) : (
          /* 4. MAIN REGISTER / LOGIN INPUT FORM */
          <div className="space-y-5">
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Full Name field (Register only) */}
              {!isLogin && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[9px] text-gray-400 mb-1.5 uppercase tracking-widest font-mono font-bold">Full Name</label>
                    <div className="relative">
                      <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Ojas Soni"
                        className="w-full pl-11 pr-4 py-3 rounded-xl glass-input outline-none text-[11px] font-sans"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[9px] text-gray-400 mb-1.5 uppercase tracking-widest font-mono font-bold">Username Handle</label>
                    <div className="relative">
                      <CircleDot className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-400" />
                      <input
                        type="text"
                        required
                        value={username}
                        onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ''))}
                        placeholder="ojassoni"
                        className="w-full pl-11 pr-4 py-3 rounded-xl glass-input outline-none text-[11px] font-sans text-cyan-200"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Email Field */}
              <div>
                <label className="block text-[9px] text-gray-400 mb-1.5 uppercase tracking-widest font-mono font-bold">
                  {isLogin ? 'Email Handle or Custom Username' : 'Email Identifier address'}
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={isLogin ? "name@example.com or ojassoni" : "name@example.com"}
                    className="w-full pl-11 pr-4 py-3.5 rounded-xl glass-input outline-none text-xs font-sans"
                  />
                </div>
              </div>

              {/* Password credentials split fields */}
              <div className={!isLogin ? "grid grid-cols-1 sm:grid-cols-2 gap-3" : "space-y-1.5"}>
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-[9px] text-gray-400 uppercase tracking-widest font-mono font-bold">Secret Password</label>
                    {isLogin && (
                      <button
                        type="button"
                        onClick={() => { setForgotMode(true); setError(''); }}
                        className="text-[9px] text-indigo-400 hover:text-indigo-300 font-mono tracking-wider font-bold cursor-pointer"
                      >
                        FORGOT KEY?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-11 pr-4 py-3.5 rounded-xl glass-input outline-none text-xs font-sans text-glow"
                    />
                  </div>
                </div>

                {!isLogin && (
                  <div>
                    <label className="block text-[9px] text-gray-450 mb-1.5 uppercase tracking-widest font-mono font-bold pt-1.5">Confirm Secret Key</label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-455" />
                      <input
                        type="password"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-11 pr-4 py-3.5 rounded-xl glass-input outline-none text-xs font-sans text-glow"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Password strength and availability checker parameters */}
              {!isLogin && password && (
                <div className="p-3.5 rounded-2xl bg-white/[0.01] border border-white/5 space-y-1.5 font-sans">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-gray-500 uppercase tracking-widest font-mono font-bold">Credential strength rating:</span>
                    <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded ${strength.color === 'bg-rose-500/80' ? 'text-rose-100 bg-rose-500/10 border border-rose-500/20' : strength.color === 'bg-amber-500/80' ? 'text-amber-100 bg-amber-500/10 border border-amber-500/20' : 'text-emerald-100 bg-emerald-500/10 border border-emerald-500/20'}`}>
                      {strength.label}
                    </span>
                  </div>

                  <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-500 rounded-full ${strength.color}`} 
                      style={{ width: `${strength.percent}%` }}
                    ></div>
                  </div>
                  <p className="text-[9px] text-gray-500 leading-normal block">
                    Strong passwords must contain upper and lower case letters, a numerical value, and special characters. Minimum 8 characters.
                  </p>
                </div>
              )}

              {/* Humans validation check & agreement checkbox (Register only) */}
              {!isLogin && (
                <div className="space-y-3 font-sans pt-1 border-t border-white/5">
                  <div className="grid grid-cols-1 gap-2.5">
                    <label className="block text-[10px] text-gray-450 uppercase tracking-widest font-mono font-bold text-left">
                      🤖 Identity firewall: Solve Mathematical Sum of Vectors: 7 + 4 = ?
                    </label>
                    <input
                      type="number"
                      required
                      placeholder="Verify you are human by calculating 7+4"
                      value={antiBotAnswer}
                      onChange={(e) => setAntiBotAnswer(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl glass-input outline-none text-xs font-mono font-bold text-cyan-300 border border-cyan-400/10 focus:border-cyan-405/30 text-center"
                    />
                  </div>

                  <div className="flex items-start gap-2.5 pt-2">
                    <input
                      type="checkbox"
                      id="terms-checkbox"
                      checked={agreeTerms}
                      onChange={(e) => setAgreeTerms(e.target.checked)}
                      className="mt-0.5 border border-white/20 rounded bg-white/5 hover:bg-white/10"
                    />
                    <label htmlFor="terms-checkbox" className="text-[10px] text-gray-400 leading-snug cursor-pointer select-none">
                      I authorize synchronization of my credential vectors and agree to the <strong className="text-gray-200">End-User Security Handshake Terms & Regulations</strong>.
                    </label>
                  </div>
                </div>
              )}

              {/* Keep session saved toggles (Login only) */}
              {isLogin && (
                <div className="flex items-center justify-between font-sans pt-1">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="remember-checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="border border-white/20 bg-white/5 rounded cursor-pointer"
                    />
                    <label htmlFor="remember-checkbox" className="text-[10px] text-gray-450 select-none cursor-pointer">
                      Remember secure session
                    </label>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                id="auth-submit-btn"
                className="w-full py-4 rounded-xl font-bold text-xs text-black select-none transition-all duration-300 bg-cyan-400 hover:bg-white cursor-pointer flex items-center justify-center gap-2 font-mono uppercase tracking-widest shadow-[0_0_20px_rgba(34,211,238,0.35)]"
              >
                {loading ? (
                  <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin"></span>
                ) : (
                  <>
                    <span>{isLogin ? 'Establish Handshake' : 'Compile Active Node'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-white/5"></div>
              <span className="flex-shrink mx-4 text-[9px] text-gray-500 font-mono uppercase tracking-widest font-bold">or secure auth with</span>
              <div className="flex-grow border-t border-white/5"></div>
            </div>

            {/* Simulated but backend integrated Social handshakes */}
            <div className="grid grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => handleSocialAuth('google')}
                className="flex items-center justify-center gap-1.5 py-3 rounded-xl bg-white/[0.01] border border-white/5 hover:bg-white/[0.04] text-[10px] font-mono tracking-wider text-gray-400 hover:text-white transition-all cursor-pointer hover:border-cyan-500/30"
                title="Google Handshake Auth"
              >
                <Chrome className="w-3.5 h-3.5 text-cyan-400" />
                <span>Google</span>
              </button>
              
              <button
                type="button"
                onClick={() => handleSocialAuth('github')}
                className="flex items-center justify-center gap-1.5 py-3 rounded-xl bg-white/[0.01] border border-white/5 hover:bg-white/[0.04] text-[10px] font-mono tracking-wider text-gray-400 hover:text-white transition-all cursor-pointer hover:border-indigo-500/30"
                title="GitHub Handshake Auth"
              >
                <Github className="w-3.5 h-3.5 text-indigo-400" />
                <span>GitHub</span>
              </button>

              <button
                type="button"
                onClick={() => handleSocialAuth('discord')}
                className="flex items-center justify-center gap-1.5 py-3 rounded-xl bg-white/[0.01] border border-white/5 hover:bg-white/[0.04] text-[10px] font-mono tracking-wider text-gray-400 hover:text-white transition-all cursor-pointer hover:border-purple-500/30"
                title="Discord Handshake Auth"
              >
                <Disc className="w-3.5 h-3.5 text-purple-400" />
                <span>Discord</span>
              </button>
            </div>

            {/* Switching panels link */}
            <div className="text-center pt-3 border-t border-white/5">
              <span className="text-[10px] text-gray-500 uppercase tracking-wider font-mono">
                {isLogin ? "New pilot handle credentials?" : "Enrolled credentials?"}
              </span>&nbsp;
              <button
                type="button"
                id="auth-swap-btn"
                onClick={() => { setIsLogin(!isLogin); setError(''); setSuccess(''); }}
                className="text-[10px] font-black text-cyan-400 hover:text-cyan-200 transition-colors uppercase tracking-widest font-mono cursor-pointer"
              >
                {isLogin ? 'Synthesize' : 'Access Bridge'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
