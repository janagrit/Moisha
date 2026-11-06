import React, { useState } from 'react';
import { MyListingConfig, ListingComp } from '../types';
import { Copy, Check, Terminal } from 'lucide-react';

interface AutomationExporterProps {
  myListing: MyListingConfig;
  comps: ListingComp[];
}

export const AutomationExporter: React.FC<AutomationExporterProps> = ({
  myListing,
  comps
}) => {
  const [activeTab, setActiveTab] = useState<'python' | 'make' | 'architecture'>('python');
  const [copied, setCopied] = useState(false);

  const compUrls = comps.map(c => `    "${c.airbnbUrl}", # ${c.name}`).join('\n');

  const pythonCode = `import os
import requests
from apify_client import ApifyClient
from google import genai

# ==========================================
# MOISHA: AUTONOMOUS AIRBNB PRICING AGENT
# Target: 1114 Florida Ave NE, Washington, DC 20002
# ==========================================

APIFY_TOKEN = os.getenv("APIFY_API_TOKEN", "YOUR_APIFY_TOKEN")
GEMINI_KEY = os.getenv("API_KEY", "YOUR_GEMINI_KEY")
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "YOUR_BOT_TOKEN")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID", "YOUR_CHAT_ID")

MY_LISTING_PRICE = ${myListing.currentPrice}
MY_FLOOR_PRICE = ${myListing.floorPrice}
CHECK_IN = "${myListing.targetCheckIn}"
CHECK_OUT = "${myListing.targetCheckOut}"

# Direct neighbor URLs on Florida Ave NE & H St NE
HANDPICKED_COMP_URLS = [
${compUrls}
]

apify_client = ApifyClient(APIFY_TOKEN)
ai = genai.Client(api_key=GEMINI_KEY)

def scrape_handpicked_comps():
    """Scrapes only the exact neighbor Airbnb URLs for 1114 Florida Ave NE."""
    run_input = {
        "startUrls": [{"url": url} for url in HANDPICKED_COMP_URLS],
        "checkIn": CHECK_IN,
        "checkOut": CHECK_OUT,
        "currency": "USD"
    }
    print("Moisha: Scraping direct Florida Ave comps via Apify...")
    run = apify_client.actor("dtrungtin/airbnb-scraper").call(run_input=run_input)
    
    comps = []
    for item in apify_client.dataset(run["defaultDatasetId"]).iterate_items():
        comps.append({
            "name": item.get("name"),
            "price": item.get("pricing", {}).get("rate", {}).get("amount"),
            "isBooked": item.get("isBooked", False),
            "rating": item.get("stars", 4.9)
        })
    return comps

def ask_moisha_pricing(comps):
    """Feeds live neighbor data into Gemini with Moisha's savvy advisor logic."""
    prompt = f"""
    You are Moisha, an expert Airbnb revenue advisor.
    My property at 1114 Florida Ave NE, DC 20002 is unbooked for {CHECK_IN} to {CHECK_OUT} at \${MY_LISTING_PRICE}/night.
    Hard safety floor: \${MY_FLOOR_PRICE}/night.
    Competitor pricing and availability: {comps}
    
    If neighbor undercutting or unbooked gap requires immediate price drop or promo,
    start with 'ALERT:' followed by the exact recommended price and advice.
    If competitive, respond with 'PASS'.
    """
    response = ai.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt
    )
    return response.text

def send_telegram_alert(message):
    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    payload = {"chat_id": TELEGRAM_CHAT_ID, "text": f"🏠 MOISHA REMINDER (1114 Florida Ave NE):\\n\\n{message}"}
    requests.post(url, json=payload)
    print("Alert pushed to Carlos via Telegram!")

if __name__ == "__main__":
    comps_data = scrape_handpicked_comps()
    decision = ask_moisha_pricing(comps_data)
    
    if decision.startswith("ALERT:"):
        print("Moisha triggered alert:", decision)
        send_telegram_alert(decision)
    else:
        print("Moisha: Market in equilibrium, PASS.")
`;

  const handleCopy = () => {
    navigator.clipboard.writeText(pythonCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white border border-[#E8DFD3] rounded-3xl p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-900 border border-amber-300 flex items-center justify-center text-lg shadow-xs">
            💻
          </div>
          <div>
            <h3 className="text-base font-serif font-bold text-blue-950">Moisha Autonomous Code Blueprint</h3>
            <p className="text-xs text-slate-500">Deploy Moisha on a Cron Job, Make.com, or AWS Lambda</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-[#FAF8F5] p-1 rounded-2xl border border-stone-200 text-xs font-mono">
            <button
              onClick={() => setActiveTab('python')}
              className={`px-3 py-1.5 rounded-xl transition-colors font-bold ${
                activeTab === 'python' ? 'bg-blue-700 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Python (Apify + Gemini)
            </button>
            <button
              onClick={() => setActiveTab('make')}
              className={`px-3 py-1.5 rounded-xl transition-colors font-bold ${
                activeTab === 'make' ? 'bg-blue-700 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Make.com No-Code
            </button>
            <button
              onClick={() => setActiveTab('architecture')}
              className={`px-3 py-1.5 rounded-xl transition-colors font-bold ${
                activeTab === 'architecture' ? 'bg-blue-700 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              4-Pillar Blueprint
            </button>
          </div>

          {activeTab === 'python' && (
            <button
              onClick={handleCopy}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white flex items-center gap-1.5 shadow-xs"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          )}
        </div>
      </div>

      {activeTab === 'python' && (
        <div className="relative">
          <pre className="bg-[#FAF8F5] border border-stone-200 rounded-2xl p-4 text-xs font-mono text-slate-800 overflow-x-auto max-h-96 leading-relaxed">
            {pythonCode}
          </pre>
        </div>
      )}

      {activeTab === 'make' && (
        <div className="bg-[#FAF8F5] border border-stone-200 rounded-2xl p-5 space-y-3.5 text-xs text-slate-700">
          <h4 className="text-sm font-serif font-bold text-blue-950">
            60-Minute No-Code Setup with Make.com & Apify
          </h4>
          <ol className="space-y-2.5 list-decimal list-inside leading-relaxed font-medium">
            <li>
              <strong>Apify Module:</strong> Add actor <code className="bg-stone-200 px-1 py-0.5 rounded text-blue-900">dtrungtin/airbnb-scraper</code> targeting your exact Florida Ave NE competitor URLs.
            </li>
            <li>
              <strong>Schedule Trigger:</strong> 8:00 AM every morning before DC travelers book weekend getaways.
            </li>
            <li>
              <strong>Gemini 2.5 Flash Module:</strong> Feed JSON scraped data into prompt: "Moisha, compare 1114 Florida Ave to neighbor prices for the upcoming 5 unbooked days..."
            </li>
            <li>
              <strong>Filter & Telegram/WhatsApp Module:</strong> If Moisha issues ALERT, message Carlos R. directly on his phone.
            </li>
          </ol>
        </div>
      )}

      {activeTab === 'architecture' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
          <div className="bg-[#FAF8F5] p-4 rounded-2xl border border-stone-200">
            <span className="font-mono text-blue-700 font-bold block mb-1">1. The Eyes (Data)</span>
            <p className="text-slate-600 leading-relaxed">
              Apify Airbnb Scraper pulling 1108 Florida Ave NE and direct street comps every morning.
            </p>
          </div>
          <div className="bg-[#FAF8F5] p-4 rounded-2xl border border-stone-200">
            <span className="font-mono text-amber-700 font-bold block mb-1">2. The Brain (Moisha)</span>
            <p className="text-slate-600 leading-relaxed">
              Gemini 2.5 Flash calculates optimal undercuts and 15% promotion badges to win bookings.
            </p>
          </div>
          <div className="bg-[#FAF8F5] p-4 rounded-2xl border border-stone-200">
            <span className="font-mono text-sky-700 font-bold block mb-1">3. The Clock (Trigger)</span>
            <p className="text-slate-600 leading-relaxed">
              Daily Cron at 8:00 AM EST to catch morning travel search spikes.
            </p>
          </div>
          <div className="bg-[#FAF8F5] p-4 rounded-2xl border border-stone-200">
            <span className="font-mono text-emerald-700 font-bold block mb-1">4. The Mouth (Alerts)</span>
            <p className="text-slate-600 leading-relaxed">
              Instant Telegram/WhatsApp push notifications with 1-click approvals for property manager Carlos.
            </p>
          </div>
        </div>
      )}

    </div>
  );
};
