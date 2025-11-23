// ===================================
// Multi-Device Sync & Offline Mode
// ===================================

let db = null;
let isOnline = navigator.onLine;
let syncQueue = [];
let autoSaveTimers = {};

// Initialize IndexedDB for offline storage
async function initOfflineDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('DigitalLifeDB', 1);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            db = request.result;
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            const db = event.target.result;

            // Create object stores for each module
            if (!db.objectStoreNames.contains('tasks')) {
                db.createObjectStore('tasks', { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains('expenses')) {
                db.createObjectStore('expenses', { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains('habits')) {
                db.createObjectStore('habits', { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains('notes')) {
                db.createObjectStore('notes', { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains('goals')) {
                db.createObjectStore('goals', { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains('drafts')) {
                db.createObjectStore('drafts', { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains('syncQueue')) {
                const syncStore = db.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true });
                syncStore.createIndex('timestamp', 'timestamp', { unique: false });
            }
        };
    });
}

// Save to IndexedDB
async function saveToOfflineDB(storeName, data) {
    if (!db) await initOfflineDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.put(data);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// Get from IndexedDB
async function getFromOfflineDB(storeName, id) {
    if (!db) await initOfflineDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const request = id ? store.get(id) : store.getAll();

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// Delete from IndexedDB
async function deleteFromOfflineDB(storeName, id) {
    if (!db) await initOfflineDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.delete(id);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

// Add to sync queue
async function addToSyncQueue(operation) {
    const queueItem = {
        ...operation,
        timestamp: new Date().toISOString(),
        retries: 0
    };

    await saveToOfflineDB('syncQueue', queueItem);
    syncQueue.push(queueItem);

    // Try to sync immediately if online
    if (isOnline) {
        processSyncQueue();
    }
}

// Process sync queue
async function processSyncQueue() {
    if (!isOnline || syncQueue.length === 0) return;

    const queue = await getFromOfflineDB('syncQueue');
    if (!queue || queue.length === 0) return;

    for (const item of queue) {
        try {
            await executeSyncOperation(item);
            await deleteFromOfflineDB('syncQueue', item.id);
            syncQueue = syncQueue.filter(q => q.id !== item.id);
        } catch (error) {
            console.error('Sync error:', error);

            // Increment retry count
            item.retries = (item.retries || 0) + 1;

            // Remove from queue if too many retries
            if (item.retries > 3) {
                await deleteFromOfflineDB('syncQueue', item.id);
                syncQueue = syncQueue.filter(q => q.id !== item.id);
                showToast(`Failed to sync ${item.operation} after 3 retries`, 'error');
            } else {
                await saveToOfflineDB('syncQueue', item);
            }
        }
    }

    updateSyncIndicator();
}

// Execute sync operation
async function executeSyncOperation(operation) {
    const { type, storeName, data, operation: op } = operation;

    switch (op) {
        case 'create':
            return await supabase.from(storeName).insert([data]);
        case 'update':
            return await supabase.from(storeName).update(data).eq('id', data.id);
        case 'delete':
            return await supabase.from(storeName).delete().eq('id', data.id);
        default:
            throw new Error('Unknown operation');
    }
}

// ===================================
// Auto-Save Drafts
// ===================================

// Auto-save form data
function enableAutoSave(formId, draftKey, interval = 3000) {
    const form = document.getElementById(formId);
    if (!form) return;

    // Clear existing timer
    if (autoSaveTimers[draftKey]) {
        clearInterval(autoSaveTimers[draftKey]);
    }

    // Load existing draft
    loadDraft(draftKey, form);

    // Set up auto-save
    autoSaveTimers[draftKey] = setInterval(() => {
        saveDraft(draftKey, form);
    }, interval);

    // Save on input change
    form.addEventListener('input', () => {
        clearInterval(autoSaveTimers[draftKey]);
        autoSaveTimers[draftKey] = setInterval(() => {
            saveDraft(draftKey, form);
        }, interval);
    });

    // Clear draft on successful submit
    form.addEventListener('submit', () => {
        clearDraft(draftKey);
        if (autoSaveTimers[draftKey]) {
            clearInterval(autoSaveTimers[draftKey]);
            delete autoSaveTimers[draftKey];
        }
    });
}

// Save draft to IndexedDB
async function saveDraft(draftKey, form) {
    const formData = new FormData(form);
    const data = {};

    formData.forEach((value, key) => {
        data[key] = value;
    });

    // Also save non-FormData inputs
    const inputs = form.querySelectorAll('input, textarea, select');
    inputs.forEach(input => {
        if (input.id) {
            data[input.id] = input.value;
        }
    });

    const draft = {
        id: draftKey,
        data: data,
        timestamp: new Date().toISOString()
    };

    await saveToOfflineDB('drafts', draft);

    // Show subtle indicator
    showAutoSaveIndicator();
}

// Load draft from IndexedDB
async function loadDraft(draftKey, form) {
    try {
        const draft = await getFromOfflineDB('drafts', draftKey);

        if (draft && draft.data) {
            // Show restore option
            const restoreBtn = document.createElement('div');
            restoreBtn.style.cssText = `
                position: fixed;
                top: 80px;
                right: 20px;
                background: var(--accent-primary);
                color: white;
                padding: 1rem;
                border-radius: 12px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                z-index: 1000;
                cursor: pointer;
            `;
            restoreBtn.innerHTML = `
                <i class="fas fa-history"></i> Draft found from ${new Date(draft.timestamp).toLocaleString()}
                <button onclick="this.parentElement.remove()" style="margin-left: 1rem; background: rgba(255,255,255,0.2); border: none; padding: 0.25rem 0.5rem; border-radius: 4px; color: white; cursor: pointer;">
                    Dismiss
                </button>
            `;

            restoreBtn.addEventListener('click', (e) => {
                if (e.target.tagName !== 'BUTTON') {
                    restoreDraft(draft.data, form);
                    restoreBtn.remove();
                }
            });

            document.body.appendChild(restoreBtn);
        }
    } catch (error) {
        console.error('Error loading draft:', error);
    }
}

// Restore draft to form
function restoreDraft(data, form) {
    Object.keys(data).forEach(key => {
        const input = form.querySelector(`#${key}`) || form.querySelector(`[name="${key}"]`);
        if (input) {
            input.value = data[key];
        }
    });

    showToast('Draft restored!', 'success');
}

// Clear draft
async function clearDraft(draftKey) {
    try {
        await deleteFromOfflineDB('drafts', draftKey);
    } catch (error) {
        console.error('Error clearing draft:', error);
    }
}

// Show auto-save indicator
function showAutoSaveIndicator() {
    let indicator = document.getElementById('autosave-indicator');

    if (!indicator) {
        indicator = document.createElement('div');
        indicator.id = 'autosave-indicator';
        indicator.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: rgba(16, 185, 129, 0.9);
            color: white;
            padding: 0.5rem 1rem;
            border-radius: 20px;
            font-size: 0.85rem;
            z-index: 1000;
            opacity: 0;
            transition: opacity 0.3s;
        `;
        indicator.innerHTML = '<i class="fas fa-check"></i> Saved';
        document.body.appendChild(indicator);
    }

    indicator.style.opacity = '1';

    setTimeout(() => {
        indicator.style.opacity = '0';
    }, 2000);
}

// ===================================
// Conflict Resolution
// ===================================

// Resolve conflicts using last-write-wins strategy
async function resolveConflict(localData, remoteData, storeName) {
    const localTimestamp = new Date(localData.updated_at || localData.created_at);
    const remoteTimestamp = new Date(remoteData.updated_at || remoteData.created_at);

    // Last write wins
    if (localTimestamp > remoteTimestamp) {
        // Local is newer, push to server
        await supabase
            .from(storeName)
            .update(localData)
            .eq('id', localData.id);

        return localData;
    } else {
        // Remote is newer, update local
        await saveToOfflineDB(storeName, remoteData);
        return remoteData;
    }
}

// Check for conflicts before sync
async function checkAndResolveConflicts(storeName) {
    try {
        const user = await getCurrentUser();
        if (!user) return;

        const localData = await getFromOfflineDB(storeName);

        const { data: remoteData, error } = await supabase
            .from(storeName)
            .select('*')
            .eq('user_id', user.id);

        if (error) throw error;

        const conflicts = [];

        for (const local of localData || []) {
            const remote = remoteData.find(r => r.id === local.id);

            if (remote) {
                const localTime = new Date(local.updated_at || local.created_at);
                const remoteTime = new Date(remote.updated_at || remote.created_at);

                if (Math.abs(localTime - remoteTime) > 1000) { // More than 1 second difference
                    conflicts.push({ local, remote });
                }
            }
        }

        // Resolve conflicts
        for (const conflict of conflicts) {
            await resolveConflict(conflict.local, conflict.remote, storeName);
        }

        if (conflicts.length > 0) {
            showToast(`Resolved ${conflicts.length} conflict(s)`, 'info');
        }

    } catch (error) {
        console.error('Error checking conflicts:', error);
    }
}

// ===================================
// Online/Offline Detection
// ===================================

// Update online status
function updateOnlineStatus() {
    isOnline = navigator.onLine;
    updateSyncIndicator();

    if (isOnline) {
        showToast('Back online! Syncing...', 'success');
        processSyncQueue();
    } else {
        showToast('You are offline. Changes will sync when reconnected.', 'warning');
    }
}

// Update sync indicator in navbar
function updateSyncIndicator() {
    let indicator = document.getElementById('sync-indicator');

    if (!indicator) {
        indicator = document.createElement('div');
        indicator.id = 'sync-indicator';
        indicator.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            padding: 0.5rem 1rem;
            border-radius: 20px;
            font-size: 0.85rem;
            z-index: 10001;
            display: flex;
            align-items: center;
            gap: 0.5rem;
            transition: all 0.3s;
        `;
        document.body.appendChild(indicator);
    }

    if (!isOnline) {
        indicator.style.background = 'rgba(239, 68, 68, 0.9)';
        indicator.style.color = 'white';
        indicator.innerHTML = '<i class="fas fa-wifi-slash"></i> Offline Mode';
    } else if (syncQueue.length > 0) {
        indicator.style.background = 'rgba(251, 191, 36, 0.9)';
        indicator.style.color = 'white';
        indicator.innerHTML = `<i class="fas fa-sync fa-spin"></i> Syncing ${syncQueue.length} item(s)...`;
    } else {
        indicator.style.background = 'rgba(16, 185, 129, 0.9)';
        indicator.style.color = 'white';
        indicator.innerHTML = '<i class="fas fa-check"></i> All synced';

        // Hide after 3 seconds
        setTimeout(() => {
            indicator.style.opacity = '0';
        }, 3000);
    }
}

// ===================================
// Enhanced Data Operations
// ===================================

// Enhanced create with offline support
async function createWithOffline(storeName, data) {
    try {
        // Generate temporary ID for offline
        const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const itemWithId = { ...data, id: tempId, updated_at: new Date().toISOString() };

        // Save to IndexedDB immediately
        await saveToOfflineDB(storeName, itemWithId);

        if (isOnline) {
            // Try to save to Supabase
            const { data: savedData, error } = await supabase
                .from(storeName)
                .insert([data])
                .select()
                .single();

            if (error) throw error;

            // Update IndexedDB with real ID
            await deleteFromOfflineDB(storeName, tempId);
            await saveToOfflineDB(storeName, savedData);

            return savedData;
        } else {
            // Add to sync queue
            await addToSyncQueue({
                operation: 'create',
                storeName,
                data: itemWithId
            });

            return itemWithId;
        }
    } catch (error) {
        console.error('Create error:', error);
        throw error;
    }
}

// Enhanced update with offline support
async function updateWithOffline(storeName, id, updates) {
    try {
        const updatedData = { ...updates, id, updated_at: new Date().toISOString() };

        // Update IndexedDB immediately
        await saveToOfflineDB(storeName, updatedData);

        if (isOnline) {
            // Try to update Supabase
            const { error } = await supabase
                .from(storeName)
                .update(updates)
                .eq('id', id);

            if (error) throw error;
        } else {
            // Add to sync queue
            await addToSyncQueue({
                operation: 'update',
                storeName,
                data: updatedData
            });
        }

        return updatedData;
    } catch (error) {
        console.error('Update error:', error);
        throw error;
    }
}

// Initialize sync system
async function initSyncSystem() {
    // Initialize IndexedDB
    await initOfflineDB();

    // Set up online/offline listeners
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    // Initial status
    updateOnlineStatus();

    // Process sync queue periodically
    setInterval(() => {
        if (isOnline) {
            processSyncQueue();
        }
    }, 30000); // Every 30 seconds

    // Check for conflicts on startup
    if (isOnline) {
        setTimeout(() => {
            checkAndResolveConflicts('tasks');
            checkAndResolveConflicts('expenses');
            checkAndResolveConflicts('habits');
            checkAndResolveConflicts('notes');
        }, 5000);
    }
}

// Export functions
window.initOfflineDB = initOfflineDB;
window.saveToOfflineDB = saveToOfflineDB;
window.getFromOfflineDB = getFromOfflineDB;
window.deleteFromOfflineDB = deleteFromOfflineDB;
window.addToSyncQueue = addToSyncQueue;
window.processSyncQueue = processSyncQueue;
window.enableAutoSave = enableAutoSave;
window.saveDraft = saveDraft;
window.loadDraft = loadDraft;
window.clearDraft = clearDraft;
window.resolveConflict = resolveConflict;
window.checkAndResolveConflicts = checkAndResolveConflicts;
window.updateOnlineStatus = updateOnlineStatus;
window.createWithOffline = createWithOffline;
window.updateWithOffline = updateWithOffline;
window.initSyncSystem = initSyncSystem;
