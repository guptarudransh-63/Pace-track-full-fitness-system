import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Award, Compass, TrendingUp, Users, ChevronLeft, ArrowRight } from 'lucide-react';
import { api } from '../services/api.js';
import { useAuthStore } from '../stores/authStore.js';
import { formatDistance, formatDuration, formatSpeed, formatPace, formatDate } from '../utils/formatters.js';
import RouteMap from '../components/Map/RouteMap.jsx';

export default function SegmentDetailPage() {
  const { id } = useParams();
  const { user, unitPreference } = useAuthStore();
  const [segment, setSegment] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [filter, setFilter] = useState('all'); // 'all', 'following', 'me'
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSegmentData() {
      try {
        setLoading(true);
        const [segRes, leadRes] = await Promise.all([
          api.getSegment(id),
          api.getSegmentLeaderboard(id, filter),
        ]);
        setSegment(segRes.segment);
        setLeaderboard(leadRes.leaderboard || []);
      } catch (err) {
        console.error('Failed to load segment detail:', err);
      } finally {
        setLoading(false);
      }
    }

    loadSegmentData();
  }, [id, filter]);

  if (loading && !segment) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center text-slate-400">
        <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="font-semibold text-sm">Loading segment & leaderboard...</p>
      </div>
    );
  }

  if (!segment) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <h2 className="text-xl font-bold text-slate-900 mb-2">Segment Not Found</h2>
        <Link to="/explore" className="text-xs font-bold text-brand-600 hover:underline">
          &larr; Back to Segments
        </Link>
      </div>
    );
  }

  const isCycling = segment.sportType === 'ride';
  const segDist = formatDistance(segment.distance, unitPreference);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <Link
        to="/explore"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        Back to Segments Explore
      </Link>

      {/* Segment Header Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs font-extrabold uppercase tracking-wider text-brand-600 bg-brand-50 px-2.5 py-0.5 rounded-lg border border-brand-200/60">
                {segment.sportType} Segment
              </span>
              <span className="text-xs text-slate-400">Created by {segment.creator?.name || 'Athlete'}</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">{segment.name}</h1>
            {segment.description && (
              <p className="text-xs text-slate-500 mt-1 max-w-2xl">{segment.description}</p>
            )}
          </div>

          <div className="flex items-center gap-6 font-mono-numbers">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Distance</span>
              <div className="text-xl font-black text-slate-900">{segDist.full}</div>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Elevation Diff</span>
              <div className="text-xl font-black text-slate-900">
                {segment.elevationDiff > 0 ? `+${segment.elevationDiff}m` : `${segment.elevationDiff}m`}
              </div>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Efforts</span>
              <div className="text-xl font-black text-brand-600">{segment.effortCount || 0}</div>
            </div>
          </div>
        </div>

        {/* Map Preview */}
        <div className="mt-4">
          <RouteMap
            encodedPolyline={segment.polyline}
            height="320px"
            interactive={true}
          />
        </div>
      </div>

      {/* Segment Leaderboard Section */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="px-6 py-4 bg-slate-50/80 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-500" />
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-900">
              Segment Leaderboard
            </h3>
          </div>

          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 text-xs font-bold">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded-lg transition-all ${
                filter === 'all' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Athletes
            </button>
            {user && (
              <>
                <button
                  onClick={() => setFilter('following')}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    filter === 'following' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Following
                </button>
                <button
                  onClick={() => setFilter('me')}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    filter === 'me' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  My Best
                </button>
              </>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 uppercase tracking-wider font-semibold bg-slate-50/40">
                <th className="py-3 px-6 w-16 text-center">Rank</th>
                <th className="py-3 px-6">Athlete</th>
                <th className="py-3 px-6">Time</th>
                <th className="py-3 px-6">{isCycling ? 'Speed' : 'Pace'}</th>
                <th className="py-3 px-6">Date</th>
                <th className="py-3 px-6 text-right">Activity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono-numbers">
              {leaderboard.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-xs text-slate-400 font-sans">
                    No efforts found for this filter. Run or ride this segment to claim the crown!
                  </td>
                </tr>
              ) : (
                leaderboard.map((eff) => {
                  const isTop1 = eff.rank === 1;
                  const isTop3 = eff.rank <= 3;
                  const speed = formatSpeed(eff.avgSpeed, unitPreference);
                  const pace = formatPace(eff.avgSpeed, unitPreference);

                  return (
                    <tr
                      key={eff._id}
                      className={`hover:bg-slate-50 transition-colors ${
                        isTop1 ? 'bg-amber-50/30' : ''
                      }`}
                    >
                      <td className="py-3 px-6 text-center font-bold">
                        {isTop1 ? (
                          <span className="text-base" title="Course Record / Crown">👑 1</span>
                        ) : isTop3 ? (
                          <span className="text-amber-600 font-extrabold">{eff.rank}</span>
                        ) : (
                          <span className="text-slate-400">{eff.rank}</span>
                        )}
                      </td>
                      <td className="py-3 px-6 font-sans">
                        <Link
                          to={`/athletes/${eff.user?._id}`}
                          className="flex items-center gap-3 font-bold text-slate-900 hover:text-brand-600 transition-colors"
                        >
                          <img
                            src={eff.user?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                            alt=""
                            className="w-7 h-7 rounded-full object-cover border border-slate-200"
                          />
                          <span>{eff.user?.name}</span>
                        </Link>
                      </td>
                      <td className="py-3 px-6 font-black text-slate-900 text-sm">
                        {formatDuration(eff.elapsedTime)}
                      </td>
                      <td className="py-3 px-6 text-slate-700">
                        {isCycling ? speed.full : pace.full}
                      </td>
                      <td className="py-3 px-6 text-slate-400 font-sans text-xs">
                        {new Date(eff.startDate).toLocaleDateString([], {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="py-3 px-6 text-right font-sans">
                        {eff.activityId && (
                          <Link
                            to={`/activities/${eff.activityId}`}
                            className="text-brand-600 font-bold hover:underline"
                          >
                            View &rarr;
                          </Link>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
