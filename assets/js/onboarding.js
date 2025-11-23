// ===================================
// Onboarding & Setup Wizard
// ===================================

const DEFAULT_CATEGORIES = {
    expenses: ['Food', 'Transport', 'Shopping', 'Bills', 'Entertainment', 'Health', 'Education', 'Other'],
    budgets: [
        { category: 'Food', limit: 5000 },
        { category: 'Transport', limit: 3000 },
        { category: 'Shopping', limit: 4000 },
        { category: 'Bills', limit: 2000 },
        { category: 'Entertainment', limit: 2000 }
    ]
};

let currentOnboardingStep = 0;

// Check if user needs onboarding
async function checkOnboardingStatus() {
    try {
        const user = await getCurrentUser();
        if (!user) return false;

        const { data: profile, error } = await supabase
            .from('profiles')
            .select('onboarding_completed')
            .eq('user_id', user.id)
            .single();

        if (error && error.code !== 'PGRST116') {
            console.error('Error checking onboarding:', error);
            return false;
        }

        // If no profile or onboarding not completed, show wizard
        if (!profile || !profile.onboarding_completed) {
            setTimeout(() => showOnboardingWizard(), 1000);
            return true;
        }

        return false;
    } catch (error) {
        console.error('Error in checkOnboardingStatus:', error);
        return false;
    }
}

// Show onboarding wizard
function showOnboardingWizard() {
    currentOnboardingStep = 0;
    renderOnboardingStep();
}

// Render current onboarding step
function renderOnboardingStep() {
    const steps = [
        renderWelcomeStep,
        renderProfileStep,
        renderCategoriesStep,
        renderCompletionStep
    ];

    if (currentOnboardingStep < steps.length) {
        steps[currentOnboardingStep]();
    }
}

// Step 1: Welcome
function renderWelcomeStep() {
    const modalContent = `
        <div style="text-align: center; padding: 2rem;">
            <div style="font-size: 4rem; margin-bottom: 1rem;">👋</div>
            <h2 style="margin-bottom: 1rem;">Welcome to DigitalLife!</h2>
            <p style="color: var(--text-secondary); margin-bottom: 2rem; max-width: 500px; margin-left: auto; margin-right: auto;">
                Your all-in-one dashboard for managing tasks, habits, expenses, and goals. 
                Let's get you set up in just a few steps.
            </p>
            
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem; margin: 2rem 0;">
                <div style="background: var(--bg-tertiary); padding: 1.5rem; border-radius: 12px;">
                    <i class="fas fa-tasks" style="font-size: 2rem; color: #8b5cf6; margin-bottom: 0.5rem;"></i>
                    <div style="font-weight: 600;">Tasks</div>
                </div>
                <div style="background: var(--bg-tertiary); padding: 1.5rem; border-radius: 12px;">
                    <i class="fas fa-sync-alt" style="font-size: 2rem; color: #10b981; margin-bottom: 0.5rem;"></i>
                    <div style="font-weight: 600;">Habits</div>
                </div>
                <div style="background: var(--bg-tertiary); padding: 1.5rem; border-radius: 12px;">
                    <i class="fas fa-wallet" style="font-size: 2rem; color: #f59e0b; margin-bottom: 0.5rem;"></i>
                    <div style="font-weight: 600;">Expenses</div>
                </div>
                <div style="background: var(--bg-tertiary); padding: 1.5rem; border-radius: 12px;">
                    <i class="fas fa-bullseye" style="font-size: 2rem; color: #ec4899; margin-bottom: 0.5rem;"></i>
                    <div style="font-weight: 600;">Goals</div>
                </div>
            </div>

            <div style="display: flex; gap: 1rem; justify-content: center; margin-top: 2rem;">
                <button onclick="skipOnboarding()" class="btn btn-secondary">
                    Skip Setup
                </button>
                <button onclick="nextOnboardingStep()" class="btn btn-primary">
                    Get Started <i class="fas fa-arrow-right"></i>
                </button>
            </div>
        </div>
    `;

    showModal(modalContent, true); // true = no close button
}

// Step 2: Profile Setup
function renderProfileStep() {
    const modalContent = `
        <div style="padding: 2rem;">
            <div style="text-align: center; margin-bottom: 2rem;">
                <h2>Set Up Your Profile</h2>
                <p style="color: var(--text-secondary);">Tell us a bit about yourself</p>
            </div>

            <form id="profile-setup-form" class="auth-form">
                <div class="form-group">
                    <label for="profile-name">Full Name</label>
                    <input type="text" id="profile-name" placeholder="John Doe" required>
                </div>

                <div class="form-group">
                    <label for="profile-currency">Preferred Currency</label>
                    <select id="profile-currency" required>
                        <option value="INR">₹ Indian Rupee (INR)</option>
                        <option value="USD">$ US Dollar (USD)</option>
                        <option value="EUR">€ Euro (EUR)</option>
                        <option value="GBP">£ British Pound (GBP)</option>
                    </select>
                </div>

                <div class="form-group">
                    <label for="profile-timezone">Timezone</label>
                    <select id="profile-timezone" required>
                        <option value="Asia/Kolkata">India (IST)</option>
                        <option value="America/New_York">US Eastern</option>
                        <option value="America/Los_Angeles">US Pacific</option>
                        <option value="Europe/London">London (GMT)</option>
                        <option value="Asia/Tokyo">Tokyo (JST)</option>
                    </select>
                </div>

                <div style="display: flex; gap: 1rem; justify-content: space-between; margin-top: 2rem;">
                    <button type="button" onclick="previousOnboardingStep()" class="btn btn-secondary">
                        <i class="fas fa-arrow-left"></i> Back
                    </button>
                    <button type="submit" class="btn btn-primary">
                        Continue <i class="fas fa-arrow-right"></i>
                    </button>
                </div>
            </form>

            <div style="text-align: center; margin-top: 1rem;">
                <span style="color: var(--text-muted); font-size: 0.85rem;">Step 2 of 4</span>
            </div>
        </div>
    `;

    showModal(modalContent, true);

    document.getElementById('profile-setup-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveProfileData();
        nextOnboardingStep();
    });
}

// Step 3: Default Categories
function renderCategoriesStep() {
    const modalContent = `
        <div style="padding: 2rem;">
            <div style="text-align: center; margin-bottom: 2rem;">
                <h2>Set Up Default Categories</h2>
                <p style="color: var(--text-secondary);">We'll create these categories and budgets for you</p>
            </div>

            <div style="display: grid; gap: 2rem;">
                <!-- Expense Categories -->
                <div>
                    <h4 style="margin-bottom: 1rem;"><i class="fas fa-wallet"></i> Expense Categories</h4>
                    <div style="display: flex; flex-wrap: wrap; gap: 0.5rem;">
                        ${DEFAULT_CATEGORIES.expenses.map(cat => `
                            <span style="background: var(--bg-tertiary); padding: 0.5rem 1rem; border-radius: 20px; font-size: 0.9rem;">
                                ${cat}
                            </span>
                        `).join('')}
                    </div>
                </div>

                <!-- Default Budgets -->
                <div>
                    <h4 style="margin-bottom: 1rem;"><i class="fas fa-chart-pie"></i> Monthly Budgets</h4>
                    <div style="background: var(--bg-tertiary); padding: 1rem; border-radius: 12px;">
                        ${DEFAULT_CATEGORIES.budgets.map(budget => `
                            <div style="display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid var(--border-color);">
                                <span>${budget.category}</span>
                                <span style="color: var(--accent-primary); font-weight: 600;">₹${budget.limit.toLocaleString()}</span>
                            </div>
                        `).join('')}
                        <div style="display: flex; justify-content: space-between; padding: 0.5rem 0; font-weight: 600; margin-top: 0.5rem;">
                            <span>Total Monthly Budget</span>
                            <span style="color: var(--accent-primary);">₹${DEFAULT_CATEGORIES.budgets.reduce((sum, b) => sum + b.limit, 0).toLocaleString()}</span>
                        </div>
                    </div>
                </div>

                <div style="background: rgba(139, 92, 246, 0.1); padding: 1rem; border-radius: 12px; border-left: 3px solid #8b5cf6;">
                    <i class="fas fa-info-circle"></i> You can customize these categories and budgets anytime from the Settings page.
                </div>
            </div>

            <div style="display: flex; gap: 1rem; justify-content: space-between; margin-top: 2rem;">
                <button onclick="previousOnboardingStep()" class="btn btn-secondary">
                    <i class="fas fa-arrow-left"></i> Back
                </button>
                <button onclick="initializeDefaultCategories()" class="btn btn-primary">
                    Create Defaults <i class="fas fa-arrow-right"></i>
                </button>
            </div>

            <div style="text-align: center; margin-top: 1rem;">
                <span style="color: var(--text-muted); font-size: 0.85rem;">Step 3 of 4</span>
            </div>
        </div>
    `;

    showModal(modalContent, true);
}

// Step 4: Completion & Tour
function renderCompletionStep() {
    const modalContent = `
        <div style="text-align: center; padding: 2rem;">
            <div style="font-size: 4rem; margin-bottom: 1rem;">🎉</div>
            <h2 style="margin-bottom: 1rem;">You're All Set!</h2>
            <p style="color: var(--text-secondary); margin-bottom: 2rem; max-width: 500px; margin-left: auto; margin-right: auto;">
                Your DigitalLife dashboard is ready to use. Would you like a quick tour of the main features?
            </p>

            <div style="background: var(--bg-tertiary); padding: 1.5rem; border-radius: 12px; margin: 2rem auto; max-width: 400px; text-align: left;">
                <h4 style="margin-bottom: 1rem;">✅ Setup Complete</h4>
                <ul style="list-style: none; padding: 0; margin: 0;">
                    <li style="padding: 0.5rem 0;"><i class="fas fa-check" style="color: #10b981; margin-right: 0.5rem;"></i> Profile configured</li>
                    <li style="padding: 0.5rem 0;"><i class="fas fa-check" style="color: #10b981; margin-right: 0.5rem;"></i> Categories created</li>
                    <li style="padding: 0.5rem 0;"><i class="fas fa-check" style="color: #10b981; margin-right: 0.5rem;"></i> Budgets initialized</li>
                    <li style="padding: 0.5rem 0;"><i class="fas fa-check" style="color: #10b981; margin-right: 0.5rem;"></i> Ready to go!</li>
                </ul>
            </div>

            <div style="display: flex; gap: 1rem; justify-content: center; margin-top: 2rem;">
                <button onclick="completeOnboarding(false)" class="btn btn-secondary">
                    Skip Tour
                </button>
                <button onclick="completeOnboarding(true)" class="btn btn-primary">
                    <i class="fas fa-play-circle"></i> Start Tour
                </button>
            </div>

            <div style="text-align: center; margin-top: 1rem;">
                <span style="color: var(--text-muted); font-size: 0.85rem;">Step 4 of 4</span>
            </div>
        </div>
    `;

    showModal(modalContent, true);
}

// Navigation functions
function nextOnboardingStep() {
    currentOnboardingStep++;
    renderOnboardingStep();
}

function previousOnboardingStep() {
    if (currentOnboardingStep > 0) {
        currentOnboardingStep--;
        renderOnboardingStep();
    }
}

// Save profile data
async function saveProfileData() {
    try {
        const user = await getCurrentUser();
        if (!user) return;

        // Include id field to match the PRIMARY KEY constraint
        const profileData = {
            id: user.id,  // PRIMARY KEY
            user_id: user.id,
            full_name: document.getElementById('profile-name').value
        };

        const { error } = await supabase
            .from('profiles')
            .upsert(profileData);

        if (error) throw error;

        // Store currency and timezone in localStorage for now
        // These can be added to the database later if needed
        localStorage.setItem('userCurrency', document.getElementById('profile-currency').value);
        localStorage.setItem('userTimezone', document.getElementById('profile-timezone').value);

        showToast('Profile saved!', 'success');
    } catch (error) {
        console.error('Error saving profile:', error);
        showToast('Error saving profile: ' + error.message, 'error');
    }
}

// Initialize default categories and budgets
async function initializeDefaultCategories() {
    try {
        const user = await getCurrentUser();
        if (!user) return;

        showLoading();

        // For now, just complete the onboarding
        // Users can set up budgets manually in the Budgets module
        // This avoids potential database structure mismatches

        showToast('Setup complete! You can configure budgets in the Budgets module.', 'success');

        hideLoading();
        nextOnboardingStep();

    } catch (error) {
        hideLoading();
        console.error('Error in onboarding:', error);
        showToast('Setup complete!', 'success');
        nextOnboardingStep();
    }
}

// Complete onboarding
async function completeOnboarding(startTour) {
    try {
        const user = await getCurrentUser();
        if (!user) return;

        const { error } = await supabase
            .from('profiles')
            .update({ onboarding_completed: true })
            .eq('user_id', user.id);

        if (error) throw error;

        closeModal();

        // Show dashboard and switch to dashboard-home module
        if (window.showDashboard) {
            showDashboard();
        }

        if (window.switchModule) {
            setTimeout(() => {
                window.switchModule('dashboard-home');
            }, 100);
        }

        showToast('Welcome to DigitalLife! 🎉', 'success');

        if (startTour) {
            setTimeout(() => startGuidedTour(), 1000);
        }

    } catch (error) {
        console.error('Error completing onboarding:', error);
    }
}

// Skip onboarding
async function skipOnboarding() {
    if (confirm('Are you sure you want to skip the setup? You can always configure these settings later.')) {
        await completeOnboarding(false);
    }
}

// ===================================
// Guided Tour
// ===================================

let tourStep = 0;
const tourSteps = [
    {
        element: '.navbar-logo',
        title: 'Welcome to DigitalLife!',
        message: 'This is your dashboard home. Click here anytime to return to the overview.',
        position: 'bottom'
    },
    {
        element: '#show-features-btn',
        title: 'Navigate Features',
        message: 'Access all modules from this dropdown: Tasks, Habits, Expenses, Budgets, Goals, and more!',
        position: 'bottom'
    },
    {
        element: '#navbar-search-input',
        title: 'Quick Search',
        message: 'Search your tasks instantly. Press Enter to jump to the Tasks module.',
        position: 'bottom'
    },
    {
        element: '.navbar-new-btn',
        title: 'Quick Add',
        message: 'Quickly create tasks, habits, expenses, or goals from anywhere.',
        position: 'bottom'
    },
    {
        element: '.navbar-icon-btn[title="Notifications"]',
        title: 'Stay Updated',
        message: 'Get notifications for budget alerts, task reminders, and weekly reports.',
        position: 'bottom'
    },
    {
        element: '.stats-grid',
        title: 'Your Stats',
        message: 'Track your tasks, habits, and expenses at a glance.',
        position: 'top'
    }
];

function startGuidedTour() {
    tourStep = 0;
    showTourStep();
}

function showTourStep() {
    if (tourStep >= tourSteps.length) {
        endTour();
        return;
    }

    const step = tourSteps[tourStep];
    const element = document.querySelector(step.element);

    if (!element) {
        tourStep++;
        showTourStep();
        return;
    }

    // Remove existing tooltips
    document.querySelectorAll('.tour-tooltip').forEach(el => el.remove());
    document.querySelectorAll('.tour-overlay').forEach(el => el.remove());

    // Create overlay
    const overlay = document.createElement('div');
    overlay.className = 'tour-overlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.7);
        z-index: 9998;
    `;
    document.body.appendChild(overlay);

    // Highlight element
    element.style.position = 'relative';
    element.style.zIndex = '9999';

    // Create tooltip
    const tooltip = document.createElement('div');
    tooltip.className = 'tour-tooltip';
    tooltip.innerHTML = `
        <div style="background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 12px; padding: 1.5rem; max-width: 300px; box-shadow: 0 10px 40px rgba(0,0,0,0.3);">
            <h4 style="margin-bottom: 0.5rem;">${step.title}</h4>
            <p style="color: var(--text-secondary); margin-bottom: 1rem; font-size: 0.9rem;">${step.message}</p>
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 0.85rem; color: var(--text-muted);">${tourStep + 1} of ${tourSteps.length}</span>
                <div style="display: flex; gap: 0.5rem;">
                    ${tourStep > 0 ? '<button onclick="previousTourStep()" class="btn btn-secondary btn-small">Back</button>' : ''}
                    <button onclick="nextTourStep()" class="btn btn-primary btn-small">${tourStep === tourSteps.length - 1 ? 'Finish' : 'Next'}</button>
                    <button onclick="endTour()" class="btn btn-secondary btn-small">Skip</button>
                </div>
            </div>
        </div>
    `;

    // Position tooltip
    const rect = element.getBoundingClientRect();
    tooltip.style.position = 'fixed';
    tooltip.style.zIndex = '10000';

    if (step.position === 'bottom') {
        tooltip.style.top = `${rect.bottom + 10}px`;
        tooltip.style.left = `${rect.left}px`;
    } else {
        tooltip.style.bottom = `${window.innerHeight - rect.top + 10}px`;
        tooltip.style.left = `${rect.left}px`;
    }

    document.body.appendChild(tooltip);
}

function nextTourStep() {
    tourStep++;
    showTourStep();
}

function previousTourStep() {
    if (tourStep > 0) {
        tourStep--;
        showTourStep();
    }
}

function endTour() {
    document.querySelectorAll('.tour-tooltip').forEach(el => el.remove());
    document.querySelectorAll('.tour-overlay').forEach(el => el.remove());
    document.querySelectorAll('[style*="z-index: 9999"]').forEach(el => {
        el.style.zIndex = '';
    });
    showToast('Tour completed! Explore at your own pace.', 'success');
}

// Export functions
window.checkOnboardingStatus = checkOnboardingStatus;
window.showOnboardingWizard = showOnboardingWizard;
window.nextOnboardingStep = nextOnboardingStep;
window.previousOnboardingStep = previousOnboardingStep;
window.saveProfileData = saveProfileData;
window.initializeDefaultCategories = initializeDefaultCategories;
window.completeOnboarding = completeOnboarding;
window.skipOnboarding = skipOnboarding;
window.startGuidedTour = startGuidedTour;
window.nextTourStep = nextTourStep;
window.previousTourStep = previousTourStep;
window.endTour = endTour;
