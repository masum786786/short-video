import React from 'react';
import { Play, Search, Shield, LogOut, Flame, Compass, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface HeaderProps {
  currentView: 'feed' | 'home' | 'watch' | 'library' | 'admin';
  onNavigate: (view: 'feed' | 'home' | 'watch' | 'library' | 'admin', videoId?: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  unlockedCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onNavigate,
  searchQuery,
  onSearchChange,
  unlockedCount = 0,
}) => {
  const { isAdminLoggedIn, logoutAdmin } = useAuth();

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-[#090b10]/95 backdrop-blur-md">
        <div className="mx-auto flex h-14 sm:h-16 max-w-7xl items-center justify-between px-3 sm:px-6 lg:px-8">
          {/* Logo */}
          <div
            id="brand-logo-container"
            onClick={() => onNavigate('feed')}
            className="flex cursor-pointer items-center space-x-2.5 group"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-rose-600 to-amber-500 shadow-lg shadow-rose-500/20 group-hover:scale-105 transition-transform">
              <Play className="h-4.5 w-4.5 fill-white text-white translate-x-0.5" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg sm:text-xl font-extrabold tracking-tight text-white font-['Outfit'] flex items-center gap-1">
                short <span className="text-rose-500">video</span>
              </span>
              <span className="text-[9px] text-slate-400 font-medium tracking-wider uppercase hidden sm:inline">
                Streaming Platform
              </span>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1.5 rounded-full border border-slate-800 bg-slate-900/60 p-1">
            <button
              onClick={() => onNavigate('feed')}
              className={`flex items-center space-x-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                currentView === 'feed'
                  ? 'bg-rose-600 text-white shadow-md'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Flame className="h-3.5 w-3.5" />
              <span>Shorts Feed</span>
            </button>

            <button
              onClick={() => onNavigate('home')}
              className={`flex items-center space-x-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                currentView === 'home' || currentView === 'watch'
                  ? 'bg-rose-600 text-white shadow-md'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Compass className="h-3.5 w-3.5" />
              <span>Explore</span>
            </button>

            <button
              onClick={() => onNavigate('library')}
              className={`flex items-center space-x-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                currentView === 'library'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              <span>My Unlocks</span>
              {unlockedCount > 0 && (
                <span className="rounded-full bg-emerald-500 px-1.5 py-0.2 text-[9px] font-black text-black">
                  {unlockedCount}
                </span>
              )}
            </button>
          </nav>

          {/* Search Bar on Medium+ screens */}
          {currentView !== 'admin' && (
            <div className="hidden lg:flex flex-1 max-w-xs mx-4">
              <div className="relative w-full">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  id="header-search-input"
                  type="text"
                  placeholder="Search short videos..."
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="w-full rounded-full bg-slate-900/90 border border-slate-800 pl-9 pr-4 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:border-rose-500 focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* Right Header Actions */}
          <div className="flex items-center space-x-2">
            {/* Admin Dashboard Switch */}
            {currentView === 'admin' ? (
              <button
                id="header-view-website-btn"
                onClick={() => onNavigate('feed')}
                className="flex items-center space-x-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-200 transition-colors cursor-pointer"
              >
                <span>Watch Videos</span>
              </button>
            ) : (
              <button
                id="header-admin-dashboard-btn"
                onClick={() => onNavigate('admin')}
                className="flex items-center space-x-1.5 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:text-white transition-all cursor-pointer"
              >
                <Shield className="h-3.5 w-3.5 text-amber-400" />
                <span>Admin</span>
              </button>
            )}

            {/* Admin Logout */}
            {isAdminLoggedIn && currentView === 'admin' && (
              <button
                id="admin-logout-btn"
                onClick={logoutAdmin}
                title="Log out Admin"
                className="rounded-lg border border-red-500/20 bg-red-500/10 px-2.5 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/20 transition-colors cursor-pointer flex items-center gap-1"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            )}
          </div>
        </div>
      </header>
    </>
  );
};
