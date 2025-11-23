// ===================================
// Supabase Client Configuration
// ===================================

// Supabase credentials configured
const SUPABASE_URL = 'https://gccxynqqlpzyhzysyulq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdjY3h5bnFxbHB6eWh6eXN5dWxxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM4MzA0ODIsImV4cCI6MjA3OTQwNjQ4Mn0.t2Zg4HkXFw3iqr1NxKMPNkGEbblqXW0M383pLg0s4j8';


// Initialize Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Export for use in other modules
window.supabase = supabase;

// Helper function to get current user
async function getCurrentUser() {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) {
        console.error('Error getting user:', error);
        return null;
    }
    return user;
}

// Helper function to check if user is authenticated
async function isAuthenticated() {
    const user = await getCurrentUser();
    return user !== null;
}

// Export helper functions
window.getCurrentUser = getCurrentUser;
window.isAuthenticated = isAuthenticated;
