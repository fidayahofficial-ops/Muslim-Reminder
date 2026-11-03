import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Compass, 
  RotateCw, 
  MapPin, 
  AlertCircle, 
  CheckCircle2, 
  Navigation, 
  HelpCircle,
  Smartphone,
  RefreshCw
} from 'lucide-react';
import { District } from '../types';
import { calculateQiblaBearing, calculateDistanceToMecca, toBengaliDigits } from '../utils/prayerTimes';
import { triggerHaptic } from '../utils/audio';

interface QiblaViewProps {
  district: District;
  onOpenDistrictModal: () => void;
  gpsCoords?: { lat: number; lng: number };
  onUpdateGpsCoords?: (coords: { lat: number; lng: number }) => void;
}

// Geomagnetic dipole model approximation for magnetic declination (True North vs Magnetic North)
function getMagneticDeclination(lat: number, lng: number): number {
  const poleLat = 80.7 * (Math.PI / 180);
  const poleLng = -72.7 * (Math.PI / 180);
  const phi = lat * (Math.PI / 180);
  const lambda = lng * (Math.PI / 180);

  const y = Math.cos(poleLat) * Math.sin(poleLng - lambda);
  const x = Math.cos(phi) * Math.sin(poleLat) - Math.sin(phi) * Math.cos(poleLat) * Math.cos(poleLng - lambda);
  const dec = Math.atan2(y, x) * (180 / Math.PI);
  return Math.max(-25, Math.min(25, Math.round(dec * 10) / 10));
}

// 3D tilt-compensated magnetic heading from alpha, beta, gamma
function computeHeadingFrom3DAngles(alpha: number, beta: number, gamma: number): number {
  const rad = Math.PI / 180;
  const a = alpha * rad;
  const b = beta * rad;
  const g = gamma * rad;

  const cA = Math.cos(a);
  const sA = Math.sin(a);
  const cB = Math.cos(b);
  const sB = Math.sin(b);
  const cG = Math.cos(g);
  const sG = Math.sin(g);

  // If phone is lying essentially flat on a table (beta ~ 0, gamma ~ 0)
  if (Math.abs(beta) < 5 && Math.abs(gamma) < 5) {
    return (360 - alpha + 360) % 360;
  }

  // Unit vector along the top of phone transformed to horizontal plane
  const rA = -cA * sG - sA * sB * cG;
  const rB = -sA * sG + cA * sB * cG;

  let heading = Math.atan2(rA, rB) * (180 / Math.PI);
  return (heading + 360) % 360;
}

export const QiblaView: React.FC<QiblaViewProps> = ({ 
  district, 
  onOpenDistrictModal,
  gpsCoords,
  onUpdateGpsCoords 
}) => {
  // Live GPS Coordinates
  const [liveGps, setLiveGps] = useState<{ lat: number; lng: number } | null>(() => gpsCoords || null);
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'locating' | 'granted' | 'denied'>(
    gpsCoords ? 'granted' : 'idle'
  );

  // Sensor state
  const [deviceHeading, setDeviceHeading] = useState<number>(0);
  const [unwrappedHeading, setUnwrappedHeading] = useState<number>(0);
  const [sensorAvailable, setSensorAvailable] = useState<boolean | null>(null);
  const [permissionState, setPermissionState] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  const [sensorAccuracy, setSensorAccuracy] = useState<'high' | 'medium' | 'low'>('high');
  const [showCalibrationHelp, setShowCalibrationHelp] = useState<boolean>(false);
  const [manualHeading, setManualHeading] = useState<number>(0);

  // Refs for animation & smoothing
  const lastUnwrappedRef = useRef<number>(0);
  const smoothedHeadingRef = useRef<number>(0);
  const animFrameRef = useRef<number | null>(null);
  const wasAlignedRef = useRef<boolean>(false);
  const sensorEventCountRef = useRef<number>(0);

  // Active geographic coordinates (GPS if available, otherwise selected district)
  const activeLat = liveGps?.lat ?? district.lat;
  const activeLng = liveGps?.lng ?? district.lng;
  const isUsingLiveGps = !!liveGps;

  // Real-time astronomical Kaaba bearing from active location
  const qiblaBearing = useMemo(() => {
    return calculateQiblaBearing(activeLat, activeLng);
  }, [activeLat, activeLng]);

  const distanceKm = useMemo(() => {
    return calculateDistanceToMecca(activeLat, activeLng);
  }, [activeLat, activeLng]);

  const magneticDeclination = useMemo(() => {
    return getMagneticDeclination(activeLat, activeLng);
  }, [activeLat, activeLng]);

  // Request browser geolocation
  const handleRequestGps = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setGpsStatus('denied');
      return;
    }
    triggerHaptic(25);
    setGpsStatus('locating');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setLiveGps(coords);
        setGpsStatus('granted');
        if (onUpdateGpsCoords) onUpdateGpsCoords(coords);
      },
      () => {
        setGpsStatus('denied');
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
    );
  };

  // Get screen orientation offset (Portrait = 0, Landscape = 90 / 270)
  const getScreenOrientationAngle = (): number => {
    if (typeof window !== 'undefined') {
      if (window.screen?.orientation?.angle !== undefined) {
        return window.screen.orientation.angle;
      }
      if (typeof window.orientation === 'number') {
        return window.orientation;
      }
    }
    return 0;
  };

  // Smoothly update heading without 0°/360° jump
  const updateHeadingSmoothly = (rawHeading: number) => {
    // Apply magnetic declination to convert magnetic heading to True Geographic North
    const trueHeading = (rawHeading + magneticDeclination + 360) % 360;

    // Unwrapped shortest delta to prevent 360-degree boundary flip
    const prev = lastUnwrappedRef.current;
    let delta = trueHeading - (prev % 360);
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;

    const nextUnwrapped = prev + delta;
    lastUnwrappedRef.current = nextUnwrapped;

    // Low-pass filter (exponential smoothing for jitter-free, responsive motion)
    const factor = 0.35;
    smoothedHeadingRef.current = smoothedHeadingRef.current + (nextUnwrapped - smoothedHeadingRef.current) * factor;

    setUnwrappedHeading(nextUnwrapped);
    setDeviceHeading((trueHeading + 360) % 360);
  };

  // Request iOS / Android Sensor permission
  const requestCompassPermission = async () => {
    triggerHaptic(30);
    const DeviceOrientationEventWithPermission = window.DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<'granted' | 'denied'>;
    };

    if (typeof DeviceOrientationEventWithPermission?.requestPermission === 'function') {
      try {
        const response = await DeviceOrientationEventWithPermission.requestPermission();
        if (response === 'granted') {
          setPermissionState('granted');
          initSensors();
        } else {
          setPermissionState('denied');
        }
      } catch {
        setPermissionState('denied');
      }
    } else {
      setPermissionState('granted');
      initSensors();
    }
  };

  // Sensor lifecycle: initialization and teardown
  const initSensors = () => {
    let absoluteOrientationSensor: any = null;

    // 1. Try modern Generic Sensor API (AbsoluteOrientationSensor with magnetometer fusion)
    if ('AbsoluteOrientationSensor' in window) {
      try {
        const SensorClass = (window as any).AbsoluteOrientationSensor;
        absoluteOrientationSensor = new SensorClass({ frequency: 60 });
        absoluteOrientationSensor.addEventListener('reading', () => {
          sensorEventCountRef.current++;
          setSensorAvailable(true);
          const q = absoluteOrientationSensor.quaternion;
          if (q && q.length === 4) {
            // Quaternion to yaw (heading around Z axis)
            const [x, y, z, w] = q;
            const yaw = Math.atan2(2 * (w * z + x * y), 1 - 2 * (y * y + z * z));
            let headingDeg = (yaw * (180 / Math.PI) + 360) % 360;
            headingDeg = (headingDeg + getScreenOrientationAngle()) % 360;
            updateHeadingSmoothly(headingDeg);
          }
        });
        absoluteOrientationSensor.addEventListener('error', (err: any) => {
          if (err.name === 'NotReadableError') {
            setSensorAccuracy('low');
          }
        });
        absoluteOrientationSensor.start();
      } catch {
        // Fall back to standard deviceorientation events
      }
    }

    // 2. Standard deviceorientationabsolute (Android Chrome standard for True Magnetic Heading)
    const handleOrientationAbsolute = (e: any) => {
      if (e.alpha !== null && e.alpha !== undefined) {
        sensorEventCountRef.current++;
        setSensorAvailable(true);

        const screenAngle = getScreenOrientationAngle();
        const beta = e.beta || 0;
        const gamma = e.gamma || 0;
        const rawHeading = computeHeadingFrom3DAngles(e.alpha, beta, gamma);
        const compensatedHeading = (rawHeading + screenAngle) % 360;

        updateHeadingSmoothly(compensatedHeading);
      }
    };

    // 3. Fallback deviceorientation (iOS webkitCompassHeading or standard alpha)
    const handleOrientationStandard = (e: any) => {
      // iOS Safari provides webkitCompassHeading directly
      if (typeof e.webkitCompassHeading === 'number') {
        sensorEventCountRef.current++;
        setSensorAvailable(true);
        if (typeof e.webkitCompassAccuracy === 'number') {
          if (e.webkitCompassAccuracy < 0 || e.webkitCompassAccuracy > 25) {
            setSensorAccuracy('low');
          } else if (e.webkitCompassAccuracy > 15) {
            setSensorAccuracy('medium');
          } else {
            setSensorAccuracy('high');
          }
        }
        const screenAngle = getScreenOrientationAngle();
        const adjustedHeading = (e.webkitCompassHeading + screenAngle) % 360;
        updateHeadingSmoothly(adjustedHeading);
      } else if (!absoluteOrientationSensor && e.alpha !== null && e.alpha !== undefined) {
        sensorEventCountRef.current++;
        setSensorAvailable(true);
        const screenAngle = getScreenOrientationAngle();
        const beta = e.beta || 0;
        const gamma = e.gamma || 0;
        const rawHeading = computeHeadingFrom3DAngles(e.alpha, beta, gamma);
        const compensatedHeading = (rawHeading + screenAngle) % 360;
        updateHeadingSmoothly(compensatedHeading);
      }
    };

    window.addEventListener('deviceorientationabsolute', handleOrientationAbsolute, true);
    window.addEventListener('deviceorientation', handleOrientationStandard, true);

    // Orientation change listener (Portrait <-> Landscape)
    const handleScreenChange = () => {
      triggerHaptic(15);
    };
    if (window.screen?.orientation) {
      window.screen.orientation.addEventListener('change', handleScreenChange);
    } else {
      window.addEventListener('orientationchange', handleScreenChange);
    }

    return () => {
      if (absoluteOrientationSensor) {
        try {
          absoluteOrientationSensor.stop();
        } catch {}
      }
      window.removeEventListener('deviceorientationabsolute', handleOrientationAbsolute, true);
      window.removeEventListener('deviceorientation', handleOrientationStandard, true);
      if (window.screen?.orientation) {
        window.screen.orientation.removeEventListener('change', handleScreenChange);
      } else {
        window.removeEventListener('orientationchange', handleScreenChange);
      }
    };
  };

  useEffect(() => {
    const cleanup = initSensors();

    // Check after 2 seconds if sensor fired
    const timeout = setTimeout(() => {
      if (sensorEventCountRef.current === 0) {
        setSensorAvailable(false);
      }
    }, 2200);

    return () => {
      clearTimeout(timeout);
      if (cleanup) cleanup();
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  // Current effective heading (sensor-driven or manual preview)
  const currentHeading = sensorAvailable !== false ? deviceHeading : manualHeading;
  const currentUnwrapped = sensorAvailable !== false ? unwrappedHeading : manualHeading;

  // Relative Qibla angle from the top of the device (0° = pointing straight towards Kaaba)
  const relativeQiblaAngle = (qiblaBearing - currentHeading + 360) % 360;
  const angularDiff = relativeQiblaAngle > 180 ? relativeQiblaAngle - 360 : relativeQiblaAngle;
  // Aligned within ±5 degrees
  const isAligned = Math.abs(angularDiff) <= 5;

  // Haptic pulse when entering alignment
  useEffect(() => {
    if (isAligned && !wasAlignedRef.current) {
      triggerHaptic([50, 40, 80]);
    }
    wasAlignedRef.current = isAligned;
  }, [isAligned]);

  return (
    <div className="pb-24 pt-3 px-4 max-w-xl mx-auto space-y-4">
      {/* 1. Header and Location Selector */}
      <div className="bg-white dark:bg-stone-900 rounded-2xl p-4 shadow-xs border border-stone-200 dark:border-stone-800 flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
            <Compass className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            কিবলা কম্পাস
          </h2>
          <div className="text-xs text-stone-500 dark:text-stone-400 flex items-center gap-1 mt-0.5">
            <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>
              {isUsingLiveGps ? 'লাইভ জিপিএস অবস্থান' : `${district.nameBn} জেলা`}
            </span>
            <span className="text-stone-400">•</span>
            <span className="text-stone-600 dark:text-stone-300 font-medium">কাবা শরিফের দিক</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={handleRequestGps}
            title="লাইভ জিপিএস চালু করুন"
            className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer border ${
              isUsingLiveGps
                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700 hover:bg-stone-200'
            }`}
          >
            <Navigation className={`w-3.5 h-3.5 ${gpsStatus === 'locating' ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{isUsingLiveGps ? 'জিপিএস সক্রিয়' : 'জিপিএস'}</span>
          </button>

          <button
            onClick={onOpenDistrictModal}
            className="text-xs px-3 py-2 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200 hover:bg-stone-200 font-semibold cursor-pointer border border-stone-200 dark:border-stone-700 transition-colors"
          >
            জেলা পরিবর্তন
          </button>
        </div>
      </div>

      {/* 2. Main Live Compass Visual Card */}
      <div className={`bg-white dark:bg-stone-900 rounded-3xl p-6 shadow-xs border transition-all duration-300 flex flex-col items-center justify-center relative overflow-hidden ${
        isAligned 
          ? 'border-emerald-500/80 dark:border-emerald-500/80 shadow-emerald-500/10 shadow-lg' 
          : 'border-stone-200 dark:border-stone-800'
      }`}>
        {/* Glow halo when aligned */}
        {isAligned && (
          <div className="absolute inset-0 bg-radial from-emerald-500/10 via-transparent to-transparent pointer-events-none animate-pulse" />
        )}

        {/* Alignment status alert badge */}
        <div className={`mb-5 px-4 py-1.5 rounded-full text-xs font-semibold flex items-center gap-2 transition-all duration-300 z-10 ${
          isAligned
            ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20 ring-4 ring-emerald-500/20'
            : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700'
        }`}>
          {isAligned ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-white" />
              <span>আপনি সঠিক কিবলামুখী আছেন!</span>
            </>
          ) : (
            <>
              <RotateCw className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 animate-spin" style={{ animationDuration: '4s' }} />
              <span>ফোনটি ঘুরিয়ে তীরটি কাবার দিকের সঙ্গে মিলিয়ে নিন</span>
            </>
          )}
        </div>

        {/* Circular Compass Dial Container */}
        <div className="relative w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center select-none">
          {/* Compass Outer Rotating Dial Ring (Rotates opposite to device heading) */}
          <div 
            className="absolute inset-0 rounded-full border-4 border-stone-200 dark:border-stone-800 flex items-center justify-center transition-transform duration-150 ease-out shadow-inner"
            style={{ 
              transform: `rotate(${-currentUnwrapped}deg)`,
              willChange: 'transform'
            }}
          >
            {/* Degree tick ring */}
            <div className="absolute inset-2 rounded-full border border-dashed border-stone-300 dark:border-stone-700/60" />

            {/* North Mark */}
            <div className="absolute top-2.5 flex flex-col items-center">
              <span className="font-extrabold text-xs text-rose-600 dark:text-rose-400 tracking-wider">N</span>
              <span className="text-[9px] font-bold text-rose-500">উত্তর</span>
            </div>

            {/* South */}
            <div className="absolute bottom-2.5 flex flex-col items-center">
              <span className="font-bold text-xs text-stone-400">S</span>
              <span className="text-[9px] text-stone-400">দক্ষিণ</span>
            </div>

            {/* East */}
            <div className="absolute right-2.5 flex flex-col items-center">
              <span className="font-bold text-xs text-stone-400">E</span>
              <span className="text-[9px] text-stone-400">পূর্ব</span>
            </div>

            {/* West */}
            <div className="absolute left-2.5 flex flex-col items-center">
              <span className="font-bold text-xs text-stone-400">W</span>
              <span className="text-[9px] text-stone-400">পশ্চিম</span>
            </div>

            {/* Kaaba Direction Marker fixed onto the dial at qiblaBearing */}
            <div 
              className="absolute inset-0 flex flex-col items-center justify-start pointer-events-none"
              style={{ transform: `rotate(${qiblaBearing}deg)` }}
            >
              <div className="flex flex-col items-center -mt-3">
                <div className={`px-2 py-1 rounded-lg text-white font-bold text-xs shadow-md border flex items-center gap-1 transition-all ${
                  isAligned
                    ? 'bg-emerald-600 border-amber-300 scale-110 shadow-emerald-600/40'
                    : 'bg-emerald-800 border-amber-400'
                }`}>
                  <span className="text-sm">🕋</span>
                  <span className="text-[10px] tracking-tight">কাবা</span>
                </div>
                <div className="w-0.5 h-6 bg-gradient-to-b from-amber-400 to-transparent" />
              </div>
            </div>
          </div>

          {/* Compass Qibla Arrow / Direction Needle (Points towards Kaaba in real-time) */}
          <div 
            className="absolute inset-0 flex items-center justify-center pointer-events-none transition-transform duration-150 ease-out"
            style={{ 
              transform: `rotate(${relativeQiblaAngle}deg)`,
              willChange: 'transform'
            }}
          >
            <div className="relative w-8 h-48 flex flex-col items-center justify-between">
              {/* Top arrow head pointing directly to Kaaba */}
              <div className="flex flex-col items-center">
                <div className={`w-0 h-0 border-l-[11px] border-l-transparent border-r-[11px] border-r-transparent border-b-[28px] transition-colors ${
                  isAligned 
                    ? 'border-b-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]' 
                    : 'border-b-emerald-700 dark:border-b-emerald-500'
                }`} />
                <div className={`w-1.5 h-14 ${isAligned ? 'bg-emerald-500' : 'bg-emerald-700 dark:bg-emerald-500'}`} />
              </div>

              {/* Center Pivot Jewel */}
              <div className={`w-6 h-6 rounded-full border-2 shadow-lg flex items-center justify-center transition-all ${
                isAligned 
                  ? 'bg-emerald-600 border-amber-300 scale-110' 
                  : 'bg-stone-900 dark:bg-stone-100 border-amber-400'
              }`}>
                <div className="w-2 h-2 rounded-full bg-white dark:bg-stone-900" />
              </div>

              {/* Bottom tail */}
              <div className="flex flex-col items-center">
                <div className="w-1.5 h-12 bg-stone-300 dark:bg-stone-700" />
                <div className="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[18px] border-t-stone-400 dark:border-t-stone-600" />
              </div>
            </div>
          </div>

          {/* Fixed Target Marker at 12 o'clock (Device forward reference) */}
          <div className="absolute top-0 -mt-2 z-20 flex flex-col items-center pointer-events-none">
            <div className={`w-2.5 h-2.5 rotate-45 border-2 transition-colors ${
              isAligned ? 'bg-emerald-500 border-white' : 'bg-rose-500 border-white dark:border-stone-900'
            }`} />
          </div>
        </div>

        {/* 3. Bearing & Distance Metadata Panel */}
        <div className="mt-6 text-center space-y-1.5 w-full">
          <div className="flex items-center justify-center gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold font-mono text-emerald-800 dark:text-emerald-300 tabular-nums">
              {toBengaliDigits(qiblaBearing.toFixed(1))}°
            </span>
            <span className="text-xs font-bold text-stone-600 dark:text-stone-300 bg-stone-100 dark:bg-stone-800 px-2 py-0.5 rounded-md">
              {qiblaBearing >= 260 && qiblaBearing <= 290 
                ? 'পশ্চিম-উত্তর-পশ্চিম (WNW)' 
                : qiblaBearing >= 240 && qiblaBearing < 260 
                ? 'পশ্চিম-দক্ষিণ-পশ্চিম (WSW)' 
                : 'পশ্চিম (W)'}
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-3 text-xs text-stone-500 dark:text-stone-400">
            <span>
              কাবা শরিফের দূরত্ব: <strong className="text-stone-800 dark:text-stone-200">{toBengaliDigits(distanceKm.toLocaleString('en-US'))} কি.মি.</strong>
            </span>
            <span className="text-stone-300 dark:text-stone-700">•</span>
            <span>
              ডিভাইস হেডিং: <strong className="text-stone-800 dark:text-stone-200">{toBengaliDigits(Math.round(currentHeading))}°</strong>
            </span>
          </div>
        </div>
      </div>

      {/* 4. Sensor Calibration & Accuracy Alert */}
      {sensorAccuracy === 'low' && sensorAvailable && (
        <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-xs flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1 text-amber-900 dark:text-amber-200">
            <span className="font-bold block">কম্পাসের নির্ভুলতা কম। ফোনটি একটু নড়াচড়া করে আবার চেষ্টা করুন।</span>
            <p className="text-amber-800 dark:text-amber-300 leading-relaxed font-medium">
              ফোনটি ৮-এর মতো করে কয়েকবার ঘুরিয়ে compass calibrate করুন।
            </p>
          </div>
        </div>
      )}

      {/* 5. Sensor Not Available Fallback */}
      {sensorAvailable === false && (
        <div className="bg-stone-50 dark:bg-stone-900 rounded-2xl p-4 border border-stone-200 dark:border-stone-800 text-xs space-y-3">
          <div className="flex items-start gap-2.5">
            <Smartphone className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold text-stone-900 dark:text-stone-100 block">
                এই ডিভাইসে প্রয়োজনীয় compass sensor পাওয়া যায়নি
              </span>
              <p className="text-stone-600 dark:text-stone-400 leading-relaxed">
                আপনার ব্রাউজার বা ডিভাইসে ম্যাগনেটোমিটার সেন্সর সক্রিয় নাও থাকতে পারে। কম্পাসের অনুমতি পরীক্ষা করুন অথবা নিচের বাটন দিয়ে ম্যানুয়ালি দিক নির্ধারণ করুন।
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-stone-200 dark:border-stone-800">
            <button
              onClick={requestCompassPermission}
              className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-medium cursor-pointer transition-colors"
            >
              সেন্সর পুনরায় চেষ্টা করুন
            </button>
            <button
              onClick={() => setManualHeading((prev) => (prev + 45) % 360)}
              className="px-3 py-1.5 rounded-lg bg-stone-200 dark:bg-stone-800 hover:bg-stone-300 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 font-medium cursor-pointer transition-colors flex items-center gap-1"
            >
              <RotateCw className="w-3.5 h-3.5" />
              ম্যানুয়ালি ঘোরান (+৪৫°)
            </button>
          </div>
        </div>
      )}

      {/* 6. Calibration Instruction & Metal Interference Guidance */}
      <div className="p-3.5 rounded-2xl bg-stone-100/90 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 text-xs leading-relaxed space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
            <HelpCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            কিবলা নির্ণয়ের নিয়ম ও সতর্কতা
          </span>
          <button
            onClick={() => setShowCalibrationHelp(!showCalibrationHelp)}
            className="text-emerald-700 dark:text-emerald-400 font-semibold hover:underline cursor-pointer"
          >
            {showCalibrationHelp ? 'সংক্ষিপ্ত করুন' : 'ক্যালিব্রেশন জানুন'}
          </button>
        </div>

        <p className="text-stone-600 dark:text-stone-300 font-medium">
          নির্ভুল ফলাফলের জন্য ফোনটিকে হাতের তালুতে বা সমতল টেবিলে রাখুন। চৌম্বকীয় কাভার, ল্যাপটপ বা ধাতব বস্তু থেকে ফোন দূরে রাখুন।
        </p>

        {showCalibrationHelp && (
          <div className="pt-2 border-t border-stone-200 dark:border-stone-700 space-y-1.5 text-stone-700 dark:text-stone-300">
            <p className="font-semibold text-emerald-800 dark:text-emerald-300">
              কম্পাস ক্যালিব্রেশন কীভাবে করবেন?
            </p>
            <p className="text-stone-600 dark:text-stone-300">
              ১. ফোনটি হাতে ধরে বাতাসে ইংরেজি ‘8’ (আট)-এর ভঙ্গিতে ২-৩ বার ঘোরান।
            </p>
            <p className="text-stone-600 dark:text-stone-300">
              ২. ফোনটি অনুভূমিকভাবে সমতলে ধরে ধীরে ধীরে শরীরের সাথে ঘুরুন।
            </p>
            <p className="text-stone-600 dark:text-stone-300">
              ৩. সবুজ তীরটি যখন সরাসরি উপরের নির্দেশকের সাথে মিলে যাবে এবং ফোন মৃদু কম্পিত হবে, তখন আপনি সরাসরি পবিত্র কাবার অভিমুখে আছেন।
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
