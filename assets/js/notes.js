// ===================================
// Notes Module - Enhanced
// ===================================

let notesData = [];
let notesFilter = {
    search: '',
    color: 'all',
    sort: 'updated' // updated, created, title, pinned
};

const NOTE_COLORS = {
    default: { bg: 'var(--bg-tertiary)', border: 'var(--border-color)' },
    red: { bg: 'rgba(239, 68, 68, 0.1)', border: '#ef4444' },
    orange: { bg: 'rgba(249, 115, 22, 0.1)', border: '#f97316' },
    yellow: { bg: 'rgba(234, 179, 8, 0.1)', border: '#eab308' },
    green: { bg: 'rgba(34, 197, 94, 0.1)', border: '#22c55e' },
    blue: { bg: 'rgba(59, 130, 246, 0.1)', border: '#3b82f6' },
    purple: { bg: 'rgba(168, 85, 247, 0.1)', border: '#a855f7' },
    pink: { bg: 'rgba(236, 72, 153, 0.1)', border: '#ec4899' }
};

// Fetch notes from Supabase
async function fetchNotes() {
    try {
        const user = await getCurrentUser();
        if (!user) return;

        showLoading();

        const { data, error } = await supabase
            .from('notes')
            .select('*')
            .eq('user_id', user.id)
            .order('updated_at', { ascending: false });

        hideLoading();

        if (error) throw error;

        notesData = data || [];
        renderNotes();

    } catch (error) {
        hideLoading();
        showToast('Error loading notes: ' + error.message, 'error');
        console.error('Fetch notes error:', error);
    }
}

// Create new note
async function createNote(noteData) {
    try {
        const user = await getCurrentUser();
        if (!user) return;

        showLoading();

        const { data, error } = await supabase
            .from('notes')
            .insert([{
                user_id: user.id,
                title: noteData.title || 'Untitled',
                content: noteData.content || '',
                color: noteData.color || 'default',
                pinned: noteData.pinned || false
            }])
            .select()
            .single();

        hideLoading();

        if (error) throw error;

        showToast('Note created successfully!', 'success');
        fetchNotes();

    } catch (error) {
        hideLoading();
        showToast('Error creating note: ' + error.message, 'error');
        console.error('Create note error:', error);
    }
}

// Update note
async function updateNote(noteId, updates) {
    try {
        showLoading();

        const { data, error } = await supabase
            .from('notes')
            .update({
                ...updates,
                updated_at: new Date().toISOString()
            })
            .eq('id', noteId)
            .select()
            .single();

        hideLoading();

        if (error) throw error;

        showToast('Note updated!', 'success');
        fetchNotes();

    } catch (error) {
        hideLoading();
        showToast('Error updating note: ' + error.message, 'error');
        console.error('Update note error:', error);
    }
}

// Toggle pin status
async function togglePinNote(noteId) {
    const note = notesData.find(n => n.id === noteId);
    if (!note) return;

    await updateNote(noteId, { pinned: !note.pinned });
}

// Delete note
async function deleteNote(noteId) {
    try {
        showLoading();

        const { error } = await supabase
            .from('notes')
            .delete()
            .eq('id', noteId);

        hideLoading();

        if (error) throw error;

        showToast('Note deleted successfully', 'success');
        fetchNotes();

    } catch (error) {
        hideLoading();
        showToast('Error deleting note: ' + error.message, 'error');
        console.error('Delete note error:', error);
    }
}

// Render notes with filters and sorting
function renderNotes() {
    const container = document.getElementById('notes-grid');
    if (!container) return;

    // Apply filters
    let filteredNotes = notesData.filter(note => {
        // Search filter
        if (notesFilter.search) {
            const searchLower = notesFilter.search.toLowerCase();
            const matchesSearch =
                (note.title && note.title.toLowerCase().includes(searchLower)) ||
                (note.content && note.content.toLowerCase().includes(searchLower));
            if (!matchesSearch) return false;
        }

        // Color filter
        if (notesFilter.color !== 'all' && note.color !== notesFilter.color) {
            return false;
        }

        return true;
    });

    // Apply sorting
    filteredNotes.sort((a, b) => {
        // Pinned notes always come first
        if (a.pinned !== b.pinned) {
            return b.pinned ? 1 : -1;
        }

        switch (notesFilter.sort) {
            case 'title':
                return (a.title || '').localeCompare(b.title || '');
            case 'created':
                return new Date(b.created_at) - new Date(a.created_at);
            case 'updated':
            default:
                return new Date(b.updated_at) - new Date(a.updated_at);
        }
    });

    if (filteredNotes.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: var(--text-muted);">
                <i class="fas fa-sticky-note" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.3;"></i>
                <p>${notesFilter.search || notesFilter.color !== 'all' ? 'No notes match your filters' : 'No notes yet. Create your first note!'}</p>
            </div>
        `;
        return;
    }

    container.innerHTML = filteredNotes.map(note => {
        const colorStyle = NOTE_COLORS[note.color] || NOTE_COLORS.default;
        return `
            <div class="note-card" style="background: ${colorStyle.bg}; border-left: 3px solid ${colorStyle.border};">
                <div class="note-header">
                    <h3 class="note-title">${note.title || 'Untitled'}</h3>
                    <div class="note-actions">
                        <button onclick="togglePinNote('${note.id}')" class="btn-icon" title="${note.pinned ? 'Unpin' : 'Pin'}">
                            <i class="fas fa-thumbtack" style="color: ${note.pinned ? '#fbbf24' : 'var(--text-muted)'}; ${note.pinned ? 'transform: rotate(45deg);' : ''}"></i>
                        </button>
                        <button onclick="showEditNoteModal('${note.id}')" class="btn-icon" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button onclick="confirmDeleteNote('${note.id}')" class="btn-icon" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <p class="note-content">${note.content || ''}</p>
                <div class="note-footer">
                    <span class="note-date">${formatDate(note.updated_at)}</span>
                    ${note.pinned ? '<span class="note-badge"><i class="fas fa-thumbtack"></i> Pinned</span>' : ''}
                </div>
            </div>
        `;
    }).join('');
}

// Show create note modal
function showCreateNoteModal() {
    const modalContent = `
        <div class="modal-header">
            <h3><i class="fas fa-sticky-note"></i> Create Note</h3>
            <button class="modal-close" onclick="closeModal()">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <form id="create-note-form" class="auth-form">
            <div class="form-group">
                <label for="note-title">Title</label>
                <input type="text" id="note-title" placeholder="Note title" required>
            </div>
            <div class="form-group">
                <label for="note-content">Content</label>
                <textarea id="note-content" rows="8" placeholder="Write your note here..." required></textarea>
            </div>
            <div class="form-group">
                <label>Color</label>
                <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                    ${Object.keys(NOTE_COLORS).map(color => `
                        <label style="cursor: pointer;">
                            <input type="radio" name="note-color" value="${color}" ${color === 'default' ? 'checked' : ''} style="display: none;">
                            <div class="color-option" style="width: 40px; height: 40px; border-radius: 8px; background: ${NOTE_COLORS[color].bg}; border: 2px solid ${NOTE_COLORS[color].border}; display: flex; align-items: center; justify-content: center;">
                                ${color === 'default' ? '<i class="fas fa-ban" style="font-size: 0.8rem;"></i>' : ''}
                            </div>
                        </label>
                    `).join('')}
                </div>
            </div>
            <div class="form-group">
                <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                    <input type="checkbox" id="note-pinned">
                    <span>Pin this note</span>
                </label>
            </div>
            <button type="submit" class="btn btn-primary">
                <i class="fas fa-save"></i> Create Note
            </button>
        </form>
    `;

    showModal(modalContent);

    document.getElementById('create-note-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        const noteData = {
            title: document.getElementById('note-title').value,
            content: document.getElementById('note-content').value,
            color: document.querySelector('input[name="note-color"]:checked').value,
            pinned: document.getElementById('note-pinned').checked
        };

        await createNote(noteData);
        closeModal();
    });

    // Add click handlers for color options
    document.querySelectorAll('.color-option').forEach(option => {
        option.addEventListener('click', function () {
            this.previousElementSibling.checked = true;
        });
    });
}

// Show edit note modal
function showEditNoteModal(noteId) {
    const note = notesData.find(n => n.id === noteId);
    if (!note) return;

    const modalContent = `
        <div class="modal-header">
            <h3><i class="fas fa-edit"></i> Edit Note</h3>
            <button class="modal-close" onclick="closeModal()">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <form id="edit-note-form" class="auth-form">
            <div class="form-group">
                <label for="edit-note-title">Title</label>
                <input type="text" id="edit-note-title" value="${note.title || ''}" required>
            </div>
            <div class="form-group">
                <label for="edit-note-content">Content</label>
                <textarea id="edit-note-content" rows="8" required>${note.content || ''}</textarea>
            </div>
            <div class="form-group">
                <label>Color</label>
                <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                    ${Object.keys(NOTE_COLORS).map(color => `
                        <label style="cursor: pointer;">
                            <input type="radio" name="edit-note-color" value="${color}" ${color === note.color ? 'checked' : ''} style="display: none;">
                            <div class="color-option" style="width: 40px; height: 40px; border-radius: 8px; background: ${NOTE_COLORS[color].bg}; border: 2px solid ${NOTE_COLORS[color].border}; display: flex; align-items: center; justify-content: center;">
                                ${color === 'default' ? '<i class="fas fa-ban" style="font-size: 0.8rem;"></i>' : ''}
                            </div>
                        </label>
                    `).join('')}
                </div>
            </div>
            <div class="form-group">
                <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                    <input type="checkbox" id="edit-note-pinned" ${note.pinned ? 'checked' : ''}>
                    <span>Pin this note</span>
                </label>
            </div>
            <button type="submit" class="btn btn-primary">
                <i class="fas fa-save"></i> Save Changes
            </button>
        </form>
    `;

    showModal(modalContent);

    document.getElementById('edit-note-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        const updates = {
            title: document.getElementById('edit-note-title').value,
            content: document.getElementById('edit-note-content').value,
            color: document.querySelector('input[name="edit-note-color"]:checked').value,
            pinned: document.getElementById('edit-note-pinned').checked
        };

        await updateNote(noteId, updates);
        closeModal();
    });

    // Add click handlers for color options
    document.querySelectorAll('.color-option').forEach(option => {
        option.addEventListener('click', function () {
            this.previousElementSibling.checked = true;
        });
    });
}

// Confirm delete note
function confirmDeleteNote(noteId) {
    if (confirm('Are you sure you want to delete this note?')) {
        deleteNote(noteId);
    }
}

// Update search filter
function updateNotesSearch(value) {
    notesFilter.search = value;
    renderNotes();
}

// Update color filter
function updateNotesColorFilter(color) {
    notesFilter.color = color;
    renderNotes();
}

// Update sort option
function updateNotesSort(sort) {
    notesFilter.sort = sort;
    renderNotes();
}

// Initialize notes module
function initNotesModule() {
    const createNoteBtn = document.getElementById('create-note-btn');
    if (createNoteBtn) {
        createNoteBtn.addEventListener('click', showCreateNoteModal);
    }

    // Search input
    const searchInput = document.getElementById('notes-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => updateNotesSearch(e.target.value));
    }

    // Color filter
    const colorFilter = document.getElementById('notes-color-filter');
    if (colorFilter) {
        colorFilter.addEventListener('change', (e) => updateNotesColorFilter(e.target.value));
    }

    // Sort select
    const sortSelect = document.getElementById('notes-sort');
    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => updateNotesSort(e.target.value));
    }
}

// Export functions
window.fetchNotes = fetchNotes;
window.createNote = createNote;
window.updateNote = updateNote;
window.togglePinNote = togglePinNote;
window.deleteNote = deleteNote;
window.showCreateNoteModal = showCreateNoteModal;
window.showEditNoteModal = showEditNoteModal;
window.confirmDeleteNote = confirmDeleteNote;
window.updateNotesSearch = updateNotesSearch;
window.updateNotesColorFilter = updateNotesColorFilter;
window.updateNotesSort = updateNotesSort;
window.initNotesModule = initNotesModule;
