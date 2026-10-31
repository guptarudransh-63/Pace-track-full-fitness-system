import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UploadCloud,
  FileText,
  Play,
  Square,
  Pause,
  Compass,
  CheckCircle2,
  AlertCircle,
  Shield,
  Flame,
  ArrowRight,
} from 'lucide-react';
import { api } from '../services/api.js';
import { useAuthStore } from '../stores/authStore.js';
import { haversineDistance } from '../utils/formatters.js';

export default function RecordUploadPage() {
  const navigate = useNavigate();
  const { unitPreference } = useAuthStore();
  const [activeTab, setActiveTab] = useState('upload'); // 'upload', 'manual', 'live'

  // --- GPX Upload State ---
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadSport, setUploadSport] = useState('run');
  const [uploadVisibility, setUploadVisibility] = useState('public');
  const [uploadPrivacyRadius, setUploadPrivacyRadius] = useState(0);
  const [uploadHideRoute, setUploadHideRoute] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  // --- Manual Entry State ---
  const [manualTitle, setManualTitle] = useState('');
  const [manualSport, setManualSport] = useState('run');
  const [manualDistInput, setManualDistInput] = useState('');
  const [manualHours, setManualHours] = useState('0');
  const [manualMinutes, setManualMinutes] = useState('30');
  const [manualSeconds, setManualSeconds] = useState('0');
  const [manualElevation, setManualElevation] = useState('');
  const [manualDate, setManualDate] = useState(new Date().toISOString().split('T')[0]);
  const [manualDesc, setManualDesc] = useState('');
  const [manualSubmitting, setManualSubmitting] = useState(false);

  // --- Live GPS Recording State ---
  const [liveSport, setLiveSport] = useState('run');
  const [liveTitle, setLiveTitle] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [liveDistanceMeters, setLiveDistanceMeters] = useState(0);
  const [livePoints, setLivePoints] = useState([]);
  const [geoError, setGeoError] = useState(null);
  const watchIdRef = useRef(null);
  const timerRef = useRef(null);

  // Handle GPX file selection
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.match(/\.(gpx|xml)$/i)) {
        setUploadError('Please select a valid .gpx file.');
        return;
      }
      setSelectedFile(file);
      setUploadError(null);
      if (!uploadTitle) {
        setUploadTitle(file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '));
      }
    }
  };

  const handleGpxSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      setUploadError('Please select a GPX file to upload.');
      return;
    }

    setUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('title', uploadTitle || 'Uploaded Activity');
      formData.append('sportType', uploadSport);
      formData.append('visibility', uploadVisibility);
      formData.append('hideStartFinishRadiusMeters', String(uploadPrivacyRadius));
      formData.append('hideRoute', String(uploadHideRoute));

      const res = await api.uploadGpx(formData);
      navigate(`/activities/${res.activity._id}`);
    } catch (err) {
      console.error('GPX upload failed:', err);
      setUploadError(err.message || 'Failed to upload and process GPX file.');
    } finally {
      setUploading(false);
    }
  };

  // Handle Manual activity submit
  const handleManualSubmit = async (e) => {
    e.preventDefault();
    setManualSubmitting(true);
    try {
      const distNum = parseFloat(manualDistInput) || 0;
      // Convert to meters if imperial was entered
      const distMeters = unitPreference === 'imperial' ? distNum * 1609.344 : distNum * 1000;
      const hours = Number(manualHours) || 0;
      const minutes = Number(manualMinutes) || 0;
      const seconds = Number(manualSeconds) || 0;
      const totalSeconds = hours * 3600 + minutes * 60 + seconds;

      const eleNum = parseFloat(manualElevation) || 0;
      const eleMeters = unitPreference === 'imperial' ? eleNum / 3.28084 : eleNum;

      const res = await api.createManualActivity({
        title: manualTitle || `${manualSport.toUpperCase()} Workout`,
        description: manualDesc,
        sportType: manualSport,
        distance: Math.round(distMeters),
        duration: Math.max(1, totalSeconds),
        elevationGain: Math.round(eleMeters),
        startDate: manualDate ? new Date(manualDate) : new Date(),
        visibility: 'public',
      });

      navigate(`/activities/${res.activity._id}`);
    } catch (err) {
      console.error('Manual submission failed:', err);
    } finally {
      setManualSubmitting(false);
    }
  };

  // Live GPS Recorder
  const startRecording = () => {
    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported by your browser.');
      return;
    }

    setIsRecording(true);
    setIsPaused(false);
    setGeoError(null);

    timerRef.current = setInterval(() => {
      setElapsedSec((prev) => prev + 1);
    }, 1000);

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const newPt = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          ele: pos.coords.altitude || 10,
          time: new Date().toISOString(),
        };

        setLivePoints((prev) => {
          if (prev.length > 0) {
            const last = prev[prev.length - 1];
            const d = haversineDistance(last.lat, last.lng, newPt.lat, newPt.lng);
            setLiveDistanceMeters((dist) => dist + d);
          }
          return [...prev, newPt];
        });
      },
      (err) => {
        console.warn('Geolocation error:', err);
        setGeoError(err.message);
      },
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 5000 }
    );
  };

  const pauseRecording = () => {
    setIsPaused(true);
    clearInterval(timerRef.current);
    if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
  };

  const resumeRecording = () => {
    setIsPaused(false);
    timerRef.current = setInterval(() => {
      setElapsedSec((prev) => prev + 1);
    }, 1000);
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const newPt = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          ele: pos.coords.altitude || 10,
          time: new Date().toISOString(),
        };
        setLivePoints((prev) => {
          if (prev.length > 0) {
            const last = prev[prev.length - 1];
            const d = haversineDistance(last.lat, last.lng, newPt.lat, newPt.lng);
            setLiveDistanceMeters((dist) => dist + d);
          }
          return [...prev, newPt];
        });
      },
      (err) => setGeoError(err.message),
      { enableHighAccuracy: true }
    );
  };

  const finishAndSaveLive = async () => {
    pauseRecording();
    // Create manual activity from live recording metrics
    try {
      const res = await api.createManualActivity({
        title: liveTitle || `Live ${liveSport.toUpperCase()} Session`,
        sportType: liveSport,
        distance: Math.round(liveDistanceMeters),
        duration: Math.max(1, elapsedSec),
        elevationGain: 15,
        startDate: new Date(),
        visibility: 'public',
      });
      navigate(`/activities/${res.activity._id}`);
    } catch (err) {
      console.error('Failed to save live activity:', err);
    }
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8 text-center sm:text-left">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Record or Upload Activity</h1>
        <p className="text-sm text-slate-500 mt-1">
          Import GPX route files, log manual workouts, or track live GPS movements.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-200/70 p-1 rounded-2xl mb-8 max-w-md mx-auto sm:mx-0">
        <button
          onClick={() => setActiveTab('upload')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'upload'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <UploadCloud className="w-4 h-4 text-brand-600" />
          <span>GPX Upload</span>
        </button>

        <button
          onClick={() => setActiveTab('manual')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'manual'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileText className="w-4 h-4 text-sky-600" />
          <span>Manual Entry</span>
        </button>

        <button
          onClick={() => setActiveTab('live')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'live'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Compass className="w-4 h-4 text-emerald-600" />
          <span>Live GPS</span>
        </button>
      </div>

      {/* TAB 1: GPX FILE UPLOAD */}
      {activeTab === 'upload' && (
        <form onSubmit={handleGpxSubmit} className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm space-y-6">
          {uploadError && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{uploadError}</span>
            </div>
          )}

          {/* Drag & Drop Box */}
          <div className="border-2 border-dashed border-slate-300 hover:border-brand-500 rounded-2xl p-8 text-center transition-colors bg-slate-50/50">
            <UploadCloud className="w-12 h-12 text-brand-600 mx-auto mb-3" />
            <div className="text-sm font-bold text-slate-900 mb-1">
              {selectedFile ? selectedFile.name : 'Choose a GPX file or drag and drop'}
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Supports standard GPX 1.1 with track points, elevation, and sensor telemetry. Max 10MB.
            </p>
            <label className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-sm">
              <span>Browse Files</span>
              <input type="file" accept=".gpx,.xml" onChange={handleFileChange} className="hidden" />
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Activity Title
              </label>
              <input
                type="text"
                placeholder="e.g. Morning 5K Tempo Run"
                value={uploadTitle}
                onChange={(e) => setUploadTitle(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Sport Type
              </label>
              <select
                value={uploadSport}
                onChange={(e) => setUploadSport(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
              >
                <option value="run">Running</option>
                <option value="ride">Cycling</option>
                <option value="walk">Walking</option>
                <option value="hike">Hiking</option>
                <option value="workout">Workout</option>
              </select>
            </div>
          </div>

          {/* Privacy Controls */}
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-4">
            <div className="flex items-center gap-2 text-xs font-extrabold text-slate-800 uppercase tracking-wider">
              <Shield className="w-4 h-4 text-emerald-600" />
              <span>Location Privacy Configuration</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Activity Visibility</label>
                <select
                  value={uploadVisibility}
                  onChange={(e) => setUploadVisibility(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-brand-500"
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
                  value={uploadPrivacyRadius}
                  onChange={(e) => setUploadPrivacyRadius(e.target.value)}
                  placeholder="e.g. 500m"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="uploadHideRoute"
                checked={uploadHideRoute}
                onChange={(e) => setUploadHideRoute(e.target.checked)}
                className="rounded text-brand-600 focus:ring-brand-500"
              />
              <label htmlFor="uploadHideRoute" className="text-xs font-medium text-slate-700">
                Hide full route geometry from others (keeps statistics visible)
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={!selectedFile || uploading}
            className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-extrabold text-sm py-3 rounded-xl shadow-lg shadow-brand-600/25 transition-all flex items-center justify-center gap-2"
          >
            {uploading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Ingesting GPS points & calculating metrics...</span>
              </>
            ) : (
              <>
                <span>Ingest and Save Activity</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      )}

      {/* TAB 2: MANUAL WORKOUT ENTRY */}
      {activeTab === 'manual' && (
        <form onSubmit={handleManualSubmit} className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Activity Title
              </label>
              <input
                type="text"
                placeholder="e.g. Evening Hill Repeats"
                value={manualTitle}
                onChange={(e) => setManualTitle(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Sport Type
              </label>
              <select
                value={manualSport}
                onChange={(e) => setManualSport(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="run">Running</option>
                <option value="ride">Cycling</option>
                <option value="walk">Walking</option>
                <option value="hike">Hiking</option>
                <option value="workout">Workout / Gym</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Distance ({unitPreference === 'imperial' ? 'miles' : 'km'})
              </label>
              <input
                type="number"
                step="0.01"
                placeholder={unitPreference === 'imperial' ? '3.10' : '5.00'}
                value={manualDistInput}
                onChange={(e) => setManualDistInput(e.target.value)}
                required
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Duration (h / m / s)
              </label>
              <div className="flex gap-1.5">
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={manualHours}
                  onChange={(e) => setManualHours(e.target.value)}
                  className="w-full text-center bg-white border border-slate-200 rounded-xl px-2 py-2.5 text-sm focus:ring-2 focus:ring-brand-500"
                />
                <input
                  type="number"
                  min="0"
                  max="59"
                  placeholder="30"
                  value={manualMinutes}
                  onChange={(e) => setManualMinutes(e.target.value)}
                  className="w-full text-center bg-white border border-slate-200 rounded-xl px-2 py-2.5 text-sm focus:ring-2 focus:ring-brand-500"
                />
                <input
                  type="number"
                  min="0"
                  max="59"
                  placeholder="0"
                  value={manualSeconds}
                  onChange={(e) => setManualSeconds(e.target.value)}
                  className="w-full text-center bg-white border border-slate-200 rounded-xl px-2 py-2.5 text-sm focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Elevation Gain ({unitPreference === 'imperial' ? 'ft' : 'm'})
              </label>
              <input
                type="number"
                placeholder="45"
                value={manualElevation}
                onChange={(e) => setManualElevation(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Workout Notes
            </label>
            <textarea
              rows={3}
              placeholder="How did the workout feel? Perceived effort, weather conditions..."
              value={manualDesc}
              onChange={(e) => setManualDesc(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <button
            type="submit"
            disabled={manualSubmitting || !manualDistInput}
            className="w-full bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-extrabold text-sm py-3 rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
          >
            <span>Save Manual Activity</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      )}

      {/* TAB 3: LIVE GPS RECORDER */}
      {activeTab === 'live' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm space-y-6 text-center">
          <div className="max-w-md mx-auto space-y-4">
            <div className="text-xs font-bold uppercase tracking-widest text-slate-400">
              Live Session Telemetry
            </div>

            {!isRecording && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left pb-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Sport
                  </label>
                  <select
                    value={liveSport}
                    onChange={(e) => setLiveSport(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="run">Running</option>
                    <option value="ride">Cycling</option>
                    <option value="walk">Walking</option>
                    <option value="hike">Hiking</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Session Title
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Waterfront Speed Work"
                    value={liveTitle}
                    onChange={(e) => setLiveTitle(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>
            )}

            <div className="text-6xl font-black text-slate-900 font-mono-numbers tracking-tight">
              {Math.floor(elapsedSec / 3600) > 0 ? `${Math.floor(elapsedSec / 3600)}:` : ''}
              {Math.floor((elapsedSec % 3600) / 60) < 10 ? '0' : ''}
              {Math.floor((elapsedSec % 3600) / 60)}:
              {elapsedSec % 60 < 10 ? '0' : ''}
              {elapsedSec % 60}
            </div>

            <div className="grid grid-cols-2 gap-4 py-4 border-y border-slate-100">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase">Distance</span>
                <div className="text-2xl font-extrabold text-slate-900 font-mono-numbers">
                  {(liveDistanceMeters / 1000).toFixed(2)} <span className="text-xs">km</span>
                </div>
              </div>

              <div>
                <span className="text-xs font-bold text-slate-400 uppercase">Track Points</span>
                <div className="text-2xl font-extrabold text-slate-900 font-mono-numbers">
                  {livePoints.length}
                </div>
              </div>
            </div>

            {geoError && (
              <div className="text-xs text-rose-600 bg-rose-50 p-3 rounded-xl">
                {geoError}
              </div>
            )}

            {/* Recorder Controls */}
            <div className="flex items-center justify-center gap-4 pt-4">
              {!isRecording ? (
                <button
                  onClick={startRecording}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm px-8 py-3.5 rounded-2xl shadow-lg shadow-emerald-600/30 flex items-center gap-2 transition-transform hover:scale-105"
                >
                  <Play className="w-5 h-5 fill-white" />
                  <span>Start Recording</span>
                </button>
              ) : (
                <>
                  {isPaused ? (
                    <button
                      onClick={resumeRecording}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-5 py-3 rounded-xl flex items-center gap-2"
                    >
                      <Play className="w-4 h-4 fill-white" />
                      <span>Resume</span>
                    </button>
                  ) : (
                    <button
                      onClick={pauseRecording}
                      className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs px-5 py-3 rounded-xl flex items-center gap-2"
                    >
                      <Pause className="w-4 h-4 fill-white" />
                      <span>Pause</span>
                    </button>
                  )}

                  <button
                    onClick={finishAndSaveLive}
                    className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-5 py-3 rounded-xl flex items-center gap-2"
                  >
                    <Square className="w-4 h-4 fill-white" />
                    <span>Finish & Save</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
