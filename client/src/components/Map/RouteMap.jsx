import React, { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { decodePolyline } from '../../utils/formatters.js';

// Custom athletic SVG markers
const startIcon = L.divIcon({
  className: 'custom-start-marker',
  html: `<div class="w-6 h-6 rounded-full bg-emerald-500 border-2 border-white shadow-md flex items-center justify-center text-white font-bold text-xs">S</div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

const finishIcon = L.divIcon({
  className: 'custom-finish-marker',
  html: `<div class="w-6 h-6 rounded-full bg-slate-900 border-2 border-white shadow-md flex items-center justify-center text-white font-bold text-xs">🏁</div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

const hoverIcon = L.divIcon({
  className: 'custom-hover-marker',
  html: `<div class="w-4 h-4 rounded-full bg-brand-600 border-2 border-white shadow-lg animate-ping"></div><div class="w-3 h-3 rounded-full bg-brand-600 border-2 border-white absolute top-0.5 left-0.5"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

// Component to dynamically adjust bounds
function ChangeView({ bounds, center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (bounds) {
      try {
        if (Array.isArray(bounds) && bounds.length === 2 && !isNaN(bounds[0][0]) && !isNaN(bounds[1][0])) {
          map.fitBounds(bounds, { padding: [25, 25], maxZoom: 16 });
          return;
        }
        if (bounds.isValid && bounds.isValid()) {
          map.fitBounds(bounds, { padding: [25, 25], maxZoom: 16 });
          return;
        }
      } catch {
        // ignore
      }
    }
    if (center) {
      map.setView(center, zoom || 13);
    }
  }, [bounds, center, zoom, map]);
  return null;
}

export default function RouteMap({
  encodedPolyline,
  points = [],
  bounds,
  hoverPoint = null,
  interactive = true,
  height = '400px',
  className = '',
}) {
  // Decode coordinates from encodedPolyline if points are not provided directly
  const coordinates = useMemo(() => {
    if (points && points.length > 0) {
      return points.map((p) => [p.lat, p.lng]);
    }
    if (encodedPolyline) {
      try {
        return decodePolyline(encodedPolyline);
      } catch {
        return [];
      }
    }
    return [];
  }, [encodedPolyline, points]);

  const mapBounds = useMemo(() => {
    if (bounds && bounds.minLat !== null && bounds.maxLat !== null) {
      return [
        [bounds.minLat, bounds.minLng],
        [bounds.maxLat, bounds.maxLng],
      ];
    }
    if (coordinates.length > 1) {
      return L.latLngBounds(coordinates);
    }
    return null;
  }, [bounds, coordinates]);

  const startPoint = coordinates.length > 0 ? coordinates[0] : null;
  const finishPoint = coordinates.length > 1 ? coordinates[coordinates.length - 1] : null;

  if (coordinates.length === 0) {
    return (
      <div
        style={{ height }}
        className={`w-full bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 text-sm font-medium ${className}`}
      >
        <span>No GPS route geometry available for this workout</span>
      </div>
    );
  }

  const defaultCenter = coordinates[0] || [37.7749, -122.4194];

  return (
    <div style={{ height }} className={`relative w-full rounded-xl overflow-hidden border border-slate-200/80 shadow-inner ${className}`}>
      <MapContainer
        center={defaultCenter}
        zoom={13}
        scrollWheelZoom={interactive}
        dragging={interactive}
        zoomControl={interactive}
        attributionControl={interactive}
        className="w-full h-full"
      >
        {/* Crisp athletic map tiles from CartoDB Voyager */}
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://openstreetmap.org">OSM</a>'
          maxZoom={19}
        />

        <ChangeView bounds={mapBounds} center={defaultCenter} />

        {/* Athletic Orange Track Polyline */}
        <Polyline
          positions={coordinates}
          pathOptions={{
            color: '#ea580c',
            weight: 4.5,
            opacity: 0.9,
            lineJoin: 'round',
            lineCap: 'round',
          }}
        />

        {/* Start and Finish Pins */}
        {startPoint && (
          <Marker position={startPoint} icon={startIcon}>
            <Popup>Start Location</Popup>
          </Marker>
        )}

        {finishPoint && (
          <Marker position={finishPoint} icon={finishIcon}>
            <Popup>Finish Location</Popup>
          </Marker>
        )}

        {/* Synchronized Hover Marker from Elevation Chart */}
        {hoverPoint && hoverPoint.lat && hoverPoint.lng && (
          <Marker position={[hoverPoint.lat, hoverPoint.lng]} icon={hoverIcon} />
        )}
      </MapContainer>
    </div>
  );
}
