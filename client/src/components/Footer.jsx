import React from 'react';
import { Flame, Heart } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="bg-white border-t border-slate-200 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-brand-600 flex items-center justify-center text-white">
            <Flame className="w-3.5 h-3.5 fill-white" />
          </div>
          <span className="font-extrabold text-slate-900 tracking-tight">PaceTrack</span>
          <span>— Full-Stack Fitness Tracking & GPS Geospatial Engine</span>
        </div>

        <div className="flex items-center gap-4 font-medium">
          <Link to="/explore" className="hover:text-slate-900">Segments</Link>
          <Link to="/clubs" className="hover:text-slate-900">Clubs</Link>
          <Link to="/training" className="hover:text-slate-900">Training Analytics</Link>
          <Link to="/settings" className="hover:text-slate-900">Privacy Policy</Link>
        </div>
      </div>
    </footer>
  );
}
