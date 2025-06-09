
// Global variables
let API_URL = "";
let token = localStorage.getItem("token");
let currentUser = null;
let categories = [];
let expenses = [];
let incomes = [];
let budgets = [];
let savings = [];
let charts = {};
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

// Cookie helpers
function setCookie(name, value, days) {
    let expires = "";
    if (days) {
        const date = new Date();
        date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
        expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + (value || "") + expires + "; path=/";
}

function getCookie(name) {
    const nameEQ = name + "=";
    const ca = document.cookie.split(";");
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === " ") c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
}

function eraseCookie(name) {
    document.cookie = name + "=; Max-Age=-99999999; path=/";
}

// Initialize the application
document.addEventListener("DOMContentLoaded", function () {
        API_URL = window.location.origin;
        fetch("/api/csrf-token")
            .then((res) => res.json())
            .then((data) => {
                csrfToken = data.csrf_token;
            });
        setupEventListeners();
        updateCurrencySymbols();
        token = localStorage.getItem("token") || getCookie("token");
        if (token) {
            localStorage.setItem("token", token);
            fetchUserProfile();
        }
        const dashboardPage = document.getElementById("dashboard-page");
        const expensesPage = document.getElementById("expenses-page");
        const incomesPage = document.getElementById("incomes-page");
        const savingsPage = document.getElementById("savings-page");
        const budgetsPage = document.getElementById("budgets-page");
        const reportsPage = document.getElementById("reports-page");
        const profilePage = document.getElementById("profile-page");
        if (dashboardPage) {
            if (!token) { window.location.href = "/login"; return; }
            const expenseDate = document.getElementById("expense-date");
            if (expenseDate) expenseDate.valueAsDate = new Date();
            loadDashboardData();
        } else if (expensesPage) {
            if (!token) { window.location.href = "/login"; return; }
            loadCategories().then(() => loadExpenses());
        } else if (incomesPage) {
            if (!token) { window.location.href = "/login"; return; }
            loadIncomes();
        } else if (savingsPage) {
            if (!token) { window.location.href = "/login"; return; }
            loadSavings();
        } else if (budgetsPage) {
            if (!token) { window.location.href = "/login"; return; }
            loadCategories().then(() => loadBudgets());
        } else if (reportsPage) {
            if (!token) { window.location.href = "/login"; return; }
            loadCategories();
        } else if (profilePage) {
            if (!token) { window.location.href = "/login"; return; }
            showUserProfile();
        } else {
            if (token && document.getElementById("auth-section")) {
                window.location.href = "/dashboard";
            }
        }
});

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
