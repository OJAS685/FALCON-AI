import { Award, Github, Linkedin, Sparkles, Twitter } from 'lucide-react';

export default function FounderSection() {
  return (
    <div id="founder" className="relative py-24 px-6 md:px-12 overflow-hidden border-t border-white/5 bg-[#05050d]">
      {/* Background neon dynamic lighting fields */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[250px] bg-gradient-to-r from-cyan-500/10 via-indigo-500/10 to-purple-500/10 rounded-full blur-[140px] pointer-events-none"></div>

      <div className="max-w-4xl mx-auto relative z-10">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-mono uppercase tracking-widest mb-4">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
            <span>EXECUTIVE VISIONARY</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-b from-white to-gray-500 bg-clip-text text-transparent font-display">
            The Vision Behind Falcon
          </h2>
          <p className="text-gray-400 text-sm md:text-base mt-3 max-w-xl mx-auto leading-relaxed">
            Pioneered to redefine how the global workforce orchestrates cognitive reasoning. Guided by a mission of unified intelligent computing.
          </p>
        </div>

        {/* Liquid Glass Showcase Card */}
        <div id="founder-glass-card" className="relative group overflow-hidden rounded-3xl glass-panel p-8 md:p-12 border border-white/10 transition-all duration-500 hover:border-cyan-500/30 hover:scale-[1.01] hover:shadow-[0_0_50px_rgba(56,189,248,0.15)] flex flex-col md:flex-row gap-8 items-center">
          
          {/* Neon animated highlight border strip */}
          <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-indigo-500 animate-pulse"></div>

          {/* Left: Founder Holographic Headshot / Placeholder Graphic */}
          <div className="relative shrink-0 w-32 h-32 md:w-40 md:h-40 rounded-2xl overflow-hidden border-2 border-cyan-400/30 glow-orb group-hover:border-indigo-400/50 transition-colors duration-500 bg-gradient-to-tr from-cyan-900/30 to-slate-950 flex items-center justify-center">
            {/* Real aesthetic vector art avatar or professional layout representation */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.2)_0%,transparent_70%)]"></div>
            <Award className="w-16 h-16 text-cyan-400/80 group-hover:text-cyan-300 group-hover:rotate-6 transition-all duration-500" />
            <div className="absolute bottom-2 inset-x-0 text-center">
              <span className="text-[10px] font-mono tracking-widest text-cyan-300 uppercase bg-black/40 py-0.5 px-2 rounded-full border border-white/5">OJAS SONI</span>
            </div>
          </div>

          {/* Right: Visionary Bio details */}
          <div className="flex-1 text-center md:text-left space-y-4">
            <div>
              <h3 className="text-3xl font-extrabold text-white tracking-wide font-display group-hover:text-cyan-300 transition-colors duration-300">
                OJAS SONI
              </h3>
              <p className="text-xs text-indigo-400 font-mono tracking-widest uppercase mt-1">Founder & Chief Architect, Falcon AI</p>
            </div>

            <p className="text-gray-300 text-sm md:text-base leading-relaxed">
              "Falcon AI was conceived to collapse the latency between creative thought and digital execution. We are assembling an absolute standard of cognitive fluid systems to elevate engineering, prose creation, and research workflows into the high-performance tier."
            </p>

            {/* Micro Signature animation vector */}
            <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-white/5">
              <div className="inline-flex items-center gap-3">
                <span className="text-xs font-mono text-gray-500 bg-white/5 px-2.5 py-1 rounded-md">EST. 2026</span>
                <span className="text-xs font-mono text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping"></span>
                  Active Protocol
                </span>
              </div>

              {/* Founder Social Channels */}
              <div className="flex justify-center gap-3">
                <a href="#github" className="p-2 rounded-lg bg-white/5 text-gray-400 hover:text-white hover:bg-cyan-500/20 transition-all border border-white/5">
                  <Github className="w-4 h-4" />
                </a>
                <a href="#linkedin" className="p-2 rounded-lg bg-white/5 text-gray-400 hover:text-white hover:bg-cyan-500/20 transition-all border border-white/5">
                  <Linkedin className="w-4 h-4" />
                </a>
                <a href="#twitter" className="p-2 rounded-lg bg-white/5 text-gray-400 hover:text-white hover:bg-cyan-500/20 transition-all border border-white/5">
                  <Twitter className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
