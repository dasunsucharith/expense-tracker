import { state } from './state.js';
import { formatDate, formatCurrency, showToast, getCategoryName } from './utils.js';

export function loadCategories() {
    return fetch(`${state.API_URL}/api/expense/categories`, {
        headers: { Authorization: `Bearer ${state.token}` }
    })
        .then((response) => response.json())
        .then((data) => {
            state.categories = data;
            populateCategoryDropdowns();
            return state.categories;
        })
        .catch((error) => {
            console.error('Error loading categories:', error);
            showToast('Failed to load categories', 'error');
        });
}

export function populateCategoryDropdowns() {
    const dropdowns = [
        'expense-category',
        'edit-expense-category',
        'budget-category',
        'edit-budget-category',
        'expense-category-filter'
    ];
    dropdowns.forEach((id) => {
        const dropdown = document.getElementById(id);
        if (dropdown) {
            const firstOption = dropdown.querySelector('option:first-child');
            dropdown.innerHTML = '';
            if (firstOption && (id === 'expense-category-filter' || id === 'budget-category' || id === 'edit-budget-category')) {
                dropdown.appendChild(firstOption);
            }
            state.categories.forEach((category) => {
                const option = document.createElement('option');
                option.value = category.id;
                option.textContent = category.name;
                dropdown.appendChild(option);
            });
        }
    });
}

export function loadExpenses() {
    const dateFilter = document.getElementById('expense-date-filter').value;
    const categoryId = document.getElementById('expense-category-filter').value;
    const methodFilter = document.getElementById('expense-method-filter')?.value;
    let startDate = null;
    let endDate = null;
    const today = new Date();
    if (dateFilter === 'this-month') {
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    } else if (dateFilter === 'last-month') {
        startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        endDate = new Date(today.getFullYear(), today.getMonth(), 0);
    } else if (dateFilter === 'last-3-months') {
        startDate = new Date(today.getFullYear(), today.getMonth() - 3, 1);
        endDate = today;
    } else if (dateFilter === 'this-year') {
        startDate = new Date(today.getFullYear(), 0, 1);
        endDate = new Date(today.getFullYear(), 11, 31);
    } else if (dateFilter === 'custom') {
        startDate = document.getElementById('expense-start-date').valueAsDate;
        endDate = document.getElementById('expense-end-date').valueAsDate;
    }
    let queryString = '';
    if (startDate) queryString += `start_date=${formatDate(startDate)}`;
    if (endDate) queryString += `${queryString ? '&' : ''}end_date=${formatDate(endDate)}`;
    if (categoryId) queryString += `${queryString ? '&' : ''}category_id=${categoryId}`;
    if (methodFilter) queryString += `${queryString ? '&' : ''}payment_method=${methodFilter}`;
    return fetch(`${state.API_URL}/api/expense/expenses?${queryString}`, {
        headers: { Authorization: `Bearer ${state.token}` }
    })
        .then((response) => response.json())
        .then((data) => {
            state.expenses = data;
            const tableBody = document.getElementById('expenses-table');
            tableBody.innerHTML = '';
            if (state.expenses.length === 0) {
                const row = document.createElement('tr');
                row.innerHTML = '<td colspan="6" class="text-center">No expenses found</td>';
                tableBody.appendChild(row);
                return;
            }
            state.expenses.forEach((expense) => {
                const row = document.createElement('tr');
                row.innerHTML = `
                <td>${formatDate(new Date(expense.date))}</td>
                <td><span class="category-badge" style="background-color: ${expense.category.color}"></span> ${expense.category.name}</td>
                <td>${expense.description || '-'}</td>
                <td>${expense.payment_method || '-'}</td>
                <td>${formatCurrency(expense.amount)}</td>
                <td><button class="btn btn-sm btn-outline-primary edit-expense-btn" data-id="${expense.id}"><i class="fas fa-edit"></i></button></td>`;
                tableBody.appendChild(row);
            });
            document.querySelectorAll('.edit-expense-btn').forEach((button) => {
                button.addEventListener('click', function () {
                    const expenseId = this.getAttribute('data-id');
                    openEditExpenseModal(expenseId);
                });
            });
            return state.expenses;
        })
        .catch((error) => {
            console.error('Error loading expenses:', error);
            showToast('Failed to load expenses', 'error');
        });
}

export function saveExpense() {
    const amount = document.getElementById('expense-amount').value;
    const categoryId = document.getElementById('expense-category').value;
    const date = document.getElementById('expense-date').value;
    const description = document.getElementById('expense-description').value;
    const method = document.getElementById('expense-method')?.value;
    if (!amount || !categoryId || !date) {
        showToast('Please fill in all required fields', 'error');
        return;
    }
    fetch(`${state.API_URL}/api/expense/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${state.token}` },
        body: JSON.stringify({ amount: parseFloat(amount), category_id: parseInt(categoryId), date, description, payment_method: method })
    })
        .then((response) => response.json())
        .then((data) => {
            if (data.id) {
                showToast('Expense added successfully', 'success');
                const modal = bootstrap.Modal.getInstance(document.getElementById('addExpenseModal'));
                modal.hide();
                document.getElementById('add-expense-form').reset();
                document.getElementById('expense-date').valueAsDate = new Date();
                if (document.getElementById('expenses-page')) {
                    loadExpenses();
                } else {
                    loadDashboardData();
                }
            } else {
                showToast(data.message || 'Failed to add expense', 'error');
            }
        })
        .catch((error) => {
            console.error('Error saving expense:', error);
            showToast('An error occurred while saving the expense', 'error');
        });
}

export function openEditExpenseModal(expenseId) {
    const expense = state.expenses.find((e) => e.id == expenseId);
    if (!expense) {
        showToast('Expense not found', 'error');
        return;
    }
    document.getElementById('edit-expense-id').value = expense.id;
    document.getElementById('edit-expense-amount').value = expense.amount;
    document.getElementById('edit-expense-category').value = expense.category_id;
    document.getElementById('edit-expense-date').value = expense.date.substring(0, 10);
    document.getElementById('edit-expense-description').value = expense.description || '';
    const methodSelect = document.getElementById('edit-expense-method');
    if (methodSelect) methodSelect.value = expense.payment_method || 'cash';
    const modal = new bootstrap.Modal(document.getElementById('editExpenseModal'));
    modal.show();
}

export function updateExpense() {
    const expenseId = document.getElementById('edit-expense-id').value;
    const amount = document.getElementById('edit-expense-amount').value;
    const categoryId = document.getElementById('edit-expense-category').value;
    const date = document.getElementById('edit-expense-date').value;
    const description = document.getElementById('edit-expense-description').value;
    const method = document.getElementById('edit-expense-method')?.value;
    if (!amount || !categoryId || !date) {
        showToast('Please fill in all required fields', 'error');
        return;
    }
    fetch(`${state.API_URL}/api/expense/expenses/${expenseId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${state.token}` },
        body: JSON.stringify({ amount: parseFloat(amount), category_id: parseInt(categoryId), date, description, payment_method: method })
    })
        .then((response) => response.json())
        .then((data) => {
            if (data.id) {
                showToast('Expense updated successfully', 'success');
                const modal = bootstrap.Modal.getInstance(document.getElementById('editExpenseModal'));
                modal.hide();
                if (document.getElementById('expenses-page')) {
                    loadExpenses();
                } else {
                    loadDashboardData();
                }
            } else {
                showToast(data.message || 'Failed to update expense', 'error');
            }
        })
        .catch((error) => {
            console.error('Error updating expense:', error);
            showToast('An error occurred while updating the expense', 'error');
        });
}

export function deleteExpense() {
    const expenseId = document.getElementById('edit-expense-id').value;
    if (confirm('Are you sure you want to delete this expense?')) {
        fetch(`${state.API_URL}/api/expense/expenses/${expenseId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${state.token}` }
        })
            .then((response) => response.json())
            .then((data) => {
                if (data.message === 'Expense deleted successfully') {
                    showToast('Expense deleted successfully', 'success');
                    const modal = bootstrap.Modal.getInstance(document.getElementById('editExpenseModal'));
                    modal.hide();
                    if (document.getElementById('expenses-page')) {
                        loadExpenses();
                    } else {
                        loadDashboardData();
                    }
                } else {
                    showToast(data.message || 'Failed to delete expense', 'error');
                }
            })
            .catch((error) => {
                console.error('Error deleting expense:', error);
                showToast('An error occurred while deleting the expense', 'error');
            });
    }
}

window.openEditExpenseModal = openEditExpenseModal;
