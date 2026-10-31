import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Compass, Search, Award, TrendingUp, ChevronRight } from 'lucide-react';
import { api } from '../services/api.js';
import { useAuthStore } from '../stores/authStore.js';
import { formatDistance } from '../utils/formatters.js';
import RouteMap from '../components/Map/RouteMap.jsx';

export default function SegmentsExplorePage() {
  const { unitPreference } = useAuthStore();
  const [segments, setSegments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sportFilter, setSportFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSegment, setSelectedSegment] = useState(null);

  useEffect(() => {
    async function loadSegments() {
      try {
        setLoading(true);
        const params = {};
        if (sportFilter !== 'all') params.sportType = sportFilter;
        if (searchQuery.trim()) params.search = searchQuery.trim();

        const res = await api.getSegments(params);
        const segList = res.segments || [];
        setSegments(segList);
        setSelectedSegment((prev) => {
          if (segList.length === 0) return null;
          const match = segList.find((s) => s._id === prev?._id);
          return match || segList[0];
        });
      } catch (err) {
        console.error('Failed to load segments:', err);
      } finally {
        setLoading(false);
      }
    }

    const timer = setTimeout(loadSegments, 200);
    return () => clearTimeout(timer);
  }, [sportFilter, searchQuery]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Explore Route Segments</h1>
        <p className="text-sm text-slate-500 mt-1">
          Compete on classic sprints, climbs, and endurance sections with geospatial leaderboards.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {['all', 'run', 'ride', 'walk'].map((sport) => (
            <button
              key={sport}
              onClick={() => setSportFilter(sport)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
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
            placeholder="Search segments by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
          />
        </div>
      </div>

      {/* Main Segments Grid with Preview Map */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Segments List (6 cols) */}
        <div className="lg:col-span-6 space-y-3">
          {loading ? (
            <div className="text-center py-12 text-xs text-slate-400">Loading segments...</div>
          ) : segments.length === 0 ? (
            <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center">
              <Compass className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-xs text-slate-500">No segments found matching your search.</p>
            </div>
          ) : (
            segments.map((seg) => (
              <div
                key={seg._id}
                onClick={() => setSelectedSegment(seg)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                  selectedSegment?._id === seg._id
                    ? 'bg-orange-50/40 border-brand-500 shadow-sm'
                    : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-brand-600 bg-brand-50 px-2 py-0.5 rounded">
                    {seg.sportType}
                  </span>
                  <span className="text-xs font-mono-numbers text-slate-400">
                    {seg.effortCount || 0} efforts
                  </span>
                </div>

                <h3 className="font-extrabold text-slate-900 text-sm hover:text-brand-600 transition-colors">
                  {seg.name}
                </h3>

                {seg.description && (
                  <p className="text-xs text-slate-500 mt-1 line-clamp-1">{seg.description}</p>
                )}

                <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 text-xs">
                  <div className="flex items-center gap-3 font-mono-numbers text-slate-600 font-semibold">
                    <span>{formatDistance(seg.distance, unitPreference).full}</span>
                    <span>•</span>
                    <span>Elev {seg.elevationDiff > 0 ? `+${seg.elevationDiff}m` : `${seg.elevationDiff}m`}</span>
                  </div>

                  <Link
                    to={`/segments/${seg._id}`}
                    className="font-bold text-brand-600 hover:underline flex items-center gap-1"
                  >
                    <span>Leaderboard</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Selected Segment Map Preview (6 cols) */}
        <div className="lg:col-span-6">
          <div className="sticky top-24 bg-white p-4 rounded-3xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Segment Geography Preview
              </h3>
              {selectedSegment && (
                <Link
                  to={`/segments/${selectedSegment._id}`}
                  className="text-xs font-bold text-brand-600 hover:underline"
                >
                  View Full Detail &rarr;
                </Link>
              )}
            </div>

            {selectedSegment ? (
              <>
                <RouteMap
                  encodedPolyline={selectedSegment.polyline}
                  height="380px"
                  interactive={true}
                />
                <div className="p-2">
                  <h4 className="font-extrabold text-slate-900 text-base">{selectedSegment.name}</h4>
                  <p className="text-xs text-slate-500 mt-0.5">{selectedSegment.description}</p>
                </div>
              </>
            ) : (
              <div className="h-80 flex items-center justify-center text-xs text-slate-400 bg-slate-50 rounded-2xl">
                Select a segment to view route map
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
