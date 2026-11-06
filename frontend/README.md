# 🕎 Moisha — Wise Pocket Airbnb Pricing & Promo Advisor

> **Autonomous AI revenue manager with Jewish real estate savvy for property managers.**
>
> Built for Carlos R. to protect revenue across two houses:
> 1. **House 1:** `1114 Florida Ave NE, Washington, DC 20002` (H Street Corridor / Near Northeast)
> 2. **House 2:** `418 8th St NE, Washington, DC 20002` (Capitol Hill North)

---

## 🚀 How to Push This Project to GitHub

Follow these quick terminal steps to upload this app to your GitHub account:

### 1. Create a New Repository on GitHub
1. Go to [GitHub.com/new](https://github.com/new).
2. Name your repository (e.g., `moisha-airbnb-advisor`).
3. Set it to **Public** or **Private**.
4. **Leave "Initialize this repository with a README" unchecked** (you already have this file!).
5. Click **Create repository**.

### 2. Push Your Local Project to GitHub
In your project directory, open your terminal and run:

```bash
# 1. Initialize Git repository
git init

# 2. Add all project files
git add .

# 3. Create initial commit
git commit -m "feat: Initial commit for Moisha Airbnb Advisor"

# 4. Rename current branch to main
git branch -M main

# 5. Connect your remote repository (replace YOUR_USERNAME and YOUR_REPO)
git remote add origin https://github.com/YOUR_USERNAME/moisha-airbnb-advisor.git

# 6. Push code to GitHub
git push -u origin main
```

---

## 💻 Local Development Setup

To test and run Moisha locally on your computer:

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Open `.env` and paste your Gemini API key:
```env
API_KEY=AIzaSy...your_gemini_api_key
```

### 3. Start Development Server
```bash
npm run dev
```
Open your browser at [http://localhost:3000](http://localhost:3000).

---

## 🌐 Deploy to Vercel or Netlify (1-Click)

### Option A: Vercel
1. Go to [vercel.com](https://vercel.com) and click **"Add New Project"**.
2. Select your `moisha-airbnb-advisor` GitHub repository.
3. In **Environment Variables**, add:
   * Key: `API_KEY`
   * Value: `your_gemini_api_key`
4. Click **Deploy**.

### Option B: Netlify
1. Go to [netlify.com](https://netlify.com) and import your GitHub repository.
2. Build command: `npm run build`
3. Publish directory: `dist`
4. Add environment variable `API_KEY` in **Site Settings > Environment Variables**.

---

## 🌟 Key Architecture & Features

* **Property Switching:** Switch between `1114 Florida Ave NE` and `418 8th St NE` in a single tap.
* **Orphan Vacancy Alert:** Detects the 5-day empty vacancy gap (`Apr 16 - Apr 21`) and calculates the $1,425 loss risk.
* **Competitor Sentinel:** Monitors neighbor at `1108 Florida Ave NE` ($215/night) and triggers optimal undercut recommendations.
* **Official Airbnb Promotions:** Recommends 15% Last-Minute and 4+ Night Length-of-Stay badges to trigger the strikethrough price boost in Airbnb search.
* **Live Search Grounding:** Queries real-time DC 20002 short-term rental market rates with Google Search Grounding.
* **Interactive Pocket Chat:** Real-time conversational AI copilot with Uncle Moisha's warm, shrewd Jewish commercial wit and 1-click execution chips.
* **Alerts & Dispatches:** Previews Telegram, SMS, and WhatsApp alerts for property manager Carlos R.
* **Deployment Exporters:** Complete standalone Python script (Apify + Gemini SDK) and Make.com / Zapier workflows for 8:00 AM automated Cron runs.

---

## 📜 License
MIT License. Built with Gemini 2.5 Flash, React 19, and Tailwind CSS.
