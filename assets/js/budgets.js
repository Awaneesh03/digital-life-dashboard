// ===================================
// Budget Planner Module
// ===================================

let budgetsData = [];
let currentBudget = null;
let budgetLimits = [];

// Fetch budgets for current user
async function fetchBudgets() {
    try {
        const user = await getCurrentUser();
        if (!user) return;

        showLoading();

        const { data, error } = await supabase
            .from('budgets')
            .select(`
                *,
                budget_limits (*)
            `)
            .eq('user_id', user.id)
            .order('month', { ascending: false });

        hideLoading();

        if (error) throw error;

        budgetsData = data || [];

        // Get current month's budget
        const currentMonth = new Date().toISOString().substring(0, 7) + '-01';
        currentBudget = budgetsData.find(b => b.month === currentMonth);
        budgetLimits = currentBudget?.budget_limits || [];

        renderBudgets();
        updateBudgetProgress();

    } catch (error) {
        hideLoading();
        showToast('Error loading budgets: ' + error.message, 'error');
        console.error('Fetch budgets error:', error);
    }
}

// Create or update budget
async function saveBudget(budgetData) {
    try {
        const user = await getCurrentUser();
        if (!user) return;

        showLoading();

        // Check if budget exists for this month
        const { data: existing } = await supabase
            .from('budgets')
            .select('id')
            .eq('user_id', user.id)
            .eq('month', budgetData.month)
            .single();

        let budgetId;

        if (existing) {
            // Update existing
            const { data, error } = await supabase
                .from('budgets')
                .update({
                    total_budget: budgetData.total_budget
                })
                .eq('id', existing.id)
                .select()
                .single();

            if (error) throw error;
            budgetId = data.id;
        } else {
            // Create new
            const { data, error } = await supabase
                .from('budgets')
                .insert([{
                    user_id: user.id,
                    month: budgetData.month,
                    total_budget: budgetData.total_budget
                }])
                .select()
                .single();

            if (error) throw error;
            budgetId = data.id;
        }

        // Save category limits
        if (budgetData.limits && budgetData.limits.length > 0) {
            await saveBudgetLimits(budgetId, budgetData.limits);
        }

        hideLoading();
        showToast('Budget saved successfully!', 'success');
        fetchBudgets();

    } catch (error) {
        hideLoading();
        showToast('Error saving budget: ' + error.message, 'error');
        console.error('Save budget error:', error);
    }
}

// Save budget limits
async function saveBudgetLimits(budgetId, limits) {
    // Delete existing limits
    await supabase
        .from('budget_limits')
        .delete()
        .eq('budget_id', budgetId);

    // Insert new limits
    const limitsToInsert = limits.map(limit => ({
        budget_id: budgetId,
        category: limit.category,
        limit_amount: parseFloat(limit.amount)
    }));

    const { error } = await supabase
        .from('budget_limits')
        .insert(limitsToInsert);

    if (error) throw error;
}

// Calculate spending for a category
function getCategorySpending(category, month) {
    if (!expensesData) return 0;

    const monthStr = month.substring(0, 7); // YYYY-MM
    return expensesData
        .filter(e => e.date.startsWith(monthStr) && e.category === category)
        .reduce((sum, e) => sum + parseFloat(e.amount), 0);
}

// Calculate total spending for month
function getTotalSpending(month) {
    if (!expensesData) return 0;

    const monthStr = month.substring(0, 7);
    return expensesData
        .filter(e => e.date.startsWith(monthStr))
        .reduce((sum, e) => sum + parseFloat(e.amount), 0);
}

// Get budget status (safe, warning, danger)
function getBudgetStatus(spent, limit) {
    const percentage = (spent / limit) * 100;
    if (percentage >= 100) return 'danger';
    if (percentage >= 80) return 'warning';
    return 'safe';
}

// Update budget progress display
function updateBudgetProgress() {
    if (!currentBudget) return;

    const currentMonth = currentBudget.month;
    const totalSpent = getTotalSpending(currentMonth);
    const totalBudget = parseFloat(currentBudget.total_budget);

    // Update total budget progress
    const totalProgressBar = document.getElementById('total-budget-progress');
    const totalSpentElement = document.getElementById('total-spent');
    const totalBudgetElement = document.getElementById('total-budget-amount');

    if (totalProgressBar && totalSpentElement && totalBudgetElement) {
        const percentage = Math.min((totalSpent / totalBudget) * 100, 100);
        const status = getBudgetStatus(totalSpent, totalBudget);

        totalProgressBar.style.width = percentage + '%';
        totalProgressBar.className = `budget-progress-bar ${status}`;
        totalSpentElement.textContent = `₹${totalSpent.toFixed(2)}`;
        totalBudgetElement.textContent = `₹${totalBudget.toFixed(2)}`;
    }

    // Update category limits
    renderCategoryLimits();
}

// Render category limits with progress
function renderCategoryLimits() {
    const container = document.getElementById('category-limits-list');
    if (!container || !currentBudget) return;

    const currentMonth = currentBudget.month;

    if (budgetLimits.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:var(--text-muted);">No category limits set.</p>';
        return;
    }

    container.innerHTML = budgetLimits.map(limit => {
        const spent = getCategorySpending(limit.category, currentMonth);
        const limitAmount = parseFloat(limit.limit_amount);
        const percentage = Math.min((spent / limitAmount) * 100, 100);
        const status = getBudgetStatus(spent, limitAmount);

        return `
            <div class="category-limit-item">
                <div class="category-limit-header">
                    <span class="category-name">${limit.category}</span>
                    <span class="category-amounts">
                        <span class="spent">₹${spent.toFixed(2)}</span> / 
                        <span class="limit">₹${limitAmount.toFixed(2)}</span>
                    </span>
                </div>
                <div class="category-progress-bar-container">
                    <div class="category-progress-bar ${status}" style="width: ${percentage}%"></div>
                </div>
                ${status === 'danger' ? '<span class="budget-alert">⚠️ Over budget!</span>' : ''}
                ${status === 'warning' ? '<span class="budget-warning">⚠️ Near limit</span>' : ''}
            </div>
        `;
    }).join('');
}

// Render budgets list
function renderBudgets() {
    const container = document.getElementById('budgets-history');
    if (!container) return;

    if (budgetsData.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:var(--text-muted);">No budgets created yet.</p>';
        return;
    }

    container.innerHTML = budgetsData.map(budget => {
        const monthName = new Date(budget.month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        const totalSpent = getTotalSpending(budget.month);
        const totalBudget = parseFloat(budget.total_budget);
        const status = getBudgetStatus(totalSpent, totalBudget);

        return `
            <div class="budget-history-item ${status}">
                <div class="budget-month">${monthName}</div>
                <div class="budget-summary">
                    <span>Spent: ₹${totalSpent.toFixed(2)}</span>
                    <span>Budget: ₹${totalBudget.toFixed(2)}</span>
                </div>
                <button onclick="editBudget('${budget.id}')" class="btn-icon">
                    <i class="fas fa-edit"></i>
                </button>
            </div>
        `;
    }).join('');
}

// Show budget creation modal
function showCreateBudgetModal() {
    const currentMonth = new Date().toISOString().substring(0, 7) + '-01';

    const modalContent = `
        <div class="modal-header">
            <h3><i class="fas fa-wallet"></i> Create Monthly Budget</h3>
            <button class="modal-close" onclick="closeModal()">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <form id="budget-form" class="auth-form">
            <div class="form-group">
                <label for="budget-month">Month</label>
                <input type="month" id="budget-month" required value="${currentMonth.substring(0, 7)}">
            </div>
            <div class="form-group">
                <label for="total-budget">Total Monthly Budget (₹)</label>
                <input type="number" id="total-budget" required placeholder="10000" step="0.01" min="0">
            </div>
            <div class="form-group">
                <label>Category Limits (Optional)</label>
                <div id="category-limits-inputs">
                    <button type="button" onclick="addCategoryLimitInput()" class="btn btn-secondary btn-small">
                        <i class="fas fa-plus"></i> Add Category Limit
                    </button>
                </div>
            </div>
            <button type="submit" class="btn btn-primary">
                <i class="fas fa-save"></i> Save Budget
            </button>
        </form>
    `;

    showModal(modalContent);

    document.getElementById('budget-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        const month = document.getElementById('budget-month').value + '-01';
        const totalBudget = document.getElementById('total-budget').value;

        // Collect category limits
        const limitInputs = document.querySelectorAll('.category-limit-input');
        const limits = Array.from(limitInputs).map(input => ({
            category: input.querySelector('.limit-category').value,
            amount: input.querySelector('.limit-amount').value
        })).filter(l => l.category && l.amount);

        await saveBudget({
            month,
            total_budget: totalBudget,
            limits
        });

        closeModal();
    });
}

// Add category limit input
function addCategoryLimitInput() {
    const container = document.getElementById('category-limits-inputs');
    const input = document.createElement('div');
    input.className = 'category-limit-input';
    input.innerHTML = `
        <div style="display: flex; gap: 0.5rem; margin-top: 0.5rem;">
            <select class="limit-category" style="flex: 1;">
                <option value="Food">Food</option>
                <option value="Transport">Transport</option>
                <option value="Books">Books</option>
                <option value="Entertainment">Entertainment</option>
                <option value="Shopping">Shopping</option>
                <option value="Utilities">Utilities</option>
                <option value="Health">Health</option>
                <option value="Other">Other</option>
            </select>
            <input type="number" class="limit-amount" placeholder="Amount" step="0.01" min="0" style="flex: 1;">
            <button type="button" onclick="this.parentElement.parentElement.remove()" class="btn-icon">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    container.appendChild(input);
}

// Initialize budgets module
function initBudgetsModule() {
    const createBudgetBtn = document.getElementById('create-budget-btn');
    if (createBudgetBtn) {
        createBudgetBtn.addEventListener('click', showCreateBudgetModal);
    }
}

// Export functions
window.fetchBudgets = fetchBudgets;
window.saveBudget = saveBudget;
window.updateBudgetProgress = updateBudgetProgress;
window.showCreateBudgetModal = showCreateBudgetModal;
window.addCategoryLimitInput = addCategoryLimitInput;
window.initBudgetsModule = initBudgetsModule;
