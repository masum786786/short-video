import React from 'react';
import { Flame, Compass, ShieldCheck, Shield, PlusCircle } from 'lucide-react';

interface BottomNavProps {
  currentView: 'feed' | 'home' | 'watch' | 'library' | 'admin';
  onNavigate: (view: 'feed' | 'home' | 'watch' | 'library' | 'admin', videoId?: string) => void;
  unlockedCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentView,
  onNavigate,
  unlockedCount = 0,
}) => {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 sm:hidden border-t border-slate-800/90 bg-[#090b10]/95 backdrop-blur-xl px-2 py-1.5 safe-area-pb">
      <div className="flex items-center justify-around">
        {/* Shorts Feed Tab */}
        <button
          id="bottom-nav-feed-btn"
          onClick={() => onNavigate('feed')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all cursor-pointer ${
            currentView === 'feed'
              ? 'text-rose-500 font-bold scale-105'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className="relative">
            <Flame className={`h-5 w-5 ${currentView === 'feed' ? 'fill-rose-500' : ''}`} />
            {currentView === 'feed' && (
              <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-rose-500 animate-ping" />
            )}
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight">Shorts</span>
        </button>

        {/* Explore Catalogue Tab */}
        <button
          id="bottom-nav-explore-btn"
          onClick={() => onNavigate('home')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all cursor-pointer ${
            currentView === 'home' || currentView === 'watch'
              ? 'text-rose-500 font-bold scale-105'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Compass className={`h-5 w-5 ${currentView === 'home' || currentView === 'watch' ? 'text-rose-500' : ''}`} />
          <span className="text-[10px] mt-0.5 tracking-tight">Explore</span>
        </button>

        {/* My Unlocks Library */}
        <button
          id="bottom-nav-library-btn"
          onClick={() => onNavigate('library')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all cursor-pointer ${
            currentView === 'library'
              ? 'text-emerald-400 font-bold scale-105'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className="relative">
            <ShieldCheck className={`h-5 w-5 ${currentView === 'library' ? 'text-emerald-400' : ''}`} />
            {unlockedCount > 0 && (
              <span className="absolute -top-1 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-500 px-1 text-[9px] font-bold text-black">
                {unlockedCount}
              </span>
            )}
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight">My Unlocks</span>
        </button>

        {/* Admin Studio Tab */}
        <button
          id="bottom-nav-admin-btn"
          onClick={() => onNavigate('admin')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all cursor-pointer ${
            currentView === 'admin'
              ? 'text-amber-400 font-bold scale-105'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Shield className={`h-5 w-5 ${currentView === 'admin' ? 'text-amber-400' : ''}`} />
          <span className="text-[10px] mt-0.5 tracking-tight">Admin</span>
        </button>
      </div>
    </nav>
  );
};
