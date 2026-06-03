import React, { useState, useEffect, useRef } from 'react';
import { 
  TrendingUp, TrendingDown, DollarSign, Calendar, Calculator, BookOpen, 
  AlertTriangle, Play, Check, RefreshCw, Sparkles, Send, Trash2, Plus, 
  HelpCircle, Activity, Target, Percent, ArrowUpRight, ArrowDownRight, 
  Award, Compass, MessageSquare, Briefcase, BookMarked, Scale, FileSpreadsheet, AlertOctagon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User as UserType } from '../types';

interface TraderModeViewProps {
  user: UserType;
}

export interface TradeEntry {
  id: string;
  symbol: string;
  direction: 'LONG' | 'SHORT';
  entryPrice: number;
  exitPrice: number;
  amount: number; // Positive for profit, negative for loss
  strategy: string;
  emotion: string;
  lessons: string;
  date: string;
}

interface MarketAsset {
  symbol: string;
  name: string;
  type: 'crypto' | 'stock' | 'forex';
  price: number;
  change: number; // % change 
  high: number;
  low: number;
  history: number[]; // mini-sparkline points
}

export default function TraderModeView({ user }: TraderModeViewProps) {
  // Navigation inside Trader Mode
  const [traderTab, setTraderTab] = useState<'market' | 'risk' | 'journal' | 'education' | 'review'>('market');

  // Watchlist & Tickers State
  const [watchlist, setWatchlist] = useState<string[]>(() => {
    const saved = localStorage.getItem('falcon_watchlist');
    return saved ? JSON.parse(saved) : ['BTC', 'ETH', 'NVDA', 'EUR/USD'];
  });
  const [newWatchItem, setNewWatchItem] = useState('');

  // Save watchlist to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('falcon_watchlist', JSON.stringify(watchlist));
  }, [watchlist]);

  // Market Assets Ticker Data
  const [marketAssets, setMarketAssets] = useState<MarketAsset[]>([
    { symbol: 'BTC/USDT', name: 'Bitcoin', type: 'crypto', price: 67240.25, change: 2.34, high: 68100.0, low: 65450.0, history: [65.4, 66.2, 65.8, 67.1, 66.5, 67.240] },
    { symbol: 'ETH/USDT', name: 'Ethereum', type: 'crypto', price: 3482.60, change: 1.15, high: 3550.0, low: 3410.0, history: [3.41, 3.49, 3.45, 3.51, 3.44, 3.482] },
    { symbol: 'SOL/USDT', name: 'Solana', type: 'crypto', price: 174.45, change: 4.88, high: 178.2, low: 164.5, history: [1.64, 1.70, 1.68, 1.75, 1.72, 1.744] },
    { symbol: 'SPY', name: 'S&P 500 ETF', type: 'stock', price: 531.85, change: 0.62, high: 533.1, low: 529.5, history: [5.29, 5.31, 5.30, 5.32, 5.31, 5.318] },
    { symbol: 'QQQ', name: 'Nasdaq 100 ETF', type: 'stock', price: 462.40, change: 0.94, high: 464.0, low: 458.7, history: [4.58, 4.60, 4.59, 4.63, 4.61, 4.624] },
    { symbol: 'NVDA', name: 'NVIDIA Corp', type: 'stock', price: 1148.50, change: 5.12, high: 1160.0, low: 1092.0, history: [1.09, 1.12, 1.10, 1.15, 1.13, 1.148] },
    { symbol: 'AAPL', name: 'Apple Inc', type: 'stock', price: 194.30, change: -0.45, high: 196.2, low: 193.1, history: [1.96, 1.95, 1.95, 1.93, 1.94, 1.943] },
    { symbol: 'EUR/USD', name: 'Euro / US Dollar', type: 'forex', price: 1.0824, change: 0.08, high: 1.0845, low: 1.0805, history: [1.080, 1.081, 1.083, 1.082, 1.083, 1.082] },
    { symbol: 'GBP/USD', name: 'British Pound / USD', type: 'forex', price: 1.2745, change: -0.15, high: 1.2780, low: 1.2710, history: [1.278, 1.276, 1.275, 1.273, 1.274, 1.274] }
  ]);

  // Real-time ticking effect to simulate live trading Desk
  useEffect(() => {
    const timer = setInterval(() => {
      setMarketAssets(prevAssets => {
        return prevAssets.map(asset => {
          // Adjust price by a random small percentage (-0.15% to +0.15%)
          const pct = (Math.random() * 0.3 - 0.15) / 100;
          const priceDiff = asset.price * pct;
          const newPrice = asset.price + priceDiff;
          
          // Limit decimal points based on Forex vs Stocks vs Crypto
          const dec = asset.type === 'forex' ? 4 : 2;
          const roundedPrice = parseFloat(newPrice.toFixed(dec));

          let newChange = asset.change + (pct * 100);
          newChange = parseFloat(newChange.toFixed(2));

          const newHigh = roundedPrice > asset.high ? roundedPrice : asset.high;
          const newLow = roundedPrice < asset.low ? roundedPrice : asset.low;

          // Push to sparkline history
          const updatedHistory = [...asset.history.slice(1), parseFloat((roundedPrice / (asset.type === 'forex' ? 1 : 100)).toFixed(3))];

          return {
            ...asset,
            price: roundedPrice,
            change: newChange,
            high: newHigh,
            low: newLow,
            history: updatedHistory
          };
        });
      });
    }, 4000);

    return () => clearInterval(timer);
  }, []);

  // Watchlist handlers
  const handleAddToWatchlist = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWatchItem.trim()) return;
    const cleanSym = newWatchItem.toUpperCase().trim();
    if (!watchlist.includes(cleanSym)) {
      setWatchlist([...watchlist, cleanSym]);
    }
    setNewWatchItem('');
  };

  const handleRemoveFromWatchlist = (sym: string) => {
    setWatchlist(watchlist.filter(w => w !== sym));
  };

  // Market Analysis State
  const [analysisSymbol, setAnalysisSymbol] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);

  const triggerMarketAnalysis = async (symbolToAnalyze: string) => {
    if (!symbolToAnalyze.trim()) return;
    setAnalyzing(true);
    setAnalysisSymbol(symbolToAnalyze);
    setAnalysisResult(null);

    try {
      const token = localStorage.getItem('falcon_token');
      const res = await fetch('/api/trader/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({ symbol: symbolToAnalyze })
      });

      const data = await res.json();
      if (data.success) {
        setAnalysisResult(data.analysis);
      } else {
        setAnalysisResult(`⚠️ Error conducting AI simulation of ${symbolToAnalyze}: ${data.error || 'Server rejected query context.'}`);
      }
    } catch (err: any) {
      console.error(err);
      setAnalysisResult(`⚠️ Network communication timeout while compiling neural vectors for ${symbolToAnalyze}. Please check your connection.`);
    } finally {
      setAnalyzing(false);
    }
  };

  // Risk Calculator State
  const [riskAccountSize, setRiskAccountSize] = useState<number>(10000);
  const [riskPct, setRiskPct] = useState<number>(1);
  const [riskEntryPrice, setRiskEntryPrice] = useState<number>(100);
  const [riskStopLoss, setRiskStopLoss] = useState<number>(95);
  const [riskTargetPrice, setRiskTargetPrice] = useState<number>(115);

  // Computed Risk Values
  const diffStop = Math.abs(riskEntryPrice - riskStopLoss);
  const diffTarget = Math.abs(riskTargetPrice - riskEntryPrice);
  const riskAmountCash = (riskAccountSize * (riskPct / 100));
  const positionUnits = diffStop > 0 ? parseFloat((riskAmountCash / diffStop).toFixed(4)) : 0;
  const totalPositionSizeValue = positionUnits * riskEntryPrice;
  const rewardAmountCash = positionUnits * diffTarget;
  const riskToRewardRatio = diffStop > 0 ? parseFloat((diffTarget / diffStop).toFixed(2)) : 0;

  // Trade Journal State
  const [trades, setTrades] = useState<TradeEntry[]>(() => {
    const saved = localStorage.getItem('falcon_trades_v1');
    if (saved) return JSON.parse(saved);
    // Initial sample trades
    return [
      { id: 'tr_1', symbol: 'BTC/USDT', direction: 'LONG', entryPrice: 64200.0, exitPrice: 66800.0, amount: 520.0, strategy: 'Trend Pullback', emotion: 'Calm & Disciplined', lessons: 'Waited for key retest of the daily support zone before committing capital.', date: '2026-05-28' },
      { id: 'tr_2', symbol: 'NVDA', direction: 'LONG', entryPrice: 1080.0, exitPrice: 1065.0, amount: -150.0, strategy: 'Breakout Attempt', emotion: 'Fear of Missing Out (FOMO)', lessons: 'Chased the daily highs. Sticking strictly to mechanical entries is required.', date: '2026-05-30' },
      { id: 'tr_3', symbol: 'EUR/USD', direction: 'SHORT', entryPrice: 1.0890, exitPrice: 1.0810, amount: 320.0, strategy: 'Resistance rejection', emotion: 'Patient', lessons: 'Exceptional visual trigger. Held position through minor Consolidation bounds.', date: '2026-06-01' }
    ];
  });

  // Save trades to localStorage whenever they update
  useEffect(() => {
    localStorage.setItem('falcon_trades_v1', JSON.stringify(trades));
  }, [trades]);

  const [journalSymbol, setJournalSymbol] = useState('');
  const [journalDirection, setJournalDirection] = useState<'LONG' | 'SHORT'>('LONG');
  const [journalEntryPrice, setJournalEntryPrice] = useState<number>(0);
  const [journalExitPrice, setJournalExitPrice] = useState<number>(0);
  const [journalAmount, setJournalAmount] = useState<number>(0);
  const [journalStrategy, setJournalStrategy] = useState('Trend Pullback');
  const [journalEmotion, setJournalEmotion] = useState('Calm');
  const [journalLessons, setJournalLessons] = useState('');
  const [showAddTrade, setShowAddTrade] = useState(false);

  const handleAddTradeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!journalSymbol.trim()) return;

    const newTrade: TradeEntry = {
      id: 'tr_' + Math.random().toString(36).substr(2, 9),
      symbol: journalSymbol.toUpperCase().trim(),
      direction: journalDirection,
      entryPrice: Number(journalEntryPrice),
      exitPrice: Number(journalExitPrice),
      amount: Number(journalAmount),
      strategy: journalStrategy,
      emotion: journalEmotion,
      lessons: journalLessons.trim() || 'No explicit lesson recorded.',
      date: new Date().toISOString().split('T')[0]
    };

    setTrades([newTrade, ...trades]);
    setJournalSymbol('');
    setJournalEntryPrice(0);
    setJournalExitPrice(0);
    setJournalAmount(0);
    setJournalLessons('');
    setShowAddTrade(false);
  };

  const handleDeleteTrade = (id: string) => {
    if (confirm('Are you holding a definitive mandate to purge this trade journal cell?')) {
      setTrades(trades.filter(t => t.id !== id));
    }
  };

  // Journal Analytics computations
  const totalWins = trades.filter(t => t.amount > 0).length;
  const totalLosses = trades.filter(t => t.amount < 0).length;
  const winRate = trades.length > 0 ? Math.round((totalWins / trades.length) * 100) : 0;
  const netEarnings = trades.reduce((acc, t) => acc + t.amount, 0);
  const avgWin = totalWins > 0 ? trades.filter(t => t.amount > 0).reduce((acc, t) => acc + t.amount, 0) / totalWins : 0;
  const avgLoss = totalLosses > 0 ? trades.filter(t => t.amount < 0).reduce((acc, t) => acc + Math.abs(t.amount), 0) / totalLosses : 0;
  const profitFactor = avgLoss > 0 ? parseFloat((avgWin / avgLoss).toFixed(2)) : trades.length > 0 ? 9.9 : 0;

  // Render SVG Equity Curve
  const renderEquityCurve = () => {
    if (trades.length === 0) return null;
    // Calculate cumulative equity sequence 10000 base
    let initialBalance = 10000;
    const balanceSequence = [initialBalance];
    // Traverse from oldest to newest (reverse order of array)
    const sortedTrades = [...trades].reverse();
    sortedTrades.forEach(t => {
      initialBalance += t.amount;
      balanceSequence.push(initialBalance);
    });

    const w = 500;
    const h = 180;
    const pad = 25;
    const minBal = Math.min(...balanceSequence) * 0.98;
    const maxBal = Math.max(...balanceSequence) * 1.02;
    const balDiff = maxBal - minBal === 0 ? 1 : maxBal - minBal;

    const points = balanceSequence.map((bal, idx) => {
      const x = pad + (idx / (balanceSequence.length - 1)) * (w - pad * 2);
      const y = h - pad - ((bal - minBal) / balDiff) * (h - pad * 2);
      return `${x},${y}`;
    }).join(' ');

    const fillPoints = `${pad},${h - pad} ${points} ${w - pad},${h - pad}`;

    return (
      <svg className="w-full h-full overflow-visible" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
        <defs>
          <linearGradient id="areaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.0" />
          </linearGradient>
          <filter id="glowFilter">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        
        {/* Grids */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
          const y = pad + ratio * (h - pad * 2);
          const gridVal = maxBal - ratio * balDiff;
          return (
            <g key={i}>
              <line x1={pad} y1={y} x2={w - pad} y2={y} stroke="rgba(255,255,255,0.03)" strokeWidth="1" strokeDasharray="4 4" />
              <text x={w - pad + 5} y={y + 3} className="text-[7.5px] fill-gray-500 font-mono text-right" textAnchor="start">
                ${Math.round(gridVal)}
              </text>
            </g>
          );
        })}

        {/* Shaded Area underneath the equity curve */}
        {balanceSequence.length > 1 && (
          <polygon points={fillPoints} fill="url(#areaGrad)" />
        )}

        {/* Glow Line */}
        {balanceSequence.length > 1 ? (
          <polyline
            points={points}
            fill="none"
            stroke="#22d3ee"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#glowFilter)"
          />
        ) : (
          <line x1={pad} y1={h/2} x2={w - pad} y2={h/2} stroke="#334155" strokeWidth="1" strokeDasharray="3 3" />
        )}

        {/* Intersect Dots */}
        {balanceSequence.map((bal, idx) => {
          const x = pad + (idx / (balanceSequence.length - 1)) * (w - pad * 2);
          const y = h - pad - ((bal - minBal) / balDiff) * (h - pad * 2);
          return (
            <circle
              key={idx}
              cx={x}
              cy={y}
              r="3.5"
              className="fill-cyan-400 stroke-[#020205] stroke-[2px] cursor-pointer hover:r-[5px] transition-all"
            >
              <title>{`Trade ${idx}: $${bal}`}</title>
            </circle>
          );
        })}
      </svg>
    );
  };

  // Education Hub State
  const [eduPath, setEduPath] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner');
  const [expandedQuiz, setExpandedQuiz] = useState<string | null>(null);
  const [quizScore, setQuizScore] = useState<Record<string, number>>({});
  const [quizSelection, setQuizSelection] = useState<Record<string, number>>({});

  const handleSelectQuizOption = (quizId: string, optIndex: number, correctIdx: number) => {
    setQuizSelection({
      ...quizSelection,
      [quizId]: optIndex
    });
    if (optIndex === correctIdx) {
      setQuizScore({
        ...quizScore,
        [quizId]: 1 // Correct
      });
    } else {
      setQuizScore({
        ...quizScore,
        [quizId]: -1 // Incorrect
      });
    }
  };

  // AI Trade Review State
  const [reviewText, setReviewText] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);
  const [aiReviewOutput, setAiReviewOutput] = useState<string | null>(null);

  const runAiTradeReview = async () => {
    if (!reviewText.trim()) return;
    setReviewLoading(true);
    setAiReviewOutput(null);

    try {
      const token = localStorage.getItem('falcon_token');
      const res = await fetch('/api/trader/review', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({ description: reviewText })
      });

      const data = await res.json();
      if (data.success) {
        setAiReviewOutput(data.review);
      } else {
        setAiReviewOutput(`⚠️ Review failure: ${data.error || 'Server integration rejected context payload.'}`);
      }
    } catch (err) {
      console.error(err);
      setAiReviewOutput(`⚠️ Handshake timeout while transmitting review telemetry payload. Verify server status and try again.`);
    } finally {
      setReviewLoading(false);
    }
  };

  const handleAutoFillReviewSample = (sample: string) => {
    setReviewText(sample);
  };

  return (
    <div id="falcon-trader-mode" className="space-y-6">
      
      {/* ⚠️ HIGH-DENSITY GLOWING DISCLAIMER BANNER */}
      <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex gap-3 text-xs leading-relaxed text-red-200">
        <AlertOctagon className="w-5 h-5 text-red-400 shrink-0 select-none animate-pulse" />
        <div>
          <span className="font-mono font-bold uppercase tracking-widest text-red-400 block mb-0.5 mb-1 text-[9px]">
            ALGORITHMIC RISK DIRECTIVE / MANDATORY REGULATION
          </span>
          No guarantee of profits can be offered. Trading speculative assets involves substantial risk of ruin. 
          All neural outputs, market parameters, sentiment metrics, and position size calculations synthesized here are strictly for educational and mock simulation purposes. 
          Falcon AI does not represent a licensed broker or financial advisor. Never commit capital you are not prepared to lose entirely.
        </div>
      </div>

      {/* SUB-NAVIGATION CONTROL SHELF */}
      <div className="flex flex-wrap gap-2 p-1.5 rounded-2xl bg-black/40 border border-white/5 backdrop-blur-xl">
        <button
          onClick={() => setTraderTab('market')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-mono uppercase tracking-wider transition-all cursor-pointer ${traderTab === 'market' ? 'bg-cyan-500/10 text-cyan-300 border border-cyan-400/20 shadow-[0_0_15px_rgba(34,211,238,0.1)]' : 'text-gray-400 hover:text-white hover:bg-white/[0.02]'}`}
        >
          <TrendingUp className="w-4 h-4 text-cyan-400 animate-pulse" />
          <span>Market Overview</span>
        </button>

        <button
          onClick={() => setTraderTab('risk')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-mono uppercase tracking-wider transition-all cursor-pointer ${traderTab === 'risk' ? 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.1)]' : 'text-gray-400 hover:text-white hover:bg-white/[0.02]'}`}
        >
          <Calculator className="w-4 h-4 text-indigo-400" />
          <span>Risk Station</span>
        </button>

        <button
          onClick={() => setTraderTab('journal')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-mono uppercase tracking-wider transition-all cursor-pointer ${traderTab === 'journal' ? 'bg-purple-500/10 text-purple-300 border border-purple-500/20 shadow-[0_0_15px_rgba(168,85,247,0.1)]' : 'text-gray-400 hover:text-white hover:bg-white/[0.02]'}`}
        >
          <FileSpreadsheet className="w-4 h-4 text-purple-400" />
          <span>Trade Journal</span>
        </button>

        <button
          onClick={() => setTraderTab('education')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-mono uppercase tracking-wider transition-all cursor-pointer ${traderTab === 'education' ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]' : 'text-gray-400 hover:text-white hover:bg-white/[0.02]'}`}
        >
          <BookMarked className="w-4 h-4 text-emerald-400" />
          <span>Learning Paths</span>
        </button>

        <button
          onClick={() => setTraderTab('review')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-mono uppercase tracking-wider transition-all cursor-pointer ${traderTab === 'review' ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.1)]' : 'text-gray-400 hover:text-white hover:bg-white/[0.02]'}`}
        >
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>AI Setup Review</span>
        </button>
      </div>

      {/* WORKSPACE AREA */}
      <AnimatePresence mode="wait">
        
        {/* TAB 1: MARKET OVERVIEW & WATCHLIST */}
        {traderTab === 'market' && (
          <motion.div
            key="market"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            {/* Asset grids */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Asset list */}
              <div className="bg-[#020205]/60 border border-white/5 rounded-3xl p-6 backdrop-blur-xl">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-sm font-bold tracking-wider font-mono text-white uppercase">Real-time Trading Terminals</h3>
                    <p className="text-[10px] text-gray-500 font-mono uppercase tracking-widest mt-0.5">Continuous auto-ticking simulation grid</p>
                  </div>
                  <div className="flex items-center gap-2 text-[9px] text-[#22d3ee] font-mono bg-cyan-950/40 px-3 py-1.5 rounded-full border border-cyan-400/10">
                    <Activity className="w-3.5 h-3.5 animate-pulse shrink-0" />
                    <span>TICK FLOW ACTIVE</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {marketAssets.map((asset) => {
                    const isPositive = asset.change >= 0;
                    return (
                      <div 
                        key={asset.symbol} 
                        onClick={() => triggerMarketAnalysis(asset.symbol)}
                        className="bg-[#0b0c15]/50 border border-white/5 rounded-2xl p-4 hover:border-cyan-400/30 cursor-pointer hover:bg-cyan-950/[0.03] transition-all group relative overflow-hidden"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="text-[9px] text-gray-500 uppercase tracking-widest font-mono font-bold block">{asset.name}</span>
                            <span className="text-xs font-mono font-bold text-white tracking-tight">{asset.symbol}</span>
                          </div>
                          <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full ${isPositive ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15' : 'bg-red-500/10 text-red-400 border border-red-500/15'}`}>
                            {isPositive ? '+' : ''}{asset.change}%
                          </span>
                        </div>

                        <div className="mt-4 flex items-baseline justify-between">
                          <span className="text-base font-mono font-bold tracking-tight text-white select-none">
                            ${asset.price.toLocaleString(undefined, { minimumFractionDigits: asset.type === 'forex' ? 4 : 2 })}
                          </span>
                        </div>

                        {/* Interactive Sparkline simulation */}
                        <div className="h-6 w-full mt-3 flex items-end gap-0.5">
                          {asset.history.map((val, idx) => {
                            const heights = [20, 45, 30, 80, 55, 90];
                            const currentHeight = heights[idx % heights.length];
                            return (
                              <div 
                                key={idx} 
                                className={`w-full rounded-t-sm transition-all duration-300 ${isPositive ? 'bg-cyan-500/20 group-hover:bg-cyan-400/40' : 'bg-red-500/20 group-hover:bg-red-400/40'}`}
                                style={{ height: `${currentHeight}%` }}
                              />
                            );
                          })}
                        </div>

                        <div className="mt-2 flex items-center justify-between text-[8px] font-mono text-gray-500">
                          <span>L: ${asset.low}</span>
                          <span>H: ${asset.high}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* AI Market Intelligence Center */}
              <div className="bg-[#020205]/60 border border-white/5 rounded-3xl p-6 backdrop-blur-xl space-y-4">
                <div>
                  <h3 className="text-sm font-bold tracking-wider font-mono text-white uppercase">Neural Market Analyzer</h3>
                  <p className="text-[10px] text-gray-500 font-mono uppercase tracking-widest mt-0.5">Vectorize assets for support, resistance, catalysts, and bias</p>
                </div>

                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={analysisSymbol}
                      onChange={(e) => setAnalysisSymbol(e.target.value)}
                      placeholder="Enter symbol (e.g. BTC, NVDA, EUR/USD)..."
                      className="w-full bg-[#030308]/40 border border-white/5 text-xs text-white rounded-xl py-3 pl-4 pr-4 placeholder-gray-500 focus:outline-none focus:border-cyan-400/40 transition-colors uppercase font-mono"
                    />
                  </div>
                  <button
                    onClick={() => triggerMarketAnalysis(analysisSymbol)}
                    disabled={analyzing || !analysisSymbol.trim()}
                    className="bg-cyan-500/10 hover:bg-cyan-400/20 duration-300 border border-cyan-400/20 shadow-[0_0_15px_rgba(34,211,238,0.1)] px-5 rounded-xl text-xs font-mono font-bold tracking-wider text-cyan-300 transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {analyzing ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>TRANSFILING...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>ANALYZE</span>
                      </>
                    )}
                  </button>
                </div>

                {analysisResult ? (
                  <div className="bg-[#030308]/50 border border-white/5 p-4 rounded-2xl text-xs leading-relaxed space-y-3 font-sans max-h-[400px] overflow-y-auto custom-scrollbar">
                    <div className="flex items-center justify-between border-b border-white/5 pb-2">
                      <span className="text-[9px] font-mono tracking-widest text-[#22d3ee] uppercase font-bold">Falcon Synapse Signal Output</span>
                      <span className="text-[8px] font-mono text-gray-500">SYSTEM COGNITION DIRECTIVE</span>
                    </div>
                    
                    <div className="text-slate-200 mt-2 whitespace-pre-wrap leading-relaxed">
                      {analysisResult}
                    </div>
                  </div>
                ) : (
                  <div className="bg-[#030308]/20 border border-dashed border-white/5 rounded-2xl p-8 text-center text-gray-500 text-xs">
                    <PulseGlobeIcon />
                    <p className="mt-4 font-mono uppercase tracking-wider text-[9px]">Awaiting Signal Input Vector</p>
                    <p className="text-gray-600 mt-1 max-w-sm mx-auto">Input any stock, cryptocurrency or forex pair or click one of the terminals above to synthesize instantly with Gemini 3.5 AI Core.</p>
                  </div>
                )}
              </div>

            </div>

            {/* SIDE PANEL: WATCHLIST & ECONOMIC SCHEDULE */}
            <div className="space-y-6">
              
              {/* Watchlist card */}
              <div className="bg-[#020205]/60 border border-white/5 rounded-3xl p-6 backdrop-blur-xl">
                <div>
                  <h3 className="text-sm font-bold tracking-wider font-mono text-white uppercase">Your Watchlist</h3>
                  <p className="text-[10px] text-gray-500 font-mono uppercase tracking-widest mt-0.5">Persisted custom assets indexer</p>
                </div>

                <form onSubmit={handleAddToWatchlist} className="flex gap-2 mt-4 mb-4">
                  <input
                    type="text"
                    required
                    value={newWatchItem}
                    onChange={(e) => setNewWatchItem(e.target.value)}
                    placeholder="AAPL, SOL, GBP/USD..."
                    className="flex-1 bg-[#030308]/40 border border-white/5 text-xs text-white rounded-xl px-3 py-2 placeholder-gray-500 focus:outline-none focus:border-cyan-400/40 uppercase font-mono"
                  />
                  <button
                    type="submit"
                    className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-400/20 text-cyan-400 hover:bg-cyan-400/20 transition-colors cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </form>

                <div className="space-y-2">
                  {watchlist.map((sym) => (
                    <div key={sym} className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-colors">
                      <button 
                        onClick={() => triggerMarketAnalysis(sym)}
                        className="text-xs font-mono font-bold text-gray-200 hover:text-cyan-400 transition-colors text-left font-sans flex items-center gap-1.5"
                      >
                        <Compass className="w-3.5 h-3.5 text-cyan-400" />
                        <span>{sym}</span>
                      </button>
                      
                      <button
                        onClick={() => handleRemoveFromWatchlist(sym)}
                        className="p-1 rounded-lg hover:bg-red-500/10 text-gray-500 hover:text-red-400 transition-colors cursor-pointer"
                        title="Purge"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  {watchlist.length === 0 && (
                    <p className="text-center py-4 text-xs font-mono text-gray-600">WATCHLIST EMPTY</p>
                  )}
                </div>
              </div>

              {/* Economic Calendar Card */}
              <div className="bg-[#020205]/60 border border-white/5 rounded-3xl p-6 backdrop-blur-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold tracking-wider font-mono text-white uppercase">Economic Calendar</h3>
                    <p className="text-[10px] text-gray-500 font-mono uppercase tracking-widest mt-0.5">High-Impact System Catalysts</p>
                  </div>
                  <Calendar className="w-4 h-4 text-indigo-400" />
                </div>

                <div className="space-y-3.5 mt-5">
                  {[
                    { title: "US Non-Farm Payrolls (NFP)", time: "Friday, 12:30 UTC", impact: "HIGH", color: "text-red-400 bg-red-450/10 border-red-500/20", desc: "Measures US labor growth; high volatility injection for DXY and pairs." },
                    { title: "FOMC Rate Announcement", time: "Wed, 18:00 UTC", impact: "HIGH", color: "text-red-400 bg-red-450/10 border-red-500/20", desc: "Federal Reserve interest rates announcement and policy statement." },
                    { title: "US Core Inflation CPI", time: "Next Thu, 12:30 UTC", impact: "HIGH", color: "text-red-400 bg-red-450/10 border-red-500/20", desc: "Inflation metric. Steers aggressive rate projection grids." },
                    { title: "Eurozone GDP Revision", time: "Fri, 09:00 UTC", impact: "MED", color: "text-amber-400 bg-amber-450/10 border-amber-500/20", desc: "Primary economic health vectors for the single-currency bloc." }
                  ].map((evt, i) => (
                    <div key={i} className="bg-white/[0.01] border border-white/5 p-3 rounded-xl space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-[11px] font-bold text-gray-200 tracking-tight leading-snug">{evt.title}</span>
                        <span className={`text-[7.5px] font-mono font-bold px-1.5 py-0.5 rounded-full shrink-0 border uppercase tracking-widest ${evt.color}`}>
                          {evt.impact}
                        </span>
                      </div>
                      <p className="text-[9.5px] text-[#22d3ee] font-mono">{evt.time}</p>
                      <p className="text-[9.5px] text-gray-400 leading-normal font-sans">{evt.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

            </div>

          </motion.div>
        )}

        {/* TAB 2: RISK MANAGEMENT TOOLS */}
        {traderTab === 'risk' && (
          <motion.div
            key="risk"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            {/* Left form input */}
            <div className="bg-[#020205]/60 border border-white/5 rounded-3xl p-6 backdrop-blur-xl space-y-5">
              <div>
                <h3 className="text-sm font-bold tracking-wider font-mono text-white uppercase">Capitals & Parameters Matrix</h3>
                <p className="text-[10px] text-gray-500 font-mono uppercase tracking-widest mt-0.5">Define constraints for mathematical asset allocations</p>
              </div>

              <div className="space-y-4">
                
                {/* Account sizing */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-[10px] text-gray-400 font-mono uppercase tracking-wider font-bold">Total Trading Equity ($)</label>
                    <span className="text-xs font-mono font-bold text-cyan-400">${riskAccountSize.toLocaleString()}</span>
                  </div>
                  <input
                    type="range"
                    min="100"
                    max="1000000"
                    step="500"
                    value={riskAccountSize}
                    onChange={(e) => setRiskAccountSize(parseInt(e.target.value))}
                    className="w-full accent-cyan-400"
                  />
                  <div className="relative mt-2">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 font-mono text-xs">$</span>
                    <input
                      type="number"
                      value={riskAccountSize}
                      onChange={(e) => setRiskAccountSize(Number(e.target.value))}
                      className="w-full bg-[#030308]/40 border border-white/5 text-xs text-cyan-200 rounded-xl py-2.5 pl-7 pr-4 font-mono focus:outline-none"
                    />
                  </div>
                </div>

                {/* Risk Percentage */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-[10px] text-gray-400 font-mono uppercase tracking-wider font-bold">Account Risk Percentage (%)</label>
                    <span className="text-xs font-mono font-bold text-cyan-400">{riskPct}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="10"
                    step="0.1"
                    value={riskPct}
                    onChange={(e) => setRiskPct(parseFloat(e.target.value))}
                    className="w-full accent-cyan-400"
                  />
                  <div className="relative mt-2 flex items-center bg-[#030308]/40 border border-white/5 rounded-xl pr-3.5">
                    <input
                      type="number"
                      step="0.1"
                      value={riskPct}
                      onChange={(e) => setRiskPct(Number(e.target.value))}
                      className="w-full bg-transparent text-xs text-cyan-200 py-2.5 pl-3.5 pr-1 font-mono focus:outline-none"
                    />
                    <Percent className="w-3.5 h-3.5 text-gray-500" />
                  </div>
                </div>

                {/* Grid Inputs for Prices */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-white/5 pt-4">
                  
                  <div>
                    <label className="block text-[10px] text-gray-500 font-mono uppercase font-bold mb-1.5">Entry Price ($)</label>
                    <input
                      type="number"
                      value={riskEntryPrice}
                      onChange={(e) => setRiskEntryPrice(Number(e.target.value))}
                      className="w-full bg-[#030308]/40 border border-white/5 text-xs text-white rounded-xl py-2.5 px-3.5 font-mono focus:outline-none focus:border-cyan-400/40"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-gray-500 font-mono uppercase font-bold mb-1.5">Stop Loss ($)</label>
                    <input
                      type="number"
                      value={riskStopLoss}
                      onChange={(e) => setRiskStopLoss(Number(e.target.value))}
                      className="w-full bg-[#030308]/40 border border-white/5 text-xs text-red-400 rounded-xl py-2.5 px-3.5 font-mono focus:outline-none focus:border-red-500/40"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-gray-500 font-mono uppercase font-bold mb-1.5">Target Price ($)</label>
                    <input
                      type="number"
                      value={riskTargetPrice}
                      onChange={(e) => setRiskTargetPrice(Number(e.target.value))}
                      className="w-full bg-[#030308]/40 border border-white/5 text-xs text-emerald-400 rounded-xl py-2.5 px-3.5 font-mono focus:outline-none focus:border-emerald-500/40"
                    />
                  </div>

                </div>

              </div>
            </div>

            {/* Right formula results panel */}
            <div className="bg-[#020205]/60 border border-white/5 rounded-3xl p-6 backdrop-blur-xl flex flex-col justify-between">
              
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-bold tracking-wider font-mono text-white uppercase">Position Size & Risk Summary</h3>
                  <p className="text-[10px] text-gray-500 font-mono uppercase tracking-widest mt-0.5">Calculated parameters based on equity safeguards</p>
                </div>

                {/* Main position display */}
                <div className="bg-[#030308]/50 border border-white/5 p-4 rounded-2xl relative overflow-hidden flex flex-col items-center text-center justify-center py-6">
                  <div className="absolute top-2 right-3 font-mono text-[8px] text-[#22d3ee] tracking-widest uppercase">Falcon System Target</div>
                  
                  <span className="text-[9px] text-gray-500 uppercase tracking-widest font-mono mb-1">Recommended Position size</span>
                  <span className="text-3xl font-mono font-black text-cyan-400 tracking-tight glow-text leading-none select-none">
                    {positionUnits.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                  </span>
                  <span className="text-[10px] text-gray-400 font-mono mt-1 uppercase">Units or Shares</span>
                  
                  <div className="w-full border-t border-white/5 mt-4 pt-3 flex justify-around text-center">
                    <div>
                      <span className="block text-[8px] text-gray-500 uppercase font-mono">Position worth value</span>
                      <span className="text-xs font-mono font-bold text-white">${totalPositionSizeValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="border-l border-white/5 h-6"></div>
                    <div>
                      <span className="block text-[8px] text-gray-500 uppercase font-mono">Total stop loss risk</span>
                      <span className="text-xs font-mono font-bold text-red-400">${riskAmountCash.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>

                {/* Sub parameters breakdown */}
                <div className="grid grid-cols-2 gap-4">
                  
                  <div className="bg-[#030308]/30 border border-white/5 p-3 rounded-xl">
                    <span className="block text-[8.5px] text-gray-550 uppercase font-mono mb-0.5">Potential Profit Target</span>
                    <span className="text-sm font-mono font-bold text-emerald-400">+${rewardAmountCash.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                    <span className="block text-[8px] text-gray-500 font-mono mt-0.5">+{parseFloat(((rewardAmountCash / riskAccountSize) * 100).toFixed(2))}% Equity gain</span>
                  </div>

                  <div className="bg-[#030308]/30 border border-white/5 p-3 rounded-xl flex flex-col justify-between">
                    <div>
                      <span className="block text-[8.5px] text-gray-550 uppercase font-mono mb-0.5">Risk-to-Reward Ratio</span>
                      <span className={`text-sm font-mono font-bold ${riskToRewardRatio >= 2 ? 'text-cyan-400' : riskToRewardRatio >= 1 ? 'text-amber-400' : 'text-red-400'}`}>
                        1 : {riskToRewardRatio}
                      </span>
                    </div>
                    <span className="block text-[8px] text-gray-500 font-mono">
                      {riskToRewardRatio >= 2 ? 'Highly Optimal ratio' : 'Sub-optimal Risk Setup'}
                    </span>
                  </div>

                </div>

                {/* Visual Ratio Bar Chart */}
                <div className="bg-[#030308]/30 border border-white/5 p-4 rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between text-[9px] font-mono text-gray-400">
                    <span>RISK: ${riskAmountCash} (1 UNIT)</span>
                    <span>REWARD: ${rewardAmountCash} ({riskToRewardRatio} UNITS)</span>
                  </div>
                  <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden flex">
                    <div className="h-full bg-red-500" style={{ width: `${Math.min(100, (1 / (1 + riskToRewardRatio)) * 100)}%` }}></div>
                    <div className="h-full bg-emerald-500 flex-1"></div>
                  </div>
                </div>

              </div>

              {/* Safety notification card */}
              <div className="bg-[#ef4444]/5 border border-red-500/10 p-3.5 rounded-2xl flex gap-2.5 mt-5">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 select-none mt-0.5" />
                <p className="text-[10px] leading-relaxed text-red-300">
                  <strong>PRO-INTEGRITY ADVICE:</strong> If position size value exceeds your account size, leverage is being simulated. 
                  Leverage multiplies both gains and losses. Standard mechanics state risking more than 2% of total equity on any single trading asset constitutes high speculative exposure list.
                </p>
              </div>

            </div>
          </motion.div>
        )}

        {/* TAB 3: TRADE JOURNAL & PERFORMANCE ANALYTICS */}
        {traderTab === 'journal' && (
          <motion.div
            key="journal"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Top Stats Overview Section */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              
              <div className="bg-[#020205]/60 border border-white/5 p-4 rounded-2xl backdrop-blur-xl">
                <span className="block text-[9px] text-gray-500 uppercase tracking-widest font-mono">Your Net Profit / Loss</span>
                <span className={`text-xl font-mono font-bold block mt-1 ${netEarnings >= 0 ? 'text-emerald-400 glow-text' : 'text-red-400'}`}>
                  {netEarnings >= 0 ? '+' : ''}${netEarnings.toLocaleString()}
                </span>
                <span className="text-[9px] text-gray-550 font-mono">Computed based on trade logs</span>
              </div>

              <div className="bg-[#020205]/60 border border-white/5 p-4 rounded-2xl backdrop-blur-xl">
                <span className="block text-[9px] text-gray-500 uppercase tracking-widest font-mono">Dynamic Win Rate</span>
                <span className="text-xl font-mono font-bold block mt-1 text-cyan-400">
                  {winRate}%
                </span>
                <span className="text-[9px] text-gray-550 font-mono">{totalWins} Wins / {totalLosses} Losses ({trades.length} Trades)</span>
              </div>

              <div className="bg-[#020205]/60 border border-white/5 p-4 rounded-2xl backdrop-blur-xl">
                <span className="block text-[9px] text-gray-500 uppercase tracking-widest font-mono">Average Win Size</span>
                <span className="text-xl font-mono font-bold block mt-1 text-emerald-400">
                  ${Math.round(avgWin)}
                </span>
                <span className="text-[9px] text-gray-550 font-mono">Gross profit metric</span>
              </div>

              <div className="bg-[#020205]/60 border border-white/5 p-4 rounded-2xl backdrop-blur-xl">
                <span className="block text-[9px] text-gray-500 uppercase tracking-widest font-mono">Profit Factor Rating</span>
                <span className="text-xl font-mono font-bold block mt-1 text-indigo-400">
                  {profitFactor}
                </span>
                <span className="text-[9px] text-gray-550 font-mono">Ratios of wins vs gross losses</span>
              </div>

            </div>

            {/* Middle Section: Equity Curve Line Grid & Add Trade form toggle */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Curve chart */}
              <div className="lg:col-span-2 bg-[#020205]/60 border border-white/5 rounded-3xl p-6 backdrop-blur-xl">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold tracking-wider font-mono text-white uppercase font-sans">SaaS Cumulative Equity Growth</h3>
                    <p className="text-[10px] text-gray-500 font-mono uppercase tracking-widest mt-0.5">Vector charting starting from $10,000 equity indexer</p>
                  </div>
                  <TrendingUp className="w-4 h-4 text-cyan-400" />
                </div>

                <div className="h-44 w-full pr-12 relative flex items-center justify-center">
                  {trades.length > 0 ? renderEquityCurve() : (
                    <div className="text-center text-xs font-mono text-gray-600">AWAITING SYSTEM DATA POINTS FOR VECTOR SYNTHESIS</div>
                  )}
                </div>
              </div>

              {/* Add Trade Card */}
              <div className="bg-[#020205]/60 border border-white/5 rounded-3xl p-6 backdrop-blur-xl flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-bold tracking-wider font-mono text-white uppercase">Maintain Trade records</h3>
                  <p className="text-[10px] text-gray-500 font-mono uppercase tracking-widest mt-0.5">Commit execution results to system audit</p>
                </div>

                {!showAddTrade ? (
                  <button
                    onClick={() => setShowAddTrade(true)}
                    className="w-full mt-6 bg-[#22d3ee]/10 hover:bg-[#22d3ee]/20 duration-300 border border-cyan-400/20 py-3.5 rounded-2xl text-xs font-mono font-bold tracking-wider text-cyan-300 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>RECORD NEW EXECUTION</span>
                  </button>
                ) : (
                  <button
                    onClick={() => setShowAddTrade(false)}
                    className="w-full mt-6 bg-white/[0.03] border border-white/5 py-2.5 rounded-2xl text-xs font-mono tracking-wider text-gray-400 hover:text-white transition-colors cursor-pointer"
                  >
                    <span>CANCEL ENTRY FORM</span>
                  </button>
                )}

                <div className="mt-4 text-[9px] leading-relaxed text-gray-500 leading-normal">
                  Chronicle entry parameters, direction, exit levels, emotional states, and strategy templates to output peak cognitive performance summaries over historical vectors.
                </div>
              </div>

            </div>

            {/* Add trade form section popup container if toggled */}
            {showAddTrade && (
              <form onSubmit={handleAddTradeSubmit} className="bg-[#0b0c15]/80 border border-cyan-400/25 p-6 rounded-3xl space-y-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <span className="text-xs font-bold font-mono tracking-widest text-[#22d3ee] uppercase">Execution Log Form</span>
                  <span className="text-[8.5px] font-mono text-gray-500">MANDATORY SYSTEM RECORD MATRIX</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  
                  <div>
                    <label className="block text-[9px] text-gray-400 mb-1.5 uppercase tracking-widest font-mono font-bold">Symbol Identifier</label>
                    <input
                      type="text"
                      required
                      placeholder="BTC/USDT or AAPL"
                      value={journalSymbol}
                      onChange={(e) => setJournalSymbol(e.target.value)}
                      className="w-full bg-[#030308]/40 border border-white/5 text-xs text-white rounded-xl py-2.5 px-3 uppercase font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] text-gray-400 mb-1.5 uppercase tracking-widest font-mono font-bold">Direction Handle</label>
                    <select
                      value={journalDirection}
                      onChange={(e) => setJournalDirection(e.target.value as 'LONG' | 'SHORT')}
                      className="w-full bg-[#030308]/40 border border-white/5 text-xs text-white rounded-xl py-2.5 px-2.5 font-mono cursor-pointer"
                    >
                      <option value="LONG">LONG (Buy setup)</option>
                      <option value="SHORT">SHORT (Sell setup)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[9px] text-gray-400 mb-1.5 uppercase tracking-widest font-mono font-bold">Entry Price Match ($)</label>
                    <input
                      type="number"
                      required
                      step="any"
                      placeholder="e.g. 64200"
                      value={journalEntryPrice || ''}
                      onChange={(e) => setJournalEntryPrice(Number(e.target.value))}
                      className="w-full bg-[#030308]/40 border border-white/5 text-xs text-white rounded-xl py-2.5 px-3 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] text-gray-400 mb-1.5 uppercase tracking-widest font-mono font-bold">Exit Price Match ($)</label>
                    <input
                      type="number"
                      required
                      step="any"
                      placeholder="e.g. 66800"
                      value={journalExitPrice || ''}
                      onChange={(e) => setJournalExitPrice(Number(e.target.value))}
                      className="w-full bg-[#030308]/40 border border-white/5 text-xs text-white rounded-xl py-2.5 px-3 font-mono"
                    />
                  </div>

                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  
                  <div>
                    <label className="block text-[9px] text-gray-400 mb-1.5 uppercase tracking-widest font-mono font-bold">SaaS Net P/L Return ($)</label>
                    <input
                      type="number"
                      required
                      step="any"
                      placeholder="Positive or Negative profit"
                      value={journalAmount || ''}
                      onChange={(e) => setJournalAmount(Number(e.target.value))}
                      className="w-full bg-[#030308]/40 border border-white/5 text-xs text-white rounded-xl py-2.5 px-3 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] text-gray-400 mb-1.5 uppercase tracking-widest font-mono font-bold">Used Technical Strategy</label>
                    <select
                      value={journalStrategy}
                      onChange={(e) => setJournalStrategy(e.target.value)}
                      className="w-full bg-[#030308]/40 border border-white/5 text-xs text-white rounded-xl py-2.5 px-2.5 font-mono cursor-pointer"
                    >
                      <option value="Trend Pullback">Trend Pullback zone</option>
                      <option value="Breakout Order block">Breakout Order block</option>
                      <option value="Support Resistance Bounce">Support Bounce zone</option>
                      <option value="Dynamic EMA Cross">Dual EMA Crossover</option>
                      <option value="Imbalance Gap Fill">Imbalance gap filling</option>
                      <option value="Vocal AI Signal Setup">Falcon AI neural target</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[9px] text-gray-400 mb-1.5 uppercase tracking-widest font-mono font-bold">Emotional Spectrum State</label>
                    <select
                      value={journalEmotion}
                      onChange={(e) => setJournalEmotion(e.target.value)}
                      className="w-full bg-[#030308]/40 border border-white/5 text-xs text-white rounded-xl py-2.5 px-2.5 font-mono cursor-pointer"
                    >
                      <option value="Calm & Disciplined">Calm & Disciplined</option>
                      <option value="Excited & Optimistic">Excited & Optimistic</option>
                      <option value="Anxious & Hyperactive">Anxious & Hyperactive</option>
                      <option value="FOMO (Fear of Missing Out)">FOMO (Fear of Missing Out)</option>
                      <option value="Revenge-Trading Fury">Revenge-Trading Fury</option>
                      <option value="Apathetic / Tired">Apathetic / Tired</option>
                    </select>
                  </div>

                </div>

                <div>
                  <label className="block text-[9px] text-gray-400 mb-1.5 uppercase tracking-widest font-mono font-bold">Lessons Learned & Psychological Directives</label>
                  <textarea
                    rows={3}
                    placeholder="Enter what went right, what went wrong, and rules for future setups..."
                    value={journalLessons}
                    onChange={(e) => setJournalLessons(e.target.value)}
                    className="w-full bg-[#030308]/40 border border-white/5 text-xs text-white rounded-xl py-2.5 px-3 font-sans focus:outline-none"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="submit"
                    className="bg-cyan-500/10 hover:bg-cyan-400/20 border border-cyan-400/20 font-bold font-mono tracking-widest text-[#22d3ee] px-6 py-2.5 rounded-xl text-xs uppercase cursor-pointer"
                  >
                    COMMIT EXECUTION
                  </button>
                </div>
              </form>
            )}

            {/* Historical Trade list table */}
            <div className="bg-[#020205]/60 border border-white/5 rounded-3xl p-6 backdrop-blur-xl">
              <div>
                <h3 className="text-sm font-bold tracking-wider font-mono text-white uppercase">Historical Trade Journal Logs</h3>
                <p className="text-[10px] text-gray-500 font-mono uppercase tracking-widest mt-0.5">Database trace output</p>
              </div>

              <div className="overflow-x-auto mt-6">
                <table className="w-full text-left text-xs min-w-[700px]">
                  <thead>
                    <tr className="border-b border-white/5 text-gray-400 text-[10px] font-mono uppercase tracking-wider">
                      <th className="pb-3 pl-2">Execution Date</th>
                      <th className="pb-3">Asset</th>
                      <th className="pb-3">Bias Direction</th>
                      <th className="pb-3">Entry level</th>
                      <th className="pb-3">Exit level</th>
                      <th className="pb-3 text-right pr-6">P/L Earnings ($)</th>
                      <th className="pb-3">Applied Strategy</th>
                      <th className="pb-3">Emotional Vector</th>
                      <th className="pb-3 pr-2 text-right">Delete Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-mono text-[11.5px] text-gray-300">
                    {trades.map((t) => (
                      <tr key={t.id} className="hover:bg-white/[0.01] transition-color-all duration-150">
                        <td className="py-3.5 pl-2">{t.date}</td>
                        <td className="py-3.5 font-bold text-white">{t.symbol}</td>
                        <td className="py-3.5">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${t.direction === 'LONG' ? 'text-cyan-400 bg-cyan-500/10 border-cyan-400/10' : 'text-amber-400 bg-amber-500/10 border-amber-400/10'}`}>
                            {t.direction}
                          </span>
                        </td>
                        <td className="py-3.5">${t.entryPrice.toLocaleString()}</td>
                        <td className="py-3.5">${t.exitPrice.toLocaleString()}</td>
                        <td className={`py-3.5 font-bold text-right pr-6 ${t.amount >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {t.amount >= 0 ? '+' : ''}${t.amount.toLocaleString()}
                        </td>
                        <td className="py-3.5 font-sans">{t.strategy}</td>
                        <td className="py-3.5 text-gray-400 font-sans">{t.emotion}</td>
                        <td className="py-3.5 text-right pr-2">
                          <button
                            onClick={() => handleDeleteTrade(t.id)}
                            className="p-1 rounded-lg hover:bg-red-500/15 text-gray-600 hover:text-red-400 transition-colors cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {trades.length === 0 && (
                      <tr>
                        <td colSpan={9} className="text-center py-6 text-gray-500 font-mono">NO RECORD CELLS MATCH ACTIVE FILTER</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </motion.div>
        )}

        {/* TAB 4: TRADING EDUCATION HUB */}
        {traderTab === 'education' && (
          <motion.div
            key="education"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Header Path selectors */}
            <div className="bg-[#020205]/60 border border-white/5 rounded-3xl p-6 backdrop-blur-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h3 className="text-sm font-bold tracking-wider font-mono text-white uppercase">Trading Education Hub</h3>
                  <p className="text-[10px] text-gray-500 font-mono uppercase tracking-widest mt-0.5">Structured visual guides across multiple spec classes</p>
                </div>

                <div className="flex gap-1.5 bg-[#030308]/40 border border-white/5 p-1 rounded-xl w-fit">
                  {[
                    { id: 'beginner', label: '🔰 BEGINNER PATH' },
                    { id: 'intermediate', label: '📈 INTERMEDIATE PATH' },
                    { id: 'advanced', label: '🧠 ADVANCED PATH' }
                  ].map((btn) => (
                    <button
                      key={btn.id}
                      onClick={() => setEduPath(btn.id as any)}
                      className={`text-[9.5px] font-mono tracking-wider px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${eduPath === btn.id ? 'bg-[#22d3ee]/10 text-cyan-400 border border-cyan-400/20' : 'text-gray-500 hover:text-white'}`}
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Education syllabus units depending on path selectors */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-white/5 pt-6">
                
                {eduPath === 'beginner' && (
                  <>
                    <div className="bg-white/[0.01] border border-white/5 p-5 rounded-2xl space-y-3">
                      <span className="text-[9.5px] font-mono font-bold tracking-widest text-[#22d3ee] uppercase bg-cyan-950/40 border border-cyan-400/10 px-2 py-0.5 rounded-full">Unit 1.1</span>
                      <h4 className="text-sm font-bold text-white tracking-tight">Market Structure & Orders Mechanics</h4>
                      <p className="text-xs text-gray-400 leading-relaxed font-sans">
                        Market orders fill instantly at the best available bidding/asking price. Limit orders specify an exact price condition or better and populate the liquidity order book. Stop orders are triggers that execute when specified levels are crossed, protecting trade structures.
                      </p>
                    </div>

                    <div className="bg-white/[0.01] border border-white/5 p-5 rounded-2xl space-y-3">
                      <span className="text-[9.5px] font-mono font-bold tracking-widest text-[#22d3ee] uppercase bg-cyan-950/40 border border-cyan-400/10 px-2 py-0.5 rounded-full">Unit 1.2</span>
                      <h4 className="text-sm font-bold text-white tracking-tight">Introduction to Candlestick Formations</h4>
                      <p className="text-xs text-gray-400 leading-relaxed font-sans">
                        Each candle describes asset price fluctuations over a given timeframe (D1, H4, M15). A green candle implies a rising close, red is a falling close. Shadows (wicks) tell of high supply rejection or demand rejection at outer bounds, offering stellar visual clues.
                      </p>
                    </div>

                    <div className="bg-white/[0.01] border border-white/5 p-5 rounded-2xl space-y-3">
                      <span className="text-[9.5px] font-mono font-bold tracking-widest text-[#22d3ee] uppercase bg-cyan-950/40 border border-cyan-400/10 px-2 py-0.5 rounded-full">Unit 1.3</span>
                      <h4 className="text-sm font-bold text-white tracking-tight">Primary Risk Management Directives</h4>
                      <p className="text-xs text-gray-400 leading-relaxed font-sans">
                        The ultimate trading directive is preservation of capital. A trader never Risks more than a small fraction (e.g., 1%) of total available account capital on any individual speculation. Without standard mechanical risk guards, ruin is statically guaranteed.
                      </p>
                    </div>

                    {/* Interactive quiz */}
                    <div className="bg-[#0b0c15]/60 border border-cyan-400/15 p-5 rounded-2xl space-y-4">
                      <div className="flex items-center gap-2">
                        <Award className="w-5 h-5 text-cyan-400" />
                        <h4 className="text-xs font-mono font-bold text-white uppercase tracking-wider">Concept Check 1.1</h4>
                      </div>
                      <p className="text-xs text-slate-100 font-bold leading-snug">What is the functional difference of a limit order vs market order?</p>
                      
                      <div className="space-y-2 text-[11px] font-sans">
                        {[
                          { index: 0, text: "A market order guarantees filling price, while a limit guarantees execution priority." },
                          { index: 1, text: "A limit order guarantees price constraints but not execution, whereas a market order fills immediately at current auction price." },
                          { index: 2, text: "Limit orders exist purely to exit losing structures, whereas markets initiate entries." }
                        ].map((opt) => {
                          const isSelected = quizSelection['q1'] === opt.index;
                          const score = quizScore['q1'];
                          return (
                            <div
                              key={opt.index}
                              onClick={() => handleSelectQuizOption('q1', opt.index, 1)}
                              className={`p-3 rounded-xl border transition-all cursor-pointer leading-relaxed ${isSelected ? (score === 1 ? 'border-emerald-500 bg-emerald-500/5 text-emerald-300' : 'border-red-500 bg-red-500/5 text-red-300') : 'border-white/5 bg-black/20 text-gray-400 hover:border-white/10 hover:text-white'}`}
                            >
                              {opt.text}
                            </div>
                          );
                        })}
                      </div>
                      {quizScore['q1'] === 1 && (
                        <p className="text-[10px] text-emerald-400 font-mono">✓ Correct! Limit order guarantees the safety threshold price bounds.</p>
                      )}
                    </div>
                  </>
                )}

                {eduPath === 'intermediate' && (
                  <>
                    <div className="bg-white/[0.01] border border-white/5 p-5 rounded-2xl space-y-3">
                      <span className="text-[9.5px] font-mono font-bold tracking-widest text-indigo-400 uppercase bg-indigo-950/40 border border-indigo-400/10 px-2 py-0.5 rounded-full">Unit 2.1</span>
                      <h4 className="text-sm font-bold text-white tracking-tight">Fibonacci zones & Support Polarity Flip</h4>
                      <p className="text-xs text-gray-400 leading-relaxed font-sans">
                        Retracement intervals of 0.618 and 0.50 represent golden ratios where institutional pricing engines hunt for pullback entries. Polarity flip describes old resistance breaking and transitioning into a new robust baseline support floor.
                      </p>
                    </div>

                    <div className="bg-white/[0.01] border border-white/5 p-5 rounded-2xl space-y-3">
                      <span className="text-[9.5px] font-mono font-bold tracking-widest text-indigo-400 uppercase bg-indigo-950/40 border border-indigo-400/10 px-2 py-0.5 rounded-full">Unit 2.2</span>
                      <h4 className="text-sm font-bold text-white tracking-tight">Fundamental Catalyst assessment (CPI/FOMC)</h4>
                      <p className="text-xs text-gray-400 leading-relaxed font-sans">
                        Central bank policies and monetary rates dictate macro trends. Interest rate adjustments steer yield grids and institutional hedging vectors. CPI releases represent inflationary vectors, steering aggressive rate projection spikes.
                      </p>
                    </div>

                    <div className="bg-white/[0.01] border border-white/5 p-5 rounded-2xl space-y-3">
                      <span className="text-[9.5px] font-mono font-bold tracking-widest text-indigo-400 uppercase bg-indigo-950/40 border border-indigo-400/10 px-2 py-0.5 rounded-full">Unit 2.3</span>
                      <h4 className="text-sm font-bold text-white tracking-tight">The Psychology Paradox: FOMO to Discipline</h4>
                      <p className="text-xs text-gray-400 leading-relaxed font-sans">
                        Emotional bias kills traders. Chasing price pumps triggers late entries at extreme highs, while panic-selling can exit assets prematurely at local bottoms. Disciplined traders view execution purely as an exercise in probability vectors.
                      </p>
                    </div>

                    {/* Interactive quiz */}
                    <div className="bg-[#0b0c15]/60 border border-indigo-500/15 p-5 rounded-2xl space-y-4">
                      <div className="flex items-center gap-2">
                        <Award className="w-5 h-5 text-indigo-400" />
                        <h4 className="text-xs font-mono font-bold text-white uppercase tracking-wider">Concept Check 2.1</h4>
                      </div>
                      <p className="text-xs text-slate-100 font-bold leading-snug">What is a broken resistance block switching into a support level referred to as?</p>
                      
                      <div className="space-y-2 text-[11px] font-sans">
                        {[
                          { index: 0, text: "A Liquidity Void block rejection flip." },
                          { index: 1, text: "A Technical Polarity Flip zone." },
                          { index: 2, text: "A Fibonacci retracement cluster." }
                        ].map((opt) => {
                          const isSelected = quizSelection['q2'] === opt.index;
                          const score = quizScore['q2'];
                          return (
                            <div
                              key={opt.index}
                              onClick={() => handleSelectQuizOption('q2', opt.index, 1)}
                              className={`p-3 rounded-xl border transition-all cursor-pointer leading-relaxed ${isSelected ? (score === 1 ? 'border-emerald-500 bg-emerald-500/5 text-emerald-300' : 'border-red-500 bg-red-500/5 text-red-300') : 'border-white/5 bg-black/20 text-gray-400 hover:border-white/10 hover:text-white'}`}
                            >
                              {opt.text}
                            </div>
                          );
                        })}
                      </div>
                      {quizScore['q2'] === 1 && (
                        <p className="text-[10px] text-emerald-400 font-mono">✓ Correct! Resistance breaks turn to floor boards inside polarities.</p>
                      )}
                    </div>
                  </>
                )}

                {eduPath === 'advanced' && (
                  <>
                    <div className="bg-white/[0.01] border border-white/5 p-5 rounded-2xl space-y-3">
                      <span className="text-[9.5px] font-mono font-bold tracking-widest text-purple-400 uppercase bg-purple-950/40 border border-purple-400/10 px-2 py-0.5 rounded-full">Unit 3.1</span>
                      <h4 className="text-sm font-bold text-white tracking-tight">Smart Money Concepts & Order Blocks</h4>
                      <p className="text-xs text-gray-400 leading-relaxed font-sans">
                        Order Blocks represent zones where massive institutional orders were left unmatched or opened prior to aggressive price expansions. These areas wait to be mitigated, acting as severe gravity fields that pull price back to execute pending orders.
                      </p>
                    </div>

                    <div className="bg-white/[0.01] border border-white/5 p-5 rounded-2xl space-y-3">
                      <span className="text-[9.5px] font-mono font-bold tracking-widest text-purple-400 uppercase bg-purple-950/40 border border-purple-400/10 px-2 py-0.5 rounded-full">Unit 3.2</span>
                      <h4 className="text-sm font-bold text-white tracking-tight">Liquidity sweeps & Stop Hunts</h4>
                      <p className="text-xs text-gray-400 leading-relaxed font-sans">
                        Speculators leave stop-loss orders tucked neatly below double bottoms or above double highs. Large automated trading entities inject capital spikes specifically to trigger these stops, capturing liquidity before reversing direction.
                      </p>
                    </div>

                    <div className="bg-white/[0.01] border border-white/5 p-5 rounded-2xl space-y-3">
                      <span className="text-[9.5px] font-mono font-bold tracking-widest text-purple-400 uppercase bg-purple-950/40 border border-purple-400/10 px-2 py-0.5 rounded-full">Unit 3.3</span>
                      <h4 className="text-sm font-bold text-white tracking-tight">The Kelly Criterion formula model</h4>
                      <p className="text-xs text-gray-400 leading-relaxed font-sans">
                        Kelly sizing models mathematically maximize long-term equity growth by basing capital allocations on win rates and risk:reward ratios: f = (bp - q) / b. Highly advanced, this model steers elite hedging desks.
                      </p>
                    </div>

                    {/* Interactive quiz */}
                    <div className="bg-[#0b0c15]/60 border border-purple-500/15 p-5 rounded-2xl space-y-4">
                      <div className="flex items-center gap-2">
                        <Award className="w-5 h-5 text-purple-400" />
                        <h4 className="text-xs font-mono font-bold text-white uppercase tracking-wider">Concept Check 3.1</h4>
                      </div>
                      <p className="text-xs text-slate-100 font-bold leading-snug">What describes an institutional liquidity capture setup targeting double highs before aggressive reversals?</p>
                      
                      <div className="space-y-2 text-[11px] font-sans">
                        {[
                          { index: 0, text: "An automated Exponential Moving Average crossing." },
                          { index: 1, text: "A standard support floor breakout." },
                          { index: 2, text: "A Liquidity sweep / Buy-side stop hunt zone." }
                        ].map((opt) => {
                          const isSelected = quizSelection['q3'] === opt.index;
                          const score = quizScore['q3'];
                          return (
                            <div
                              key={opt.index}
                              onClick={() => handleSelectQuizOption('q3', opt.index, 2)}
                              className={`p-3 rounded-xl border transition-all cursor-pointer leading-relaxed ${isSelected ? (score === 1 ? 'border-emerald-500 bg-emerald-500/5 text-emerald-300' : 'border-red-500 bg-red-500/5 text-red-300') : 'border-white/5 bg-black/20 text-gray-400 hover:border-white/10 hover:text-white'}`}
                            >
                              {opt.text}
                            </div>
                          );
                        })}
                      </div>
                      {quizScore['q3'] === 1 && (
                        <p className="text-[10px] text-emerald-400 font-mono">✓ Correct! Cleansing double highs extracts dry powder liquidity bounds.</p>
                      )}
                    </div>
                  </>
                )}

              </div>
            </div>
          </motion.div>
        )}

        {/* TAB 5: AI TRADE REVIEW SYSTEM */}
        {traderTab === 'review' && (
          <motion.div
            key="review"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            {/* Left input desk */}
            <div className="lg:col-span-2 bg-[#020205]/60 border border-white/5 rounded-3xl p-6 backdrop-blur-xl space-y-4">
              <div>
                <h3 className="text-sm font-bold tracking-wider font-mono text-white uppercase">Neural Trade Critique Panel</h3>
                <p className="text-[10px] text-gray-500 font-mono uppercase tracking-widest mt-0.5">Describe setups, triggers, stop logic, and exit reasons for deep machine review</p>
              </div>

              <div className="space-y-3">
                <textarea
                  rows={8}
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  placeholder="I bought SOL/USDT at $168 breakout on the 4H charts, placed a trailing stop below the candle wick at $164. Sell target was configured at $176 resistance but I panicked and executed an early dump exit at $171.20 because volume stagnated..."
                  className="w-full bg-[#030308]/40 border border-white/5 text-xs text-white rounded-xl p-4 placeholder-gray-600 focus:outline-none focus:border-cyan-400/40 font-sans leading-relaxed"
                />

                <div className="flex justify-between items-center flex-wrap gap-2.5">
                  <span className="text-[10px] text-gray-500 font-mono font-semibold uppercase tracking-widest leading-none">RECOMMENDED EDUCATION TEMPLATES OR CLI EXAMPLES</span>
                  <button
                    onClick={runAiTradeReview}
                    disabled={reviewLoading || !reviewText.trim()}
                    className="w-full sm:w-auto bg-cyan-500/10 hover:bg-cyan-400/20 duration-300 border border-cyan-400/20 shadow-[0_0_15px_rgba(34,211,238,0.1)] px-6 py-2.5 rounded-xl text-xs font-mono font-bold tracking-wider text-cyan-300 transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {reviewLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>PROCESSING VECTORS...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>RUN NEURAL REVIEW</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Sample loader row */}
              <div className="pt-2 border-t border-white/5 space-y-2">
                <p className="text-[9px] text-[#22d3ee] font-mono font-bold uppercase tracking-widest">Select sample case telemetry:</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleAutoFillReviewSample("LONG BTC: Entered long at $65,500 following a bullish engulfing on the 1H support zone. Set stop loss at $64,800. Exited at target $67,200 but felt highly anxious because of floating drawdown under consolidation phases.")}
                    className="text-[9.5px] font-sans bg-white/[0.02] border border-white/5 hover:border-cyan-400/25 transition-colors duration-150 px-3 py-1.5 rounded-xl text-gray-400 hover:text-white cursor-pointer"
                  >
                    🚀 Bullish Engulfing Long SOL/BTC
                  </button>
                  <button
                    onClick={() => handleAutoFillReviewSample("SHORT TSLA: Took short at $182 following a break of structure on the daily trendline. No stop loss, plan was to inspect screens. Price pumped to $186 and I revenge-averaged down, finally exiting in major loss at $188.")}
                    className="text-[9.5px] font-sans bg-white/[0.02] border border-white/5 hover:border-cyan-400/25 transition-colors duration-150 px-3 py-1.5 rounded-xl text-gray-400 hover:text-white cursor-pointer"
                  >
                    ⚠️ Revenge Trade (No Stop Loss)
                  </button>
                </div>
              </div>

            </div>

            {/* Right side output screen */}
            <div className="bg-[#020205]/60 border border-white/5 rounded-3xl p-6 backdrop-blur-xl flex flex-col justify-between">
              
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-bold tracking-wider font-mono text-white uppercase">AI Vector Analysis Feed</h3>
                  <p className="text-[10px] text-gray-500 font-mono uppercase tracking-widest mt-0.5">Automated critiques on strategy wicks</p>
                </div>

                {aiReviewOutput ? (
                  <div className="bg-[#030308]/50 border border-white/5 p-4 rounded-2xl text-[11.5px] leading-relaxed space-y-3 font-sans max-h-[350px] overflow-y-auto custom-scrollbar text-slate-200">
                    <div className="flex items-center justify-between border-b border-white/5 pb-2">
                      <span className="text-[9px] font-mono tracking-widest text-[#22d3ee] uppercase font-bold">Falcon Diagnostic Matrix</span>
                      <span className="text-[8px] font-mono text-gray-500">SYSTEM COGNITION ON EXECUTION</span>
                    </div>
                    
                    <div className="whitespace-pre-wrap leading-relaxed mt-1">
                      {aiReviewOutput}
                    </div>
                  </div>
                ) : (
                  <div className="bg-[#020205] border border-dashed border-white/5 rounded-2xl p-8 text-center text-gray-500 text-xs">
                    <MessageSquare className="w-8 h-8 text-cyan-400/20 mx-auto select-none" />
                    <p className="mt-4 font-mono uppercase tracking-wider text-[9px]">Awaiting Diagnosis Trigger</p>
                    <p className="text-gray-600 mt-1">Write your execution steps or load one of the samples, then click Run Neural Review to compile feedback via Gemini AI.</p>
                  </div>
                )}
              </div>

              {/* Safety notice board */}
              <div className="bg-[#f59e0b]/5 border border-amber-500/10 p-3 rounded-2xl flex gap-2.5 mt-4">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 select-none mt-0.5" />
                <p className="text-[9.5px] leading-relaxed text-amber-300">
                  <strong>SYSTEM CRITIQUE RULES:</strong> Machine audits identify psychological leaks, structural breaches, or stop placement issues. No review provides licensed guidance. Standard rules mandate consistent risk parameters.
                </p>
              </div>

            </div>
          </motion.div>
        )}

      </AnimatePresence>

    </div>
  );
}

// Glowing Pulse Globe Icon for Market Analysis Fallback
function PulseGlobeIcon() {
  return (
    <div className="relative w-12 h-12 mx-auto flex items-center justify-center">
      <div className="absolute inset-0 rounded-full border border-dashed border-cyan-400/40 animate-[spin_12s_linear_infinite]"></div>
      <div className="absolute inset-2 rounded-full border border-cyan-500/20 animate-ping"></div>
      <Compass className="w-5 h-5 text-cyan-400 relative z-10" />
    </div>
  );
}
