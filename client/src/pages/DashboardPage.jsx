import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  PlusCircle,
  TrendingUp,
  Award,
  Users,
  Compass,
  ArrowRight,
  Flame,
  Clock,
  MapPin,
  ChevronRight,
} from 'lucide-react';
import ActivityCard from '../components/ActivityCard.jsx';
import { useAuthStore } from '../stores/authStore.js';
import { api } from '../services/api.js';
import { formatDistance, formatDuration, formatElevation } from '../utils/formatters.js';

export default function DashboardPage() {
  const { user, isAuthenticated, unitPreference } = useAuthStore();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedFilter, setFeedFilter] = useState('all'); // 'all' or 'following'
  const [analytics, setAnalytics] = useState(null);
  const [goals, setGoals] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);

  // Load feed activities
  const fetchFeed = async (filter = 'all', cursor = null) => {
    try {
      if (!cursor) setLoading(true);
      else setLoadingMore(true);

      const params = { filter };
      if (cursor) params.cursor = cursor;

      const res = await api.getFeed(params);
      if (cursor) {
        setActivities((prev) => [...prev, ...(res.activities || [])]);
      } else {
        setActivities(res.activities || []);
      }
      setNextCursor(res.nextCursor);
    } catch (err) {
      console.error('Failed to load feed:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchFeed(feedFilter);
  }, [feedFilter]);

  // Load analytics and goals for authenticated user
  useEffect(() => {
    if (isAuthenticated) {
      api.getDashboardAnalytics(7)
        .then((data) => setAnalytics(data))
        .catch(() => {});

      api.getGoals()
        .then((data) => setGoals(data.goals || []))
        .catch(() => {});
    }
  }, [isAuthenticated]);

  const weeklyDist = formatDistance(analytics?.weeklySummary?.distanceMeters || 0, unitPreference);
  const weeklyTime = formatDuration(analytics?.weeklySummary?.movingTimeSeconds || 0);
  const weeklyElev = formatElevation(analytics?.weeklySummary?.elevationGainMeters || 0, unitPreference);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Main Feed Column (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Feed Filter Tabs */}
          <div className="flex items-center justify-between bg-white p-2 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setFeedFilter('all')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  feedFilter === 'all'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                Community Feed
              </button>
              {isAuthenticated && (
                <button
                  onClick={() => setFeedFilter('following')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    feedFilter === 'following'
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  Following Only
                </button>
              )}
            </div>

            <Link
              to="/record"
              className="flex items-center gap-1.5 text-xs font-bold text-brand-600 hover:text-brand-700 bg-brand-50 px-3 py-1.5 rounded-xl transition-colors"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Add Workout</span>
            </Link>
          </div>

          {/* Activity Cards List */}
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-2xl border border-slate-200 p-6 animate-pulse space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-200" />
                    <div className="space-y-2 flex-1">
                      <div className="h-4 bg-slate-200 rounded w-1/4" />
                      <div className="h-3 bg-slate-200 rounded w-1/6" />
                    </div>
                  </div>
                  <div className="h-40 bg-slate-100 rounded-xl" />
                </div>
              ))}
            </div>
          ) : activities.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
              <div className="w-12 h-12 bg-orange-100 text-brand-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <Flame className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1">No activities in this feed yet</h3>
              <p className="text-xs text-slate-500 mb-5 max-w-sm mx-auto">
                Upload your first GPX workout or record a session to visualize GPS routes, pace splits, and climb leaderboards.
              </p>
              <Link
                to="/record"
                className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md shadow-brand-600/20"
              >
                <PlusCircle className="w-4 h-4" />
                Upload GPX Activity
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              {activities.map((activity) => (
                <ActivityCard
                  key={activity._id}
                  activity={activity}
                  unitPreference={unitPreference}
                  currentUserId={user?._id}
                />
              ))}

              {nextCursor && (
                <div className="text-center pt-2">
                  <button
                    onClick={() => fetchFeed(feedFilter, nextCursor)}
                    disabled={loadingMore}
                    className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-5 py-2.5 rounded-xl text-xs font-bold shadow-sm transition-all"
                  >
                    {loadingMore ? 'Loading more workouts...' : 'Load Older Activities'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Sidebar Widgets (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          {isAuthenticated && (
            <>
              {/* Athlete Weekly Summary Card */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                <div className="flex items-center gap-3.5 pb-4 border-b border-slate-100">
                  <img
                    src={user?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120'}
                    alt=""
                    className="w-12 h-12 rounded-full object-cover border border-slate-200"
                  />
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-sm">{user?.name}</h3>
                    <p className="text-xs text-slate-400">@{user?.username}</p>
                  </div>
                </div>

                <div className="pt-4">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center justify-between">
                    <span>This Week's Training</span>
                    <span className="text-brand-600 font-extrabold">Last 7 Days</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center py-2 bg-slate-50 rounded-xl border border-slate-100">
                    <div>
                      <div className="text-xs font-bold text-slate-400 uppercase tracking-tight">Dist</div>
                      <div className="text-base font-extrabold text-slate-900 font-mono-numbers mt-0.5">
                        {weeklyDist.value}
                      </div>
                      <div className="text-[10px] text-slate-400">{weeklyDist.unit}</div>
                    </div>

                    <div>
                      <div className="text-xs font-bold text-slate-400 uppercase tracking-tight">Time</div>
                      <div className="text-base font-extrabold text-slate-900 font-mono-numbers mt-0.5">
                        {weeklyTime}
                      </div>
                      <div className="text-[10px] text-slate-400">total</div>
                    </div>

                    <div>
                      <div className="text-xs font-bold text-slate-400 uppercase tracking-tight">Elev</div>
                      <div className="text-base font-extrabold text-slate-900 font-mono-numbers mt-0.5">
                        {weeklyElev.value}
                      </div>
                      <div className="text-[10px] text-slate-400">{weeklyElev.unit}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Training Goals Widget */}
              {goals.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Active Training Goals
                    </h4>
                    <Link to="/training" className="text-xs font-bold text-brand-600 hover:underline">
                      Manage
                    </Link>
                  </div>

                  <div className="space-y-4">
                    {goals.slice(0, 2).map((g) => (
                      <div key={g._id} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-800 capitalize">
                            {g.sportType} {g.metricType} Goal
                          </span>
                          <span className="font-mono-numbers text-slate-600 font-bold">
                            {g.percentage}%
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              g.isCompleted ? 'bg-emerald-500' : 'bg-brand-600'
                            }`}
                            style={{ width: `${Math.min(100, g.percentage)}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-400 font-mono-numbers">
                          <span>
                            {g.metricType === 'distance'
                              ? `${formatDistance(g.currentValue, unitPreference).full}`
                              : `${g.currentValue}`}
                          </span>
                          <span>
                            Target:{' '}
                            {g.metricType === 'distance'
                              ? `${formatDistance(g.targetValue, unitPreference).full}`
                              : `${g.targetValue}`}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Quick Record CTA Banner */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-5 rounded-2xl shadow-lg relative overflow-hidden">
            <div className="relative z-10">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
                PaceTrack Ingestion
              </span>
              <h3 className="text-base font-extrabold mt-2 mb-1">Have a GPX Track?</h3>
              <p className="text-xs text-slate-300 mb-4 leading-relaxed">
                Upload raw GPX files from Garmin, Wahoo, Apple Watch, or phones. We calculate moving time, elevation noise reduction, and distance splits automatically.
              </p>
              <Link
                to="/record"
                className="inline-flex items-center gap-1.5 bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-md transition-all"
              >
                <span>Upload Workout File</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Quick Links / Explore Widget */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-2">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1">
              Explore PaceTrack
            </div>
            <Link
              to="/explore"
              className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 transition-colors text-xs font-bold text-slate-800"
            >
              <span className="flex items-center gap-2.5">
                <Compass className="w-4 h-4 text-brand-600" />
                Popular Route Segments
              </span>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </Link>
            <Link
              to="/clubs"
              className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 transition-colors text-xs font-bold text-slate-800"
            >
              <span className="flex items-center gap-2.5">
                <Users className="w-4 h-4 text-sky-600" />
                Find Fitness Clubs
              </span>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </Link>
            <Link
              to="/training"
              className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 transition-colors text-xs font-bold text-slate-800"
            >
              <span className="flex items-center gap-2.5">
                <Award className="w-4 h-4 text-amber-500" />
                Personal Records Trophy Wall
              </span>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
