import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Heart,
  MessageCircle,
  Share2,
  Lock,
  Users,
  Globe,
  Flame,
  Clock,
  TrendingUp,
  MapPin,
} from 'lucide-react';
import RouteMap from './Map/RouteMap.jsx';
import { formatDistance, formatDuration, formatPace, formatSpeed, formatElevation, formatDate } from '../utils/formatters.js';
import { api } from '../services/api.js';

export default function ActivityCard({
  activity,
  unitPreference = 'metric',
  currentUserId = null,
  onKudosToggled = null,
}) {
  const [hasKudod, setHasKudod] = useState(activity.hasKudod || false);
  const [kudosCount, setKudosCount] = useState(activity.kudosCount || 0);
  const [isLiking, setIsLiking] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [commentsCount, setCommentsCount] = useState(activity.commentsCount || 0);
  const [loadingComments, setLoadingComments] = useState(false);

  const isCycling = activity.sportType === 'ride';
  const dist = formatDistance(activity.metrics?.distance, unitPreference);
  const pace = formatPace(activity.metrics?.averageSpeed, unitPreference);
  const speed = formatSpeed(activity.metrics?.averageSpeed, unitPreference);
  const time = formatDuration(activity.metrics?.movingTime || activity.metrics?.elapsedTime);
  const elev = formatElevation(activity.metrics?.elevationGain, unitPreference);

  const handleKudos = async (e) => {
    e.preventDefault();
    if (isLiking) return;
    setIsLiking(true);
    try {
      const res = await api.toggleKudos(activity._id);
      setHasKudod(res.kudod);
      setKudosCount(res.kudosCount);
      if (onKudosToggled) onKudosToggled(activity._id, res.kudod, res.kudosCount);
    } catch (err) {
      console.error('Failed to toggle kudos:', err);
    } finally {
      setIsLiking(false);
    }
  };

  const handleToggleComments = async (e) => {
    e.preventDefault();
    if (!showComments && comments.length === 0) {
      setLoadingComments(true);
      try {
        const res = await api.getComments(activity._id);
        setComments(res.comments || []);
      } catch (err) {
        console.error('Failed to load comments:', err);
      } finally {
        setLoadingComments(false);
      }
    }
    setShowComments(!showComments);
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    try {
      const res = await api.addComment(activity._id, commentText);
      setComments([...comments, res.comment]);
      setCommentsCount(res.commentsCount);
      setCommentText('');
    } catch (err) {
      console.error('Failed to add comment:', err);
    }
  };

  const sportBadgeColor = {
    run: 'bg-orange-100 text-brand-700 border-orange-200',
    ride: 'bg-sky-100 text-sky-700 border-sky-200',
    walk: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    hike: 'bg-amber-100 text-amber-700 border-amber-200',
    workout: 'bg-purple-100 text-purple-700 border-purple-200',
  }[activity.sportType] || 'bg-slate-100 text-slate-700 border-slate-200';

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      {/* Athlete Header */}
      <div className="p-4 pb-3 flex items-center justify-between border-b border-slate-100">
        <div className="flex items-center gap-3">
          <Link to={`/athletes/${activity.user?._id || ''}`}>
            <img
              src={activity.user?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
              alt={activity.user?.name || 'Athlete'}
              className="w-10 h-10 rounded-full object-cover border border-slate-200 hover:ring-2 hover:ring-brand-500 transition-all"
            />
          </Link>
          <div>
            <Link
              to={`/athletes/${activity.user?._id || ''}`}
              className="text-sm font-bold text-slate-900 hover:text-brand-600 transition-colors"
            >
              {activity.user?.name || 'Athlete'}
            </Link>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span>{formatDate(activity.startDate)}</span>
              {activity.user?.city && (
                <>
                  <span>•</span>
                  <span>{activity.user.city}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Visibility Badge */}
        <div className="flex items-center gap-2">
          {activity.isDemo && (
            <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-500 px-2 py-0.5 rounded border border-slate-200">
              Sample GPX
            </span>
          )}
          <span className="text-slate-400" title={`Visibility: ${activity.visibility}`}>
            {activity.visibility === 'public' && <Globe className="w-3.5 h-3.5" />}
            {activity.visibility === 'followers' && <Users className="w-3.5 h-3.5" />}
            {activity.visibility === 'private' && <Lock className="w-3.5 h-3.5" />}
          </span>
        </div>
      </div>

      {/* Activity Details & Title */}
      <div className="px-5 pt-3 pb-2">
        <div className="flex items-center gap-2 mb-1.5">
          <span className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${sportBadgeColor}`}>
            {activity.sportType}
          </span>
          <Link
            to={`/activities/${activity._id}`}
            className="text-lg font-bold text-slate-900 hover:text-brand-600 transition-colors line-clamp-1"
          >
            {activity.title}
          </Link>
        </div>

        {activity.description && (
          <p className="text-sm text-slate-600 mb-3 line-clamp-2">
            {activity.description}
          </p>
        )}

        {/* Metrics Grid */}
        <div className="grid grid-cols-4 gap-3 py-3 border-y border-slate-100 my-2">
          <div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Distance
            </div>
            <div className="text-base font-extrabold text-slate-900 font-mono-numbers">
              {dist.value} <span className="text-xs font-medium text-slate-500">{dist.unit}</span>
            </div>
          </div>

          <div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              {isCycling ? 'Avg Speed' : 'Avg Pace'}
            </div>
            <div className="text-base font-extrabold text-slate-900 font-mono-numbers">
              {isCycling ? speed.value : pace.value}{' '}
              <span className="text-xs font-medium text-slate-500">
                {isCycling ? speed.unit : pace.unit}
              </span>
            </div>
          </div>

          <div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Time
            </div>
            <div className="text-base font-extrabold text-slate-900 font-mono-numbers">
              {time}
            </div>
          </div>

          <div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Elev Gain
            </div>
            <div className="text-base font-extrabold text-slate-900 font-mono-numbers">
              {elev.value} <span className="text-xs font-medium text-slate-500">{elev.unit}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Mini Route Map Preview */}
      {activity.summaryPolyline && !activity.hideRoute ? (
        <div className="px-5 pb-3">
          <Link to={`/activities/${activity._id}`}>
            <RouteMap
              encodedPolyline={activity.summaryPolyline}
              bounds={activity.bounds}
              interactive={false}
              height="180px"
              className="cursor-pointer hover:opacity-95 transition-opacity"
            />
          </Link>
        </div>
      ) : null}

      {/* Social Actions Bar */}
      <div className="px-5 py-3 bg-slate-50/60 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
        <div className="flex items-center gap-4">
          <button
            onClick={handleKudos}
            className={`flex items-center gap-1.5 font-semibold px-2.5 py-1.5 rounded-lg transition-colors ${
              hasKudod
                ? 'bg-rose-50 text-rose-600 hover:bg-rose-100'
                : 'hover:bg-slate-200/60 text-slate-600'
            }`}
          >
            <Heart
              className={`w-4 h-4 ${hasKudod ? 'fill-rose-500 text-rose-500' : ''}`}
            />
            <span>{kudosCount} Kudos</span>
          </button>

          <button
            onClick={handleToggleComments}
            className="flex items-center gap-1.5 font-semibold hover:bg-slate-200/60 px-2.5 py-1.5 rounded-lg transition-colors text-slate-600"
          >
            <MessageCircle className="w-4 h-4" />
            <span>{commentsCount} Comments</span>
          </button>
        </div>

        <Link
          to={`/activities/${activity._id}`}
          className="font-bold text-brand-600 hover:text-brand-700 hover:underline transition-all"
        >
          View Analysis &rarr;
        </Link>
      </div>

      {/* Inline Comments Thread */}
      {showComments && (
        <div className="p-4 bg-slate-50 border-t border-slate-200">
          {loadingComments ? (
            <div className="text-center py-2 text-xs text-slate-400">Loading comments...</div>
          ) : (
            <div className="space-y-3 mb-3 max-h-48 overflow-y-auto">
              {comments.length === 0 ? (
                <div className="text-xs text-slate-400 text-center py-2">
                  No comments yet. Be the first to congratulate!
                </div>
              ) : (
                comments.map((c, i) => (
                  <div key={c._id || i} className="flex gap-2.5 text-xs">
                    <img
                      src={c.user?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
                      alt=""
                      className="w-6 h-6 rounded-full object-cover flex-shrink-0"
                    />
                    <div>
                      <span className="font-bold text-slate-900 mr-1.5">
                        {c.user?.name || 'Athlete'}
                      </span>
                      <span className="text-slate-700">{c.text}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Add Comment Input */}
          <form onSubmit={handleAddComment} className="flex gap-2">
            <input
              type="text"
              placeholder="Add a comment..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
            <button
              type="submit"
              disabled={!commentText.trim()}
              className="bg-brand-600 text-white font-bold text-xs px-3 py-1.5 rounded-lg disabled:opacity-50 hover:bg-brand-700 transition-colors"
            >
              Post
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
