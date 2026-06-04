import { Message, ChatSession, User } from "./types";

// Setup browser Web Speech APIs
export interface SpeechState {
  isSpeaking: boolean;
  isPaused: boolean;
  currentSentenceIndex: number;
  totalSentences: number;
  sentences: string[];
  rate: number;
  volume: number;
}

export class SpeechController {
  private recognition: any = null;
  private synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
  private voice: SpeechSynthesisVoice | null = null;

  // Premium state tracking
  public currentText: string = "";
  public sentences: string[] = [];
  public currentSentenceIndex: number = 0;
  public isSpeaking: boolean = false;
  public isPaused: boolean = false;
  public rate: number = 1.0;
  public volume: number = 1.0;

  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private stateListener: ((state: SpeechState) => void) | null = null;
  private onStartCallback: (() => void) | null = null;
  private onEndCallback: (() => void) | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = false;
        this.recognition.interimResults = false;
        this.recognition.lang = 'en-US';
      }
    }
  }

  public isSupported(): boolean {
    return !!this.recognition;
  }

  public registerStateListener(listener: (state: SpeechState) => void) {
    this.stateListener = listener;
    this.notify();
  }

  private notify() {
    if (this.stateListener) {
      this.stateListener({
        isSpeaking: this.isSpeaking,
        isPaused: this.isPaused,
        currentSentenceIndex: this.currentSentenceIndex,
        totalSentences: this.sentences.length,
        sentences: this.sentences,
        rate: this.rate,
        volume: this.volume
      });
    }
  }

  public startSpeechToText(onResult: (text: string) => void, onError: (err: any) => void) {
    if (!this.recognition) {
      onError("Speech Recognition is not supported in this browser environment.");
      return;
    }

    this.recognition.onresult = (event: any) => {
      const text = event.results[0][0].transcript;
      onResult(text);
    };

    this.recognition.onerror = (event: any) => {
      onError(event.error);
    };

    try {
      this.recognition.start();
    } catch (e) {
      onError(e);
    }
  }

  public stopSpeechToText() {
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) {}
    }
  }

  public speak(text: string, onStart: () => void, onEnd: () => void) {
    if (!this.synth) return;
    this.synth.cancel(); // Stop current speech cleanly

    this.onStartCallback = onStart;
    this.onEndCallback = onEnd;

    // Clean text from markdown patterns before speaking
    const cleanText = text
      .replace(/[\*\#\`\_]/g, '')
      .replace(/<\/?[^>]+(>|$)/g, "")
      .trim();

    this.currentText = cleanText;
    
    // Split sentences intelligently
    const rawSentences = cleanText.split(/[.!?\n]+/);
    this.sentences = rawSentences
      .map(s => s.trim())
      .filter(s => s.length > 1);

    if (this.sentences.length === 0) {
      this.sentences = [cleanText];
    }

    this.currentSentenceIndex = 0;
    this.isSpeaking = true;
    this.isPaused = false;

    if (this.onStartCallback) {
      this.onStartCallback();
    }

    this.speakCurrentSentence();
  }

  private speakCurrentSentence() {
    if (!this.synth || !this.isSpeaking) return;

    if (this.currentSentenceIndex >= this.sentences.length) {
      this.finishPlayback();
      return;
    }

    this.synth.cancel(); // Terminate existing utterance instantly

    const sentenceToSpeak = this.sentences[this.currentSentenceIndex];
    if (!sentenceToSpeak) {
      this.currentSentenceIndex++;
      this.speakCurrentSentence();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(sentenceToSpeak);

    // Pick standard professional voice
    const voices = this.synth.getVoices();
    const premiumVoice = voices.find(v => v.name.includes("Google") || v.name.includes("Natural") || v.name.includes("Samantha") || v.lang.startsWith("en"));
    if (premiumVoice) {
      utterance.voice = premiumVoice;
    }

    utterance.rate = this.rate;
    utterance.volume = this.volume;

    utterance.onstart = () => {
      if (!this.isSpeaking) {
        if (this.synth) this.synth.cancel();
        return;
      }
      this.notify();
    };

    utterance.onend = () => {
      if (this.isSpeaking && !this.isPaused) {
        this.currentSentenceIndex++;
        this.speakCurrentSentence();
      }
    };

    utterance.onerror = (e) => {
      console.warn("Speech Synthesis error:", e);
      // Skip sentence if error happens
      if (this.isSpeaking && !this.isPaused) {
        this.currentSentenceIndex++;
        this.speakCurrentSentence();
      }
    };

    this.currentUtterance = utterance;
    this.synth.speak(utterance);
    this.notify();
  }

  private finishPlayback() {
    this.isSpeaking = false;
    this.isPaused = false;
    this.currentSentenceIndex = 0;
    this.currentUtterance = null;
    this.notify();
    if (this.onEndCallback) {
      this.onEndCallback();
    }
  }

  public pause() {
    if (!this.synth || !this.isSpeaking || this.isPaused) return;
    this.isPaused = true;
    try {
      this.synth.pause();
    } catch (e) {
      console.error(e);
    }
    this.notify();
  }

  public resume() {
    if (!this.synth || !this.isSpeaking || !this.isPaused) return;
    this.isPaused = false;
    try {
      this.synth.resume();
      setTimeout(() => {
        if (this.isSpeaking && !this.isPaused && !this.synth.speaking) {
          this.speakCurrentSentence();
        }
      }, 100);
    } catch (e) {
      console.error(e);
      this.speakCurrentSentence();
    }
    this.notify();
  }

  public skipSentence() {
    if (!this.isSpeaking) return;
    if (this.currentSentenceIndex + 1 < this.sentences.length) {
      this.currentSentenceIndex++;
      this.speakCurrentSentence();
    } else {
      this.stopSpeaking();
    }
  }

  public replayCurrentSentence() {
    if (!this.isSpeaking) return;
    this.speakCurrentSentence();
  }

  public prevSentence() {
    if (!this.isSpeaking) return;
    if (this.currentSentenceIndex > 0) {
      this.currentSentenceIndex--;
      this.speakCurrentSentence();
    } else {
      this.speakCurrentSentence();
    }
  }

  public setRate(rate: number) {
    this.rate = Math.max(0.5, Math.min(2.0, rate));
    this.notify();
    if (this.isSpeaking && !this.isPaused) {
      this.speakCurrentSentence();
    }
  }

  public setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1.0, volume));
    this.notify();
    if (this.isSpeaking && !this.isPaused) {
      this.speakCurrentSentence();
    }
  }

  public stopSpeaking() {
    this.isSpeaking = false;
    this.isPaused = false;
    this.currentSentenceIndex = 0;
    this.sentences = [];
    this.currentUtterance = null;
    if (this.synth) {
      this.synth.cancel();
    }
    this.notify();
    if (this.onEndCallback) {
      this.onEndCallback();
    }
  }
}

// API Utilities for simple server callbacks
export async function sendChatMessage(
  messages: Message[],
  smartSearch: boolean,
  modeSelect: string,
  model?: string,
  onChunk?: (text: string) => void,
  onMetadata?: (meta: any) => void,
  activeProjectId?: string | null,
  activeAgent?: string | null
) {
  try {
    const token = typeof window !== 'undefined' ? localStorage.getItem('falcon_token') : null;
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const payload: any = { messages, smartSearch, modeSelect, model, activeProjectId, activeAgent };
    if (onChunk) {
      payload.stream = true;
    }

    const res = await fetch("/api/ai/chat", {
      method: "POST",
      headers,
      body: JSON.stringify(payload)
    });
    
    if (res.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('falcon_user');
        localStorage.removeItem('falcon_token');
        window.location.reload();
      }
    }
    
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed stream response.");
    }
    
    if (onChunk) {
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let combinedText = "";
      
      if (!reader) {
        throw new Error("Reader streaming is not supported on this platform.");
      }

      let buffer = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        // Keep the last partial line in buffer
        buffer = lines.pop() || "";
        
        for (const line of lines) {
          const cleanLine = line.trim();
          if (!cleanLine || !cleanLine.startsWith("data: ")) continue;
          
          try {
            const data = JSON.parse(cleanLine.substring(6));
            if (data.text) {
              combinedText += data.text;
              onChunk(data.text);
            }
            if (data.done) {
              if (onMetadata) {
                onMetadata(data);
              }
            }
          } catch (e) {
            console.error("SSE parsing error inside stream:", e, cleanLine);
          }
        }
      }
      return { success: true, text: combinedText };
    } else {
      return await res.json();
    }
  } catch (err: any) {
    console.error("AI chat communication error:", err);
    const errorMessage = err.message || "An unexpected network communication error occurred.";
    if (onChunk) {
      onChunk(`⚠️ **Communication Handshake Error:** ${errorMessage}`);
    }
    return {
      success: false,
      error: errorMessage
    };
  }
}

export async function generateAIImage(prompt: string, aspectRatio: string, stylePreset?: string) {
  try {
    const token = typeof window !== 'undefined' ? localStorage.getItem('falcon_token') : null;
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch("/api/ai/generate-image", {
      method: "POST",
      headers,
      body: JSON.stringify({ prompt, aspectRatio, stylePreset })
    });
    if (res.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('falcon_user');
        localStorage.removeItem('falcon_token');
        window.location.reload();
      }
    }
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Image query failed");
    }
    return await res.json();
  } catch (err: any) {
    console.error("AI image compilation error:", err);
    return {
      success: false,
      error: err.message || "Failed to process image generation request."
    };
  }
}

export async function analyzeAIImage(imageSrc: string) {
  try {
    const token = typeof window !== 'undefined' ? localStorage.getItem('falcon_token') : null;
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch("/api/ai/analyze-image", {
      method: "POST",
      headers,
      body: JSON.stringify({ imageSrc })
    });
    if (res.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('falcon_user');
        localStorage.removeItem('falcon_token');
        window.location.reload();
      }
    }
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Image analysis failed");
    }
    return await res.json();
  } catch (err: any) {
    console.error("AI image analysis error:", err);
    return {
      success: false,
      error: err.message
    };
  }
}

export async function editAIImage(
  imageSrc: string,
  prompt: string,
  maskSrc: string | null,
  action: string,
  stylePreset: string,
  extraParams?: {
    restoreFaces?: boolean;
    upscaleLevel?: 'none' | 'hd' | '4k';
    lightingRelight?: string;
    weatherEffect?: string;
    colorGrade?: string;
    smartSelection?: string;
  }
) {
  try {
    const token = typeof window !== 'undefined' ? localStorage.getItem('falcon_token') : null;
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch("/api/ai/edit-image", {
      method: "POST",
      headers,
      body: JSON.stringify({ 
        imageSrc, 
        prompt, 
        maskSrc, 
        action, 
        stylePreset,
        restoreFaces: extraParams?.restoreFaces,
        upscaleLevel: extraParams?.upscaleLevel,
        lightingRelight: extraParams?.lightingRelight,
        weatherEffect: extraParams?.weatherEffect,
        colorGrade: extraParams?.colorGrade,
        smartSelection: extraParams?.smartSelection
      })
    });
    if (res.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('falcon_user');
        localStorage.removeItem('falcon_token');
        window.location.reload();
      }
    }
    const contentType = res.headers.get("content-type");
    const isJson = contentType && contentType.includes("application/json");

    if (!res.ok) {
      let errorMessage = "Image editing query failed";
      if (isJson) {
        try {
          const err = await res.json();
          errorMessage = err.error || errorMessage;
        } catch (_) {}
      } else {
        errorMessage = `HTTP error ${res.status}: ${res.statusText}`;
      }
      throw new Error(errorMessage);
    }

    if (isJson) {
      return await res.json();
    } else {
      throw new Error("Server response was not JSON");
    }
  } catch (err: any) {
    console.error("AI image editing error:", err);
    return {
      success: false,
      error: err.message || "Failed to process image edit request."
    };
  }
}
