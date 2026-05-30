// Programmatic Web Audio API Futuristic Sound Engine for Falcon AI
// Engineered for zero external asset latency, beautiful synthesis, and customizable mood.

export type SoundMode = 'minimal' | 'immersive' | 'silent';

export interface SoundSettings {
  masterVolume: number;
  muted: boolean;
  uiSounds: boolean;
  genSounds: boolean;
  voiceSounds: boolean;
  notificationSounds: boolean;
  mode: SoundMode;
}

const DEFAULT_SETTINGS: SoundSettings = {
  masterVolume: 0.5,
  muted: false,
  uiSounds: true,
  genSounds: true,
  voiceSounds: true,
  notificationSounds: true,
  mode: 'immersive', // Default to beautiful futuristic cyber sounds, can swap to minimal
};

class SoundEngine {
  private ctx: AudioContext | null = null;
  private settings: SoundSettings = { ...DEFAULT_SETTINGS };
  private activeGens: { oscs: OscillatorNode[]; gainNode: GainNode; interval?: any }[] = [];

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('falcon_sound_settings');
        if (saved) {
          this.settings = { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
        }
      } catch (err) {
        console.warn("Could not parse saved sound settings, using defaults.", err);
      }
    }
  }

  private initCtx(): AudioContext | null {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
      }
    }
    // Resume context if it has been suspended by browser auto-play policy
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  public getSettings(): SoundSettings {
    return { ...this.settings };
  }

  public updateSetting<K extends keyof SoundSettings>(key: K, value: SoundSettings[K]) {
    this.settings[key] = value;
    if (typeof window !== 'undefined') {
      localStorage.setItem('falcon_sound_settings', JSON.stringify(this.settings));
    }
    if (key === 'muted' || key === 'masterVolume' || (key === 'genSounds' && !value)) {
      if (this.settings.muted || this.settings.masterVolume === 0 || (key === 'genSounds' && !value)) {
        this.stopAllGenHum();
      }
    }
  }

  /**
   * Helper to create a master output node inside the audio context
   */
  private createLineOut(duration: number, category: 'ui' | 'gen' | 'voice' | 'notification'): GainNode | null {
    const ctx = this.initCtx();
    if (!ctx) return null;

    if (this.settings.muted || this.settings.mode === 'silent') return null;

    // Category filter check
    if (category === 'ui' && !this.settings.uiSounds) return null;
    if (category === 'gen' && !this.settings.genSounds) return null;
    if (category === 'voice' && !this.settings.voiceSounds) return null;
    if (category === 'notification' && !this.settings.notificationSounds) return null;

    const masterGain = ctx.createGain();
    
    // Scale gain by master volume
    const modeMultiplier = this.settings.mode === 'minimal' ? 0.6 : 1.0;
    masterGain.gain.setValueAtTime(this.settings.masterVolume * 0.4 * modeMultiplier, ctx.currentTime);
    masterGain.connect(ctx.destination);

    return masterGain;
  }

  // ==========================================================
  // 1. UI INTERACTION SOUNDS
  // ==========================================================

  /**
   * Snappy click sound on buttons and interactive nodes
   */
  public playClick() {
    const ctx = this.initCtx();
    const out = this.createLineOut(0.12, 'ui');
    if (!ctx || !out) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const isMinimal = this.settings.mode === 'minimal';

    osc.type = 'sine';
    // Cyber-blip: high frequency dropping fast
    const startFreq = isMinimal ? 800 : 1200;
    const endFreq = isMinimal ? 150 : 80;
    osc.frequency.setValueAtTime(startFreq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(endFreq, ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);

    osc.connect(gain);
    gain.connect(out);

    osc.start();
    osc.stop(ctx.currentTime + 0.12);
  }

  /**
   * Debounced tiny hover tick
   */
  private lastHoverTime = 0;
  public playHover() {
    const now = Date.now();
    if (now - this.lastHoverTime < 100) return; // Prevent hover spamming
    this.lastHoverTime = now;

    const ctx = this.initCtx();
    const out = this.createLineOut(0.05, 'ui');
    if (!ctx || !out) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(this.settings.mode === 'minimal' ? 1600 : 2000, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1000, ctx.currentTime + 0.04);

    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);

    osc.connect(gain);
    gain.connect(out);

    osc.start();
    osc.stop(ctx.currentTime + 0.05);
  }

  /**
   * Toggle switches sound feedback (on vs off)
   */
  public playToggle(isOn: boolean) {
    const ctx = this.initCtx();
    const out = this.createLineOut(0.15, 'ui');
    if (!ctx || !out) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    const t = ctx.currentTime;

    if (isOn) {
      // Toggle ON: ascending double-blip
      osc.frequency.setValueAtTime(400, t);
      osc.frequency.setValueAtTime(600, t + 0.05);
      gain.gain.setValueAtTime(0.3, t);
      gain.gain.setValueAtTime(0.3, t + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    } else {
      // Toggle OFF: descending double-blip
      osc.frequency.setValueAtTime(500, t);
      osc.frequency.setValueAtTime(350, t + 0.05);
      gain.gain.setValueAtTime(0.3, t);
      gain.gain.setValueAtTime(0.3, t + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    }

    osc.connect(gain);
    gain.connect(out);

    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  }

  /**
   * Dynamic sweeping page transition or tab swap sound
   */
  public playTabSwap() {
    const ctx = this.initCtx();
    const out = this.createLineOut(0.25, 'ui');
    if (!ctx || !out) return;

    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(140, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(320, ctx.currentTime + 0.22);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(300, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(1400, ctx.currentTime + 0.2);
    filter.Q.setValueAtTime(4, ctx.currentTime);

    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.24);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(out);

    osc.start();
    osc.stop(ctx.currentTime + 0.25);
  }

  // ==========================================================
  // 2. CHAT INTERACTIONS
  // ==========================================================

  /**
   * Sent message sound - quick digital zip rising fast
   */
  public playMessageSent() {
    const ctx = this.initCtx();
    const out = this.createLineOut(0.22, 'ui');
    if (!ctx || !out) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.15);

    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);

    osc.connect(gain);
    gain.connect(out);

    osc.start();
    osc.stop(ctx.currentTime + 0.22);
  }

  /**
   * Typing startup neural chime
   */
  public playTypingStart() {
    const ctx = this.initCtx();
    const out = this.createLineOut(0.3, 'ui');
    if (!ctx || !out) return;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(440, ctx.currentTime);
    osc1.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.25);

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(554.37, ctx.currentTime); // C#
    osc2.frequency.exponentialRampToValueAtTime(1108.73, ctx.currentTime + 0.25);

    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(out);

    osc1.start();
    osc2.start();
    osc1.stop(ctx.currentTime + 0.3);
    osc2.stop(ctx.currentTime + 0.3);
  }

  /**
   * Copy button success sound
   */
  public playCopyFeedback() {
    const ctx = this.initCtx();
    const out = this.createLineOut(0.15, 'ui');
    if (!ctx || !out) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(900, ctx.currentTime);
    osc.frequency.setValueAtTime(1350, ctx.currentTime + 0.06);

    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.setValueAtTime(0.2, ctx.currentTime + 0.06);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.14);

    osc.connect(gain);
    gain.connect(out);

    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  }

  /**
   * Gentle majestic major-7th chime when AI finishes typing
   */
  public playAiResponseComplete() {
    const ctx = this.initCtx();
    const out = this.createLineOut(1.4, 'notification');
    if (!ctx || !out) return;

    const notes = [523.25, 659.25, 783.99, 987.77]; // C5, E5, G5, B5 (Ambient dream chord)
    const t = ctx.currentTime;
    const isMinimal = this.settings.mode === 'minimal';

    notes.forEach((freq, index) => {
      if (isMinimal && index > 1) return; // simpler chord for minimal mode
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + index * 0.06); // Stagger/Arpeggiate

      const peakGain = 0.15 / notes.length;
      oscGain.gain.setValueAtTime(0, t);
      oscGain.gain.linearRampToValueAtTime(peakGain, t + index * 0.06 + 0.02);
      oscGain.gain.exponentialRampToValueAtTime(0.001, t + (isMinimal ? 0.4 : 1.2));

      osc.connect(oscGain);
      oscGain.connect(out);

      osc.start(t);
      osc.stop(t + (isMinimal ? 0.5 : 1.4));
    });
  }

  // ==========================================================
  // 3. IMAGE GENERATION SOUNDS
  // ==========================================================

  /**
   * AI processing continuous humming generator
   */
  public startGenHum() {
    this.stopAllGenHum();

    const ctx = this.initCtx();
    const out = this.createLineOut(5.0, 'gen'); // Dummy duration
    if (!ctx || !out) return;

    // We build an ongoing organic sci-fi wave texture
    const mainOsc = ctx.createOscillator();
    const subOsc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    const masterGainNode = ctx.createGain();

    mainOsc.type = 'sawtooth';
    mainOsc.frequency.value = 85; // Low-frequency drone

    subOsc.type = 'sine';
    subOsc.frequency.value = 42.5; // sub octave

    filter.type = 'lowpass';
    filter.frequency.value = 130;
    filter.Q.value = 8;

    lfo.type = 'sine';
    lfo.frequency.value = 1.8; // filter sweep rhythm modulation
    lfoGain.gain.value = 40; // modulate filter cutoffs +/- 40Hz

    masterGainNode.gain.setValueAtTime(0, ctx.currentTime);
    masterGainNode.gain.linearRampToValueAtTime(0.25, ctx.currentTime + 1.2); // Smooth fade in

    // Connect modulators
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);

    // Audio path
    mainOsc.connect(filter);
    subOsc.connect(filter);
    filter.connect(masterGainNode);
    masterGainNode.connect(out);

    lfo.start();
    mainOsc.start();
    subOsc.start();

    // Spawn intermittent neural digital sparkles in background during generation
    const pulseInterval = setInterval(() => {
      this.playNeuralPulse();
    }, 1400);

    this.activeGens.push({
      oscs: [mainOsc, subOsc, lfo],
      gainNode: masterGainNode,
      interval: pulseInterval
    });
  }

  /**
   * Neural pulse sparkles playing inside background render loop
   */
  private playNeuralPulse() {
    const ctx = this.initCtx();
    const out = this.createLineOut(0.5, 'gen');
    if (!ctx || !out) return;

    const osc = ctx.createOscillator();
    const biquad = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(400 + Math.random() * 800, ctx.currentTime); // Random sparkly pitch

    biquad.type = 'bandpass';
    biquad.frequency.setValueAtTime(2000, ctx.currentTime);
    biquad.Q.setValueAtTime(5, ctx.currentTime);

    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);

    osc.connect(biquad);
    biquad.connect(gain);
    gain.connect(out);

    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  }

  public stopAllGenHum() {
    this.activeGens.forEach(({ oscs, gainNode, interval }) => {
      if (interval) clearInterval(interval);
      try {
        const ctx = this.initCtx();
        if (ctx) {
          gainNode.gain.cancelScheduledValues(ctx.currentTime);
          gainNode.gain.setValueAtTime(gainNode.gain.value, ctx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5); // Warm slow release
          setTimeout(() => {
            oscs.forEach(o => {
              try { o.stop(); } catch(e){}
            });
          }, 600);
        }
      } catch (err) {}
    });
    this.activeGens = [];
  }

  /**
   * Final cinematic reveal sound for fully generated images
   */
  public playImageReveal() {
    const ctx = this.initCtx();
    const out = this.createLineOut(1.6, 'gen');
    if (!ctx || !out) return;

    this.stopAllGenHum();

    const t = ctx.currentTime;
    
    // Low dramatic base sweep
    const baseOsc = ctx.createOscillator();
    const baseGain = ctx.createGain();
    baseOsc.type = 'sine';
    baseOsc.frequency.setValueAtTime(60, t);
    baseOsc.frequency.exponentialRampToValueAtTime(180, t + 1.2);
    baseGain.gain.setValueAtTime(0, t);
    baseGain.gain.linearRampToValueAtTime(0.4, t + 0.2);
    baseGain.gain.exponentialRampToValueAtTime(0.001, t + 1.5);

    // Warm chord sparkle overhead (A Major Suite)
    const sparkleNotes = [440, 554.37, 659.25, 880, 1108.73];
    sparkleNotes.forEach((freq, index) => {
      const spOsc = ctx.createOscillator();
      const spGain = ctx.createGain();
      spOsc.type = 'sine';
      spOsc.frequency.setValueAtTime(freq, t + 0.1 + index * 0.05);
      
      const pGain = 0.12 / sparkleNotes.length;
      spGain.gain.setValueAtTime(0, t);
      spGain.gain.linearRampToValueAtTime(pGain, t + 0.1 + index * 0.05 + 0.03);
      spGain.gain.exponentialRampToValueAtTime(0.001, t + 1.3);

      spOsc.connect(spGain);
      spGain.connect(out);
      spOsc.start(t);
      spOsc.stop(t + 1.5);
    });

    baseOsc.connect(baseGain);
    baseGain.connect(out);

    baseOsc.start(t);
    baseOsc.stop(t + 1.6);
  }

  /**
   * HD quality enhancement swoosh sound
   */
  public playHdEnhancement() {
    const ctx = this.initCtx();
    const out = this.createLineOut(0.8, 'gen');
    if (!ctx || !out) return;

    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(180, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(2200, ctx.currentTime + 0.6);

    filter.type = 'highpass';
    filter.frequency.setValueAtTime(500, ctx.currentTime);
    filter.Q.setValueAtTime(3, ctx.currentTime);

    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.15);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.75);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(out);

    osc.start();
    osc.stop(ctx.currentTime + 0.8);
  }

  // ==========================================================
  // 4. VOICE ASSISTANT SOUND DIAGRAMS
  // ==========================================================

  /**
   * Wake-word activation tone: bright, futuristic upward chime
   */
  public playVoiceWake() {
    const ctx = this.initCtx();
    const out = this.createLineOut(0.4, 'voice');
    if (!ctx || !out) return;

    const notes = [587.33, 783.99, 1174.66]; // D5 -> G5 -> D6
    const t = ctx.currentTime;

    notes.forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + index * 0.06);

      const pk = 0.22 / notes.length;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(pk, t + index * 0.06 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

      osc.connect(gain);
      gain.connect(out);

      osc.start(t);
      osc.stop(t + 0.4);
    });
  }

  /**
   * Disconnect / Sleep sound: elegant soft downward chime
   */
  public playVoiceSleep() {
    const ctx = this.initCtx();
    const out = this.createLineOut(0.4, 'voice');
    if (!ctx || !out) return;

    const notes = [1174.66, 783.99, 587.33]; // D6 -> G5 -> D5
    const t = ctx.currentTime;

    notes.forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + index * 0.06);

      const pk = 0.20 / notes.length;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(pk, t + index * 0.06 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

      osc.connect(gain);
      gain.connect(out);

      osc.start(t);
      osc.stop(t + 0.4);
    });
  }

  /**
   * Smooth thinking voice pulse or ping
   */
  public playVoiceThinking() {
    const ctx = this.initCtx();
    const out = this.createLineOut(0.6, 'voice');
    if (!ctx || !out) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(450, ctx.currentTime + 0.5); // soft vibrato-like frequency shift

    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.55);

    osc.connect(gain);
    gain.connect(out);

    osc.start();
    osc.stop(ctx.currentTime + 0.6);
  }

  // ==========================================================
  // 5. STATUS SYSTEMS
  // ==========================================================

  /**
   * Upload completed success chime: sparkling arpeggio
   */
  public playUploadSuccess() {
    const ctx = this.initCtx();
    const out = this.createLineOut(0.5, 'ui');
    if (!ctx || !out) return;

    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5 -> E5 -> G5 -> C6
    const t = ctx.currentTime;

    notes.forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + index * 0.04);

      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.08, t + index * 0.04 + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.42);

      osc.connect(gain);
      gain.connect(out);

      osc.start(t);
      osc.stop(t + 0.5);
    });
  }

  /**
   * Success action ping
   */
  public playSuccess() {
    const ctx = this.initCtx();
    const out = this.createLineOut(0.4, 'ui');
    if (!ctx || !out) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.08); // A5

    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.setValueAtTime(0.2, ctx.currentTime + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(out);

    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  }

  /**
   * Error action or alert pulse (detuned low wave, not harsh)
   */
  public playError() {
    const ctx = this.initCtx();
    const out = this.createLineOut(0.5, 'ui');
    if (!ctx || !out) return;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sawtooth';
    osc1.frequency.value = 130; // detuned pair
    osc2.type = 'sine';
    osc2.frequency.value = 132;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 220;

    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(out);

    osc1.start();
    osc2.start();
    osc1.stop(ctx.currentTime + 0.5);
    osc2.stop(ctx.currentTime + 0.5);
  }

  /**
   * Ambient Notification bell
   */
  public playNotification() {
    const ctx = this.initCtx();
    const out = this.createLineOut(0.8, 'notification');
    if (!ctx || !out) return;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, ctx.currentTime); // A5
    osc1.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.12);

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1320, ctx.currentTime); // E6
    osc2.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.12);

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.7);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(out);

    osc1.start();
    osc2.start();
    osc1.stop(ctx.currentTime + 0.8);
    osc2.stop(ctx.currentTime + 0.8);
  }
}

export const soundEngine = new SoundEngine();
