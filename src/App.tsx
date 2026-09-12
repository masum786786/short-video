import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { ShortsFeed } from './components/ShortsFeed';
import { HomePage } from './pages/HomePage';
import { WatchPage } from './pages/WatchPage';
import { MyUnlocksPage } from './pages/MyUnlocksPage';
import { AdminDashboard } from './pages/AdminDashboard';
import { Video } from './types';
import { api } from './lib/api';

function MainApp() {
  const { userId } = useAuth();
  const [currentView, setCurrentView] = useState<'feed' | 'home' | 'watch' | 'library' | 'admin'>('feed');
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loadingVideos, setLoadingVideos] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [unlockedCount, setUnlockedCount] = useState(0);

  // Initial load of uploaded Cloudinary videos from API
  const loadVideos = async (search?: string) => {
    setLoadingVideos(true);
    try {
      const data = await api.getVideos(search);
      setVideos(data);
    } catch (err) {
      console.error('Failed to load videos', err);
    } finally {
      setLoadingVideos(false);
    }
  };

  const loadUnlockedCount = async () => {
    if (!userId) return;
    try {
      const unlocked = await api.getUserUnlockedVideos(userId);
      setUnlockedCount(unlocked.length);
    } catch (_) {}
  };

  useEffect(() => {
    loadVideos(searchQuery);
    loadUnlockedCount();
  }, [searchQuery, userId]);

  // Check URL params for direct video links (e.g. ?v=vid_123 or hash #admin or #explore)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const urlParams = new URLSearchParams(window.location.search);
    const vParam = urlParams.get('v');
    const tabParam = urlParams.get('tab');

    if (vParam) {
      setSelectedVideoId(vParam);
      setCurrentView('watch');
    } else if (tabParam === 'explore') {
      setCurrentView('home');
    } else if (tabParam === 'library') {
      setCurrentView('library');
    } else if (window.location.hash === '#admin' || window.location.pathname.startsWith('/admin')) {
      setCurrentView('admin');
    } else {
      setCurrentView('feed');
    }

    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const popV = params.get('v');
      const popTab = params.get('tab');
      if (popV) {
        setSelectedVideoId(popV);
        setCurrentView('watch');
      } else if (popTab === 'explore') {
        setCurrentView('home');
      } else if (popTab === 'library') {
        setCurrentView('library');
      } else if (window.location.hash === '#admin') {
        setCurrentView('admin');
      } else {
        setCurrentView('feed');
        setSelectedVideoId(null);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleNavigate = (view: 'feed' | 'home' | 'watch' | 'library' | 'admin', videoId?: string) => {
    setCurrentView(view);
    if (view === 'watch' && videoId) {
      setSelectedVideoId(videoId);
      window.history.pushState({}, '', `/?v=${videoId}`);
    } else if (view === 'home') {
      setSelectedVideoId(null);
      window.history.pushState({}, '', '/?tab=explore');
      loadVideos(searchQuery);
    } else if (view === 'library') {
      setSelectedVideoId(null);
      window.history.pushState({}, '', '/?tab=library');
      loadUnlockedCount();
    } else if (view === 'admin') {
      setSelectedVideoId(null);
      window.history.pushState({}, '', '/#admin');
    } else {
      setSelectedVideoId(null);
      window.history.pushState({}, '', '/');
    }
  };

  const handleSelectVideo = (video: Video) => {
    handleNavigate('watch', video._id);
  };

  const handleLikeChange = (videoId: string, newCount: number) => {
    setVideos((prev) =>
      prev.map((v) => (v._id === videoId ? { ...v, likesCount: newCount } : v))
    );
  };

  return (
    <div className="min-h-screen bg-[#090b10] text-[#f1f5f9] flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Navigation Header */}
      <Header
        currentView={currentView}
        onNavigate={handleNavigate}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        unlockedCount={unlockedCount}
      />

      {/* Main Content Area */}
      <main className="flex-1 pb-16 sm:pb-0">
        {/* Fullscreen Vertical Shorts Feed (Mobile-First) */}
        {currentView === 'feed' && (
          <ShortsFeed
            videos={videos}
            onSelectVideo={handleSelectVideo}
            onNavigateExplore={() => handleNavigate('home')}
            onNavigateAdmin={() => handleNavigate('admin')}
            onLikeChange={handleLikeChange}
          />
        )}

        {/* Video Catalogue Grid */}
        {currentView === 'home' && (
          <HomePage
            videos={videos}
            loading={loadingVideos}
            onSelectVideo={handleSelectVideo}
            onNavigateAdmin={() => handleNavigate('admin')}
            onLikeChange={handleLikeChange}
          />
        )}

        {/* Single Video Detailed Theater Watch Page */}
        {currentView === 'watch' && selectedVideoId && (
          <WatchPage
            videoId={selectedVideoId}
            allVideos={videos}
            onBack={() => handleNavigate('feed')}
            onSelectVideo={handleSelectVideo}
          />
        )}

        {/* My Unlocks Library */}
        {currentView === 'library' && (
          <MyUnlocksPage
            onSelectVideo={handleSelectVideo}
            onNavigateExplore={() => handleNavigate('home')}
            onNavigateFeed={() => handleNavigate('feed')}
          />
        )}

        {/* Admin Dashboard */}
        {currentView === 'admin' && <AdminDashboard />}
      </main>

      {/* Sticky Mobile Bottom Navigation */}
      <BottomNav
        currentView={currentView}
        onNavigate={handleNavigate}
        unlockedCount={unlockedCount}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
