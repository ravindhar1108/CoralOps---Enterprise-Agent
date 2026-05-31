"use client";

import { useEffect, useState, useRef } from "react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import {
  Bug, ShieldAlert, Wind, Percent, GitBranch,
  AlertCircle, RefreshCw, CheckCircle2, XCircle,
  Circle, Activity, Layers, TrendingUp, TrendingDown, Zap
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ── Helpers ──────────────────────────────────────────────────────────────────
const BASE = `${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8080"}/api/investigate`;
const REPO = "demo-project";

function parseResponse(text: string): any[] {
  try {
    if (text.includes("```json")) {
      return JSON.parse(text.split("```json")[1].split("```")[0].trim());
    }
    // Try direct JSON array
    const t = text.trim();
    if (t.startsWith("[")) return JSON.parse(t);
    // Try extracting embedded array
    const s = t.indexOf("["), e = t.lastIndexOf("]");
    if (s >= 0 && e > s) return JSON.parse(t.slice(s, e + 1));
  } catch {}
  return [];
}

async function fetchRaw(query: string): Promise<any[]> {
  try {
    const r = await fetch(`${BASE}?repoName=${REPO}&query=${encodeURIComponent(query)}&raw=true`);
    return parseResponse(await r.text());
  } catch { return []; }
}

// ── Design tokens matching #050505 site ──────────────────────────────────────
const card = "bg-[#0f0f0f] border border-[#1f1f1f] rounded-xl";
const cardHover = "hover:border-indigo-500/20 transition-colors";
const label = "text-[10px] font-medium text-neutral-500 uppercase tracking-widest";

// Chart colors matching indigo/violet site palette
const CHART = {
  indigo:  "#6366f1",
  violet:  "#8b5cf6",
  cyan:    "#22d3ee",
  emerald: "#10b981",
  amber:   "#f59e0b",
  rose:    "#f43f5e",
  pink:    "#ec4899",
};

const SEV_COLOR: Record<string, string> = {
  BLOCKER:  CHART.rose,
  CRITICAL: CHART.amber,
  MAJOR:    CHART.violet,
  MINOR:    CHART.cyan,
  INFO:     CHART.indigo,
};
const LEVEL_COLOR: Record<string, string> = {
  error:   CHART.rose,
  warning: CHART.amber,
  info:    CHART.cyan,
  debug:   CHART.indigo,
};
const PRIORITY_COLOR: Record<string, string> = {
  urgent: CHART.rose,
  high:   CHART.amber,
  medium: CHART.violet,
  normal: CHART.indigo,
  low:    "#4b5563",
  no_priority: "#374151",
};

// ── Animated Number ───────────────────────────────────────────────────────────
function AnimNum({ value, suffix = "" }: { value: number | string; suffix?: string }) {
  const [display, setDisplay] = useState<number | string>(typeof value === 'number' ? 0 : value);
  useEffect(() => {
    if (typeof value === 'string') {
      setDisplay(value);
      return;
    }
    let start = 0;
    const end = value;
    if (end === 0) {
      setDisplay(0);
      return;
    }
    const step = Math.ceil(end / 25);
    const id = setInterval(() => {
      start = Math.min(start + step, end);
      setDisplay(start);
      if (start >= end) clearInterval(id);
    }, 30);
    return () => clearInterval(id);
  }, [value]);
  return <>{display}{suffix}</>;
}

// ── Radial Progress ───────────────────────────────────────────────────────────
function RadialRing({ pct, color, size = 80, stroke = 7 }: { pct: number; color: string; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const filled = (pct / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1f1f1f" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={stroke}
        strokeDasharray={`${filled} ${circ - filled}`}
        strokeLinecap="round"
        style={{ transition: "stroke-dasharray 1.2s ease" }}
      />
    </svg>
  );
}

// ── Stat Chip ─────────────────────────────────────────────────────────────────
function Chip({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
      style={{ color, background: color + "18", border: `1px solid ${color}30` }}>
      {children}
    </span>
  );
}

// ── Custom Tooltip ────────────────────────────────────────────────────────────
const ChartTip = ({ active, payload, label: lbl }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-2 text-xs shadow-xl">
      {lbl && <div className="text-neutral-400 mb-1">{lbl}</div>}
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color || p.fill }} />
          <span className="text-neutral-300">{p.name || p.dataKey}: <strong style={{ color: p.color || p.fill }}>{p.value}</strong></span>
        </div>
      ))}
    </div>
  );
};

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [metrics, setMetrics]   = useState<any[]>([]);
  const [sonarIs, setSonarIs]   = useState<any[]>([]);
  const [sentry, setSentry]     = useState<any[]>([]);
  const [linear, setLinear]     = useState<any[]>([]);
  const [github, setGithub]     = useState<any[]>([]);
  const [githubPulls, setGithubPulls] = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [ts, setTs]             = useState<string>("");

  async function load() {
    setLoading(true);
    const [m, si, se, li, gh, ghp] = await Promise.all([
      fetchRaw("quality"),
      fetchRaw("list the bugs"),
      fetchRaw("sentry"),
      fetchRaw("linear"),
      fetchRaw("github"),
      fetchRaw("github pulls"),
    ]);
    setMetrics(m); setSonarIs(si); setSentry(se); setLinear(li); setGithub(gh); setGithubPulls(ghp);
    setTs(new Date().toLocaleTimeString());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  // ── Derived ────────────────────────────────────────────────────────────────
  const gm = (k: string) => {
    const f = metrics.find((m) => m.metric === k);
    return f ? (f.value ?? "0") : "0";
  };
  const bugs    = parseInt(gm("bugs"))            || 0;
  const vulns   = parseInt(gm("vulnerabilities")) || 0;
  const smells  = parseInt(gm("code_smells"))     || 0;
  const cov     = parseFloat(gm("coverage"))      || 0;

  // Severity distribution
  const sevMap: Record<string, number> = {};
  sonarIs.forEach((i) => { const s = (i.severity||"UNKNOWN").toUpperCase(); sevMap[s] = (sevMap[s]||0)+1; });
  const sevData = Object.entries(sevMap).map(([name, count]) => ({ name, count, fill: SEV_COLOR[name]||CHART.indigo }));

  // Issue type donut
  const typeDonut = [
    { name: "Bugs",   value: bugs,   fill: CHART.rose   },
    { name: "Vulns",  value: vulns,  fill: CHART.amber  },
    { name: "Smells", value: smells, fill: CHART.violet },
  ].filter(d => d.value > 0);

  // Linear priority chart
  const prioMap: Record<string, number> = {};
  linear.forEach((i) => { const p = String(i.priority || "normal").toLowerCase().replace(" ", "_"); prioMap[p] = (prioMap[p] || 0) + 1; });
  const prioData = Object.entries(prioMap).map(([name, count]) => ({ name, count, fill: PRIORITY_COLOR[name] || CHART.indigo }));

  // Sentry level
  const lvlMap: Record<string, number> = {};
  sentry.forEach((i) => { const l = (i.level||"error").toLowerCase(); lvlMap[l] = (lvlMap[l]||0)+1; });
  const lvlData = Object.entries(lvlMap).map(([name, count]) => ({ name, count, fill: LEVEL_COLOR[name]||CHART.indigo }));

  // GitHub open/closed
  const allGithubItems = [
    ...(Array.isArray(github) ? github : []).map((i) => ({ ...i, isPR: false })),
    ...(Array.isArray(githubPulls) ? githubPulls : []).map((p) => ({ ...p, isPR: true }))
  ].sort((a, b) => parseInt(b.number) - parseInt(a.number));

  const ghOpen   = allGithubItems.filter(i => i.state === "open" || i.state === "OPEN").length;
  const ghClosed = allGithubItems.filter(i => i.state === "closed" || i.state === "CLOSED").length;
  const ghDonut  = [
    { name: "Open",   value: ghOpen,   fill: CHART.emerald },
    { name: "Closed", value: ghClosed, fill: "#2a2a2a"     },
  ].filter(d => d.value > 0);

  // Health score
  const health = Math.max(0, 100 - bugs * 5 - vulns * 8 - Math.min(smells, 20) + cov * 0.3);
  const hColor = health > 70 ? CHART.emerald : health > 40 ? CHART.amber : CHART.rose;

  // New KPIs
  const alertStatus = gm("alert_status") || "—";
  const gateColor = alertStatus === "OK" ? CHART.emerald : alertStatus === "ERROR" ? CHART.rose : CHART.amber;
  const openIssues = parseInt(gm("violations")) || (bugs + vulns + smells);
  const hotspots = parseInt(gm("security_hotspots")) || 0;
  
  const relRatingNum = parseFloat(gm("reliability_rating")) || 0;
  const sqaleRatingNum = parseFloat(gm("sqale_rating")) || 0;

  const ratingGrade = (val: number) => {
    switch (Math.round(val)) {
      case 1: return "A";
      case 2: return "B";
      case 3: return "C";
      case 4: return "D";
      case 5: return "E";
      default: return "—";
    }
  };
  const ratingColor = (val: number) => {
    switch (Math.round(val)) {
      case 1: return CHART.emerald;
      case 2: return CHART.cyan;
      case 3: return CHART.amber;
      case 4: return CHART.rose;
      case 5: return CHART.rose;
      default: return CHART.indigo;
    }
  };

  const kpis = [
    { label: "Quality Gate",   value: alertStatus,            icon: ShieldAlert, color: gateColor, pct: null },
    { label: "Reliability",    value: ratingGrade(relRatingNum), icon: Activity, color: ratingColor(relRatingNum), pct: null },
    { label: "Maintainability",value: ratingGrade(sqaleRatingNum), icon: Wind, color: ratingColor(sqaleRatingNum), pct: null },
    { label: "Open Issues",    value: openIssues,             icon: Layers,      color: CHART.indigo, pct: null },
    { label: "Security Hotspots", value: hotspots,            icon: Zap,         color: CHART.rose, pct: null },
    { label: "Bugs",           value: bugs,                   icon: Bug,         color: CHART.rose,    pct: null },
    { label: "Vulnerabilities",value: vulns,                  icon: ShieldAlert,  color: CHART.amber,   pct: null },
    { label: "Code Smells",    value: smells,                 icon: Wind,         color: CHART.violet,  pct: null },
    { label: "Coverage",       value: cov,   suffix: "%",     icon: Percent,      color: CHART.emerald, pct: cov  },
    { label: "Sentry Errors",  value: sentry.length,          icon: Zap,          color: CHART.amber,   pct: null },
    { label: "Linear Tasks",   value: linear.length,          icon: Layers,       color: CHART.indigo,  pct: null },
    { label: "GitHub Issues",  value: github.length,          icon: GitBranch,    color: CHART.cyan,    pct: null },
    { label: "Health Score",   value: Math.round(health),suffix:"%", icon: Activity, color: hColor, pct: health },
  ];

  const fade = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };
  const stagger = { show: { transition: { staggerChildren: 0.05 } } };

  return (
    <div className="flex-1 bg-[#050505] text-neutral-300 overflow-y-auto">
      <div className="px-6 py-5 max-w-[1600px] mx-auto space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-sm font-semibold text-white tracking-tight flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-400" />
              Enterprise Intelligence
            </h1>
            <p className="text-[10px] text-neutral-600 mt-0.5">
              SonarQube · Linear · Sentry · GitHub
              {ts && <> · <span className="text-indigo-500/60">Updated {ts}</span></>}
            </p>
          </div>
          <button onClick={load} disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/20 text-indigo-400 text-xs rounded-lg transition-all disabled:opacity-50">
            <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-[70vh]">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin" />
              <p className="text-xs text-neutral-600 animate-pulse">Fetching federated data…</p>
            </div>
          </div>
        ) : (
          <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-4">

            {/* ── Row 1: KPI Cards ──────────────────────────────────────── */}
            <motion.div variants={fade} className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
              {kpis.map(({ label: lbl, value, suffix = "", icon: Icon, color, pct }, i) => (
                <div key={i} className={`${card} ${cardHover} p-3 flex flex-col gap-2 relative overflow-hidden`}>
                  <div className="flex items-center justify-between">
                    <span className={label}>{lbl}</span>
                    <Icon className="w-3 h-3 flex-shrink-0" style={{ color }} />
                  </div>
                  {pct !== null ? (
                    <div className="flex items-center gap-2">
                      <RadialRing pct={pct} color={color} size={44} stroke={5} />
                      <span className="text-sm font-bold text-white"><AnimNum value={value} suffix={suffix} /></span>
                    </div>
                  ) : (
                    <span className="text-xl font-bold" style={{ color }}>
                      <AnimNum value={value} suffix={suffix} />
                    </span>
                  )}
                </div>
              ))}
            </motion.div>

            {/* ── Row 2: Charts ─────────────────────────────────────────── */}
            <motion.div variants={fade} className="grid grid-cols-12 gap-4">

              {/* Severity Bar */}
              <div className={`col-span-12 md:col-span-5 ${card} p-4`}>
                <div className={`${label} mb-3 flex items-center gap-1.5`}>
                  <Bug className="w-3 h-3 text-rose-500" /> SonarQube Issue Severity
                  <span className="ml-auto text-neutral-600">{sonarIs.length} issues</span>
                </div>
                {sevData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={sevData} barSize={22} margin={{ top: 2, right: 4, left: -28, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="2 4" stroke="#1a1a1a" vertical={false} />
                      <XAxis dataKey="name" tick={{ fill: "#555", fontSize: 9 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: "#555", fontSize: 9 }} axisLine={false} tickLine={false} />
                      <Tooltip content={<ChartTip />} />
                      <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                        {sevData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[160px] flex items-center justify-center text-neutral-700 text-xs">No issue data</div>
                )}
              </div>

              {/* Issue Type Donut */}
              <div className={`col-span-12 sm:col-span-6 md:col-span-3 ${card} p-4 flex flex-col`}>
                <div className={`${label} mb-3 flex items-center gap-1.5`}>
                  <Layers className="w-3 h-3 text-violet-500" /> Issue Types
                </div>
                {typeDonut.length > 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center">
                    <ResponsiveContainer width="100%" height={140}>
                      <PieChart>
                        <Pie data={typeDonut} cx="50%" cy="50%" innerRadius={38} outerRadius={58}
                          dataKey="value" startAngle={90} endAngle={-270}>
                          {typeDonut.map((e, i) => <Cell key={i} fill={e.fill} />)}
                        </Pie>
                        <Tooltip content={<ChartTip />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex gap-3 flex-wrap justify-center">
                      {typeDonut.map(d => (
                        <div key={d.name} className="flex items-center gap-1 text-[10px] text-neutral-500">
                          <span className="w-2 h-2 rounded-sm" style={{ background: d.fill }} />
                          {d.name}: <span className="text-neutral-300 font-semibold">{d.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : <div className="flex-1 flex items-center justify-center text-neutral-700 text-xs">No data</div>}
              </div>

              {/* GitHub Issues Donut */}
              <div className={`col-span-12 sm:col-span-6 md:col-span-2 ${card} p-4 flex flex-col`}>
                <div className={`${label} mb-3 flex items-center gap-1.5`}>
                  <GitBranch className="w-3 h-3 text-cyan-500" /> GitHub
                </div>
                {ghDonut.filter(d => d.value > 0).length > 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center gap-2">
                    <ResponsiveContainer width="100%" height={110}>
                      <PieChart>
                        <Pie data={ghDonut} cx="50%" cy="50%" innerRadius={28} outerRadius={44} dataKey="value">
                          {ghDonut.map((e, i) => <Cell key={i} fill={e.fill} />)}
                        </Pie>
                        <Tooltip content={<ChartTip />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex gap-3">
                      <div className="text-center">
                        <div className="text-base font-bold text-emerald-400">{ghOpen}</div>
                        <div className="text-[9px] text-neutral-600">Open</div>
                      </div>
                      <div className="text-center">
                        <div className="text-base font-bold text-neutral-500">{ghClosed}</div>
                        <div className="text-[9px] text-neutral-600">Closed</div>
                      </div>
                    </div>
                  </div>
                ) : <div className="flex-1 flex items-center justify-center text-neutral-700 text-xs">No data</div>}
              </div>

              {/* Linear Priority Bar */}
              <div className={`col-span-12 md:col-span-2 ${card} p-4`}>
                <div className={`${label} mb-3 flex items-center gap-1.5`}>
                  <Layers className="w-3 h-3 text-indigo-500" /> Linear Priority
                </div>
                {prioData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={prioData} layout="vertical" barSize={12} margin={{ top: 0, right: 4, left: 0, bottom: 0 }}>
                      <XAxis type="number" tick={{ fill: "#555", fontSize: 9 }} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="name" tick={{ fill: "#666", fontSize: 9 }} axisLine={false} tickLine={false} width={44} />
                      <Tooltip content={<ChartTip />} />
                      <Bar dataKey="count" radius={[0, 3, 3, 0]}>
                        {prioData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : <div className="h-[160px] flex items-center justify-center text-neutral-700 text-xs">No data</div>}
              </div>

            </motion.div>

            {/* ── Row 3: Live Data Tables ───────────────────────────────── */}
            <motion.div variants={fade} className="grid grid-cols-12 gap-4">

              {/* Linear Tasks */}
              <div className={`col-span-12 md:col-span-4 ${card} p-4`}>
                <div className={`${label} mb-3 flex items-center gap-1.5`}>
                  <CheckCircle2 className="w-3 h-3 text-indigo-400" /> Linear Tasks
                  <Chip color={CHART.indigo}>{linear.length}</Chip>
                </div>
                <div className="space-y-1.5 max-h-[280px] overflow-y-auto scrollbar-thin">
                  {linear.length > 0 ? linear.map((t, i) => {
                    const pk = String(t.priority || "normal").toLowerCase().replace(" ", "_");
                    const pc = PRIORITY_COLOR[pk] || CHART.indigo;
                    return (
                      <motion.div key={i} whileHover={{ x: 2 }}
                        className="flex items-start gap-2 p-2 bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg hover:border-indigo-500/20 transition-colors">
                        <span className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: pc }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-neutral-200 truncate">{t.title}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {t.assignee && <span className="text-[9px] text-neutral-600">@{t.assignee}</span>}
                            <span className="text-[9px] text-neutral-500 capitalize">{t.status || t.state || "Todo"}</span>
                          </div>
                        </div>
                        <span className="text-[9px] capitalize font-medium flex-shrink-0" style={{ color: pc }}>
                          {String(t.priority || "normal").toLowerCase()}
                        </span>
                      </motion.div>
                    );
                  }) : (
                    <div className="py-10 text-center text-neutral-700 text-xs">No Linear tasks found</div>
                  )}
                </div>
              </div>

              {/* Sentry Errors */}
              <div className={`col-span-12 md:col-span-4 ${card} p-4`}>
                <div className={`${label} mb-3 flex items-center gap-1.5`}>
                  <Zap className="w-3 h-3 text-amber-400" /> Sentry Errors
                  <Chip color={CHART.amber}>{sentry.length}</Chip>
                </div>
                <div className="space-y-1.5 max-h-[280px] overflow-y-auto">
                  {sentry.length > 0 ? sentry.map((s, i) => {
                    const lv = (s.level || "error").toLowerCase();
                    const lc = LEVEL_COLOR[lv] || CHART.rose;
                    return (
                      <motion.div key={i} whileHover={{ x: 2 }}
                        className="flex items-start gap-2 p-2 bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg hover:border-amber-500/20 transition-colors">
                        <AlertCircle className="w-3 h-3 flex-shrink-0 mt-0.5" style={{ color: lc }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-neutral-200 truncate">{s.title}</p>
                          {s.culprit && <p className="text-[9px] text-neutral-600 font-mono truncate mt-0.5">{s.culprit}</p>}
                        </div>
                        <Chip color={lc}>{lv}</Chip>
                      </motion.div>
                    );
                  }) : (
                    <div className="py-10 text-center text-neutral-700 text-xs">No Sentry errors found</div>
                  )}
                </div>
              </div>

              {/* GitHub Activity */}
              <div className={`col-span-12 md:col-span-4 ${card} p-4`}>
                <div className={`${label} mb-3 flex items-center gap-1.5`}>
                  <GitBranch className="w-3 h-3 text-cyan-400" /> GitHub Activity
                  <Chip color={CHART.cyan}>{allGithubItems.length}</Chip>
                </div>
                <div className="space-y-1.5 max-h-[280px] overflow-y-auto">
                  {allGithubItems.length > 0 ? allGithubItems.map((g, i) => {
                    const open = String(g.state).toLowerCase() === "open";
                    return (
                      <motion.div key={i} whileHover={{ x: 2 }}
                        className="flex items-start gap-2 p-2 bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg hover:border-cyan-500/20 transition-colors">
                        {open
                          ? <Circle className="w-3 h-3 text-emerald-400 flex-shrink-0 mt-0.5" />
                          : <XCircle className="w-3 h-3 text-neutral-600 flex-shrink-0 mt-0.5" />
                        }
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-neutral-200 truncate">{g.title}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className={`text-[8px] font-bold px-1 rounded-sm ${g.isPR ? 'bg-indigo-500/20 text-indigo-400' : 'bg-neutral-800 text-neutral-400'}`}>
                              {g.isPR ? "PR" : "ISSUE"}
                            </span>
                            {g.number && <span className="text-[9px] text-neutral-600">#{g.number}</span>}
                            {g.author && <span className="text-[9px] text-neutral-600">@{g.author}</span>}
                          </div>
                        </div>
                        <Chip color={open ? CHART.emerald : "#4b5563"}>{String(g.state).toLowerCase()}</Chip>
                      </motion.div>
                    );
                  }) : (
                    <div className="py-10 text-center text-neutral-700 text-xs">No GitHub activity found</div>
                  )}
                </div>
              </div>

            </motion.div>

            {/* ── Row 4: SonarQube Detail Table ─────────────────────────── */}
            {sonarIs.length > 0 && (
              <motion.div variants={fade} className={`${card} p-4`}>
                <div className={`${label} mb-3 flex items-center gap-1.5`}>
                  <Bug className="w-3 h-3 text-rose-500" /> SonarQube Issues — Detail
                  <Chip color={CHART.rose}>{sonarIs.length}</Chip>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-[#1a1a1a]">
                        {["Message", "Type", "Severity", "Rule"].map(h => (
                          <th key={h} className="pb-2 text-left text-[10px] text-neutral-600 font-medium uppercase tracking-wider first:pl-1">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sonarIs.map((is, i) => {
                        const sev = (is.severity || "UNKNOWN").toUpperCase();
                        const sc = SEV_COLOR[sev] || "#555";
                        return (
                          <tr key={i} className="border-b border-[#111] hover:bg-[#0a0a0a] transition-colors">
                            <td className="py-2 pl-1 text-neutral-300 max-w-[300px] truncate">{is.message || "—"}</td>
                            <td className="py-2">
                              <Chip color={CHART.indigo}>{is.type || "?"}</Chip>
                            </td>
                            <td className="py-2">
                              <Chip color={sc}>{sev}</Chip>
                            </td>
                            <td className="py-2 text-[10px] text-neutral-600 font-mono">{is.rule || "—"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {/* ── Row 5: Sentry Level Breakdown ─────────────────────────── */}
            {lvlData.length > 0 && (
              <motion.div variants={fade} className={`${card} p-4`}>
                <div className={`${label} mb-3 flex items-center gap-1.5`}>
                  <Activity className="w-3 h-3 text-amber-400" /> Sentry Error Level Distribution
                </div>
                <ResponsiveContainer width="100%" height={80}>
                  <BarChart data={lvlData} barSize={36} margin={{ top: 0, right: 4, left: -28, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="2 4" stroke="#1a1a1a" vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: "#555", fontSize: 9 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "#555", fontSize: 9 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTip />} />
                    <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                      {lvlData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </motion.div>
            )}

          </motion.div>
        )}
      </div>
    </div>
  );
}
