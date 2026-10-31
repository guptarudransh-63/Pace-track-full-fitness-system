import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  User,
  MapPin,
  Calendar,
  Award,
  TrendingUp,
  Shield,
  UserPlus,
  UserCheck,
  Globe,
  Lock,
  Users,
} from 'lucide-react';
import { api } from '../services/api.js';
import { useAuthStore } from '../stores/authStore.js';
import {
  formatDistance,
  formatDuration,
  formatElevation,
  formatDate,
} from '../utils/formatters.js';
import ActivityCard from '../components/ActivityCard.jsx';

export default function ProfilePage() {
  const { userId } = useParams();
  const { user: currentUser, unitPreference, setUnitPreference, updateUser } = useAuthStore();
  const targetId = userId || currentUser?._id;

  const [athlete, setAthlete] = useState(null);
  const [stats, setStats] = useState(null);
  const [personalRecords, setPersonalRecords] = useState([]);
  const [activities, setActivities] = useState([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);

  // Privacy preferences edit state
  const [defaultVisibility, setDefaultVisibility] = useState('public');
  const [hideHomeRadius, setHideHomeRadius] = useState(0);
  const [homeLat, setHomeLat] = useState('');
  const [homeLng, setHomeLng] = useState('');
  const [savingPrivacy, setSavingPrivacy] = useState(false);
  const [privacySuccess, setPrivacySuccess] = useState(false);

  const isSelf = currentUser && String(currentUser._id) === String(targetId);

  useEffect(() => {
    async function loadProfile() {
      if (!targetId) return;
      try {
        setLoading(true);
        const [statsRes, actsRes] = await Promise.all([
          api.getAthleteStats(targetId),
          api.getUserActivities(targetId),
        ]);

        setAthlete(statsRes.athlete);
        setStats(statsRes.stats);
        setPersonalRecords(statsRes.personalRecords || []);
        setActivities(actsRes.activities || []);
        if (statsRes.isFollowing !== undefined) {
          setIsFollowing(statsRes.isFollowing);
        }

        if (isSelf && statsRes.athlete.privacyPreferences) {
          setDefaultVisibility(statsRes.athlete.privacyPreferences.defaultActivityVisibility || 'public');
          setHideHomeRadius(statsRes.athlete.privacyPreferences.hideHomeRadiusMeters || 0);
          setHomeLat(statsRes.athlete.privacyPreferences.homeLatitude ?? '');
          setHomeLng(statsRes.athlete.privacyPreferences.homeLongitude ?? '');
        }
      } catch (err) {
        console.error('Failed to load athlete profile:', err);
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [targetId, isSelf]);

  const handleToggleFollow = async () => {
    if (!athlete || isSelf) return;
    try {
      const res = await api.toggleFollow(athlete._id);
      setIsFollowing(res.following);
    } catch (err) {
      console.error('Failed to toggle follow:', err);
    }
  };

  const handleSavePrivacy = async (e) => {
    e.preventDefault();
    setSavingPrivacy(true);
    setPrivacySuccess(false);
    try {
      const res = await api.updatePreferences({
        privacyPreferences: {
          defaultActivityVisibility: defaultVisibility,
          hideHomeRadiusMeters: Number(hideHomeRadius),
          homeLatitude: homeLat ? Number(homeLat) : null,
          homeLongitude: homeLng ? Number(homeLng) : null,
        },
      });
      updateUser(res.user);
      setPrivacySuccess(true);
      setTimeout(() => setPrivacySuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save privacy settings:', err);
    } finally {
      setSavingPrivacy(false);
    }
  };

  if (loading && !athlete) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center text-slate-400">
        <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="font-semibold text-sm">Loading athlete profile & trophies...</p>
      </div>
    );
  }

  if (!athlete) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <h2 className="text-xl font-bold text-slate-900 mb-2">Athlete Not Found</h2>
        <Link to="/" className="text-xs font-bold text-brand-600 hover:underline">
          &larr; Back to Dashboard
        </Link>
      </div>
    );
  }

  const lifetimeDist = formatDistance(stats?.totalDistanceMeters, unitPreference);
  const lifetimeTime = formatDuration(stats?.totalMovingTimeSeconds);
  const lifetimeElev = formatElevation(stats?.totalElevationMeters, unitPreference);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Athlete Header Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-slate-100">
          <div className="flex items-center gap-5">
            <img
              src={athlete.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
              alt=""
              className="w-20 h-20 rounded-full object-cover border-4 border-slate-100 shadow-md"
            />
            <div>
              <h1 className="text-2xl font-black text-slate-900">{athlete.name}</h1>
              <p className="text-xs text-slate-400 font-medium">@{athlete.username}</p>
              {athlete.city && (
                <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>{athlete.city}{athlete.country ? `, ${athlete.country}` : ''}</span>
                </div>
              )}
            </div>
          </div>

          <div>
            {!isSelf && currentUser && (
              <button
                onClick={handleToggleFollow}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-extrabold shadow-sm transition-all ${
                  isFollowing
                    ? 'bg-slate-100 text-slate-700 hover:bg-rose-50 hover:text-rose-600'
                    : 'bg-brand-600 hover:bg-brand-700 text-white shadow-brand-600/30'
                }`}
              >
                {isFollowing ? (
                  <>
                    <UserCheck className="w-4 h-4 text-emerald-600" />
                    <span>Following</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>Follow Athlete</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {athlete.bio && (
          <p className="text-sm text-slate-600 mt-4 max-w-2xl leading-relaxed">
            {athlete.bio}
          </p>
        )}

        {/* Lifetime Totals Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-100">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Lifetime Distance</span>
            <div className="text-2xl font-black text-slate-900 font-mono-numbers mt-0.5">
              {lifetimeDist.value} <span className="text-xs font-medium text-slate-500">{lifetimeDist.unit}</span>
            </div>
          </div>

          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Moving Time</span>
            <div className="text-2xl font-black text-slate-900 font-mono-numbers mt-0.5">
              {lifetimeTime}
            </div>
          </div>

          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Climb</span>
            <div className="text-2xl font-black text-slate-900 font-mono-numbers mt-0.5">
              {lifetimeElev.value} <span className="text-xs font-medium text-slate-500">{lifetimeElev.unit}</span>
            </div>
          </div>

          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Workouts</span>
            <div className="text-2xl font-black text-brand-600 font-mono-numbers mt-0.5">
              {stats?.activityCount || 0}
            </div>
          </div>
        </div>
      </div>

      {/* Trophies Wall */}
      {personalRecords.length > 0 && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-500" />
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-900">
              Personal Records ({personalRecords.length})
            </h3>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {personalRecords.map((pr) => {
              const isTimePr = pr.category.startsWith('fastest') || pr.category === 'longest_duration';
              const isElevPr = pr.category === 'max_elevation_gain';
              const val = isTimePr
                ? formatDuration(pr.value)
                : isElevPr
                ? formatElevation(pr.value, unitPreference).full
                : formatDistance(pr.value, unitPreference).full;

              const label = {
                fastest_1k: 'Fastest 1 KM',
                fastest_1mi: 'Fastest 1 Mile',
                fastest_5k: 'Fastest 5 KM',
                fastest_10k: 'Fastest 10 KM',
                longest_distance: 'Longest Distance',
                longest_duration: 'Longest Duration',
                max_elevation_gain: 'Max Elevation',
              }[pr.category] || pr.category;

              return (
                <div key={pr._id} className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                  <span className="text-[10px] font-bold uppercase text-slate-400">{label}</span>
                  <div className="text-lg font-black text-slate-900 font-mono-numbers my-0.5 text-brand-600">
                    {val}
                  </div>
                  <span className="text-[10px] text-slate-400 block font-mono-numbers">
                    {new Date(pr.achievedAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Account Settings & Location Privacy (Owner Only) */}
      {isSelf && (
        <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm space-y-6">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <Shield className="w-5 h-5 text-emerald-600" />
            <div>
              <h3 className="text-base font-black text-slate-900">Location Privacy & Buffer Settings</h3>
              <p className="text-xs text-slate-400">
                Server-side protection: Redacts route points near your home/work privacy zones from non-owners.
              </p>
            </div>
          </div>

          <form onSubmit={handleSavePrivacy} className="space-y-4 text-xs">
            {privacySuccess && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-3 rounded-xl font-bold">
                Privacy preferences saved successfully!
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Default Activity Visibility
                </label>
                <select
                  value={defaultVisibility}
                  onChange={(e) => setDefaultVisibility(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500"
                >
                  <option value="public">Public (Everyone can see)</option>
                  <option value="followers">Followers Only</option>
                  <option value="private">Private (Only you can see)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Home Privacy Shield Radius (meters)
                </label>
                <input
                  type="number"
                  min="0"
                  max="2000"
                  step="50"
                  value={hideHomeRadius}
                  onChange={(e) => setHideHomeRadius(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Home Latitude (optional)</label>
                <input
                  type="number"
                  step="any"
                  placeholder="37.7955"
                  value={homeLat}
                  onChange={(e) => setHomeLat(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Home Longitude (optional)</label>
                <input
                  type="number"
                  step="any"
                  placeholder="-122.3937"
                  value={homeLng}
                  onChange={(e) => setHomeLng(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={savingPrivacy}
              className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-sm transition-all"
            >
              {savingPrivacy ? 'Saving...' : 'Update Privacy Settings'}
            </button>
          </form>
        </div>
      )}

      {/* Recent Activities List */}
      <div className="space-y-4">
        <h3 className="text-base font-extrabold text-slate-900">
          Recent Activities ({activities.length})
        </h3>

        {activities.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-xs text-slate-400">
            No public activities to show.
          </div>
        ) : (
          activities.map((act) => (
            <ActivityCard
              key={act._id}
              activity={act}
              unitPreference={unitPreference}
              currentUserId={currentUser?._id}
            />
          ))
        )}
      </div>
    </div>
  );
}
