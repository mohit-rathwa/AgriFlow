import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'

type Message = {
  id: number
  from: 'bot' | 'farmer'
  text: string
  time: string
  lang?: 'hi' | 'en'
}

const DEMO_CONVERSATION: Message[] = [
  { id: 1, from: 'bot', text: '🌾 *AgriFlow Alert*\n\n⚠️ *HIGH RISK — Onion Prices*\n\nLasalgaon Mandi prediction for next 7 days shows 84% probability of price drop.\n\n📉 Current: ₹2,450/quintal\n📉 Predicted: ₹1,400–1,700/quintal\n\n*Recommendation:* Hold stock if possible. Transport on Day 8+.', time: '09:15 AM', lang: 'en' },
  { id: 2, from: 'farmer', text: 'aaj bhav kya hai pyaaz ka?', time: '09:18 AM' },
  { id: 3, from: 'bot', text: '🧅 *आज का प्याज भाव — लासलगाव*\n\n📊 मोडल भाव: ₹2,450/क्विंटल\n📈 अधिकतम: ₹3,200/क्विंटल\n📉 न्यूनतम: ₹1,800/क्विंटल\n\n⚠️ *चेतावनी:* अगले 3-4 दिन में भाव गिरने की 84% संभावना है।\n\n*सलाह:* अभी माल न बेचें। 7-8 दिन बाद बेचना ज़्यादा फ़ायदेमंद हो सकता है।', time: '09:18 AM', lang: 'hi' },
  { id: 4, from: 'farmer', text: 'Nashik ka bhav batao', time: '09:20 AM' },
  { id: 5, from: 'bot', text: '🧅 *Nashik Mandi — Today\'s Price*\n\n📊 Modal: ₹2,100/quintal\n📈 Max: ₹2,800/quintal\n📉 Min: ₹1,600/quintal\n\n🟡 *Risk Level: MEDIUM*\n5-day forecast: Stable to slight decline (-8%)\n\nCompare: Lasalgaon ₹350 higher today.', time: '09:20 AM', lang: 'en' },
  { id: 6, from: 'farmer', text: 'cold storage kitne din milega?', time: '09:22 AM' },
  { id: 7, from: 'bot', text: '🏭 *कोल्ड स्टोरेज जानकारी — नासिक ज़िला*\n\n✅ उपलब्ध: 3 कोल्ड स्टोरेज\n📦 खाली जगह: ~2,400 MT\n💰 दर: ₹12–18/क्विंटल/माह\n📞 APMC Nashik: 0253-2317642\n\n💡 AgriFlow अनुमान: 20-25 दिन रुककर बेचने पर ₹600-800/क्विंटल अधिक मिल सकता है।', time: '09:23 AM', lang: 'hi' },
]

const FARMER_REPLIES = [
  'aaj bhav kya hai pyaaz ka?',
  'Nashik ka bhav batao',
  'cold storage kitne din milega?',
  'agla hafta kaisa rahega?',
  'MSP kitna hai is saal?',
]

const BOT_RESPONSES: Record<string, Message> = {
  'agla hafta kaisa rahega?': { id: 99, from: 'bot', lang: 'hi', time: 'now', text: '📅 *अगले हफ्ते का अनुमान — प्याज*\n\n• सोम-मंगल: ₹2,200–2,400 (स्थिर)\n• बुध-गुरु: ⚠️ गिरावट संभव\n• शुक्र-शनि: ₹1,800–2,100\n\n*AI भविष्यवाणी सटीकता: 88%*\n\n🔴 ज़्यादा जोखिम वाले दिन: बुधवार-गुरुवार' },
  'MSP kitna hai is saal?': { id: 100, from: 'bot', lang: 'en', time: 'now', text: '📋 *MSP 2025-26*\n\n• 🌾 Wheat: ₹2,425/quintal (+5.4%)\n• 🍚 Paddy: ₹2,300/quintal (+4.5%)\n• 🟡 Mustard: ₹5,950/quintal\n• 🧅 Onion: Not under MSP\n\nAgriFlow analysis shows MSP raised actual market prices by avg ₹450/quintal (p<0.01)' },
}

export default function WhatsAppDemo() {
  const [messages, setMessages] = useState<Message[]>(DEMO_CONVERSATION.slice(0, 1))
  const [inputText, setInputText] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [demoIndex, setDemoIndex] = useState(1)
  const [demoRunning, setDemoRunning] = useState(false)

  const getTime = () => new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })

  const addBotReply = (text: string, lang: 'hi' | 'en' = 'en') => {
    setIsTyping(true)
    setTimeout(() => {
      setIsTyping(false)
      setMessages(prev => [...prev, { id: Date.now(), from: 'bot', text, time: getTime(), lang }])
    }, 1500)
  }

  const handleSend = () => {
    if (!inputText.trim()) return
    const msg = inputText.trim()
    setMessages(prev => [...prev, { id: Date.now(), from: 'farmer', text: msg, time: getTime() }])
    setInputText('')

    if (BOT_RESPONSES[msg]) {
      const r = BOT_RESPONSES[msg]
      addBotReply(r.text, r.lang)
    } else {
      addBotReply(`🤖 *AgriFlow Agent*\n\nQuery received: "${msg}"\n\nProcessing against 3.2M mandi records...\n\n*Try:* "aaj bhav kya hai" or "MSP kitna hai"`, 'en')
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
        setTimeout(() => { setMessages(prev => [...prev, msg]); i++; step() }, 1200)
      } else {
        setIsTyping(true)
        setTimeout(() => { setIsTyping(false); setMessages(prev => [...prev, msg]); i++; setTimeout(step, 800) }, 1800)
      }
    }
    setTimeout(step, 1000)
  }

  return (
    <div className="min-h-screen bg-dark-950 text-white">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-dark-800/60 bg-dark-950/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-agri-500 to-emerald-600 flex items-center justify-center text-lg">🌾</div>
            <span className="text-lg font-bold">Agri<span className="text-agri-400">Flow</span></span>
          </Link>
          <Link to="/login" className="btn-primary text-sm py-2 px-4">Start Free Trial</Link>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 pt-28 pb-20">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium mb-6">
            📱 Last-Mile Farmer Reach
          </div>
          <h1 className="text-4xl font-bold mb-4">WhatsApp Alerts for Farmers</h1>
          <p className="text-dark-400 text-lg max-w-2xl mx-auto">
            AgriFlow sends price crash warnings directly to farmers in Hindi via WhatsApp. No app download needed — just a simple SMS/WhatsApp on any phone.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-start">
          {/* Phone Mockup */}
          <div className="flex justify-center">
            <div className="relative">
              {/* Phone frame */}
              <div className="w-[320px] h-[620px] rounded-[40px] border-4 border-dark-600 bg-dark-900 shadow-2xl shadow-black/50 overflow-hidden relative">
                {/* Status bar */}
                <div className="bg-[#075e54] px-4 py-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button onClick={() => window.history.back()} className="text-white/70">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <div className="w-8 h-8 rounded-full bg-[#25d366] flex items-center justify-center text-sm font-bold text-white">AF</div>
                    <div>
                      <p className="text-white text-xs font-semibold">AgriFlow Bot</p>
                      <p className="text-white/60 text-[10px]">🟢 online</p>
                    </div>
                  </div>
                  <div className="flex gap-3 text-white/70">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>
                  </div>
                </div>

                {/* Chat area */}
                <div className="flex-1 bg-[#e5ddd5] h-[500px] overflow-y-auto p-3 space-y-2" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23000000\' fill-opacity=\'0.03\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }}>
                  {messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.from === 'farmer' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] rounded-2xl px-3 py-2 shadow-sm ${msg.from === 'farmer' ? 'bg-[#dcf8c6] rounded-br-sm' : 'bg-white rounded-bl-sm'}`}>
                        <p className="text-[11px] text-gray-800 whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                        <p className={`text-[9px] mt-1 ${msg.from === 'farmer' ? 'text-right text-gray-500' : 'text-gray-400'}`}>{msg.time} {msg.from === 'farmer' && '✓✓'}</p>
                      </div>
                    </div>
                  ))}
                  {isTyping && (
                    <div className="flex justify-start">
                      <div className="bg-white rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
                        <div className="flex gap-1">
                          {[0, 1, 2].map(i => <div key={i} className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Input bar */}
                <div className="bg-[#f0f0f0] px-2 py-2 flex items-center gap-2">
                  <div className="flex-1 bg-white rounded-full px-3 py-1.5 flex items-center">
                    <input
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                      placeholder="Type a message"
                      className="flex-1 bg-transparent text-xs text-gray-700 outline-none"
                    />
                  </div>
                  <button
                    onClick={handleSend}
                    className="w-8 h-8 rounded-full bg-[#075e54] flex items-center justify-center"
                  >
                    <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                  </button>
                </div>
              </div>

              {/* Glow */}
              <div className="absolute -inset-4 bg-emerald-500/5 rounded-[50px] blur-2xl -z-10" />
            </div>
          </div>

          {/* Info panel */}
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-3">Try It Yourself</h2>
              <p className="text-dark-400 leading-relaxed mb-5">
                Type in the phone on the left (or click the quick replies below). 
                The AgriFlow bot responds in Hindi and English, just like real farmers use it.
              </p>
              <div className="flex flex-wrap gap-2 mb-6">
                {FARMER_REPLIES.map((r) => (
                  <button key={r} onClick={() => { setInputText(r) }} className="px-3 py-1.5 text-xs rounded-full bg-dark-800/60 border border-dark-700/50 text-dark-300 hover:border-emerald-500/40 hover:text-emerald-400 transition-all">
                    {r}
                  </button>
                ))}
              </div>
              <button
                onClick={runAutoDemo}
                disabled={demoRunning}
                className="btn-primary flex items-center gap-2 disabled:opacity-50"
              >
                {demoRunning ? '▶ Playing demo...' : '▶ Auto-play Full Demo'}
              </button>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-white">What Farmers Get</h3>
              {[
                { icon: '⚠️', title: 'Price Crash Alerts', desc: 'Automated warning 5-7 days before predicted price drop with confidence %' },
                { icon: '📊', title: 'Today\'s Mandi Rates', desc: 'Current modal, min, and max prices from any mandi in India, in Hindi' },
                { icon: '🏭', title: 'Cold Storage Info', desc: 'Available cold storage, rates, and contact numbers in their district' },
                { icon: '💡', title: 'Sell/Hold Advice', desc: 'Simple data-backed recommendation: sell today or wait X days' },
              ].map((item) => (
                <div key={item.title} className="flex items-start gap-4 glass-card p-4">
                  <span className="text-2xl">{item.icon}</span>
                  <div>
                    <p className="font-medium text-white text-sm">{item.title}</p>
                    <p className="text-xs text-dark-400 mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="glass-card p-5 border border-emerald-500/20 bg-emerald-500/5">
              <h3 className="font-semibold text-white mb-2">🇮🇳 Why WhatsApp?</h3>
              <ul className="space-y-1.5 text-sm text-dark-300">
                <li>✓ 530 million WhatsApp users in India</li>
                <li>✓ Works on ₹3,000 Android phones</li>
                <li>✓ No app download — just a phone number</li>
                <li>✓ 95% of Indian smartphones have WhatsApp</li>
                <li>✓ FPO managers can broadcast to 500+ farmers at once</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
