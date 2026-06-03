import { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, Shield, Cpu, MessageSquare, Image as ImageIcon, Mic, Search, Code, PenTool, 
  ArrowRight, Play, Check, Users, HelpCircle, X, Terminal, Zap, Flame, Globe, Lock, Code2, PlayCircle, Eye
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import FounderSection from './FounderSection';
import FalconLogo from './FalconLogo';

interface LandingPageProps {
  onStartFree: () => void;
}

type ModelType = 'gpt' | 'gemini' | 'claude' | 'deepseek' | 'falcon';

export default function LandingPage({ onStartFree }: LandingPageProps) {
  const [isPlayingTeaser, setIsPlayingTeaser] = useState(false);
  const [activeDemoTab, setActiveDemoTab] = useState<'chat' | 'image' | 'voice'>('chat');
  const [demoInput, setDemoInput] = useState('');
  const [demoResponse, setDemoResponse] = useState('System ready. Request core logical reasoning or visual synthesis coordinates.');
  const [showBetaPopup, setShowBetaPopup] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [selectedModel, setSelectedModel] = useState<ModelType>('falcon');
  const [isCopied, setIsCopied] = useState(false);

  // Background particle controller
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; size: number; duration: number; delay: number }>>([]);

  // Mouse coordinate tracker for background radial beam follow effect
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Toast notifications state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'info' = 'info') => {
    setToast({ message, type });
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Track window scroll for glassmorphism header styling
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 30);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Track mouse movements
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setMousePos({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        });
      }
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Seed dynamic floating particles
  useEffect(() => {
    const generated = Array.from({ length: 28 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 3 + 1,
      duration: Math.random() * 20 + 10,
      delay: Math.random() * -15,
    }));
    setParticles(generated);

    const timer = setTimeout(() => {
      setShowBetaPopup(true);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  const handleDemoSubmit = (prompt: string) => {
    setDemoInput(prompt);
    setDemoResponse("Falcon AI is synthesizing cognitive matrices and streaming neural nodes...");
    setTimeout(() => {
      if (prompt.toLowerCase().includes("founder") || prompt.toLowerCase().includes("who created") || prompt.toLowerCase().includes("ojas")) {
        setDemoResponse(`Falcon AI was created and developed by OJAS SONI. It features real-time search indexing, microsecond photo-realistic image rendering, dynamic vocal interfaces, and beautiful markdown layouts to satisfy professional standards.`);
      } else if (prompt.includes("optimize")) {
        setDemoResponse(`// High-Performance Pipeline by Falcon AI
export function optimizeIntelligenceMatrix<T>(nodes: T[]): T[] {
  // Built by Falcon AI Team
  const systemScale = 1.08;
  return nodes.filter(Boolean).map(node => ({
    ...node,
    quantumFactor: systemScale * Math.SQRT2,
    activeTime: new Date().toISOString()
  }));
}`);
      } else if (prompt.includes("quantum")) {
        setDemoResponse("Falcon AI: Quantum superposition refers to physical states where multiple values exist in parallel coherence. Our cognitive models simulate multi-context parameters dynamically to yield instantaneous reasoning vectors.");
      } else {
        setDemoResponse(`Falcon AI Core: Synthesized your prompt "${prompt}" inside local sandbox. 

Welcome to the liquid glass digital command center. Select "Start Chatting" above to experience complete, interactive, high-performance live APIs!`);
      }
    }, 1200);
  };

  // Model Metadata
  const modelSpecs = {
    gpt: {
      name: 'GPT-4o Omnic',
      badge: 'Analytical Master',
      provider: 'OpenAI Integrated',
      speed: 90,
      smartness: 96,
      desc: 'Highly structured reasoning model optimized for verbose, logical instruction sets and enterprise-level complexity.',
      color: 'from-emerald-400 to-teal-500',
      glow: 'rgba(16,185,129,0.15)',
      status: 'High Load',
      rec: false
    },
    gemini: {
      name: 'Gemini 1.5 Flash',
      badge: 'Multimodal Speedster',
      provider: 'Google Native',
      speed: 98,
      smartness: 89,
      desc: 'Blazing fast, high-context comprehension engine optimized for streaming responses, image parsing, and voice integration.',
      color: 'from-blue-400 to-indigo-500',
      glow: 'rgba(59,130,246,0.15)',
      status: 'Optimal',
      rec: false
    },
    claude: {
      name: 'Claude 3.5 Sonnet',
      badge: 'Elite Writer & Coder',
      provider: 'Anthropic Core',
      speed: 85,
      smartness: 98,
      desc: 'Unrivaled literary prose generation and deep software engineering comprehension with standard-setting safety metrics.',
      color: 'from-orange-400 to-amber-500',
      glow: 'rgba(249,115,22,0.15)',
      status: 'Nominal',
      rec: true
    },
    deepseek: {
      name: 'DeepSeek R1',
      badge: 'Deep Reasoning',
      provider: 'Open-Source Cluster',
      speed: 70,
      smartness: 99,
      desc: 'Next-generation mathematical reasoning chain model trained in reinforcement libraries for unmatched complex debugging.',
      color: 'from-purple-400 to-fuchsia-500',
      glow: 'rgba(168,85,247,0.15)',
      status: 'High Load',
      rec: false
    },
    falcon: {
      name: 'Falcon-X Core (Custom)',
      badge: 'Proprietary Ultra-Spec',
      provider: 'Falcon AI Laboratories',
      speed: 100,
      smartness: 100,
      desc: 'Elite bespoke neural cortex. Fully custom synthesized to deliver lightning speed, smart grounding search, and precise code.',
      color: 'from-cyan-400 via-indigo-500 to-purple-500',
      glow: 'rgba(34,211,238,0.25)',
      status: 'Peak Hybrid',
      rec: true
    }
  };

  return (
    <div 
      ref={containerRef}
      id="landing-page" 
      className="min-h-screen relative text-gray-100 font-sans selection:bg-cyan-500/30 selection:text-cyan-200 bg-[#020205] overflow-hidden"
    >
      {/* Dynamic mouse follow radial neon glow spotlight */}
      <div 
        className="pointer-events-none absolute hidden md:block rounded-full opacity-60 transition-opacity duration-500 blur-[130px]"
        style={{
          width: '450px',
          height: '450px',
          background: `radial-gradient(circle, rgba(99,102,241,0.1) 0%, rgba(34,211,238,0.08) 50%, transparent 100%)`,
          left: `${mousePos.x - 225}px`,
          top: `${mousePos.y - 225}px`,
          zIndex: 1,
        }}
      />

      {/* Futuristic animated particle constellation */}
      <div className="absolute inset-0 pointer-events-none z-0">
        {particles.map((p) => (
          <motion.div
            key={p.id}
            className="absolute rounded-full bg-cyan-400/20"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: `${p.size}px`,
              height: `${p.size}px`,
            }}
            animate={{
              y: ['0%', '-100%', '0%'],
              opacity: [0.1, 0.7, 0.1],
            }}
            transition={{
              duration: p.duration,
              repeat: Infinity,
              delay: p.delay,
              ease: 'linear',
            }}
          />
        ))}
      </div>

      {/* FLOATING TOAST REGION */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 250 }}
            className="fixed top-6 right-6 z-[100] flex items-center gap-3 px-4 py-3 rounded-2xl glass-panel border border-cyan-500/30 bg-cyan-500/10 text-cyan-200 shadow-2xl backdrop-blur-xl"
          >
            <Sparkles className="w-4 h-4 shrink-0 text-cyan-400 animate-pulse" />
            <span className="text-xs font-mono tracking-wide">{toast.message}</span>
            <button 
              onClick={() => setToast(null)}
              className="ml-2 hover:opacity-80 p-0.5 rounded-lg text-white/40 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Animated holographic/aurora backgrounds */}
      <div className="absolute top-0 inset-x-0 h-[900px] overflow-hidden pointer-events-none">
        <div id="aurora-cyan" className="absolute -top-[200px] left-[5%] w-[650px] h-[650px] rounded-full glow-orb bg-cyan-500/10 animate-aurora-1"></div>
        <div id="aurora-purple" className="absolute -top-[150px] right-[5%] w-[650px] h-[650px] rounded-full glow-orb bg-purple-500/15 animate-aurora-2"></div>
        <div className="absolute top-[450px] left-[35%] w-[450px] h-[450px] rounded-full glow-orb bg-indigo-500/10 animate-pulse-slow"></div>
        
        {/* Futuristic subtle line grid overlay */}
        <div className="absolute inset-0 opacity-[0.06] bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:32px_32px]"></div>
      </div>

      {/* Beta popup notifier */}
      {showBetaPopup && (
        <motion.div 
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: 'spring', delay: 0.5 }}
          id="beta-sticky-popup" 
          className="fixed bottom-6 right-6 z-50 max-w-sm p-5 rounded-2xl glass-panel border border-cyan-400/30 text-white flex items-start gap-3 shadow-[0_10px_40px_rgba(6,182,212,0.15)]"
        >
          <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.4)]">
            <Sparkles className="w-5 h-5 animate-spin" />
          </div>
          <div>
            <div className="flex justify-between items-center">
              <span className="text-xs font-mono font-bold tracking-widest text-cyan-300 uppercase">Beta Access Enabled</span>
              <button 
                id="close-popup-btn" 
                onClick={() => setShowBetaPopup(false)} 
                className="text-gray-400 hover:text-white text-xs px-1 cursor-pointer transition-colors"
              >
                ✕
              </button>
            </div>
            <p className="text-[11px] text-gray-300 mt-1 leading-relaxed font-sans">
              Enjoy persistent user registration, live image rendering, search index, and audio synth. No credit cards needed during beta!
            </p>
          </div>
        </motion.div>
      )}

      {/* FLOATING GLASS STICKY NAVBAR */}
      <header 
        id="navbar" 
        className={`sticky top-0 z-40 w-full px-4 md:px-8 py-4 transition-all duration-500 ${scrolled ? 'transform translate-y-0 backdrop-blur-md' : ''}`}
      >
        <div className={`max-w-7xl mx-auto flex items-center justify-between rounded-2xl transition-all duration-300 px-6 py-3.5 border ${scrolled ? 'bg-black/80 border-cyan-400/20 shadow-[0_0_30px_rgba(34,211,238,0.1)]' : 'bg-transparent border-white/5 bg-[#0a0a14]/20'}`}>
          
          {/* Logo Brand */}
          <div className="flex items-center gap-2.5">
            <div className="relative w-10 h-10 flex items-center justify-center">
              {/* Spinning Logo Rings */}
              <div className="absolute inset-0 rounded-full border border-dashed border-cyan-400/40 animate-[spin_6s_linear_infinite]"></div>
              <FalconLogo className="w-7 h-7 text-cyan-400 filter drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]" />
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping"></span>
            </div>
            <div>
              <span className="font-bold tracking-widest text-lg bg-gradient-to-r from-white via-cyan-100 to-indigo-300 bg-clip-text text-transparent font-display uppercase">
                Falcon AI
              </span>
              <span className="text-[9px] block text-cyan-400/90 font-mono tracking-widest -mt-1 font-bold">SUPER PLATFORM</span>
            </div>
          </div>

          {/* Center Links */}
          <nav className="hidden lg:flex items-center gap-8 text-xs font-mono uppercase tracking-widest text-gray-400">
            <a href="#features" className="hover:text-cyan-300 hover:text-glow transition-all">Features</a>
            <a href="#demo" className="hover:text-cyan-300 hover:text-glow transition-all font-bold text-cyan-400">Demo Cell</a>
            <a href="#models" className="hover:text-cyan-300 hover:text-glow transition-all">Model Stack</a>
            <a href="#pricing" className="hover:text-cyan-300 hover:text-glow transition-all">Pricing Plans</a>
            <a href="#founder" className="hover:text-cyan-300 hover:text-glow transition-all">Executive Arc</a>
          </nav>

          {/* CTA Buttons */}
          <div className="flex items-center gap-1.5 sm:gap-3 font-mono">
            <button
              onClick={onStartFree}
              className="hidden sm:inline-block px-4.5 py-2 text-xs font-bold rounded-xl text-white border border-[#22d3ee]/30 bg-[#22d3ee]/5 hover:bg-[#22d3ee]/25 cursor-pointer uppercase transition-all"
            >
              Sign In
            </button>
            <button
              onClick={onStartFree}
              className="px-3.5 sm:px-4.5 py-2 text-xs font-bold rounded-xl text-black bg-cyan-400 hover:bg-white cursor-pointer uppercase font-sans animate-pulse font-extrabold tracking-wider"
            >
              Start Free
            </button>
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section id="hero" className="relative pt-12 pb-24 px-4 md:px-8 text-center z-10">
        <div className="max-w-5xl mx-auto space-y-8 relative">
          
          {/* Animated Hero Falcon Badge with rotating parameters */}
          <div className="relative mx-auto w-36 h-36 md:w-44 md:h-44 flex items-center justify-center mb-4">
            {/* Spinning Pulsating Neon Rings */}
            <div className="absolute inset-0 rounded-full border-2 border-dashed border-cyan-400/30 animate-[spin_16s_linear_infinite]"></div>
            <div className="absolute inset-2.5 rounded-full border border-indigo-500/20 animate-[spin_10s_linear_infinite_reverse]"></div>
            
            {/* Double dynamic particle layer */}
            <div className="absolute -top-3 left-6 w-2.5 h-2.5 bg-cyan-400 rounded-full animate-ping"></div>
            <div className="absolute -bottom-1 -right-4 w-3.5 h-3.5 bg-purple-500 rounded-full animate-bounce"></div>

            {/* Futuristic Glass Fluid Ring */}
            <div className="absolute inset-4.5 rounded-full bg-gradient-to-tr from-cyan-400 via-purple-600/40 to-indigo-500/40 opacity-90 backdrop-blur-md animate-pulse shadow-[0_0_60px_rgba(6,182,212,0.25)] flex items-center justify-center">
              <div className="w-18 h-18 rounded-full bg-slate-950 flex items-center justify-center border border-cyan-400/30">
                <FalconLogo className="w-11 h-11 text-cyan-300 filter drop-shadow-[0_0_12px_rgba(6,182,212,0.8)] animate-pulse" />
              </div>
            </div>
          </div>

          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/10 border border-cyan-400/25 text-cyan-300 text-[10px] font-mono uppercase tracking-[0.25em] shadow-[0_0_20px_rgba(6,182,212,0.1)]">
            <Shield className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            <span>Futuristic Multi-Model Cortex v3.0</span>
          </div>

          {/* Interactive display header */}
          <h1 className="text-5xl sm:text-7xl md:text-8xl lg:text-9xl font-black tracking-tight leading-none bg-gradient-to-b from-white via-gray-100 to-gray-500 bg-clip-text text-transparent font-display select-none">
            Falcon AI
          </h1>

          <p className="text-xl md:text-3xl text-gray-300 max-w-3xl mx-auto font-display font-light leading-relaxed">
            “One AI. Infinite Possibilities.”
          </p>
          <p className="text-xs md:text-sm text-gray-500 max-w-lg mx-auto font-mono uppercase tracking-widest leading-normal">
            Bespoke intelligence platform architected to secure extreme visual and cognitive computing.
          </p>

          {/* CTA Buttons with Neon Glow */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4.5 pt-6 max-w-md mx-auto">
            <button
              onClick={onStartFree}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl font-bold text-xs tracking-widest text-black uppercase bg-gradient-to-r from-cyan-400 to-indigo-500 hover:from-white hover:to-white transition-all duration-300 shadow-[0_0_40px_rgba(6,182,212,0.45)] cursor-pointer flex items-center justify-center gap-2 hover:scale-[1.03]"
            >
              <span>Start Chatting</span>
              <ArrowRight className="w-4 h-4 text-black" />
            </button>
            <button
              onClick={onStartFree}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl font-bold text-xs tracking-widest text-white uppercase bg-white/5 border border-white/10 hover:bg-white/15 h-full transition-all cursor-pointer flex items-center justify-center gap-2 hover:scale-[1.03]"
            >
              <span>Generate Images</span>
            </button>
          </div>

          <div className="pt-10 flex justify-center items-center gap-6 text-[10px] text-gray-500 font-mono tracking-widest uppercase">
            <span>⚡ MULTIPLE AI CORES</span>
            <span>•</span>
            <span>🔒 ZERO-KNOWLEDGE ENCRYPTED</span>
            <span>•</span>
            <span>👑 FALCON PREMIUM EDITION</span>
          </div>
        </div>
      </section>

      {/* CORE FEATURES GRID SECTION */}
      <section id="features" className="py-28 px-4 md:px-8 relative bg-gradient-to-b from-transparent to-[#04040b]">
        <div className="max-w-7xl mx-auto relative z-10">
          
          <div className="text-center mb-20">
            <span className="text-xs font-mono text-cyan-400 tracking-widest uppercase bg-cyan-400/10 px-3.5 py-1.5 rounded-full border border-cyan-400/20">MULTIPLE CAPABILITIES</span>
            <h2 className="text-4xl md:text-6xl font-black mt-4 tracking-tight bg-gradient-to-b from-white to-gray-500 bg-clip-text text-transparent font-display">
              Advanced Cybernetic Pillars
            </h2>
            <p className="text-gray-400 text-xs md:text-sm font-mono mt-3 max-w-xl mx-auto uppercase tracking-widest">
              Equipped with deep logic engines, visual generation pipelines, and adaptive intelligence parameters.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* Feature 1: AI Chat Assistant */}
            <div className="group relative rounded-3xl glass-panel p-7 border border-white/5 hover:border-cyan-500/40 transition-all duration-500 hover:-translate-y-1">
              <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/10 rounded-full blur-2xl group-hover:bg-cyan-500/25 transition-all" />
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-300 mb-6 group-hover:scale-110 transition-transform">
                <MessageSquare className="w-6 h-6 filter drop-shadow-[0_0_8px_rgba(34,211,238,0.4)]" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2 font-display">1. AI Chat Assistant</h3>
              <p className="text-xs text-gray-400 leading-relaxed font-sans">
                Full conversational synthesis using OpenRouter or Gemini. Maintain complex historical multi-turn chains effortlessly.
              </p>
            </div>

            {/* Feature 2: AI Image Generator */}
            <div className="group relative rounded-3xl glass-panel p-7 border border-white/5 hover:border-indigo-500/40 transition-all duration-500 hover:-translate-y-1">
              <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl group-hover:bg-indigo-500/25 transition-all" />
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-300 mb-6 group-hover:scale-110 transition-transform">
                <ImageIcon className="w-6 h-6 filter drop-shadow-[0_0_8px_rgba(129,140,248,0.4)]" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2 font-display">2. AI Image Generator</h3>
              <p className="text-xs text-gray-400 leading-relaxed font-sans">
                Create beautiful ultra-high-definition artwork via Flux Schnell model clusters. Customize ratios, prompt models, and save instantly.
              </p>
            </div>

            {/* Feature 3: AI Video Generator */}
            <div className="group relative rounded-3xl glass-panel p-7 border border-white/5 hover:border-purple-500/40 transition-all duration-500 hover:-translate-y-1 opacity-90">
              <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl group-hover:bg-purple-500/25 transition-all" />
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-300 mb-6 group-hover:scale-110 transition-transform">
                <PlayCircle className="w-6 h-6 filter drop-shadow-[0_0_8px_rgba(168,85,247,0.4)]" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2 font-display">3. AI Video Generator</h3>
              <p className="text-xs text-gray-400 leading-relaxed font-sans">
                Interactive video prompt synthesis templates. Convert text guidelines into motion frames elegantly (Beta pipeline coming soon).
              </p>
            </div>

            {/* Feature 4: Voice AI Assistant */}
            <div className="group relative rounded-3xl glass-panel p-7 border border-white/5 hover:border-emerald-500/40 transition-all duration-500 hover:-translate-y-1">
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/25 transition-all" />
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-300 mb-6 group-hover:scale-110 transition-transform">
                <Mic className="w-6 h-6 filter drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2 font-display">4. Voice AI Assistant</h3>
              <p className="text-xs text-gray-400 leading-relaxed font-sans">
                Speech-to-text synthesis allows direct hands-free command control with high-precision text readout and custom human audio read-outs.
              </p>
            </div>

            {/* Feature 5: Coding AI */}
            <div className="group relative rounded-3xl glass-panel p-7 border border-white/5 hover:border-amber-500/40 transition-all duration-500 hover:-translate-y-1">
              <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl group-hover:bg-amber-500/25 transition-all" />
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-300 mb-6 group-hover:scale-110 transition-transform">
                <Code className="w-6 h-6 filter drop-shadow-[0_0_8px_rgba(245,158,11,0.4)]" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2 font-display">5. Coding AI Compiler</h3>
              <p className="text-xs text-gray-400 leading-relaxed font-sans">
                Develop elite structural software blocks in TypeScript, Python, or C++. Write clean functions with embedded explanations.
              </p>
            </div>

            {/* Feature 6: Smart Web Search */}
            <div className="group relative rounded-3xl glass-panel p-7 border border-white/5 hover:border-blue-500/40 transition-all duration-500 hover:-translate-y-1">
              <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/25 transition-all" />
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-300 mb-6 group-hover:scale-110 transition-transform">
                <Search className="w-6 h-6 filter drop-shadow-[0_0_8px_rgba(59,130,246,0.4)]" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2 font-display">6. Smart Web Search</h3>
              <p className="text-xs text-gray-400 leading-relaxed font-sans">
                Toggle grounded search filters to hook queries immediately with live global Google search indices. Highly dynamic grounding results.
              </p>
            </div>

            {/* Feature 7: AI Tools Hub */}
            <div className="group relative rounded-3xl glass-panel p-7 border border-white/5 hover:border-pink-500/40 transition-all duration-500 hover:-translate-y-1">
              <div className="absolute top-0 right-0 w-24 h-24 bg-pink-500/10 rounded-full blur-2xl group-hover:bg-pink-500/25 transition-all" />
              <div className="w-12 h-12 rounded-2xl bg-pink-500/10 border border-pink-500/30 flex items-center justify-center text-pink-300 mb-6 group-hover:scale-110 transition-transform">
                <PenTool className="w-6 h-6 filter drop-shadow-[0_0_8px_rgba(236,72,153,0.4)]" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2 font-display">7. AI Tools Hub</h3>
              <p className="text-xs text-gray-400 leading-relaxed font-sans">
                Creative output generators including viral startup outlines, long novel structures, and content hooks. Built with templates.
              </p>
            </div>

            {/* Feature 8: Multi-AI Model Support */}
            <div className="group relative rounded-3xl glass-panel p-7 border border-white/5 hover:border-violet-500/40 transition-all duration-500 hover:-translate-y-1">
              <div className="absolute top-0 right-0 w-24 h-24 bg-violet-500/10 rounded-full blur-2xl group-hover:bg-violet-500/25 transition-all" />
              <div className="w-12 h-12 rounded-2xl bg-violet-500/10 border border-violet-500/30 flex items-center justify-center text-violet-300 mb-6 group-hover:scale-110 transition-transform">
                <Cpu className="w-6 h-6 filter drop-shadow-[0_0_8px_rgba(139,92,246,0.4)]" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2 font-display">8. Multi-AI Core</h3>
              <p className="text-xs text-gray-400 leading-relaxed font-sans">
                Instantly swap reasoning paradigms from Anthropic to Google or deep reasoning clusters. Synchronize state on the fly.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* PREMIUM MODEL SELECTOR COMPONENT CONTAINER */}
      <section id="models" className="py-24 px-4 md:px-8 relative bg-[#04040a]/80">
        <div className="max-w-5xl mx-auto relative z-10">
          
          <div className="text-center mb-16">
            <span className="text-[10px] font-mono text-cyan-300 bg-cyan-400/10 px-3 py-1 rounded-full border border-cyan-400/25 uppercase tracking-widest">Interactive Spec Panel</span>
            <h2 className="text-3xl md:text-5xl font-extrabold text-white mt-4 font-display">Precision Model Alignment</h2>
            <p className="text-xs text-gray-500 mt-2 font-mono uppercase tracking-widest">Tweak speeds and intelligence coordinates dynamically below</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            
            {/* Model Tabs (Left selector column) */}
            <div className="lg:col-span-4 flex flex-col gap-2.5">
              {(Object.keys(modelSpecs) as ModelType[]).map((key) => {
                const spec = modelSpecs[key];
                const active = selectedModel === key;
                return (
                  <button
                    key={key}
                    onClick={() => setSelectedModel(key)}
                    className={`p-4 rounded-2xl text-left transition-all duration-300 border cursor-pointer relative ${active ? 'bg-cyan-950/25 border-cyan-400/45 shadow-[0_0_20px_rgba(6,182,212,0.15)] text-white' : 'bg-white/[0.02] border-white/5 text-gray-400 hover:text-white hover:bg-white/[0.04]'}`}
                  >
                    {active && (
                      <div className="absolute top-1/2 -translate-y-1/2 left-0 w-1.5 h-8 rounded-r-lg bg-cyan-400" />
                    )}
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-bold font-display">{spec.name.split(' ')[0]} {spec.name.split(' ')[1] || ''}</span>
                      {spec.rec && (
                        <span className="text-[8px] font-mono font-bold bg-cyan-400 text-black px-1.5 py-0.5 rounded uppercase">Recommended</span>
                      )}
                    </div>
                    <span className="text-[10px] text-gray-400 block font-mono tracking-wider">{spec.badge}</span>
                  </button>
                );
              })}
            </div>

            {/* Model Detail Display Shield (Right output card) */}
            <div className="lg:col-span-8 relative">
              <AnimatePresence mode="wait">
                <motion.div
                  key={selectedModel}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="h-full rounded-3xl glass-panel p-8 border border-white/10 flex flex-col justify-between relative overflow-hidden"
                >
                  {/* Visual glow backdrop mapped to model spec index color */}
                  <div 
                    className="absolute -top-16 -right-16 w-48 h-48 rounded-full blur-3xl opacity-30 transition-all duration-500" 
                    style={{ background: modelSpecs[selectedModel].color.includes('cyan') ? 'cyan' : 'purple' }}
                  />

                  <div>
                    {/* Header with badges */}
                    <div className="flex justify-between items-start gap-3 flex-wrap mb-6 border-b border-white/5 pb-5">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-2xl font-black font-display text-white">{modelSpecs[selectedModel].name}</h3>
                          <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-white/10 border border-white/10 text-gray-300">
                            {modelSpecs[selectedModel].provider}
                          </span>
                        </div>
                        <p className="text-xs text-indigo-300 font-mono tracking-wide mt-2">{modelSpecs[selectedModel].badge}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono px-2.5 py-1 rounded-md bg-white/5 border border-white/5 text-cyan-300">
                          {modelSpecs[selectedModel].status}
                        </span>
                      </div>
                    </div>

                    {/* Description text */}
                    <p className="text-xs md:text-sm text-gray-300 leading-relaxed font-sans mb-8">
                      {modelSpecs[selectedModel].desc}
                    </p>

                    {/* Performance sliders (Smartness & Latency) */}
                    <div className="space-y-5">
                      <div>
                        <div className="flex justify-between items-center text-[10px] font-mono uppercase tracking-widest text-gray-400 mb-2">
                          <span>Synthesizing Latency Speed</span>
                          <span className="text-emerald-400 font-bold">{modelSpecs[selectedModel].speed}% (Extreme)</span>
                        </div>
                        <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${modelSpecs[selectedModel].speed}%` }}
                            transition={{ duration: 0.6 }}
                            className="h-full bg-gradient-to-r from-cyan-400 to-emerald-500 rounded-full"
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between items-center text-[10px] font-mono uppercase tracking-widest text-gray-400 mb-2">
                          <span>Cognitive Intelligence Factor</span>
                          <span className="text-indigo-400 font-bold">{modelSpecs[selectedModel].smartness}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${modelSpecs[selectedModel].smartness}%` }}
                            transition={{ duration: 0.6 }}
                            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Trigger call */}
                  <div className="pt-8 border-t border-white/5 mt-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <span className="text-[10px] font-mono text-gray-500">PROTOTYPE GROUNDINGS ONLINE</span>
                    <button
                      onClick={onStartFree}
                      className="px-5 py-2.5 rounded-xl text-xs font-mono font-bold uppercase tracking-widest text-black bg-cyan-300 hover:bg-white self-start transition-all cursor-pointer"
                    >
                      Establish Connection
                    </button>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

          </div>
        </div>
      </section>

      {/* DETAILED INTERACTIVE TERMINAL PREVIEW */}
      <section id="demo" className="py-24 px-4 md:px-8 relative bg-[#020205]">
        <div className="max-w-5xl mx-auto rounded-3xl glass-panel border border-white/10 p-8 md:p-12 relative overflow-hidden">
          
          <div className="absolute top-[-50px] left-[35%] w-[400px] h-[400px] bg-cyan-500/10 rounded-full blur-[110px] pointer-events-none" />

          <div className="text-center mb-10">
            <span className="text-xs font-mono text-cyan-400 tracking-widest uppercase bg-cyan-400/15 px-3 py-1 rounded-full">SANDBOX TERMINAL CORE</span>
            <h2 className="text-3xl md:text-4xl font-extrabold text-white mt-3 font-display">Simulated Cognitive Runway</h2>
            <p className="text-xs text-gray-500 mt-2 font-mono">Check response speed across key diagnostic prompts.</p>
          </div>

          {/* Selector tabs */}
          <div className="flex justify-center gap-2 mb-8 border-b border-white/10 pb-4 flex-wrap">
            <button
              onClick={() => {
                setActiveDemoTab('chat');
                setDemoResponse('Simulating. Request logical core queries or structural outlines above.');
              }}
              className={`px-4 py-2 rounded-xl text-xs font-mono uppercase tracking-widest transition-all cursor-pointer ${activeDemoTab === 'chat' ? 'bg-indigo-600/30 border border-indigo-400/40 text-indigo-200' : 'text-gray-400 hover:text-white'}`}
            >
              Logical Reasoner
            </button>
            <button
              onClick={() => {
                setActiveDemoTab('image');
                setDemoResponse('Interactive image generator initialized. Launch actual application workspace above to trigger Flux Schnell rendering.');
              }}
              className={`px-4 py-2 rounded-xl text-xs font-mono uppercase tracking-widest transition-all cursor-pointer ${activeDemoTab === 'image' ? 'bg-indigo-600/30 border border-indigo-400/40 text-indigo-400 font-bold' : 'text-gray-400 hover:text-white'}`}
            >
              Prism Graphics Core
            </button>
            <button
              onClick={() => {
                setActiveDemoTab('voice');
                setDemoResponse('Audio transcription layers ready. Tap and authenticate above to voice-control the entire system with text synthesizers.');
              }}
              className={`px-4 py-2 rounded-xl text-xs font-mono uppercase tracking-widest transition-all cursor-pointer ${activeDemoTab === 'voice' ? 'bg-indigo-600/30 border border-indigo-400/40 text-indigo-200' : 'text-gray-400 hover:text-white'}`}
            >
              Vocal Synthesizers
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            
            {/* Left Prompt keys */}
            <div className="md:col-span-5 space-y-3 flex flex-col justify-center">
              <span className="text-xs text-gray-400 uppercase tracking-widest block mb-1 font-mono">Quick test keys:</span>
              
              <button
                onClick={() => handleDemoSubmit('Who founded Falcon AI?')}
                className="w-full text-left p-3.5 rounded-xl bg-white/[0.03] border border-white/5 hover:border-cyan-500/30 hover:bg-white/[0.06] transition-all text-xs text-gray-300"
              >
                "Who founded and designed Falcon?"
              </button>
              
              <button
                onClick={() => handleDemoSubmit('optimize algorithms with custom memory factors')}
                className="w-full text-left p-3.5 rounded-xl bg-white/[0.03] border border-white/5 hover:border-cyan-500/30 hover:bg-white/[0.06] transition-all text-xs text-gray-300 animate-pulse"
              >
                "Write optimized algorithmic logic"
              </button>

              <button
                onClick={() => handleDemoSubmit('Explain quantum superposition to standard users')}
                className="w-full text-left p-3.5 rounded-xl bg-white/[0.03] border border-white/5 hover:border-cyan-500/30 hover:bg-white/[0.06] transition-all text-xs text-gray-300"
              >
                "Explain quantum multithread coherence"
              </button>
            </div>

            {/* Right: Sandbox terminal representation */}
            <div className="md:col-span-7 flex flex-col justify-between p-6 rounded-2xl bg-black/40 border border-white/5 font-mono text-xs text-gray-300 relative shadow-inner">
              <div className="flex justify-between items-center mb-4 border-b border-white/5 pb-2">
                <span className="text-cyan-400 flex items-center gap-1.5 font-bold">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                  node_sandbox@falcon-ai-core
                </span>
                <span className="text-[10px] text-gray-500">120 FPS FLUID</span>
              </div>
              
              <div className="flex-1 space-y-4 max-h-[190px] overflow-y-auto pr-2 no-scrollbar scroll-smooth">
                {demoInput && (
                  <p className="text-cyan-400">
                    <span className="text-gray-600 font-bold mr-2">&gt;</span>{demoInput}
                  </p>
                )}
                <div className="text-gray-100 whitespace-pre-wrap leading-relaxed">
                  {demoResponse}
                </div>
              </div>

              <div className="mt-6 flex justify-between items-center bg-white/5 p-2 rounded-xl">
                <input
                  type="text"
                  placeholder="Ask any prompt..."
                  value={demoInput}
                  onChange={(e) => setDemoInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && demoInput) {
                      handleDemoSubmit(demoInput);
                    }
                  }}
                  className="bg-transparent border-none outline-none text-xs text-white max-w-[70%] px-1"
                />
                <button
                  onClick={() => demoInput && handleDemoSubmit(demoInput)}
                  className="px-3 py-1.5 bg-cyan-500/20 text-cyan-300 text-[10px] rounded-lg border border-cyan-400/30 hover:bg-[#22d3ee] hover:text-black font-semibold transition-colors cursor-pointer"
                >
                  RUN PROCESSORS
                </button>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* CINEMATIC TEASER PROMO BANNER */}
      <section className="py-24 px-4 md:px-8 relative overflow-hidden bg-gradient-to-b from-transparent to-[#050510]">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-purple-600/10 rounded-full blur-[140px] pointer-events-none" />

        <div className="max-w-5xl mx-auto relative z-10 text-center">
          <div className="mb-12">
            <span className="text-xs font-mono text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-3.5 py-1.5 rounded-full uppercase tracking-widest">
              CINEMATIC CAPABILITY OVERVIEW
            </span>
            <h2 className="text-3xl md:text-5xl font-extrabold text-white mt-4 font-display">
              Orchestrate Creative Complexity
            </h2>
            <p className="text-gray-400 text-sm mt-3 max-w-lg mx-auto leading-relaxed">
              Synthesized with physical mechanics and standard-setting execution. Expand your workspace.
            </p>
          </div>

          <div className="max-w-4xl mx-auto rounded-3xl overflow-hidden relative border border-white/10 group shadow-[0_20px_60px_rgba(139,92,246,0.15)] bg-slate-950">
            {isPlayingTeaser ? (
              <div id="video-sandbox-player" className="aspect-video w-full relative flex items-center justify-center bg-black">
                {/* Simulated dynamic looping premium visual stream */}
                <div className="absolute inset-0 bg-gradient-to-tr from-cyan-950 via-slate-950 to-indigo-950 opacity-90 animate-pulse" />
                
                <div className="relative text-center z-10 space-y-4 px-6">
                  <Cpu className="w-16 h-16 text-cyan-400 mx-auto animate-spin" />
                  <p className="text-sm font-mono tracking-widest text-white uppercase font-bold animate-pulse">PROMO CORES INITIALIZING...</p>
                  <p className="text-xs text-gray-400 max-w-md">Synchronizing 120 FPS high-contrast graphic arrays. Experience the live application workspace as the active demo by authenticating!</p>
                  <button
                    onClick={() => setIsPlayingTeaser(false)}
                    className="mt-2 text-xs text-grey-400 hover:text-white underline font-mono. tracking-wider uppercase"
                  >
                    Expose Static Cover
                  </button>
                </div>
              </div>
            ) : (
              <div id="video-sandbox-cover" className="relative aspect-video w-full overflow-hidden flex flex-col justify-between p-8 text-left group">
                {/* Gorgeous high fidelity visual background cover from Unsplash */}
                <img 
                  src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1200&auto=format&fit=crop" 
                  alt="AI Platform Concept Blueprint" 
                  className="absolute inset-0 w-full h-full object-cover opacity-35 group-hover:scale-105 transition-transform duration-7000"
                  referrerPolicy="no-referrer"
                />
                
                {/* Visual gradient filter */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-[#030308]/60 to-transparent" />

                <div className="relative flex justify-between items-start">
                  <span className="text-[10px] font-mono font-bold tracking-widest uppercase bg-cyan-400 text-black px-2.5 py-1 rounded">ULTRA-SPEC v3.0</span>
                  <div className="flex items-center gap-1 bg-black/50 border border-white/10 p-1.5 px-3 rounded-full text-[10px] text-gray-300 font-mono backdrop-blur-md">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-ping" />
                    SYSTEM ON-DEMAND LIVE
                  </div>
                </div>

                <div className="relative flex flex-col md:flex-row items-center justify-between gap-6 pt-16 z-10">
                  <div className="text-center md:text-left space-y-2">
                    <h3 className="text-2xl font-black text-white font-display uppercase tracking-widest">
                      Designed to Outperform
                    </h3>
                    <p className="text-xs text-indigo-200 font-mono tracking-widest uppercase">
                      Continuous real-time optimization. Developed by Falcon AI Team.
                    </p>
                  </div>

                  <button
                    onClick={() => setIsPlayingTeaser(true)}
                    id="trigger-teaser-play"
                    className="p-5.5 rounded-full bg-cyan-400 hover:bg-white text-black filter drop-shadow-[0_0_15px_rgba(34,211,238,0.5)] transform hover:scale-108 transition-all duration-300 cursor-pointer"
                  >
                    <Play className="w-6 h-6 fill-black shrink-0 relative left-0.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* PRICING PLANS SECTION */}
      <section id="pricing" className="py-28 px-4 md:px-8 relative bg-gradient-to-b from-transparent to-[#010105] border-t border-white/5">
        <div className="max-w-7xl mx-auto relative z-10">
          
          <div className="text-center mb-20">
            <span className="text-xs font-mono text-cyan-400 tracking-widest uppercase bg-cyan-400/10 px-3.5 py-1.5 rounded-full border border-cyan-400/20">Flexible Pricing Grid</span>
            <h2 className="text-4xl md:text-6xl font-black mt-4 tracking-tight bg-gradient-to-b from-white to-gray-500 bg-clip-text text-transparent font-display">
              Scale Your Intelligence
            </h2>
            <p className="text-gray-400 text-xs md:text-sm font-mono mt-3 max-w-xl mx-auto uppercase tracking-widest">
              All tools are persistent and fully unlocked during active beta cycles.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
            
            {/* TIER 1: FREE PLAN */}
            <div className="relative rounded-3xl glass-panel p-9 border border-white/5 hover:border-cyan-500/20 transition-all duration-300 flex flex-col justify-between text-left hover:scale-[1.01]">
              <div>
                <span className="text-[10px] font-mono font-bold tracking-widest text-cyan-400 uppercase bg-cyan-400/10 px-2.5 py-1 rounded border border-cyan-400/25">FREE TRIAL</span>
                <h3 className="text-2xl font-black font-display text-white mt-4">FALCON BASIC</h3>
                <p className="text-xs text-gray-400 mt-1">Unlock our entry level sandbox nodes</p>
                
                <div className="my-8">
                  <span className="text-5xl font-black text-white">$0</span>
                  <span className="text-xs text-gray-500 ml-1">/ beta cycle</span>
                </div>
                
                <hr className="border-white/5 mb-8" />
                
                <ul className="space-y-4 text-xs text-gray-300 font-medium">
                  <li className="flex items-center gap-3">
                    <Check className="w-4 h-4 text-cyan-400 shrink-0" />
                    3 Image Generations per Day
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="w-4 h-4 text-cyan-400 shrink-0" />
                    Basic AI Chat (GPT-4o & Gemini cores)
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="w-4 h-4 text-cyan-400 shrink-0" />
                    Standard transcript voice sandbox
                  </li>
                  <li className="flex items-center gap-3 text-red-400/55">
                    <X className="w-4 h-4 text-red-400/40 shrink-0" />
                    No web index search queries
                  </li>
                </ul>
              </div>

              <div className="mt-10">
                <button
                  onClick={onStartFree}
                  className="w-full py-3.5 rounded-xl text-xs font-mono font-bold text-center bg-cyan-500/10 hover:bg-cyan-500/25 text-white border border-cyan-400/30 transition-all cursor-pointer uppercase tracking-widest"
                >
                  Acquire Core Handle
                </button>
              </div>
            </div>

            {/* TIER 2: PRO PLAN (Most Popular glow) */}
            <div className="relative rounded-3xl glass-panel p-9 border-2 border-indigo-500/45 hover:border-indigo-400 transition-all duration-300 flex flex-col justify-between text-left hover:scale-[1.02] shadow-[0_0_40px_rgba(99,102,241,0.25)] bg-slate-950/70">
              <div className="absolute -top-3.5 right-6 px-3.5 py-1 bg-gradient-to-r from-cyan-400 to-indigo-500 text-black text-[9px] font-mono font-black rounded-full uppercase tracking-widest animate-pulse">
                MOST POPULAR
              </div>
              
              <div>
                <span className="text-[10px] font-mono font-bold tracking-widest text-[#818cf8] uppercase bg-[#818cf8]/10 px-2.5 py-1 rounded border border-[#818cf8]/25">HIGH LOAD OK</span>
                <h3 className="text-2xl font-black font-display text-white mt-4">FALCON PRO</h3>
                <p className="text-xs text-gray-400 mt-1">Accelerated processing queues & deep filters</p>
                
                <div className="my-8">
                  <span className="text-5xl font-black text-transparent bg-gradient-to-r from-white to-gray-400 bg-clip-text">$29</span>
                  <span className="text-xs text-gray-500 ml-1">/ Month</span>
                </div>

                <div className="p-2.5 bg-cyan-400/10 rounded-xl border border-cyan-400/20 text-[10px] text-cyan-300 leading-normal mb-6 font-mono font-bold uppercase tracking-wider text-center animate-shine">
                  🚀 FREE RIGHT NOW IN BETA
                </div>
                
                <hr className="border-white/5 mb-8" />
                
                <ul className="space-y-4 text-xs text-gray-300 font-medium font-sans">
                  <li className="flex items-center gap-3">
                    <Check className="w-4 h-4 text-indigo-400 shrink-0" />
                    5 Image Generations per Day
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="w-4 h-4 text-indigo-400 shrink-0" />
                    Ultra-Fast Response Speed
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="w-4 h-4 text-indigo-400 shrink-0" />
                    Premium AI models (Claude 3.5 & Claude Custom)
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="w-4 h-4 text-indigo-400 shrink-0" />
                    Voice AI microsecond synthesizer access
                  </li>
                </ul>
              </div>

              <div className="mt-10">
                <button
                  onClick={onStartFree}
                  className="w-full py-4 rounded-xl text-xs font-mono font-bold text-center bg-gradient-to-r from-cyan-400 via-indigo-500 to-purple-500 text-black transition-all cursor-pointer uppercase tracking-widest hover:scale-[1.01]"
                >
                  Activate Pro Access
                </button>
              </div>
            </div>

            {/* TIER 3: PREMIUM PLAN */}
            <div className="relative rounded-3xl glass-panel p-9 border border-white/5 hover:border-purple-500/20 transition-all duration-300 flex flex-col justify-between text-left hover:scale-[1.01]">
              <div>
                <span className="text-[10px] font-mono font-bold tracking-widest text-[#c084fc] uppercase bg-[#c084fc]/10 px-2.5 py-1 rounded border border-[#c084fc]/25">DEDICATED CAPACITY</span>
                <h3 className="text-2xl font-black font-display text-white mt-4">FALCON ENTERPRISE</h3>
                <p className="text-xs text-gray-400 mt-1">Dedicated private tenant pools & security filters</p>
                
                <div className="my-8">
                  <span className="text-5xl font-black text-white">$149</span>
                  <span className="text-xs text-gray-500 ml-1">/ Month</span>
                </div>

                <div className="p-2.5 bg-indigo-500/10 rounded-xl border border-indigo-500/20 text-[10px] text-indigo-300 leading-normal mb-6 font-mono font-bold uppercase tracking-wider text-center">
                  🚀 FREE RIGHT NOW IN BETA
                </div>
                
                <hr className="border-white/5 mb-8" />
                
                <ul className="space-y-4 text-xs text-gray-300 font-medium">
                  <li className="flex items-center gap-3">
                    <Check className="w-4 h-4 text-purple-400 shrink-0" />
                    Unlimited High-Fidelity chat & text
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="w-4 h-4 text-purple-400 shrink-0" />
                    Unlimited high-res image generation
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="w-4 h-4 text-purple-400 shrink-0" />
                    AI video prompt synthesis (Upcoming launch)
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="w-4 h-4 text-purple-400 shrink-0" />
                    Priority latency response times
                  </li>
                </ul>
              </div>

              <div className="mt-10">
                <button
                  type="button"
                  onClick={() => showToast("Premium plans are coming soon! Enjoy all core features for free right now during our beta stage.", "info")}
                  className="w-full py-3.5 rounded-xl text-xs font-mono font-bold text-center bg-white/5 text-gray-400 hover:text-white border border-white/5 transition-all cursor-pointer uppercase tracking-widest"
                >
                  Coming Soon
                </button>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer id="main-footer" className="py-12 text-center text-xs text-gray-500 bg-[#020205] border-t border-white/5 relative z-10 font-mono tracking-widest">
        <p>© {new Date().getFullYear()} FALCON AI. BUILT TO UNRIVALED LUXURY PARAMETERS.</p>
        <p className="mt-2 text-[10px] text-gray-650">HANDCRAFTED WITH INTUITIVE COGNITIVE CORES IN CLOUD RUN CONTAINER INFRASTRUCTURE.</p>
      </footer>

    </div>
  );
}
