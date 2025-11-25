// ===================================
// Split Expenses & Groups Module
// ===================================

let groupsData = [];
let friendsData = [];
let sharedExpensesData = [];
let currentGroup = null;

// Fetch user's groups
async function fetchGroups() {
    try {
        const user = await getCurrentUser();
        if (!user) return;

        showLoading();

        const { data, error } = await supabase
            .from('groups')
            .select(`
                *,
                group_members (
                    user_id,
                    joined_at
                )
            `)
            .order('created_at', { ascending: false });

        hideLoading();

        if (error) throw error;

        groupsData = data || [];
        renderGroups();

    } catch (error) {
        hideLoading();
        showToast('Error loading groups: ' + error.message, 'error');
        console.error('Fetch groups error:', error);
    }
}

// Fetch friends
async function fetchFriends() {
    try {
        const user = await getCurrentUser();
        if (!user) return;

        const { data, error } = await supabase
            .from('friends')
            .select('*')
            .eq('user_id', user.id);

        if (error) throw error;

        friendsData = data || [];

    } catch (error) {
        console.error('Fetch friends error:', error);
    }
}

// Fetch shared expenses for a group
async function fetchSharedExpenses(groupId) {
    try {
        showLoading();

        const { data, error } = await supabase
            .from('shared_expenses')
            .select(`
                *,
                expense_splits (
                    user_id,
                    amount,
                    settled
                )
            `)
            .eq('group_id', groupId)
            .order('date', { ascending: false });

        hideLoading();

        if (error) throw error;

        sharedExpensesData = data || [];
        renderSharedExpenses();
        calculateBalances(groupId);

    } catch (error) {
        hideLoading();
        showToast('Error loading expenses: ' + error.message, 'error');
        console.error('Fetch shared expenses error:', error);
    }
}

// Create new group
async function createGroup(groupData) {
    try {
        const user = await getCurrentUser();
        if (!user) return;

        showLoading();

        // Create group
        const { data: group, error: groupError } = await supabase
            .from('groups')
            .insert([{
                name: groupData.name,
                created_by: user.id
            }])
            .select()
            .single();

        if (groupError) throw groupError;

        // Add creator as member
        const { error: memberError } = await supabase
            .from('group_members')
            .insert([{
                group_id: group.id,
                user_id: user.id
            }]);

        if (memberError) throw memberError;

        hideLoading();
        showToast('Group created successfully!', 'success');
        fetchGroups();

    } catch (error) {
        hideLoading();
        showToast('Error creating group: ' + error.message, 'error');
        console.error('Create group error:', error);
    }
}

// Add friend
async function addFriend(friendData) {
    try {
        const user = await getCurrentUser();
        if (!user) return;

        showLoading();

        const { data, error } = await supabase
            .from('friends')
            .insert([{
                user_id: user.id,
                friend_email: friendData.email,
                friend_name: friendData.name
            }])
            .select()
            .single();

        hideLoading();

        if (error) throw error;

        showToast('Friend added successfully!', 'success');
        fetchFriends();

    } catch (error) {
        hideLoading();
        showToast('Error adding friend: ' + error.message, 'error');
        console.error('Add friend error:', error);
    }
}

// Create shared expense
async function createSharedExpense(expenseData) {
    try {
        const user = await getCurrentUser();
        if (!user) return;

        showLoading();

        // Create shared expense
        const { data: expense, error: expenseError } = await supabase
            .from('shared_expenses')
            .insert([{
                group_id: expenseData.group_id,
                paid_by: user.id,
                description: expenseData.description,
                total_amount: parseFloat(expenseData.total_amount),
                category: expenseData.category,
                date: expenseData.date
            }])
            .select()
            .single();

        if (expenseError) throw expenseError;

        // Create splits
        const splits = expenseData.splits.map(split => ({
            shared_expense_id: expense.id,
            user_id: split.user_id,
            amount: parseFloat(split.amount)
        }));

        const { error: splitsError } = await supabase
            .from('expense_splits')
            .insert(splits);

        if (splitsError) throw splitsError;

        hideLoading();
        showToast('Expense split successfully!', 'success');
        fetchSharedExpenses(expenseData.group_id);

    } catch (error) {
        hideLoading();
        showToast('Error creating shared expense: ' + error.message, 'error');
        console.error('Create shared expense error:', error);
    }
}

// Settle expense split
async function settleSplit(splitId) {
    try {
        showLoading();

        const { error } = await supabase
            .from('expense_splits')
            .update({
                settled: true,
                settled_at: new Date().toISOString()
            })
            .eq('id', splitId);

        hideLoading();

        if (error) throw error;

        showToast('Payment settled!', 'success');
        if (currentGroup) {
            fetchSharedExpenses(currentGroup.id);
        }

    } catch (error) {
        hideLoading();
        showToast('Error settling payment: ' + error.message, 'error');
        console.error('Settle split error:', error);
    }
}

// Calculate balances for a group
async function calculateBalances(groupId) {
    const user = await getCurrentUser();
    if (!user) return;

    const balances = {};

    sharedExpensesData.forEach(expense => {
        const paidBy = expense.paid_by;

        expense.expense_splits.forEach(split => {
            if (split.user_id === user.id && paidBy !== user.id && !split.settled) {
                // User owes someone
                if (!balances[paidBy]) balances[paidBy] = 0;
                balances[paidBy] += parseFloat(split.amount);
            } else if (paidBy === user.id && split.user_id !== user.id && !split.settled) {
                // Someone owes user
                if (!balances[split.user_id]) balances[split.user_id] = 0;
                balances[split.user_id] -= parseFloat(split.amount);
            }
        });
    });

    renderBalances(balances);
}

// Render groups
function renderGroups() {
    const container = document.getElementById('groups-list');
    if (!container) return;

    if (groupsData.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 3rem; color: var(--text-muted);">
                <i class="fas fa-users" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.3;"></i>
                <p>No groups yet. Create your first group!</p>
            </div>
        `;
        return;
    }

    container.innerHTML = groupsData.map(group => `
        <div class="group-card" onclick="selectGroup('${group.id}')">
            <div class="group-icon">
                <i class="fas fa-users"></i>
            </div>
            <div class="group-info">
                <h3>${group.name}</h3>
                <p>${group.group_members?.length || 0} members</p>
            </div>
            <i class="fas fa-chevron-right"></i>
        </div>
    `).join('');
}

// Select group and show expenses
async function selectGroup(groupId) {
    currentGroup = groupsData.find(g => g.id === groupId);
    if (!currentGroup) return;

    document.getElementById('groups-view').style.display = 'none';
    document.getElementById('group-detail-view').style.display = 'block';
    document.getElementById('group-detail-name').textContent = currentGroup.name;

    await fetchSharedExpenses(groupId);
}

// Go back to groups list
function backToGroups() {
    document.getElementById('groups-view').style.display = 'block';
    document.getElementById('group-detail-view').style.display = 'none';
    currentGroup = null;
}

// Render shared expenses
function renderSharedExpenses() {
    const container = document.getElementById('shared-expenses-list');
    if (!container) return;

    if (sharedExpensesData.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:var(--text-muted);">No expenses yet.</p>';
        return;
    }

    container.innerHTML = sharedExpensesData.map(expense => `
        <div class="shared-expense-item">
            <div class="expense-header">
                <h4>${expense.description}</h4>
                <span class="expense-amount">₹${parseFloat(expense.total_amount).toFixed(2)}</span>
            </div>
            <div class="expense-meta">
                <span><i class="fas fa-calendar"></i> ${formatDate(expense.date)}</span>
                <span><i class="fas fa-tag"></i> ${expense.category || 'General'}</span>
            </div>
            <div class="expense-splits">
                ${expense.expense_splits.map(split => `
                    <div class="split-item ${split.settled ? 'settled' : ''}">
                        <span>User: ₹${parseFloat(split.amount).toFixed(2)}</span>
                        ${!split.settled ? `<button onclick="settleSplit('${split.id}')" class="btn-settle">Settle</button>` : '<span class="settled-badge">✓ Settled</span>'}
                    </div>
                `).join('')}
            </div>
        </div>
    `).join('');
}

// Render balances
function renderBalances(balances) {
    const container = document.getElementById('balances-summary');
    if (!container) return;

    const balanceEntries = Object.entries(balances);

    if (balanceEntries.length === 0) {
        container.innerHTML = '<p style="color:var(--text-muted);">All settled up! 🎉</p>';
        return;
    }

    container.innerHTML = balanceEntries.map(([userId, amount]) => {
        const isOwed = amount < 0;
        const absAmount = Math.abs(amount);

        return `
            <div class="balance-item ${isOwed ? 'owed' : 'owes'}">
                <span>${isOwed ? 'Owes you' : 'You owe'}: ₹${absAmount.toFixed(2)}</span>
            </div>
        `;
    }).join('');
}

// Show create group modal
function showCreateGroupModal() {
    const modalContent = `
        <div class="modal-header">
            <h3><i class="fas fa-users"></i> Create Group</h3>
            <button class="modal-close" onclick="closeModal()">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <form id="create-group-form" class="auth-form">
            <div class="form-group">
                <label for="group-name">Group Name</label>
                <input type="text" id="group-name" required placeholder="e.g., Roommates, Trip to Goa">
            </div>
            <button type="submit" class="btn btn-primary">
                <i class="fas fa-plus"></i> Create Group
            </button>
        </form>
    `;

    showModal(modalContent);

    document.getElementById('create-group-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        await createGroup({ name: document.getElementById('group-name').value });
        closeModal();
    });
}

// Show split expense modal
function showSplitExpenseModal() {
    if (!currentGroup) return;

    const modalContent = `
        <div class="modal-header">
            <h3><i class="fas fa-receipt"></i> Split Expense</h3>
            <button class="modal-close" onclick="closeModal()">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <form id="split-expense-form" class="auth-form">
            <div class="form-group">
                <label for="expense-description">Description</label>
                <input type="text" id="expense-description" required placeholder="e.g., Dinner at restaurant">
            </div>
            <div class="form-group">
                <label for="expense-total">Total Amount (₹)</label>
                <input type="number" id="expense-total" required step="0.01" min="0">
            </div>
            <div class="form-group">
                <label for="expense-category">Category</label>
                <select id="expense-category">
                    <option value="Food">Food</option>
                    <option value="Transport">Transport</option>
                    <option value="Entertainment">Entertainment</option>
                    <option value="Utilities">Utilities</option>
                    <option value="Other">Other</option>
                </select>
            </div>
            <div class="form-group">
                <label for="expense-date">Date</label>
                <input type="date" id="expense-date" required value="${getTodayDate()}">
            </div>
            <div class="form-group">
                <label>Split Type</label>
                <select id="split-type" onchange="updateSplitInputs()">
                    <option value="equal">Split Equally</option>
                    <option value="custom">Custom Amounts</option>
                </select>
            </div>
            <div id="split-inputs"></div>
            <button type="submit" class="btn btn-primary">
                <i class="fas fa-check"></i> Create & Split
            </button>
        </form>
    `;

    showModal(modalContent);
    updateSplitInputs();

    document.getElementById('split-expense-form').addEventListener('submit', handleSplitExpenseSubmit);
}

// Update split inputs based on type
function updateSplitInputs() {
    const splitType = document.getElementById('split-type').value;
    const container = document.getElementById('split-inputs');
    const members = currentGroup?.group_members || [];

    if (splitType === 'equal') {
        container.innerHTML = `<p style="color:var(--text-secondary);">Amount will be split equally among ${members.length} members</p>`;
    } else {
        container.innerHTML = members.map((member, index) => `
            <div class="form-group">
                <label>Member ${index + 1} Amount (₹)</label>
                <input type="number" class="split-amount" data-user-id="${member.user_id}" step="0.01" min="0" required>
            </div>
        `).join('');
    }
}

// Handle split expense form submit
async function handleSplitExpenseSubmit(e) {
    e.preventDefault();

    const total = parseFloat(document.getElementById('expense-total').value);
    const splitType = document.getElementById('split-type').value;
    const members = currentGroup.group_members;

    let splits = [];

    if (splitType === 'equal') {
        const perPerson = total / members.length;
        splits = members.map(member => ({
            user_id: member.user_id,
            amount: perPerson
        }));
    } else {
        const amountInputs = document.querySelectorAll('.split-amount');
        splits = Array.from(amountInputs).map(input => ({
            user_id: input.dataset.userId,
            amount: parseFloat(input.value)
        }));

        const splitTotal = splits.reduce((sum, s) => sum + s.amount, 0);
        if (Math.abs(splitTotal - total) > 0.01) {
            showToast('Split amounts must equal total amount', 'error');
            return;
        }
    }

    const expenseData = {
        group_id: currentGroup.id,
        description: document.getElementById('expense-description').value,
        total_amount: total,
        category: document.getElementById('expense-category').value,
        date: document.getElementById('expense-date').value,
        splits
    };

    await createSharedExpense(expenseData);
    closeModal();
}

// Show add member modal
function showAddMemberModal() {
    if (!currentGroup) return;

    const modalContent = `
        <div class="modal-header">
            <h3><i class="fas fa-user-plus"></i> Add Member to ${currentGroup.name}</h3>
            <button class="modal-close" onclick="closeModal()">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <form id="add-member-form" class="auth-form">
            <div class="form-group">
                <label for="member-name">Member Name</label>
                <input type="text" id="member-name" required placeholder="e.g., John Doe">
            </div>
            <div class="form-group">
                <label for="member-email">Member Email (Optional)</label>
                <input type="email" id="member-email" placeholder="john@example.com">
                <small style="color: var(--text-muted);">Email is optional. You can add members by name only.</small>
            </div>
            <button type="submit" class="btn btn-primary">
                <i class="fas fa-plus"></i> Add Member
            </button>
        </form>
    `;

    showModal(modalContent);

    document.getElementById('add-member-form').addEventListener('submit', handleAddMemberSubmit);
}

// Handle add member form submit
async function handleAddMemberSubmit(e) {
    e.preventDefault();

    const memberName = document.getElementById('member-name').value;
    const memberEmail = document.getElementById('member-email').value;

    try {
        const user = await getCurrentUser();
        if (!user) return;

        showLoading();

        // Try to add to friends table
        const { data: friend, error: friendError } = await supabase
            .from('friends')
            .insert([{
                user_id: user.id,
                friend_name: memberName,
                friend_email: memberEmail || 'no-email@placeholder.placeholder' // friend_email is required
            }])
            .select()
            .single();

        hideLoading();

        if (friendError) {
            // Check if table doesn't exist
            if (friendError.message.includes('relation') || friendError.message.includes('table')) {
                showToast(`Database table not set up yet. Please run the database setup SQL script first.`, 'error');
                console.error('Friends table does not exist. Run database-setup.sql in Supabase SQL Editor.');
            } else if (friendError.code === '23505') {
                showToast(`${memberName} is already in your friends list!`, 'info');
            } else {
                throw friendError;
            }
            closeModal();
        } else {
            // Generate invite link
            const inviteLink = generateInviteLink(currentGroup.id, currentGroup.name);

            // Show invite link modal
            showInviteLinkModal(memberName, inviteLink);
        }

    } catch (error) {
        hideLoading();
        showToast('Error adding member: ' + error.message, 'error');
        console.error('Add member error:', error);
    }
}

// Generate invite link for group
function generateInviteLink(groupId, groupName) {
    const baseUrl = window.location.origin;
    const inviteUrl = `${baseUrl}?invite=${groupId}&group=${encodeURIComponent(groupName)}`;
    return inviteUrl;
}

// Show invite link modal
function showInviteLinkModal(memberName, inviteLink) {
    const modalContent = `
        <div class="modal-header">
            <h3><i class="fas fa-share-alt"></i> Invite ${memberName}</h3>
            <button class="modal-close" onclick="closeModal()">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <div style="padding: 1.5rem;">
            <p style="color: var(--text-secondary); margin-bottom: 1.5rem;">
                Share this link with ${memberName} to invite them to join the group:
            </p>
            
            <div style="background: var(--bg-tertiary); padding: 1rem; border-radius: 12px; margin-bottom: 1.5rem; word-break: break-all;">
                <code id="invite-link-text" style="color: var(--accent-primary); font-size: 0.9rem;">${inviteLink}</code>
            </div>
            
            <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                <button onclick="copyInviteLink('${inviteLink}')" class="btn btn-primary">
                    <i class="fas fa-copy"></i> Copy Link
                </button>
                <button onclick="shareViaWhatsApp('${inviteLink}', '${memberName}')" class="btn btn-secondary">
                    <i class="fab fa-whatsapp"></i> WhatsApp
                </button>
                <button onclick="shareViaEmail('${inviteLink}', '${memberName}', '${currentGroup.name}')" class="btn btn-secondary">
                    <i class="fas fa-envelope"></i> Email
                </button>
            </div>
            
            <p style="color: var(--text-muted); font-size: 0.85rem; margin-top: 1rem;">
                <i class="fas fa-info-circle"></i> ${memberName} will need to create an account and click this link to join the group.
            </p>
        </div>
    `;

    showModal(modalContent);
}

// Copy invite link to clipboard
function copyInviteLink(link) {
    navigator.clipboard.writeText(link).then(() => {
        showToast('Invite link copied to clipboard!', 'success');
    }).catch(err => {
        console.error('Failed to copy:', err);
        showToast('Failed to copy link', 'error');
    });
}

// Share via WhatsApp
function shareViaWhatsApp(link, memberName) {
    const message = `Hi ${memberName}! You've been invited to join our group on Digital Life Dashboard. Click here to join: ${link}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
}

// Share via Email
function shareViaEmail(link, memberName, groupName) {
    const subject = `Invitation to join ${groupName} on Digital Life Dashboard`;
    const body = `Hi ${memberName},\n\nYou've been invited to join the group "${groupName}" on Digital Life Dashboard.\n\nClick the link below to join:\n${link}\n\nBest regards`;
    const mailtoUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoUrl;
}

// Initialize split expenses module
function initSplitExpensesModule() {
    const createGroupBtn = document.getElementById('create-group-btn');
    if (createGroupBtn) {
        createGroupBtn.addEventListener('click', showCreateGroupModal);
    }

    const splitExpenseBtn = document.getElementById('split-expense-btn');
    if (splitExpenseBtn) {
        splitExpenseBtn.addEventListener('click', showSplitExpenseModal);
    }

    const addMemberBtn = document.getElementById('add-member-btn');
    if (addMemberBtn) {
        addMemberBtn.addEventListener('click', showAddMemberModal);
    }

    const backBtn = document.getElementById('back-to-groups-btn');
    if (backBtn) {
        backBtn.addEventListener('click', backToGroups);
    }
}

// Export functions
window.fetchGroups = fetchGroups;
window.createGroup = createGroup;
window.selectGroup = selectGroup;
window.backToGroups = backToGroups;
window.createSharedExpense = createSharedExpense;
window.settleSplit = settleSplit;
window.showCreateGroupModal = showCreateGroupModal;
window.showSplitExpenseModal = showSplitExpenseModal;
window.showAddMemberModal = showAddMemberModal;
window.updateSplitInputs = updateSplitInputs;
window.initSplitExpensesModule = initSplitExpensesModule;
window.copyInviteLink = copyInviteLink;
window.shareViaWhatsApp = shareViaWhatsApp;
window.shareViaEmail = shareViaEmail;
