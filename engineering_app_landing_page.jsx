import React from "react";
import { motion } from "framer-motion";
import { Cable, Zap, FileText, Settings, BarChart3, CheckCircle2, ArrowRight, Lock, FileCode2, ListTree } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const features = [
  {
    icon: ListTree,
    title: "Load Manager",
    description: "Build your full distribution hierarchy — MDB, SMDB, DB, and Final Loads — with inline editing, bulk operations, undo/redo, and search-filter by status.",
  },
  {
    icon: Zap,
    title: "Voltage Drop Engine",
    description: "Calculate segment and cumulative VD% per circuit using Kahramaa (mV/A/m tables) or IEC 60364 resistivity method. Clear PASS / WARN / FAIL status per run.",
  },
  {
    icon: Cable,
    title: "Auto Cable & MCCB Sizing",
    description: "Automatically right-size cables and protection devices across all circuits in one click, respecting cumulative VD limits, ampacity, and derating factors.",
  },
  {
    icon: BarChart3,
    title: "SLD Generator",
    description: "Generate color-coded single-line diagrams directly from your load hierarchy and export to AutoCAD DXF — fully layered with busbars, feeders, equipment, and tags on separate CAD layers.",
  },
  {
    icon: FileCode2,
    title: "DXF Import",
    description: "Import cable lengths directly from CAD drawings. Intelligent label matching maps DXF cable runs to your load schedule — preview before applying.",
  },
  {
    icon: FileText,
    title: "Reports & Cost Estimation",
    description: "Generate professional client submission reports and a full bill-of-materials with cable cost breakdown by size, run length, and installation method.",
  },
];

const standards = ["Kahramaa (Qatar)", "IEC 60364", "Custom Cable Data"];

const pricing = [
  {
    name: "Trial",
    price: "Free",
    description: "For engineers evaluating the platform.",
    features: ["Limited load entries", "Voltage drop calculations", "Kahramaa & IEC modes", "Sample report export"],
    cta: "Start Free Trial",
    highlight: false,
  },
  {
    name: "Pro",
    price: "Monthly",
    description: "For individual engineers and project managers.",
    features: ["Unlimited projects & loads", "Auto cable & MCCB sizing", "DXF import & SLD export", "PDF & Excel report export", "Cost estimation module"],
    cta: "Request Access",
    highlight: true,
  },
  {
    name: "Team",
    price: "Company License",
    description: "For contractors, consultants, and engineering teams.",
    features: ["Multi-user access", "Admin dashboard", "Shared project library", "Company report branding", "Priority support"],
    cta: "Book a Demo",
    highlight: false,
  },
];

const faqs = [
  {
    q: "Does it support Kahramaa calculations?",
    a: "Yes. Kahramaa (Qatar) mode uses the official cable tables (T10 for PVC, T11 for XLPE) with fixed ampacity ratings per installation method, matching Qatar authority submission requirements.",
  },
  {
    q: "Can I import cable lengths from a CAD drawing?",
    a: "Yes. The DXF import module reads cable lengths directly from AutoCAD drawings and matches them to your load schedule using intelligent label recognition. You can preview all matches before confirming.",
  },
  {
    q: "How does Auto Cable Sizing work?",
    a: "Auto Cable applies to selected rows or all circuits at once. It selects the minimum cable size that satisfies both ampacity and your defined VD% limit (segment or cumulative), respecting grouping derating.",
  },
  {
    q: "Can I export the SLD to AutoCAD?",
    a: "Yes. The SLD Generator exports a DXF file that opens in any version of AutoCAD. Busbars, feeders, equipment symbols, tags, and notes are each on their own CAD layer so you can control visibility, color, and plotting independently.",
  },
];

function SectionLabel({ children }) {
  return (
    <div className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm">
      {children}
    </div>
  );
}

export default function EngineeringAppLandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-400/20">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <div className="text-lg font-bold tracking-tight">SLD·VD</div>
              <div className="text-xs text-slate-400">Voltage Drop Manager</div>
            </div>
          </div>

          <div className="hidden items-center gap-8 text-sm font-medium text-slate-300 md:flex">
            <a href="#features" className="hover:text-white">Features</a>
            <a href="#standards" className="hover:text-white">Standards</a>
            <a href="#pricing" className="hover:text-white">Pricing</a>
            <a href="#faq" className="hover:text-white">FAQ</a>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="ghost" className="hidden text-slate-200 hover:bg-white/10 hover:text-white md:inline-flex">Login</Button>
            <Button className="rounded-2xl bg-cyan-400 text-slate-950 hover:bg-cyan-300">Start Trial</Button>
          </div>
        </nav>
      </header>

      <main>
        <section className="relative overflow-hidden px-6 py-20 lg:px-8 lg:py-28">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.18),transparent_35%),radial-gradient(circle_at_left,rgba(59,130,246,0.18),transparent_30%)]" />
          <div className="mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-2">
            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-sm text-cyan-200">
                <Lock className="h-4 w-4" /> Built for electrical distribution design
              </div>
              <h1 className="max-w-4xl text-5xl font-bold tracking-tight text-white md:text-6xl lg:text-7xl">
                Load schedules, voltage drop, and SLD — in one tool.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
                SLD·VD lets engineers build full distribution hierarchies, calculate voltage drop per Kahramaa or IEC 60364, auto-size cables and breakers, generate single-line diagrams, and produce professional client reports — all in a single workflow.
              </p>
              <div className="mt-9 flex flex-col gap-4 sm:flex-row">
                <Button size="lg" className="rounded-2xl bg-cyan-400 px-7 py-6 text-base font-semibold text-slate-950 hover:bg-cyan-300">
                  Start Free Trial <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <Button size="lg" variant="outline" className="rounded-2xl border-white/20 bg-white/5 px-7 py-6 text-base font-semibold text-white hover:bg-white/10">
                  Request Demo
                </Button>
              </div>
              <div className="mt-8 flex flex-wrap gap-4 text-sm text-slate-400">
                <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-cyan-300" /> Kahramaa (Qatar)</span>
                <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-cyan-300" /> IEC 60364</span>
                <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-cyan-300" /> DXF Import & Export</span>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.7, delay: 0.1 }}>
              <div className="rounded-[2rem] border border-white/10 bg-white/10 p-3 shadow-2xl shadow-cyan-950/40 backdrop-blur-xl">
                <div className="rounded-[1.5rem] bg-slate-900 p-5">
                  <div className="mb-5 flex items-center justify-between border-b border-white/10 pb-4">
                    <div>
                      <div className="text-sm text-slate-400">Project</div>
                      <div className="font-semibold">Building LV Distribution</div>
                    </div>
                    <div className="rounded-full bg-emerald-400/10 px-3 py-1 text-sm font-medium text-emerald-300">Passed</div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    {[
                      ["Load Current", "412 A"],
                      ["Selected Cable", "CU/XLPE 4C × 300mm²"],
                      ["Cumulative VD", "1.8%"],
                      ["Isc at Panel", "8.2 kA"],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                        <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
                        <div className="mt-2 text-xl font-bold text-white">{value}</div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-4">
                    <div className="mb-2 flex items-center gap-2 font-semibold text-cyan-100">
                      <Settings className="h-4 w-4" /> Calculation Mode
                    </div>
                    <p className="text-sm leading-6 text-cyan-50/80">
                      Kahramaa (Qatar) · XLPE 90°C · Underground pipe · Cg = 0.80 (4 cables grouped)
                    </p>
                  </div>

                  <div className="mt-5 rounded-2xl bg-white p-4 text-slate-950">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-semibold">Export SLD</div>
                        <div className="text-xs text-slate-500">Fully layered AutoCAD DXF</div>
                      </div>
                      <Button className="rounded-xl bg-slate-950 text-white hover:bg-slate-800">Export DXF</Button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        <section id="features" className="bg-white px-6 py-20 text-slate-950 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mx-auto max-w-3xl text-center">
              <SectionLabel>Core Features</SectionLabel>
              <h2 className="mt-5 text-4xl font-bold tracking-tight md:text-5xl">Everything in one calculation workflow.</h2>
              <p className="mt-5 text-lg leading-8 text-slate-600">
                Replace scattered spreadsheets with a structured platform covering load scheduling, cable design, voltage drop compliance, SLD generation, and client reporting.
              </p>
            </div>
            <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => {
                const Icon = feature.icon;
                return (
                  <Card key={feature.title} className="rounded-3xl border-slate-200 shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
                    <CardContent className="p-7">
                      <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-cyan-300">
                        <Icon className="h-6 w-6" />
                      </div>
                      <h3 className="text-xl font-bold">{feature.title}</h3>
                      <p className="mt-3 leading-7 text-slate-600">{feature.description}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        <section id="standards" className="bg-slate-50 px-6 py-20 text-slate-950 lg:px-8">
          <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-2">
            <div>
              <SectionLabel>Standards & Calculation Modes</SectionLabel>
              <h2 className="mt-5 text-4xl font-bold tracking-tight md:text-5xl">Designed for Kahramaa submissions and IEC projects.</h2>
              <p className="mt-5 text-lg leading-8 text-slate-600">
                Switch between Kahramaa (Qatar) (official cable tables T10/T11) and IEC 60364 (resistivity method with dynamic derating). Use Custom Cable Data mode when manufacturer datasheets differ from standard tables.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                {standards.map((item) => (
                  <span key={item} className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm">
                    {item}
                  </span>
                ))}
              </div>
            </div>
            <div className="rounded-[2rem] bg-slate-950 p-8 text-white shadow-2xl">
              <div className="text-sm font-medium text-cyan-300">Design Workflow</div>
              <div className="mt-6 space-y-5">
                {[
                  "Build load hierarchy: MDB → SMDB → DB → Final Loads",
                  "Set system voltage, frequency, calc mode, and max VD%",
                  "Run calculation engine — instant pass/fail per circuit",
                  "Apply Auto Cable & Auto MCCB to right-size all circuits",
                  "Import cable lengths from DXF and re-run calculations",
                  "Export SLD to AutoCAD and generate client report",
                ].map((step, index) => (
                  <div key={step} className="flex gap-4">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cyan-400 text-sm font-bold text-slate-950">{index + 1}</div>
                    <div className="pt-1 text-slate-200">{step}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="pricing" className="bg-white px-6 py-20 text-slate-950 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mx-auto max-w-3xl text-center">
              <SectionLabel>Pricing</SectionLabel>
              <h2 className="mt-5 text-4xl font-bold tracking-tight md:text-5xl">Simple plans for engineers and companies.</h2>
              <p className="mt-5 text-lg leading-8 text-slate-600">Start with a free trial, then upgrade when your team is ready to use the platform on live projects.</p>
            </div>
            <div className="mt-14 grid gap-6 lg:grid-cols-3">
              {pricing.map((plan) => (
                <Card key={plan.name} className={`rounded-3xl ${plan.highlight ? "border-cyan-300 bg-slate-950 text-white shadow-2xl" : "border-slate-200 bg-white text-slate-950 shadow-sm"}`}>
                  <CardContent className="p-8">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-2xl font-bold">{plan.name}</h3>
                        <p className={`mt-2 ${plan.highlight ? "text-slate-300" : "text-slate-600"}`}>{plan.description}</p>
                      </div>
                      {plan.highlight && <span className="rounded-full bg-cyan-400 px-3 py-1 text-xs font-bold text-slate-950">Popular</span>}
                    </div>
                    <div className="mt-7 text-3xl font-bold">{plan.price}</div>
                    <ul className="mt-7 space-y-3">
                      {plan.features.map((item) => (
                        <li key={item} className="flex gap-3">
                          <CheckCircle2 className={`mt-0.5 h-5 w-5 ${plan.highlight ? "text-cyan-300" : "text-cyan-600"}`} />
                          <span className={plan.highlight ? "text-slate-200" : "text-slate-700"}>{item}</span>
                        </li>
                      ))}
                    </ul>
                    <Button className={`mt-8 w-full rounded-2xl py-6 ${plan.highlight ? "bg-cyan-400 text-slate-950 hover:bg-cyan-300" : "bg-slate-950 text-white hover:bg-slate-800"}`}>
                      {plan.cta}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section id="faq" className="bg-slate-50 px-6 py-20 text-slate-950 lg:px-8">
          <div className="mx-auto max-w-4xl">
            <div className="text-center">
              <SectionLabel>FAQ</SectionLabel>
              <h2 className="mt-5 text-4xl font-bold tracking-tight md:text-5xl">Questions engineers usually ask.</h2>
            </div>
            <div className="mt-12 space-y-4">
              {faqs.map((faq) => (
                <div key={faq.q} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="text-lg font-bold">{faq.q}</h3>
                  <p className="mt-3 leading-7 text-slate-600">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-slate-950 px-6 py-20 text-white lg:px-8">
          <div className="mx-auto max-w-5xl rounded-[2rem] border border-white/10 bg-white/10 p-10 text-center shadow-2xl backdrop-blur-xl md:p-14">
            <h2 className="text-4xl font-bold tracking-tight md:text-5xl">Ready to streamline your electrical distribution design?</h2>
            <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-300">
              From load schedule entry to Kahramaa-compliant voltage drop results, SLD diagrams, and client reports — one tool covers the full workflow.
            </p>
            <div className="mt-9 flex flex-col justify-center gap-4 sm:flex-row">
              <Button size="lg" className="rounded-2xl bg-cyan-400 px-7 py-6 text-base font-semibold text-slate-950 hover:bg-cyan-300">
                Start Free Trial
              </Button>
              <Button size="lg" variant="outline" className="rounded-2xl border-white/20 bg-white/5 px-7 py-6 text-base font-semibold text-white hover:bg-white/10">
                Contact Sales
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 bg-slate-950 px-6 py-8 text-slate-400 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 md:flex-row">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-cyan-400 text-slate-950">
              <Zap className="h-5 w-5" />
            </div>
            <span className="font-semibold text-white">SLD·VD</span>
          </div>
          <div className="text-sm">© 2026 SLD · Voltage Drop Manager. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
}
