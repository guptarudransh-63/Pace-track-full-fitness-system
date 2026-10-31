import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { formatDistance, formatElevation } from '../utils/formatters.js';

export default function ElevationProfileChart({
  elevationProfile = [],
  points = [],
  unitPreference = 'metric',
  onHoverPoint = null,
}) {
  if (!elevationProfile || elevationProfile.length < 2) {
    return null;
  }

  // Map elevation data and format for current units
  const chartData = elevationProfile.map((item, idx) => {
    const distFormatted = formatDistance(item.distance, unitPreference);
    const eleFormatted = formatElevation(item.elevation, unitPreference);

    return {
      index: idx,
      distanceRaw: item.distance,
      elevationRaw: item.elevation,
      distanceDisplay: parseFloat(distFormatted.value),
      elevationDisplay: parseInt(eleFormatted.value.replace(/,/g, ''), 10),
      distUnit: distFormatted.unit,
      eleUnit: eleFormatted.unit,
    };
  });

  const handleMouseMove = (state) => {
    if (state && state.activeTooltipIndex !== undefined && onHoverPoint && points.length > 0) {
      const activeIdx = state.activeTooltipIndex;
      // Map chart index to corresponding points index
      const ratio = activeIdx / Math.max(1, chartData.length - 1);
      const ptIndex = Math.min(points.length - 1, Math.round(ratio * (points.length - 1)));
      onHoverPoint(points[ptIndex]);
    }
  };

  const handleMouseLeave = () => {
    if (onHoverPoint) {
      onHoverPoint(null);
    }
  };

  return (
    <div className="w-full bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          Elevation Profile (Synced with Route)
        </h4>
        <span className="text-xs text-slate-400 font-mono-numbers">
          Hover to trace route position
        </span>
      </div>

      <div className="h-36 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
          >
            <defs>
              <linearGradient id="eleGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ea580c" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#ea580c" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="distanceDisplay"
              tickLine={false}
              axisLine={{ stroke: '#e2e8f0' }}
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              tickFormatter={(val) => `${val} ${chartData[0]?.distUnit || 'km'}`}
            />
            <YAxis
              dataKey="elevationDisplay"
              tickLine={false}
              axisLine={{ stroke: '#e2e8f0' }}
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              tickFormatter={(val) => `${val} ${chartData[0]?.eleUnit || 'm'}`}
              domain={['dataMin - 5', 'dataMax + 5']}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-slate-900 text-white px-3 py-2 rounded-lg text-xs shadow-xl border border-slate-800">
                      <div className="font-semibold text-slate-300">
                        Distance: <span className="text-white font-mono-numbers">{data.distanceDisplay} {data.distUnit}</span>
                      </div>
                      <div className="font-semibold text-brand-400 mt-0.5">
                        Elevation: <span className="text-white font-mono-numbers">{data.elevationDisplay} {data.eleUnit}</span>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Area
              type="monotone"
              dataKey="elevationDisplay"
              stroke="#ea580c"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#eleGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
