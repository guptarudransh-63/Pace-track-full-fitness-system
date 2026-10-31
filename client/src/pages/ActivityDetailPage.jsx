import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Heart,
  MessageCircle,
  Share2,
  Clock,
  Flame,
  Zap,
  TrendingUp,
  MapPin,
  Lock,
  Globe,
  Users,
  Edit3,
  Trash2,
  Shield,
  Award,
  ChevronLeft,
  Compass,
} from 'lucide-react';
import RouteMap from '../components/Map/RouteMap.jsx';
import ElevationProfileChart from '../components/ElevationProfileChart.jsx';
import SplitsTable from '../components/SplitsTable.jsx';
import { useAuthStore } from '../stores/authStore.js';
import { api } from '../services/api.js';
import {
  formatDistance,
  formatDuration,
  formatPace,
  formatSpeed,
  formatElevation,
  formatDate,
} from '../utils/formatters.js';

export default function ActivityDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, unitPreference } = useAuthStore();

  const [activity, setActivity] = useState(null);
  const [routeData, setRouteData] = useState(null);
  const [splits, setSplits] = useState([]);
  const [segments, setSegments] = useState([]);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [hoverPoint, setHoverPoint] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasKudod, setHasKudod] = useState(false);
  const [kudosCount, setKudosCount] = useState(0);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editVisibility, setEditVisibility] = useState('public');
  const [editHideRoute, setEditHideRoute] = useState(false);
  const [editPrivacyRadius, setEditPrivacyRadius] = useState(0);
  const [showSegmentModal, setShowSegmentModal] = useState(false);
  const [segmentName, setSegmentName] = useState('');
  const [segmentDesc, setSegmentDesc] = useState('');
  const [segmentStartIndex, setSegmentStartIndex] = useState(0);
  const [segmentEndIndex, setSegmentEndIndex] = useState(0);
  const [creatingSegment, setCreatingSegment] = useState(false);
  const [segmentSuccess, setSegmentSuccess] = useState(false);

  useEffect(() => {
    async function loadActivityData() {
      try {
        setLoading(true);
        const [actRes, routeRes, splitsRes, segsRes, commRes] = await Promise.all([
          api.getActivity(id),
          api.getActivityRoute(id).catch(() => null),
          api.getActivitySplits(id).catch(() => ({ splits: [] })),
          api.getActivitySegments(id).catch(() => ({ efforts: [] })),
          api.getComments(id).catch(() => ({ comments: [] })),
        ]);

        const act = actRes.activity;
        setActivity(act);
        setHasKudod(act.hasKudod || false);
        setKudosCount(act.kudosCount || 0);
        setRouteData(routeRes);
        setSplits(splitsRes.splits || act.splits || []);
        setSegments(segsRes.efforts || []);
        setComments(commRes.comments || []);

        setEditTitle(act.title);
        setEditDesc(act.description || '');
        setEditVisibility(act.visibility || 'public');
        setEditHideRoute(act.hideRoute || false);
        setEditPrivacyRadius(act.hideStartFinishRadiusMeters || 0);
      } catch (err) {
        console.error('Failed to load activity:', err);
      } finally {
        setLoading(false);
      }
    }

    loadActivityData();
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16 text-center text-slate-400">
        <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="font-semibold text-sm">Processing activity GPS track...</p>
      </div>
    );
  }

  if (!activity) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <h2 className="text-xl font-bold text-slate-900 mb-2">Activity Not Found</h2>
        <p className="text-sm text-slate-500 mb-6">
          This workout may be private, restricted to followers, or removed by its owner.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-bold"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>
      </div>
    );
  }

  const isOwner = user && String(activity.user?._id) === String(user._id);
  const isCycling = activity.sportType === 'ride';
  const dist = formatDistance(activity.metrics?.distance, unitPreference);
  const movingTime = formatDuration(activity.metrics?.movingTime || activity.metrics?.elapsedTime);
  const elapsedTime = formatDuration(activity.metrics?.elapsedTime);
  const pace = formatPace(activity.metrics?.averageSpeed, unitPreference);
  const speed = formatSpeed(activity.metrics?.averageSpeed, unitPreference);
  const maxSpeed = formatSpeed(activity.metrics?.maxSpeed, unitPreference);
  const elevGain = formatElevation(activity.metrics?.elevationGain, unitPreference);
  const elevLoss = formatElevation(activity.metrics?.elevationLoss, unitPreference);

  const handleKudos = async () => {
    try {
      const res = await api.toggleKudos(activity._id);
      setHasKudod(res.kudod);
      setKudosCount(res.kudosCount);
    } catch (err) {
      console.error('Failed to toggle kudos:', err);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    try {
      const res = await api.addComment(activity._id, newComment);
      setComments([...comments, res.comment]);
      setNewComment('');
    } catch (err) {
      console.error('Failed to add comment:', err);
    }
  };

  const handleUpdateActivity = async (e) => {
    e.preventDefault();
    try {
      const res = await api.updateActivity(activity._id, {
        title: editTitle,
        description: editDesc,
        visibility: editVisibility,
        hideRoute: editHideRoute,
        hideStartFinishRadiusMeters: Number(editPrivacyRadius),
      });
      setActivity({ ...activity, ...res.activity });
      setShowEditModal(false);
      // Reload route to reflect updated privacy filters
      const updatedRoute = await api.getActivityRoute(activity._id);
      setRouteData(updatedRoute);
    } catch (err) {
      console.error('Failed to update activity:', err);
    }
  };

  const handleDeleteActivity = async () => {
    if (window.confirm('Are you sure you want to delete this workout? This action cannot be undone.')) {
      try {
        await api.deleteActivity(activity._id);
        navigate('/');
      } catch (err) {
        console.error('Failed to delete activity:', err);
      }
    }
  };

  const handleCreateSegment = async (e) => {
    e.preventDefault();
    if (!segmentName.trim() || Number(segmentEndIndex) <= Number(segmentStartIndex)) return;
    try {
      setCreatingSegment(true);
      await api.createSegment({
        activityId: activity._id,
        name: segmentName.trim(),
        description: segmentDesc,
        startIndex: Number(segmentStartIndex),
        endIndex: Number(segmentEndIndex),
      });
      setShowSegmentModal(false);
      setSegmentSuccess(true);
      setTimeout(() => setSegmentSuccess(false), 3000);
      const segsRes = await api.getActivitySegments(activity._id);
      setSegments(segsRes.efforts || []);
    } catch (err) {
      console.error('Failed to create segment:', err);
    } finally {
      setCreatingSegment(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div className="flex items-center gap-4">
            <Link to={`/athletes/${activity.user?._id}`}>
              <img
                src={activity.user?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120'}
                alt=""
                className="w-14 h-14 rounded-full object-cover border-2 border-slate-200"
              />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <Link
                  to={`/athletes/${activity.user?._id}`}
                  className="font-extrabold text-slate-900 text-lg hover:text-brand-600 transition-colors"
                >
                  {activity.user?.name}
                </Link>
                <span className="text-xs bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                  {activity.sportType}
                </span>
                {activity.isDemo && (
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 px-2 py-0.5 rounded border border-amber-200">
                    Sample GPX
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {formatDate(activity.startDate)}
                {activity.user?.city ? ` • ${activity.user.city}` : ''}
              </p>
            </div>
          </div>

          {/* Right Action buttons */}
          <div className="flex items-center gap-2">
            {isOwner && (
              <>
                <button
                  onClick={() => setShowEditModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Edit
                </button>
                <button
                  onClick={handleDeleteActivity}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-200 text-xs font-bold text-rose-600 hover:bg-rose-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
              </>
            )}

            <button
              onClick={handleKudos}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold shadow-sm transition-all ${
                hasKudod
                  ? 'bg-rose-600 text-white hover:bg-rose-700'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <Heart className={`w-4 h-4 ${hasKudod ? 'fill-white' : ''}`} />
              <span>{kudosCount} Kudos</span>
            </button>
          </div>
        </div>

        {/* Title, description, and privacy notice */}
        <div className="pt-5">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">{activity.title}</h1>
          {activity.description && (
            <p className="text-sm text-slate-600 mt-2 max-w-3xl leading-relaxed">
              {activity.description}
            </p>
          )}

          {/* Privacy Zone Indicator */}
          {routeData?.isPrivacyFiltered && (
            <div className="mt-4 inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200/80 px-3 py-1.5 rounded-xl text-xs font-medium text-emerald-800">
              <Shield className="w-4 h-4 text-emerald-600" />
              <span>
                <strong>Privacy Shield Active:</strong> Route coordinates near private start/finish zones are redacted server-side.
              </span>
            </div>
          )}
        </div>

        {/* Primary Metrics Banner */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 mt-6 pt-6 border-t border-slate-100">
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Distance</div>
            <div className="text-2xl font-black text-slate-900 font-mono-numbers mt-0.5">
              {dist.value} <span className="text-xs font-medium text-slate-500">{dist.unit}</span>
            </div>
          </div>

          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Moving Time</div>
            <div className="text-2xl font-black text-slate-900 font-mono-numbers mt-0.5">
              {movingTime}
            </div>
          </div>

          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              {isCycling ? 'Avg Speed' : 'Avg Pace'}
            </div>
            <div className="text-2xl font-black text-slate-900 font-mono-numbers mt-0.5">
              {isCycling ? speed.value : pace.value}{' '}
              <span className="text-xs font-medium text-slate-500">
                {isCycling ? speed.unit : pace.unit}
              </span>
            </div>
          </div>

          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Elevation Gain</div>
            <div className="text-2xl font-black text-slate-900 font-mono-numbers mt-0.5">
              {elevGain.value} <span className="text-xs font-medium text-slate-500">{elevGain.unit}</span>
            </div>
          </div>

          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              {isCycling ? 'Max Speed' : 'Elapsed Time'}
            </div>
            <div className="text-2xl font-black text-slate-900 font-mono-numbers mt-0.5">
              {isCycling ? `${maxSpeed.value} ${maxSpeed.unit}` : elapsedTime}
            </div>
          </div>

          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Calories</div>
            <div className="text-2xl font-black text-slate-900 font-mono-numbers mt-0.5">
              {activity.metrics?.calories || 0}{' '}
              <span className="text-xs font-medium text-slate-500">kcal</span>
            </div>
          </div>
        </div>

        {/* Additional Sensor telemetry if present (Heart Rate & Cadence) */}
        {(activity.metrics?.averageHeartRate || activity.metrics?.averageCadence) && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-4 pt-4 border-t border-slate-100 bg-slate-50/60 -mx-6 -mb-6 p-6 rounded-b-2xl">
            {activity.metrics?.averageHeartRate && (
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase">Avg Heart Rate</span>
                <div className="text-lg font-extrabold text-rose-600 font-mono-numbers">
                  {activity.metrics.averageHeartRate} <span className="text-xs text-slate-500">bpm</span>
                </div>
              </div>
            )}
            {activity.metrics?.maxHeartRate && (
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase">Max Heart Rate</span>
                <div className="text-lg font-extrabold text-slate-800 font-mono-numbers">
                  {activity.metrics.maxHeartRate} <span className="text-xs text-slate-500">bpm</span>
                </div>
              </div>
            )}
            {activity.metrics?.averageCadence && (
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase">Avg Cadence</span>
                <div className="text-lg font-extrabold text-slate-800 font-mono-numbers">
                  {activity.metrics.averageCadence} <span className="text-xs text-slate-500">rpm</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Interactive GPS Map & Synchronized Elevation Chart */}
      {!activity.hideRoute && routeData && (
        <div className="space-y-4">
          <RouteMap
            encodedPolyline={routeData.summaryPolyline}
            points={routeData.points}
            bounds={activity.bounds}
            hoverPoint={hoverPoint}
            height="440px"
            interactive={true}
          />

          {routeData.elevationProfile?.length > 1 && (
            <ElevationProfileChart
              elevationProfile={routeData.elevationProfile}
              points={routeData.points}
              unitPreference={unitPreference}
              onHoverPoint={(pt) => setHoverPoint(pt)}
            />
          )}
        </div>
      )}

      {/* Splits Breakdown */}
      {splits.length > 0 && (
        <div>
          <SplitsTable
            splits={splits}
            sportType={activity.sportType}
            unitPreference={unitPreference}
          />
        </div>
      )}

      {/* Matched Segments Leaderboard Section */}
      {(segments.length > 0 || (isOwner && routeData?.points?.length > 10)) && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="px-5 py-3.5 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-brand-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Matched Route Segments ({segments.length})
              </h3>
            </div>
            <div className="flex items-center gap-3">
              {isOwner && routeData?.points?.length > 10 && (
                <button
                  onClick={() => {
                    setSegmentName('');
                    setSegmentDesc('');
                    setSegmentStartIndex(0);
                    setSegmentEndIndex(
                      Math.min(
                        routeData.points.length - 1,
                        Math.max(1, Math.floor(routeData.points.length / 2))
                      )
                    );
                    setShowSegmentModal(true);
                  }}
                  className="flex items-center gap-1.5 text-xs font-bold text-brand-600 hover:text-brand-700 bg-brand-50 px-2.5 py-1 rounded-lg transition-colors"
                >
                  <Compass className="w-3.5 h-3.5" />
                  <span>Create Segment</span>
                </button>
              )}
              <span className="text-xs text-slate-400">Rank & Personal Records</span>
            </div>
          </div>

          {segments.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400">
              No existing segments matched this activity. Click "Create Segment" above to define a new sprint or climb from your GPS track!
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {segments.map((effort) => (
                <div key={effort._id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div>
                    <Link
                      to={`/segments/${effort.segment?._id}`}
                      className="font-bold text-slate-900 text-sm hover:text-brand-600 transition-colors"
                    >
                      {effort.segment?.name || 'Segment'}
                    </Link>
                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 font-mono-numbers">
                      <span>{formatDistance(effort.segment?.distance, unitPreference).full}</span>
                      <span>•</span>
                      <span>Elev {effort.segment?.elevationDiff}m</span>
                      {effort.isPersonalRecord && (
                        <span className="bg-amber-100 text-amber-800 text-[10px] font-extrabold px-2 py-0.5 rounded uppercase tracking-wide">
                          PR Effort
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-base font-extrabold text-slate-900 font-mono-numbers">
                      {formatDuration(effort.elapsedTime)}
                    </div>
                    <div className="text-xs font-bold text-brand-600">
                      Rank #{effort.rank || 1}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Comments & Discussion */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-slate-500" />
          <span>Comments & Kudos ({comments.length})</span>
        </h3>

        <div className="space-y-4 mb-6">
          {comments.length === 0 ? (
            <p className="text-xs text-slate-400 py-2">No comments yet.</p>
          ) : (
            comments.map((c) => (
              <div key={c._id} className="flex gap-3 text-xs">
                <img
                  src={c.user?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                  alt=""
                  className="w-8 h-8 rounded-full object-cover flex-shrink-0 border border-slate-200"
                />
                <div className="bg-slate-50 rounded-xl p-3 flex-1 border border-slate-100">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-slate-900">{c.user?.name}</span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(c.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-slate-700 leading-relaxed">{c.text}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Comment Input */}
        <form onSubmit={handleAddComment} className="flex gap-3">
          <input
            type="text"
            placeholder="Write a message of encouragement..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
          />
          <button
            type="submit"
            disabled={!newComment.trim()}
            className="bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl disabled:opacity-50 transition-colors shadow-sm"
          >
            Post Comment
          </button>
        </form>
      </div>

      {/* Edit Activity Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Edit Activity & Privacy</h3>
            <form onSubmit={handleUpdateActivity} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Title</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={3}
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Visibility</label>
                <select
                  value={editVisibility}
                  onChange={(e) => setEditVisibility(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="public">Public (Everyone)</option>
                  <option value="followers">Followers Only</option>
                  <option value="private">Private (Only You)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Start / Finish Privacy Buffer (meters)
                </label>
                <input
                  type="number"
                  min="0"
                  max="2000"
                  step="50"
                  value={editPrivacyRadius}
                  onChange={(e) => setEditPrivacyRadius(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Hides route coordinates within this radius of start and finish points from other athletes.
                </p>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="hideRouteCheck"
                  checked={editHideRoute}
                  onChange={(e) => setEditHideRoute(e.target.checked)}
                  className="rounded text-brand-600 focus:ring-brand-500"
                />
                <label htmlFor="hideRouteCheck" className="font-semibold text-slate-700">
                  Completely hide route map from non-owners
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-brand-600 text-white rounded-xl font-bold hover:bg-brand-700 shadow-sm"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Segment Modal */}
      {showSegmentModal && routeData?.points && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-2">
              <Compass className="w-5 h-5 text-brand-600" />
              <h3 className="text-lg font-bold text-slate-900">Create Segment from Route</h3>
            </div>
            <p className="text-xs text-slate-500">
              Define a designated sprint or climb section along this activity's GPS coordinates.
            </p>

            <form onSubmit={handleCreateSegment} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Segment Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Marina Green Sprint"
                  value={segmentName}
                  onChange={(e) => setSegmentName(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Description (optional)</label>
                <textarea
                  rows={2}
                  placeholder="Terrain, landmarks, sprint cues..."
                  value={segmentDesc}
                  onChange={(e) => setSegmentDesc(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <span className="font-bold text-slate-700 block">Trim Route Coordinates</span>

                <div>
                  <div className="flex justify-between text-[11px] font-semibold text-slate-500 mb-1">
                    <span>Start Point</span>
                    <span className="font-mono-numbers">
                      {formatDistance(routeData.points[segmentStartIndex]?.distFromStart || 0, unitPreference).full}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max={Math.max(0, segmentEndIndex - 1)}
                    value={segmentStartIndex}
                    onChange={(e) => setSegmentStartIndex(Number(e.target.value))}
                    className="w-full accent-brand-600"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[11px] font-semibold text-slate-500 mb-1">
                    <span>Finish Point</span>
                    <span className="font-mono-numbers">
                      {formatDistance(routeData.points[segmentEndIndex]?.distFromStart || 0, unitPreference).full}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={Math.min(routeData.points.length - 1, segmentStartIndex + 1)}
                    max={routeData.points.length - 1}
                    value={segmentEndIndex}
                    onChange={(e) => setSegmentEndIndex(Number(e.target.value))}
                    className="w-full accent-brand-600"
                  />
                </div>

                <div className="pt-2 border-t border-slate-200 flex justify-between font-mono-numbers text-xs font-bold text-slate-800">
                  <span>
                    Segment Distance:{' '}
                    {formatDistance(
                      Math.max(
                        0,
                        (routeData.points[segmentEndIndex]?.distFromStart || 0) -
                          (routeData.points[segmentStartIndex]?.distFromStart || 0)
                      ),
                      unitPreference
                    ).full}
                  </span>
                  <span>
                    Elev:{' '}
                    {Math.round(
                      ((routeData.points[segmentEndIndex]?.ele || 0) -
                        (routeData.points[segmentStartIndex]?.ele || 0)) *
                        10
                    ) / 10}
                    m
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowSegmentModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingSegment || !segmentName.trim()}
                  className="px-5 py-2 bg-brand-600 text-white rounded-xl font-bold hover:bg-brand-700 disabled:opacity-50 shadow-sm"
                >
                  {creatingSegment ? 'Creating...' : 'Create Segment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
