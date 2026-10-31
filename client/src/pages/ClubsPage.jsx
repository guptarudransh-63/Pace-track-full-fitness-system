import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users, Search, PlusCircle, MapPin, ChevronRight } from 'lucide-react';
import { api } from '../services/api.js';
import { useAuthStore } from '../stores/authStore.js';

export default function ClubsPage() {
  const { user } = useAuthStore();
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sportFilter, setSportFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [sportType, setSportType] = useState('all');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('United States');
  const [isPrivate, setIsPrivate] = useState(false);

  useEffect(() => {
    async function loadClubs() {
      try {
        setLoading(true);
        const params = {};
        if (sportFilter !== 'all') params.sportType = sportFilter;
        if (searchQuery.trim()) params.search = searchQuery.trim();

        const res = await api.getClubs(params);
        setClubs(res.clubs || []);
      } catch (err) {
        console.error('Failed to load clubs:', err);
      } finally {
        setLoading(false);
      }
    }

    const timer = setTimeout(loadClubs, 200);
    return () => clearTimeout(timer);
  }, [sportFilter, searchQuery]);

  const handleCreateClub = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      const res = await api.createClub({
        name: name.trim(),
        description: desc,
        sportType,
        city,
        country,
        isPrivate,
      });
      setClubs([res.club, ...clubs]);
      setShowCreateModal(false);
      setName('');
      setDesc('');
    } catch (err) {
      console.error('Failed to create club:', err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Fitness Clubs</h1>
          <p className="text-sm text-slate-500 mt-1">
            Connect with teams, participate in group challenges, and climb weekly club mileage leaderboards.
          </p>
        </div>

        {user && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-sm shadow-brand-600/30 transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create a Club</span>
          </button>
        )}
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          {['all', 'run', 'ride', 'walk', 'triathlon'].map((sport) => (
            <button
              key={sport}
              onClick={() => setSportFilter(sport)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
                sportFilter === sport
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {sport}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search clubs by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
          />
        </div>
      </div>

      {/* Clubs Grid */}
      {loading ? (
        <div className="text-center py-12 text-xs text-slate-400">Loading clubs...</div>
      ) : clubs.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center">
          <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-700">No clubs found</p>
          <p className="text-xs text-slate-400 mt-1">Create the first club in your area!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {clubs.map((club) => (
            <div
              key={club._id}
              className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col"
            >
              {/* Cover Photo */}
              <div className="h-32 bg-slate-800 relative">
                {club.coverPhoto ? (
                  <img src={club.coverPhoto} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-r from-slate-900 to-slate-800 flex items-center justify-center opacity-60">
                    <Users className="w-10 h-10 text-white" />
                  </div>
                )}
                {/* Avatar Badge */}
                <img
                  src={club.avatar || 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=120'}
                  alt=""
                  className="w-14 h-14 rounded-2xl object-cover border-2 border-white shadow-md absolute -bottom-5 left-5 bg-white"
                />
              </div>

              {/* Club Info */}
              <div className="pt-7 p-6 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                      {club.sportType}
                    </span>
                    <span className="text-xs text-slate-400 font-semibold font-mono-numbers">
                      {club.memberCount || 1} members
                    </span>
                  </div>

                  <Link
                    to={`/clubs/${club._id}`}
                    className="font-black text-slate-900 text-lg hover:text-brand-600 transition-colors line-clamp-1"
                  >
                    {club.name}
                  </Link>

                  {club.city && (
                    <div className="flex items-center gap-1 text-xs text-slate-400 mt-1">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>{club.city}</span>
                    </div>
                  )}

                  {club.description && (
                    <p className="text-xs text-slate-600 mt-2 line-clamp-2 leading-relaxed">
                      {club.description}
                    </p>
                  )}
                </div>

                <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">Weekly Leaderboard</span>
                  <Link
                    to={`/clubs/${club._id}`}
                    className="text-xs font-bold text-brand-600 hover:underline flex items-center gap-1"
                  >
                    <span>View Club</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Club Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl border border-slate-200">
            <h3 className="text-xl font-black text-slate-900 mb-4">Start a Fitness Club</h3>
            <form onSubmit={handleCreateClub} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Club Name</label>
                <input
                  type="text"
                  placeholder="e.g. Golden Gate Striders"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-sm focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={3}
                  placeholder="What is your club mission? Weekly run times, meetup spots..."
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-sm focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Primary Sport</label>
                  <select
                    value={sportType}
                    onChange={(e) => setSportType(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="all">Multisport / All</option>
                    <option value="run">Running</option>
                    <option value="ride">Cycling</option>
                    <option value="walk">Walking</option>
                    <option value="triathlon">Triathlon</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">City / Region</label>
                  <input
                    type="text"
                    placeholder="San Francisco, CA"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="clubPrivateCheck"
                  checked={isPrivate}
                  onChange={(e) => setIsPrivate(e.target.checked)}
                  className="rounded text-brand-600 focus:ring-brand-500"
                />
                <label htmlFor="clubPrivateCheck" className="text-xs font-semibold text-slate-700">
                  Private Club (Membership by approval only)
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-brand-600 text-white rounded-xl font-bold hover:bg-brand-700 shadow-sm"
                >
                  Create Club
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
