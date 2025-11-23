// ===================================
// Navbar Dropdown & Navigation
// ===================================

// Toggle features dropdown
function toggleFeatures() {
    const menu = document.getElementById('features-menu');
    if (menu) {
        menu.classList.toggle('active');
    }
}

// Close features dropdown
function closeFeatures() {
    const menu = document.getElementById('features-menu');
    if (menu) {
        menu.classList.remove('active');
    }
}

// Show quick add modal
function showQuickAddModal() {
    const modalContent = `
        <div class="modal-header">
            <h3><i class="fas fa-plus"></i> Quick Add</h3>
            <button class="modal-close" onclick="closeModal()">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <div style="padding: 1.5rem;">
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem;">
                <button onclick="showCreateTaskModal(); closeModal();" class="btn btn-primary" style="padding: 1.5rem; flex-direction: column;">
                    <i class="fas fa-tasks" style="font-size: 2rem; margin-bottom: 0.5rem;"></i>
                    <div>New Task</div>
                </button>
                <button onclick="showCreateHabitModal(); closeModal();" class="btn btn-primary" style="padding: 1.5rem; flex-direction: column;">
                    <i class="fas fa-sync-alt" style="font-size: 2rem; margin-bottom: 0.5rem;"></i>
                    <div>New Habit</div>
                </button>
                <button onclick="showAddExpenseModal(); closeModal();" class="btn btn-primary" style="padding: 1.5rem; flex-direction: column;">
                    <i class="fas fa-wallet" style="font-size: 2rem; margin-bottom: 0.5rem;"></i>
                    <div>New Expense</div>
                </button>
                <button onclick="showCreateGoalModal(); closeModal();" class="btn btn-primary" style="padding: 1.5rem; flex-direction: column;">
                    <i class="fas fa-bullseye" style="font-size: 2rem; margin-bottom: 0.5rem;"></i>
                    <div>New Goal</div>
                </button>
                <button onclick="showCreateBudgetModal(); closeModal();" class="btn btn-primary" style="padding: 1.5rem; flex-direction: column;">
                    <i class="fas fa-chart-pie" style="font-size: 2rem; margin-bottom: 0.5rem;"></i>
                    <div>New Budget</div>
                </button>
                <button onclick="showCreateNoteModal(); closeModal();" class="btn btn-primary" style="padding: 1.5rem; flex-direction: column;">
                    <i class="fas fa-sticky-note" style="font-size: 2rem; margin-bottom: 0.5rem;"></i>
                    <div>New Note</div>
                </button>
            </div>
        </div>
    `;
    showModal(modalContent);
}

// Show messages (placeholder for future implementation)
function showMessages() {
    showToast('Messages feature coming soon!', 'info');
    // TODO: Implement messaging system
}

// Show notifications
function showNotifications() {
    const modalContent = `
        <div class="modal-header">
            <h3><i class="fas fa-bell"></i> Notifications</h3>
            <button class="modal-close" onclick="closeModal()">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <div style="padding: 1.5rem;">
            <div style="display: flex; flex-direction: column; gap: 1rem;">
                <div style="padding: 1rem; background: var(--bg-tertiary); border-radius: 12px; border-left: 3px solid #fbbf24;">
                    <div style="display: flex; justify-content: space-between; align-items: start;">
                        <div>
                            <strong>Budget Alert</strong>
                            <p style="margin: 0.5rem 0 0 0; color: var(--text-secondary); font-size: 0.9rem;">
                                You've exceeded your Food budget by ₹500
                            </p>
                        </div>
                        <span style="font-size: 0.75rem; color: var(--text-muted);">2h ago</span>
                    </div>
                </div>
                <div style="padding: 1rem; background: var(--bg-tertiary); border-radius: 12px; border-left: 3px solid #4ade80;">
                    <div style="display: flex; justify-content: space-between; align-items: start;">
                        <div>
                            <strong>Goal Achieved!</strong>
                            <p style="margin: 0.5rem 0 0 0; color: var(--text-secondary); font-size: 0.9rem;">
                                Congratulations! You've reached your savings goal.
                            </p>
                        </div>
                        <span style="font-size: 0.75rem; color: var(--text-muted);">1d ago</span>
                    </div>
                </div>
                <div style="padding: 1rem; background: var(--bg-tertiary); border-radius: 12px; border-left: 3px solid #a78bfa;">
                    <div style="display: flex; justify-content: space-between; align-items: start;">
                        <div>
                            <strong>Habit Streak</strong>
                            <p style="margin: 0.5rem 0 0 0; color: var(--text-secondary); font-size: 0.9rem;">
                                You're on a 7-day streak! Keep it up!
                            </p>
                        </div>
                        <span style="font-size: 0.75rem; color: var(--text-muted);">2d ago</span>
                    </div>
                </div>
            </div>
        </div>
    `;
    showModal(modalContent);
}

// Initialize navbar
function initNavbar() {
    // Features dropdown toggle
    const showFeaturesBtn = document.getElementById('show-features-btn');
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const featuresMenu = document.getElementById('features-menu');
    const searchInput = document.getElementById('navbar-search-input');

    if (showFeaturesBtn) {
        showFeaturesBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleFeatures();
        });
    }

    // Mobile menu toggle
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleFeatures();
        });
    }

    // Search functionality
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            if (query.length > 0) {
                // Filter tasks based on search query
                const taskItems = document.querySelectorAll('.task-item');
                taskItems.forEach(item => {
                    const text = item.textContent.toLowerCase();
                    if (text.includes(query)) {
                        item.style.display = '';
                    } else {
                        item.style.display = 'none';
                    }
                });
            } else {
                // Show all tasks when search is cleared
                const taskItems = document.querySelectorAll('.task-item');
                taskItems.forEach(item => {
                    item.style.display = '';
                });
            }
        });

        // Enter key to switch to tasks module
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && e.target.value.length > 0) {
                window.switchModule('tasks');
            }
        });
    }

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (featuresMenu && !e.target.closest('.features-dropdown')) {
            closeFeatures();
        }
    });

    // Update active tab on module switch
    document.addEventListener('moduleChanged', (e) => {
        const tabs = document.querySelectorAll('.navbar-tab');
        tabs.forEach(tab => {
            if (tab.dataset.module === e.detail.module) {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
        });
    });
}

// Export functions
window.toggleFeatures = toggleFeatures;
window.closeFeatures = closeFeatures;
window.showQuickAddModal = showQuickAddModal;
window.showMessages = showMessages;
window.showNotifications = showNotifications;
window.initNavbar = initNavbar;
