import { useState, useEffect } from 'react';
import LandingPage from './components/LandingPage';
import DashboardView from './components/DashboardView';
import AuthModal from './components/AuthModal';
import { User } from './types';
import { Sparkles, X } from 'lucide-react';
import FalconLogo from './components/FalconLogo';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isAppLoading, setIsAppLoading] = useState(true);

  // Parse cached user sessions on initial load & verify token validity
  useEffect(() => {
    const cachedUser = localStorage.getItem('falcon_user');
    const cachedToken = localStorage.getItem('falcon_token');
    
    const initializeAuth = async () => {
      if (cachedUser && cachedToken) {
        try {
          setUser(JSON.parse(cachedUser));
          
          // Verify with server in the background
          const res = await fetch('/api/auth/session', {
            headers: { 'Authorization': `Bearer ${cachedToken}` }
          });
          
          if (res.status === 401) {
            console.warn("Session expired or corrupt. Resetting auth.");
            handleLogout();
          } else if (res.ok) {
            const data = await res.json();
            if (data.success && data.user) {
              localStorage.setItem('falcon_user', JSON.stringify(data.user));
              setUser(data.user);
            }
          }
        } catch (err) {
          console.warn("Failed checking session status:", err);
        }
      }
      setIsAppLoading(false);
    };

    initializeAuth();
  }, []);

  const handleAuthSuccess = (authenticatedUser: User) => {
    setUser(authenticatedUser);
    setShowAuthModal(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('falcon_user');
    localStorage.removeItem('falcon_token');
    setUser(null);
  };

  if (isAppLoading) {
    return (
      <div id="app-preloader" className="min-h-screen bg-[#030308] text-white flex flex-col items-center justify-center p-6 select-none relative overflow-hidden">
        {/* Cinematic pulsating backgrounds */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-cyan-500/10 rounded-full blur-[110px] pointer-events-none animate-pulse-slow"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-purple-500/10 rounded-full blur-[130px] pointer-events-none"></div>

        <div className="text-center space-y-6 relative z-10">
          <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
            {/* Pulsating system ring */}
            <div className="absolute inset-0 rounded-full border-2 border-dashed border-cyan-400/40 animate-[spin_5s_linear_infinite]"></div>
            <FalconLogo className="w-9 h-9 text-cyan-400 relative z-10 animate-pulse" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-black tracking-widest bg-gradient-to-r from-white via-gray-200 to-gray-500 bg-clip-text text-transparent font-display uppercase leading-tight select-none">
              FALCON AI
            </h1>
            <p className="text-[10px] text-gray-400 font-mono tracking-widest uppercase select-none">
              Developed by Falcon AI Team
            </p>
          </div>

          <div className="w-48 h-1 bg-white/5 rounded-full mx-auto overflow-hidden relative">
            <div className="h-full bg-cyan-400 rounded-full animate-[pulse_1.5s_infinite]" style={{ width: '65%' }}></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div id="app-canvas" className="min-h-screen bg-[#030308] text-white relative font-sans">
      
      {user ? (
        /* 1. AUTHENTICATED WORKSPACE HOME */
        <DashboardView 
          user={user} 
          onLogout={handleLogout} 
          onUserUpdate={(updatedUser) => {
            localStorage.setItem('falcon_user', JSON.stringify(updatedUser));
            setUser(updatedUser);
          }}
        />
      ) : (
        /* 2. CINEMATIC LANDING VIEW */
        <LandingPage 
          onStartFree={() => setShowAuthModal(true)} 
        />
      )}

      {/* SECURE POPUP MODAL WRAPPER */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Close trigger overlay backstop */}
          <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" onClick={() => setShowAuthModal(false)}></div>
          
          <div className="relative z-60">
            {/* Top right floating dismissal button */}
            <button
              onClick={() => setShowAuthModal(false)}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer z-70"
              title="Close panel"
            >
              <X className="w-4 h-4" />
            </button>
            <AuthModal 
              onSuccess={handleAuthSuccess} 
              onClose={() => setShowAuthModal(false)}
            />
          </div>
        </div>
      )}

    </div>
  );
}
