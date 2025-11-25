// ===================================
// Main Application Controller
// ===================================

// Current active module
let currentModule = 'tasks';

// Load specific module
function loadModule(moduleName) {
    // Hide all modules
    document.querySelectorAll('.module').forEach(module => {
        module.classList.remove('active');
    });

    // Show selected module
    const selectedModule = document.getElementById(`${moduleName}-module`);
    if (selectedModule) {
        selectedModule.classList.add('active');
    }

    // Update navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });

    const selectedNav = document.querySelector(`[data-module="${moduleName}"]`);
    if (selectedNav) {
        selectedNav.classList.add('active');
    }

    // Load module data
    currentModule = moduleName;
    loadModuleData(moduleName);
}

// Load module data
function loadModuleData(moduleName) {
    switch (moduleName) {
        case 'tasks':
            fetchTasks();
            break;
        case 'habits':
            fetchHabits();
            break;
        case 'notes':
            fetchNotes();
            break;
        case 'expenses':
            fetchExpenses();
            break;
        case 'budgets':
            if (window.fetchBudgets) fetchBudgets();
            break;
        case 'goals':
            if (window.fetchGoals) fetchGoals();
            break;
        case 'split':
            if (window.fetchGroups) fetchGroups();
            break;
        case 'dashboard-home':
            if (window.initDashboard) initDashboard();
            if (window.initAdvancedAnalytics) initAdvancedAnalytics();
            break;
        case 'notes':
            if (window.fetchNotes) fetchNotes();
            break;
        case 'settings':
            loadUserInfo();
            break;
    }
}

// Initialize navigation
function initNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const module = item.getAttribute('data-module');
            if (module && window.switchModule) {
                window.switchModule(module);
            }
        });
    });
}

// Initialize settings
function initSettings() {
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('change', toggleTheme);
    }
}

// Initialize all modules
function initAllModules() {
    // Initialize all module-specific listeners
    if (window.initTasksModule) initTasksModule();
    if (window.initHabitsModule) initHabitsModule();
    if (window.initNotesModule) initNotesModule();
    if (window.initExpensesModule) initExpensesModule();
    if (window.initBudgetsModule) initBudgetsModule();
    if (window.initGoalsModule) initGoalsModule();
    if (window.initSplitExpensesModule) initSplitExpensesModule();
    if (window.initNotificationsModule) initNotificationsModule();

    // Fetch data for split expenses
    if (window.fetchGroups) fetchGroups();

    // Initialize notifications system
    if (window.initNotifications) initNotifications();

    // Initialize sync system for offline mode
    if (window.initSyncSystem) {
        initSyncSystem().then(() => {
            console.log('Sync system initialized');
        }).catch(error => {
            console.error('Sync system initialization error:', error);
        });
    }

    // Check if user needs onboarding
    if (window.checkOnboardingStatus) {
        setTimeout(() => checkOnboardingStatus(), 1500);
    }
}

// Initialize app
async function initApp() {
    // Initialize theme
    initTheme();

    // Initialize auth listeners - CRITICAL for landing page buttons
    if (window.initAuthListeners) {
        initAuthListeners();
    }

    // Check authentication state
    await checkAuthState();

    // Check for invite link in URL
    handleInviteLink();

    // Initialize navigation
    initNavigation();

    // Initialize all module listeners
    initAllModules();

    // Initialize settings
    initSettings();

    // Initialize navbar
    if (window.initNavbar) initNavbar();
}

// Handle invite link from URL
async function handleInviteLink() {
    const urlParams = new URLSearchParams(window.location.search);
    const inviteGroupId = urlParams.get('invite');
    const groupName = urlParams.get('group');

    if (inviteGroupId) {
        // Check if user is authenticated
        const user = await getCurrentUser();

        if (!user) {
            // Store invite info and redirect to login
            localStorage.setItem('pendingInvite', JSON.stringify({ groupId: inviteGroupId, groupName }));
            showToast('Please log in to accept the group invite', 'info');
            return;
        }

        // User is authenticated, process invite
        await processGroupInvite(inviteGroupId, groupName);

        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname);
    } else {
        // Check for pending invite after login
        const pendingInvite = localStorage.getItem('pendingInvite');
        if (pendingInvite) {
            const { groupId, groupName } = JSON.parse(pendingInvite);
            localStorage.removeItem('pendingInvite');

            const user = await getCurrentUser();
            if (user) {
                await processGroupInvite(groupId, groupName);
            }
        }
    }
}

// Process group invite
async function processGroupInvite(groupId, groupName) {
    try {
        const user = await getCurrentUser();
        if (!user) return;

        showLoading();

        // Check if user is already a member
        const { data: existingMember, error: checkError } = await supabase
            .from('group_members')
            .select('*')
            .eq('group_id', groupId)
            .eq('user_id', user.id)
            .single();

        if (existingMember) {
            hideLoading();
            showToast(`You're already a member of "${groupName}"!`, 'info');
            if (window.switchModule) switchModule('split');
            return;
        }

        // Add user to group
        const { error: insertError } = await supabase
            .from('group_members')
            .insert([{
                group_id: groupId,
                user_id: user.id
            }]);

        hideLoading();

        if (insertError) {
            console.error('Error joining group:', insertError);
            showToast('Error joining group: ' + insertError.message, 'error');
        } else {
            showToast(`Successfully joined "${groupName}"! 🎉`, 'success');
            // Switch to split expenses module
            if (window.switchModule) {
                setTimeout(() => switchModule('split'), 1000);
            }
        }

    } catch (error) {
        hideLoading();
        console.error('Error processing invite:', error);
        showToast('Error processing invite: ' + error.message, 'error');
    }
}

// Run when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

// Export functions
window.loadModule = loadModule;
window.initApp = initApp;
