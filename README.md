# YieldPulse — Fixed Deposit & Investment Yield Intelligence

A high-performance, responsive, and visually stunning web application built to track Fixed Deposits, Recurring Deposits, Sovereign Bonds, and other yield-bearing instruments. Features real-time daily earnings calculations, compounding schedules, maturity forecasting, and seamless deployment on **GitHub Pages** with **Supabase** cloud persistence.

---

## Key Features

- **Real-Time Daily Yield Engine**: Calculates exact daily accrued earnings across active deposits using both simple and compound interest (annual, semi-annual, quarterly, monthly, daily).
- **Accrued vs. Maturity Forecasting**: Live progress tracking of tenure, accrued return to date, and projected maturity value.
- **Supabase Cloud Database Integration**: Connect your Supabase PostgreSQL instance with full Row Level Security (RLS) support for cross-device sync.
- **Zero-Friction Offline/Local Mode**: Operates seamlessly in browser `localStorage` out of the box with zero configuration required.
- **Live Preview Calculator**: Visual dynamic preview inside the Add/Edit modal that computes daily and total returns as you type.
- **Analytics & Visualizations**:
  - Interactive Asset Allocation Doughnut Chart (by category).
  - Daily Inflow Distribution Bar Chart (by bank/institution).
  - Upcoming Maturities schedule tracker.
- **Multi-Currency Support**: Switch effortlessly between INR (₹), USD ($), EUR (€), GBP (£), CAD (CA$), AUD (AU$), SGD (S$), and AED.
- **Portfolio Data Portability**: One-click JSON export, import, and sample data restoration.
- **GitHub Pages Ready**: Pre-configured Vite relative asset bundling and automated GitHub Actions deployment workflow.

---

## System Architecture

```
Client (GitHub Pages Static Host)
  ├── React 18 + TypeScript SPA
  ├── Tailwind CSS + Lucide Icons + Chart.js
  ├── High-Precision Financial Math Engine
  └── Hybrid Data Layer
        ├── LocalStorage Adapter (Offline fallback)
        └── Supabase JS Client (PostgREST API)
              └── PostgreSQL Database with RLS
```

---

## Getting Started Locally

### Prerequisites
- Node.js 18+ and npm installed.

### Installation & Run
```bash
# Clone or navigate to the repository
cd yieldpulse

# Install dependencies
npm install

# Start development server
npm run dev
```

Visit `http://localhost:5173` in your browser.

---

## Deploying to GitHub Pages (2 Steps)

### Step 1: Push to GitHub
1. Initialize git and push this repository to GitHub:
   ```bash
   git init
   git add .
   git commit -m "Initial commit of YieldPulse"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<your-repo-name>.git
   git push -u origin main
   ```

### Step 2: Enable GitHub Pages
1. On GitHub, go to your repository **Settings** > **Pages**.
2. Under **Build and deployment** > **Source**, select **GitHub Actions**.
3. The included workflow `.github/workflows/deploy.yml` will automatically build and publish your site!

---

## Setting up Supabase Database

1. Create a free project at [supabase.com](https://supabase.com).
2. Go to the **SQL Editor** in your Supabase dashboard.
3. Copy and run the contents of [`supabase/schema.sql`](./supabase/schema.sql) (or click **Supabase** in the top navigation of the app and copy from the **SQL Schema Migration** tab).
4. Go to **Project Settings** > **API**.
5. Copy the **Project URL** and **anon public key**.
6. In YieldPulse, click the **Supabase** button in the header, paste your credentials, and click **Connect Supabase**.
7. Click **Push Local Data to Cloud** to migrate your current deposits to Supabase!

---

## Financial Calculation Models

### 1. Simple Interest (Payout Deposits)
- **Total Maturity Interest**: $I = P \times \frac{r}{100} \times \frac{\text{Days}}{365}$
- **Daily Earning**: $\text{Daily} = \frac{P \times (r / 100)}{365}$

### 2. Compound Interest (Cumulative FDs)
- **Maturity Amount**: $A = P \left(1 + \frac{r}{100 \cdot n}\right)^{n \cdot t}$
- **Marginal Daily Earning**:
  $$\Delta = P \left(1 + \frac{r}{100 \cdot n}\right)^{n \cdot (t + 1/365)} - P \left(1 + \frac{r}{100 \cdot n}\right)^{n \cdot t}$$
  where $n$ is compounding frequency (quarterly = 4, monthly = 12, etc.).

---

## License
MIT License
