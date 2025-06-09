import { state } from './state.js';
import { formatDate, formatCurrency, showToast, getCategoryName } from './utils.js';

export function loadBudgetStatus() {
    return fetch(`${state.API_URL}/api/budget/dashboard/budget-status`, {
        headers: { Authorization: `Bearer ${state.token}` }
    })
        .then((response) => response.json())
        .then((data) => {
            const activeEl = document.getElementById('active-budgets');
            if (activeEl) activeEl.textContent = data.length;
            let totalRemaining = 0;
            data.forEach((budget) => {
                totalRemaining += budget.remaining;
            });
            const remainingEl = document.getElementById('budget-remaining');
            if (remainingEl) remainingEl.textContent = formatCurrency(totalRemaining);
            const container = document.getElementById('budget-status-container');
            if (!container) return data;
            container.innerHTML = '';
            if (data.length === 0) {
                container.innerHTML = '<p class="text-center">No active budgets</p>';
                return data;
            }
            data.forEach((budget) => {
                const percentUsed = budget.percentage_used;
                const progressClass = percentUsed > 90 ? 'bg-danger' : percentUsed > 75 ? 'bg-warning' : 'bg-success';
                const budgetItem = document.createElement('div');
                budgetItem.className = 'budget-item';
                budgetItem.innerHTML = `
                <div class="d-flex justify-content-between align-items-center mb-1">
                    <div>
                        <strong>${budget.name}</strong>
                        ${budget.category ? `<span class="text-muted"> (${budget.category.name})</span>` : ''}
                    </div>
                    <div>
                        <span class="text-${percentUsed > 90 ? 'danger' : percentUsed > 75 ? 'warning' : 'success'}">
                            ${formatCurrency(budget.spent)} / ${formatCurrency(budget.amount)}
                        </span>
                    </div>
                </div>
                <div class="progress">
                    <div class="progress-bar ${progressClass}" role="progressbar" style="width: ${Math.min(percentUsed, 100)}%" aria-valuenow="${percentUsed}" aria-valuemin="0" aria-valuemax="100"></div>
                </div>
                <div class="d-flex justify-content-between">
                    <small class="text-muted">${Math.round(percentUsed)}% used</small>
                    <small class="text-muted">${formatCurrency(budget.remaining)} remaining</small>
                </div>`;
                container.appendChild(budgetItem);
            });
            return data;
        })
        .catch((error) => {
            console.error('Error loading budget status:', error);
            showToast('Failed to load budget status', 'error');
        });
}

export function loadBudgets() {
    return fetch(`${state.API_URL}/api/budget/budgets`, {
        headers: { Authorization: `Bearer ${state.token}` }
    })
        .then((response) => response.json())
        .then((data) => {
            state.budgets = data;
            const activeBudgetsContainer = document.getElementById('active-budgets-container');
            activeBudgetsContainer.innerHTML = '';
            const today = new Date();
            const activeBudgets = state.budgets.filter((budget) => {
                const startDate = new Date(budget.start_date);
                const endDate = new Date(budget.end_date);
                return startDate <= today && endDate >= today;
            });
            if (activeBudgets.length === 0) {
                activeBudgetsContainer.innerHTML = '<p class="text-center">No active budgets</p>';
            } else {
                activeBudgets.forEach((budget) => {
                    const percentUsed = budget.percentage_used;
                    const progressClass = percentUsed > 90 ? 'bg-danger' : percentUsed > 75 ? 'bg-warning' : 'bg-success';
                    const budgetItem = document.createElement('div');
                    budgetItem.className = 'budget-item';
                    budgetItem.innerHTML = `
                    <div class="d-flex justify-content-between align-items-center mb-1">
                        <div>
                            <strong>${budget.name}</strong>
                            ${budget.category ? `<span class="text-muted"> (${getCategoryName(budget.category_id)})</span>` : ''}
                        </div>
                        <div>
                            <span class="text-${percentUsed > 90 ? 'danger' : percentUsed > 75 ? 'warning' : 'success'}">
                                ${formatCurrency(budget.spent)} / ${formatCurrency(budget.amount)}
                            </span>
                        </div>
                    </div>
                    <div class="progress">
                        <div class="progress-bar ${progressClass}" role="progressbar" style="width: ${Math.min(percentUsed, 100)}%" aria-valuenow="${percentUsed}" aria-valuemin="0" aria-valuemax="100"></div>
                    </div>
                    <div class="d-flex justify-content-between">
                        <small class="text-muted">${Math.round(percentUsed)}% used</small>
                        <small class="text-muted">${formatCurrency(budget.remaining)} remaining</small>
                    </div>`;
                    activeBudgetsContainer.appendChild(budgetItem);
                });
            }
            return data;
        })
        .catch((error) => {
            console.error('Error loading budgets:', error);
            showToast('Failed to load budgets', 'error');
        });
}

export function saveBudget() {
    const name = document.getElementById('budget-name').value;
    const amount = document.getElementById('budget-amount').value;
    const categoryId = document.getElementById('budget-category').value || null;
    const period = document.getElementById('budget-period').value;
    if (!name || !amount) {
        showToast('Please fill in all required fields', 'error');
        return;
    }
    const today = new Date();
    let startDate, endDate;
    if (period === 'monthly') {
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    } else if (period === 'quarterly') {
        const quarter = Math.floor(today.getMonth() / 3);
        startDate = new Date(today.getFullYear(), quarter * 3, 1);
        endDate = new Date(today.getFullYear(), (quarter + 1) * 3, 0);
    } else if (period === 'yearly') {
        startDate = new Date(today.getFullYear(), 0, 1);
        endDate = new Date(today.getFullYear(), 11, 31);
    } else if (period === 'custom') {
        startDate = document.getElementById('budget-start-date').valueAsDate;
        endDate = document.getElementById('budget-end-date').valueAsDate;
        if (!startDate || !endDate) {
            showToast('Please select start and end dates', 'error');
            return;
        }
    }
    fetch(`${state.API_URL}/api/budget/budgets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${state.token}` },
        body: JSON.stringify({ name, amount: parseFloat(amount), category_id: categoryId ? parseInt(categoryId) : null, start_date: formatDate(startDate), end_date: formatDate(endDate) })
    })
        .then((response) => response.json())
        .then((data) => {
            if (data.id) {
                showToast('Budget added successfully', 'success');
                const modal = bootstrap.Modal.getInstance(document.getElementById('addBudgetModal'));
                modal.hide();
                document.getElementById('add-budget-form').reset();
                if (document.getElementById('budgets-page')) {
                    loadBudgets();
                } else {
                    loadDashboardData();
                }
            } else {
                showToast(data.message || 'Failed to add budget', 'error');
            }
        })
        .catch((error) => {
            console.error('Error saving budget:', error);
            showToast('An error occurred while saving the budget', 'error');
        });
}

export function openEditBudgetModal(budgetId) {
    const budget = state.budgets.find((b) => b.id == budgetId);
    if (!budget) {
        showToast('Budget not found', 'error');
        return;
    }
    document.getElementById('edit-budget-id').value = budget.id;
    document.getElementById('edit-budget-name').value = budget.name;
    document.getElementById('edit-budget-amount').value = budget.amount;
    document.getElementById('edit-budget-category').value = budget.category_id || '';
    document.getElementById('edit-budget-start-date').value = budget.start_date.substring(0, 10);
    document.getElementById('edit-budget-end-date').value = budget.end_date.substring(0, 10);
    const modal = new bootstrap.Modal(document.getElementById('editBudgetModal'));
    modal.show();
}

export function updateBudget() {
    const budgetId = document.getElementById('edit-budget-id').value;
    const name = document.getElementById('edit-budget-name').value;
    const amount = document.getElementById('edit-budget-amount').value;
    const categoryId = document.getElementById('edit-budget-category').value || null;
    const startDate = document.getElementById('edit-budget-start-date').value;
    const endDate = document.getElementById('edit-budget-end-date').value;
    if (!name || !amount || !startDate || !endDate) {
        showToast('Please fill in all required fields', 'error');
        return;
    }
    fetch(`${state.API_URL}/api/budget/budgets/${budgetId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${state.token}` },
        body: JSON.stringify({ name, amount: parseFloat(amount), category_id: categoryId ? parseInt(categoryId) : null, start_date: startDate, end_date: endDate })
    })
        .then((response) => response.json())
        .then((data) => {
            if (data.id) {
                showToast('Budget updated successfully', 'success');
                const modal = bootstrap.Modal.getInstance(document.getElementById('editBudgetModal'));
                modal.hide();
                if (document.getElementById('budgets-page')) {
                    loadBudgets();
                } else {
                    loadDashboardData();
                }
            } else {
                showToast(data.message || 'Failed to update budget', 'error');
            }
        })
        .catch((error) => {
            console.error('Error updating budget:', error);
            showToast('An error occurred while updating the budget', 'error');
        });
}

export function deleteBudget() {
    const budgetId = document.getElementById('edit-budget-id').value;
    if (confirm('Are you sure you want to delete this budget?')) {
        fetch(`${state.API_URL}/api/budget/budgets/${budgetId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${state.token}` }
        })
            .then((response) => response.json())
            .then((data) => {
                if (data.message === 'Budget deleted successfully') {
                    showToast('Budget deleted successfully', 'success');
                    const modal = bootstrap.Modal.getInstance(document.getElementById('editBudgetModal'));
                    modal.hide();
                    if (document.getElementById('budgets-page')) {
                        loadBudgets();
                    } else {
                        loadDashboardData();
                    }
                } else {
                    showToast(data.message || 'Failed to delete budget', 'error');
                }
            })
            .catch((error) => {
                console.error('Error deleting budget:', error);
                showToast('An error occurred while deleting the budget', 'error');
            });
    }
}

window.openEditBudgetModal = openEditBudgetModal;
