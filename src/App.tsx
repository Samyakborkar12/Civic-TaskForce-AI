import React, { useState, useEffect, useRef } from 'react';
import { Issue, User, CityMetrics, LeaderboardUser } from './types';
import { initialIssues, initialCityMetrics, leaderboardData, MAP_CENTER, translations } from './mockData';
import LandingPage from './components/LandingPage';
import AuthPage from './components/AuthPage';
import MapView from './components/MapView';
import ReportIssue from './components/ReportIssue';
import IssueDetails from './components/IssueDetails';
import AICopilot from './components/AICopilot';
import Leaderboard from './components/Leaderboard';
import MunicipalityDashboard from './components/MunicipalityDashboard';
import { 
  Menu, Sun, Moon, Globe, LogIn, LogOut, LayoutDashboard, MapPin, 
  Bot, Trophy, Shield, PlusCircle, Award, CheckCircle2, ChevronRight, X, Sparkles, Activity, ShieldAlert
} from 'lucide-react';

export default function App() {
  const [lang, setLang] = useState<'en' | 'es' | 'hi' | 'ja' | 'mr'>('mr');
  const [isDark, setIsDark] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [metrics, setMetrics] = useState<CityMetrics>(initialCityMetrics);
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>(leaderboardData);
  const [currentTab, setCurrentTab] = useState<string>('landing');
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  
  // Profile editing modal states
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState('');

  // Fetch issues dynamically from file storage based on user permission level
  const fetchIssues = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const res = await fetch('/api/issues', { headers });
      const data = await res.json();
      if (res.ok) {
        setIssues(data);
      }
    } catch (e) {
      console.error('Failed to fetch issues:', e);
    }
  };

  // Restore authenticated operator session on application boot
  useEffect(() => {
    const checkSession = async () => {
      const token = localStorage.getItem('authToken');
      if (token) {
        try {
          const res = await fetch('/api/auth/me', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          const data = await res.json();
          if (res.ok) {
            const user = data.user || data;
            if (user) {
              setCurrentUser(user);
              if (user.role === 'Admin') {
                setCurrentTab('muni-dash');
              } else {
                setCurrentTab('citizen-dash');
              }
            } else {
              localStorage.removeItem('authToken');
            }
          } else {
            localStorage.removeItem('authToken');
          }
        } catch (e) {
          console.error('Session security check failed:', e);
        }
      }
    };
    checkSession();
  }, []);

  // Sync edit profile values to active user identity records
  useEffect(() => {
    if (currentUser) {
      setEditName(currentUser.name || '');
      setEditEmail(currentUser.email || '');
      fetchIssues(); // Refresh list whenever user signs in or changes
    }
  }, [currentUser?.email, currentUser?.name]);

  // Mobile nav toggler
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Duplicate alerts
  const [duplicateNotice, setDuplicateNotice] = useState<{ active: boolean; existingTitle?: string } | null>(null);

  // Toast Notification System
  interface Toast {
    id: string;
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning';
    issueId: string;
  }
  const [toasts, setToasts] = useState<Toast[]>([]);
  const prevStatusesRef = useRef<Record<string, string>>({});

  const addToast = (title: string, message: string, type: 'info' | 'success' | 'warning', issueId: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, title, message, type, issueId }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 6000);
  };

  // Status-change watcher
  useEffect(() => {
    issues.forEach(issue => {
      const prevStatus = prevStatusesRef.current[issue.id];
      if (prevStatus && prevStatus !== issue.status) {
        const isUserReported = currentUser && issue.reporterEmail === currentUser.email;

        const statusLabels: Record<string, string> = {
          reported: 'Reported',
          ai_analyzed: 'AI Analyzed',
          assigned: 'Crew Dispatched',
          inspection: 'Under Inspection',
          in_progress: 'In Progress',
          resolved: 'Resolved',
          verified: 'Citizen Verified',
          closed: 'Closed'
        };

        const oldLabel = statusLabels[prevStatus] || prevStatus;
        const newLabel = statusLabels[issue.status] || issue.status;

        let type: 'info' | 'success' | 'warning' = 'info';
        if (issue.status === 'resolved' || issue.status === 'verified' || issue.status === 'closed') {
          type = 'success';
        } else if (issue.status === 'in_progress' || issue.status === 'assigned') {
          type = 'warning';
        }

        if (isUserReported) {
          addToast(
            'Your Reported Ticket Updated',
            `Your reported issue "${issue.title}" changed from "${oldLabel}" to "${newLabel}"!`,
            type,
            issue.id
          );
        } else {
          addToast(
            'Ticket Status Updated',
            `Issue "${issue.title}" transitioned from "${oldLabel}" to "${newLabel}".`,
            type,
            issue.id
          );
        }
      }
      prevStatusesRef.current[issue.id] = issue.status;
    });
  }, [issues, currentUser?.email]);

  // Initialize and persist dark mode
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  // Handle auto calculations when issues database updates
  useEffect(() => {
    const active = issues.filter(i => !i.isDuplicateOf && i.status !== 'resolved' && i.status !== 'closed').length;
    const resolved = issues.filter(i => i.status === 'resolved' || i.status === 'closed').length;
    
    // Dynamic health score logic depending on active issues weight
    const rawScore = 100 - (active * 4.5);
    const healthScore = Math.max(Math.min(Math.round(rawScore), 100), 50);

    setMetrics(prev => ({
      ...prev,
      activeCount: active,
      resolvedCount: resolved,
      healthScore: healthScore,
      roadsScore: Math.round(healthScore * 0.98),
      electricityScore: Math.round(healthScore * 1.02) > 100 ? 100 : Math.round(healthScore * 1.02),
      waterScore: Math.round(healthScore * 1.05) > 100 ? 100 : Math.round(healthScore * 1.05),
      wasteScore: Math.round(healthScore * 0.93)
    }));
  }, [issues]);

  const handleLoginSuccess = (user: User, token: string) => {
    localStorage.setItem('authToken', token);
    setCurrentUser(user);
    if (user.role === 'Admin') {
      setCurrentTab('muni-dash');
    } else {
      setCurrentTab('citizen-dash');
    }
  };

  const handleLogout = async () => {
    const token = localStorage.getItem('authToken');
    if (token) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
      } catch (e) {
        console.error('Logout error:', e);
      }
    }
    localStorage.removeItem('authToken');
    setCurrentUser(null);
    setCurrentTab('landing');
  };

  const handleGetStarted = (role: 'citizen' | 'municipality') => {
    const isUserAdmin = currentUser && currentUser.role === 'Admin';
    const isUserCitizen = currentUser && currentUser.role === 'Citizen';
    
    if (role === 'citizen' && isUserCitizen) {
      setCurrentTab('citizen-dash');
    } else if (role === 'municipality' && isUserAdmin) {
      setCurrentTab('muni-dash');
    } else {
      setCurrentTab(`auth-${role}`);
    }
  };

  // Upvote issue via dynamic POST endpoint
  const handleUpvote = async (issueId: string) => {
    try {
      const token = localStorage.getItem('authToken');
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const res = await fetch(`/api/issues/${issueId}/upvote`, {
        method: 'POST',
        headers
      });
      if (res.ok) {
        fetchIssues();
      }
    } catch (e) {
      console.error('Failed to upvote:', e);
    }
  };

  // Verify / validate issue with reward XP allocation
  const handleVerifyIssue = async (issueId: string) => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) return;
      const res = await fetch(`/api/issues/${issueId}/verify`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (res.ok) {
        fetchIssues();
        if (currentUser) {
          setCurrentUser({
            ...currentUser,
            xp: (currentUser.xp || 0) + 150,
            verifiedCount: (currentUser.verifiedCount || 0) + 1
          });
        }
        addToast(
          'Verification Process Completed',
          'Thank you for confirming. On-site coordinates verified (+150 XP)!',
          'success',
          issueId
        );
      } else {
        alert(data.error || 'Failed to complete verification.');
      }
    } catch (e) {
      console.error('Failed to verify:', e);
    }
  };

  // Submit issue and handle automatic duplication checks
  const handleIssueAdded = async (newIssue: Issue, isDuplicate: boolean, duplicateOfId?: string): Promise<boolean> => {
    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch('/api/issues', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          newIssue,
          isDuplicate,
          duplicateOfId
        })
      });
      const data = await res.json();
      if (res.ok) {
        if (isDuplicate && duplicateOfId) {
          const originalIssue = issues.find(i => i.id === duplicateOfId);
          if (originalIssue) {
            setDuplicateNotice({ active: true, existingTitle: originalIssue.title });
            addToast(
              'Report Merged',
              `Your report was merged into an active issue: "${originalIssue.title}". +100 XP gained!`,
              'success',
              duplicateOfId
            );
          } else {
            addToast(
              'Report Merged',
              'Your report has been merged with an active duplicate issue. +100 XP gained!',
              'success',
              duplicateOfId
            );
          }
        } else {
          addToast(
            'Issue Registered Successfully',
            `Hyperlocal incident "${newIssue.title}" recorded with AI assessment routing. +100 XP gained!`,
            'success',
            data.id || 'new-issue'
          );
        }
        
        fetchIssues();
        if (currentUser) {
          setCurrentUser({
            ...currentUser,
            xp: (currentUser.xp || 0) + 100,
            reportedCount: (currentUser.reportedCount || 0) + 1
          });
        }
        setCurrentTab('citizen-dash');
        return true;
      } else {
        alert(data.error || 'Failed to submit reported issue.');
        return false;
      }
    } catch (e: any) {
      console.error('Error adding issue:', e);
      alert(e.message || 'An unexpected error occurred while reporting the issue.');
      return false;
    }
  };

  // Municipality status modifications
  const handleUpdateIssue = async (updated: Issue) => {
    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch(`/api/issues/${updated.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updated)
      });
      if (res.ok) {
        fetchIssues();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to update issue status.');
      }
    } catch (e) {
      console.error('Update status failed:', e);
    }
  };

  const handleUpdateIssues = async (updatedList: Issue[]) => {
    try {
      const token = localStorage.getItem('authToken');
      await Promise.all(updatedList.map(item =>
        fetch(`/api/issues/${item.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(item)
        })
      ));
      fetchIssues();
    } catch (e) {
      console.error('Bulk update failed:', e);
    }
  };

  const selectedIssue = issues.find(i => i.id === selectedIssueId);

  return (
    <div className="min-h-screen flex flex-col font-sans bg-brand-bg text-brand-text-main transition-colors duration-300">
      
      {/* Dynamic Duplicate prevention banner overlay */}
      {duplicateNotice && duplicateNotice.active && (
        <div className="fixed top-24 right-4 sm:right-8 w-full max-w-sm bg-brand-primary text-white rounded-3xl p-5 border border-white/20 shadow-brand-lg z-50 animate-bounce">
          <div className="flex items-start gap-3">
            <Sparkles className="w-6 h-6 animate-pulse flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-extrabold text-sm uppercase">Duplicate Prevented!</h4>
              <p className="text-xs opacity-90 mt-1 leading-relaxed">
                A similar issue titled **"{duplicateNotice.existingTitle}"** was detected within 50 meters. We automatically aggregated your report data to priority-escalate repairs!
              </p>
            </div>
            <button 
              onClick={() => setDuplicateNotice(null)}
              className="p-1 hover:bg-white/10 rounded-full cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Navigation Header */}
      <header className="sticky top-0 bg-brand-card/95 backdrop-blur-md border-b border-brand-border z-40 transition-colors shadow-brand-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          {/* Brand Logo */}
          <button 
            onClick={() => setCurrentTab('landing')}
            className="flex items-center gap-2 text-left cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-brand-primary flex items-center justify-center text-white shadow-md shadow-brand-primary/20 group-hover:scale-105 transition-transform">
              <Shield className="w-5 h-5 font-bold" />
            </div>
            <div>
              <span className="font-display font-extrabold text-sm uppercase tracking-wider block text-brand-text-main leading-none">
                CIVIC TASKFORCE
              </span>
              <span className="text-[9px] font-semibold text-brand-primary tracking-widest block uppercase mt-0.5">
                SMART GOVERNANCE AI
              </span>
            </div>
          </button>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-6">
            {currentUser && currentUser.role === 'Citizen' && (
              <>
                <button 
                  onClick={() => setCurrentTab('citizen-dash')}
                  className={`text-xs font-bold tracking-wide uppercase transition-colors cursor-pointer flex items-center gap-1.5 py-1.5 ${
                    currentTab === 'citizen-dash' ? 'text-brand-primary border-b-2 border-brand-primary' : 'text-brand-text-sub hover:text-brand-text-main'
                  }`}
                >
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  <span>My Portal</span>
                </button>

                <button 
                  onClick={() => setCurrentTab('report')}
                  className={`text-xs font-bold tracking-wide uppercase transition-colors cursor-pointer flex items-center gap-1.5 py-1.5 ${
                    currentTab === 'report' ? 'text-brand-primary border-b-2 border-brand-primary' : 'text-brand-text-sub hover:text-brand-text-main'
                  }`}
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Report</span>
                </button>
              </>
            )}

            {currentUser && currentUser.role === 'Admin' && (
              <button 
                onClick={() => setCurrentTab('muni-dash')}
                className={`text-xs font-bold tracking-wide uppercase transition-colors cursor-pointer flex items-center gap-1.5 py-1.5 ${
                  currentTab === 'muni-dash' ? 'text-brand-primary border-b-2 border-brand-primary' : 'text-brand-text-sub hover:text-brand-text-main'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Control Board</span>
              </button>
            )}

            <button 
              onClick={() => setCurrentTab('map')}
              className={`text-xs font-bold tracking-wide uppercase transition-colors cursor-pointer flex items-center gap-1.5 py-1.5 ${
                currentTab === 'map' ? 'text-brand-primary border-b-2 border-brand-primary' : 'text-brand-text-sub hover:text-brand-text-main'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>Map view</span>
            </button>

            <button 
              onClick={() => setCurrentTab('copilot')}
              className={`text-xs font-bold tracking-wide uppercase transition-colors cursor-pointer flex items-center gap-1.5 py-1.5 ${
                currentTab === 'copilot' ? 'text-brand-primary border-b-2 border-brand-primary' : 'text-brand-text-sub hover:text-brand-text-main'
              }`}
            >
              <Bot className="w-3.5 h-3.5" />
              <span>Predictive Copilot</span>
            </button>

            {currentUser && currentUser.role === 'Citizen' && (
              <button 
                onClick={() => setCurrentTab('leaderboard')}
                className={`text-xs font-bold tracking-wide uppercase transition-colors cursor-pointer flex items-center gap-1.5 py-1.5 ${
                  currentTab === 'leaderboard' ? 'text-brand-primary border-b-2 border-brand-primary' : 'text-brand-text-sub hover:text-brand-text-main'
                }`}
              >
                <Trophy className="w-3.5 h-3.5" />
                <span>Ranks</span>
              </button>
            )}
          </nav>

          {/* Quick Action Tools: Dark, Lang, Auth */}
          <div className="flex items-center gap-3">
            
            {/* Dark Mode toggle */}
            <button
              onClick={() => setIsDark(!isDark)}
              className="p-2 text-brand-text-sub hover:text-brand-text-main rounded-xl hover:bg-brand-bg transition-colors cursor-pointer"
              title="Toggle Theme"
            >
              {isDark ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
            </button>

            {/* Direct Language Switcher (Single-Click) */}
            <div className="flex items-center bg-brand-bg border border-brand-border p-1 rounded-xl gap-0.5 shadow-brand-sm">
              <Globe className="w-3.5 h-3.5 text-brand-text-sub mx-1.5 hidden md:block" />
              {(['en', 'hi', 'mr', 'es', 'ja'] as const).map((l) => {
                const labelMap: Record<string, string> = {
                  en: 'EN',
                  hi: 'HI',
                  mr: 'MR',
                  es: 'ES',
                  ja: 'JA',
                };
                return (
                  <button
                    key={l}
                    onClick={() => setLang(l)}
                    className={`px-2 py-1 text-[10px] font-bold rounded-lg uppercase cursor-pointer transition-all ${
                      lang === l
                        ? 'bg-brand-primary text-white shadow-brand-sm'
                        : 'text-brand-text-sub hover:text-brand-text-main hover:bg-brand-card'
                    }`}
                    title={`Switch to ${labelMap[l]}`}
                  >
                    {labelMap[l]}
                  </button>
                );
              })}
            </div>

            {/* Login / Logout button */}
            {currentUser ? (
              <div className="flex items-center gap-3">
                {/* User Info Capsule (Desktop) */}
                <span className="hidden lg:inline-flex items-center gap-2 bg-brand-primary-light px-3 py-1.5 rounded-full text-xs font-semibold text-brand-primary">
                  <span className="w-2 h-2 rounded-full bg-brand-success"></span>
                  <span>{currentUser.name}</span>
                </span>
                <button
                  onClick={handleLogout}
                  className="px-3.5 py-1.5 border border-brand-danger/30 hover:bg-brand-danger/10 text-brand-danger rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Sign Out</span>
                </button>
              </div>
            ) : (
              <button
                onClick={() => setCurrentTab('auth-citizen')}
                className="px-4 py-1.5 bg-brand-primary hover:bg-brand-primary/90 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-brand-sm transition-colors cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                <span>Get Started</span>
              </button>
            )}

            {/* Mobile Nav Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-gray-500 dark:text-zinc-400 rounded-xl hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Mobile Navigation Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-3 space-y-1 z-40 relative">
            {currentUser && currentUser.role === 'Citizen' && (
              <>
                <button 
                  onClick={() => { setCurrentTab('citizen-dash'); setMobileMenuOpen(false); }}
                  className="w-full text-left px-3 py-2 text-sm font-semibold text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-xl"
                >
                  My Portal Dashboard
                </button>
                <button 
                  onClick={() => { setCurrentTab('report'); setMobileMenuOpen(false); }}
                  className="w-full text-left px-3 py-2 text-sm font-semibold text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-xl"
                >
                  Report Incident
                </button>
              </>
            )}
            
            {currentUser && currentUser.role === 'Admin' && (
              <button 
                onClick={() => { setCurrentTab('muni-dash'); setMobileMenuOpen(false); }}
                className="w-full text-left px-3 py-2 text-sm font-semibold text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-xl"
              >
                Municipal Control Board
              </button>
            )}

            <button 
              onClick={() => { setCurrentTab('map'); setMobileMenuOpen(false); }}
              className="w-full text-left px-3 py-2 text-sm font-semibold text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-xl"
            >
              Interactive Map
            </button>
            <button 
              onClick={() => { setCurrentTab('copilot'); setMobileMenuOpen(false); }}
              className="w-full text-left px-3 py-2 text-sm font-semibold text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-xl"
            >
              Predictive AI Copilot
            </button>
            {currentUser && currentUser.role === 'citizen' && (
              <button 
                onClick={() => { setCurrentTab('leaderboard'); setMobileMenuOpen(false); }}
                className="w-full text-left px-3 py-2 text-sm font-semibold text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-xl"
              >
                Ranks & Gamification
              </button>
            )}
          </div>
        )}
      </header>

      {/* Main Tab Render Body */}
      <main className="flex-1">
        {currentTab === 'landing' && (
          <LandingPage 
            lang={lang} 
            onGetStarted={handleGetStarted}
            activeCount={metrics.activeCount}
            resolvedCount={metrics.resolvedCount}
          />
        )}

        {(currentTab === 'auth-citizen' || currentTab === 'auth-municipality') && (
          <AuthPage
            lang={lang}
            initialRole={currentTab === 'auth-citizen' ? 'citizen' : 'municipality'}
            onLoginSuccess={handleLoginSuccess}
            onBack={() => setCurrentTab('landing')}
          />
        )}

        {currentTab === 'citizen-dash' && (
          <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
            {/* Header profile greeting */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6 p-6 bg-brand-card border border-brand-border rounded-3xl shadow-brand-md">
              <div className="flex items-center gap-4 text-center sm:text-left flex-col sm:flex-row">
                <div className="w-14 h-14 bg-brand-primary-light text-brand-primary font-extrabold text-xl rounded-2xl flex items-center justify-center">
                  {currentUser?.name.charAt(0)}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-brand-text-main">Welcome back, {currentUser?.name}!</h2>
                  <span className="text-xs text-brand-text-sub block mt-1">Level {Math.floor((currentUser?.xp || 0) / 500) + 1} Hero Citizen Observer</span>
                  <button
                    onClick={() => setIsEditingProfile(true)}
                    className="text-[11px] font-bold text-brand-primary hover:underline cursor-pointer flex items-center gap-1 mt-1.5"
                  >
                    Edit Profile Details
                  </button>
                </div>
              </div>

              {/* Citizen Stats */}
              <div className="flex items-center gap-6 text-center border-t sm:border-t-0 sm:border-l border-brand-border pt-4 sm:pt-0 sm:pl-6 w-full sm:w-auto justify-around">
                <div>
                  <span className="text-[10px] text-brand-text-sub uppercase font-semibold block">Civic Hero XP</span>
                  <span className="text-lg font-mono font-extrabold text-brand-primary block mt-0.5">{currentUser?.xp} XP</span>
                </div>
                <div>
                  <span className="text-[10px] text-brand-text-sub uppercase font-semibold block">Your Reports</span>
                  <span className="text-lg font-mono font-extrabold text-brand-text-main block mt-0.5">{currentUser?.reportedCount}</span>
                </div>
                <div>
                  <span className="text-[10px] text-brand-text-sub uppercase font-semibold block">Verifications</span>
                  <span className="text-lg font-mono font-extrabold text-brand-text-main block mt-0.5">{currentUser?.verifiedCount}</span>
                </div>
              </div>
            </div>

            {/* PRIMARY CALL TO ACTION BUTTON */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                id="citizen-dash-report-btn"
                onClick={() => setCurrentTab('report')}
                className="p-6 bg-brand-primary hover:bg-brand-primary/90 text-white rounded-3xl flex flex-col items-center justify-center text-center gap-3 cursor-pointer transition-all hover:scale-[1.01] shadow-brand-lg border border-brand-primary/20"
              >
                <PlusCircle className="w-10 h-10" />
                <div>
                  <h3 className="font-bold text-lg">Report New Problem</h3>
                  <p className="text-xs opacity-85 mt-1">Take photo. AI routes & alerts municipal response crews instantly.</p>
                </div>
              </button>

              <button
                id="citizen-dash-map-btn"
                onClick={() => setCurrentTab('map')}
                className="p-6 bg-brand-card hover:bg-brand-bg border border-brand-border text-brand-text-main rounded-3xl flex flex-col items-center justify-center text-center gap-3 cursor-pointer transition-all"
              >
                <MapPin className="w-10 h-10 text-brand-primary" />
                <div>
                  <h3 className="font-bold text-lg">Explore Nearby Map</h3>
                  <p className="text-xs text-brand-text-sub mt-1">View active civic pins. Upvote or verify reported baches.</p>
                </div>
              </button>
            </div>

            {/* MY REPORTS CARD */}
            <div className="bg-brand-card border border-brand-border p-6 rounded-3xl shadow-brand-sm">
              <div className="flex justify-between items-center mb-6">
                <span className="text-xs font-bold text-brand-text-sub uppercase tracking-widest">Active Action Orders ({issues.filter(i => !i.isDuplicateOf).length})</span>
                <button 
                  onClick={() => setCurrentTab('map')} 
                  className="text-xs text-brand-primary font-bold hover:underline"
                >
                  View full map
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {issues.filter(i => !i.isDuplicateOf).slice(0, 4).map((issue) => (
                  <div 
                    key={issue.id} 
                    className="p-4 bg-brand-bg border border-brand-border rounded-2xl flex gap-4 hover:shadow-brand-md transition-shadow cursor-pointer"
                    onClick={() => {
                      setSelectedIssueId(issue.id);
                      setCurrentTab('issue-details');
                    }}
                  >
                    <img 
                      src={issue.image} 
                      alt="" 
                      className="w-16 h-16 object-cover rounded-xl shadow-xs flex-shrink-0"
                      referrerPolicy="no-referrer"
                    />

                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between gap-1.5">
                          <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-md ${
                            issue.severity === 'urgent' ? 'text-brand-danger bg-brand-danger/10' :
                            issue.severity === 'high' ? 'text-amber-600 bg-amber-50' : 'text-brand-text-sub bg-brand-bg'
                          }`}>
                            {issue.severity}
                          </span>
                          <span className="text-[10px] text-brand-text-sub font-semibold capitalize">
                            {issue.status.replace('_', ' ')}
                          </span>
                        </div>
                        <h4 className="font-bold text-xs text-brand-text-main mt-2 truncate">{issue.title}</h4>
                      </div>
                      
                      {/* Simple progress timeline indicator */}
                      <div className="mt-3 flex items-center gap-1">
                        <div className="h-1 bg-brand-primary rounded-full flex-1"></div>
                        <div className={`h-1 rounded-full flex-1 ${issue.status !== 'reported' ? 'bg-brand-primary' : 'bg-brand-border'}`}></div>
                        <div className={`h-1 rounded-full flex-1 ${issue.status === 'resolved' || issue.status === 'closed' ? 'bg-brand-success' : 'bg-brand-border'}`}></div>
                        <span className="text-[9px] text-brand-text-sub ml-1.5 font-semibold">Timeline</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {currentTab === 'report' && (
          <ReportIssue
            lang={lang}
            issues={issues}
            currentUser={currentUser}
            onIssueAdded={handleIssueAdded}
            onCancel={() => {
              if (currentUser?.role === 'Admin') {
                setCurrentTab('muni-dash');
              } else {
                setCurrentTab('citizen-dash');
              }
            }}
          />
        )}

        {currentTab === 'issue-details' && selectedIssue && (
          <IssueDetails
            lang={lang}
            issue={selectedIssue}
            currentUser={currentUser}
            onBack={() => {
              if (currentUser?.role === 'Admin') {
                setCurrentTab('muni-dash');
              } else {
                setCurrentTab('citizen-dash');
              }
            }}
            onVerify={handleVerifyIssue}
            onUpvote={handleUpvote}
          />
        )}

        {currentTab === 'map' && (
          <MapView
            lang={lang}
            issues={issues}
            center={MAP_CENTER}
            onViewDetails={(issueId) => {
              setSelectedIssueId(issueId);
              setCurrentTab('issue-details');
            }}
          />
        )}

        {currentTab === 'copilot' && (
          <AICopilot
            lang={lang}
            issues={issues}
            metrics={metrics}
          />
        )}

        {currentTab === 'leaderboard' && (
          <Leaderboard
            lang={lang}
            leaderboard={leaderboard}
            currentUser={currentUser}
          />
        )}

        {currentTab === 'muni-dash' && (() => {
          const isUserAdmin = currentUser && currentUser.role === 'Admin';
          if (!isUserAdmin) {
            return (
              <div className="max-w-xl mx-auto px-6 py-16 text-center">
                <div className="w-20 h-20 bg-brand-danger/10 text-brand-danger rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-md shadow-brand-danger/10">
                  <ShieldAlert className="w-10 h-10 animate-pulse" />
                </div>
                <h1 className="text-2xl font-display font-extrabold text-brand-text-main tracking-tight uppercase">
                  403: Security Clearance Required
                </h1>
                <p className="mt-4 text-sm text-brand-text-sub leading-relaxed">
                  This administrative module contains critical infrastructure registries, route dispatch controls, and budget allocation workflows. Your citizen account does not have the necessary security clearances to view or execute tasks here.
                </p>
                <div className="mt-6 p-4 bg-brand-card border border-brand-border rounded-2xl text-left text-xs text-brand-text-sub space-y-2">
                  <p>
                    <strong>Attempted Account:</strong> {currentUser?.email || 'Anonymous Guest'}
                  </p>
                  <p>
                    <strong>Assigned Role:</strong> {currentUser?.role || 'Guest (Unauthenticated)'}
                  </p>
                  <p className="text-brand-danger font-semibold">
                    ⚠️ Error: Administrative authorization credentials missing or invalid.
                  </p>
                </div>
                <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    onClick={() => setCurrentTab('auth-municipality')}
                    className="px-6 py-3 bg-brand-primary hover:bg-brand-primary/90 text-white rounded-xl text-xs font-bold shadow-brand-sm transition-all cursor-pointer"
                  >
                    Authenticate with Agency Domain
                  </button>
                  <button
                    onClick={() => setCurrentTab('landing')}
                    className="px-6 py-3 bg-brand-card hover:bg-brand-bg border border-brand-border text-brand-text-main rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    Return to Homepage
                  </button>
                </div>
              </div>
            );
          }

          return (
            <MunicipalityDashboard
              lang={lang}
              issues={issues}
              metrics={metrics}
              currentUser={currentUser}
              onUpdateIssue={handleUpdateIssue}
              onUpdateIssues={handleUpdateIssues}
            />
          );
        })()}
      </main>

      {/* Aesthetic human-labeled humble Footer */}
      <footer className="bg-brand-card border-t border-brand-border py-8 text-center text-xs text-brand-text-sub transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-3">
          <p className="font-semibold text-brand-text-main font-display">
            Civic Taskforce AI — Active Municipal Support System
          </p>
          <p className="max-w-md mx-auto leading-relaxed">
            Protecting citizens through proactive structural diagnostics, automated duplicate prevention, and zero-latency route optimization.
          </p>
          <p className="text-[10px] text-brand-text-sub/50">
            © 2026 Civic Taskforce. All rights reserved.
          </p>
        </div>
      </footer>

      {/* Profile Edit Handshake Modal Overlay */}
      {isEditingProfile && currentUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-brand-card border border-brand-border rounded-3xl p-6 w-full max-w-md shadow-brand-lg">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-brand-text-main flex items-center gap-2">
                <Award className="w-6 h-6 text-brand-primary" />
                <span>Edit Profile Registry</span>
              </h3>
              <button
                onClick={() => {
                  setIsEditingProfile(false);
                  setProfileError('');
                }}
                className="p-1 text-brand-text-sub hover:text-brand-text-main hover:bg-brand-bg rounded-full cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-brand-text-sub mb-5">
              Update your official identification details and contact address used for civic upvotes and verification standing.
            </p>

            <form onSubmit={async (e) => {
              e.preventDefault();
              setProfileSaving(true);
              setProfileError('');
              try {
                const token = localStorage.getItem('authToken');
                const res = await fetch('/api/auth/profile', {
                  method: 'PUT',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                  },
                  body: JSON.stringify({
                    name: editName.trim(),
                    email: editEmail.trim().toLowerCase()
                  })
                });
                const data = await res.json();
                if (res.ok) {
                  setCurrentUser({
                    ...currentUser,
                    name: data.user.name,
                    email: data.user.email
                  });
                  setIsEditingProfile(false);
                  addToast(
                    'Profile Details Saved',
                    'Your official account profile records have been updated securely.',
                    'success',
                    'profile'
                  );
                } else {
                  setProfileError(data.error || 'Failed to update profile records.');
                }
              } catch (err: any) {
                setProfileError('Failed to establish a security handshake.');
              } finally {
                setProfileSaving(false);
              }
            }} className="space-y-4">
              {profileError && (
                <div className="p-3 bg-brand-danger/10 border border-brand-danger/20 text-brand-danger rounded-xl text-xs flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 flex-shrink-0 animate-bounce" />
                  <span>{profileError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-brand-text-sub uppercase tracking-wider mb-2">
                  Full Name Identification
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-4 py-3 bg-brand-bg border border-brand-border rounded-xl text-sm focus:outline-hidden focus:border-brand-primary transition-colors text-brand-text-main"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-brand-text-sub uppercase tracking-wider mb-2">
                  Email Address Address
                </label>
                <input
                  type="email"
                  required
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-brand-bg border border-brand-border rounded-xl text-sm focus:outline-hidden focus:border-brand-primary transition-colors text-brand-text-main"
                />
              </div>

              <div className="flex gap-2 justify-end pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingProfile(false);
                    setProfileError('');
                  }}
                  className="px-4 py-2.5 border border-brand-border text-brand-text-sub rounded-xl text-xs font-bold cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={profileSaving}
                  className="px-5 py-2.5 bg-brand-primary hover:bg-brand-primary/90 text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors disabled:opacity-50"
                >
                  {profileSaving ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <span>Save Changes</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast Notifications Stack */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`pointer-events-auto p-4 rounded-2xl shadow-brand-lg border flex items-start gap-3 transition-all duration-300 transform translate-y-0 scale-100 ${
              toast.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400 backdrop-blur-md'
                : toast.type === 'warning'
                ? 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400 backdrop-blur-md'
                : 'bg-brand-primary/10 border-brand-primary/20 text-brand-primary backdrop-blur-md'
            }`}
          >
            {/* Icon */}
            <div className="mt-0.5">
              {toast.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
              ) : toast.type === 'warning' ? (
                <Activity className="w-5 h-5 flex-shrink-0 animate-pulse" />
              ) : (
                <Sparkles className="w-5 h-5 flex-shrink-0 animate-pulse" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <h5 className="font-extrabold text-[11px] uppercase tracking-wider">{toast.title}</h5>
              <p className="text-xs mt-1 text-brand-text-sub leading-normal font-medium">{toast.message}</p>
              <button
                onClick={() => {
                  setSelectedIssueId(toast.issueId);
                  setCurrentTab('issue-details'); // Immediately open details view
                }}
                className="mt-2 text-[10px] font-bold uppercase underline cursor-pointer text-brand-text-main hover:text-brand-primary block text-left"
              >
                View Issue Details
              </button>
            </div>

            {/* Close Button */}
            <button
              onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
              className="p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded-full cursor-pointer flex-shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
