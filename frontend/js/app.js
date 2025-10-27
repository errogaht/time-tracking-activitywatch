// Main application logic

let currentClientId = null;
let activityWatchData = null;
let currentEditingClient = null;

// ========== Initialization ==========

document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    setupEventListeners();
});

async function initializeApp() {
    try {
        await loadClientsSelector();
        await loadClientsList();
    } catch (error) {
        showError('Failed to initialize application: ' + error.message);
    }
}

// ========== Client Management ==========

async function loadClientsSelector() {
    try {
        const clients = await api.getClients();
        const select = document.getElementById('clientSelect');

        select.innerHTML = '<option value="">Select a client...</option>';

        clients.forEach(client => {
            const option = document.createElement('option');
            option.value = client.id;
            option.textContent = client.name;
            select.appendChild(option);
        });

        // If only one client, select it automatically
        if (clients.length === 1) {
            select.value = clients[0].id;
            await onClientChange();
        }
    } catch (error) {
        showError('Failed to load clients: ' + error.message);
    }
}

async function loadClientsList() {
    const container = document.getElementById('clientsContainer');

    try {
        container.innerHTML = '<div class="loading">Loading clients...</div>';

        const clients = await api.getClients();

        if (clients.length === 0) {
            container.innerHTML = '<div class="empty-state">No clients found. Click "+ Add Client" to create one.</div>';
            return;
        }

        container.innerHTML = clients.map(client => `
            <div class="client-card ${!client.is_active ? 'inactive' : ''}">
                <div class="client-header">
                    <h3 class="client-name">${escapeHtml(client.name)}</h3>
                    <span class="client-status ${client.is_active ? 'active' : 'inactive'}">
                        ${client.is_active ? 'Active' : 'Inactive'}
                    </span>
                </div>
                <div class="client-details">
                    <div class="client-detail-item">
                        <span class="label">Hourly Rate:</span>
                        <span class="value">${formatCurrency(client.hourly_rate)}/hr</span>
                    </div>
                    ${client.activitywatch_category ? `
                    <div class="client-detail-item">
                        <span class="label">ActivityWatch Category:</span>
                        <span class="value">${escapeHtml(client.activitywatch_category)}</span>
                    </div>
                    ` : ''}
                    ${client.contact_info ? `
                    <div class="client-detail-item">
                        <span class="label">Contact:</span>
                        <span class="value">${escapeHtml(client.contact_info)}</span>
                    </div>
                    ` : ''}
                    ${client.notes ? `
                    <div class="client-detail-item">
                        <span class="label">Notes:</span>
                        <span class="value">${escapeHtml(client.notes)}</span>
                    </div>
                    ` : ''}
                </div>
                <div class="client-actions">
                    <button class="btn btn-secondary btn-small" onclick="openClientModal(${client.id})">Edit</button>
                    ${client.is_active ? `
                    <button class="btn btn-danger btn-small" onclick="deleteClient(${client.id})">Deactivate</button>
                    ` : ''}
                </div>
            </div>
        `).join('');
    } catch (error) {
        container.innerHTML = `<div class="message error">Failed to load clients: ${error.message}</div>`;
    }
}

function openClientModal(clientId = null) {
    const modal = document.getElementById('clientModal');
    const form = document.getElementById('clientForm');
    const title = document.getElementById('clientModalTitle');

    // Reset form
    form.reset();
    currentEditingClient = null;

    if (clientId) {
        // Edit mode
        title.textContent = 'Edit Client';
        loadClientForEdit(clientId);
    } else {
        // Create mode
        title.textContent = 'Add Client';
    }

    modal.classList.add('active');
}

async function loadClientForEdit(clientId) {
    try {
        const client = await api.getClient(clientId);
        currentEditingClient = client;

        document.getElementById('clientName').value = client.name || '';
        document.getElementById('clientHourlyRate').value = client.hourly_rate || '';
        document.getElementById('clientAwCategory').value = client.activitywatch_category || '';
        document.getElementById('clientContactInfo').value = client.contact_info || '';
        document.getElementById('clientNotes').value = client.notes || '';
    } catch (error) {
        showError('Failed to load client details: ' + error.message);
        closeModal('clientModal');
    }
}

async function handleClientSubmit(e) {
    e.preventDefault();

    const clientData = {
        name: document.getElementById('clientName').value,
        hourly_rate: parseFloat(document.getElementById('clientHourlyRate').value),
        activitywatch_category: document.getElementById('clientAwCategory').value || null,
        contact_info: document.getElementById('clientContactInfo').value || null,
        notes: document.getElementById('clientNotes').value || null
    };

    try {
        if (currentEditingClient) {
            // Update existing client
            await api.updateClient(currentEditingClient.id, clientData);
            showSuccess('Client updated successfully');
        } else {
            // Create new client
            await api.createClient(clientData);
            showSuccess('Client created successfully');
        }

        closeModal('clientModal');
        await loadClientsSelector();
        await loadClientsList();
    } catch (error) {
        showError('Failed to save client: ' + error.message);
    }
}

async function deleteClient(clientId) {
    if (!confirm('Are you sure you want to deactivate this client? This will not delete any existing time entries or payments.')) {
        return;
    }

    try {
        await api.deleteClient(clientId);
        await loadClientsSelector();
        await loadClientsList();
        showSuccess('Client deactivated successfully');

        // If this was the selected client, clear the selection
        if (currentClientId == clientId) {
            document.getElementById('clientSelect').value = '';
            currentClientId = null;
            clearDashboard();
        }
    } catch (error) {
        showError('Failed to deactivate client: ' + error.message);
    }
}

async function onClientChange() {
    const select = document.getElementById('clientSelect');
    currentClientId = select.value;

    if (!currentClientId) {
        clearDashboard();
        return;
    }

    await loadDashboard();
}

function clearDashboard() {
    // Reset balance
    document.getElementById('totalTime').textContent = '--h --m';
    document.getElementById('totalEarned').textContent = '₽0.00';
    document.getElementById('totalPaid').textContent = '₽0.00';
    document.getElementById('currentBalance').textContent = '₽0.00';
    document.getElementById('unbilledTime').textContent = '--h --m';
    document.getElementById('unbilledAmount').textContent = '₽0.00';

    // Clear lists
    document.getElementById('timeEntriesContainer').innerHTML = '<div class="empty-state">Please select a client</div>';
    document.getElementById('paymentsContainer').innerHTML = '<div class="empty-state">Please select a client</div>';
    document.getElementById('billsContainer').innerHTML = '<div class="empty-state">Please select a client</div>';
}

async function loadDashboard() {
    await Promise.all([
        loadBalance(),
        loadTimeEntries(),
        loadPayments(),
        loadBills()
    ]);
}

// ========== Balance ==========

async function loadBalance() {
    try {
        const response = await api.getClientBalance(currentClientId);
        const balance = response.data || response;

        document.getElementById('totalTime').textContent = formatTime(balance.time_worked?.total_minutes_sum);
        document.getElementById('totalEarned').textContent = formatCurrency(balance.earnings?.total_amount);
        document.getElementById('totalPaid').textContent = formatCurrency(balance.payments?.total_paid);

        // Display balance with visual indicator
        const balanceElement = document.getElementById('currentBalance');
        const balanceAmount = balance.balance?.amount || 0;
        const balanceStatus = balance.balance?.status;

        balanceElement.textContent = formatCurrency(balanceAmount);

        // Add visual indicator based on status
        // Positive (green) = client has credit/prepayment
        // Negative (red) = client owes money
        if (balanceAmount > 0) {
            balanceElement.style.color = '#27ae60'; // Green
            balanceElement.title = 'Client has prepaid / Account credit';
        } else if (balanceAmount < 0) {
            balanceElement.style.color = '#e74c3c'; // Red
            balanceElement.title = 'Client owes money for work done';
        } else {
            balanceElement.style.color = '#7f8c8d'; // Gray
            balanceElement.title = 'Account is balanced';
        }

        document.getElementById('unbilledTime').textContent = formatTime(balance.unbilled?.total_minutes_sum);
        document.getElementById('unbilledAmount').textContent = formatCurrency(balance.unbilled?.amount);
    } catch (error) {
        showError('Failed to load balance: ' + error.message);
    }
}

// ========== Time Entries ==========

async function loadTimeEntries() {
    const container = document.getElementById('timeEntriesContainer');
    const dateInput = document.getElementById('entriesDate');

    try {
        container.innerHTML = '<div class="loading">Loading time entries...</div>';

        const params = { client_id: currentClientId };
        if (dateInput.value) {
            params.date = dateInput.value;
        }

        const entries = await api.getTimeEntries(params);

        if (entries.length === 0) {
            container.innerHTML = '<div class="empty-state">No time entries found</div>';
            return;
        }

        container.innerHTML = entries.map(entry => `
            <div class="entry-card">
                <div class="entry-date">${formatDate(entry.work_date || entry.date)}</div>
                <div class="entry-details">
                    <div class="entry-main">${formatTime(entry.total_minutes || entry.minutes)}</div>
                    <div class="entry-sub">
                        Source: ${entry.source || 'manual'}
                        ${entry.is_billed ? ' • <span class="bill-status paid">Billed</span>' : ''}
                    </div>
                    ${entry.notes ? `<div class="entry-sub">${escapeHtml(entry.notes)}</div>` : ''}
                </div>
                <div class="entry-actions">
                    ${!entry.is_billed ? `<button class="btn btn-danger btn-small" onclick="deleteTimeEntry(${entry.id})">Delete</button>` : ''}
                </div>
            </div>
        `).join('');
    } catch (error) {
        container.innerHTML = `<div class="message error">Failed to load time entries: ${error.message}</div>`;
    }
}

async function deleteTimeEntry(entryId) {
    if (!confirm('Are you sure you want to delete this time entry?')) {
        return;
    }

    try {
        await api.deleteTimeEntry(entryId);
        await loadTimeEntries();
        await loadBalance();
        showSuccess('Time entry deleted successfully');
    } catch (error) {
        showError('Failed to delete time entry: ' + error.message);
    }
}

// ========== Payments ==========

async function loadPayments() {
    const container = document.getElementById('paymentsContainer');

    try {
        container.innerHTML = '<div class="loading">Loading payments...</div>';

        const payments = await api.getPayments({ client_id: currentClientId });

        if (payments.length === 0) {
            container.innerHTML = '<div class="empty-state">No payments found</div>';
            return;
        }

        container.innerHTML = payments.map(payment => `
            <div class="entry-card payment-card">
                <div class="entry-date">${formatDate(payment.payment_date)}</div>
                <div class="entry-details">
                    <div class="entry-main">
                        <span class="payment-type ${payment.payment_type}">${payment.payment_type}</span>
                        ${payment.amount ? formatCurrency(payment.amount) : ''}
                    </div>
                    ${payment.supplements_description ? `<div class="entry-sub">${escapeHtml(payment.supplements_description)}</div>` : ''}
                    ${payment.notes ? `<div class="entry-sub">${escapeHtml(payment.notes)}</div>` : ''}
                </div>
                <div class="entry-actions">
                    <button class="btn btn-danger btn-small" onclick="deletePayment(${payment.id})">Delete</button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        container.innerHTML = `<div class="message error">Failed to load payments: ${error.message}</div>`;
    }
}

async function deletePayment(paymentId) {
    if (!confirm('Are you sure you want to delete this payment?')) {
        return;
    }

    try {
        await api.deletePayment(paymentId);
        await loadPayments();
        await loadBalance();
        showSuccess('Payment deleted successfully');
    } catch (error) {
        showError('Failed to delete payment: ' + error.message);
    }
}

// ========== Bills ==========

async function loadBills() {
    const container = document.getElementById('billsContainer');

    try {
        container.innerHTML = '<div class="loading">Loading bills...</div>';

        const bills = await api.getBills({ client_id: currentClientId });

        if (bills.length === 0) {
            container.innerHTML = '<div class="empty-state">No bills found</div>';
            return;
        }

        container.innerHTML = bills.map(bill => `
            <div class="entry-card bill-card">
                <div class="entry-date">Bill #${bill.bill_number}</div>
                <div class="entry-details">
                    <div class="entry-main">
                        ${formatCurrency(bill.total_amount)}
                        <span class="bill-status ${bill.status}">${bill.status}</span>
                    </div>
                    <div class="entry-sub">
                        Date: ${formatDate(bill.issue_date || bill.date)} • Type: ${bill.bill_type || bill.type}
                    </div>
                    ${bill.notes ? `<div class="entry-sub">${escapeHtml(bill.notes)}</div>` : ''}
                </div>
                <div class="entry-actions">
                    <button class="btn btn-primary btn-small" onclick="viewBill(${bill.id})">View</button>
                    ${bill.status === 'draft' ? `<button class="btn btn-danger btn-small" onclick="deleteBill(${bill.id})">Delete</button>` : ''}
                </div>
            </div>
        `).join('');
    } catch (error) {
        container.innerHTML = `<div class="message error">Failed to load bills: ${error.message}</div>`;
    }
}

async function viewBill(billId) {
    try {
        const htmlData = await api.generateBillHTML(billId);
        const newWindow = window.open('', '_blank');
        newWindow.document.write(htmlData.html);
        newWindow.document.close();
    } catch (error) {
        showError('Failed to view bill: ' + error.message);
    }
}

async function deleteBill(billId) {
    if (!confirm('Are you sure you want to delete this bill?')) {
        return;
    }

    try {
        await api.deleteBill(billId);
        await loadBills();
        await loadBalance();
        showSuccess('Bill deleted successfully');
    } catch (error) {
        showError('Failed to delete bill: ' + error.message);
    }
}

// ========== Event Listeners ==========

function setupEventListeners() {
    // Client selector
    document.getElementById('clientSelect').addEventListener('change', onClientChange);

    // Date picker for time entries
    document.getElementById('entriesDate').addEventListener('change', loadTimeEntries);

    // Modal buttons
    document.getElementById('addClientBtn').addEventListener('click', () => openClientModal());
    document.getElementById('addTimeEntryBtn').addEventListener('click', () => openModal('timeEntryModal'));
    document.getElementById('addPaymentBtn').addEventListener('click', () => openModal('paymentModal'));
    document.getElementById('generateBillBtn').addEventListener('click', () => openModal('billModal'));

    // Close buttons
    document.querySelectorAll('.modal .close').forEach(closeBtn => {
        closeBtn.addEventListener('click', (e) => {
            const modal = e.target.closest('.modal');
            closeModal(modal.id);
        });
    });

    // Click outside modal to close
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal(modal.id);
            }
        });
    });

    // Tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tab = e.target.dataset.tab;
            switchTab(e.target.closest('.modal-content'), tab);
        });
    });

    // Forms
    document.getElementById('clientForm').addEventListener('submit', handleClientSubmit);
    document.getElementById('manualTimeForm').addEventListener('submit', handleManualTimeEntry);
    document.getElementById('activityWatchForm').addEventListener('submit', handleActivityWatchImport);
    document.getElementById('paymentForm').addEventListener('submit', handlePaymentSubmit);
    document.getElementById('billForm').addEventListener('submit', handleBillSubmit);

    // Payment type change
    document.getElementById('paymentType').addEventListener('change', onPaymentTypeChange);

    // ActivityWatch refresh button
    document.getElementById('awRefreshBtn').addEventListener('click', refreshActivityWatch);
}

// ========== Modal Management ==========

function openModal(modalId) {
    if (!currentClientId) {
        showError('Please select a client first');
        return;
    }

    const modal = document.getElementById(modalId);
    modal.classList.add('active');

    // Reset forms
    const forms = modal.querySelectorAll('form');
    forms.forEach(form => form.reset());

    // Set default dates
    const today = new Date().toISOString().split('T')[0];
    modal.querySelectorAll('input[type="date"]').forEach(input => {
        if (!input.value) {
            input.value = today;
        }
    });

    // Special handling for bill modal
    if (modalId === 'billModal') {
        loadUnbilledEntries();
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.classList.remove('active');

    // Clear ActivityWatch data
    if (modalId === 'timeEntryModal') {
        activityWatchData = null;
        document.getElementById('awPreview').innerHTML = '';
        document.getElementById('awPreview').classList.add('empty');
    }
}

function switchTab(container, tabName) {
    // Update tab buttons
    container.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabName);
    });

    // Update tab content
    container.querySelectorAll('.tab-content').forEach(content => {
        content.classList.toggle('active', content.id === tabName);
    });
}

// ========== Time Entry Forms ==========

async function handleManualTimeEntry(e) {
    e.preventDefault();

    const date = document.getElementById('manualDate').value;
    const hours = parseInt(document.getElementById('manualHours').value) || 0;
    const minutes = parseInt(document.getElementById('manualMinutes').value) || 0;
    const notes = document.getElementById('manualNotes').value;

    if (hours === 0 && minutes === 0) {
        showError('Please enter a valid time amount');
        return;
    }

    try {
        await api.createTimeEntry({
            client_id: currentClientId,
            work_date: date,
            hours: hours,
            minutes: minutes,
            source: 'manual',
            notes: notes
        });

        closeModal('timeEntryModal');
        await loadTimeEntries();
        await loadBalance();
        showSuccess('Time entry added successfully');
    } catch (error) {
        showError('Failed to add time entry: ' + error.message);
    }
}

async function refreshActivityWatch() {
    if (!currentClientId) {
        showError('Please select a client first');
        return;
    }

    const date = document.getElementById('awDate').value;
    const excludeAfk = document.getElementById('awExcludeAfk').checked;

    if (!date) {
        showError('Please select a date');
        return;
    }

    try {
        // Get current client to access activitywatch_category
        const client = await api.getClient(currentClientId);

        if (!client.activitywatch_category) {
            showError('This client has no ActivityWatch category configured. Please edit the client and set one.');
            return;
        }

        // Fetch time from ActivityWatch with category
        const summary = await api.getActivitySummary(date, excludeAfk, client.activitywatch_category);
        activityWatchData = summary;

        // Display preview
        const preview = document.getElementById('awPreview');
        if (summary && summary.total_seconds > 0) {
            const totalMinutes = summary.hours * 60 + summary.minutes;
            preview.innerHTML = `
                <div class="aw-preview-item">
                    <span class="label">Total Time:</span>
                    <span class="value">${formatTime(totalMinutes)}</span>
                </div>
                <div class="aw-preview-item">
                    <span class="label">Category:</span>
                    <span class="value">${summary.category || 'N/A'}</span>
                </div>
            `;
            preview.classList.remove('empty');
        } else {
            preview.innerHTML = '<div class="message warning">No activity data found for this date</div>';
            preview.classList.remove('empty');
            activityWatchData = null;
        }
    } catch (error) {
        const preview = document.getElementById('awPreview');
        preview.innerHTML = `<div class="message error">Failed to fetch ActivityWatch data: ${error.message}</div>`;
        preview.classList.remove('empty');
        activityWatchData = null;
    }
}

async function handleActivityWatchImport(e) {
    e.preventDefault();

    if (!activityWatchData || activityWatchData.total_seconds === 0) {
        showError('Please refresh ActivityWatch data first');
        return;
    }

    const date = document.getElementById('awDate').value;
    const excludeAfk = document.getElementById('awExcludeAfk').checked;

    try {
        // Get current client to access activitywatch_category
        const client = await api.getClient(currentClientId);

        if (!client.activitywatch_category) {
            showError('This client has no ActivityWatch category configured.');
            return;
        }

        await api.importFromActivityWatch({
            client_id: currentClientId,
            date: date,
            category: client.activitywatch_category,
            exclude_afk: excludeAfk
        });

        closeModal('timeEntryModal');
        await loadTimeEntries();
        await loadBalance();
        showSuccess('ActivityWatch data imported successfully');
    } catch (error) {
        showError('Failed to import ActivityWatch data: ' + error.message);
    }
}

// ========== Payment Form ==========

function onPaymentTypeChange() {
    const type = document.getElementById('paymentType').value;
    const amountGroup = document.getElementById('amountGroup');
    const descriptionGroup = document.getElementById('descriptionGroup');

    if (type === 'money') {
        amountGroup.style.display = 'block';
        descriptionGroup.style.display = 'none';
        document.getElementById('paymentAmount').required = true;
        document.getElementById('paymentDescription').required = false;
    } else {
        amountGroup.style.display = 'none';
        descriptionGroup.style.display = 'block';
        document.getElementById('paymentAmount').required = false;
        document.getElementById('paymentDescription').required = true;
    }
}

async function handlePaymentSubmit(e) {
    e.preventDefault();

    const type = document.getElementById('paymentType').value;
    const date = document.getElementById('paymentDate').value;
    const notes = document.getElementById('paymentNotes').value;

    const paymentData = {
        client_id: currentClientId,
        payment_type: type,
        payment_date: date,
        notes: notes
    };

    if (type === 'money') {
        paymentData.amount = parseFloat(document.getElementById('paymentAmount').value);
    } else {
        paymentData.supplements_description = document.getElementById('paymentDescription').value;
    }

    try {
        await api.createPayment(paymentData);
        closeModal('paymentModal');
        await loadPayments();
        await loadBalance();
        showSuccess('Payment added successfully');
    } catch (error) {
        showError('Failed to add payment: ' + error.message);
    }
}

// ========== Bill Form ==========

async function loadUnbilledEntries() {
    const container = document.getElementById('unbilledEntriesList');

    try {
        container.innerHTML = '<div class="loading">Loading unbilled entries...</div>';

        const entries = await api.getUnbilledTimeEntries(currentClientId);

        if (entries.length === 0) {
            container.innerHTML = '<div class="empty-state">No unbilled entries found</div>';
            return;
        }

        container.innerHTML = entries.map(entry => `
            <label>
                <input type="checkbox" name="timeEntryIds" value="${entry.id}">
                <span>
                    <strong>${formatDate(entry.work_date || entry.date)}</strong> - ${formatTime(entry.total_minutes || entry.minutes)}
                    ${entry.notes ? `<br><small>${escapeHtml(entry.notes)}</small>` : ''}
                </span>
            </label>
        `).join('');
    } catch (error) {
        container.innerHTML = `<div class="message error">Failed to load unbilled entries: ${error.message}</div>`;
    }
}

async function handleBillSubmit(e) {
    e.preventDefault();

    const billType = document.getElementById('billType').value;
    const notes = document.getElementById('billNotes').value;

    // Check which tab is active
    const selectEntriesTab = document.getElementById('selectEntries');
    const isSelectEntriesActive = selectEntriesTab.classList.contains('active');

    const billData = {
        client_id: currentClientId,
        type: billType,
        notes: notes
    };

    if (isSelectEntriesActive) {
        // Get selected entry IDs
        const checkboxes = document.querySelectorAll('input[name="timeEntryIds"]:checked');
        const entryIds = Array.from(checkboxes).map(cb => parseInt(cb.value));

        if (entryIds.length === 0) {
            showError('Please select at least one time entry');
            return;
        }

        billData.time_entry_ids = entryIds;
    } else {
        // Use date range
        const startDate = document.getElementById('billStartDate').value;
        const endDate = document.getElementById('billEndDate').value;

        if (!startDate || !endDate) {
            showError('Please select both start and end dates');
            return;
        }

        billData.start_date = startDate;
        billData.end_date = endDate;
    }

    try {
        const result = await api.createBill(billData);
        closeModal('billModal');
        await loadBills();
        await loadBalance();
        await loadTimeEntries(); // Refresh to show billed status
        showSuccess('Bill generated successfully');

        // Ask if user wants to view the bill
        if (confirm('Bill created successfully. Do you want to view it now?')) {
            viewBill(result.id);
        }
    } catch (error) {
        showError('Failed to generate bill: ' + error.message);
    }
}

// ========== Utility Functions ==========

function formatTime(minutes) {
    if (minutes === null || minutes === undefined || isNaN(minutes)) {
        return '--h --m';
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
}

function formatCurrency(amount) {
    if (amount === null || amount === undefined || isNaN(amount)) {
        return '₽0.00';
    }
    return `₽${parseFloat(amount).toFixed(2)}`;
}

function formatDate(dateString) {
    if (!dateString) {
        return 'Invalid Date';
    }
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
        return 'Invalid Date';
    }
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showError(message) {
    alert('Error: ' + message);
    console.error(message);
}

function showSuccess(message) {
    // Simple implementation - could be enhanced with toast notifications
    console.log('Success:', message);

    // Show temporary success message
    const container = document.querySelector('.container');
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message success';
    messageDiv.textContent = message;
    container.insertBefore(messageDiv, container.firstChild);

    setTimeout(() => {
        messageDiv.remove();
    }, 3000);
}
