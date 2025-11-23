// ===================================
// Dashboard Home Logic
// ===================================

let dashboardExpenseChart = null;
let dashboardHabitChart = null;
let timerInterval = null;
let timeLeft = 25 * 60; // 25 minutes in seconds
let isTimerRunning = false;

// Initialize Dashboard
async function initDashboard() {
    updateDashboardStats();
    setupTimer();
    renderDashboardCharts();
    loadRecentTasks();
}

// Update Stats Cards
function updateDashboardStats() {
    // Total Tasks
    const totalTasks = tasksData.length;
    const pendingTasks = tasksData.filter(t => !t.completed).length;

    // Habit Streak (Max streak found)
    let maxStreak = 0;
    if (habitsData && habitsData.length > 0) {
        maxStreak = Math.max(...habitsData.map(h => h.streak || 0));
    }

    // Total Expenses (Current Month)
    const currentMonth = new Date().toISOString().substring(0, 7);
    const monthlyExpenses = expensesData.filter(e => e.date.startsWith(currentMonth));
    const totalExpenses = monthlyExpenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);

    // Update DOM
    document.getElementById('stat-total-tasks').textContent = totalTasks;
    document.getElementById('stat-pending-tasks').textContent = pendingTasks;
    document.getElementById('stat-habit-streak').textContent = maxStreak;
    document.getElementById('stat-total-expenses').textContent = `₹${totalExpenses.toFixed(0)}`;
}

// Load Recent Tasks
function loadRecentTasks() {
    const container = document.getElementById('dashboard-recent-tasks');
    if (!container) return;

    const recentTasks = [...tasksData]
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 3);

    if (recentTasks.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:var(--text-muted);">No tasks yet.</p>';
        return;
    }

    container.innerHTML = recentTasks.map(task => `
        <div class="task-item-compact">
            <div class="task-icon">
                <i class="fas ${task.completed ? 'fa-check-circle' : 'fa-circle'}"></i>
            </div>
            <div class="task-details">
                <h4>${task.title}</h4>
                <span>${task.category} • ${formatDate(task.date)}</span>
            </div>
            <span class="task-status" style="color: ${task.completed ? 'var(--success)' : 'var(--warning)'}">
                ${task.completed ? 'Done' : 'Pending'}
            </span>
        </div>
    `).join('');
}

// Render Dashboard Charts
function renderDashboardCharts() {
    // Expense Chart (Mini)
    const expenseCtx = document.getElementById('dashboard-expense-chart');
    if (expenseCtx) {
        if (dashboardExpenseChart) dashboardExpenseChart.destroy();

        // Group by category
        const categoryData = {};
        expensesData.forEach(e => {
            categoryData[e.category] = (categoryData[e.category] || 0) + parseFloat(e.amount);
        });

        dashboardExpenseChart = new Chart(expenseCtx, {
            type: 'bar',
            data: {
                labels: Object.keys(categoryData),
                datasets: [{
                    label: 'Expenses',
                    data: Object.values(categoryData),
                    backgroundColor: 'rgba(102, 126, 234, 0.6)',
                    borderColor: 'rgba(102, 126, 234, 1)',
                    borderWidth: 1,
                    borderRadius: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' } },
                    x: { grid: { display: false } }
                }
            }
        });
    }

    // Habit Progress Chart (Donut)
    const habitCtx = document.getElementById('dashboard-habit-chart');
    if (habitCtx) {
        if (dashboardHabitChart) dashboardHabitChart.destroy();

        // Calculate completion rate (mock logic for demo: active vs total)
        // In real app, check habit_progress for today
        const totalHabits = habitsData.length;
        // For demo, let's assume 60% completion if no data
        const completedHabits = totalHabits > 0 ? Math.floor(totalHabits * 0.6) : 0;
        const rate = totalHabits > 0 ? Math.round((completedHabits / totalHabits) * 100) : 0;

        document.getElementById('habit-completion-rate').textContent = `${rate}%`;

        dashboardHabitChart = new Chart(habitCtx, {
            type: 'doughnut',
            data: {
                labels: ['Completed', 'Remaining'],
                datasets: [{
                    data: [rate, 100 - rate],
                    backgroundColor: ['#4ade80', 'rgba(255,255,255,0.1)'],
                    borderWidth: 0,
                    cutout: '75%'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } }
            }
        });
    }
}

// Setup Pomodoro Timer
function setupTimer() {
    const startBtn = document.getElementById('timer-start');
    const resetBtn = document.getElementById('timer-reset');
    const timerModes = document.querySelectorAll('.timer-mode-modern span');

    if (startBtn) {
        startBtn.addEventListener('click', toggleTimer);
    }

    if (resetBtn) {
        resetBtn.addEventListener('click', resetTimer);
    }

    // Add click handlers for timer modes
    timerModes.forEach((mode, index) => {
        mode.addEventListener('click', () => {
            // Remove active class from all modes
            timerModes.forEach(m => m.classList.remove('mode-active'));
            // Add active class to clicked mode
            mode.classList.add('mode-active');

            // Set timer based on mode
            if (index === 0) {
                // Focus mode - 25 minutes
                timeLeft = 25 * 60;
            } else {
                // Short Break mode - 5 minutes
                timeLeft = 5 * 60;
            }

            // Stop timer if running
            if (isTimerRunning) {
                toggleTimer();
            }

            // Update display
            updateTimerDisplay();
        });
    });

    updateTimerDisplay();
}

function toggleTimer() {
    const startBtn = document.getElementById('timer-start');

    if (isTimerRunning) {
        // Pause timer
        clearInterval(timerInterval);
        isTimerRunning = false;
        if (startBtn) {
            startBtn.innerHTML = '<i class="fas fa-play"></i>';
        }
    } else {
        // Start timer
        isTimerRunning = true;
        if (startBtn) {
            startBtn.innerHTML = '<i class="fas fa-pause"></i>';
        }

        timerInterval = setInterval(() => {
            timeLeft--;

            if (timeLeft <= 0) {
                clearInterval(timerInterval);
                isTimerRunning = false;
                if (startBtn) {
                    startBtn.innerHTML = '<i class="fas fa-play"></i>';
                }
                showToast('Timer completed! 🎉', 'success');

                // Play notification sound (optional)
                // new Audio('notification.mp3').play();
            }

            updateTimerDisplay();
        }, 1000);
    }
}

function resetTimer() {
    clearInterval(timerInterval);
    isTimerRunning = false;

    // Check which mode is active
    const focusMode = document.querySelector('.timer-mode-modern span.mode-active');
    if (focusMode && focusMode.textContent.includes('Focus')) {
        timeLeft = 25 * 60; // 25 minutes
    } else {
        timeLeft = 5 * 60; // 5 minutes
    }

    const startBtn = document.getElementById('timer-start');
    if (startBtn) {
        startBtn.innerHTML = '<i class="fas fa-play"></i>';
    }

    updateTimerDisplay();
}

function updateTimerDisplay() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;

    const minutesEl = document.getElementById('timer-minutes');
    const secondsEl = document.getElementById('timer-seconds');

    if (minutesEl) minutesEl.textContent = String(minutes).padStart(2, '0');
    if (secondsEl) secondsEl.textContent = String(seconds).padStart(2, '0');
}

// ===================================
// Advanced Analytics
// ===================================

let monthlyTrendsChart = null;
let categoryPieChart = null;
let weekdayWeekendChart = null;

// Initialize Advanced Analytics
async function initAdvancedAnalytics() {
    renderMonthlyTrends();
    renderCategoryPieChart();
    renderWeekdayWeekendAnalysis();
    calculateAnalyticsSummary();
}

// Calculate Monthly Trends (Last 6 months)
function renderMonthlyTrends() {
    const ctx = document.getElementById('monthly-trends-chart');
    if (!ctx) return;

    if (monthlyTrendsChart) monthlyTrendsChart.destroy();

    // Get last 6 months
    const months = [];
    const monthlyData = {};

    for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthKey = date.toISOString().substring(0, 7);
        const monthLabel = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        months.push(monthLabel);
        monthlyData[monthKey] = 0;
    }

    // Calculate expenses per month
    expensesData.forEach(expense => {
        const monthKey = expense.date.substring(0, 7);
        if (monthlyData.hasOwnProperty(monthKey)) {
            monthlyData[monthKey] += parseFloat(expense.amount);
        }
    });

    const data = Object.values(monthlyData);

    monthlyTrendsChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: months,
            datasets: [{
                label: 'Monthly Expenses',
                data: data,
                borderColor: '#8b5cf6',
                backgroundColor: 'rgba(139, 92, 246, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointRadius: 5,
                pointBackgroundColor: '#8b5cf6',
                pointBorderColor: '#fff',
                pointBorderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (context) => `₹${context.parsed.y.toFixed(2)}`
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: {
                        callback: (value) => `₹${value}`
                    }
                },
                x: { grid: { display: false } }
            }
        }
    });
}

// Render Category Pie Chart
function renderCategoryPieChart() {
    const ctx = document.getElementById('category-pie-chart');
    if (!ctx) return;

    if (categoryPieChart) categoryPieChart.destroy();

    // Group by category
    const categoryData = {};
    expensesData.forEach(e => {
        categoryData[e.category] = (categoryData[e.category] || 0) + parseFloat(e.amount);
    });

    const categories = Object.keys(categoryData);
    const amounts = Object.values(categoryData);

    categoryPieChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: categories,
            datasets: [{
                data: amounts,
                backgroundColor: [
                    '#667eea',
                    '#764ba2',
                    '#f093fb',
                    '#4facfe',
                    '#43e97b',
                    '#fa709a',
                    '#fee140',
                    '#30cfd0'
                ],
                borderColor: 'var(--bg-secondary)',
                borderWidth: 3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        color: '#ffffff', // Explicit white color for visibility
                        font: {
                            family: 'Inter',
                            size: 13,
                            weight: 500
                        },
                        padding: 12,
                        usePointStyle: true,
                        pointStyle: 'circle',
                        boxWidth: 12,
                        boxHeight: 12
                    }
                },
                tooltip: {
                    callbacks: {
                        label: (context) => {
                            const label = context.label || '';
                            const value = context.parsed || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${label}: ₹${value.toFixed(2)} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

// Render Weekday vs Weekend Analysis
function renderWeekdayWeekendAnalysis() {
    const ctx = document.getElementById('weekday-weekend-chart');
    if (!ctx) return;

    if (weekdayWeekendChart) weekdayWeekendChart.destroy();

    let weekdayTotal = 0;
    let weekendTotal = 0;
    let weekdayCount = 0;
    let weekendCount = 0;

    expensesData.forEach(expense => {
        const date = new Date(expense.date);
        const day = date.getDay();
        const amount = parseFloat(expense.amount);

        if (day === 0 || day === 6) { // Sunday or Saturday
            weekendTotal += amount;
            weekendCount++;
        } else {
            weekdayTotal += amount;
            weekdayCount++;
        }
    });

    const weekdayAvg = weekdayCount > 0 ? weekdayTotal / weekdayCount : 0;
    const weekendAvg = weekendCount > 0 ? weekendTotal / weekendCount : 0;

    weekdayWeekendChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Weekday Avg', 'Weekend Avg', 'Total Weekday', 'Total Weekend'],
            datasets: [{
                label: 'Amount (₹)',
                data: [weekdayAvg, weekendAvg, weekdayTotal, weekendTotal],
                backgroundColor: [
                    'rgba(59, 130, 246, 0.7)',
                    'rgba(236, 72, 153, 0.7)',
                    'rgba(16, 185, 129, 0.7)',
                    'rgba(245, 158, 11, 0.7)'
                ],
                borderColor: [
                    '#3b82f6',
                    '#ec4899',
                    '#10b981',
                    '#f59e0b'
                ],
                borderWidth: 2,
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (context) => `₹${context.parsed.y.toFixed(2)}`
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: {
                        callback: (value) => `₹${value}`
                    }
                },
                x: { grid: { display: false } }
            }
        }
    });
}

// Calculate Analytics Summary
function calculateAnalyticsSummary() {
    // Top spending category
    const categoryData = {};
    expensesData.forEach(e => {
        categoryData[e.category] = (categoryData[e.category] || 0) + parseFloat(e.amount);
    });

    const topCategory = Object.entries(categoryData).sort((a, b) => b[1] - a[1])[0];

    // Average daily spending
    const totalSpent = expensesData.reduce((sum, e) => sum + parseFloat(e.amount), 0);
    const daysWithExpenses = new Set(expensesData.map(e => e.date)).size;
    const avgDaily = daysWithExpenses > 0 ? totalSpent / daysWithExpenses : 0;

    // Update summary cards
    const topCategoryEl = document.getElementById('analytics-top-category');
    const avgDailyEl = document.getElementById('analytics-avg-daily');
    const totalTransactionsEl = document.getElementById('analytics-total-transactions');

    if (topCategoryEl && topCategory) {
        topCategoryEl.textContent = `${topCategory[0]} (₹${topCategory[1].toFixed(0)})`;
    }
    if (avgDailyEl) {
        avgDailyEl.textContent = `₹${avgDaily.toFixed(2)}`;
    }
    if (totalTransactionsEl) {
        totalTransactionsEl.textContent = expensesData.length;
    }
}

// Export Analytics as CSV
function exportAnalyticsCSV() {
    const csvData = [];
    csvData.push(['Date', 'Category', 'Amount', 'Description']);

    expensesData.forEach(expense => {
        csvData.push([
            expense.date,
            expense.category,
            expense.amount,
            expense.description || ''
        ]);
    });

    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    showToast('Analytics exported as CSV!', 'success');
}

// Export Analytics as PDF (using browser print)
function exportAnalyticsPDF() {
    showToast('Opening print dialog for PDF export...', 'info');
    setTimeout(() => {
        window.print();
    }, 500);
}

// Refresh all analytics
function refreshAnalytics() {
    renderMonthlyTrends();
    renderCategoryPieChart();
    renderWeekdayWeekendAnalysis();
    calculateAnalyticsSummary();
    showToast('Analytics refreshed!', 'success');
}

// Export
window.initDashboard = initDashboard;
window.updateDashboardStats = updateDashboardStats;
window.initAdvancedAnalytics = initAdvancedAnalytics;
window.exportAnalyticsCSV = exportAnalyticsCSV;
window.exportAnalyticsPDF = exportAnalyticsPDF;
window.refreshAnalytics = refreshAnalytics;
