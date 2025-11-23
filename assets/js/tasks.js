// ===================================
// Tasks Module
// ===================================

let tasksData = [];
let taskFilters = {
    category: 'all',
    status: 'all',
    date: ''
};

// Fetch tasks from Supabase
async function fetchTasks() {
    try {
        const user = await getCurrentUser();
        if (!user) return;

        showLoading();

        const { data, error } = await supabase
            .from('tasks')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        hideLoading();

        if (error) throw error;

        tasksData = data || [];
        renderTasks();

    } catch (error) {
        hideLoading();
        showToast('Error loading tasks: ' + error.message, 'error');
        console.error('Error fetching tasks:', error);
    }
}

// Add new task
async function addTask(taskData) {
    try {
        const user = await getCurrentUser();
        if (!user) return;

        showLoading();

        const { data, error } = await supabase
            .from('tasks')
            .insert([{
                user_id: user.id,
                title: taskData.title,
                description: taskData.description || '',
                category: taskData.category,
                date: taskData.date,
                completed: false
            }])
            .select();

        hideLoading();

        if (error) throw error;

        showToast('Task added successfully!', 'success');
        closeModal();
        fetchTasks();

    } catch (error) {
        hideLoading();
        showToast('Error adding task: ' + error.message, 'error');
        console.error('Error adding task:', error);
    }
}

// Update task
async function updateTask(taskId, updates) {
    try {
        showLoading();

        const { data, error } = await supabase
            .from('tasks')
            .update(updates)
            .eq('id', taskId)
            .select();

        hideLoading();

        if (error) throw error;

        showToast('Task updated successfully!', 'success');
        fetchTasks();

    } catch (error) {
        hideLoading();
        showToast('Error updating task: ' + error.message, 'error');
        console.error('Error updating task:', error);
    }
}

// Delete task
async function deleteTask(taskId) {
    try {
        showLoading();

        const { error } = await supabase
            .from('tasks')
            .delete()
            .eq('id', taskId);

        hideLoading();

        if (error) throw error;

        showToast('Task deleted successfully!', 'success');
        fetchTasks();

    } catch (error) {
        hideLoading();
        showToast('Error deleting task: ' + error.message, 'error');
        console.error('Error deleting task:', error);
    }
}

// Toggle task completion
async function toggleTaskCompletion(taskId, currentStatus) {
    await updateTask(taskId, { completed: !currentStatus });
}

// Render tasks
function renderTasks() {
    const container = document.getElementById('tasks-list');
    if (!container) return;

    // Apply filters
    let filteredTasks = tasksData.filter(task => {
        if (taskFilters.category !== 'all' && task.category !== taskFilters.category) {
            return false;
        }
        if (taskFilters.status !== 'all') {
            const isCompleted = task.completed;
            if (taskFilters.status === 'completed' && !isCompleted) return false;
            if (taskFilters.status === 'pending' && isCompleted) return false;
        }
        if (taskFilters.date && task.date !== taskFilters.date) {
            return false;
        }
        return true;
    });

    if (filteredTasks.length === 0) {
        container.innerHTML = `
            <div class="card" style="grid-column: 1 / -1; text-align: center; padding: 3rem;">
                <i class="fas fa-tasks" style="font-size: 3rem; opacity: 0.3; margin-bottom: 1rem;"></i>
                <p style="color: var(--text-secondary);">No tasks found. Click "Add Task" to create one!</p>
            </div>
        `;
        return;
    }

    container.innerHTML = filteredTasks.map(task => `
        <div class="card task-card ${task.completed ? 'completed' : ''}" data-task-id="${task.id}">
            <div class="card-header">
                <div>
                    <h3 class="card-title">${task.title}</h3>
                    <span class="task-category">${task.category}</span>
                </div>
                <div class="card-actions">
                    <button onclick="toggleTaskCompletion(${task.id}, ${task.completed})" title="${task.completed ? 'Mark as incomplete' : 'Mark as complete'}">
                        <i class="fas ${task.completed ? 'fa-undo' : 'fa-check'}"></i>
                    </button>
                    <button onclick="showEditTaskModal(${task.id})" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="confirmDeleteTask(${task.id})" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <div class="card-meta">
                <span><i class="fas fa-calendar"></i> ${formatDate(task.date)}</span>
                <span><i class="fas ${task.completed ? 'fa-check-circle' : 'fa-clock'}"></i> ${task.completed ? 'Completed' : 'Pending'}</span>
            </div>
        </div>
    `).join('');
}

// Show add task modal
function showAddTaskModal() {
    const modalContent = `
        <div class="modal-header">
            <h3><i class="fas fa-plus"></i> Add New Task</h3>
            <button class="modal-close" onclick="closeModal()">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <form id="add-task-form" class="auth-form">
            <div class="form-group">
                <label for="task-title">Task Title</label>
                <input type="text" id="task-title" required placeholder="Enter task title">
            </div>
            <div class="form-group">
                <label for="task-category">Category</label>
                <select id="task-category" required>
                    <option value="Study">Study</option>
                    <option value="Assignment">Assignment</option>
                    <option value="Project">Project</option>
                    <option value="Personal">Personal</option>
                    <option value="Other">Other</option>
                </select>
            </div>
            <div class="form-group">
                <label for="task-description">Description (Optional)</label>
                <textarea id="task-description" rows="2" placeholder="Add task details..." style="padding: 0.875rem 1rem; background: var(--bg-tertiary); border: 1px solid var(--border-color); border-radius: 12px; color: var(--text-primary); font-family: var(--font-family); resize: vertical;"></textarea>
            </div>
            <div class="form-group">
                <label for="task-date">Due Date</label>
                <input type="date" id="task-date" required value="${getTodayDate()}">
            </div>
            <button type="submit" class="btn btn-primary">
                <i class="fas fa-plus"></i> Add Task
            </button>
        </form>
    `;

    showModal(modalContent);

    // Add form submit handler
    document.getElementById('add-task-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        await addTask({
            title: document.getElementById('task-title').value,
            description: document.getElementById('task-description').value,
            category: document.getElementById('task-category').value,
            date: document.getElementById('task-date').value
        });
    });
}

// Show edit task modal
function showEditTaskModal(taskId) {
    const task = tasksData.find(t => t.id === taskId);
    if (!task) return;

    const modalContent = `
        <div class="modal-header">
            <h3><i class="fas fa-edit"></i> Edit Task</h3>
            <button class="modal-close" onclick="closeModal()">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <form id="edit-task-form" class="auth-form">
            <div class="form-group">
                <label for="edit-task-title">Task Title</label>
                <input type="text" id="edit-task-title" required value="${task.title}">
            </div>
            <div class="form-group">
                <label for="edit-task-category">Category</label>
                <select id="edit-task-category" required>
                    <option value="Study" ${task.category === 'Study' ? 'selected' : ''}>Study</option>
                    <option value="Assignment" ${task.category === 'Assignment' ? 'selected' : ''}>Assignment</option>
                    <option value="Project" ${task.category === 'Project' ? 'selected' : ''}>Project</option>
                    <option value="Personal" ${task.category === 'Personal' ? 'selected' : ''}>Personal</option>
                    <option value="Other" ${task.category === 'Other' ? 'selected' : ''}>Other</option>
                </select>
            </div>
            <div class="form-group">
                <label for="edit-task-description">Description (Optional)</label>
                <textarea id="edit-task-description" rows="2" placeholder="Add task details..." style="padding: 0.875rem 1rem; background: var(--bg-tertiary); border: 1px solid var(--border-color); border-radius: 12px; color: var(--text-primary); font-family: var(--font-family); resize: vertical;">${task.description || ''}</textarea>
            </div>
            <div class="form-group">
                <label for="edit-task-date">Due Date</label>
                <input type="date" id="edit-task-date" required value="${task.date}">
            </div>
            <button type="submit" class="btn btn-primary">
                <i class="fas fa-save"></i> Save Changes
            </button>
        </form>
    `;

    showModal(modalContent);

    // Add form submit handler
    document.getElementById('edit-task-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        await updateTask(taskId, {
            title: document.getElementById('edit-task-title').value,
            description: document.getElementById('edit-task-description').value,
            category: document.getElementById('edit-task-category').value,
            date: document.getElementById('edit-task-date').value
        });
        closeModal();
    });
}

// Confirm delete task
function confirmDeleteTask(taskId) {
    const modalContent = `
        <div class="modal-header">
            <h3><i class="fas fa-exclamation-triangle"></i> Confirm Delete</h3>
            <button class="modal-close" onclick="closeModal()">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <p style="margin: 1.5rem 0; color: var(--text-secondary);">
            Are you sure you want to delete this task? This action cannot be undone.
        </p>
        <div style="display: flex; gap: 1rem; justify-content: flex-end;">
            <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
            <button class="btn btn-danger" onclick="deleteTask(${taskId}); closeModal();">
                <i class="fas fa-trash"></i> Delete
            </button>
        </div>
    `;

    showModal(modalContent);
}

// Initialize task filters
function initTaskFilters() {
    const categoryFilter = document.getElementById('task-category-filter');
    const statusFilter = document.getElementById('task-status-filter');
    const dateFilter = document.getElementById('task-date-filter');

    if (categoryFilter) {
        categoryFilter.addEventListener('change', (e) => {
            taskFilters.category = e.target.value;
            renderTasks();
        });
    }

    if (statusFilter) {
        statusFilter.addEventListener('change', (e) => {
            taskFilters.status = e.target.value;
            renderTasks();
        });
    }

    if (dateFilter) {
        dateFilter.addEventListener('change', (e) => {
            taskFilters.date = e.target.value;
            renderTasks();
        });
    }
}

// Initialize tasks module
function initTasksModule() {
    const addTaskBtn = document.getElementById('add-task-btn');
    if (addTaskBtn) {
        addTaskBtn.addEventListener('click', showAddTaskModal);
    }

    initTaskFilters();
}

// Export functions
window.fetchTasks = fetchTasks;
window.addTask = addTask;
window.updateTask = updateTask;
window.deleteTask = deleteTask;
window.toggleTaskCompletion = toggleTaskCompletion;
window.showAddTaskModal = showAddTaskModal;
window.showEditTaskModal = showEditTaskModal;
window.confirmDeleteTask = confirmDeleteTask;
window.initTasksModule = initTasksModule;
