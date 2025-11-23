// ===================================
// Notifications System
// ===================================

let notificationsData = [];

// Fetch notifications
async function fetchNotifications() {
    try {
        const user = await getCurrentUser();
        if (!user) return;

        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) throw error;

        notificationsData = data || [];
        updateNotificationBadge();
        return notificationsData;

    } catch (error) {
        console.error('Error fetching notifications:', error);
        return [];
    }
}

// Create notification
async function createNotification(type, title, message, data = null) {
    try {
        const user = await getCurrentUser();
        if (!user) return;

        const { error } = await supabase
            .from('notifications')
            .insert([{
                user_id: user.id,
                type: type,
                title: title,
                message: message,
                data: data
            }]);

        if (error) throw error;

        fetchNotifications();

    } catch (error) {
        console.error('Error creating notification:', error);
    }
}

// Mark notification as read
async function markNotificationRead(notificationId) {
    try {
        const { error } = await supabase
            .from('notifications')
            .update({ read: true })
            .eq('id', notificationId);

        if (error) throw error;

        fetchNotifications();

    } catch (error) {
        console.error('Error marking notification as read:', error);
    }
}

// Mark all as read
async function markAllNotificationsRead() {
    try {
        const user = await getCurrentUser();
        if (!user) return;

        const { error } = await supabase
            .from('notifications')
            .update({ read: true })
            .eq('user_id', user.id)
            .eq('read', false);

        if (error) throw error;

        showToast('All notifications marked as read', 'success');
        fetchNotifications();

    } catch (error) {
        console.error('Error marking all as read:', error);
    }
}

// Delete notification
async function deleteNotification(notificationId) {
    try {
        const { error } = await supabase
            .from('notifications')
            .delete()
            .eq('id', notificationId);

        if (error) throw error;

        fetchNotifications();

    } catch (error) {
        console.error('Error deleting notification:', error);
    }
}

// Update notification badge
function updateNotificationBadge() {
    const unreadCount = notificationsData.filter(n => !n.read).length;
    const badges = document.querySelectorAll('.navbar-icon-btn .badge');

    badges.forEach(badge => {
        if (badge.closest('.navbar-icon-btn[title="Notifications"]')) {
            badge.textContent = unreadCount;
            badge.style.display = unreadCount > 0 ? 'block' : 'none';
        }
    });
}

// Enhanced show notifications with real data
function showNotifications() {
    fetchNotifications().then(notifications => {
        const modalContent = `
            <div class="modal-header">
                <h3><i class="fas fa-bell"></i> Notifications</h3>
                <button class="modal-close" onclick="closeModal()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div style="padding: 1.5rem;">
                ${notifications.length > 0 ? `
                    <div style="display: flex; justify-content: space-between; margin-bottom: 1rem;">
                        <span style="color: var(--text-muted); font-size: 0.9rem;">${notifications.filter(n => !n.read).length} unread</span>
                        <button onclick="markAllNotificationsRead()" class="btn btn-secondary btn-small">
                            <i class="fas fa-check-double"></i> Mark all as read
                        </button>
                    </div>
                ` : ''}
                <div style="display: flex; flex-direction: column; gap: 1rem; max-height: 500px; overflow-y: auto;">
                    ${notifications.length === 0 ? `
                        <div style="text-align: center; padding: 3rem; color: var(--text-muted);">
                            <i class="fas fa-bell-slash" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.3;"></i>
                            <p>No notifications yet</p>
                        </div>
                    ` : notifications.map(notification => {
            const iconMap = {
                'weekly_report': 'fa-chart-line',
                'budget_alert': 'fa-exclamation-triangle',
                'expense_reminder': 'fa-money-bill-wave',
                'task_due': 'fa-calendar-check'
            };
            const colorMap = {
                'weekly_report': '#3b82f6',
                'budget_alert': '#ef4444',
                'expense_reminder': '#f59e0b',
                'task_due': '#8b5cf6'
            };
            return `
                            <div style="padding: 1rem; background: ${notification.read ? 'var(--bg-tertiary)' : 'rgba(139, 92, 246, 0.1)'}; border-radius: 12px; border-left: 3px solid ${colorMap[notification.type] || '#666'};">
                                <div style="display: flex; justify-content: space-between; align-items: start;">
                                    <div style="flex: 1;">
                                        <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                                            <i class="fas ${iconMap[notification.type] || 'fa-bell'}" style="color: ${colorMap[notification.type] || '#666'};"></i>
                                            <strong>${notification.title}</strong>
                                            ${!notification.read ? '<span style="background: #8b5cf6; color: white; font-size: 0.7rem; padding: 2px 6px; border-radius: 10px; margin-left: 0.5rem;">NEW</span>' : ''}
                                        </div>
                                        <p style="margin: 0.5rem 0 0 0; color: var(--text-secondary); font-size: 0.9rem;">
                                            ${notification.message}
                                        </p>
                                        <span style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.5rem; display: block;">
                                            ${formatDate(notification.created_at)}
                                        </span>
                                    </div>
                                    <div style="display: flex; gap: 0.5rem;">
                                        ${!notification.read ? `
                                            <button onclick="markNotificationRead('${notification.id}')" class="btn-icon" title="Mark as read">
                                                <i class="fas fa-check"></i>
                                            </button>
                                        ` : ''}
                                        <button onclick="deleteNotification('${notification.id}')" class="btn-icon" title="Delete">
                                            <i class="fas fa-trash"></i>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        `;
        }).join('')}
                </div>
            </div>
        `;
        showModal(modalContent);
    });
}

// ===================================
// Notification Generators
// ===================================

// Generate weekly report
async function generateWeeklyReport() {
    try {
        const user = await getCurrentUser();
        if (!user) return;

        // Calculate weekly stats
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);

        // Get expenses from last week
        const weekExpenses = expensesData.filter(e => new Date(e.date) >= weekAgo);
        const totalSpent = weekExpenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);

        // Get completed tasks
        const weekTasks = tasksData.filter(t => t.completed && new Date(t.updated_at) >= weekAgo);

        // Get habit completions
        const weekHabits = habitsData.reduce((count, habit) => {
            const weekProgress = (habit.progress || []).filter(p => new Date(p.date) >= weekAgo);
            return count + weekProgress.length;
        }, 0);

        const message = `This week: ₹${totalSpent.toFixed(0)} spent, ${weekTasks.length} tasks completed, ${weekHabits} habits tracked. Keep up the great work!`;

        await createNotification(
            'weekly_report',
            '📊 Your Weekly Summary',
            message,
            { totalSpent, tasksCompleted: weekTasks.length, habitsTracked: weekHabits }
        );

    } catch (error) {
        console.error('Error generating weekly report:', error);
    }
}

// Check budget alerts
async function checkBudgetAlerts() {
    try {
        const user = await getCurrentUser();
        if (!user) return;

        // Get current month budgets
        const currentMonth = new Date().toISOString().substring(0, 7);
        const monthBudgets = budgetsData.filter(b => b.month === currentMonth);

        for (const budget of monthBudgets) {
            const limits = budget.limits || [];

            for (const limit of limits) {
                if (limit.status === 'danger') {
                    // Check if we already sent an alert today
                    const today = new Date().toISOString().split('T')[0];
                    const existingAlert = notificationsData.find(n =>
                        n.type === 'budget_alert' &&
                        n.data?.category === limit.category &&
                        n.created_at.startsWith(today)
                    );

                    if (!existingAlert) {
                        const overspent = limit.spent - limit.limit;
                        await createNotification(
                            'budget_alert',
                            `⚠️ Budget Alert: ${limit.category}`,
                            `You've exceeded your ${limit.category} budget by ₹${overspent.toFixed(0)}. Current spending: ₹${limit.spent.toFixed(0)} / ₹${limit.limit.toFixed(0)}`,
                            { category: limit.category, overspent, spent: limit.spent, limit: limit.limit }
                        );
                    }
                }
            }
        }

    } catch (error) {
        console.error('Error checking budget alerts:', error);
    }
}

// Check shared expense reminders
async function checkExpenseReminders() {
    try {
        const user = await getCurrentUser();
        if (!user) return;

        // Get unsettled expense splits where user owes money
        const { data: unsettledSplits, error } = await supabase
            .from('expense_splits')
            .select(`
                *,
                shared_expenses (
                    description,
                    paid_by,
                    date
                )
            `)
            .eq('user_id', user.id)
            .eq('settled', false);

        if (error) throw error;

        // Check if reminder was sent in last 3 days
        const threeDaysAgo = new Date();
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

        for (const split of unsettledSplits || []) {
            const expenseDate = new Date(split.shared_expenses.date);
            const daysSince = Math.floor((new Date() - expenseDate) / (1000 * 60 * 60 * 24));

            // Send reminder if expense is more than 7 days old
            if (daysSince > 7) {
                const existingReminder = notificationsData.find(n =>
                    n.type === 'expense_reminder' &&
                    n.data?.split_id === split.id &&
                    new Date(n.created_at) >= threeDaysAgo
                );

                if (!existingReminder) {
                    await createNotification(
                        'expense_reminder',
                        '💰 Payment Reminder',
                        `You owe ₹${split.amount} for "${split.shared_expenses.description}" from ${daysSince} days ago. Please settle up!`,
                        { split_id: split.id, amount: split.amount, description: split.shared_expenses.description }
                    );
                }
            }
        }

    } catch (error) {
        console.error('Error checking expense reminders:', error);
    }
}

// Check task due reminders
async function checkTaskDueReminders() {
    try {
        const user = await getCurrentUser();
        if (!user) return;

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Get incomplete tasks due today or tomorrow
        const dueTasks = tasksData.filter(task => {
            if (task.completed) return false;
            const dueDate = new Date(task.date);
            dueDate.setHours(0, 0, 0, 0);
            return dueDate <= tomorrow;
        });

        for (const task of dueTasks) {
            const dueDate = new Date(task.date);
            dueDate.setHours(0, 0, 0, 0);
            const isToday = dueDate.getTime() === today.getTime();

            // Check if reminder already sent today
            const todayStr = new Date().toISOString().split('T')[0];
            const existingReminder = notificationsData.find(n =>
                n.type === 'task_due' &&
                n.data?.task_id === task.id &&
                n.created_at.startsWith(todayStr)
            );

            if (!existingReminder) {
                await createNotification(
                    'task_due',
                    isToday ? '📅 Task Due Today!' : '📅 Task Due Tomorrow',
                    `"${task.title}" is due ${isToday ? 'today' : 'tomorrow'}. Don't forget to complete it!`,
                    { task_id: task.id, title: task.title, due_date: task.date }
                );
            }
        }

    } catch (error) {
        console.error('Error checking task reminders:', error);
    }
}

// Run all notification checks
async function runNotificationChecks() {
    await checkBudgetAlerts();
    await checkExpenseReminders();
    await checkTaskDueReminders();
}

// Initialize notifications
function initNotifications() {
    // Fetch notifications on load
    fetchNotifications();

    // Run checks every 5 minutes
    setInterval(runNotificationChecks, 5 * 60 * 1000);

    // Run checks on load
    setTimeout(runNotificationChecks, 2000);
}

// Export functions
window.fetchNotifications = fetchNotifications;
window.createNotification = createNotification;
window.markNotificationRead = markNotificationRead;
window.markAllNotificationsRead = markAllNotificationsRead;
window.deleteNotification = deleteNotification;
window.showNotifications = showNotifications;
window.generateWeeklyReport = generateWeeklyReport;
window.checkBudgetAlerts = checkBudgetAlerts;
window.checkExpenseReminders = checkExpenseReminders;
window.checkTaskDueReminders = checkTaskDueReminders;
window.runNotificationChecks = runNotificationChecks;
window.initNotifications = initNotifications;
