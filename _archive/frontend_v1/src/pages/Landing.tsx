import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

const STATS = [
  { value: 92651, suffix: ' Cr', label: '₹ Annual Food Loss (India)', color: 'text-red-400' },
  { value: 40, suffix: '%', label: 'Fruits & Veg Spoilage Rate', color: 'text-amber-400' },
  { value: 3.2, suffix: 'M', label: 'AGMARKNET Records Analysed', color: 'text-agri-400' },
  { value: 88, suffix: '%', label: 'Price Crash Prediction Accuracy', color: 'text-emerald-400' },
]

const FEATURES = [
  {
    icon: '🏭',
    title: 'Supply Chain Process Mining',
    desc: 'Identify the #1 bottleneck across 6 stages — Harvest to Dispatch — with Pareto analysis and delay attribution.',
    tag: 'Bottleneck Detection',
  },
  {
    icon: '🧬',
    title: 'Causal ML (Double ML)',
    desc: 'Measure the TRUE causal effect of MSP policy on farmer prices using econometric ML — not just correlation.',
    tag: 'Policy Intelligence',
  },
  {
    icon: '📈',
    title: 'XGBoost Price Risk Prediction',
    desc: '30-day price crash risk calendar powered by XGBoost with SHAP explainability. Know WHY the model predicts what it does.',
    tag: 'Risk Forecasting',
  },
  {
    icon: '🧪',
    title: 'What-If Simulation Engine',
    desc: 'Monte Carlo simulation for cold-chain & transport interventions. Get ROI estimates before spending a single rupee.',
    tag: 'Scenario Planning',
  },
  {
    icon: '🤖',
    title: 'Agentic AI Intelligence',
    desc: 'Ask "Why did onion prices crash?" — the LangGraph agent autonomously calls ML tools and streams a data-backed answer.',
    tag: 'AI Agent',
  },
  {
    icon: '📱',
    title: 'Farmer WhatsApp Alerts',
    desc: 'Last-mile impact: price crash warnings sent directly to farmers in Hindi via WhatsApp. No app needed.',
    tag: 'Last-Mile Reach',
  },
]

const PERSONAS = [
  {
    emoji: '👨‍🌾',
    role: 'FPO Manager',
    org: 'Farmer Producer Organisation',
    color: 'from-emerald-600/20 to-emerald-500/5 border-emerald-500/20',
    badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
    uses: [
      'Price crash alerts for 500+ member farmers',
      'Regional risk calendar by commodity',
      'Send WhatsApp alerts to all members',
      'Season-wise yield & price analytics',
    ],
  },
  {
    emoji: '🏛️',
    role: 'Government Officer',
    org: 'State Agriculture Department',
    color: 'from-blue-600/20 to-blue-500/5 border-blue-500/20',
    badge: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
    uses: [
      'MSP policy causal impact measurement',
      'State-level bottleneck hotspot map',
      'District-wise price intelligence',
      'Auto-generated ministry reports',
    ],
  },
  {
    emoji: '📊',
    role: 'Commodity Trader',
    org: 'Mandi & Export Companies',
    color: 'from-purple-600/20 to-purple-500/5 border-purple-500/20',
    badge: 'bg-purple-500/15 text-purple-400 border-purple-500/20',
    uses: [
      '30-day price risk forecast calendar',
      'Multi-commodity comparison analytics',
      'REST API integration into trading app',
      'SHAP-explained prediction breakdown',
    ],
  },
]

const PRICING = [
  {
    plan: 'Free',
    price: '₹0',
    period: 'forever',
    desc: 'For individual researchers and students exploring agricultural data.',
    color: 'border-dark-600/50',
    btnClass: 'btn-secondary',
    features: [
      '1 dataset upload',
      '3 ML analysis runs/month',
      '10 AI Agent queries/month',
      'Process Mining access',
      'Basic dashboard',
    ],
    missing: ['WhatsApp alerts', 'API access', 'Role dashboards', 'Priority support'],
  },
  {
    plan: 'Pro',
    price: '₹999',
    period: '/month',
    desc: 'For FPOs and agricultural startups needing full intelligence.',
    color: 'border-agri-500/50 shadow-lg shadow-agri-500/10',
    btnClass: 'btn-primary',
    badge: 'Most Popular',
    features: [
      'Unlimited datasets',
      '50 ML analysis runs/month',
      '500 AI Agent queries/month',
      'All 3 ML modules',
      'WhatsApp alerts (100 SMS/mo)',
      'API access (5,000 calls/mo)',
      'All 3 role dashboards',
      'Email support',
    ],
    missing: [],
  },
  {
    plan: 'Enterprise',
    price: 'Custom',
    period: '',
    desc: 'For state governments and AgriTech companies needing scale.',
    color: 'border-dark-600/50',
    btnClass: 'btn-secondary',
    features: [
      'Everything in Pro',
      'Unlimited analysis & queries',
      'Unlimited WhatsApp alerts',
      'Dedicated API SLA',
      'Custom ML model training',
      'White-label options',
      'Dedicated support & SLA',
      'NABARD/Govt billing support',
    ],
    missing: [],
  },
]

function AnimatedCounter({ target, suffix, duration = 2000 }: { target: number; suffix: string; duration?: number }) {
  const [count, setCount] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  const started = useRef(false)

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true
        const start = Date.now()
        const tick = () => {
          const elapsed = Date.now() - start
          const progress = Math.min(elapsed / duration, 1)
          const eased = 1 - Math.pow(1 - progress, 3)
          setCount(Number((target * eased).toFixed(target % 1 !== 0 ? 1 : 0)))
          if (progress < 1) requestAnimationFrame(tick)
        }
        requestAnimationFrame(tick)
      }
    })
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [target, duration])

  return <span ref={ref}>{count}{suffix}</span>
}

export default function Landing() {
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-dark-950 text-white overflow-x-hidden">

      {/* ── NAV ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-dark-800/60 bg-dark-950/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-agri-500 to-emerald-600 flex items-center justify-center text-lg">🌾</div>
            <span className="text-lg font-bold">Agri<span className="text-agri-400">Flow</span></span>
          </Link>
          <div className="hidden md:flex items-center gap-8 text-sm text-dark-400">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#who" className="hover:text-white transition-colors">Who Uses It</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
            <Link to="/api-docs" className="hover:text-white transition-colors">API</Link>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="hidden md:block text-sm text-dark-400 hover:text-white transition-colors">Sign in</Link>
            <Link to="/login" className="btn-primary text-sm py-2 px-4">Start Free Trial</Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="relative pt-32 pb-20 px-6 overflow-hidden">
        {/* Background blobs */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 left-1/4 w-96 h-96 bg-agri-500/8 rounded-full blur-3xl animate-pulse-slow" />
          <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-emerald-600/6 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1.5s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-agri-600/4 rounded-full blur-3xl" />
        </div>
        {/* Grid */}
        <div className="absolute inset-0 opacity-[0.025]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.15) 1px, transparent 1px)', backgroundSize: '50px 50px' }} />

        <div className="relative max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-agri-500/10 border border-agri-500/20 text-agri-400 text-xs font-medium mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-agri-400 animate-pulse" />
            India's First Agentic AI AgriTech Platform
          </div>

          <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-[1.05] mb-6">
            Turn Mandi Data Into
            <br />
            <span className="bg-gradient-to-r from-agri-400 via-emerald-400 to-agri-300 bg-clip-text text-transparent">
              Supply Chain Intelligence
            </span>
          </h1>

          <p className="text-xl text-dark-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            AgriFlow uses AI and ML to predict price crashes, identify bottlenecks, and measure policy impact —
            turning 3.2M AGMARKNET records into decisions that save crores for farmers, FPOs, and governments.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link to="/login" className="btn-primary text-base py-3.5 px-8 flex items-center gap-2">
              <span>Start Free — No Credit Card</span>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
            </Link>
            <Link to="/whatsapp-demo" className="btn-secondary text-base py-3.5 px-8 flex items-center gap-2">
              <span>📱 See Farmer Demo</span>
            </Link>
          </div>

          {/* Dashboard preview card */}
          <div className="relative max-w-4xl mx-auto">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-dark-950 z-10 rounded-2xl" />
            <div className="glass-card p-6 overflow-hidden">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-3 h-3 rounded-full bg-red-500/70" />
                <div className="w-3 h-3 rounded-full bg-amber-500/70" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/70" />
                <span className="ml-2 text-dark-500 text-xs">AgriFlow Dashboard</span>
              </div>
              <div className="grid grid-cols-4 gap-3 mb-4">
                {['₹2,450 Modal Price', '⚠ High Risk Tomorrow', '45% Transport Delay', '₹1.5Cr Value Saved'].map((item, i) => (
                  <div key={i} className="bg-dark-900/80 rounded-xl p-3">
                    <p className="text-xs text-dark-500 mb-1">{['Onion — Lasalgaon', 'Price Alert', 'Top Bottleneck', 'Sim ROI'][i]}</p>
                    <p className="text-sm font-semibold text-white">{item}</p>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 bg-dark-900/80 rounded-xl p-4 h-32 flex items-end gap-1">
                  {[40, 65, 45, 80, 55, 90, 70, 85, 60, 95, 75, 88].map((h, i) => (
                    <div key={i} className="flex-1 rounded-t" style={{ height: `${h}%`, background: `hsl(${130 + i * 3}, 60%, ${35 + i * 2}%)` }} />
                  ))}
                </div>
                <div className="bg-dark-900/80 rounded-xl p-4 h-32">
                  <p className="text-xs text-dark-500 mb-2">30-Day Risk Calendar</p>
                  <div className="grid grid-cols-5 gap-1">
                    {Array.from({ length: 30 }, (_, i) => {
                      const risk = [0, 0, 1, 0, 2, 1, 0, 0, 2, 1, 0, 2, 2, 1, 0, 0, 1, 2, 0, 0, 1, 0, 2, 1, 0, 0, 1, 2, 0, 1][i]
                      return <div key={i} className={`w-3 h-3 rounded-sm ${['bg-emerald-500/40', 'bg-amber-500/50', 'bg-red-500/60'][risk]}`} />
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section className="py-16 px-6 border-y border-dark-800/50">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          {STATS.map((s) => (
            <div key={s.label} className="text-center">
              <div className={`text-4xl font-black mb-1 ${s.color}`}>
                <AnimatedCounter target={s.value} suffix={s.suffix} />
              </div>
              <p className="text-sm text-dark-500">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold mb-3">How It Works</h2>
            <p className="text-dark-400">From raw CSV to board-level intelligence in 3 steps</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 relative">
            <div className="hidden md:block absolute top-10 left-1/3 right-1/3 h-px bg-gradient-to-r from-agri-500/30 via-agri-400/50 to-agri-500/30" />
            {[
              { step: '01', icon: '📂', title: 'Upload Mandi CSV', desc: 'Drop your AGMARKNET CSV. We auto-detect encoding, normalize columns, run quality checks, and store 3.2M+ records.' },
              { step: '02', icon: '⚙️', title: 'Run AI Analysis', desc: 'Choose Process Mining, Causal ML, or XGBoost Prediction. Celery workers handle heavy ML in the background.' },
              { step: '03', icon: '🎯', title: 'Get Intelligence', desc: 'Receive price crash alerts, bottleneck reports, policy impact measurements, and ROI simulations instantly.' },
            ].map((item) => (
              <div key={item.step} className="glass-card p-6 text-center relative">
                <div className="text-xs font-bold text-agri-500 mb-3">{item.step}</div>
                <div className="text-4xl mb-4">{item.icon}</div>
                <h3 className="font-semibold text-white mb-2">{item.title}</h3>
                <p className="text-sm text-dark-400 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="py-20 px-6 bg-dark-900/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold mb-3">6 Intelligence Capabilities</h2>
            <p className="text-dark-400">The most comprehensive ML stack built for Indian agriculture</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f) => (
              <div key={f.title} className="glass-card-hover p-6 group cursor-default">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-agri-500/10 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform duration-300">{f.icon}</div>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-dark-700/80 text-dark-400 border border-dark-600/50">{f.tag}</span>
                </div>
                <h3 className="font-semibold text-white mb-2">{f.title}</h3>
                <p className="text-sm text-dark-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHO USES IT ── */}
      <section id="who" className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold mb-3">Built for Every Stakeholder</h2>
            <p className="text-dark-400">Role-based dashboards tailored for your specific needs</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {PERSONAS.map((p) => (
              <div key={p.role} className={`glass-card p-6 bg-gradient-to-b ${p.color} border`}>
                <div className="text-5xl mb-4">{p.emoji}</div>
                <div className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium border mb-3 ${p.badge}`}>{p.org}</div>
                <h3 className="text-xl font-bold text-white mb-4">{p.role}</h3>
                <ul className="space-y-2">
                  {p.uses.map((u) => (
                    <li key={u} className="flex items-start gap-2 text-sm text-dark-300">
                      <span className="text-agri-400 mt-0.5 flex-shrink-0">✓</span>
                      {u}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" className="py-20 px-6 bg-dark-900/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold mb-3">Simple, Transparent Pricing</h2>
            <p className="text-dark-400">Start free. Scale as you grow. NABARD-compliant billing for government contracts.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 items-start">
            {PRICING.map((p) => (
              <div key={p.plan} className={`glass-card p-6 border relative ${p.color}`}>
                {p.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-gradient-to-r from-agri-600 to-agri-500 text-white text-xs font-semibold shadow-lg">
                    {p.badge}
                  </div>
                )}
                <h3 className="text-lg font-bold text-white mb-1">{p.plan}</h3>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-3xl font-black text-white">{p.price}</span>
                  <span className="text-dark-400 text-sm">{p.period}</span>
                </div>
                <p className="text-sm text-dark-400 mb-6 leading-relaxed">{p.desc}</p>
                <Link to="/login" className={`${p.btnClass} w-full text-center block mb-6`}>
                  {p.plan === 'Enterprise' ? 'Contact Sales' : 'Get Started'}
                </Link>
                <ul className="space-y-2">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-dark-300">
                      <span className="text-emerald-400 text-base">✓</span>{f}
                    </li>
                  ))}
                  {p.missing.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-dark-600 line-through">
                      <span className="text-dark-700 text-base">✗</span>{f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p className="text-center text-sm text-dark-500 mt-8">
            🇮🇳 NABARD & Startup India Seed Fund eligible billing available for government entities.
            <Link to="/login" className="text-agri-400 hover:underline ml-1">Contact us</Link>
          </p>
        </div>
      </section>

      {/* ── API TEASER ── */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-medium mb-6">
              🔌 REST API
            </div>
            <h2 className="text-3xl font-bold mb-4">Integrate AgriFlow Into Your App</h2>
            <p className="text-dark-400 leading-relaxed mb-6">
              AgriTech companies like DeHaat, Ninjacart, and AgroStar can embed our ML predictions directly into their farmer apps via REST API. Get price crash predictions with a single HTTP call.
            </p>
            <Link to="/api-docs" className="btn-primary inline-flex items-center gap-2">
              View API Documentation
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
            </Link>
          </div>
          <div className="glass-card p-5 font-mono text-sm overflow-x-auto">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500/70" />
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/70" />
              <span className="text-dark-500 text-xs ml-1">Python</span>
            </div>
            <pre className="text-xs leading-relaxed">
              <span className="text-purple-400">import</span> <span className="text-white">requests</span>{'\n\n'}
              <span className="text-dark-500"># Get price crash prediction</span>{'\n'}
              <span className="text-white">response</span> <span className="text-agri-400">=</span> <span className="text-white">requests</span>.<span className="text-blue-400">post</span>(<span className="text-emerald-400">{'\n'}  "https://agriflow-api-f97e.onrender.com/api/{'\n'}   analysis/trigger"</span>,{'\n'}  <span className="text-white">json</span>=<span className="text-amber-300">{'{'}</span>{'\n'}    <span className="text-emerald-400">"job_type"</span>: <span className="text-emerald-400">"prediction"</span>,{'\n'}    <span className="text-emerald-400">"dataset_id"</span>: <span className="text-emerald-400">"your-dataset-id"</span>{'\n'}  <span className="text-amber-300">{'}'}</span>,{'\n'}  <span className="text-white">headers</span>=<span className="text-amber-300">{'{'}</span><span className="text-emerald-400">"Authorization"</span>: <span className="text-emerald-400">"Bearer YOUR_KEY"</span><span className="text-amber-300">{'}'}</span>{'\n'}){'\n\n'}
              <span className="text-dark-500"># Returns: risk_calendar, shap_values, accuracy</span>{'\n'}
              <span className="text-white">print</span>(<span className="text-white">response</span>.<span className="text-blue-400">json</span>())
            </pre>
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ── */}
      <section className="py-20 px-6 bg-gradient-to-r from-agri-900/30 via-agri-800/20 to-emerald-900/30 border-y border-agri-500/10">
        <div className="max-w-3xl mx-auto text-center">
          <div className="text-5xl mb-6">🌾</div>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            India's ₹92,000 Crore Problem.<br />
            <span className="text-agri-400">Start Solving It Today.</span>
          </h2>
          <p className="text-dark-400 mb-8 text-lg">
            Join FPOs, government officers, and AgriTech startups using AgriFlow to protect farmer incomes with AI.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/login" className="btn-primary text-base py-3.5 px-8">
              Start Free Trial — No Card Needed
            </Link>
            <Link to="/whatsapp-demo" className="btn-secondary text-base py-3.5 px-8">
              📱 See Farmer Demo
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="py-12 px-6 border-t border-dark-800/50">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-10">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-agri-500 to-emerald-600 flex items-center justify-center">🌾</div>
                <span className="font-bold text-white">Agri<span className="text-agri-400">Flow</span></span>
              </div>
              <p className="text-sm text-dark-500 leading-relaxed max-w-xs">
                India's first Agentic AI platform for agricultural supply chain intelligence. Built for FPOs, Governments, and AgriTech.
              </p>
              <p className="text-xs text-dark-600 mt-4">🇮🇳 Built for India · Powered by AGMARKNET Data</p>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white mb-3">Product</h4>
              <ul className="space-y-2 text-sm text-dark-500">
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><Link to="/pricing" className="hover:text-white transition-colors">Pricing</Link></li>
                <li><Link to="/api-docs" className="hover:text-white transition-colors">API Docs</Link></li>
                <li><Link to="/whatsapp-demo" className="hover:text-white transition-colors">Farmer Demo</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white mb-3">Company</h4>
              <ul className="space-y-2 text-sm text-dark-500">
                <li><a href="https://github.com/mohit-rathwa/AgriFlow" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">GitHub</a></li>
                <li><Link to="/login" className="hover:text-white transition-colors">Login</Link></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">Contact Sales</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-dark-800/50 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-xs text-dark-600">© 2026 AgriFlow. Built by Mohit Rathwa. MIT License.</p>
            <p className="text-xs text-dark-600">Data sourced from AGMARKNET (Government of India)</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
