import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  TrendingUp,
  Award,
  Target,
  PlusCircle,
  Calendar,
  Flame,
  CheckCircle2,
  Trash2,
  ChevronRight,
} from 'lucide-react';
import { api } from '../services/api.js';
import { useAuthStore } from '../stores/authStore.js';
import {
  formatDistance,
  formatDuration,
  formatPace,
  formatSpeed,
  formatElevation,
  formatDate,
} from '../utils/formatters.js';

const SPORT_COLORS = {
  run: '#ea580c',
  ride: '#0284c7',
  walk: '#10b981',
  hike: '#f59e0b',
  workout: '#8b5cf6',
};

export default function TrainingAnalyticsPage() {
  const { user, unitPreference } = useAuthStore();
  const [timeframe, setTimeframe] = useState(30); // 7, 30, 90 days
  const [analytics, setAnalytics] = useState(null);
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showGoalModal, setShowGoalModal] = useState(false);

  // New goal form
  const [goalSport, setGoalSport] = useState('run');
  const [goalMetric, setGoalMetric] = useState('distance');
  const [goalTarget, setGoalTarget] = useState('50');
  const [goalPeriod, setGoalPeriod] = useState('monthly');

  const loadData = async (days) => {
    try {
      setLoading(true);
      const [analyticsData, goalsData] = await Promise.all([
        api.getDashboardAnalytics(days),
        api.getGoals(),
      ]);
      setAnalytics(analyticsData);
      setGoals(goalsData.goals || []);
    } catch (err) {
      console.error('Failed to load training analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(timeframe);
  }, [timeframe]);

  const handleCreateGoal = async (e) => {
    e.preventDefault();
    try {
      let targetVal = parseFloat(goalTarget);
      if (goalMetric === 'distance') {
        targetVal = unitPreference === 'imperial' ? targetVal * 1609.344 : targetVal * 1000;
      }

      await api.createGoal({
        sportType: goalSport,
        metricType: goalMetric,
        targetValue: Math.round(targetVal),
        period: goalPeriod,
      });

      setShowGoalModal(false);
      const updatedGoals = await api.getGoals();
      setGoals(updatedGoals.goals || []);
    } catch (err) {
      console.error('Failed to create goal:', err);
    }
  };

  const handleDeleteGoal = async (goalId) => {
    try {
      await api.deleteGoal(goalId);
      setGoals(goals.filter((g) => g._id !== goalId));
    } catch (err) {
      console.error('Failed to delete goal:', err);
    }
  };

  if (loading && !analytics) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-20 text-center text-slate-400">
        <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="font-semibold text-sm">Aggregating workout analytics and personal records...</p>
      </div>
    );
  }

  // Format daily trend data for charts
  const dailyChartData = (analytics?.dailyTrend || []).map((d) => ({
    date: d.date.slice(5), // 'MM-DD'
    distanceDisplay: parseFloat(formatDistance(d.distanceMeters, unitPreference).value),
    hours: Math.round((d.movingTimeSeconds / 3600) * 10) / 10,
    elevation: Math.round(d.elevationGainMeters),
  }));

  const lifetimeDist = formatDistance(analytics?.lifetime?.totalDistanceMeters, unitPreference);
  const lifetimeTime = formatDuration(analytics?.lifetime?.totalMovingTimeSeconds);
  const lifetimeElev = formatElevation(analytics?.lifetime?.totalElevationMeters, unitPreference);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Page Title & Timeframe Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Training Analytics</h1>
          <p className="text-sm text-slate-500 mt-1">
            Track historical mileage trends, personal records, and active training milestones.
          </p>
        </div>

        <div className="flex items-center gap-1 bg-slate-200/70 p-1 rounded-xl text-xs font-bold">
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => setTimeframe(d)}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                timeframe === d
                  ? 'bg-white text-slate-900 shadow-sm font-extrabold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Last {d} Days
            </button>
          ))}
        </div>
      </div>

      {/* Lifetime Big Numbers Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Distance</span>
          <div className="text-3xl font-black text-slate-900 font-mono-numbers mt-1">
            {lifetimeDist.value} <span className="text-xs font-medium text-slate-500">{lifetimeDist.unit}</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Moving Time</span>
          <div className="text-3xl font-black text-slate-900 font-mono-numbers mt-1">
            {lifetimeTime}
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Elevation Climbed</span>
          <div className="text-3xl font-black text-slate-900 font-mono-numbers mt-1">
            {lifetimeElev.value} <span className="text-xs font-medium text-slate-500">{lifetimeElev.unit}</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Logged Workouts</span>
          <div className="text-3xl font-black text-brand-600 font-mono-numbers mt-1">
            {analytics?.lifetime?.totalActivities || 0}
          </div>
        </div>
      </div>

      {/* Primary Training Volume Chart */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-900">
              Daily Distance Volume
            </h3>
            <p className="text-xs text-slate-400">
              Distance covered per day over the selected timeframe ({lifetimeDist.unit})
            </p>
          </div>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dailyChartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
              <XAxis dataKey="date" tickLine={false} axisLine={{ stroke: '#e2e8f0' }} tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <YAxis tickLine={false} axisLine={{ stroke: '#e2e8f0' }} tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-slate-900 text-white px-3 py-2 rounded-xl text-xs shadow-xl">
                        <div className="font-bold text-slate-300">{data.date}</div>
                        <div className="text-brand-400 font-mono-numbers mt-0.5">
                          Distance: <strong className="text-white">{data.distanceDisplay} {lifetimeDist.unit}</strong>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="distanceDisplay" fill="#ea580c" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Personal Records Trophy Wall */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">Personal Records Showcase</h3>
              <p className="text-xs text-slate-400">All-time benchmark achievements and endurance milestones</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {(analytics?.personalRecords || []).length === 0 ? (
            <div className="col-span-4 text-center py-8 text-xs text-slate-400">
              No personal records logged yet. Upload running or cycling activities to unlock trophies!
            </div>
          ) : (
            analytics.personalRecords.map((pr) => {
              const isTimePr = pr.category.startsWith('fastest') || pr.category === 'longest_duration';
              const isElevPr = pr.category === 'max_elevation_gain';
              const categoryLabel = {
                fastest_1k: 'Fastest 1 KM',
                fastest_1mi: 'Fastest 1 Mile',
                fastest_5k: 'Fastest 5 KM',
                fastest_10k: 'Fastest 10 KM',
                longest_distance: 'Longest Distance',
                longest_duration: 'Longest Duration',
                max_elevation_gain: 'Max Elevation Climb',
              }[pr.category] || pr.category;

              const displayValue = isTimePr
                ? formatDuration(pr.value)
                : isElevPr
                ? formatElevation(pr.value, unitPreference).full
                : formatDistance(pr.value, unitPreference).full;

              return (
                <div
                  key={pr._id}
                  className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80 hover:border-amber-400 transition-all group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {pr.sportType}
                    </span>
                    <span className="text-amber-500 font-bold text-xs">🏅 Gold</span>
                  </div>
                  <div className="text-sm font-extrabold text-slate-800">{categoryLabel}</div>
                  <div className="text-2xl font-black text-slate-900 font-mono-numbers my-1 text-brand-600">
                    {displayValue}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-2 flex items-center justify-between">
                    <span>{new Date(pr.achievedAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    {pr.activity && (
                      <Link
                        to={`/activities/${pr.activity._id}`}
                        className="font-bold text-slate-700 hover:text-brand-600 transition-colors"
                      >
                        View &rarr;
                      </Link>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Training Goals Section */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">Training Goals</h3>
              <p className="text-xs text-slate-400">Dynamic target progress evaluated from actual workouts</p>
            </div>
          </div>

          <button
            onClick={() => setShowGoalModal(true)}
            className="flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-sm transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Set New Goal</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {goals.length === 0 ? (
            <div className="col-span-2 text-center py-8 text-xs text-slate-400">
              No training goals active. Click "Set New Goal" to challenge yourself this week or month!
            </div>
          ) : (
            goals.map((g) => (
              <div
                key={g._id}
                className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3 relative group"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-600">
                      {g.period} • {g.sportType}
                    </span>
                    <h4 className="text-sm font-extrabold text-slate-900 mt-1 capitalize">
                      {g.metricType === 'distance'
                        ? `${formatDistance(g.targetValue, unitPreference).full} ${g.sportType} goal`
                        : g.metricType === 'activities_count'
                        ? `${g.targetValue} workouts ${g.sportType} goal`
                        : `${g.targetValue} ${g.metricType} goal`}
                    </h4>
                  </div>
                  <button
                    onClick={() => handleDeleteGoal(g._id)}
                    className="text-slate-300 hover:text-rose-600 p-1 transition-colors"
                    title="Delete goal"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-slate-700">
                      {g.metricType === 'distance'
                        ? formatDistance(g.currentValue, unitPreference).full
                        : g.currentValue}
                    </span>
                    <span className={g.isCompleted ? 'text-emerald-600 font-extrabold' : 'text-slate-500'}>
                      {g.percentage}% {g.isCompleted ? 'Completed! 🎉' : ''}
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        g.isCompleted ? 'bg-emerald-500' : 'bg-brand-600'
                      }`}
                      style={{ width: `${Math.min(100, g.percentage)}%` }}
                    />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Create Goal Modal */}
      {showGoalModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-200">
            <h3 className="text-lg font-black text-slate-900 mb-4">Set a New Training Goal</h3>
            <form onSubmit={handleCreateGoal} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Sport Type</label>
                <select
                  value={goalSport}
                  onChange={(e) => setGoalSport(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500"
                >
                  <option value="run">Running</option>
                  <option value="ride">Cycling</option>
                  <option value="walk">Walking</option>
                  <option value="all">All Sports Combined</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Target Metric</label>
                <select
                  value={goalMetric}
                  onChange={(e) => setGoalMetric(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500"
                >
                  <option value="distance">Distance ({unitPreference === 'imperial' ? 'miles' : 'km'})</option>
                  <option value="activities_count">Number of Workouts</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Target Value</label>
                <input
                  type="number"
                  min="1"
                  step="any"
                  value={goalTarget}
                  onChange={(e) => setGoalTarget(e.target.value)}
                  required
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Time Period</label>
                <select
                  value={goalPeriod}
                  onChange={(e) => setGoalPeriod(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500"
                >
                  <option value="weekly">Weekly (Next 7 days)</option>
                  <option value="monthly">Monthly (Calendar Month)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowGoalModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-brand-600 text-white rounded-xl font-bold hover:bg-brand-700 shadow-sm"
                >
                  Create Goal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
