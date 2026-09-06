import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'

type Message = {
  id: number
  from: 'bot' | 'farmer'
  text: string
  time: string
  lang?: 'hi' | 'en'
}

const DEMO_CONVERSATION: Message[] = [
  {
    id: 1, from: 'bot', lang: 'en', time: '09:15 AM',
    text: '🌾 *AgriFlow Alert*\n\n⚠️ *HIGH RISK — Onion Prices*\n\nLasalgaon Mandi: 84% probability of price drop in next 7 days.\n\n📉 Current: ₹2,450/quintal\n📉 Predicted: ₹1,400–1,700/quintal\n\n*Recommendation:* Hold stock. Transport on Day 8+.',
  },
  { id: 2, from: 'farmer', time: '09:18 AM', text: 'aaj bhav kya hai pyaaz ka?' },
  {
    id: 3, from: 'bot', lang: 'hi', time: '09:18 AM',
    text: '🧅 *आज का प्याज भाव — लासलगाव*\n\n📊 मोडल भाव: ₹2,450/क्विंटल\n📈 अधिकतम: ₹3,200/क्विंटल\n📉 न्यूनतम: ₹1,800/क्विंटल\n\n⚠️ *चेतावनी:* अगले 3-4 दिन में भाव गिरने की 84% संभावना है।\n\n*सलाह:* अभी माल न बेचें।',
  },
  { id: 4, from: 'farmer', time: '09:20 AM', text: 'Nashik ka bhav batao' },
  {
    id: 5, from: 'bot', lang: 'en', time: '09:20 AM',
    text: '🧅 *Nashik Mandi — Today\'s Price*\n\n📊 Modal: ₹2,100/quintal\n📈 Max: ₹2,800/quintal\n📉 Min: ₹1,600/quintal\n\n🟡 *Risk: MEDIUM* — Stable to -8% over 5 days\n\nTip: Lasalgaon ₹350 higher today.',
  },
  { id: 6, from: 'farmer', time: '09:22 AM', text: 'cold storage kahan milega?' },
  {
    id: 7, from: 'bot', lang: 'hi', time: '09:23 AM',
    text: '🏭 *कोल्ड स्टोरेज — नासिक ज़िला*\n\n✅ उपलब्ध: 3 कोल्ड स्टोरेज\n📦 खाली जगह: ~2,400 MT\n💰 दर: ₹12–18/क्विंटल/माह\n📞 APMC Nashik: 0253-2317642\n\n💡 20-25 दिन रुककर बेचें → ₹600-800 ज़्यादा मिलेंगे।',
  },
]

const QUICK_REPLIES = [
  { label: 'Today\'s onion price', value: 'aaj bhav kya hai pyaaz ka?' },
  { label: 'Nashik mandi rate', value: 'Nashik ka bhav batao' },
  { label: 'Cold storage info', value: 'cold storage kahan milega?' },
  { label: 'Next week forecast', value: 'agla hafta kaisa rahega?' },
  { label: 'MSP this year?', value: 'MSP kitna hai is saal?' },
]

const BOT_RESPONSES: Record<string, { text: string; lang: 'hi' | 'en' }> = {
  'agla hafta kaisa rahega?': {
    lang: 'hi',
    text: '📅 *अगले हफ्ते का अनुमान — प्याज*\n\n• सोम-मंगल: ₹2,200–2,400 (स्थिर)\n• बुध-गुरु: ⚠️ गिरावट संभव\n• शुक्र-शनि: ₹1,800–2,100\n\n*AI सटीकता: 88%*\n\n🔴 जोखिम: बुधवार-गुरुवार',
  },
  'MSP kitna hai is saal?': {
    lang: 'en',
    text: '📋 *MSP 2025-26*\n\n🌾 Wheat: ₹2,425/q (+5.4%)\n🍚 Paddy: ₹2,300/q (+4.5%)\n🟡 Mustard: ₹5,950/q\n🧅 Onion: Not under MSP\n\nAgriFlow: MSP raised market prices by avg ₹450/q (p<0.01)',
  },
}

const REAL_WORLD_STEPS = [
  {
    step: '01',
    icon: '📱',
    title: 'WhatsApp Business API',
    color: 'border-emerald-500/30 bg-emerald-500/5',
    tag: 'Free Testing',
    tagColor: 'bg-emerald-500/15 text-emerald-400',
    desc: 'Get a free WhatsApp Business API sandbox from Twilio or Meta for Developers. Takes 15 minutes to set up.',
    detail: 'Twilio Sandbox: Free 25 test conversations/day. Meta Cloud API: Free up to 1,000 conversations/month.',
    link: 'https://www.twilio.com/en-us/whatsapp',
    linkText: 'Start with Twilio Free →',
  },
  {
    step: '02',
    icon: '🤖',
    title: 'Connect Your AgriFlow Backend',
    color: 'border-blue-500/30 bg-blue-500/5',
    tag: 'Already Built',
    tagColor: 'bg-blue-500/15 text-blue-400',
    desc: 'Your FastAPI backend already has the AI agent endpoint. Add a /webhook route that receives WhatsApp messages and calls your agent.',
    detail: 'POST /webhook → Extract message → Call /api/agent/chat → Format response → Reply via Twilio API',
    link: 'https://agriflow-api-f97e.onrender.com/docs',
    linkText: 'View Your API Docs →',
  },
  {
    step: '03',
    icon: '🧪',
    title: 'Test With Your Own Number',
    color: 'border-purple-500/30 bg-purple-500/5',
    tag: '5 Minutes',
    tagColor: 'bg-purple-500/15 text-purple-400',
    desc: 'Send "join <sandbox-keyword>" to the Twilio sandbox number from your personal WhatsApp. Then text it anything.',
    detail: 'You\'ll see AgriFlow respond in real WhatsApp on your actual phone — not a mockup.',
    link: 'https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn',
    linkText: 'Open Twilio Console →',
  },
  {
    step: '04',
    icon: '🌾',
    title: 'Pilot With a Real FPO',
    color: 'border-amber-500/30 bg-amber-500/5',
    tag: 'Real World',
    tagColor: 'bg-amber-500/15 text-amber-400',
    desc: 'Find a local FPO (NABARD directory has 3.5 lakh registered). Share the WhatsApp number with 5-10 farmer members for a 1-week pilot.',
    detail: 'NABARD directory: nabard.org/FPO. Or contact your local Krishi Vigyan Kendra — they have direct FPO connections.',
    link: 'https://nabard.org',
    linkText: 'Find FPOs on NABARD →',
  },
]

export default function WhatsAppDemo() {
  const [messages, setMessages] = useState<Message[]>(DEMO_CONVERSATION.slice(0, 1))
  const [inputText, setInputText] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [demoRunning, setDemoRunning] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  const getTime = () => new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })

  const addBotReply = (text: string, lang: 'hi' | 'en' = 'en') => {
    setIsTyping(true)
    setTimeout(() => {
      setIsTyping(false)
      setMessages(prev => [...prev, { id: Date.now(), from: 'bot', text, time: getTime(), lang }])
    }, 1600)
  }

  const handleSend = (overrideText?: string) => {
    const msg = (overrideText ?? inputText).trim()
    if (!msg) return
    setMessages(prev => [...prev, { id: Date.now(), from: 'farmer', text: msg, time: getTime() }])
    setInputText('')
    const resp = BOT_RESPONSES[msg]
    if (resp) {
      addBotReply(resp.text, resp.lang)
    } else {
      addBotReply(`🤖 *AgriFlow Agent*\n\nProcessing: "${msg}"\n\nTry the quick replies below 👇`, 'en')
    }
  }

  const runAutoDemo = () => {
    if (demoRunning) return
    setDemoRunning(true)
    setMessages([DEMO_CONVERSATION[0]])
    let i = 1
    const step = () => {
      if (i >= DEMO_CONVERSATION.length) { setDemoRunning(false); return }
      const msg = DEMO_CONVERSATION[i]
      if (msg.from === 'farmer') {
        setTimeout(() => { setMessages(prev => [...prev, msg]); i++; step() }, 1400)
      } else {
        setIsTyping(true)
        setTimeout(() => {
          setIsTyping(false)
          setMessages(prev => [...prev, msg])
          i++
          setTimeout(step, 900)
        }, 1800)
      }
    }
    setTimeout(step, 800)
  }

  return (
    <div className="min-h-screen bg-dark-950 text-white">

      {/* ── NAV ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-dark-800/60 bg-dark-950/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-agri-500 to-emerald-600 flex items-center justify-center text-lg">🌾</div>
            <span className="text-lg font-bold">Agri<span className="text-agri-400">Flow</span></span>
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/" className="text-sm text-dark-400 hover:text-white transition-colors hidden sm:block">← Back to Home</Link>
            <Link to="/login" className="btn-primary text-sm py-2 px-4">Start Free Trial</Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="pt-32 pb-16 px-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 left-1/3 w-72 h-72 bg-emerald-500/6 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/3 w-64 h-64 bg-agri-500/5 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium mb-6">
            📱 Last-Mile Farmer Intelligence
          </div>
          <h1 className="text-4xl md:text-5xl font-black mb-5 leading-tight">
            AgriFlow on WhatsApp
            <br />
            <span className="bg-gradient-to-r from-emerald-400 to-agri-300 bg-clip-text text-transparent">
              In Hindi. On Any Phone.
            </span>
          </h1>
          <p className="text-dark-400 text-lg leading-relaxed max-w-xl mx-auto">
            Price crash warnings, mandi rates, and sell/hold advice — sent directly to farmers via WhatsApp.
            No app download. No internet data plan. Just a message.
          </p>
        </div>
      </section>

      {/* ── PHONE DEMO ── */}
      <section className="py-16 px-6">
        <div className="max-w-5xl mx-auto">

          {/* Label */}
          <div className="text-center mb-10">
            <p className="text-sm text-dark-500 uppercase tracking-widest font-medium">Interactive Demo — Try It</p>
            <h2 className="text-2xl font-bold mt-2">Real conversation, real data</h2>
          </div>

          {/* Centered phone + controls below */}
          <div className="flex flex-col items-center gap-10">

            {/* Phone mockup — large and breathing */}
            <div className="relative">
              <div className="w-[340px] rounded-[44px] border-[5px] border-dark-600 bg-dark-900 shadow-2xl shadow-black/60 overflow-hidden">

                {/* WhatsApp header bar */}
                <div className="bg-[#075e54] px-4 py-3 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#25d366] flex items-center justify-center text-sm font-bold text-white shadow-sm">AF</div>
                  <div className="flex-1">
                    <p className="text-white text-sm font-semibold leading-none">AgriFlow Bot</p>
                    <p className="text-white/60 text-[11px] mt-0.5">🟢 online — responds instantly</p>
                  </div>
                  <svg className="w-4 h-4 text-white/60" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
                  </svg>
                </div>

                {/* Chat area */}
                <div
                  className="bg-[#ece5dd] p-3 space-y-2.5 overflow-y-auto"
                  style={{ height: '440px', backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23000000\' fill-opacity=\'0.03\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }}
                >
                  {/* Date pill */}
                  <div className="flex justify-center">
                    <span className="text-[10px] text-gray-500 bg-white/60 px-3 py-0.5 rounded-full shadow-sm">Today</span>
                  </div>

                  {messages.map(msg => (
                    <div key={msg.id} className={`flex ${msg.from === 'farmer' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[82%] px-3 py-2 shadow-sm ${
                        msg.from === 'farmer'
                          ? 'bg-[#dcf8c6] rounded-2xl rounded-tr-sm'
                          : 'bg-white rounded-2xl rounded-tl-sm'
                      }`}>
                        <p className="text-[12px] text-gray-800 whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                        <p className={`text-[10px] mt-1 ${msg.from === 'farmer' ? 'text-right text-gray-500' : 'text-gray-400'}`}>
                          {msg.time} {msg.from === 'farmer' && <span className="text-blue-400">✓✓</span>}
                        </p>
                      </div>
                    </div>
                  ))}

                  {isTyping && (
                    <div className="flex justify-start">
                      <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                        <div className="flex gap-1 items-center">
                          {[0, 1, 2].map(i => (
                            <div key={i} className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.18}s` }} />
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Input bar */}
                <div className="bg-[#f0f0f0] px-3 py-2.5 flex items-center gap-2">
                  <div className="flex-1 bg-white rounded-full px-4 py-2 flex items-center shadow-sm">
                    <input
                      value={inputText}
                      onChange={e => setInputText(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleSend()}
                      placeholder="Type a message..."
                      className="flex-1 bg-transparent text-sm text-gray-700 outline-none placeholder-gray-400"
                    />
                  </div>
                  <button
                    onClick={() => handleSend()}
                    className="w-9 h-9 rounded-full bg-[#075e54] flex items-center justify-center shadow-sm hover:bg-[#128c7e] transition-colors"
                  >
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Ambient glow */}
              <div className="absolute -inset-6 bg-emerald-500/8 rounded-[60px] blur-3xl -z-10" />
            </div>

            {/* Controls below phone — breathing room */}
            <div className="w-full max-w-xl space-y-6 text-center">

              {/* Auto-play button */}
              <button
                onClick={runAutoDemo}
                disabled={demoRunning}
                className={`btn-primary mx-auto flex items-center gap-2 px-8 py-3 text-base ${demoRunning ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                <span>{demoRunning ? '⏳' : '▶'}</span>
                {demoRunning ? 'Playing conversation...' : 'Auto-play Full Demo'}
              </button>

              {/* Quick replies */}
              <div>
                <p className="text-xs text-dark-500 mb-3 uppercase tracking-widest">Or try these farmer queries</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {QUICK_REPLIES.map(r => (
                    <button
                      key={r.value}
                      onClick={() => handleSend(r.value)}
                      className="px-4 py-2 text-xs rounded-full bg-dark-800/70 border border-dark-700/60 text-dark-300 hover:border-emerald-500/50 hover:text-emerald-400 hover:bg-dark-800 transition-all duration-200"
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── WHAT FARMERS GET ── */}
      <section className="py-20 px-6 bg-dark-900/30">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold mb-2">What Every Farmer Gets</h2>
            <p className="text-dark-400">4 intelligence types, delivered as a simple WhatsApp message</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { icon: '⚠️', title: 'Price Crash Alert', desc: '5-7 days advance warning with confidence percentage. Sent proactively — no query needed.' },
              { icon: '📊', title: 'Today\'s Mandi Rate', desc: 'Modal, min, and max price from any of 7,500 mandis. In Hindi or English.' },
              { icon: '🏭', title: 'Cold Storage Info', desc: 'Available storage near them, rates per quintal, and APMC contact number.' },
              { icon: '💡', title: 'Sell or Hold?', desc: 'Simple data-backed decision: sell today vs wait X days. How much more they\'ll earn.' },
            ].map(item => (
              <div key={item.title} className="glass-card-hover p-6 text-center group">
                <div className="text-4xl mb-4 group-hover:scale-110 transition-transform duration-300">{item.icon}</div>
                <h3 className="font-semibold text-white text-sm mb-2">{item.title}</h3>
                <p className="text-xs text-dark-400 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW TO TEST IN REAL WORLD ── */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium mb-5">
              🛠️ Real World Deployment
            </div>
            <h2 className="text-3xl font-bold mb-3">How to Make This Actually Work</h2>
            <p className="text-dark-400 max-w-xl mx-auto">
              From this interactive demo to a real WhatsApp number that farmers can text — 4 concrete steps.
            </p>
          </div>

          <div className="space-y-5">
            {REAL_WORLD_STEPS.map(item => (
              <div key={item.step} className={`glass-card p-6 border ${item.color}`}>
                <div className="flex items-start gap-5">
                  {/* Step number */}
                  <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-dark-800/80 flex items-center justify-center">
                    <span className="text-2xl">{item.icon}</span>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <span className="text-xs font-bold text-dark-600">STEP {item.step}</span>
                      <h3 className="font-bold text-white text-base">{item.title}</h3>
                      <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${item.tagColor}`}>{item.tag}</span>
                    </div>
                    <p className="text-dark-300 text-sm leading-relaxed mb-2">{item.desc}</p>
                    <p className="text-dark-500 text-xs leading-relaxed mb-3">{item.detail}</p>
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-agri-400 hover:text-agri-300 hover:underline transition-colors"
                    >
                      {item.linkText}
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Cost breakdown */}
          <div className="mt-10 glass-card p-6 border border-dark-600/50">
            <h3 className="font-bold text-white mb-5">💰 Real Cost to Run This</h3>
            <div className="grid sm:grid-cols-3 gap-4">
              {[
                { label: 'Testing Phase', cost: 'Free', detail: 'Twilio sandbox — 25 messages/day, no charge', color: 'text-emerald-400' },
                { label: 'Pilot (50 farmers)', cost: '~₹500/mo', detail: 'WhatsApp API + Render backend hosting', color: 'text-amber-400' },
                { label: 'Scale (5,000 farmers)', cost: '~₹8,000/mo', detail: 'Meta API + dedicated server + Redis', color: 'text-blue-400' },
              ].map(item => (
                <div key={item.label} className="text-center p-4 bg-dark-900/60 rounded-xl">
                  <p className="text-xs text-dark-500 mb-1">{item.label}</p>
                  <p className={`text-2xl font-black mb-1 ${item.color}`}>{item.cost}</p>
                  <p className="text-xs text-dark-500">{item.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── WHY WHATSAPP ── */}
      <section className="py-16 px-6 bg-dark-900/30">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-8">🇮🇳 Why WhatsApp for Indian Farmers?</h2>
          <div className="grid sm:grid-cols-2 gap-4 text-left">
            {[
              { stat: '530M', label: 'WhatsApp users in India' },
              { stat: '95%', label: 'Smartphones already have it' },
              { stat: '₹3,000', label: 'Works on any Android phone' },
              { stat: '0', label: 'App downloads needed' },
              { stat: '500+', label: 'FPO members reached per broadcast' },
              { stat: '88%', label: 'Price crash prediction accuracy' },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-4 glass-card p-4">
                <span className="text-2xl font-black text-agri-400 w-20 flex-shrink-0">{item.stat}</span>
                <span className="text-sm text-dark-300">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-20 px-6 text-center">
        <div className="max-w-2xl mx-auto">
          <div className="text-5xl mb-6">🌾</div>
          <h2 className="text-3xl font-bold mb-4">Ready to Deploy This?</h2>
          <p className="text-dark-400 mb-8">Start with the dashboard, run your first ML analysis, then hook it up to WhatsApp.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/login" className="btn-primary py-3.5 px-8 text-base">
              Open Dashboard →
            </Link>
            <Link to="/api-docs" className="btn-secondary py-3.5 px-8 text-base">
              View API Docs
            </Link>
          </div>
        </div>
      </section>

    </div>
  )
}
