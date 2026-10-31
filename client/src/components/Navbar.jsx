import React, { useState, useEffect, useRef } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
  Flame,
  PlusCircle,
  Bell,
  Search,
  Compass,
  TrendingUp,
  Users,
  User,
  LogOut,
  Settings,
  Layers,
  Check,
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore.js';
import { api } from '../services/api.js';

export default function Navbar() {
  const { user, isAuthenticated, logout, unitPreference, setUnitPreference } = useAuthStore();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState({ athletes: [], clubs: [], segments: [] });
  const [isSearching, setIsSearching] = useState(false);

  const navigate = useNavigate();
  const profileMenuRef = useRef(null);
  const notifMenuRef = useRef(null);

  // Fetch notifications
  useEffect(() => {
    if (isAuthenticated) {
      api.getNotifications()
        .then((res) => {
          setNotifications(res.notifications || []);
          setUnreadCount(res.unreadCount || 0);
        })
        .catch(() => {});
    }
  }, [isAuthenticated]);

  // Click outside listener for dropdowns
  useEffect(() => {
    function handleClickOutside(event) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
      if (notifMenuRef.current && !notifMenuRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Global search debounce
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults({ athletes: [], clubs: [], segments: [] });
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await api.search(searchQuery);
        setSearchResults(res);
      } catch (err) {
        console.error('Search failed:', err);
      } finally {
        setIsSearching(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setUnreadCount(0);
      setNotifications(notifications.map((n) => ({ ...n, read: true })));
    } catch {}
  };

  const navLinkClasses = ({ isActive }) =>
    `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
      isActive
        ? 'text-brand-600 bg-brand-50/80 font-bold'
        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
    }`;

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Navigation */}
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-amber-500 flex items-center justify-center text-white shadow-md shadow-brand-500/20">
                <Flame className="w-5 h-5 fill-white" />
              </div>
              <span className="text-xl font-extrabold tracking-tight text-slate-900">
                Pace<span className="text-brand-600">Track</span>
              </span>
            </Link>

            <nav className="hidden md:flex items-center gap-1">
              <NavLink to="/" end className={navLinkClasses}>
                Dashboard
              </NavLink>
              <NavLink to="/explore" className={navLinkClasses}>
                <Compass className="w-4 h-4" />
                Explore
              </NavLink>
              <NavLink to="/training" className={navLinkClasses}>
                <TrendingUp className="w-4 h-4" />
                Training
              </NavLink>
              <NavLink to="/clubs" className={navLinkClasses}>
                <Users className="w-4 h-4" />
                Clubs
              </NavLink>
            </nav>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-3">
            {/* Search Trigger */}
            <button
              onClick={() => setShowSearchModal(true)}
              className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
              title="Search athletes, clubs, and segments"
            >
              <Search className="w-5 h-5" />
            </button>

            {/* Record / Upload Workout CTA */}
            <Link
              to="/record"
              className="hidden sm:flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-3.5 py-2 rounded-xl text-sm font-bold shadow-sm shadow-brand-600/30 transition-all hover:scale-[1.02]"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Record / Upload</span>
            </Link>

            {isAuthenticated ? (
              <>
                {/* Notifications Bell */}
                <div className="relative" ref={notifMenuRef}>
                  <button
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
                  >
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && (
                      <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-brand-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-white">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </button>

                  {/* Notifications Popover */}
                  {showNotifications && (
                    <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden py-2 animate-in fade-in zoom-in-95 duration-100 z-50">
                      <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                          Notifications
                        </span>
                        {unreadCount > 0 && (
                          <button
                            onClick={handleMarkAllRead}
                            className="text-[11px] text-brand-600 font-bold hover:underline"
                          >
                            Mark all read
                          </button>
                        )}
                      </div>
                      <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                        {notifications.length === 0 ? (
                          <div className="p-4 text-center text-xs text-slate-400">
                            No notifications yet
                          </div>
                        ) : (
                          notifications.map((n) => (
                            <div
                              key={n._id}
                              className={`p-3 text-xs flex gap-3 hover:bg-slate-50 transition-colors ${
                                !n.read ? 'bg-orange-50/40' : ''
                              }`}
                            >
                              <img
                                src={n.sender?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                                alt=""
                                className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                              />
                              <div>
                                <p className="text-slate-800 font-medium">{n.message}</p>
                                <span className="text-[10px] text-slate-400 mt-1 block">
                                  {new Date(n.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                                </span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Athlete Profile Dropdown */}
                <div className="relative" ref={profileMenuRef}>
                  <button
                    onClick={() => setShowProfileMenu(!showProfileMenu)}
                    className="flex items-center gap-2 p-1 rounded-full hover:ring-2 hover:ring-brand-500 transition-all"
                  >
                    <img
                      src={user?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                      alt={user?.name}
                      className="w-9 h-9 rounded-full object-cover border border-slate-200"
                    />
                  </button>

                  {showProfileMenu && (
                    <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden py-2 animate-in fade-in zoom-in-95 duration-100 z-50">
                      <div className="px-4 py-3 border-b border-slate-100">
                        <div className="font-bold text-slate-900 text-sm line-clamp-1">{user?.name}</div>
                        <div className="text-xs text-slate-400">@{user?.username}</div>
                      </div>

                      {/* Unit Preference Selector */}
                      <div className="px-4 py-2 border-b border-slate-100">
                        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                          Unit System
                        </div>
                        <div className="flex bg-slate-100 rounded-lg p-0.5 text-xs font-semibold">
                          <button
                            onClick={() => setUnitPreference('metric')}
                            className={`flex-1 py-1 rounded-md text-center transition-all ${
                              unitPreference === 'metric'
                                ? 'bg-white text-slate-900 shadow-sm font-bold'
                                : 'text-slate-500 hover:text-slate-900'
                            }`}
                          >
                            Kilometers (km)
                          </button>
                          <button
                            onClick={() => setUnitPreference('imperial')}
                            className={`flex-1 py-1 rounded-md text-center transition-all ${
                              unitPreference === 'imperial'
                                ? 'bg-white text-slate-900 shadow-sm font-bold'
                                : 'text-slate-500 hover:text-slate-900'
                            }`}
                          >
                            Miles (mi)
                          </button>
                        </div>
                      </div>

                      <div className="py-1">
                        <Link
                          to={`/athletes/${user?._id}`}
                          onClick={() => setShowProfileMenu(false)}
                          className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                        >
                          <User className="w-4 h-4 text-slate-400" />
                          My Profile
                        </Link>
                        <Link
                          to="/settings"
                          onClick={() => setShowProfileMenu(false)}
                          className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                        >
                          <Settings className="w-4 h-4 text-slate-400" />
                          Privacy & Settings
                        </Link>
                      </div>

                      <div className="border-t border-slate-100 pt-1">
                        <button
                          onClick={() => {
                            logout();
                            setShowProfileMenu(false);
                            navigate('/login');
                          }}
                          className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                        >
                          <LogOut className="w-4 h-4" />
                          Log Out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-3 py-1.5 text-sm font-bold text-slate-700 hover:text-slate-900"
                >
                  Log In
                </Link>
                <Link
                  to="/register"
                  className="bg-brand-600 hover:bg-brand-700 text-white px-3.5 py-1.5 rounded-xl text-sm font-bold shadow-sm shadow-brand-600/20"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Global Search Modal */}
      {showSearchModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-start justify-center pt-20 px-4">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-200 flex items-center gap-3">
              <Search className="w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search athletes, clubs, segments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
                className="w-full text-sm font-medium focus:outline-none placeholder:text-slate-400 text-slate-900"
              />
              <button
                onClick={() => setShowSearchModal(false)}
                className="text-xs font-bold text-slate-400 hover:text-slate-700 bg-slate-100 px-2 py-1 rounded"
              >
                ESC
              </button>
            </div>

            <div className="max-h-96 overflow-y-auto p-4 space-y-4">
              {isSearching ? (
                <div className="text-center py-6 text-sm text-slate-400">Searching...</div>
              ) : !searchQuery.trim() ? (
                <div className="text-center py-6 text-xs text-slate-400">
                  Type an athlete name, club name, or segment to explore
                </div>
              ) : (
                <>
                  {/* Athletes */}
                  {searchResults.athletes?.length > 0 && (
                    <div>
                      <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                        Athletes
                      </h4>
                      <div className="space-y-1">
                        {searchResults.athletes.map((a) => (
                          <Link
                            key={a._id}
                            to={`/athletes/${a._id}`}
                            onClick={() => setShowSearchModal(false)}
                            className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 transition-colors"
                          >
                            <img
                              src={a.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                              alt=""
                              className="w-8 h-8 rounded-full object-cover"
                            />
                            <div>
                              <div className="text-sm font-bold text-slate-900">{a.name}</div>
                              <div className="text-xs text-slate-400">@{a.username}</div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Clubs */}
                  {searchResults.clubs?.length > 0 && (
                    <div>
                      <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                        Clubs
                      </h4>
                      <div className="space-y-1">
                        {searchResults.clubs.map((c) => (
                          <Link
                            key={c._id}
                            to={`/clubs/${c._id}`}
                            onClick={() => setShowSearchModal(false)}
                            className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 transition-colors"
                          >
                            <img
                              src={c.avatar || 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=100'}
                              alt=""
                              className="w-8 h-8 rounded-xl object-cover"
                            />
                            <div>
                              <div className="text-sm font-bold text-slate-900">{c.name}</div>
                              <div className="text-xs text-slate-400">{c.memberCount} members • {c.sportType}</div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Segments */}
                  {searchResults.segments?.length > 0 && (
                    <div>
                      <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                        Segments
                      </h4>
                      <div className="space-y-1">
                        {searchResults.segments.map((s) => (
                          <Link
                            key={s._id}
                            to={`/segments/${s._id}`}
                            onClick={() => setShowSearchModal(false)}
                            className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 transition-colors"
                          >
                            <div>
                              <div className="text-sm font-bold text-slate-900">{s.name}</div>
                              <div className="text-xs text-slate-400">{s.sportType} • {(s.distance / 1000).toFixed(2)} km</div>
                            </div>
                            <span className="text-xs font-mono-numbers text-slate-400">
                              {s.effortCount} efforts
                            </span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {searchResults.athletes?.length === 0 &&
                    searchResults.clubs?.length === 0 &&
                    searchResults.segments?.length === 0 && (
                      <div className="text-center py-6 text-sm text-slate-400">
                        No matches found for "{searchQuery}"
                      </div>
                    )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
