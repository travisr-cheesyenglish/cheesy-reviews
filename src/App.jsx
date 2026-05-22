import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import * as topojson from "topojson-client";
import { ISO_NUM_TO_ALPHA3 } from "./data/iso";
import { loadSiteContent } from "./loadSiteContent";
import { COUNTRY_FLAGS } from "./data/countryMeta";
import { Globe } from "./Globe.jsx";

export default function App() {
  const [site, setSite] = useState(null);
  const [siteError, setSiteError] = useState(null);

  const [world, setWorld] = useState(null);
  const [rotation, setRotation] = useState({ lambda: -20, phi: -15 });
  const [hoveredCode, setHoveredCode] = useState(null);
  const [activeCountry, setActiveCountry] = useState(null);
  const [autoSpin, setAutoSpin] = useState(true);
  const [focusTarget, setFocusTarget] = useState(null);
  const [globeSize, setGlobeSize] = useState(560);
  const [overlayExiting, setOverlayExiting] = useState(false);
  const idleTimerRef = useRef(null);
  const exitOverlayTimerRef = useRef(null);
  const activeCountryRef = useRef(null);
  activeCountryRef.current = activeCountry;

  // Auto-resume spin after idle (only when overlay is not open)
  const bumpIdleTimer = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    setAutoSpin(false);
    idleTimerRef.current = setTimeout(() => {
      if (!activeCountryRef.current) setAutoSpin(true);
    }, 3000);
  }, []);

  useEffect(() => {
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (exitOverlayTimerRef.current) clearTimeout(exitOverlayTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const ac = new AbortController();
    loadSiteContent(ac.signal)
      .then(setSite)
      .catch((e) => {
        if (e.name === "AbortError") return;
        setSiteError(e instanceof Error ? e.message : String(e));
      });
    return () => ac.abort();
  }, []);

  // Load world topojson
  useEffect(() => {
    fetch("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json")
      .then(r => r.json())
      .then(topo => {
        const feats = topojson.feature(topo, topo.objects.countries).features;
        feats.forEach((f) => {
          const key = String(f.id).padStart(3, "0");
          f.id = ISO_NUM_TO_ALPHA3[key] || f.id;
        });
        setWorld({ features: feats });
      });
  }, []);

  // Responsive globe size
  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const s = Math.min(w * 0.55, h - 240, 720);
      setGlobeSize(Math.max(360, s));
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const handleCountryClick = (code) => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (exitOverlayTimerRef.current) {
      clearTimeout(exitOverlayTimerRef.current);
      exitOverlayTimerRef.current = null;
    }
    setOverlayExiting(false);
    setActiveCountry(code);
    setAutoSpin(false);
    setFocusTarget(code);
  };

  const requestCloseReviews = () => {
    if (!activeCountry || overlayExiting) return;
    setOverlayExiting(true);
    if (exitOverlayTimerRef.current) clearTimeout(exitOverlayTimerRef.current);
    exitOverlayTimerRef.current = setTimeout(() => {
      exitOverlayTimerRef.current = null;
      setActiveCountry(null);
      setOverlayExiting(false);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(() => {
        setAutoSpin(true);
      }, 3000);
    }, 500);
  };

  // When user hovers a marquee pill, also rotate to that country
  const handleMarqueeHover = (code) => {
    setHoveredCode(code);
    if (code && !activeCountry && !overlayExiting) {
      setFocusTarget(code);
      setAutoSpin(false);
    }
  };
  const handleMarqueeUnhover = () => {
    setHoveredCode(null);
    bumpIdleTimer();
  };

  if (siteError) {
    return (
      <div className="app-root app-root--message">
        <Stars />
        <div className="load-panel">
          <p className="load-title">Couldn’t load reviews</p>
          <p className="load-detail">{siteError}</p>
        </div>
      </div>
    );
  }

  if (!site) {
    return (
      <div className="app-root app-root--message">
        <Stars />
        <div className="load-panel">
          <p className="load-title">Unpacking…</p>
          <p className="load-detail">Loading student stories</p>
        </div>
      </div>
    );
  }

  const { studentCountries, reviewsByCountry, headerStats } = site;

  const countryName = activeCountry
    ? studentCountries.find((c) => c.code === activeCountry)?.name
    : null;
  const activeReviews = activeCountry ? reviewsByCountry[activeCountry] || [] : [];

  return (
    <div className="app-root">
      <Stars />

      <header className="banner">
        <div className="logo-row">
          <img src="assets/cheesy-logo.png" alt="Cheesy English" className="logo" />
          <div className="brand-text">
            <div className="brand-title">CHEESY ENGLISH</div>
            <div className="brand-sub">est. 2014 · ESL with Travis</div>
          </div>
        </div>
        <h1 className="banner-headline">
          Helping students all over the world <span className="since">since 2014.</span>
        </h1>
        <div className="banner-stats">
          <Stat n={headerStats.countries} label="countries" />
          <Dot />
          <Stat n={headerStats.years} label="years" />
        </div>
      </header>

      <main className="stage">
        <div className="globe-wrap" style={{ width: globeSize, height: globeSize }}>
          <div
            className={
              activeCountry && !overlayExiting ? "globe-scale-inner globe-scale-inner--compact" : "globe-scale-inner"
            }
          >
            <Globe
              studentCountries={studentCountries}
              size={globeSize}
              rotation={rotation}
              setRotation={setRotation}
              hoveredCode={hoveredCode}
              setHoveredCode={setHoveredCode}
              onCountryClick={handleCountryClick}
              world={world}
              autoSpin={autoSpin && !activeCountry}
              focusTarget={focusTarget}
              onFocusComplete={() => setFocusTarget(null)}
              onUserInteract={bumpIdleTimer}
            />
          </div>
          {hoveredCode && !activeCountry && (
            <HoverLabel studentCountries={studentCountries} code={hoveredCode} />
          )}
        </div>

        {activeCountry && (
          <ReviewOverlay
            country={activeCountry}
            countryName={countryName}
            reviews={activeReviews}
            exiting={overlayExiting}
            onClose={requestCloseReviews}
          />
        )}
      </main>

      <CountryMarquee
        studentCountries={studentCountries}
        active={activeCountry}
        onPick={handleCountryClick}
        onHover={handleMarqueeHover}
        onUnhover={handleMarqueeUnhover}
      />
    </div>
  );
}

function Stat({ n, label }) {
  return (
    <div className="stat">
      <div className="stat-n">{n}</div>
      <div className="stat-l">{label}</div>
    </div>
  );
}
function Dot() { return <div className="dotsep" />; }

function HoverLabel({ studentCountries, code }) {
  const country = studentCountries.find((c) => c.code === code);
  if (!country) return null;
  return (
    <div className="hover-label">
      <div className="hl-name">{country.name}</div>
      <div className="hl-sub">Click to read reviews</div>
    </div>
  );
}

function Stars() {
  const stars = useMemo(() => {
    const arr = [];
    for (let i = 0; i < 90; i++) {
      arr.push({
        x: Math.random() * 100,
        y: Math.random() * 100,
        s: Math.random() * 1.6 + 0.3,
        d: Math.random() * 4 + 2,
        delay: Math.random() * 4,
      });
    }
    return arr;
  }, []);
  return (
    <div className="stars">
      {stars.map((s, i) => (
        <div key={i} className="star" style={{
          left: `${s.x}%`, top: `${s.y}%`,
          width: s.s, height: s.s,
          animationDuration: `${s.d}s`, animationDelay: `${s.delay}s`,
        }} />
      ))}
    </div>
  );
}

/* ===== Review overlay with dispersing bubbles ===== */

function ReviewOverlay({ country, countryName, reviews, exiting = false, onClose }) {
  const overlayBackgroundClick = (e) => {
    if (e.target.closest(".bubble-pair")) return;
    onClose();
  };

  const overlayClass = `review-overlay${exiting ? " review-overlay--exiting" : ""}`;

  if (!reviews.length) {
    return (
      <div className={overlayClass} onClick={overlayBackgroundClick}>
        <div className="overlay-header">
          <div className="overlay-country">
            <span className="overlay-flag">●</span>
            <span className="overlay-cname">{countryName}</span>
          </div>
          <button type="button" className="close-btn" onClick={onClose}>✕ close</button>
        </div>
        <div className="bubble-empty-wrap">
          <div className="bubble-empty">No reviews from {countryName} yet.</div>
        </div>
      </div>
    );
  }

  return (
    <div className={overlayClass} onClick={overlayBackgroundClick}>
      <div className="overlay-header">
        <div className="overlay-country">
          <span className="overlay-flag">●</span>
          <span className="overlay-cname">{countryName}</span>
        </div>
        <button type="button" className="close-btn" onClick={onClose}>✕ close</button>
      </div>

      <div className="bubble-canvas">
        {reviews.map((review, i) => (
          <div
            key={`${country}-${i}`}
            className="bubble-pair-stack"
            style={{ animationDelay: `${Math.min(i * 55, 400)}ms` }}
          >
            <BubblePair review={review} countryName={countryName} />
          </div>
        ))}
      </div>
    </div>
  );
}

function BubblePair({ review, countryName }) {
  const hasReply = Boolean(String(review.reply || "").trim());

  return (
    <div className="bubble-pair" onClick={(e) => e.stopPropagation()}>
      <div className="bubble bubble-student">
        <div className="bubble-avatar" style={{ background: review.color }}>
          {review.initial}
        </div>
        <div className="bubble-body">
          <div className="bubble-meta">
            <span className="bubble-name">{review.name}</span>
            <span className="bubble-from">from {countryName}</span>
          </div>
          <div className="bubble-text">{review.review}</div>
        </div>
      </div>
      {hasReply ? (
        <div className="bubble bubble-travis">
          <div className="bubble-body">
            <div className="bubble-meta meta-r">
              <span className="bubble-name travis">Travis</span>
            </div>
            <div className="bubble-text">{review.reply}</div>
          </div>
          <div className="bubble-avatar travis-avatar">
            <img src="assets/cheesy-logo.png" alt="Travis" />
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* ===== Drag-scroll marquee with hover-highlight ===== */

function CountryMarquee({ studentCountries, active, onPick, onHover, onUnhover }) {
  const list = useMemo(() => {
    return [...studentCountries].sort((a, b) => b.count - a.count);
  }, [studentCountries]);
  const trackRef = useRef(null);
  const dragRef = useRef(null);
  const autoRafRef = useRef(null);
  const [paused, setPaused] = useState(false);
  // Auto-scroll loop (seamless)
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    let last = performance.now();
    let pos = 0;
    const tick = (now) => {
      const dt = (now - last) / 1000;
      last = now;
      if (!paused && !dragRef.current) {
        pos += dt * 28; // px/s
        const half = track.scrollWidth / 2;
        if (pos >= half) pos -= half;
        track.style.transform = `translateX(${-pos}px)`;
      } else {
        // Sync pos with current transform when paused due to drag
        const m = track.style.transform.match(/-?\d+(\.\d+)?/);
        if (m) pos = -parseFloat(m[0]);
      }
      autoRafRef.current = requestAnimationFrame(tick);
    };
    autoRafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(autoRafRef.current);
  }, [paused]);

  const onPointerDown = (e) => {
    const track = trackRef.current;
    if (!track) return;
    const m = track.style.transform.match(/-?\d+(\.\d+)?/);
    const startTx = m ? parseFloat(m[0]) : 0;
    dragRef.current = {
      startX: e.clientX,
      startTx,
      moved: false,
      pointerId: e.pointerId,
      captured: false,
      marqueeEl: e.currentTarget,
    };
  };
  const onPointerMove = (e) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    if (Math.abs(dx) > 4) {
      dragRef.current.moved = true;
      const { marqueeEl, pointerId, captured } = dragRef.current;
      if (!captured && marqueeEl) {
        try {
          marqueeEl.setPointerCapture(pointerId);
        } catch {
          /* ignore */
        }
        dragRef.current.captured = true;
      }
    }
    if (!dragRef.current.moved) return;
    const track = trackRef.current;
    let next = dragRef.current.startTx + dx;
    const half = track.scrollWidth / 2;
    while (next > 0) next -= half;
    while (next < -half) next += half;
    track.style.transform = `translateX(${next}px)`;
  };
  const onPointerUp = (e) => {
    if (!dragRef.current) return;
    const { moved, marqueeEl, pointerId, captured } = dragRef.current;
    if (captured && marqueeEl) {
      try {
        marqueeEl.releasePointerCapture(pointerId);
      } catch {
        /* ignore */
      }
    }
    dragRef.current = null;
    if (moved) {
      const blocker = (ev) => {
        ev.stopPropagation();
        ev.preventDefault();
        window.removeEventListener("click", blocker, true);
      };
      window.addEventListener("click", blocker, true);
      setTimeout(() => window.removeEventListener("click", blocker, true), 0);
    }
  };

  const doubled = [...list, ...list];
  return (
    <footer className="marquee-wrap">
      <div className="marquee-label">EXPLORE BY COUNTRY · DRAG TO BROWSE</div>
      <div
        className="marquee"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => { setPaused(false); onUnhover && onUnhover(); }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{ touchAction: "pan-y" }}
      >
        <div className="marquee-track" ref={trackRef}>
          {doubled.map((c, i) => (
            <button
              key={i}
              className={`pill ${active === c.code ? "active" : ""}`}
              onClick={() => onPick(c.code)}
              onMouseEnter={() => onHover && onHover(c.code)}
              onMouseLeave={() => onHover && onHover(null)}
              draggable={false}
            >
              {(c.flag || COUNTRY_FLAGS[c.code]) ? (
                <span className="pill-flag" aria-hidden>{c.flag || COUNTRY_FLAGS[c.code]}</span>
              ) : null}
              <span className="pill-name">{c.name}</span>
            </button>
          ))}
        </div>
      </div>
    </footer>
  );
}

