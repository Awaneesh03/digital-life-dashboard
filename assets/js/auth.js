// ===================================
// Authentication Module
// ===================================

// Handle user signup
async function handleSignup(email, password) {
    try {
        showLoading();

        const { data, error } = await supabase.auth.signUp({
            email: email,
            password: password,
        });

        hideLoading();

        if (error) throw error;

        showToast('Account created successfully! Please check your email for verification.', 'success');

        // Switch to login screen
        setTimeout(() => {
            switchToLogin();
        }, 2000);

        return data;
    } catch (error) {
        hideLoading();
        showToast(error.message, 'error');
        console.error('Signup error:', error);
        return null;
    }
}

// Handle user login
// Handle user login
async function handleLogin(email, password, rememberMe = false) {
    try {
        showLoading();

        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password,
        });

        hideLoading();

        if (error) throw error;

        // Remember email for next time (not password for security)
        localStorage.setItem('rememberedEmail', email);

        // If Remember Me is checked, extend session to 30 days
        if (rememberMe) {
            localStorage.setItem('rememberMe', 'true');
            // Supabase will handle the extended session automatically
        } else {
            localStorage.removeItem('rememberMe');
        }

        showToast('Login successful!', 'success');

        // Show dashboard
        showDashboard();

        // Switch to dashboard module instead of tasks
        if (window.switchModule) {
            window.switchModule('dashboard-home');
        }

        // Load all module data
        if (window.fetchTasks) await window.fetchTasks();
        if (window.fetchHabits) await window.fetchHabits();
        if (window.fetchNotes) await window.fetchNotes();
        if (window.fetchExpenses) await window.fetchExpenses();

        // Initialize dashboard
        if (window.initDashboard) window.initDashboard();

        return data;
    } catch (error) {
        hideLoading();
        showToast(error.message, 'error');
        console.error('Login error:', error);
        return null;
    }
}

// Handle Google OAuth login
async function handleGoogleLogin() {
    try {
        showLoading();

        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin + window.location.pathname
            }
        });

        hideLoading();

        if (error) throw error;

        // The user will be redirected to Google for authentication
        // After successful auth, they'll be redirected back to the app

    } catch (error) {
        hideLoading();
        showToast(error.message, 'error');
        console.error('Google login error:', error);
    }
}

// Handle user logout
async function handleLogout() {
    try {
        showLoading();

        const { error } = await supabase.auth.signOut();

        hideLoading();

        if (error) throw error;

        showToast('Logged out successfully', 'success');

        // Show auth screen
        showAuthScreen();

    } catch (error) {
        hideLoading();
        showToast(error.message, 'error');
        console.error('Logout error:', error);
    }
}

// Check if user is logged in and show appropriate screen
async function checkAuthState() {
    const user = await getCurrentUser();

    if (user) {
        showDashboard();
    } else {
        showAuthScreen();
    }
}

// Show dashboard
function showDashboard() {
    document.getElementById('auth-container').style.display = 'none';
    document.getElementById('dashboard-container').style.display = 'flex';

    // Load initial module (tasks)
    loadModule('tasks');

    // Load user info in settings
    loadUserInfo();
}

// Show auth screen
function showAuthScreen() {
    document.getElementById('auth-container').style.display = 'flex';
    document.getElementById('dashboard-container').style.display = 'none';
}

// Switch to signup screen
function switchToSignup() {
    document.getElementById('login-screen').classList.remove('active');
    document.getElementById('signup-screen').classList.add('active');
}

// Switch to login screen
function switchToLogin() {
    document.getElementById('signup-screen').classList.remove('active');
    document.getElementById('login-screen').classList.add('active');
}

// Helper to show login screen (combines showAuthScreen and switchToLogin)
function showLoginScreen() {
    showAuthScreen();
    switchToLogin();
}

// Check authentication state
async function checkAuthState() {
    try {
        const { data: { session } } = await supabase.auth.getSession();

        if (session) {
            // User is logged in - show dashboard
            currentUser = session.user;
            showDashboard();

            // Switch to dashboard module instead of tasks
            if (window.switchModule) {
                window.switchModule('dashboard-home');
            }

            // Load user info
            loadUserInfo();

            // Load initial data
            if (window.fetchTasks) fetchTasks();
            if (window.fetchHabits) fetchHabits();
            if (window.fetchNotes) fetchNotes();
            if (window.fetchExpenses) fetchExpenses();
            if (window.initDashboard) initDashboard();
        } else {
            // User is NOT logged in - show landing page ONLY
            showLandingPage();
        }
    } catch (error) {
        console.error('Auth state check error:', error);
        // On error, show landing page for security
        showLandingPage();
    }
}

// Initialize auth state listener
function initAuthStateListener() {
    supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN') {
            showDashboard();
            if (window.switchModule) {
                window.switchModule('dashboard-home');
            }
        } else if (event === 'SIGNED_OUT') {
            showLandingPage();
        }
    });
}

// Show Landing Page
function showLandingPage() {
    const landingPage = document.getElementById('landing-page');
    const authContainer = document.getElementById('auth-container');
    const dashboardContainer = document.getElementById('dashboard-container');
    const loadingIndicator = document.getElementById('loading-indicator');

    if (landingPage) landingPage.style.display = 'block';
    if (authContainer) authContainer.style.display = 'none';
    if (dashboardContainer) dashboardContainer.style.display = 'none';
    if (loadingIndicator) loadingIndicator.style.display = 'none';
}

// Load user info
async function loadUserInfo() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        // Update settings page email
        const emailElement = document.getElementById('user-email');
        if (emailElement) {
            emailElement.textContent = user.email;
        }

        // Update sidebar mini profile
        const emailMiniElement = document.getElementById('user-email-mini');
        if (emailMiniElement) {
            emailMiniElement.textContent = user.email;
        }
    }
}

// Initialize auth listeners
function initAuthListeners() {
    // Auto-fill remembered email
    const loginEmailInput = document.getElementById('login-email');
    const rememberMeCheckbox = document.getElementById('remember-me');

    if (loginEmailInput) {
        const rememberedEmail = localStorage.getItem('rememberedEmail');
        if (rememberedEmail) {
            loginEmailInput.value = rememberedEmail;
            // Focus on password field for faster login
            const loginPasswordInput = document.getElementById('login-password');
            if (loginPasswordInput) {
                setTimeout(() => loginPasswordInput.focus(), 100);
            }
        }
    }

    // Auto-check Remember Me if previously used
    if (rememberMeCheckbox) {
        const rememberMe = localStorage.getItem('rememberMe');
        if (rememberMe === 'true') {
            rememberMeCheckbox.checked = true;
        }
    }

    // Login form
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            const rememberMe = document.getElementById('remember-me')?.checked || false;
            await handleLogin(email, password, rememberMe);
        });
    }

    // Signup form
    const signupForm = document.getElementById('signup-form');
    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('signup-email').value;
            const password = document.getElementById('signup-password').value;
            const confirmPassword = document.getElementById('signup-password-confirm').value;

            if (password !== confirmPassword) {
                showToast('Passwords do not match', 'error');
                return;
            }

            await handleSignup(email, password);
        });
    }

    // Google login buttons
    const googleLoginBtn = document.getElementById('google-login-btn');
    if (googleLoginBtn) {
        googleLoginBtn.addEventListener('click', async () => {
            await handleGoogleLogin();
        });
    }

    const googleSignupBtn = document.getElementById('google-signup-btn');
    if (googleSignupBtn) {
        googleSignupBtn.addEventListener('click', async () => {
            await handleGoogleLogin();
        });
    }

    // Switch between login and signup
    const showSignupBtn = document.getElementById('show-signup');
    if (showSignupBtn) {
        showSignupBtn.addEventListener('click', (e) => {
            e.preventDefault();
            switchToSignup();
        });
    }

    const showLoginBtn = document.getElementById('show-login');
    if (showLoginBtn) {
        showLoginBtn.addEventListener('click', (e) => {
            e.preventDefault();
            switchToLogin();
        });
    }

    // Landing Page Buttons
    const landingLoginBtn = document.getElementById('landing-login-btn');
    if (landingLoginBtn) {
        landingLoginBtn.addEventListener('click', () => {
            document.getElementById('landing-page').style.display = 'none';
            showAuthScreen();
            switchToLogin();
        });
    }

    const heroCtaBtn = document.getElementById('hero-cta-btn');
    if (heroCtaBtn) {
        heroCtaBtn.addEventListener('click', () => {
            document.getElementById('landing-page').style.display = 'none';
            showAuthScreen();
            switchToSignup();
        });
    }

    // Logout button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            await handleLogout();
        });
    }
}

// Export functions
window.handleSignup = handleSignup;
window.handleLogin = handleLogin;
window.handleGoogleLogin = handleGoogleLogin;
window.handleLogout = handleLogout;
window.checkAuthState = checkAuthState;
window.showDashboard = showDashboard;
window.showAuthScreen = showAuthScreen;
window.initAuthListeners = initAuthListeners;
window.loadUserInfo = loadUserInfo;
