import { state } from './state.js';

export function setCookie(name, value, days) {
    let expires = '';
    if (days) {
        const date = new Date();
        date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
        expires = '; expires=' + date.toUTCString();
    }
    document.cookie = name + '=' + (value || '') + expires + '; path=/';
}

export function getCookie(name) {
    const nameEQ = name + '=';
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
}

export function eraseCookie(name) {
    document.cookie = name + '=; Max-Age=-99999999; path=/';
}

export function getCurrencySymbol(currency) {
    const symbols = {
        USD: '$',
        LKR: 'Rs',
        EUR: '€',
        GBP: '£'
    };
    return symbols[currency] || '$';
}

export function formatCurrency(amount) {
    const symbol = getCurrencySymbol(state.currentUser && state.currentUser.currency);
    return symbol + amount.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
}

export function formatDate(date) {
    const d = new Date(date);
    return d.toISOString().split('T')[0];
}

export function formatMonthYear(date) {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export function getCategoryName(categoryId) {
    const category = state.categories.find((c) => c.id == categoryId);
    return category ? category.name : 'Unknown';
}

export function getCategoryColor(categoryName) {
    const category = state.categories.find((c) => c.name === categoryName);
    return category ? category.color : getRandomColor(0);
}

export function getRandomColor(index) {
    const colors = ['#FF5733', '#33A8FF', '#33FF57', '#A833FF', '#FF33A8', '#33FFA8', '#FF3333', '#3357FF', '#FFAA33', '#808080'];
    return colors[index % colors.length];
}

export function updateCurrencySymbols() {
    const symbol = getCurrencySymbol(state.currentUser && state.currentUser.currency);
    document.querySelectorAll('.currency-symbol').forEach((el) => {
        el.textContent = symbol;
    });
}

export function toggleCustomDateRange() {
    const dateFilter = document.getElementById('expense-date-filter').value;
    const customDateRange = document.getElementById('custom-date-range');
    if (dateFilter === 'custom') {
        customDateRange.classList.remove('d-none');
    } else {
        customDateRange.classList.add('d-none');
    }
}

export function toggleIncomeCustomDateRange() {
    const dateFilter = document.getElementById('income-date-filter').value;
    const range = document.getElementById('income-custom-date-range');
    if (dateFilter === 'custom') {
        range.classList.remove('d-none');
    } else {
        range.classList.add('d-none');
    }
}

export function toggleReportCustomDateRange() {
    const reportPeriod = document.getElementById('report-period').value;
    const customDateRange = document.getElementById('report-custom-date-range');
    if (reportPeriod === 'custom') {
        customDateRange.classList.remove('d-none');
    } else {
        customDateRange.classList.add('d-none');
    }
}

export function toggleBudgetCustomDates() {
    const budgetPeriod = document.getElementById('budget-period').value;
    const customDates = document.getElementById('budget-custom-dates');
    if (budgetPeriod === 'custom') {
        customDates.classList.remove('d-none');
    } else {
        customDates.classList.add('d-none');
    }
}

export function showToast(message, type = 'info') {
    let toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container';
        document.body.appendChild(toastContainer);
    }
    const toastId = 'toast-' + Date.now();
    const toast = document.createElement('div');
    toast.className = 'toast show';
    toast.id = toastId;
    let icon = 'info-circle';
    if (type === 'success') icon = 'check-circle';
    else if (type === 'error') icon = 'exclamation-circle';
    else if (type === 'warning') icon = 'exclamation-triangle';
    toast.innerHTML = `
        <div class="toast-header">
            <strong class="me-auto"><i class="fas fa-${icon} text-${type}"></i>Notification</strong>
            <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close" onclick="document.getElementById('${toastId}').remove()"></button>
        </div>
        <div class="toast-body">${message}</div>`;
    toastContainer.appendChild(toast);
    setTimeout(() => {
        if (document.getElementById(toastId)) {
            document.getElementById(toastId).remove();
        }
    }, 5000);
}
window.showToast = showToast;
