// Stylized "logo-style" globe — flat yellow continents, drag to spin
import { useEffect, useRef, useMemo, useCallback } from "react";
import * as d3 from "d3";

function useHighlightedSet(studentCountries) {
  return useMemo(() => {
    const s = new Set();
    studentCountries.forEach((c) => s.add(c.code));
    return s;
  }, [studentCountries]);
}

// Fallback when a code is missing from world-atlas 110m (rare) or geometry fails
const COUNTRY_CENTROIDS_FALLBACK = {
  BRA: [-53, -10],
  KOR: [127.5, 36.5],
  CHN: [104, 35],
  JPN: [138, 36],
  IND: [78, 22],
  HND: [-86.5, 14.7],
  COL: [-74, 4.5],
  ITA: [12.5, 42.8],
  TUR: [35, 39],
  MEX: [-102, 23.6],
  ARG: [-64, -34],
  VNM: [108, 16],
  THA: [101, 15],
  DEU: [10.5, 51],
  FRA: [2.5, 46.5],
  ESP: [-3.7, 40.4],
  RUS: [100, 60],
  UKR: [31.5, 49],
  EGY: [30, 26.8],
  ETH: [40, 9],
  IDN: [113, -2.5],
  PHL: [122, 13],
  ARM: [45, 40],
  IRN: [53, 32],
  USA: [-98, 39],
  GBR: [-2, 54],
  CAN: [-106, 56],
  AUS: [134, -25],
  HKG: [114.17, 22.32],
  ECU: [-78.5, -1.5],
  SLV: [-88.9, 13.8],
};

function buildCentroids(world, highlighted) {
  const map = new Map();
  if (!world?.features?.length) return map;
  for (const f of world.features) {
    if (!highlighted.has(f.id)) continue;
    try {
      const c = d3.geoCentroid(f);
      if (c && Number.isFinite(c[0]) && Number.isFinite(c[1])) {
        map.set(f.id, c);
      }
    } catch {
      /* ignore */
    }
  }
  highlighted.forEach((code) => {
    if (!map.has(code) && COUNTRY_CENTROIDS_FALLBACK[code]) {
      map.set(code, COUNTRY_CENTROIDS_FALLBACK[code]);
    }
  });
  return map;
}

export function Globe({
  studentCountries,
  size,
  rotation,
  setRotation,
  hoveredCode,
  setHoveredCode,
  onCountryClick,
  world,
  autoSpin,
  focusTarget,
  onFocusComplete,
  onUserInteract,
}) {
  const svgRef = useRef(null);
  const dragRef = useRef(null);
  const rafRef = useRef(null);
  const lastTimeRef = useRef(performance.now());
  const highlighted = useHighlightedSet(studentCountries);

  const centroidsByCode = useMemo(
    () => buildCentroids(world, highlighted),
    [world, highlighted],
  );

  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 18;

  // Auto-rotate
  useEffect(() => {
    let running = true;
    const tick = (now) => {
      if (!running) return;
      const dt = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;
      if (autoSpin && !dragRef.current && !focusTarget) {
        setRotation((prev) => ({ ...prev, lambda: prev.lambda + dt * 5 }));
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      running = false;
      cancelAnimationFrame(rafRef.current);
    };
  }, [autoSpin, setRotation, focusTarget]);

  // Whip-to-country animation
  useEffect(() => {
    if (!focusTarget) return;
    const [lon, lat] = centroidsByCode.get(focusTarget) || [0, 20];
    const start = { ...rotation };
    let dl = -lon - start.lambda;
    while (dl > 180) dl -= 360;
    while (dl < -180) dl += 360;
    const target = { lambda: start.lambda + dl, phi: -lat };
    const t0 = performance.now();
    const dur = 900;
    let raf;
    const step = (now) => {
      const t = Math.min(1, (now - t0) / dur);
      const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      setRotation({
        lambda: start.lambda + (target.lambda - start.lambda) * e,
        phi: start.phi + (target.phi - start.phi) * e,
      });
      if (t < 1) raf = requestAnimationFrame(step);
      else onFocusComplete && onFocusComplete();
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusTarget, centroidsByCode]);

  const projector = useMemo(() => {
    const projection = d3
      .geoOrthographic()
      .scale(r)
      .translate([cx, cy])
      .rotate([rotation.lambda, rotation.phi, 0])
      .clipAngle(90);
    const path = d3.geoPath(projection);
    return { projection, path };
  }, [rotation, r, cx, cy]);

  const onPointerDown = (e) => {
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startRot: { ...rotation },
      moved: false,
      pointerId: e.pointerId,
      captured: false,
    };
    onUserInteract && onUserInteract();
  };
  const onPointerMove = (e) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    const dist = Math.abs(dx) + Math.abs(dy);
    if (dist > 4) {
      dragRef.current.moved = true;
      if (!dragRef.current.captured && svgRef.current) {
        try {
          svgRef.current.setPointerCapture(dragRef.current.pointerId);
        } catch {
          /* ignore */
        }
        dragRef.current.captured = true;
      }
    }
    if (!dragRef.current.moved) return;
    const k = 0.4;
    setRotation({
      lambda: dragRef.current.startRot.lambda + dx * k,
      phi: Math.max(-80, Math.min(80, dragRef.current.startRot.phi - dy * k)),
    });
    onUserInteract && onUserInteract();
  };
  const onPointerUp = () => {
    if (!dragRef.current) return;
    setTimeout(() => {
      dragRef.current = null;
    }, 0);
  };

  if (!world) {
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={cx} cy={cy} r={r} fill="#11131a" stroke="rgba(255,210,63,0.2)" />
        <text x={cx} y={cy} textAnchor="middle" fill="#FFD23F" fontSize="14" fontFamily="monospace">
          loading…
        </text>
      </svg>
    );
  }

  const graticule = d3.geoGraticule10();
  const features = world.features;
  const sphere = { type: "Sphere" };
  const spherePath = projector.path(sphere);

  const visibleHighlights = [];
  studentCountries.forEach(({ code }) => {
    const pt = centroidsByCode.get(code);
    if (!pt) return;
    const [lon, lat] = pt;
    if (!isPointVisible(lon, lat, rotation)) return;
    const [px, py] = projector.projection([lon, lat]);
    visibleHighlights.push({ code, x: px, y: py });
  });

  return (
    <svg
      ref={svgRef}
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      style={{ touchAction: "none", cursor: "grab", userSelect: "none" }}
    >
      <defs>
        <radialGradient id="sphereGrad" cx="38%" cy="32%">
          <stop offset="0%" stopColor="#1c1f2a" />
          <stop offset="70%" stopColor="#0e1018" />
          <stop offset="100%" stopColor="#06070c" />
        </radialGradient>
        <radialGradient id="halo" cx="50%" cy="50%">
          <stop offset="82%" stopColor="rgba(255,210,63,0)" />
          <stop offset="94%" stopColor="rgba(255,210,63,0.22)" />
          <stop offset="100%" stopColor="rgba(255,210,63,0)" />
        </radialGradient>
        <filter id="dotGlow" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="3" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <radialGradient id="sphereShade" cx="65%" cy="70%">
          <stop offset="60%" stopColor="rgba(0,0,0,0)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.55)" />
        </radialGradient>
      </defs>

      <circle cx={cx} cy={cy} r={r + 12} fill="url(#halo)" />

      <path d={spherePath} fill="url(#sphereGrad)" />

      <path
        d={projector.path(graticule)}
        fill="none"
        stroke="rgba(255,255,255,0.06)"
        strokeWidth="0.5"
        style={{ pointerEvents: "none" }}
      />

      <g>
        {features.map((f, i) => {
          const code = f.id;
          const isHi = highlighted.has(code);
          const isHover = hoveredCode === code;
          const d = projector.path(f);
          if (!d) return null;
          const fill = isHi ? (isHover ? "#FFE066" : "#FFD23F") : "#3a3320";
          return (
            <path
              key={i}
              d={d}
              fill={fill}
              stroke={isHi ? "rgba(255,255,255,0.25)" : "rgba(255,210,63,0.05)"}
              strokeWidth={isHi ? 0.6 : 0.3}
              style={{
                cursor: isHi ? "pointer" : "default",
                transition: "fill 150ms",
                pointerEvents: isHi ? "auto" : "none",
              }}
              onPointerEnter={() => isHi && setHoveredCode(code)}
              onPointerLeave={() => isHi && setHoveredCode(null)}
              onClick={() => {
                if (dragRef.current?.moved) return;
                if (isHi) onCountryClick(code);
              }}
            />
          );
        })}
      </g>

      <path d={spherePath} fill="url(#sphereShade)" style={{ pointerEvents: "none" }} />

      <g style={{ pointerEvents: "none" }}>
        {visibleHighlights.map((h) => {
          const isHover = hoveredCode === h.code;
          return (
            <g key={h.code}>
              <circle cx={h.x} cy={h.y} r={isHover ? 7 : 4} fill="#fff" filter="url(#dotGlow)" opacity="0.55">
                <animate
                  attributeName="r"
                  values={`${isHover ? 7 : 3};${isHover ? 12 : 8};${isHover ? 7 : 3}`}
                  dur="2.4s"
                  repeatCount="indefinite"
                />
                <animate attributeName="opacity" values="0.7;0.05;0.7" dur="2.4s" repeatCount="indefinite" />
              </circle>
              <circle cx={h.x} cy={h.y} r={isHover ? 3.5 : 2.5} fill="#fff" stroke="#111" strokeWidth="0.8" />
            </g>
          );
        })}
      </g>

      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,210,63,0.35)" strokeWidth="0.6" />
    </svg>
  );
}

function isPointVisible(lon, lat, rotation) {
  const toRad = Math.PI / 180;
  const lam = (lon + rotation.lambda) * toRad;
  const phi = lat * toRad;
  const phi0 = -rotation.phi * toRad;
  const cosc = Math.sin(phi0) * Math.sin(phi) + Math.cos(phi0) * Math.cos(phi) * Math.cos(lam);
  return cosc > 0.05;
}
