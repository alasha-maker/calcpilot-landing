import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import './landing-new.css';

const supabase = createClient(
  "https://tmzxuffhdmvfkahxgcfp.supabase.co",
  "sb_publishable_nHuUFXZtEu7VAQOogIICVw_0hbtCwIp"
);

/* ── Auto-cable demo data ── */
const AC_INITIAL = [
  { load: 'LIGHT-01', cable: '2.5mm²', vd: '3.3%', vdClass: 'text-red-400',    status: 'fail' },
  { load: 'LIGHT-02', cable: '2.5mm²', vd: '4.5%', vdClass: 'text-red-400',    status: 'fail' },
  { load: 'AC-1',     cable: '10mm²',  vd: '1.0%', vdClass: 'text-amber-300',  status: 'warn' },
  { load: 'AC-2',     cable: '10mm²',  vd: '1.5%', vdClass: 'text-amber-300',  status: 'warn' },
];
const AC_FIXED = [
  { load: 'LIGHT-01', cable: '4mm²',  vd: '2.1%', vdClass: 'text-emerald-300', status: 'pass' },
  { load: 'LIGHT-02', cable: '6mm²',  vd: '2.0%', vdClass: 'text-emerald-300', status: 'pass' },
  { load: 'AC-1',     cable: '16mm²', vd: '0.7%', vdClass: 'text-emerald-300', status: 'pass' },
  { load: 'AC-2',     cable: '16mm²', vd: '0.9%', vdClass: 'text-emerald-300', status: 'pass' },
];

/* ── Standards mode data ── */
const MODE_DATA = {
  kahramaa: { method: 'T10 lookup · mV/A/m',      derate: 'Cg=0.80 · Cd=0.94',          seg: '2.1%', cum: '0.9%', segC: 'text-emerald-300', cumC: 'text-emerald-300', label: 'KAHRAMAA', pillClass: 'pill pill-info' },
  iec:      { method: 'Resistivity ρ · IEC 60364', derate: 'Cg=0.80 · Cd=0.94 · Ka=0.96', seg: '2.3%', cum: '1.0%', segC: 'text-emerald-300', cumC: 'text-emerald-300', label: 'IEC 60364', pillClass: 'pill pill-magenta' },
  custom:   { method: 'Manufacturer datasheet',    derate: 'Per row override',             seg: '1.9%', cum: '0.8%', segC: 'text-emerald-300', cumC: 'text-emerald-300', label: 'CUSTOM',    pillClass: 'pill pill-warn' },
};

function StatusPill({ status }) {
  if (status === 'pass') return <span className="pill pill-pass">PASS</span>;
  if (status === 'warn') return <span className="pill pill-warn">WARN</span>;
  return <span className="pill pill-fail">FAIL</span>;
}

export default function CalcPilotLandingPage() {
  const [acFixed, setAcFixed] = useState(false);
  const [mode, setMode]       = useState('kahramaa');
  const [loggedInEmail, setLoggedInEmail] = useState(null);
  const rows = acFixed ? AC_FIXED : AC_INITIAL;
  const m    = MODE_DATA[mode];

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.email) setLoggedInEmail(session.user.email);
    });
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setLoggedInEmail(null);
  };

  return (
    <div style={{ background: '#06080b', color: '#e6e7e9', fontFamily: '"Inter Tight", system-ui, sans-serif', WebkitFontSmoothing: 'antialiased', minHeight: '100vh' }}>

      {/* ── TOP STRIP ── */}
      <div className="border-b rule" style={{ background: '#020409' }}>
        <div className="wrap py-2 flex items-center justify-between mono text-zinc-500" style={{ fontSize: '10.5px', letterSpacing: '0.12em' }}>
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 live-dot"></span>
            <span>v2.4.1 SHIPPED · DXF IMPORT NOW MULTI-SHEET</span>
          </div>
          <div className="flex items-center gap-5">
            <span className="hidden md:inline">QATAR · UAE · SAUDI · OMAN</span>
            <a href="#changelog" className="hover:text-zinc-200">CHANGELOG ↗</a>
          </div>
        </div>
      </div>

      {/* ── NAV ── */}
      <header className="sticky top-0 z-50 border-b rule backdrop-blur-xl" style={{ background: 'rgba(6,8,11,0.85)' }}>
        <nav className="wrap flex items-center justify-between py-4">
          <Link to="/" className="flex items-center gap-3" style={{ textDecoration: 'none' }}>
            <div className="mono font-bold tracking-tight flex items-center gap-1.5" style={{ fontSize: '16px' }}>
              <span className="text-cyan-300">SLD</span><span className="text-zinc-700">·</span><span className="text-pink-400">VD</span>
            </div>
            <div className="hidden md:block h-4 w-px bg-zinc-800"></div>
            <div className="hidden md:block">
              <div className="text-sm font-semibold tracking-tight">CalcPilot</div>
              <div className="mono text-zinc-500" style={{ fontSize: '9px', letterSpacing: '0.15em' }}>EE DESIGN PLATFORM</div>
            </div>
          </Link>
          <div className="hidden lg:flex gap-7 mono text-zinc-400" style={{ fontSize: '11px', letterSpacing: '0.1em' }}>
            <a href="#features"  className="nav-link hover:text-white">FEATURES</a>
            <a href="#engine"    className="nav-link hover:text-white">CALC ENGINE</a>
            <a href="#preview"   className="nav-link hover:text-white">PREVIEW</a>
            <a href="#standards" className="nav-link hover:text-white">STANDARDS</a>
            <a href="#pricing"   className="nav-link hover:text-white">PRICING</a>
            <a href="#faq"       className="nav-link hover:text-white">FAQ</a>
          </div>
          <div className="flex items-center gap-5">
            {loggedInEmail ? (
              <>
                <span className="mono text-zinc-500 hidden sm:block" style={{ fontSize: '10px', letterSpacing: '0.08em' }}>{loggedInEmail}</span>
                <button onClick={handleSignOut}
                  className="mono text-zinc-400 hover:text-white transition-colors"
                  style={{ fontSize: '11px', letterSpacing: '0.1em', background: 'none', border: 'none', cursor: 'pointer' }}>
                  SIGN OUT
                </button>
                <Link to="/dashboard"><button className="btn-primary">DASHBOARD →</button></Link>
              </>
            ) : (
              <>
                <Link to="/login" className="mono text-zinc-400 hover:text-white" style={{ fontSize: '11px', letterSpacing: '0.1em', textDecoration: 'none' }}>LOG IN</Link>
                <Link to="/signup"><button className="btn-primary">START FREE TRIAL →</button></Link>
              </>
            )}
          </div>
        </nav>
      </header>

      {/* ── HERO ── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 gridbg opacity-70 pointer-events-none"></div>
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(126,211,247,0.10), transparent 60%)' }}></div>
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(244,114,182,0.07), transparent 60%)' }}></div>

        <div className="wrap relative pt-20 pb-28 grid lg:grid-cols-[1.05fr_1fr] gap-14 items-start">
          {/* left: copy */}
          <div>
            <div className="eyebrow"><span className="num">[01]</span>Electrical distribution design platform</div>
            <h1 className="display mt-8 text-white" style={{ fontSize: '88px' }}>
              The spreadsheet<br />
              that <em className="text-cyan-300">passes</em><br />
              Kahramaa.
            </h1>
            <p className="mt-9 text-zinc-300 max-w-[520px]" style={{ fontSize: '17px', lineHeight: '1.6' }}>
              CalcPilot replaces the Excel + AutoCAD + manual VD-table loop with one calculation engine. Build the full <span className="mono text-cyan-300">MDB → SMDB → DB → final&nbsp;load</span> tree, run T10 / T11 in real time, export a layered DXF single-line diagram ready for submission.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-6">
              {loggedInEmail ? (
                <Link to="/dashboard"><button className="btn-primary">GO TO DASHBOARD →</button></Link>
              ) : (
                <Link to="/signup"><button className="btn-primary">START FREE TRIAL →</button></Link>
              )}
              <a href="#preview" className="btn-link">WATCH 90-SEC WALKTHROUGH ↗</a>
            </div>
            <div className="mt-6 mono text-zinc-500" style={{ fontSize: '11px', letterSpacing: '0.1em' }}>
              {loggedInEmail ? `SIGNED IN AS ${loggedInEmail.toUpperCase()}` : 'NO CREDIT CARD · SAMPLE PROJECT PRE-LOADED · CANCEL ANYTIME'}
            </div>

            {/* live KPI strip */}
            <div className="mt-14">
              <div className="mono flex items-center gap-2 text-zinc-500" style={{ fontSize: '10px', letterSpacing: '0.18em' }}>
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 live-dot"></span>
                LIVE · BUILDING_LV_DISTRIBUTION.JSON
              </div>
              <div className="mt-3 grid grid-cols-4 border rule">
                <div className="px-4 py-3 border-r rule">
                  <div className="mono text-zinc-500" style={{ fontSize: '10px', letterSpacing: '0.1em' }}>LOADS</div>
                  <div className="mono font-bold text-white leading-none mt-1.5" style={{ fontSize: '28px' }}>15</div>
                </div>
                <div className="px-4 py-3 border-r rule">
                  <div className="mono text-zinc-500" style={{ fontSize: '10px', letterSpacing: '0.1em' }}>PANELS</div>
                  <div className="mono font-bold text-white leading-none mt-1.5" style={{ fontSize: '28px' }}>6</div>
                </div>
                <div className="px-4 py-3 border-r rule">
                  <div className="mono text-zinc-500" style={{ fontSize: '10px', letterSpacing: '0.1em' }}>MAX VD</div>
                  <div className="mono font-bold text-cyan-300 leading-none mt-1.5" style={{ fontSize: '28px' }}>4.49%</div>
                </div>
                <div className="px-4 py-3">
                  <div className="mono text-zinc-500" style={{ fontSize: '10px', letterSpacing: '0.1em' }}>STATUS</div>
                  <div className="mono font-bold text-emerald-400 leading-none mt-2.5" style={{ fontSize: '16px' }}>● PASS</div>
                </div>
              </div>
            </div>
          </div>

          {/* right: product window */}
          <div className="relative">
            <div className="surface-deep shadow-2xl overflow-hidden">
              <div className="winbar">
                <div className="dots"><span></span><span></span><span></span></div>
                <div className="mono text-zinc-500" style={{ fontSize: '10px', letterSpacing: '0.08em' }}>app.calcpilot · LV-1 ▸ FEEDER TREE</div>
                <div className="mono text-zinc-600 flex items-center gap-1.5" style={{ fontSize: '10px', letterSpacing: '0.08em' }}><span className="h-1.5 w-1.5 rounded-full bg-red-400 live-dot"></span>REC</div>
              </div>
              <div className="px-3 py-2.5 border-b rule grid grid-cols-5 gap-3 mono" style={{ fontSize: '10px', letterSpacing: '0.05em' }}>
                <div><span className="text-zinc-500">CALC</span> <span className="text-cyan-300">KAHRAMAA</span></div>
                <div><span className="text-zinc-500">VD%</span> <span className="text-white">1.5 / 5</span></div>
                <div><span className="text-zinc-500">COND</span> <span className="text-white">CU</span></div>
                <div><span className="text-zinc-500">INS</span> <span className="text-white">XLPE 90°C</span></div>
                <div><span className="text-zinc-500">AMB</span> <span className="text-white">40°C</span></div>
              </div>
              <div className="tree-row head">
                <div>LOAD / FEEDER TREE</div><div>TYPE</div><div>CABLE</div><div>VD%</div><div>STATUS</div>
              </div>
              <div className="tree-row warn-row"><div className="text-white">○ LV-1</div><div><span className="pill pill-info">MDB</span></div><div className="text-zinc-400">50mm²</div><div className="text-zinc-300">0.0</div><div><span className="pill pill-warn">WARN</span></div></div>
              <div className="tree-row"><div className="text-zinc-300 pl-4">├─ SMDB-1</div><div><span className="pill pill-magenta">SMDB</span></div><div className="text-zinc-400">16mm²</div><div className="text-zinc-300">0.1</div><div><span className="pill pill-pass">PASS</span></div></div>
              <div className="tree-row"><div className="text-zinc-300 pl-8">│ ├─ DB-A</div><div><span className="pill pill-warn">DB</span></div><div className="text-zinc-400">6mm²</div><div className="text-zinc-300">0.4</div><div><span className="pill pill-pass">PASS</span></div></div>
              <div className="tree-row"><div className="text-zinc-400 pl-12">│ │ ├─ POLE-01</div><div><span className="pill pill-pass">LOAD</span></div><div className="text-zinc-400">2.5mm²</div><div className="text-zinc-300">0.7</div><div><span className="pill pill-pass">PASS</span></div></div>
              <div className="tree-row"><div className="text-zinc-400 pl-12">│ │ └─ POLE-02</div><div><span className="pill pill-pass">LOAD</span></div><div className="text-zinc-400">2.5mm²</div><div className="text-zinc-300">0.8</div><div><span className="pill pill-pass">PASS</span></div></div>
              <div className="tree-row"><div className="text-zinc-300 pl-4">└─ SMDB-2</div><div><span className="pill pill-magenta">SMDB</span></div><div className="text-zinc-400">25mm²</div><div className="text-zinc-300">0.5</div><div><span className="pill pill-pass">PASS</span></div></div>
              <div className="tree-row"><div className="text-zinc-300 pl-8">&nbsp; ├─ DB-C</div><div><span className="pill pill-warn">DB</span></div><div className="text-zinc-400">16mm²</div><div className="text-zinc-300">0.6</div><div><span className="pill pill-pass">PASS</span></div></div>
              <div className="tree-row fail-row"><div className="text-zinc-300 pl-12">&nbsp; │ ├─ LIGHT-01</div><div><span className="pill pill-pass">LOAD</span></div><div className="text-zinc-400">2.5mm²</div><div className="text-red-400">3.3</div><div><span className="pill pill-fail">FAIL</span></div></div>
              <div className="tree-row fail-row" style={{ borderBottom: 0 }}><div className="text-zinc-300 pl-12">&nbsp; │ └─ LIGHT-02</div><div><span className="pill pill-pass">LOAD</span></div><div className="text-zinc-400">2.5mm²</div><div className="text-red-400">4.5</div><div><span className="pill pill-fail">FAIL</span></div></div>
              <div className="flex items-center justify-between border-t rule px-3 py-2.5" style={{ background: '#080b11' }}>
                <div className="mono text-zinc-500" style={{ fontSize: '10px', letterSpacing: '0.08em' }}>2 FAILED · AUTO-FIX AVAILABLE</div>
                <button className="mono font-bold bg-cyan-300 text-slate-950 px-3 py-1.5 hover:bg-cyan-200" style={{ fontSize: '10px', letterSpacing: '0.08em' }}>⚡ AUTO CABLE</button>
              </div>
            </div>
            <div className="mt-3 mono text-zinc-500 text-right" style={{ fontSize: '10px', letterSpacing: '0.12em' }}>FIG. 01 — LOAD MANAGER, LIVE CALCULATION</div>
          </div>
        </div>
      </section>

      {/* ── PROOF BAR ── */}
      <section className="sect-divider">
        <div className="wrap py-10">
          <div className="grid md:grid-cols-[280px_1fr] gap-10 items-center">
            <div>
              <div className="mono text-zinc-500" style={{ fontSize: '10px', letterSpacing: '0.18em' }}>TRUSTED ON LIVE PROJECTS</div>
              <div className="serif text-white mt-3" style={{ fontSize: '34px', lineHeight: 1 }}>240<span className="text-cyan-300">+</span></div>
              <div className="mono text-zinc-400 mt-1" style={{ fontSize: '11px', letterSpacing: '0.1em' }}>KAHRAMAA SUBMISSIONS · 18 CONSULTANCIES</div>
            </div>
            <div className="overflow-hidden relative" style={{ maskImage: 'linear-gradient(90deg, transparent, #000 12%, #000 88%, transparent)' }}>
              <div className="flex marquee gap-14 whitespace-nowrap items-center">
                {['ARROW CONSULT','Doha Engineering','QATARA · MEP','Al-Naseem Power','VOLT & CO.','Currents Studio','PHASE 3 GROUP','Khaleej EE',
                  'ARROW CONSULT','Doha Engineering','QATARA · MEP','Al-Naseem Power','VOLT & CO.','Currents Studio','PHASE 3 GROUP','Khaleej EE'].map((name, i) => (
                  <span key={i} className={i % 2 === 0 ? 'mono text-zinc-400' : 'serif italic text-zinc-300'} style={{ fontSize: i % 2 === 0 ? '14px' : '20px', letterSpacing: i % 2 === 0 ? '0.18em' : 0 }}>{name}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="sect-divider">
        <div className="wrap py-24">
          <div className="grid lg:grid-cols-12 gap-8 mb-16">
            <div className="lg:col-span-4">
              <div className="eyebrow"><span className="num">[02]</span>What's in the box</div>
            </div>
            <div className="lg:col-span-8">
              <h2 className="display text-white" style={{ fontSize: '64px' }}>
                Six tools that used to be<br />six different software licenses.
              </h2>
            </div>
          </div>

          <div className="space-y-6">
            {/* F.01 — VD engine */}
            <article id="engine" className="grid lg:grid-cols-[1fr_1.1fr] gap-8 border rule p-8 surface">
              <div className="flex flex-col justify-between">
                <div>
                  <div className="mono text-cyan-300" style={{ fontSize: '10px', letterSpacing: '0.18em' }}>F.01 · CALCULATION ENGINE</div>
                  <h3 className="display mt-4 text-white" style={{ fontSize: '44px' }}>Voltage drop,<br />segment &amp; cumulative.</h3>
                  <p className="mt-5 text-zinc-400 max-w-[440px]" style={{ fontSize: '15px', lineHeight: '1.65' }}>
                    Run Kahramaa T10 / T11 (PVC, XLPE) or IEC 60364 resistivity. Cumulative VD% propagates from MDB downward in real time. PASS / WARN / FAIL flips the instant you edit a length.
                  </p>
                </div>
                <div className="mt-8 flex flex-wrap gap-2">
                  <span className="pill pill-info">T10 PVC</span>
                  <span className="pill pill-info">T11 XLPE</span>
                  <span className="pill pill-info">IEC 60364</span>
                  <span className="pill pill-info">CUSTOM CABLE DATA</span>
                </div>
              </div>
              <div className="surface-deep p-5 mono">
                <div className="text-zinc-500 mb-3" style={{ letterSpacing: '0.12em', fontSize: '9.5px' }}>VD CALC · LV-1 → DB-C → LIGHT-02</div>
                <div className="grid gap-2 mb-1 text-zinc-600 pb-2 border-b rule" style={{ gridTemplateColumns: '60px 1fr 70px', fontSize: '9.5px', letterSpacing: '0.08em' }}>
                  <span>STEP</span><span>SEGMENT</span><span className="text-right">VD</span>
                </div>
                {[['SEG-1','LV-1 → SMDB-2 · 60m','0.5%','text-emerald-300'],['SEG-2','SMDB-2 → DB-C · 35m','0.1%','text-emerald-300'],['SEG-3','DB-C → LIGHT-02 · 60m','3.9%','text-amber-300']].map(([s,seg,vd,c]) => (
                  <div key={s} className="grid gap-2 py-1.5 border-b rule" style={{ gridTemplateColumns: '60px 1fr 70px', fontSize: '11px' }}>
                    <span className="text-zinc-500">{s}</span><span className="text-zinc-300">{seg}</span><span className={`${c} text-right`}>{vd}</span>
                  </div>
                ))}
                <div className="tech-line my-4"></div>
                <div className="grid gap-2 mb-1.5" style={{ gridTemplateColumns: '80px 1fr 80px', fontSize: '12px' }}><span className="text-zinc-500">CUM VD%</span><span></span><span className="text-red-400 font-bold text-right">4.5%</span></div>
                <div className="grid gap-2 mb-1.5" style={{ gridTemplateColumns: '80px 1fr 80px', fontSize: '12px' }}><span className="text-zinc-500">LIMIT</span><span></span><span className="text-zinc-300 text-right">5.0%</span></div>
                <div className="grid gap-2 mb-3"   style={{ gridTemplateColumns: '80px 1fr 80px', fontSize: '12px' }}><span className="text-zinc-500">MARGIN</span><span></span><span className="text-zinc-300 text-right">0.5%</span></div>
                <div className="flex items-center justify-between border-t rule pt-3">
                  <span className="text-zinc-500" style={{ fontSize: '10px', letterSpacing: '0.1em' }}>VERDICT</span>
                  <span className="pill pill-fail">OVER LIMIT</span>
                </div>
              </div>
            </article>

            {/* F.02 — Auto Cable (interactive) */}
            <article className="grid lg:grid-cols-[1.1fr_1fr] gap-8 border rule p-8 surface">
              <div className="surface-deep p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="mono text-zinc-500" style={{ fontSize: '9.5px', letterSpacing: '0.12em' }}>⚡ AUTO CABLE · SELECT ALL → FIX</div>
                  <button onClick={() => setAcFixed(f => !f)} className="mono font-bold bg-cyan-300 text-slate-950 px-3 py-1.5 hover:bg-cyan-200" style={{ fontSize: '10px', letterSpacing: '0.08em' }}>
                    {acFixed ? '↻ RESET' : '▶ RUN'}
                  </button>
                </div>
                <div className="mono" style={{ fontSize: '11px' }}>
                  <div className="grid gap-2 py-1.5 border-b rule text-zinc-600" style={{ gridTemplateColumns: '1fr 90px 90px 60px', fontSize: '9.5px', letterSpacing: '0.08em' }}>
                    <span>LOAD</span><span>CABLE</span><span>VD%</span><span>STATUS</span>
                  </div>
                  {rows.map(r => (
                    <div key={r.load} className="grid gap-2 py-2 border-b rule items-center" style={{ gridTemplateColumns: '1fr 90px 90px 60px', transition: 'background-color 0.4s ease', backgroundColor: acFixed ? 'rgba(126,211,247,0.04)' : '' }}>
                      <span className="text-zinc-300">{r.load}</span>
                      <span className="text-zinc-300">{r.cable}</span>
                      <span className={r.vdClass}>{r.vd}</span>
                      <span><StatusPill status={r.status} /></span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 border-t rule pt-3 mono flex items-center justify-between" style={{ fontSize: '10px', letterSpacing: '0.1em' }}>
                  {acFixed
                    ? <><span className="text-emerald-300">4 CIRCUITS · 4 PASS · 0 ISSUES</span><span className="text-zinc-600">RESIZED IN 240 ms</span></>
                    : <><span className="text-zinc-500">4 CIRCUITS · 2 FAIL · 2 WARN</span><span className="text-zinc-600">Cg=0.80 · Cd=0.94 · Ka=0.96</span></>
                  }
                </div>
              </div>
              <div className="flex flex-col justify-between">
                <div>
                  <div className="mono text-cyan-300" style={{ fontSize: '10px', letterSpacing: '0.18em' }}>F.02 · AUTOMATION</div>
                  <h3 className="display mt-4 text-white" style={{ fontSize: '44px' }}>Right-size every cable in one click.</h3>
                  <p className="mt-5 text-zinc-400 max-w-[440px]" style={{ fontSize: '15px', lineHeight: '1.65' }}>
                    Select all, hit <span className="mono text-cyan-300">⚡ AUTO CABLE</span>. The engine picks the smallest cable that satisfies cumulative VD%, ampacity with derating, and your installation method. Same loop for MCCBs.
                  </p>
                </div>
                <div className="mt-8 text-zinc-500 leading-relaxed mono" style={{ fontSize: '13px' }}>
                  <span className="text-zinc-400">→</span> Try it: hit RUN on the specimen.<br />
                  <span className="text-zinc-600">Derating: Cg · Cd · Ka applied per row.</span>
                </div>
              </div>
            </article>

            {/* F.03 — SLD / DXF */}
            <article className="grid lg:grid-cols-[1fr_1.1fr] gap-8 border rule p-8 surface">
              <div className="flex flex-col justify-between">
                <div>
                  <div className="mono text-cyan-300" style={{ fontSize: '10px', letterSpacing: '0.18em' }}>F.03 · OUTPUT</div>
                  <h3 className="display mt-4 text-white" style={{ fontSize: '44px' }}>Layered DXF,<br />ready for AutoCAD.</h3>
                  <p className="mt-5 text-zinc-400 max-w-[440px]" style={{ fontSize: '15px', lineHeight: '1.65' }}>
                    Busbars, feeders, equipment symbols, tags, and notes each ship on their own CAD layer. Open in any version of AutoCAD; toggle, recolor, plot independently. Submission-ready.
                  </p>
                </div>
                <div className="mt-8 flex flex-wrap gap-2">
                  {['L_BUSBAR','L_FEEDER','L_EQUIPMENT','L_TAG','L_NOTES'].map(l => <span key={l} className="pill pill-info">{l}</span>)}
                </div>
              </div>
              <div className="surface-deep p-5 relative overflow-hidden">
                <div className="flex items-center justify-between mb-3">
                  <div className="mono text-zinc-500" style={{ fontSize: '9.5px', letterSpacing: '0.12em' }}>SLD PREVIEW · BUILDING LV DISTRIBUTION</div>
                  <div className="mono text-zinc-600" style={{ fontSize: '9.5px', letterSpacing: '0.12em' }}>DWG-001 · REV A</div>
                </div>
                <svg viewBox="0 0 520 240" className="w-full schem" style={{ height: '220px' }}>
                  <rect x="6" y="6" width="508" height="228" fill="none" stroke="#1a1f27" strokeDasharray="3 3" />
                  <line x1="40" y1="50" x2="490" y2="50" stroke="#7ed3f7" strokeWidth="2.5" />
                  <text x="40" y="40" fill="#7ed3f7" fontFamily="JetBrains Mono" fontSize="10">LV-1 · 415V · 350A · MDB</text>
                  <g stroke="#3a4150" strokeWidth="1.2" fill="none">
                    <line x1="100" y1="50" x2="100" y2="110" /><line x1="260" y1="50" x2="260" y2="110" /><line x1="420" y1="50" x2="420" y2="110" />
                  </g>
                  <g fill="#06080b" stroke="#7ed3f7" strokeWidth="1">
                    <rect x="92" y="68" width="16" height="16" /><rect x="252" y="68" width="16" height="16" /><rect x="412" y="68" width="16" height="16" />
                  </g>
                  <g fontFamily="JetBrains Mono" fontSize="8" fill="#7ed3f7" textAnchor="middle">
                    <text x="100" y="79">50A</text><text x="260" y="79">63A</text><text x="420" y="79">125A</text>
                  </g>
                  <g fontFamily="JetBrains Mono" fontSize="9" textAnchor="middle">
                    <rect x="65" y="110" width="70" height="36" fill="#1a140a" stroke="#f5d878" /><text x="100" y="133" fill="#f5d878">SMDB-1</text>
                    <rect x="225" y="110" width="70" height="36" fill="#1a140a" stroke="#f5d878" /><text x="260" y="133" fill="#f5d878">SMDB-2</text>
                    <rect x="385" y="110" width="70" height="36" fill="#1a0a0a" stroke="#ff8a8a" /><text x="420" y="133" fill="#ff8a8a">DB-C</text>
                  </g>
                  <g stroke="#3a4150" strokeWidth="1" fill="none">
                    <path d="M 100 146 L 100 175 L 70 175 L 70 200" /><path d="M 100 175 L 130 175 L 130 200" />
                    <path d="M 260 146 L 260 200" />
                    <path d="M 420 146 L 420 175 L 385 175 L 385 200" stroke="#ff8a8a" /><path d="M 420 175 L 455 175 L 455 200" stroke="#ff8a8a" />
                  </g>
                  <g fontFamily="JetBrains Mono" fontSize="7.5" fill="#9ca3af" textAnchor="middle">
                    <circle cx="70"  cy="208" r="4" fill="#0a0d12" stroke="#7ee787" /><circle cx="130" cy="208" r="4" fill="#0a0d12" stroke="#7ee787" />
                    <circle cx="260" cy="208" r="4" fill="#0a0d12" stroke="#7ee787" />
                    <circle cx="385" cy="208" r="4" fill="#0a0d12" stroke="#ff8a8a" /><circle cx="455" cy="208" r="4" fill="#0a0d12" stroke="#ff8a8a" />
                    <text x="70" y="225">POLE-01</text><text x="130" y="225">POLE-02</text><text x="260" y="225">POLE-04</text>
                    <text x="385" y="225" fill="#ff8a8a">LIGHT-01</text><text x="455" y="225" fill="#ff8a8a">LIGHT-02</text>
                  </g>
                </svg>
                <div className="mt-2 flex justify-between mono text-zinc-600 pt-2 border-t rule" style={{ fontSize: '9px', letterSpacing: '0.12em' }}>
                  <span>SHEET 01 OF 04</span><span>SCALE NTS</span><span>EXPORT · DXF · 124 KB</span>
                </div>
              </div>
            </article>

            {/* Small features grid */}
            <div className="grid md:grid-cols-3 gap-6 mt-2">
              {[['F.04','DXF Import','Pull cable lengths from AutoCAD. Label matching maps drawing labels to your load schedule. Preview every match before applying.'],
                ['F.05','Reports & BOM','Submission-grade PDFs and an itemized bill of materials with cost breakdown by size, run length, and installation method.'],
                ['F.06','Load Manager','Inline editing, bulk operations, undo / redo, search-filter by status. Built to handle real schedules, not toy examples.']].map(([n,t,d]) => (
                <div key={n} className="border rule p-6 surface">
                  <div className="mono text-cyan-300" style={{ fontSize: '10px', letterSpacing: '0.18em' }}>{n}</div>
                  <h4 className="mt-3 text-white font-semibold tracking-tight" style={{ fontSize: '20px' }}>{t}</h4>
                  <p className="mt-3 text-zinc-400" style={{ fontSize: '13.5px', lineHeight: '1.6' }}>{d}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── PREVIEW ── */}
      <section id="preview" className="sect-divider">
        <div className="wrap py-24">
          <div className="grid lg:grid-cols-12 gap-8 mb-12">
            <div className="lg:col-span-4">
              <div className="eyebrow"><span className="num">[03]</span>The actual interface</div>
            </div>
            <div className="lg:col-span-8">
              <h2 className="display text-white" style={{ fontSize: '64px' }}>
                Your full distribution network,<br /><em className="text-cyan-300">calculated</em> in one view.
              </h2>
              <p className="mt-6 text-zinc-400 max-w-[640px]" style={{ fontSize: '15px', lineHeight: '1.65' }}>
                Real-time voltage drop calculation across the entire hierarchy — from MDB down to final loads — with instant PASS / WARN / FAIL on every circuit.
              </p>
            </div>
          </div>
          <div className="relative surface-deep overflow-hidden">
            <div className="winbar">
              <div className="dots"><span></span><span></span><span></span></div>
              <div className="mono text-zinc-500" style={{ fontSize: '10px', letterSpacing: '0.08em' }}>app.calcpilot.cc / project / building-lv-distribution</div>
              <div className="mono text-zinc-600" style={{ fontSize: '10px', letterSpacing: '0.08em' }}>⌘K</div>
            </div>
            <div className="relative">
              <img src="/app-screenshot.png" alt="CalcPilot load manager showing full distribution hierarchy" className="w-full block" draggable="false" />
              <div className="absolute hotspot" style={{ top: '53%', left: '89%', width: '14px', height: '14px', borderRadius: '999px', background: '#7ed3f7' }}></div>
              <div className="absolute hotspot" style={{ top: '47%', left: '80%', width: '14px', height: '14px', borderRadius: '999px', background: '#7ed3f7' }}></div>
              <div className="absolute hotspot" style={{ top: '17%', left: '11%', width: '14px', height: '14px', borderRadius: '999px', background: '#7ed3f7' }}></div>
            </div>
          </div>
          <div className="mt-6 grid md:grid-cols-3 gap-4 mono" style={{ fontSize: '11.5px', lineHeight: '1.55' }}>
            {[['01','PASS / WARN / FAIL','Every circuit flagged in real time as you edit lengths, cable sizes, or installation methods.'],
              ['02','CUMULATIVE VD%','Propagates from MDB down. See where a deep run overshoots the limit, not just per-segment.'],
              ['03','⚡ AUTO CABLE','One click rewrites every cable size in the schedule to the minimum that passes ampacity + VD limits.']].map(([n,t,d]) => (
              <div key={n} className="flex gap-3 border-t rule pt-4">
                <span className="text-cyan-300 font-bold">●&nbsp;{n}</span>
                <div>
                  <div className="text-zinc-200" style={{ letterSpacing: '0.05em' }}>{t}</div>
                  <div className="text-zinc-500 mt-0.5" style={{ fontFamily: '"Inter Tight"', letterSpacing: 0 }}>{d}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── STANDARDS ── */}
      <section id="standards" className="sect-divider">
        <div className="wrap py-24">
          <div className="grid lg:grid-cols-12 gap-8 mb-12">
            <div className="lg:col-span-4">
              <div className="eyebrow"><span className="num">[04]</span>Standards &amp; Modes</div>
            </div>
            <div className="lg:col-span-8">
              <h2 className="display text-white" style={{ fontSize: '64px' }}>Designed for Kahramaa.<br />Compatible with <em>IEC</em>.</h2>
            </div>
          </div>
          <div className="grid lg:grid-cols-2 gap-8">
            <div className="border rule p-8 surface">
              <p className="text-zinc-400" style={{ fontSize: '15px', lineHeight: '1.65' }}>
                Switch between modes per project. Kahramaa uses the official cable tables T10 (PVC) / T11 (XLPE) with fixed ampacity per installation method. IEC 60364 runs the resistivity method with dynamic derating. Custom mode lets you load manufacturer datasheets.
              </p>
              <div className="mt-8">
                <div className="mono text-zinc-500 mb-2" style={{ fontSize: '10px', letterSpacing: '0.15em' }}>SELECT MODE</div>
                <div className="inline-flex border rule p-1 surface-deep">
                  {[['kahramaa','KAHRAMAA'],['iec','IEC 60364'],['custom','CUSTOM']].map(([k,label]) => (
                    <button key={k} onClick={() => setMode(k)}
                      className={`px-4 py-2 mono font-bold transition-all ${mode === k ? 'bg-cyan-300 text-slate-950' : 'text-zinc-400 hover:text-white'}`}
                      style={{ fontSize: '11px', letterSpacing: '0.1em' }}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mt-10">
                <div className="mono text-cyan-300" style={{ fontSize: '10px', letterSpacing: '0.18em' }}>DESIGN WORKFLOW</div>
                <div className="mt-5 space-y-3">
                  {[['01',<>Build load hierarchy: <span className="mono text-zinc-400">MDB → SMDB → DB → loads</span></>],['02','Set system voltage, calc mode, and max VD%'],['03','Run calc engine — instant pass / fail per circuit'],['04','Apply ⚡ Auto Cable & Auto MCCB across selection'],['05','Import lengths from DXF, re-run calculations'],['06','Export layered SLD + client report']].map(([n,t]) => (
                    <div key={n} className="flex gap-4 items-start">
                      <span className="mono text-zinc-500 mt-1" style={{ fontSize: '10px' }}>{n}</span>
                      <div className="text-zinc-300" style={{ fontSize: '14px' }}>{t}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="surface-deep p-6 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div className="mono text-zinc-500" style={{ fontSize: '10px', letterSpacing: '0.15em' }}>SAMPLE · DB-A → POLE-03 · 50m</div>
                <span className={m.pillClass}>{m.label}</span>
              </div>
              <div className="mono space-y-2" style={{ fontSize: '12px' }}>
                {[['METHOD',m.method,'text-zinc-200'],['CABLE','2.5mm² · CU · XLPE','text-zinc-200'],['LOAD','5 A · 0.85 PF','text-zinc-200'],['DERATING',m.derate,'text-zinc-200'],['SEG VD',m.seg,m.segC],['CUM VD',m.cum,m.cumC]].map(([k,v,c]) => (
                  <div key={k} className="flex justify-between border-b rule py-1.5">
                    <span className="text-zinc-500">{k}</span><span className={c}>{v}</span>
                  </div>
                ))}
              </div>
              <div className="tech-line my-5"></div>
              <div className="serif text-emerald-400" style={{ fontSize: '58px', lineHeight: 1 }}>PASS</div>
              <div className="mono text-zinc-500 mt-2" style={{ fontSize: '10px', letterSpacing: '0.12em' }}>VERDICT · WITHIN 5.0% CUMULATIVE LIMIT</div>
              <div className="mt-auto pt-6 mono text-zinc-600" style={{ fontSize: '10px', letterSpacing: '0.1em' }}>Switch modes — same circuit, methodology &amp; verdict update live.</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" className="sect-divider">
        <div className="wrap py-24">
          <div className="grid lg:grid-cols-12 gap-8 mb-12">
            <div className="lg:col-span-4"><div className="eyebrow"><span className="num">[05]</span>Pricing</div></div>
            <div className="lg:col-span-8">
              <h2 className="display text-white" style={{ fontSize: '64px' }}>Honest plans for engineers<br />and engineering firms.</h2>
              <p className="mt-6 text-zinc-400 max-w-[560px]" style={{ fontSize: '15px', lineHeight: '1.65' }}>Pricing in QAR. All plans include Kahramaa, IEC 60364, DXF import / export, and the full report generator.</p>
            </div>
          </div>
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Trial */}
            <div className="plan-card border rule p-8 surface flex flex-col">
              <div className="flex items-center justify-between">
                <div className="mono text-zinc-400" style={{ fontSize: '10px', letterSpacing: '0.18em' }}>TRIAL</div>
                <span className="pill pill-info">FREE</span>
              </div>
              <div className="mt-6">
                <div className="display text-white" style={{ fontSize: '56px' }}>$0</div>
                <div className="mono text-zinc-500 mt-1" style={{ fontSize: '11px', letterSpacing: '0.1em' }}>1 MONTH TRIAL · NO CARD</div>
              </div>
              <p className="mt-5 text-zinc-400" style={{ fontSize: '14px', lineHeight: '1.6' }}>Evaluate the calculation engine on a real project.</p>
              <ul className="mt-6 space-y-3 text-zinc-300" style={{ fontSize: '13.5px' }}>
                <li className="flex gap-3"><span className="text-cyan-300 mono mt-0.5">✓</span>Up to 30 loads / project</li>
                <li className="flex gap-3"><span className="text-cyan-300 mono mt-0.5">✓</span>Kahramaa &amp; IEC modes</li>
                <li className="flex gap-3"><span className="text-cyan-300 mono mt-0.5">✓</span>Sample report export (watermarked)</li>
                <li className="flex gap-3"><span className="text-zinc-700 mono mt-0.5">×</span><span className="text-zinc-500">DXF import / SLD export</span></li>
                <li className="flex gap-3"><span className="text-zinc-700 mono mt-0.5">×</span><span className="text-zinc-500">Cost estimation module</span></li>
              </ul>
              <Link to={loggedInEmail ? "/dashboard" : "/signup"} className="mt-8 block"><button className="btn-ghost w-full">{loggedInEmail ? "GO TO DASHBOARD" : "START FREE TRIAL"}</button></Link>
            </div>
            {/* Standard Monthly */}
            <div className="relative plan-card border p-8 flex flex-col" style={{ borderColor: '#7ed3f7', background: 'linear-gradient(180deg, rgba(126,211,247,0.04), transparent 60%), #0a0d12' }}>
              <div className="absolute -top-3 left-8 mono font-bold bg-cyan-300 text-slate-950 px-2.5 py-1" style={{ fontSize: '10px', letterSpacing: '0.15em' }}>MOST USED</div>
              <div className="flex items-center justify-between">
                <div className="mono text-cyan-300" style={{ fontSize: '10px', letterSpacing: '0.18em' }}>STANDARD</div>
                <span className="pill pill-info">MONTHLY</span>
              </div>
              <div className="mt-6">
                <div className="display text-white" style={{ fontSize: '56px' }}>$12<span className="text-zinc-500" style={{ fontSize: '20px' }}> / mo</span></div>
                <div className="mono text-zinc-500 mt-1" style={{ fontSize: '11px', letterSpacing: '0.1em' }}>1 MONTH FREE TRIAL · NO CARD</div>
              </div>
              <p className="mt-5 text-zinc-300" style={{ fontSize: '14px', lineHeight: '1.6' }}>For individual engineers running live submissions.</p>
              <ul className="mt-6 space-y-3 text-zinc-200" style={{ fontSize: '13.5px' }}>
                <li className="flex gap-3"><span className="text-cyan-300 mono mt-0.5">✓</span>Unlimited projects &amp; loads</li>
                <li className="flex gap-3"><span className="text-cyan-300 mono mt-0.5">✓</span>⚡ Auto Cable &amp; Auto MCCB</li>
                <li className="flex gap-3"><span className="text-cyan-300 mono mt-0.5">✓</span>DXF import &amp; layered SLD export</li>
                <li className="flex gap-3"><span className="text-cyan-300 mono mt-0.5">✓</span>PDF &amp; Excel report export</li>
                <li className="flex gap-3"><span className="text-cyan-300 mono mt-0.5">✓</span>Cost estimation module</li>
              </ul>
              <Link to={loggedInEmail ? "/dashboard" : "/signup"} className="mt-8 block"><button className="btn-primary w-full">{loggedInEmail ? "GO TO DASHBOARD →" : "START FREE TRIAL →"}</button></Link>
            </div>
            {/* Standard Annual */}
            <div className="plan-card border rule p-8 surface flex flex-col">
              <div className="flex items-center justify-between">
                <div className="mono text-zinc-400" style={{ fontSize: '10px', letterSpacing: '0.18em' }}>STANDARD</div>
                <span className="pill pill-pass">ANNUAL</span>
              </div>
              <div className="mt-6">
                <div className="display text-white" style={{ fontSize: '56px' }}>$50<span className="text-zinc-500" style={{ fontSize: '20px' }}> / yr</span></div>
                <div className="mono text-zinc-500 mt-1" style={{ fontSize: '11px', letterSpacing: '0.1em' }}>1 MONTH FREE TRIAL · SAVE 65%</div>
              </div>
              <p className="mt-5 text-zinc-400" style={{ fontSize: '14px', lineHeight: '1.6' }}>Best value — pay once a year, save vs. monthly.</p>
              <ul className="mt-6 space-y-3 text-zinc-300" style={{ fontSize: '13.5px' }}>
                <li className="flex gap-3"><span className="text-cyan-300 mono mt-0.5">✓</span>Everything in Standard Monthly</li>
                <li className="flex gap-3"><span className="text-cyan-300 mono mt-0.5">✓</span>Priority support</li>
                <li className="flex gap-3"><span className="text-emerald-400 mono mt-0.5">↓</span><span className="text-emerald-400">~$4.17 / mo effective rate</span></li>
              </ul>
              <Link to={loggedInEmail ? "/dashboard" : "/signup"} className="mt-8 block"><button className="btn-ghost w-full">{loggedInEmail ? "GO TO DASHBOARD →" : "START FREE TRIAL →"}</button></Link>
            </div>
          </div>
          <div className="mt-8 mono text-zinc-500 flex flex-wrap gap-6 justify-center" style={{ fontSize: '11px', letterSpacing: '0.1em' }}>
            <span>1 MONTH FREE TRIAL · NO CARD REQUIRED</span><span className="text-zinc-700">·</span>
            <span>CANCEL ANYTIME</span><span className="text-zinc-700">·</span>
            <span>YOUR DATA EXPORTS AS JSON, ALWAYS</span>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="sect-divider">
        <div className="wrap py-24">
          <div className="grid lg:grid-cols-12 gap-8">
            <div className="lg:col-span-4">
              <div className="eyebrow"><span className="num">[06]</span>Objections, answered</div>
              <h2 className="display text-white mt-6" style={{ fontSize: '56px' }}>Questions<br />engineers ask<br />before signing.</h2>
            </div>
            <div className="lg:col-span-8 space-y-1">
              {[
                ['Will Kahramaa accept this as the calculation source on submission drawings?','Yes. Kahramaa mode uses the official T10 (PVC) and T11 (XLPE) cable tables with fixed ampacity per installation method. Reports include the table reference, derating chain, and verdict on every circuit — exactly what reviewers look for.',true],
                ['Can I import cable lengths from a CAD drawing?','Yes. The DXF import module reads cable lengths directly from AutoCAD drawings and matches them to your load schedule using intelligent label recognition. Preview every match before confirming, then re-run in one click.',false],
                ['How does Auto Cable actually pick the size?','Auto Cable iterates the standard cable size ladder and picks the smallest cross-section satisfying (a) ampacity with derating Cg · Cd · Ka, and (b) your defined VD% limit — segment or cumulative. Same algorithm for Auto MCCB.',false],
                ["What about a third-party reviewer who doesn't use CalcPilot?",'Every project exports to a transparent PDF report and an Excel workbook with editable inputs. Reviewers can audit every number without an account. SLDs export as standards-compliant layered DXF.',false],
                ['What happens to my project data if I cancel?',"Your data exports as JSON at any time — no vendor lock-in. After cancellation we keep your projects read-only for 90 days. After that, everything is deleted.",false],
                ['Can I export the SLD to AutoCAD?','Yes. The SLD Generator exports a layered DXF — busbars, feeders, equipment symbols, tags, and notes each on their own CAD layer. Opens cleanly in AutoCAD 2010 onward.',false],
              ].map(([q,a,open],i) => (
                <details key={i} className="group border-t rule py-6" {...(open ? {open:true} : {})}>
                  <summary className="flex justify-between items-center cursor-pointer list-none">
                    <span className="text-white font-medium pr-6" style={{ fontSize: '18px' }}>{q}</span>
                    <span className="chev text-cyan-300 mono leading-none" style={{ fontSize: '22px' }}>+</span>
                  </summary>
                  <p className="mt-4 text-zinc-400 max-w-[640px]" style={{ fontSize: '14.5px', lineHeight: '1.65' }}>{a}</p>
                </details>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="sect-divider">
        <div className="wrap py-24">
          <div className="relative border rule p-14 lg:p-20 surface overflow-hidden">
            <div className="absolute inset-0 gridbg opacity-50 pointer-events-none"></div>
            <div className="absolute -top-32 -right-20 w-[500px] h-[500px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(126,211,247,0.10), transparent 60%)' }}></div>
            <div className="relative grid lg:grid-cols-[1.3fr_1fr] gap-12 items-center">
              <div>
                <div className="eyebrow"><span className="num">[07]</span>Start today</div>
                <h2 className="display text-white mt-7" style={{ fontSize: '64px' }}>Stop calculating<br />in <em className="text-cyan-300">Excel</em>.</h2>
                <p className="mt-7 text-zinc-300 max-w-[480px]" style={{ fontSize: '16px', lineHeight: '1.65' }}>
                  Load schedule, voltage drop, Auto Cable, layered SLD, Kahramaa-ready report — one platform, one workflow, one submission.
                </p>
                <div className="mt-9 flex flex-wrap gap-5 items-center">
                  {loggedInEmail ? (
                    <Link to="/dashboard"><button className="btn-primary">GO TO DASHBOARD →</button></Link>
                  ) : (
                    <Link to="/signup"><button className="btn-primary">START FREE TRIAL →</button></Link>
                  )}
                  <a href="mailto:info@calcpilot.com" className="btn-link">BOOK 20-MIN DEMO ↗</a>
                </div>
              </div>
              <div className="surface-deep p-6">
                <div className="mono text-zinc-500" style={{ fontSize: '10px', letterSpacing: '0.15em' }}>WHAT YOU GET ON DAY 1</div>
                <div className="mt-5 space-y-3">
                  {['14-day full-feature trial','Sample Kahramaa project pre-loaded','Step-by-step submission checklist','Cable sizing guide (PDF · 24pp)','Direct line to the engineer who built it'].map(t => (
                    <div key={t} className="flex gap-3" style={{ fontSize: '14px' }}><span className="text-cyan-300 mono">→</span><span className="text-zinc-200">{t}</span></div>
                  ))}
                </div>
                <div className="tech-line my-6"></div>
                <div className="mono text-zinc-500" style={{ fontSize: '10px', letterSpacing: '0.12em' }}>NO CARD · NO CALL · CANCEL ANYTIME</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="sect-divider" style={{ background: '#020409' }}>
        <div className="wrap py-16">
          <div className="grid lg:grid-cols-[1.4fr_1fr_1fr_1fr_1fr] gap-10">
            <div>
              <div className="mono font-bold tracking-tight flex items-center gap-1.5" style={{ fontSize: '18px' }}>
                <span className="text-cyan-300">SLD</span><span className="text-zinc-700">·</span><span className="text-pink-400">VD</span>
              </div>
              <div className="mt-3 font-semibold tracking-tight" style={{ fontSize: '14px' }}>CalcPilot</div>
              <div className="mono text-zinc-500 mt-1" style={{ fontSize: '10px', letterSpacing: '0.15em' }}>EE DESIGN PLATFORM · DOHA</div>
              <p className="mt-6 text-zinc-500 max-w-[280px]" style={{ fontSize: '13px', lineHeight: '1.6' }}>
                Built by a Qatar-based electrical engineer who got tired of recalculating VD% in spreadsheets the night before submission.
              </p>
              <div className="mt-6 mono text-zinc-500 flex items-center gap-2" style={{ fontSize: '11px', letterSpacing: '0.1em' }}>
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 live-dot"></span>ALL SYSTEMS NORMAL
              </div>
            </div>
            <div>
              <div className="mono text-zinc-500 mb-4" style={{ fontSize: '10px', letterSpacing: '0.18em' }}>PRODUCT</div>
              <ul className="space-y-2.5 text-zinc-300" style={{ fontSize: '13.5px' }}>
                <li><a href="#features"  className="hover:text-cyan-300">Features</a></li>
                <li><a href="#engine"    className="hover:text-cyan-300">Calc Engine</a></li>
                <li><a href="#standards" className="hover:text-cyan-300">Standards</a></li>
                <li><a href="#pricing"   className="hover:text-cyan-300">Pricing</a></li>
                <li><a href="#changelog" className="hover:text-cyan-300">Changelog</a></li>
              </ul>
            </div>
            <div>
              <div className="mono text-zinc-500 mb-4" style={{ fontSize: '10px', letterSpacing: '0.18em' }}>RESOURCES</div>
              <ul className="space-y-2.5 text-zinc-300" style={{ fontSize: '13.5px' }}>
                <li><a className="hover:text-cyan-300 cursor-pointer">Cable Sizing Guide</a></li>
                <li><a className="hover:text-cyan-300 cursor-pointer">Kahramaa Checklist</a></li>
                <li><a className="hover:text-cyan-300 cursor-pointer">IEC vs Kahramaa</a></li>
                <li><a className="hover:text-cyan-300 cursor-pointer">DXF Import Specs</a></li>
                <li><a className="hover:text-cyan-300 cursor-pointer">Sample Projects</a></li>
              </ul>
            </div>
            <div>
              <div className="mono text-zinc-500 mb-4" style={{ fontSize: '10px', letterSpacing: '0.18em' }}>COMPANY</div>
              <ul className="space-y-2.5 text-zinc-300" style={{ fontSize: '13.5px' }}>
                <li><a className="hover:text-cyan-300 cursor-pointer">About</a></li>
                <li><a className="hover:text-cyan-300 cursor-pointer">Customers</a></li>
                <li><a href="mailto:info@calcpilot.com" className="hover:text-cyan-300">Contact</a></li>
                <li><a className="hover:text-cyan-300 cursor-pointer">Status</a></li>
              </ul>
            </div>
            <div>
              <div className="mono text-zinc-500 mb-4" style={{ fontSize: '10px', letterSpacing: '0.18em' }}>LEGAL</div>
              <ul className="space-y-2.5 text-zinc-300" style={{ fontSize: '13.5px' }}>
                <li><Link to="/terms"   className="hover:text-cyan-300">Terms of Service</Link></li>
                <li><Link to="/privacy" className="hover:text-cyan-300">Privacy Policy</Link></li>
                <li><Link to="/refund"  className="hover:text-cyan-300">Refund Policy</Link></li>
                <li><a className="hover:text-cyan-300 cursor-pointer">DPA</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t rule mt-14 pt-6 flex flex-wrap items-center justify-between gap-4 mono text-zinc-600" style={{ fontSize: '10.5px', letterSpacing: '0.12em' }}>
            <div>© 2026 CALCPILOT · BUILT FOR ELECTRICAL ENGINEERS WORLDWIDE</div>
            <div>QAR · DOHA, QATAR · INFO@CALCPILOT.COM</div>
          </div>
        </div>
      </footer>

    </div>
  );
}
