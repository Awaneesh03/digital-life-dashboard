# Digital Life Dashboard

A comprehensive personal productivity dashboard for managing tasks, habits, expenses, budgets, goals, and more.

## Features

- 📋 **Task Management** - Create, organize, and track your daily tasks
- 🎯 **Habit Tracking** - Build and maintain positive habits with streak tracking
- 💰 **Expense Tracking** - Monitor your spending with category-based tracking
- 📊 **Budget Planning** - Set and manage monthly budgets
- 🎯 **Goal Setting** - Define and achieve your personal goals
- 👥 **Split Expenses** - Share and split bills with friends
- 📝 **Notes** - Keep all your notes organized
- ⏱️ **Focus Timer** - Pomodoro timer for productivity
- 📈 **Analytics** - Visualize your progress with charts and insights

## Tech Stack

- **Frontend**: HTML, CSS, JavaScript (Vanilla)
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Charts**: Chart.js
- **Hosting**: Vercel

## Getting Started

### Prerequisites

- A Supabase account
- Modern web browser

### Installation

1. Clone the repository
   ```bash
   git clone https://github.com/YOUR_USERNAME/digital-life-dashboard.git
   cd digital-life-dashboard
   ```

2. Set up Supabase
   - Create a new project at [supabase.com](https://supabase.com)
   - Run the SQL scripts in `database-setup.sql` in your Supabase SQL Editor
   - Run `setup-friends-table.sql` for split expenses feature

3. Configure Supabase credentials
   - Update `assets/js/config.js` with your Supabase URL and Anon Key

4. Run locally
   - Use Live Server in VS Code, or
   - Run `python3 -m http.server 8000`
   - Open `http://localhost:8000`

## Deployment

### Deploy to Vercel

1. **Via GitHub (Recommended)**
   - Push your code to GitHub
   - Go to [vercel.com/new](https://vercel.com/new)
   - Import your GitHub repository
   - Click Deploy

2. **Via Vercel CLI**
   ```bash
   npm install -g vercel
   vercel login
   vercel
   ```

3. **Via Drag & Drop**
   - Go to [vercel.com/new](https://vercel.com/new)
   - Drag and drop your project folder

## Project Structure

```
digital-life-dashboard/
├── index.html              # Main HTML file
├── assets/
│   ├── css/               # Stylesheets
│   │   ├── style.css
│   │   ├── dashboard.css
│   │   ├── dashboard-modern.css
│   │   └── ...
│   └── js/                # JavaScript files
│       ├── config.js      # Supabase configuration
│       ├── auth.js        # Authentication logic
│       ├── dashboard.js   # Dashboard functionality
│       ├── tasks.js       # Task management
│       ├── habits.js      # Habit tracking
│       ├── expenses.js    # Expense tracking
│       └── ...
├── database-setup.sql     # Database schema
├── setup-friends-table.sql # Friends table setup
└── vercel.json           # Vercel configuration
```

## Features in Detail

### Dashboard
- Overview of all your activities
- Quick stats (tasks, habits, expenses)
- Focus timer with Pomodoro technique
- Recent activity feed

### Task Management
- Create tasks with categories and priorities
- Set due dates and reminders
- Mark tasks as complete
- Filter and search tasks

### Habit Tracking
- Daily habit check-ins
- Streak tracking
- Visual progress indicators
- Habit analytics

### Expense Tracking
- Add expenses with categories
- Monthly expense overview
- Category-wise breakdown
- Budget vs actual spending

### Split Expenses
- Create groups for shared expenses
- Add members to groups
- Split bills equally or custom amounts
- Track who owes what

## Database Setup

Run these SQL scripts in your Supabase SQL Editor:

1. `database-setup.sql` - Creates all main tables
2. `setup-friends-table.sql` - Creates friends table for split expenses

## Security

- Row Level Security (RLS) enabled on all tables
- User authentication required for all features
- Secure API keys (use environment variables in production)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is open source and available under the MIT License.

## Support

For support, please open an issue in the GitHub repository.

## Acknowledgments

- Built with [Supabase](https://supabase.com)
- Charts powered by [Chart.js](https://www.chartjs.org)
- Icons from [Font Awesome](https://fontawesome.com)
- Deployed on [Vercel](https://vercel.com)
