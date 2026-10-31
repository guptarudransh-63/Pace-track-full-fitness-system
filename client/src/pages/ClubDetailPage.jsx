import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Users, MapPin, Award, ChevronLeft, UserPlus, UserCheck, LogOut } from 'lucide-react';
import { api } from '../services/api.js';
import { useAuthStore } from '../stores/authStore.js';
import { formatDistance, formatDuration } from '../utils/formatters.js';

export default function ClubDetailPage() {
  const { id } = useParams();
  const { user, unitPreference } = useAuthStore();
  const [club, setClub] = useState(null);
  const [isMember, setIsMember] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);
  const [members, setMembers] = useState([]);
  const [activeTab, setActiveTab] = useState('leaderboard'); // 'leaderboard' or 'members'
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadClubData() {
      try {
        setLoading(true);
        const [clubRes, leadRes, membersRes] = await Promise.all([
          api.getClub(id),
          api.getClubLeaderboard(id),
          api.getClubMembers(id),
        ]);
        setClub(clubRes.club);
        setIsMember(clubRes.isMember);
        setLeaderboard(leadRes.leaderboard || []);
        setMembers(membersRes.members || []);
      } catch (err) {
        console.error('Failed to load club:', err);
      } finally {
        setLoading(false);
      }
    }

    loadClubData();
  }, [id]);

  const handleJoinLeave = async () => {
    if (!user) return;
    try {
      if (isMember) {
        await api.leaveClub(id);
        setIsMember(false);
      } else {
        await api.joinClub(id);
        setIsMember(true);
      }
      const membersRes = await api.getClubMembers(id);
      setMembers(membersRes.members || []);
    } catch (err) {
      console.error('Failed to update membership:', err);
    }
  };

  if (loading && !club) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center text-slate-400">
        <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="font-semibold text-sm">Loading club details & weekly leaderboard...</p>
      </div>
    );
  }

  if (!club) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <h2 className="text-xl font-bold text-slate-900 mb-2">Club Not Found</h2>
        <Link to="/clubs" className="text-xs font-bold text-brand-600 hover:underline">
          &larr; Back to Clubs Directory
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <Link
        to="/clubs"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        Back to Clubs Directory
      </Link>

      {/* Club Banner Card */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="h-44 bg-slate-800 relative">
          {club.coverPhoto ? (
            <img src={club.coverPhoto} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-slate-900 to-slate-800" />
          )}
          <img
            src={club.avatar || 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=150'}
            alt=""
            className="w-20 h-20 rounded-2xl object-cover border-4 border-white shadow-lg absolute -bottom-7 left-6 bg-white"
          />
        </div>

        <div className="pt-10 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                {club.sportType}
              </span>
              {club.city && (
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {club.city}
                </span>
              )}
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">{club.name}</h1>
            {club.description && (
              <p className="text-xs text-slate-600 mt-2 max-w-2xl leading-relaxed">{club.description}</p>
            )}
          </div>

          <div>
            {user && (
              <button
                onClick={handleJoinLeave}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-extrabold transition-all shadow-sm ${
                  isMember
                    ? 'bg-slate-100 text-slate-700 hover:bg-rose-50 hover:text-rose-600'
                    : 'bg-brand-600 hover:bg-brand-700 text-white shadow-brand-600/30'
                }`}
              >
                {isMember ? (
                  <>
                    <UserCheck className="w-4 h-4 text-emerald-600" />
                    <span>Member (Leave)</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>Join Club</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Tab Toggle */}
        <div className="flex px-6 border-b border-slate-100 bg-slate-50/50 text-xs font-bold">
          <button
            onClick={() => setActiveTab('leaderboard')}
            className={`py-3 px-4 border-b-2 transition-all ${
              activeTab === 'leaderboard'
                ? 'border-brand-600 text-brand-600 font-extrabold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Weekly Leaderboard (Last 7 Days)
          </button>
          <button
            onClick={() => setActiveTab('members')}
            className={`py-3 px-4 border-b-2 transition-all ${
              activeTab === 'members'
                ? 'border-brand-600 text-brand-600 font-extrabold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Club Members ({members.length})
          </button>
        </div>

        {/* TAB 1: WEEKLY LEADERBOARD */}
        {activeTab === 'leaderboard' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono-numbers">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 uppercase tracking-wider font-semibold bg-slate-50/30 font-sans">
                  <th className="py-3 px-6 w-16 text-center">Rank</th>
                  <th className="py-3 px-6">Athlete</th>
                  <th className="py-3 px-6">Total Distance</th>
                  <th className="py-3 px-6">Moving Time</th>
                  <th className="py-3 px-6 text-right">Workouts</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {leaderboard.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-xs text-slate-400 font-sans">
                      No activities logged by club members this week yet.
                    </td>
                  </tr>
                ) : (
                  leaderboard.map((item) => (
                    <tr key={item._id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-6 text-center font-bold">
                        {item.rank === 1 ? '🥇 1' : item.rank === 2 ? '🥈 2' : item.rank === 3 ? '🥉 3' : item.rank}
                      </td>
                      <td className="py-3 px-6 font-sans">
                        <Link
                          to={`/athletes/${item.user?._id}`}
                          className="flex items-center gap-3 font-bold text-slate-900 hover:text-brand-600 transition-colors"
                        >
                          <img
                            src={item.user?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                            alt=""
                            className="w-7 h-7 rounded-full object-cover"
                          />
                          <span>{item.user?.name}</span>
                        </Link>
                      </td>
                      <td className="py-3 px-6 font-extrabold text-slate-900">
                        {formatDistance(item.totalDistance, unitPreference).full}
                      </td>
                      <td className="py-3 px-6 text-slate-600">
                        {formatDuration(item.totalMovingTime)}
                      </td>
                      <td className="py-3 px-6 text-right font-bold text-brand-600">
                        {item.activityCount}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 2: MEMBERS ROSTER */}
        {activeTab === 'members' && (
          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {members.map((m) => (
              <div
                key={m._id}
                className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100"
              >
                <img
                  src={m.user?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                  alt=""
                  className="w-10 h-10 rounded-full object-cover"
                />
                <div className="flex-1 min-w-0">
                  <Link
                    to={`/athletes/${m.user?._id}`}
                    className="font-bold text-slate-900 text-xs hover:text-brand-600 truncate block"
                  >
                    {m.user?.name}
                  </Link>
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    {m.role}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
