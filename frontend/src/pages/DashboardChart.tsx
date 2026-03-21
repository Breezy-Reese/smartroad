import React, { useEffect, useRef, useState } from 'react';

type Period = 'weekly' | 'monthly' | 'yearly';

const COLORS = {
  red: '#ef4444',
  redLight: 'rgba(239,68,68,0.15)',
  redMid: 'rgba(239,68,68,0.5)',
  amber: '#f59e0b',
  green: '#22c55e',
  blue: '#3b82f6',
  gray: '#6b7280',
  gridLine: 'rgba(156,163,175,0.15)',
};

const DATA: Record<Period, { labels: string[]; incidents: number[]; resolved: number[]; avgTime: number[] }> = {
  weekly: {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    incidents: [14, 22, 18, 31, 27, 19, 12],
    resolved: [12, 20, 17, 28, 25, 18, 11],
    avgTime: [4.2, 3.8, 5.1, 3.5, 4.0, 4.8, 3.9],
  },
  monthly: {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    incidents: [310, 280, 330, 290, 360, 420, 390, 410, 370, 340, 300, 260],
    resolved: [290, 265, 315, 278, 345, 400, 372, 395, 355, 328, 285, 248],
    avgTime: [4.5, 4.1, 3.9, 4.3, 3.7, 3.4, 3.8, 3.6, 4.0, 4.2, 4.6, 5.0],
  },
  yearly: {
    labels: ['2020', '2021', '2022', '2023', '2024', '2025'],
    incidents: [2800, 3400, 4100, 5200, 6800, 8400],
    resolved: [2550, 3150, 3900, 5000, 6550, 8100],
    avgTime: [6.2, 5.8, 5.1, 4.6, 4.1, 3.7],
  },
};

const SEVERITY = [
  { label: 'Critical', value: 12, color: '#ef4444' },
  { label: 'High',     value: 28, color: '#f59e0b' },
  { label: 'Moderate', value: 41, color: '#3b82f6' },
  { label: 'Minor',    value: 19, color: '#22c55e' },
];

const ZONES = [
  { name: 'CBD',        incidents: 342, trend: +8  },
  { name: 'Westlands',  incidents: 218, trend: -3  },
  { name: 'Thika Rd',   incidents: 289, trend: +12 },
  { name: 'Mombasa Rd', incidents: 261, trend: +5  },
  { name: 'Ngong Rd',   incidents: 174, trend: -7  },
];

// ── Stable period list outside component so it never triggers key warnings ──
const PERIODS: Period[] = ['weekly', 'monthly', 'yearly'];

// ── Stable zone total outside component ──
const ZONES_TOTAL = ZONES.reduce((a, b) => a + b.incidents, 0);

/* ─── mini chart helpers ─── */
function sparkPath(data: number[], w: number, h: number): string {
  const max = Math.max(...data), min = Math.min(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * h;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return 'M' + pts.join('L');
}

function barChart(
  canvas: HTMLCanvasElement,
  labels: string[],
  incidents: number[],
  resolved: number[],
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const dpr = window.devicePixelRatio || 1;
  const W = canvas.offsetWidth, H = canvas.offsetHeight;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  ctx.scale(dpr, dpr);

  const pad = { top: 20, right: 16, bottom: 36, left: 44 };
  const cw = W - pad.left - pad.right;
  const ch = H - pad.top - pad.bottom;
  const max = Math.max(...incidents) * 1.15;
  const n = labels.length;
  const groupW = cw / n;
  const barW = Math.min(groupW * 0.32, 18);

  ctx.clearRect(0, 0, W, H);

  for (let i = 0; i <= 4; i++) {
    const y = pad.top + ch - (i / 4) * ch;
    ctx.strokeStyle = COLORS.gridLine;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(pad.left + cw, y); ctx.stroke();
    ctx.fillStyle = COLORS.gray;
    ctx.font = '10px system-ui';
    ctx.textAlign = 'right';
    ctx.fillText(Math.round((max * i) / 4).toString(), pad.left - 6, y + 3);
  }

  labels.forEach((lbl, i) => {
    const cx = pad.left + i * groupW + groupW / 2;
    const ih = (incidents[i] / max) * ch;
    const rh = (resolved[i] / max) * ch;

    ctx.fillStyle = COLORS.red;
    ctx.beginPath();
    roundRect(ctx, cx - barW - 2, pad.top + ch - ih, barW, ih, 3);
    ctx.fill();

    ctx.fillStyle = COLORS.green;
    ctx.beginPath();
    roundRect(ctx, cx + 2, pad.top + ch - rh, barW, rh, 3);
    ctx.fill();

    ctx.fillStyle = COLORS.gray;
    ctx.font = '10px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(lbl, cx, pad.top + ch + 18);
  });
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x, y + h);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function lineChart(canvas: HTMLCanvasElement, data: number[]) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const dpr = window.devicePixelRatio || 1;
  const W = canvas.offsetWidth, H = canvas.offsetHeight;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  ctx.scale(dpr, dpr);

  const pad = { top: 16, right: 16, bottom: 28, left: 40 };
  const cw = W - pad.left - pad.right;
  const ch = H - pad.top - pad.bottom;
  const max = Math.max(...data) * 1.2, min = 0;
  const range = max - min;
  const n = data.length;

  ctx.clearRect(0, 0, W, H);

  for (let i = 0; i <= 3; i++) {
    const y = pad.top + ch - (i / 3) * ch;
    ctx.strokeStyle = COLORS.gridLine;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(pad.left + cw, y); ctx.stroke();
    ctx.fillStyle = COLORS.gray;
    ctx.font = '10px system-ui';
    ctx.textAlign = 'right';
    ctx.fillText(((max * i) / 3).toFixed(1), pad.left - 6, y + 3);
  }

  const pts = data.map((v, i) => ({
    x: pad.left + (i / (n - 1)) * cw,
    y: pad.top + ch - ((v - min) / range) * ch,
  }));

  ctx.beginPath();
  ctx.moveTo(pts[0].x, pad.top + ch);
  pts.forEach(p => ctx.lineTo(p.x, p.y));
  ctx.lineTo(pts[pts.length - 1].x, pad.top + ch);
  ctx.closePath();
  const grad = ctx.createLinearGradient(0, pad.top, 0, pad.top + ch);
  grad.addColorStop(0, 'rgba(59,130,246,0.2)');
  grad.addColorStop(1, 'rgba(59,130,246,0)');
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  pts.forEach(p => ctx.lineTo(p.x, p.y));
  ctx.strokeStyle = COLORS.blue;
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  ctx.stroke();

  pts.forEach(p => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.blue;
    ctx.fill();
  });
}

function donutChart(canvas: HTMLCanvasElement, slices: { value: number; color: string }[]) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const dpr = window.devicePixelRatio || 1;
  const S = canvas.offsetWidth;
  canvas.width = S * dpr;
  canvas.height = S * dpr;
  ctx.scale(dpr, dpr);

  const cx = S / 2, cy = S / 2, ro = S / 2 - 6, ri = ro * 0.62;
  const total = slices.reduce((a, s) => a + s.value, 0);
  let angle = -Math.PI / 2;

  slices.forEach(s => {
    const sweep = (s.value / total) * 2 * Math.PI;
    ctx.beginPath();
    ctx.moveTo(cx + ro * Math.cos(angle), cy + ro * Math.sin(angle));
    ctx.arc(cx, cy, ro, angle, angle + sweep);
    ctx.arc(cx, cy, ri, angle + sweep, angle, true);
    ctx.closePath();
    ctx.fillStyle = s.color;
    ctx.fill();
    angle += sweep;
  });
}

/* ─── Main Component ─── */
const DashboardChart: React.FC = () => {
  const [period, setPeriod] = useState<Period>('monthly');
  const barRef   = useRef<HTMLCanvasElement>(null);
  const lineRef  = useRef<HTMLCanvasElement>(null);
  const donutRef = useRef<HTMLCanvasElement>(null);

  const d = DATA[period];

  useEffect(() => {
    if (barRef.current) barChart(barRef.current, d.labels, d.incidents, d.resolved);
  }, [period, d]);

  useEffect(() => {
    if (lineRef.current) lineChart(lineRef.current, d.avgTime);
  }, [period, d]);

  useEffect(() => {
    if (donutRef.current) donutChart(donutRef.current, SEVERITY);
  }, []);

  const totalIncidents = d.incidents.reduce((a, b) => a + b, 0);
  const totalResolved  = d.resolved.reduce((a, b) => a + b, 0);
  const resolutionRate = Math.round((totalResolved / totalIncidents) * 100);
  const avgResponse    = (d.avgTime.reduce((a, b) => a + b, 0) / d.avgTime.length).toFixed(1);

  // ── Defined inside component so it has access to computed values,
  //    but label keys are stable strings so React won't warn ──
  const kpiCards = [
    { label: 'Total Incidents',    value: totalIncidents.toLocaleString(), color: COLORS.red,   spark: d.incidents },
    { label: 'Resolved',           value: totalResolved.toLocaleString(),  color: COLORS.green, spark: d.resolved  },
    { label: 'Resolution Rate',    value: resolutionRate + '%',            color: COLORS.blue,  spark: d.resolved.map((v, i) => Math.round((v / d.incidents[i]) * 100)) },
    { label: 'Avg Response (min)', value: avgResponse + ' min',            color: COLORS.amber, spark: d.avgTime   },
  ];

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', color: '#111', background: '#f9fafb', minHeight: '100vh', padding: '24px' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: '#111' }}>Emergency Response Dashboard</h1>
          <p style={{ fontSize: 13, color: '#6b7280', margin: '4px 0 0' }}>Nairobi &amp; surroundings · Live analytics</p>
        </div>

        {/* Period selector — uses stable PERIODS constant */}
        <div style={{ display: 'flex', gap: 4, background: '#e5e7eb', borderRadius: 8, padding: 3 }}>
          {PERIODS.map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              style={{
                padding: '5px 14px', fontSize: 12, fontWeight: 600,
                borderRadius: 6, border: 'none', cursor: 'pointer',
                background: period === p ? '#fff' : 'transparent',
                color: period === p ? '#111' : '#6b7280',
                boxShadow: period === p ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                textTransform: 'capitalize',
              }}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* ── KPI Cards — uses stable label keys ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
        {kpiCards.map(card => (
          <div key={card.label} style={{ background: '#fff', borderRadius: 12, padding: '14px 16px', border: '1px solid #e5e7eb', position: 'relative', overflow: 'hidden' }}>
            <p style={{ fontSize: 11, color: '#6b7280', margin: '0 0 6px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em' }}>{card.label}</p>
            <p style={{ fontSize: 24, fontWeight: 800, margin: 0, color: '#111' }}>{card.value}</p>
            <svg style={{ position: 'absolute', bottom: 0, right: 0, opacity: 0.5 }} width="80" height="36" viewBox="0 0 80 36">
              <path d={sparkPath(card.spark, 80, 32)} fill="none" stroke={card.color} strokeWidth="1.5" />
            </svg>
          </div>
        ))}
      </div>

      {/* ── Main Charts Row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16, marginBottom: 16 }}>
        <div style={{ background: '#fff', borderRadius: 12, padding: '18px 20px', border: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <h2 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>Incidents vs Resolved</h2>
              <p style={{ fontSize: 12, color: '#6b7280', margin: '2px 0 0' }}>Side-by-side comparison</p>
            </div>
            <div style={{ display: 'flex', gap: 14, fontSize: 11, color: '#6b7280', fontWeight: 600 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: COLORS.red, display: 'inline-block' }} />
                Incidents
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: COLORS.green, display: 'inline-block' }} />
                Resolved
              </span>
            </div>
          </div>
          <div style={{ position: 'relative', height: 220 }}>
            {/* key prop prevents React from confusing canvas refs on re-render */}
            <canvas key="bar-chart" ref={barRef} style={{ width: '100%', height: '100%' }} />
          </div>
        </div>
      </div>

      {/* ── Second Row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, marginBottom: 16 }}>

        {/* Line chart */}
        <div style={{ background: '#fff', borderRadius: 12, padding: '18px 20px', border: '1px solid #e5e7eb' }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 4px' }}>Avg Response Time</h2>
          <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 14px' }}>Minutes from detection to dispatch</p>
          <div style={{ position: 'relative', height: 180 }}>
            <canvas key="line-chart" ref={lineRef} style={{ width: '100%', height: '100%' }} />
          </div>
        </div>

        {/* Donut + legend */}
        <div style={{ background: '#fff', borderRadius: 12, padding: '18px 20px', border: '1px solid #e5e7eb' }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 4px' }}>Severity Breakdown</h2>
          <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 14px' }}>Incident classification</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{ flexShrink: 0, width: 120, height: 120 }}>
              <canvas key="donut-chart" ref={donutRef} style={{ width: 120, height: 120 }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
              {SEVERITY.map(s => (
                <div key={s.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                    <span style={{ color: '#374151' }}>{s.label}</span>
                  </span>
                  <span style={{ fontWeight: 700, color: '#111' }}>{s.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Zone Table ── */}
      <div style={{ background: '#fff', borderRadius: 12, padding: '18px 20px', border: '1px solid #e5e7eb' }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 14px' }}>Incidents by Zone</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
              {['Zone', 'Incidents', 'Share', 'Trend'].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '6px 10px', color: '#6b7280', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '.04em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ZONES.map((z, i) => {
              const share = Math.round((z.incidents / ZONES_TOTAL) * 100);
              return (
                <tr key={z.name} style={{ borderBottom: i < ZONES.length - 1 ? '1px solid #f9fafb' : 'none' }}>
                  <td style={{ padding: '10px 10px', fontWeight: 600, color: '#111' }}>{z.name}</td>
                  <td style={{ padding: '10px 10px', color: '#374151' }}>{z.incidents}</td>
                  <td style={{ padding: '10px 10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ flex: 1, height: 5, background: '#f3f4f6', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ width: share + '%', height: '100%', background: COLORS.red, borderRadius: 3 }} />
                      </div>
                      <span style={{ fontSize: 11, color: '#6b7280', minWidth: 28 }}>{share}%</span>
                    </div>
                  </td>
                  <td style={{ padding: '10px 10px' }}>
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                      background: z.trend > 0 ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)',
                      color: z.trend > 0 ? COLORS.red : COLORS.green,
                    }}>
                      {z.trend > 0 ? '▲' : '▼'} {Math.abs(z.trend)}%
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

    </div>
  );
};

export default DashboardChart;
