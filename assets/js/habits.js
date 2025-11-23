// ===================================
// Habits Module
// ===================================

let habitsData = [];

// Fetch habits from Supabase
async function fetchHabits() {
    try {
        const user = await getCurrentUser();
        if (!user) return;

        showLoading();

        const { data, error } = await supabase
            .from('habits')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        hideLoading();

        if (error) throw error;

        habitsData = data || [];

        // Fetch progress for each habit
        await fetchHabitsProgress();

    } catch (error) {
        hideLoading();
        showToast('Error loading habits: ' + error.message, 'error');
        console.error('Error fetching habits:', error);
    }
}

// Fetch habit progress
async function fetchHabitsProgress() {
    try {
        const user = await getCurrentUser();
        if (!user) return;

        const { data, error } = await supabase
            .from('habit_progress')
            .select('*')
            .eq('user_id', user.id);

        if (error) throw error;

        // Attach progress to habits
        habitsData.forEach(habit => {
            habit.progress = data.filter(p => p.habit_id === habit.id);
            habit.streak = calculateStreak(habit.progress);
        });

        renderHabits();

    } catch (error) {
        showToast('Error loading habit progress: ' + error.message, 'error');
        console.error('Error fetching habit progress:', error);
    }
}

// Calculate streak
function calculateStreak(progressArray) {
    if (!progressArray || progressArray.length === 0) return 0;

    // Sort by date descending
    const sorted = progressArray.sort((a, b) => new Date(b.date) - new Date(a.date));

    let streak = 0;
    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    for (let progress of sorted) {
        const progressDate = new Date(progress.date);
        progressDate.setHours(0, 0, 0, 0);

        const daysDiff = Math.floor((currentDate - progressDate) / (1000 * 60 * 60 * 24));

        if (daysDiff === streak) {
            streak++;
        } else {
            break;
        }
    }

    return streak;
}

// Add new habit
async function addHabit(habitData) {
    try {
        const user = await getCurrentUser();
        if (!user) return;

        showLoading();

        const { data, error } = await supabase
            .from('habits')
            .insert([{
                user_id: user.id,
                name: habitData.name,
                description: habitData.description
            }])
            .select();

        hideLoading();

        if (error) throw error;

        showToast('Habit added successfully!', 'success');
        closeModal();
        fetchHabits();

    } catch (error) {
        hideLoading();
        showToast('Error adding habit: ' + error.message, 'error');
        console.error('Error adding habit:', error);
    }
}

// Mark habit as done for today
async function markHabitDone(habitId) {
    try {
        const user = await getCurrentUser();
        if (!user) return;

        const today = getTodayDate();

        showLoading();

        // Check if already marked for today
        const { data: existing } = await supabase
            .from('habit_progress')
            .select('*')
            .eq('habit_id', habitId)
            .eq('user_id', user.id)
            .eq('date', today);

        if (existing && existing.length > 0) {
            showToast('Already marked for today!', 'info');
            hideLoading();
            return;
        }

        const { error } = await supabase
            .from('habit_progress')
            .insert([{
                habit_id: habitId,
                user_id: user.id,
                date: today
            }]);

        hideLoading();

        if (error) throw error;

        showToast('Great job! Habit marked as done!', 'success');
        fetchHabits();

    } catch (error) {
        hideLoading();
        showToast('Error marking habit: ' + error.message, 'error');
        console.error('Error marking habit:', error);
    }
}

// Delete habit
async function deleteHabit(habitId) {
    try {
        showLoading();

        // Delete progress first
        await supabase
            .from('habit_progress')
            .delete()
            .eq('habit_id', habitId);

        // Delete habit
        const { error } = await supabase
            .from('habits')
            .delete()
            .eq('id', habitId);

        hideLoading();

        if (error) throw error;

        showToast('Habit deleted successfully!', 'success');
        fetchHabits();

    } catch (error) {
        hideLoading();
        showToast('Error deleting habit: ' + error.message, 'error');
        console.error('Error deleting habit:', error);
    }
}

// Render habits
function renderHabits() {
    const container = document.getElementById('habits-list');
    if (!container) return;

    if (habitsData.length === 0) {
        container.innerHTML = `
            <div class="card" style="grid-column: 1 / -1; text-align: center; padding: 3rem;">
                <i class="fas fa-calendar-check" style="font-size: 3rem; opacity: 0.3; margin-bottom: 1rem;"></i>
                <p style="color: var(--text-secondary);">No habits found. Click "Add Habit" to create one!</p>
            </div>
        `;
        return;
    }

    container.innerHTML = habitsData.map(habit => `
        <div class="card habit-card" data-habit-id="${habit.id}">
            <div class="card-header">
                <div>
                    <h3 class="card-title">${habit.name}</h3>
                    ${habit.description ? `<p style="color: var(--text-secondary); font-size: 0.9rem; margin-top: 0.5rem;">${habit.description}</p>` : ''}
                </div>
                <div class="card-actions">
                    <button onclick="showHabitAnalytics('${habit.id}')" title="View Analytics" style="background: var(--accent-primary); color: white; padding: 0.5rem 1rem; border-radius: 8px; border: none; cursor: pointer;">
                        <i class="fas fa-chart-line"></i>
                    </button>
                    <button onclick="confirmDeleteHabit('${habit.id}')" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            
            ${habit.streak > 0 ? `
                <div class="streak-badge">
                    <i class="fas fa-fire"></i>
                    <span>${habit.streak} day${habit.streak !== 1 ? 's' : ''} streak!</span>
                </div>
            ` : ''}
            
            <div class="habit-progress">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                    <span style="color: var(--text-secondary); font-size: 0.9rem;">Progress</span>
                    <button class="btn btn-success btn-small" onclick="markHabitDone('${habit.id}')">
                        <i class="fas fa-check"></i> Mark Done
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

// Show add habit modal
function showAddHabitModal() {
    const modalContent = `
        <div class="modal-header">
            <h3><i class="fas fa-plus"></i> Add New Habit</h3>
            <button class="modal-close" onclick="closeModal()">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <form id="add-habit-form" class="auth-form">
            <div class="form-group">
                <label for="habit-name">Habit Name</label>
                <input type="text" id="habit-name" required placeholder="e.g., Morning Exercise">
            </div>
            <div class="form-group">
                <label for="habit-description">Description (Optional)</label>
                <textarea id="habit-description" rows="3" placeholder="Add details about this habit..." style="padding: 0.875rem 1rem; background: var(--bg-tertiary); border: 1px solid var(--border-color); border-radius: 12px; color: var(--text-primary); font-family: var(--font-family); resize: vertical;"></textarea>
            </div>
            <button type="submit" class="btn btn-primary">
                <i class="fas fa-plus"></i> Add Habit
            </button>
        </form>
    `;

    showModal(modalContent);

    // Add form submit handler
    document.getElementById('add-habit-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        await addHabit({
            name: document.getElementById('habit-name').value,
            description: document.getElementById('habit-description').value
        });
    });
}

// Confirm delete habit
function confirmDeleteHabit(habitId) {
    const modalContent = `
        <div class="modal-header">
            <h3><i class="fas fa-exclamation-triangle"></i> Confirm Delete</h3>
            <button class="modal-close" onclick="closeModal()">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <p style="margin: 1.5rem 0; color: var(--text-secondary);">
            Are you sure you want to delete this habit? All progress will be lost. This action cannot be undone.
        </p>
        <div style="display: flex; gap: 1rem; justify-content: flex-end;">
            <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
            <button class="btn btn-danger" onclick="deleteHabit(${habitId}); closeModal();">
                <i class="fas fa-trash"></i> Delete
            </button>
        </div>
    `;

    showModal(modalContent);
}

// ===================================
// Habit Analytics
// ===================================

let habitCompletionChart = null;
let habitStreakChart = null;
let habitFrequencyChart = null;

// Show habit analytics modal
function showHabitAnalytics(habitId) {
    const habit = habitsData.find(h => h.id === habitId);
    if (!habit) return;

    const modalContent = `
        <div class="modal-header">
            <h3><i class="fas fa-chart-line"></i> ${habit.name} - Analytics</h3>
            <button class="modal-close" onclick="closeModal()">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <div style="padding: 1.5rem;">
            <!-- Stats Summary -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem; margin-bottom: 2rem;">
                <div style="background: var(--bg-tertiary); padding: 1rem; border-radius: 12px; text-align: center;">
                    <div style="font-size: 2rem; font-weight: 700; color: #8b5cf6;" id="habit-current-streak">0</div>
                    <div style="color: var(--text-muted); font-size: 0.85rem;">Current Streak</div>
                </div>
                <div style="background: var(--bg-tertiary); padding: 1rem; border-radius: 12px; text-align: center;">
                    <div style="font-size: 2rem; font-weight: 700; color: #f59e0b;" id="habit-best-streak">0</div>
                    <div style="color: var(--text-muted); font-size: 0.85rem;">Best Streak</div>
                </div>
                <div style="background: var(--bg-tertiary); padding: 1rem; border-radius: 12px; text-align: center;">
                    <div style="font-size: 2rem; font-weight: 700; color: #10b981;" id="habit-completion-rate">0%</div>
                    <div style="color: var(--text-muted); font-size: 0.85rem;">Completion Rate</div>
                </div>
                <div style="background: var(--bg-tertiary); padding: 1rem; border-radius: 12px; text-align: center;">
                    <div style="font-size: 2rem; font-weight: 700; color: #3b82f6;" id="habit-total-completions">0</div>
                    <div style="color: var(--text-muted); font-size: 0.85rem;">Total Days</div>
                </div>
            </div>

            <!-- Charts -->
            <div style="display: grid; gap: 2rem;">
                <!-- Completion Chart (Last 30 days) -->
                <div style="background: var(--bg-tertiary); padding: 1.5rem; border-radius: 12px;">
                    <h4 style="margin-bottom: 1rem;">Last 30 Days</h4>
                    <div style="height: 200px;">
                        <canvas id="habit-completion-chart"></canvas>
                    </div>
                </div>

                <!-- Frequency Breakdown -->
                <div style="background: var(--bg-tertiary); padding: 1.5rem; border-radius: 12px;">
                    <h4 style="margin-bottom: 1rem;">Weekly Frequency</h4>
                    <div style="height: 200px;">
                        <canvas id="habit-frequency-chart"></canvas>
                    </div>
                </div>

                <!-- Streak Graph -->
                <div style="background: var(--bg-tertiary); padding: 1.5rem; border-radius: 12px;">
                    <h4 style="margin-bottom: 1rem;">Streak Progress</h4>
                    <div style="height: 200px;">
                        <canvas id="habit-streak-chart"></canvas>
                    </div>
                </div>
            </div>

            <!-- Reminder Settings -->
            <div style="background: var(--bg-tertiary); padding: 1.5rem; border-radius: 12px; margin-top: 2rem;">
                <h4 style="margin-bottom: 1rem;"><i class="fas fa-bell"></i> Reminder Settings</h4>
                <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem;">
                    <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                        <input type="checkbox" id="habit-reminder-enabled" ${habit.reminder_enabled ? 'checked' : ''}>
                        <span>Enable daily reminder</span>
                    </label>
                </div>
                <div style="display: flex; gap: 1rem; align-items: center;">
                    <label>Reminder Time:</label>
                    <input type="time" id="habit-reminder-time" value="${habit.reminder_time || '09:00'}" style="padding: 0.5rem; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 8px; color: var(--text-primary);">
                    <button onclick="saveHabitReminder('${habitId}')" class="btn btn-primary btn-small">
                        <i class="fas fa-save"></i> Save
                    </button>
                </div>
            </div>
        </div>
    `;

    showModal(modalContent);
    renderHabitAnalytics(habit);
}

// Render habit analytics
function renderHabitAnalytics(habit) {
    const progress = habit.progress || [];

    // Calculate stats
    const currentStreak = habit.streak || 0;
    const bestStreak = calculateBestStreak(progress);
    const totalCompletions = progress.length;

    // Calculate completion rate (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentProgress = progress.filter(p => new Date(p.date) >= thirtyDaysAgo);
    const completionRate = recentProgress.length > 0 ? ((recentProgress.length / 30) * 100).toFixed(1) : 0;

    // Update stats
    document.getElementById('habit-current-streak').textContent = currentStreak;
    document.getElementById('habit-best-streak').textContent = bestStreak;
    document.getElementById('habit-completion-rate').textContent = `${completionRate}%`;
    document.getElementById('habit-total-completions').textContent = totalCompletions;

    // Render charts
    renderCompletionChart(progress);
    renderFrequencyChart(progress);
    renderStreakChart(progress);
}

// Calculate best streak
function calculateBestStreak(progressArray) {
    if (!progressArray || progressArray.length === 0) return 0;

    const sorted = progressArray.sort((a, b) => new Date(a.date) - new Date(b.date));
    let bestStreak = 0;
    let currentStreak = 1;

    for (let i = 1; i < sorted.length; i++) {
        const prevDate = new Date(sorted[i - 1].date);
        const currDate = new Date(sorted[i].date);
        const daysDiff = Math.floor((currDate - prevDate) / (1000 * 60 * 60 * 24));

        if (daysDiff === 1) {
            currentStreak++;
        } else {
            bestStreak = Math.max(bestStreak, currentStreak);
            currentStreak = 1;
        }
    }

    return Math.max(bestStreak, currentStreak);
}

// Render completion chart (last 30 days)
function renderCompletionChart(progress) {
    const ctx = document.getElementById('habit-completion-chart');
    if (!ctx) return;

    if (habitCompletionChart) habitCompletionChart.destroy();

    // Generate last 30 days
    const labels = [];
    const data = [];
    const progressDates = new Set(progress.map(p => p.date));

    for (let i = 29; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
        data.push(progressDates.has(dateStr) ? 1 : 0);
    }

    habitCompletionChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Completed',
                data: data,
                backgroundColor: data.map(v => v === 1 ? '#10b981' : 'rgba(255,255,255,0.1)'),
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 1,
                    ticks: { stepSize: 1, callback: (v) => v === 1 ? '✓' : '' },
                    grid: { display: false }
                },
                x: { grid: { display: false } }
            }
        }
    });
}

// Render frequency chart (by day of week)
function renderFrequencyChart(progress) {
    const ctx = document.getElementById('habit-frequency-chart');
    if (!ctx) return;

    if (habitFrequencyChart) habitFrequencyChart.destroy();

    // Count by day of week
    const dayCount = [0, 0, 0, 0, 0, 0, 0]; // Sun-Sat
    progress.forEach(p => {
        const day = new Date(p.date).getDay();
        dayCount[day]++;
    });

    habitFrequencyChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
            datasets: [{
                label: 'Completions',
                data: dayCount,
                backgroundColor: '#8b5cf6',
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(255,255,255,0.05)' }
                },
                x: { grid: { display: false } }
            }
        }
    });
}

// Render streak chart (last 12 weeks)
function renderStreakChart(progress) {
    const ctx = document.getElementById('habit-streak-chart');
    if (!ctx) return;

    if (habitStreakChart) habitStreakChart.destroy();

    // Calculate weekly streaks for last 12 weeks
    const labels = [];
    const data = [];

    for (let i = 11; i >= 0; i--) {
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - (i * 7) - weekStart.getDay());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);

        labels.push(weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));

        // Count completions in this week
        const weekProgress = progress.filter(p => {
            const pDate = new Date(p.date);
            return pDate >= weekStart && pDate <= weekEnd;
        });

        data.push(weekProgress.length);
    }

    habitStreakChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Days Completed',
                data: data,
                borderColor: '#f59e0b',
                backgroundColor: 'rgba(245, 158, 11, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointRadius: 5,
                pointBackgroundColor: '#f59e0b'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 7,
                    ticks: { stepSize: 1 },
                    grid: { color: 'rgba(255,255,255,0.05)' }
                },
                x: { grid: { display: false } }
            }
        }
    });
}

// Save habit reminder
async function saveHabitReminder(habitId) {
    const enabled = document.getElementById('habit-reminder-enabled').checked;
    const time = document.getElementById('habit-reminder-time').value;

    try {
        showLoading();

        const { error } = await supabase
            .from('habits')
            .update({
                reminder_enabled: enabled,
                reminder_time: time
            })
            .eq('id', habitId);

        hideLoading();

        if (error) throw error;

        showToast('Reminder settings saved!', 'success');
        fetchHabits();

    } catch (error) {
        hideLoading();
        showToast('Error saving reminder: ' + error.message, 'error');
    }
}

// Initialize habits module
function initHabitsModule() {
    const addHabitBtn = document.getElementById('add-habit-btn');
    if (addHabitBtn) {
        addHabitBtn.addEventListener('click', showAddHabitModal);
    }
}

// Export functions
window.fetchHabits = fetchHabits;
window.addHabit = addHabit;
window.markHabitDone = markHabitDone;
window.deleteHabit = deleteHabit;
window.showAddHabitModal = showAddHabitModal;
window.confirmDeleteHabit = confirmDeleteHabit;
window.showHabitAnalytics = showHabitAnalytics;
window.saveHabitReminder = saveHabitReminder;
window.initHabitsModule = initHabitsModule;
