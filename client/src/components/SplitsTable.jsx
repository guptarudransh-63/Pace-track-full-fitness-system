import React from 'react';
import { formatDistance, formatDuration, formatPace, formatSpeed, formatElevation } from '../utils/formatters.js';

export default function SplitsTable({
  splits = [],
  sportType = 'run',
  unitPreference = 'metric',
}) {
  if (!splits || splits.length === 0) {
    return null;
  }

  const isCycling = sportType === 'ride';

  // Find fastest split to highlight with a flame/medal badge
  const fastestSpeed = Math.max(...splits.map((s) => s.averageSpeed || 0));

  return (
    <div className="w-full bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
      <div className="px-4 py-3 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
          Kilometer Splits & Cadence
        </h3>
        <span className="text-xs text-slate-400 font-mono-numbers">
          {splits.length} splits
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-100 text-slate-400 uppercase tracking-wider font-semibold bg-slate-50/40">
              <th className="py-2.5 px-4 w-12 text-center">Split</th>
              <th className="py-2.5 px-4">Distance</th>
              <th className="py-2.5 px-4">Time</th>
              <th className="py-2.5 px-4">{isCycling ? 'Avg Speed' : 'Avg Pace'}</th>
              <th className="py-2.5 px-4 text-right">Elev Delta</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {splits.map((s) => {
              const dist = formatDistance(s.distance, unitPreference);
              const pace = formatPace(s.averageSpeed, unitPreference);
              const speed = formatSpeed(s.averageSpeed, unitPreference);
              const isFastest = s.averageSpeed === fastestSpeed && splits.length > 1;

              return (
                <tr
                  key={s.splitNumber}
                  className={`hover:bg-slate-50 transition-colors ${
                    isFastest ? 'bg-orange-50/40 font-semibold' : ''
                  }`}
                >
                  <td className="py-2 px-4 text-center text-slate-400 font-mono-numbers">
                    {s.splitNumber}
                  </td>
                  <td className="py-2 px-4 font-mono-numbers text-slate-700">
                    {dist.full}
                  </td>
                  <td className="py-2 px-4 font-mono-numbers text-slate-700">
                    {formatDuration(s.elapsedTime)}
                  </td>
                  <td className="py-2 px-4 font-mono-numbers">
                    <span className="inline-flex items-center gap-1.5">
                      <span className={isFastest ? 'text-brand-600 font-bold' : 'text-slate-800'}>
                        {isCycling ? speed.full : pace.full}
                      </span>
                      {isFastest && (
                        <span className="text-[10px] bg-brand-100 text-brand-700 px-1.5 py-0.5 rounded font-bold uppercase tracking-tight">
                          Fastest
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="py-2 px-4 text-right font-mono-numbers text-slate-600">
                    {s.elevationChange > 0 ? `+${s.elevationChange}m` : `${s.elevationChange}m`}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
