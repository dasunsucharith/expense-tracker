
import { state } from './state.js';
import {
    updateCurrencySymbols,
    toggleCustomDateRange,
    toggleBudgetCustomDates,
} from './utils.js';
import {
    initAuth,
    handleLogin,
    handleRegister,
    handleLogout,
    fetchUserProfile,
    showUserProfile,
} from './auth.js';
import {
    loadCategories,
    loadExpenses,
    saveExpense,
    updateExpense,
    deleteExpense,
} from './expenses.js';
import {
    loadBudgets,
    saveBudget,
    updateBudget,
    deleteBudget,
} from './budgets.js';

// Global variables
let csrfToken = null;
const metaToken = document.querySelector('meta[name="csrf-token"]');
if (metaToken) {
    csrfToken = metaToken.getAttribute('content');
}

const originalFetch = window.fetch;
window.fetch = function (url, options = {}) {
    options.headers = options.headers || {};
    if (csrfToken && options.method && ["POST", "PUT", "DELETE"].includes(options.method.toUpperCase())) {
        options.headers["X-CSRFToken"] = csrfToken;
    }
    options.credentials = options.credentials || "same-origin";
    return originalFetch(url, options);
};

// Setup all event listeners
function setupEventListeners() {
    const loginForm = document.getElementById('login-form');
    if (loginForm) loginForm.addEventListener('submit', handleLogin);
    const registerForm = document.getElementById('register-form');
    if (registerForm) registerForm.addEventListener('submit', handleRegister);
    const logoutLink = document.getElementById('logout-link');
    if (logoutLink) logoutLink.addEventListener('click', handleLogout);
    const saveExpenseBtn = document.getElementById('save-expense');
    if (saveExpenseBtn) saveExpenseBtn.addEventListener('click', saveExpense);
    const updateExpenseBtn = document.getElementById('update-expense');
    if (updateExpenseBtn) updateExpenseBtn.addEventListener('click', updateExpense);
    const deleteExpenseBtn = document.getElementById('delete-expense');
    if (deleteExpenseBtn) deleteExpenseBtn.addEventListener('click', deleteExpense);
    const saveBudgetBtn = document.getElementById('save-budget');
    if (saveBudgetBtn) saveBudgetBtn.addEventListener('click', saveBudget);
    const updateBudgetBtn = document.getElementById('update-budget');
    if (updateBudgetBtn) updateBudgetBtn.addEventListener('click', updateBudget);
    const deleteBudgetBtn = document.getElementById('delete-budget');
    if (deleteBudgetBtn) deleteBudgetBtn.addEventListener('click', deleteBudget);
    const expenseDateFilter = document.getElementById('expense-date-filter');
    if (expenseDateFilter) expenseDateFilter.addEventListener('change', toggleCustomDateRange);
    const applyExpenseFilters = document.getElementById('apply-expense-filters');
    if (applyExpenseFilters) applyExpenseFilters.addEventListener('click', loadExpenses);
    const budgetPeriod = document.getElementById('budget-period');
    if (budgetPeriod) budgetPeriod.addEventListener('change', toggleBudgetCustomDates);
}

document.addEventListener('DOMContentLoaded', () => {
    state.API_URL = window.location.origin;
    fetch('/api/csrf-token')
        .then(res => res.json())
        .then(data => { csrfToken = data.csrf_token; });
    initAuth();
    setupEventListeners();
    updateCurrencySymbols();

    const dashboardPage = document.getElementById('dashboard-page');
    const expensesPage = document.getElementById('expenses-page');
    const budgetsPage = document.getElementById('budgets-page');
    const profilePage = document.getElementById('profile-page');

    if (dashboardPage) {
        if (!state.token) { window.location.href = '/login'; return; }
        loadCategories();
    } else if (expensesPage) {
        if (!state.token) { window.location.href = '/login'; return; }
        loadCategories().then(loadExpenses);
    } else if (budgetsPage) {
        if (!state.token) { window.location.href = '/login'; return; }
        loadCategories().then(loadBudgets);
    } else if (profilePage) {
        if (!state.token) { window.location.href = '/login'; return; }
        showUserProfile();
    } else {
        if (state.token && document.getElementById('auth-section')) {
            window.location.href = '/dashboard';
        }
    }
});
