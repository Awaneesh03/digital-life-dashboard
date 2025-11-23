// ===================================
// Savings Goals Module
// ===================================

let goalsData = [];

// Fetch savings goals for current user
async function fetchGoals() {
    try {
        const user = await getCurrentUser();
        if (!user) return;

        showLoading();

        const { data, error } = await supabase
            .from('savings_goals')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        hideLoading();

        if (error) throw error;

        goalsData = data || [];
        renderGoals();

    } catch (error) {
        hideLoading();
        showToast('Error loading goals: ' + error.message, 'error');
        console.error('Fetch goals error:', error);
    }
}

// Create new goal
async function createGoal(goalData) {
    try {
        const user = await getCurrentUser();
        if (!user) return;

        showLoading();

        const { data, error } = await supabase
            .from('savings_goals')
            .insert([{
                user_id: user.id,
                name: goalData.name,
                target_amount: parseFloat(goalData.target_amount),
                saved_amount: parseFloat(goalData.saved_amount || 0)
            }])
            .select()
            .single();

        hideLoading();

        if (error) throw error;

        showToast('Goal created successfully!', 'success');
        fetchGoals();

    } catch (error) {
        hideLoading();
        showToast('Error creating goal: ' + error.message, 'error');
        console.error('Create goal error:', error);
    }
}

// Add contribution to goal
async function addContribution(goalId, amount) {
    try {
        showLoading();

        // Get current goal
        const goal = goalsData.find(g => g.id === goalId);
        if (!goal) throw new Error('Goal not found');

        const newSavedAmount = parseFloat(goal.saved_amount) + parseFloat(amount);
        const achieved = newSavedAmount >= parseFloat(goal.target_amount);

        const { data, error } = await supabase
            .from('savings_goals')
            .update({
                saved_amount: newSavedAmount,
                achieved: achieved,
                updated_at: new Date().toISOString()
            })
            .eq('id', goalId)
            .select()
            .single();

        hideLoading();

        if (error) throw error;

        if (achieved && !goal.achieved) {
            showToast('🎉 Congratulations! Goal achieved!', 'success');
        } else {
            showToast('Contribution added successfully!', 'success');
        }

        fetchGoals();

    } catch (error) {
        hideLoading();
        showToast('Error adding contribution: ' + error.message, 'error');
        console.error('Add contribution error:', error);
    }
}

// Delete goal
async function deleteGoal(goalId) {
    try {
        showLoading();

        const { error } = await supabase
            .from('savings_goals')
            .delete()
            .eq('id', goalId);

        hideLoading();

        if (error) throw error;

        showToast('Goal deleted successfully', 'success');
        fetchGoals();

    } catch (error) {
        hideLoading();
        showToast('Error deleting goal: ' + error.message, 'error');
        console.error('Delete goal error:', error);
    }
}

// Render goals
function renderGoals() {
    const container = document.getElementById('goals-list');
    if (!container) return;

    if (goalsData.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 3rem; color: var(--text-muted);">
                <i class="fas fa-bullseye" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.3;"></i>
                <p>No savings goals yet. Create your first goal!</p>
            </div>
        `;
        return;
    }

    container.innerHTML = goalsData.map(goal => {
        const savedAmount = parseFloat(goal.saved_amount);
        const targetAmount = parseFloat(goal.target_amount);
        const percentage = Math.min((savedAmount / targetAmount) * 100, 100);
        const remaining = Math.max(targetAmount - savedAmount, 0);

        return `
            <div class="goal-card ${goal.achieved ? 'achieved' : ''}">
                <div class="goal-header">
                    <div class="goal-info">
                        <h3 class="goal-name">${goal.name}</h3>
                        ${goal.achieved ? '<span class="goal-badge achieved">✓ Achieved</span>' : ''}
                    </div>
                    <button onclick="confirmDeleteGoal('${goal.id}')" class="btn-icon" title="Delete Goal">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>

                <div class="goal-amounts">
                    <div class="amount-item">
                        <span class="amount-label">Saved</span>
                        <span class="amount-value saved">₹${savedAmount.toFixed(2)}</span>
                    </div>
                    <div class="amount-item">
                        <span class="amount-label">Target</span>
                        <span class="amount-value target">₹${targetAmount.toFixed(2)}</span>
                    </div>
                    <div class="amount-item">
                        <span class="amount-label">Remaining</span>
                        <span class="amount-value remaining">₹${remaining.toFixed(2)}</span>
                    </div>
                </div>

                <div class="goal-progress">
                    <div class="goal-progress-bar-container">
                        <div class="goal-progress-bar" style="width: ${percentage}%"></div>
                    </div>
                    <span class="goal-percentage">${percentage.toFixed(1)}%</span>
                </div>

                ${!goal.achieved ? `
                    <button onclick="showContributeModal('${goal.id}', '${goal.name}')" class="btn btn-primary btn-small">
                        <i class="fas fa-plus"></i> Add Contribution
                    </button>
                ` : ''}
            </div>
        `;
    }).join('');
}

// Show create goal modal
function showCreateGoalModal() {
    const modalContent = `
        <div class="modal-header">
            <h3><i class="fas fa-bullseye"></i> Create Savings Goal</h3>
            <button class="modal-close" onclick="closeModal()">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <form id="create-goal-form" class="auth-form">
            <div class="form-group">
                <label for="goal-name">Goal Name</label>
                <input type="text" id="goal-name" required placeholder="e.g., New Laptop, Vacation, Emergency Fund">
            </div>
            <div class="form-group">
                <label for="goal-target">Target Amount (₹)</label>
                <input type="number" id="goal-target" required placeholder="50000" step="0.01" min="0">
            </div>
            <div class="form-group">
                <label for="goal-initial">Initial Contribution (₹) - Optional</label>
                <input type="number" id="goal-initial" placeholder="0" step="0.01" min="0" value="0">
            </div>
            <button type="submit" class="btn btn-primary">
                <i class="fas fa-save"></i> Create Goal
            </button>
        </form>
    `;

    showModal(modalContent);

    document.getElementById('create-goal-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        const goalData = {
            name: document.getElementById('goal-name').value,
            target_amount: document.getElementById('goal-target').value,
            saved_amount: document.getElementById('goal-initial').value || 0
        };

        await createGoal(goalData);
        closeModal();
    });
}

// Show contribute modal
function showContributeModal(goalId, goalName) {
    const modalContent = `
        <div class="modal-header">
            <h3><i class="fas fa-coins"></i> Add Contribution</h3>
            <button class="modal-close" onclick="closeModal()">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <div style="padding: 1.5rem;">
            <p style="margin-bottom: 1.5rem; color: var(--text-secondary);">
                Contributing to: <strong>${goalName}</strong>
            </p>
            <form id="contribute-form" class="auth-form">
                <div class="form-group">
                    <label for="contribution-amount">Contribution Amount (₹)</label>
                    <input type="number" id="contribution-amount" required placeholder="1000" step="0.01" min="0.01">
                </div>
                <button type="submit" class="btn btn-primary">
                    <i class="fas fa-plus"></i> Add Contribution
                </button>
            </form>
        </div>
    `;

    showModal(modalContent);

    document.getElementById('contribute-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        const amount = document.getElementById('contribution-amount').value;
        await addContribution(goalId, amount);
        closeModal();
    });
}

// Confirm delete goal
function confirmDeleteGoal(goalId) {
    if (confirm('Are you sure you want to delete this goal?')) {
        deleteGoal(goalId);
    }
}

// Initialize goals module
function initGoalsModule() {
    const createGoalBtn = document.getElementById('create-goal-btn');
    if (createGoalBtn) {
        createGoalBtn.addEventListener('click', showCreateGoalModal);
    }
}

// Export functions
window.fetchGoals = fetchGoals;
window.createGoal = createGoal;
window.addContribution = addContribution;
window.deleteGoal = deleteGoal;
window.showCreateGoalModal = showCreateGoalModal;
window.showContributeModal = showContributeModal;
window.confirmDeleteGoal = confirmDeleteGoal;
window.initGoalsModule = initGoalsModule;
