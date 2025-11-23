// ===================================
// Expenses Module
// ===================================

let expensesData = [];
let expenseFilters = {
    category: 'all',
    month: ''
};
let expenseChart = null;

// Fetch expenses from Supabase
async function fetchExpenses() {
    try {
        const user = await getCurrentUser();
        if (!user) return;

        showLoading();

        const { data, error } = await supabase
            .from('expenses')
            .select('*')
            .eq('user_id', user.id)
            .order('date', { ascending: false });

        hideLoading();

        if (error) throw error;

        expensesData = data || [];
        renderExpenses();
        updateExpenseChart();
        updateCategoryFilterOptions();

    } catch (error) {
        hideLoading();
        showToast('Error loading expenses: ' + error.message, 'error');
        console.error('Error fetching expenses:', error);
    }
}

// Add new expense
async function addExpense(expenseData) {
    try {
        const user = await getCurrentUser();
        if (!user) return;

        showLoading();

        let receiptUrl = null;

        // Upload receipt if provided
        if (expenseData.receipt_file) {
            const file = expenseData.receipt_file;
            const fileExt = file.name.split('.').pop();
            const fileName = `${user.id}/${Date.now()}.${fileExt}`;

            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('receipts')
                .upload(fileName, file);

            if (uploadError) {
                console.error('Receipt upload error:', uploadError);
                showToast('Warning: Receipt upload failed, but expense will be saved', 'warning');
            } else {
                // Get public URL
                const { data: { publicUrl } } = supabase.storage
                    .from('receipts')
                    .getPublicUrl(fileName);
                receiptUrl = publicUrl;
            }
        }

        const { data, error } = await supabase
            .from('expenses')
            .insert([{
                user_id: user.id,
                amount: expenseData.amount,
                category: expenseData.category,
                description: expenseData.description || null,
                date: expenseData.date,
                receipt_url: receiptUrl
            }])
            .select();

        hideLoading();

        if (error) throw error;

        showToast('Expense added successfully!', 'success');
        closeModal();
        fetchExpenses();

    } catch (error) {
        hideLoading();
        showToast('Error adding expense: ' + error.message, 'error');
        console.error('Error adding expense:', error);
    }
}

// Delete expense
async function deleteExpense(expenseId) {
    try {
        showLoading();

        const { error } = await supabase
            .from('expenses')
            .delete()
            .eq('id', expenseId);

        hideLoading();

        if (error) throw error;

        showToast('Expense deleted successfully!', 'success');
        fetchExpenses();

    } catch (error) {
        hideLoading();
        showToast('Error deleting expense: ' + error.message, 'error');
        console.error('Error deleting expense:', error);
    }
}

// Calculate total expenses
function calculateTotal(expenses) {
    return expenses.reduce((sum, expense) => sum + parseFloat(expense.amount), 0);
}

// Group expenses by category
function groupByCategory(expenses) {
    const grouped = {};
    expenses.forEach(expense => {
        if (!grouped[expense.category]) {
            grouped[expense.category] = 0;
        }
        grouped[expense.category] += parseFloat(expense.amount);
    });
    return grouped;
}

// Render expenses
function renderExpenses() {
    const container = document.getElementById('expenses-list');
    if (!container) return;

    // Apply filters
    let filteredExpenses = expensesData.filter(expense => {
        if (expenseFilters.category !== 'all' && expense.category !== expenseFilters.category) {
            return false;
        }
        if (expenseFilters.month) {
            const expenseMonth = expense.date.substring(0, 7); // YYYY-MM
            if (expenseMonth !== expenseFilters.month) {
                return false;
            }
        }
        return true;
    });

    // Update total
    const total = calculateTotal(filteredExpenses);
    const totalElement = document.getElementById('total-expenses');
    if (totalElement) {
        totalElement.textContent = `₹${total.toFixed(2)}`;
    }

    if (filteredExpenses.length === 0) {
        container.innerHTML = `
            <div class="card" style="text-align: center; padding: 3rem;">
                <i class="fas fa-wallet" style="font-size: 3rem; opacity: 0.3; margin-bottom: 1rem;"></i>
                <p style="color: var(--text-secondary);">No expenses found. Click "Add Expense" to create one!</p>
            </div>
        `;
        return;
    }

    container.innerHTML = filteredExpenses.map(expense => `
        <div class="expense-item" data-expense-id="${expense.id}">
            <div class="expense-info">
                <span class="expense-category">${expense.category}</span>
                <h4 style="margin: 0.5rem 0; font-size: 1rem;">${expense.description || expense.category + ' Expense'}</h4>
                <span style="color: var(--text-muted); font-size: 0.85rem;">
                    <i class="fas fa-calendar"></i> ${formatDate(expense.date)}
                </span>
            </div>
            <div style="display: flex; align-items: center; gap: 1rem;">
                <span class="expense-amount">₹${parseFloat(expense.amount).toFixed(2)}</span>
                <button onclick="window.confirmDeleteExpense('${expense.id}')" 
                    style="background: transparent; border: none; color: var(--text-secondary); cursor: pointer; padding: 0.5rem; border-radius: 8px; transition: all 0.2s;" 
                    onmouseover="this.style.background='rgba(239, 68, 68, 0.1)'; this.style.color='#ef4444';" 
                    onmouseout="this.style.background='transparent'; this.style.color='var(--text-secondary)';"
                    title="Delete Expense">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

// Update expense chart
function updateExpenseChart() {
    const canvas = document.getElementById('expenses-chart');
    if (!canvas) return;

    // Apply filters for chart
    let filteredExpenses = expensesData;
    if (expenseFilters.month) {
        filteredExpenses = expensesData.filter(expense => {
            const expenseMonth = expense.date.substring(0, 7);
            return expenseMonth === expenseFilters.month;
        });
    }

    const categoryData = groupByCategory(filteredExpenses);
    const categories = Object.keys(categoryData);
    const amounts = Object.values(categoryData);

    // Destroy existing chart
    if (expenseChart) {
        expenseChart.destroy();
    }

    // Create new chart
    const ctx = canvas.getContext('2d');
    expenseChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: categories,
            datasets: [{
                data: amounts,
                backgroundColor: [
                    'rgba(102, 126, 234, 0.8)',
                    'rgba(118, 75, 162, 0.8)',
                    'rgba(74, 222, 128, 0.8)',
                    'rgba(251, 191, 36, 0.8)',
                    'rgba(248, 113, 113, 0.8)',
                    'rgba(96, 165, 250, 0.8)'
                ],
                borderColor: 'var(--bg-card)',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#ffffff', // Explicit white color for visibility
                        font: {
                            family: 'Inter',
                            size: 13,
                            weight: 500
                        },
                        padding: 15,
                        usePointStyle: true,
                        pointStyle: 'circle'
                    }
                },
                title: {
                    display: true,
                    text: 'Expenses by Category',
                    color: '#ffffff', // Explicit white color
                    font: {
                        family: 'Inter',
                        size: 16,
                        weight: 600
                    },
                    padding: 20
                }
            }
        }
    });
}

// Show add expense modal with receipt upload
function showAddExpenseModal() {
    const modalContent = `
        <div class="modal-header">
            <h3><i class="fas fa-wallet"></i> Add Expense</h3>
            <button class="modal-close" onclick="closeModal()">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <form id="add-expense-form" class="auth-form">
            <div class="form-group">
                <label for="expense-amount">Amount (₹)</label>
                <input type="number" id="expense-amount" step="0.01" required placeholder="0.00">
            </div>
            <div class="form-group">
                <label for="expense-category">Category</label>
                <select id="expense-category" required>
                    <option value="">Select Category</option>
                    <option value="Food">Food</option>
                    <option value="Transport">Transport</option>
                    <option value="Books">Books</option>
                    <option value="Entertainment">Entertainment</option>
                    <option value="Shopping">Shopping</option>
                    <option value="Bills">Bills</option>
                    <option value="Health">Health</option>
                    <option value="Other">Other</option>
                </select>
            </div>
            <div class="form-group">
                <label for="expense-description">Description (Optional)</label>
                <input type="text" id="expense-description" placeholder="e.g., Lunch at cafe">
            </div>
            <div class="form-group">
                <label for="expense-date">Date</label>
                <input type="date" id="expense-date" required value="${getTodayDate()}">
            </div>
            
            <!-- Receipt Upload Section -->
            <div class="form-group">
                <label for="expense-receipt">Receipt (Optional)</label>
                <div style="display: flex; flex-direction: column; gap: 1rem;">
                    <input type="file" id="expense-receipt" accept="image/*" style="display: none;">
                    <button type="button" onclick="document.getElementById('expense-receipt').click()" class="btn btn-secondary" style="width: 100%;">
                        <i class="fas fa-camera"></i> Upload Receipt
                    </button>
                    <div id="receipt-preview" style="display: none; position: relative;">
                        <img id="receipt-preview-img" style="max-width: 100%; border-radius: 8px; border: 1px solid var(--border-color);">
                        <button type="button" onclick="clearReceipt()" style="position: absolute; top: 0.5rem; right: 0.5rem; background: rgba(0,0,0,0.7); color: white; border: none; border-radius: 50%; width: 30px; height: 30px; cursor: pointer;">
                            <i class="fas fa-times"></i>
                        </button>
                        <div id="ocr-status" style="margin-top: 0.5rem; padding: 0.5rem; background: var(--bg-tertiary); border-radius: 8px; font-size: 0.85rem; display: none;">
                            <i class="fas fa-magic"></i> <span id="ocr-message">Processing receipt...</span>
                        </div>
                    </div>
                </div>
            </div>
            
            <button type="submit" class="btn btn-primary">
                <i class="fas fa-plus"></i> Add Expense
            </button>
        </form>
    `;

    showModal(modalContent);

    // Handle receipt upload
    const receiptInput = document.getElementById('expense-receipt');
    receiptInput.addEventListener('change', handleReceiptUpload);

    // Handle form submission
    document.getElementById('add-expense-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        const expenseData = {
            amount: parseFloat(document.getElementById('expense-amount').value),
            category: document.getElementById('expense-category').value,
            description: document.getElementById('expense-description').value,
            date: document.getElementById('expense-date').value,
            receipt_file: receiptInput.files[0] || null
        };

        await addExpense(expenseData);
    });
}

// Handle receipt upload and preview
async function handleReceiptUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Show preview
    const preview = document.getElementById('receipt-preview');
    const previewImg = document.getElementById('receipt-preview-img');
    const reader = new FileReader();

    reader.onload = async (e) => {
        previewImg.src = e.target.result;
        preview.style.display = 'block';

        // OCR Processing with Tesseract.js
        const ocrStatus = document.getElementById('ocr-status');
        const ocrMessage = document.getElementById('ocr-message');
        ocrStatus.style.display = 'block';
        ocrMessage.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing receipt with OCR...';

        try {
            const amount = await extractAmountFromReceipt(e.target.result);

            if (amount) {
                document.getElementById('expense-amount').value = amount;
                ocrMessage.innerHTML = `<i class="fas fa-check-circle" style="color: #10b981;"></i> Amount detected: ₹${amount}`;
            } else {
                ocrMessage.innerHTML = '<i class="fas fa-info-circle"></i> Could not detect amount. Please enter manually.';
            }
        } catch (error) {
            console.error('OCR Error:', error);
            ocrMessage.innerHTML = '<i class="fas fa-exclamation-circle" style="color: #ef4444;"></i> OCR failed. Please enter amount manually.';
        }
    };

    reader.readAsDataURL(file);
}

// Clear receipt
function clearReceipt() {
    document.getElementById('expense-receipt').value = '';
    document.getElementById('receipt-preview').style.display = 'none';
    document.getElementById('ocr-status').style.display = 'none';
}

// OCR Function with Tesseract.js
async function extractAmountFromReceipt(imageData) {
    try {
        // Use Tesseract.js to extract text from image
        const { data: { text } } = await Tesseract.recognize(
            imageData,
            'eng',
            {
                logger: m => {
                    // Optional: show progress
                    if (m.status === 'recognizing text') {
                        const ocrMessage = document.getElementById('ocr-message');
                        if (ocrMessage) {
                            ocrMessage.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Processing... ${Math.round(m.progress * 100)}%`;
                        }
                    }
                }
            }
        );

        console.log('OCR Text:', text);

        // Try to extract amount using various patterns
        const patterns = [
            /(?:total|amount|sum|₹|rs\.?|inr)\s*:?\s*₹?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/i,
            /₹\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/,
            /(?:^|\s)(\d+(?:,\d{3})*\.\d{2})(?:\s|$)/,
            /(?:^|\s)(\d{1,6})(?:\s|$)/
        ];

        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match) {
                const amount = parseFloat(match[1].replace(/,/g, ''));
                if (amount > 0 && amount < 1000000) { // Reasonable range
                    return amount.toFixed(2);
                }
            }
        }

        return null;
    } catch (error) {
        console.error('Tesseract error:', error);
        return null;
    }
}

// Confirm delete expense
function confirmDeleteExpense(expenseId) {
    const modalContent = `
        <div class="modal-header">
            <h3><i class="fas fa-exclamation-triangle"></i> Confirm Delete</h3>
            <button class="modal-close" onclick="closeModal()">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <p style="margin: 1.5rem 0; color: var(--text-secondary);">
            Are you sure you want to delete this expense? This action cannot be undone.
        </p>
        <div style="display: flex; gap: 1rem; justify-content: flex-end;">
            <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
            <button class="btn btn-danger" onclick="window.deleteExpense('${expenseId}'); closeModal();">
                <i class="fas fa-trash"></i> Delete
            </button>
        </div>
    `;

    showModal(modalContent);
}

// Update category filter options
function updateCategoryFilterOptions() {
    const categoryFilter = document.getElementById('expense-category-filter');
    if (!categoryFilter) return;

    // Get all unique categories
    const categories = new Set(['Food', 'Transport', 'Books', 'Entertainment', 'Other']);
    expensesData.forEach(expense => categories.add(expense.category));

    // Save current selection
    const currentSelection = categoryFilter.value;

    // Rebuild options
    categoryFilter.innerHTML = '<option value="all">All Categories</option>';
    Array.from(categories).sort().forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        categoryFilter.appendChild(option);
    });

    // Restore selection if it still exists
    if (categories.has(currentSelection) || currentSelection === 'all') {
        categoryFilter.value = currentSelection;
    } else {
        categoryFilter.value = 'all';
        expenseFilters.category = 'all';
    }
}

// Initialize expense filters
function initExpenseFilters() {
    const categoryFilter = document.getElementById('expense-category-filter');
    const monthFilter = document.getElementById('expense-month-filter');

    // Set default month to current month
    if (monthFilter && !monthFilter.value) {
        const today = new Date();
        const currentMonth = today.toISOString().substring(0, 7);
        monthFilter.value = currentMonth;
        expenseFilters.month = currentMonth;
    }

    if (categoryFilter) {
        categoryFilter.addEventListener('change', (e) => {
            expenseFilters.category = e.target.value;
            renderExpenses();
            updateExpenseChart();
        });
    }

    if (monthFilter) {
        monthFilter.addEventListener('change', (e) => {
            expenseFilters.month = e.target.value;
            renderExpenses();
            updateExpenseChart();
        });
    }
}

// CSV Import Functions
function showImportExpensesModal() {
    const modalContent = `
        <div class="modal-header">
            <h3><i class="fas fa-file-import"></i> Import Expenses from CSV</h3>
            <button class="modal-close" onclick="closeModal()">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <div style="padding: 1.5rem;">
            <p style="color: var(--text-secondary); margin-bottom: 1.5rem;">
                Upload a CSV file with your expense data. The file should have columns: Date, Amount, Category (optional).
            </p>
            
            <div class="form-group">
                <label for="csv-file-input">Choose CSV File</label>
                <input type="file" id="csv-file-input" accept=".csv" style="
                    padding: 0.875rem;
                    background: var(--bg-tertiary);
                    border: 1px solid var(--border-color);
                    border-radius: 12px;
                    color: var(--text-primary);
            <div id="csv-upload-step">
                <div class="form-group">
                    <label>Select CSV File</label>
                    <input type="file" id="csv-file-input" accept=".csv" style="width: 100%;">
                    <p style="font-size: 0.85rem; color: var(--text-muted); margin-top: 0.5rem;">
                        CSV should contain: Date, Amount, Category (optional)
                    </p>
                </div>
                <button onclick="loadCSVPreview()" class="btn btn-primary" style="width: 100%;">
                    <i class="fas fa-eye"></i> Preview & Map Columns
                </button>
            </div>
            <div id="csv-preview-step" style="display: none;"></div>
        </div>
    `;
    showModal(modalContent);
}

// Load CSV and show preview
async function loadCSVPreview() {
    const fileInput = document.getElementById('csv-file-input');
    const file = fileInput.files[0];

    if (!file) {
        showToast('Please select a CSV file', 'error');
        return;
    }

    try {
        showLoading();
        const text = await file.text();
        const parsed = parseCSVEnhanced(text);

        csvPreviewData = parsed.rows;
        csvColumnMapping = parsed.suggestedMapping;

        hideLoading();
        showCSVPreview(parsed.headers);

    } catch (error) {
        hideLoading();
        showToast('Error reading CSV: ' + error.message, 'error');
    }
}

// Parse CSV with enhanced features
function parseCSVEnhanced(text) {
    const lines = text.trim().split('\n');
    if (lines.length < 2) {
        throw new Error('CSV file is empty or invalid');
    }

    // Parse header
    const headers = lines[0].split(',').map(h => h.trim());

    // Suggest column mapping
    const suggestedMapping = {
        date: headers.findIndex(h => h.toLowerCase().includes('date')),
        amount: headers.findIndex(h => {
            const lower = h.toLowerCase();
            return lower.includes('amount') || lower.includes('debit') || lower.includes('paid') || lower.includes('price');
        }),
        category: headers.findIndex(h => {
            const lower = h.toLowerCase();
            return lower.includes('category') || lower.includes('type') || lower.includes('merchant');
        }),
        description: headers.findIndex(h => {
            const lower = h.toLowerCase();
            return lower.includes('description') || lower.includes('note') || lower.includes('memo');
        })
    };

    // Parse rows
    const rows = [];
    for (let i = 1; i < Math.min(lines.length, 101); i++) { // Limit to 100 rows for preview
        const line = lines[i].trim();
        if (!line) continue;

        const values = line.split(',').map(v => v.trim());
        rows.push({
            rowIndex: i,
            values: values,
            errors: []
        });
    }

    return { headers, suggestedMapping, rows };
}

// Show CSV preview with mapping and validation
function showCSVPreview(headers) {
    document.getElementById('csv-upload-step').style.display = 'none';

    const previewHTML = `
        <div id="csv-preview-step">
            <h4 style="margin-bottom: 1rem;">Step 2: Map Columns & Preview</h4>
            
            <!-- Column Mapping -->
            <div style="background: var(--bg-tertiary); padding: 1rem; border-radius: 12px; margin-bottom: 1rem;">
                <h5 style="margin-bottom: 0.75rem;">Column Mapping</h5>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
                    <div class="form-group" style="margin: 0;">
                        <label>Date Column</label>
                        <select id="map-date" onchange="updateMapping()" class="form-control">
                            <option value="-1">-- Select --</option>
                            ${headers.map((h, i) => `<option value="${i}" ${i === csvColumnMapping.date ? 'selected' : ''}>${h}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group" style="margin: 0;">
                        <label>Amount Column</label>
                        <select id="map-amount" onchange="updateMapping()" class="form-control">
                            <option value="-1">-- Select --</option>
                            ${headers.map((h, i) => `<option value="${i}" ${i === csvColumnMapping.amount ? 'selected' : ''}>${h}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group" style="margin: 0;">
                        <label>Category Column (Optional)</label>
                        <select id="map-category" onchange="updateMapping()" class="form-control">
                            <option value="-1">-- None --</option>
                            ${headers.map((h, i) => `<option value="${i}" ${i === csvColumnMapping.category ? 'selected' : ''}>${h}</option>`).join('')}
                        </select>
                    </div>
                </div>
            </div>

            <!-- Preview Table -->
            <div style="margin-bottom: 1rem;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                    <h5>Preview (First 100 rows)</h5>
                    <span id="validation-summary" style="font-size: 0.85rem;"></span>
                </div>
                <div style="max-height: 400px; overflow: auto; border: 1px solid var(--border-color); border-radius: 8px;">
                    <table id="csv-preview-table" style="width: 100%; border-collapse: collapse;">
                        <thead style="position: sticky; top: 0; background: var(--bg-secondary); z-index: 1;">
                            <tr>
                                <th style="padding: 0.75rem; border-bottom: 2px solid var(--border-color);">#</th>
                                ${headers.map(h => `<th style="padding: 0.75rem; border-bottom: 2px solid var(--border-color);">${h}</th>`).join('')}
                                <th style="padding: 0.75rem; border-bottom: 2px solid var(--border-color);">Status</th>
                            </tr>
                        </thead>
                        <tbody id="csv-preview-body">
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Actions -->
            <div style="display: flex; gap: 0.5rem; justify-content: flex-end;">
                <button onclick="showImportExpensesModal()" class="btn btn-secondary">
                    <i class="fas fa-arrow-left"></i> Back
                </button>
                <button onclick="validateAndImportCSV()" class="btn btn-primary" id="import-csv-btn">
                    <i class="fas fa-check"></i> Import Valid Rows
                </button>
            </div>
        </div>
    `;

    document.getElementById('csv-preview-step').innerHTML = previewHTML;
    document.getElementById('csv-preview-step').style.display = 'block';

    validateAndRenderPreview();
}

// Update column mapping
function updateMapping() {
    csvColumnMapping.date = parseInt(document.getElementById('map-date').value);
    csvColumnMapping.amount = parseInt(document.getElementById('map-amount').value);
    csvColumnMapping.category = parseInt(document.getElementById('map-category').value);

    validateAndRenderPreview();
}

// Validate rows and render preview
function validateAndRenderPreview() {
    csvErrors = [];
    let validCount = 0;
    let errorCount = 0;

    const tbody = document.getElementById('csv-preview-body');
    tbody.innerHTML = '';

    csvPreviewData.forEach((row, index) => {
        const errors = validateRow(row.values);
        row.errors = errors;

        if (errors.length === 0) {
            validCount++;
        } else {
            errorCount++;
        }

        const tr = document.createElement('tr');
        tr.style.background = errors.length > 0 ? 'rgba(239, 68, 68, 0.1)' : '';

        // Row number
        const tdNum = document.createElement('td');
        tdNum.textContent = index + 1;
        tdNum.style.padding = '0.5rem';
        tdNum.style.borderBottom = '1px solid var(--border-color)';
        tr.appendChild(tdNum);

        // Data cells
        row.values.forEach((value, i) => {
            const td = document.createElement('td');
            td.textContent = value;
            td.style.padding = '0.5rem';
            td.style.borderBottom = '1px solid var(--border-color)';
            tr.appendChild(td);
        });

        // Status cell
        const tdStatus = document.createElement('td');
        tdStatus.style.padding = '0.5rem';
        tdStatus.style.borderBottom = '1px solid var(--border-color)';
        if (errors.length > 0) {
            tdStatus.innerHTML = `<span style="color: #ef4444; font-size: 0.85rem;" title="${errors.join(', ')}"><i class="fas fa-exclamation-circle"></i> ${errors.length} error(s)</span>`;
        } else {
            tdStatus.innerHTML = `<span style="color: #4ade80; font-size: 0.85rem;"><i class="fas fa-check-circle"></i> Valid</span>`;
        }
        tr.appendChild(tdStatus);

        tbody.appendChild(tr);
    });

    // Update summary
    const summary = document.getElementById('validation-summary');
    summary.innerHTML = `<span style="color: #4ade80;">${validCount} valid</span> | <span style="color: #ef4444;">${errorCount} errors</span>`;
}

// Validate individual row
function validateRow(values) {
    const errors = [];

    // Check date
    if (csvColumnMapping.date >= 0) {
        const dateValue = values[csvColumnMapping.date];
        if (!dateValue || !isValidDate(dateValue)) {
            errors.push('Invalid date');
        }
    } else {
        errors.push('Date column not mapped');
    }

    // Check amount
    if (csvColumnMapping.amount >= 0) {
        const amountValue = values[csvColumnMapping.amount];
        const amount = parseFloat(amountValue);
        if (isNaN(amount) || amount <= 0) {
            errors.push('Invalid amount');
        }
    } else {
        errors.push('Amount column not mapped');
    }

    return errors;
}

// Validate date format
function isValidDate(dateString) {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date);
}

// Validate and import CSV
async function validateAndImportCSV() {
    const validRows = csvPreviewData.filter(row => row.errors.length === 0);

    if (validRows.length === 0) {
        showToast('No valid rows to import', 'error');
        return;
    }

    try {
        showLoading();

        // Check for duplicates
        const existingExpenses = expensesData.map(e => `${e.date}-${e.amount}`);
        const newExpenses = [];
        let duplicateCount = 0;

        for (const row of validRows) {
            const date = row.values[csvColumnMapping.date];
            const amount = parseFloat(row.values[csvColumnMapping.amount]);
            const category = csvColumnMapping.category >= 0 ? row.values[csvColumnMapping.category] : 'Other';

            const key = `${date}-${amount}`;
            if (existingExpenses.includes(key)) {
                duplicateCount++;
                continue;
            }

            newExpenses.push({ date, amount, category: category || 'Other' });
        }

        if (newExpenses.length === 0) {
            hideLoading();
            showToast('All rows are duplicates!', 'warning');
            return;
        }

        // Bulk insert
        await bulkInsertExpenses(newExpenses);

        hideLoading();

        // Show import summary
        showImportSummary({
            total: validRows.length,
            imported: newExpenses.length,
            duplicates: duplicateCount,
            errors: csvPreviewData.length - validRows.length
        });

        fetchExpenses();

    } catch (error) {
        hideLoading();
        showToast('Error importing CSV: ' + error.message, 'error');
    }
}

// Show import summary
function showImportSummary(stats) {
    const modalContent = `
        <div class="modal-header">
            <h3><i class="fas fa-check-circle" style="color: #4ade80;"></i> Import Complete</h3>
            <button class="modal-close" onclick="closeModal()">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <div style="padding: 2rem; text-align: center;">
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; margin-bottom: 2rem;">
                <div style="background: var(--bg-tertiary); padding: 1.5rem; border-radius: 12px;">
                    <div style="font-size: 2rem; font-weight: 700; color: #4ade80;">${stats.imported}</div>
                    <div style="color: var(--text-muted); font-size: 0.9rem;">Imported</div>
                </div>
                <div style="background: var(--bg-tertiary); padding: 1.5rem; border-radius: 12px;">
                    <div style="font-size: 2rem; font-weight: 700; color: #fbbf24;">${stats.duplicates}</div>
                    <div style="color: var(--text-muted); font-size: 0.9rem;">Duplicates Skipped</div>
                </div>
                <div style="background: var(--bg-tertiary); padding: 1.5rem; border-radius: 12px;">
                    <div style="font-size: 2rem; font-weight: 700; color: #ef4444;">${stats.errors}</div>
                    <div style="color: var(--text-muted); font-size: 0.9rem;">Errors</div>
                </div>
                <div style="background: var(--bg-tertiary); padding: 1.5rem; border-radius: 12px;">
                    <div style="font-size: 2rem; font-weight: 700; color: var(--text-primary);">${stats.total}</div>
                    <div style="color: var(--text-muted); font-size: 0.9rem;">Total Rows</div>
                </div>
            </div>
            <button onclick="closeModal()" class="btn btn-primary">
                <i class="fas fa-check"></i> Done
            </button>
        </div>
    `;
    showModal(modalContent);
}

async function bulkInsertExpenses(expenses) {
    const user = await getCurrentUser();
    if (!user) throw new Error('User not authenticated');

    const expensesWithUserId = expenses.map(exp => ({
        user_id: user.id,
        amount: exp.amount,
        category: exp.category,
        date: exp.date
    }));

    const { data, error } = await supabase
        .from('expenses')
        .insert(expensesWithUserId);

    if (error) throw error;
    return data;
}

// Initialize expenses module
function initExpensesModule() {
    const addExpenseBtn = document.getElementById('add-expense-btn');
    if (addExpenseBtn) {
        addExpenseBtn.addEventListener('click', showAddExpenseModal);
    }

    const importExpensesBtn = document.getElementById('import-expenses-btn');
    if (importExpensesBtn) {
        importExpensesBtn.addEventListener('click', showImportExpensesModal);
    }

    initExpenseFilters();
}

// Export functions
window.fetchExpenses = fetchExpenses;
window.addExpense = addExpense;
window.deleteExpense = deleteExpense;
window.showAddExpenseModal = showAddExpenseModal;
window.confirmDeleteExpense = confirmDeleteExpense;
window.initExpensesModule = initExpensesModule;
window.showImportExpensesModal = showImportExpensesModal;
window.loadCSVPreview = loadCSVPreview;
window.updateMapping = updateMapping;
window.validateAndImportCSV = validateAndImportCSV;
