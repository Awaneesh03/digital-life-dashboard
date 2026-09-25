<div align="center">

# 🧭 Digital Life Dashboard

**One place to run your day — tasks, habits, expenses, budgets, goals, notes and bill-splitting with friends.**

[![Live Demo](https://img.shields.io/badge/Live_Demo-Visit_App-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://digital-life-dashboard-sepia.vercel.app)

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat-square&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat-square&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=black)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=flat-square&logo=supabase&logoColor=white)
![Chart.js](https://img.shields.io/badge/Chart.js-FF6384?style=flat-square&logo=chartdotjs&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-000000?style=flat-square&logo=vercel&logoColor=white)

[Features](#-features) · [Tech Stack](#-tech-stack) · [Getting Started](#-getting-started) · [Deployment](#-deployment)

</div>

---

## ✨ Features

| | Module | What it does |
|---|---|---|
| 📊 | **Dashboard** | Overview of tasks, habits and spending, recent activity and a Pomodoro focus timer |
| ✅ | **Tasks** | Categories, priorities, due dates, filters and search |
| 🔥 | **Habits** | Daily check-ins with streaks and progress charts |
| 💸 | **Expenses** | Category-wise tracking and monthly overview, receipt upload with **OCR** (Tesseract.js) |
| 🎯 | **Budgets** | Monthly budgets vs. actual spending |
| 🏁 | **Goals** | Set goals and track progress |
| 👥 | **Split expenses** | Friends & groups, equal or custom splits, "who owes whom" |
| 📝 | **Notes** | Quick personal notes |
| 🔔 | **Notifications** | In-app reminders |

All data is private to each user through Supabase Auth and **Row Level Security**.

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML5, CSS3, vanilla JavaScript (modular files, no framework) |
| Backend | [Supabase](https://supabase.com) — PostgreSQL, Auth, Storage, RLS |
| Charts | [Chart.js](https://www.chartjs.org) |
| OCR | [Tesseract.js](https://tesseract.projectnaptha.com) |
| Icons | Font Awesome |
| Hosting | [Vercel](https://vercel.com) |

## 🚀 Getting Started

### 1. Clone

```bash
git clone https://github.com/Awaneesh03/digital-life-dashboard.git
cd digital-life-dashboard
```

### 2. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. In the **SQL Editor**, run:
   - [`database-setup.sql`](database-setup.sql) — main tables
   - [`setup-friends-table.sql`](setup-friends-table.sql) — friends & groups for split expenses
   - `fix-*.sql` — RLS policy fixes, if you hit permission errors
3. Put your project URL and anon key in [`assets/js/supabaseClient.js`](assets/js/supabaseClient.js).

### 3. Run

```bash
npm run dev                      # serves on http://localhost:8080
# or
python3 -m http.server 8000      # http://localhost:8000
```

## ☁️ Deployment

The app is static, so it deploys to Vercel as-is:

1. Import the repo at [vercel.com/new](https://vercel.com/new) and click **Deploy**, **or**
2. Run `npx vercel` from the project folder.

More detail in [`DEPLOYMENT.md`](DEPLOYMENT.md).

## 📁 Project Structure

```text
digital-life-dashboard/
├── index.html                 # App shell & landing page
├── split-module.html          # Split-expenses module
├── assets/
│   ├── css/                   # style, dashboard, budgets, goals, split, navbar, landing
│   └── js/
│       ├── supabaseClient.js  # Supabase connection
│       ├── auth.js            # Sign-up / login
│       ├── dashboard.js       # Overview, charts, focus timer
│       ├── tasks.js · habits.js · expenses.js · budgets.js · goals.js · notes.js
│       ├── split.js           # Groups & bill splitting
│       ├── notifications.js · onboarding.js · sync.js · ui.js
├── database-setup.sql         # Database schema
├── setup-friends-table.sql    # Friends / groups schema
└── vercel.json                # Vercel config
```

---

## 👤 Author

**Awaneesh Gupta** — B.Tech CSE (AI) @ Vedam School of Technology

[![GitHub](https://img.shields.io/badge/GitHub-Awaneesh03-181717?style=flat-square&logo=github)](https://github.com/Awaneesh03)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-awaneesh--gupta-0A66C2?style=flat-square&logo=linkedin)](https://linkedin.com/in/awaneesh-gupta)

<p align="center"><sub>If you found this project useful, consider giving it a ⭐</sub></p>
