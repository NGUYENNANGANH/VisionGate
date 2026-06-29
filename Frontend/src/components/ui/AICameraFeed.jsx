import React, { useState } from 'react';

function Silhouette({ left, scale, hue }) {
  return (
    <div style={{
      position: 'absolute', left, bottom: '6%',
      transform: `translateX(-50%) scale(${scale})`, transformOrigin: 'bottom center',
      width: 90, height: '74%', opacity: .9,
    }}>
      <div style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: 64, height: '64%', borderRadius: '40px 40px 18px 18px', background: `linear-gradient(180deg, hsl(${hue} 60% 42% / .55), hsl(${hue} 50% 22% / .5))` }} />
      <div style={{ position: 'absolute', bottom: '58%', left: '50%', transform: 'translateX(-50%)', width: 38, height: 38, borderRadius: '50%', background: `linear-gradient(180deg, hsl(${hue} 55% 48% / .6), hsl(${hue} 50% 30% / .5))` }} />
    </div>
  );
}

function DetectBox({ x, y, w, h, name, tag, tone, warn }) {
  return (
    <div style={{ position: 'absolute', left: x, top: y, width: w, height: h, border: `1.5px solid ${tone}`, borderRadius: 8, boxShadow: `0 0 0 1px rgba(0,0,0,.25), 0 0 18px ${tone}40` }}>
      <div style={{
        position: 'absolute', top: -26, left: -1.5,
        display: 'inline-flex', alignItems: 'center', gap: 6,
        background: tone, color: warn ? '#3a2700' : '#04222a',
        fontWeight: 800, fontSize: 10.5, padding: '3px 8px',
        borderRadius: '6px 6px 6px 0', whiteSpace: 'nowrap',
      }}>
        {name}
        <span style={{ fontWeight: 600, opacity: .85, fontSize: 10 }}>· {tag}</span>
      </div>
    </div>
  );
}

function cornerStyle(c) {
  const m = 14;
  const base = { position: 'absolute', width: 22, height: 22, borderColor: 'rgba(34,211,238,.55)', borderStyle: 'solid', borderWidth: 0 };
  if (c === 'tl') return { ...base, top: m, left: m, borderTopWidth: 2, borderLeftWidth: 2, borderTopLeftRadius: 6 };
  if (c === 'tr') return { ...base, top: m, right: m, borderTopWidth: 2, borderRightWidth: 2, borderTopRightRadius: 6 };
  if (c === 'bl') return { ...base, bottom: m, left: m, borderBottomWidth: 2, borderLeftWidth: 2, borderBottomLeftRadius: 6 };
  return { ...base, bottom: m, right: m, borderBottomWidth: 2, borderRightWidth: 2, borderBottomRightRadius: 6 };
}

export function AICameraFeed({ height = 360, label = 'Cổng chính — CAM-01' }) {
  const [streamUrl] = React.useState(`http://localhost:5000/camera/stream?deviceId=1&t=${Date.now()}`);
  return (
    <div style={{
      position: 'relative', height, borderRadius: 16, overflow: 'hidden',
      background: 'linear-gradient(180deg,#11203a 0%,#0a1426 60%,#070d18 100%)',
      border: '1px solid rgba(255,255,255,.08)',
    }}>
      <img 
        src={streamUrl} 
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0 }} 
        alt="Live Camera Stream"
        onError={(e) => {
          e.target.style.display = 'none';
          e.target.nextSibling.style.display = 'block';
        }}
      />
      <div style={{
        position: 'absolute', inset: 0, display: 'none', zIndex: 0,
        backgroundImage: 'linear-gradient(rgba(34,211,238,.08) 1px,transparent 1px),linear-gradient(90deg,rgba(34,211,238,.08) 1px,transparent 1px)',
        backgroundSize: '46px 46px',
        maskImage: 'linear-gradient(180deg,transparent 30%,#000 100%)',
        WebkitMaskImage: 'linear-gradient(180deg,transparent 30%,#000 100%)',
        transform: 'perspective(420px) rotateX(58deg) translateY(38%) scale(1.6)',
        transformOrigin: 'center bottom', opacity: .8,
      }} />
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(420px 240px at 65% 18%, rgba(34,211,238,.14), transparent 70%)', zIndex: 0, pointerEvents: 'none' }} />
      <div className="cam-scan" style={{
        position: 'absolute', left: 0, right: 0, top: 0, height: 2,
        background: 'linear-gradient(90deg,transparent,rgba(34,211,238,.9),transparent)',
        boxShadow: '0 0 12px rgba(34,211,238,.7)',
      }} />
      {['tl', 'tr', 'bl', 'br'].map(c => <div key={c} style={cornerStyle(c)} />)}
      <div style={{ position: 'absolute', top: 12, left: 12, right: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'rgba(226,59,84,.92)', color: '#fff', fontWeight: 800, fontSize: 11, letterSpacing: '.08em', padding: '5px 10px', borderRadius: 99 }}>
          <span style={{ width: 7, height: 7, borderRadius: 99, background: '#fff', animation: 'pulse 1.6s infinite', display: 'inline-block' }} />
          LIVE
        </div>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 11.5, color: 'rgba(255,255,255,.75)', background: 'rgba(0,0,0,.35)', padding: '4px 9px', borderRadius: 7, backdropFilter: 'blur(4px)' }}>{label}</div>
      </div>
      <div style={{ position: 'absolute', bottom: 12, left: 12, right: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'rgba(255,255,255,.82)', fontSize: 12, fontWeight: 600, background: 'rgba(0,0,0,.32)', padding: '5px 11px', borderRadius: 99, backdropFilter: 'blur(4px)' }}>
          AI Vision · 2 đối tượng
        </div>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'rgba(255,255,255,.5)' }}>30 FPS · 1080p</div>
      </div>
    </div>
  );
}
