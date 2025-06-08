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
        // Auth forms
        const loginForm = document.getElementById("login-form");
        if (loginForm) loginForm.addEventListener("submit", handleLogin);

        const registerForm = document.getElementById("register-form");
        if (registerForm) registerForm.addEventListener("submit", handleRegister);

        const logoutLink = document.getElementById("logout-link");
        if (logoutLink) logoutLink.addEventListener("click", handleLogout);

        // Expense form
        const saveExpenseBtn = document.getElementById("save-expense");
        if (saveExpenseBtn) saveExpenseBtn.addEventListener("click", saveExpense);

        const updateExpenseBtn = document.getElementById("update-expense");
        if (updateExpenseBtn) updateExpenseBtn.addEventListener("click", updateExpense);

        const deleteExpenseBtn = document.getElementById("delete-expense");
        if (deleteExpenseBtn) deleteExpenseBtn.addEventListener("click", deleteExpense);

        // Income form
        const saveIncomeBtn = document.getElementById("save-income");
        if (saveIncomeBtn) saveIncomeBtn.addEventListener("click", saveIncome);

        const updateIncomeBtn = document.getElementById("update-income");
        if (updateIncomeBtn) updateIncomeBtn.addEventListener("click", updateIncome);

        const deleteIncomeBtn = document.getElementById("delete-income");
        if (deleteIncomeBtn) deleteIncomeBtn.addEventListener("click", deleteIncome);

        // Saving form
        const saveSavingBtn = document.getElementById("save-saving");
        if (saveSavingBtn) saveSavingBtn.addEventListener("click", saveSaving);

        const updateSavingBtn = document.getElementById("update-saving");
        if (updateSavingBtn) updateSavingBtn.addEventListener("click", updateSaving);

        const deleteSavingBtn = document.getElementById("delete-saving");
        if (deleteSavingBtn) deleteSavingBtn.addEventListener("click", deleteSaving);

        const incomeTypeSelect = document.getElementById("income-type");
        if (incomeTypeSelect) incomeTypeSelect.addEventListener("change", toggleIncomeOther);

        const editIncomeTypeSelect = document.getElementById("edit-income-type");
        if (editIncomeTypeSelect) editIncomeTypeSelect.addEventListener("change", toggleEditIncomeOther);

	// Budget form
        const saveBudgetBtn = document.getElementById("save-budget");
        if (saveBudgetBtn) saveBudgetBtn.addEventListener("click", saveBudget);

        const updateBudgetBtn = document.getElementById("update-budget");
        if (updateBudgetBtn) updateBudgetBtn.addEventListener("click", updateBudget);

        const deleteBudgetBtn = document.getElementById("delete-budget");
        if (deleteBudgetBtn) deleteBudgetBtn.addEventListener("click", deleteBudget);

	// Filters
        const expenseDateFilter = document.getElementById("expense-date-filter");
        if (expenseDateFilter) expenseDateFilter.addEventListener("change", toggleCustomDateRange);

        const applyExpenseFilters = document.getElementById("apply-expense-filters");
        if (applyExpenseFilters) applyExpenseFilters.addEventListener("click", loadExpenses);

        const incomeDateFilter = document.getElementById("income-date-filter");
        if (incomeDateFilter) incomeDateFilter.addEventListener("change", toggleIncomeCustomDateRange);

        const applyIncomeFilters = document.getElementById("apply-income-filters");
        if (applyIncomeFilters) applyIncomeFilters.addEventListener("click", loadIncomes);

        const savingDateFilter = document.getElementById("saving-date-filter");
        if (savingDateFilter) savingDateFilter.addEventListener("change", toggleSavingCustomDateRange);

        const applySavingFilters = document.getElementById("apply-saving-filters");
        if (applySavingFilters) applySavingFilters.addEventListener("click", loadSavings);

	// Reports
        const reportPeriod = document.getElementById("report-period");
        if (reportPeriod) reportPeriod.addEventListener("change", toggleReportCustomDateRange);

        const generateReportBtn = document.getElementById("generate-report");
        if (generateReportBtn) generateReportBtn.addEventListener("click", generateReport);

	// Budget period selection
        const budgetPeriod = document.getElementById("budget-period");
        if (budgetPeriod) budgetPeriod.addEventListener("change", toggleBudgetCustomDates);

        // Profile page uses inline handler
}

// Authentication functions
function handleLogin(e) {
        e.preventDefault();

        const username = document.getElementById("login-username").value;
        const password = document.getElementById("login-password").value;
        const errorElement = document.getElementById("login-error");

        fetch(`${API_URL}/api/user/login`, {
                method: "POST",
                headers: {
                        "Content-Type": "application/json",
                },
                body: JSON.stringify({ username, password }),
        })
                .then((response) => response.json())
                .then((data) => {
                        if (data.token) {
                                // Save token and user data
                                token = data.token;
                                setCookie("token", token, 1);
                                localStorage.setItem("token", token);
                                currentUser = data.user;
                                updateCurrencySymbols();
                                window.location.href = "/dashboard";
                        } else {
                                errorElement.textContent =
                                        data.message || "Login failed. Please check your credentials.";
                                errorElement.classList.remove("d-none");
                        }
                })
                .catch((error) => {
                        console.error("Login error:", error);
                        errorElement.textContent =
                                "An error occurred during login. Please try again.";
                        errorElement.classList.remove("d-none");
                });
}

function handleRegister(e) {
	e.preventDefault();

	const username = document.getElementById("register-username").value;
	const email = document.getElementById("register-email").value;
	const password = document.getElementById("register-password").value;
	const confirmPassword = document.getElementById(
		"register-confirm-password"
	).value;

	// Validate passwords match
	if (password !== confirmPassword) {
		const errorElement = document.getElementById("register-error");
		errorElement.textContent = "Passwords do not match.";
		errorElement.classList.remove("d-none");
		return;
	}

	fetch(`${API_URL}/api/user/register`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({ username, email, password }),
	})
		.then((response) => response.json())
		.then((data) => {
			if (data.message === "User registered successfully") {
				// Show success and switch to login tab
				showToast("Registration successful! Please log in.", "success");
                                const loginTab = document.getElementById("login-tab");
                                if (loginTab) {
                                        loginTab.click();
                                } else {
                                        window.location.href = "/login";
                                }
			} else {
				// Show error
				const errorElement = document.getElementById("register-error");
				errorElement.textContent =
					data.message || "Registration failed. Please try again.";
				errorElement.classList.remove("d-none");
			}
		})
		.catch((error) => {
			console.error("Registration error:", error);
			const errorElement = document.getElementById("register-error");
			errorElement.textContent =
				"An error occurred during registration. Please try again.";
			errorElement.classList.remove("d-none");
		});
}

function handleLogout(e) {
        e.preventDefault();

        // Clear token and user data
        token = null;
        localStorage.removeItem("token");
        eraseCookie("token");
        currentUser = null;

        window.location.href = "/login";
}

function fetchUserProfile() {
	fetch(`${API_URL}/api/user/profile`, {
		headers: {
			Authorization: `Bearer ${token}`,
		},
	})
		.then((response) => {
			if (!response.ok) {
				throw new Error("Token invalid");
			}
			return response.json();
		})
                .then((data) => {
                        currentUser = data;
                        updateCurrencySymbols();
                        const usernameDisplay = document.getElementById("username-display");
                        if (usernameDisplay) {
                                usernameDisplay.textContent = currentUser.username;
                        }
                })
		.catch((error) => {
			console.error("Profile fetch error:", error);
                        token = null;
                        localStorage.removeItem("token");
                        window.location.href = "/login";
                });
}

// UI functions

function loadCategories() {
	return fetch(`${API_URL}/api/expense/categories`, {
		headers: {
			Authorization: `Bearer ${token}`,
		},
	})
		.then((response) => response.json())
		.then((data) => {
			categories = data;

			// Populate category dropdowns
			populateCategoryDropdowns();

			return categories;
		})
		.catch((error) => {
			console.error("Error loading categories:", error);
			showToast("Failed to load categories", "error");
		});
}

function populateCategoryDropdowns() {
	const dropdowns = [
		"expense-category",
		"edit-expense-category",
		"budget-category",
		"edit-budget-category",
		"expense-category-filter",
	];

	dropdowns.forEach((id) => {
		const dropdown = document.getElementById(id);
		if (dropdown) {
			// Clear existing options (except the first one for filter dropdowns)
			const firstOption = dropdown.querySelector("option:first-child");
			dropdown.innerHTML = "";
			if (
				firstOption &&
				(id === "expense-category-filter" ||
					id === "budget-category" ||
					id === "edit-budget-category")
			) {
				dropdown.appendChild(firstOption);
			}

			// Add category options
			categories.forEach((category) => {
				const option = document.createElement("option");
				option.value = category.id;
				option.textContent = category.name;
				dropdown.appendChild(option);
			});
		}
	});
}

function loadDashboardSummary() {
	// Get current month date range
	const today = new Date();
	const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
	const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

	const startDate = formatDate(firstDay);
	const endDate = formatDate(lastDay);

        return fetch(
                `${API_URL}/api/expense/dashboard/summary?start_date=${startDate}&end_date=${endDate}`,
                {
                        headers: {
                                Authorization: `Bearer ${token}`,
                        },
                }
        )
                .then((response) => response.json())
                .then((data) => {
                        // Update summary cards
                        const totalEl = document.getElementById("total-expenses");
                        if (totalEl) totalEl.textContent = formatCurrency(data.total_expenses);
                        const countEl = document.getElementById("expense-count");
                        if (countEl) countEl.textContent = data.expense_count;
                        const periodEl = document.getElementById("expense-period");
                        if (periodEl) periodEl.textContent = `${formatMonthYear(firstDay)}`;

                        return data;
                })
                .catch((error) => {
                        console.error("Error loading dashboard summary:", error);
                        showToast("Failed to load dashboard summary", "error");
                });
}

function loadSavingsSummary() {
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

        const startDate = formatDate(firstDay);
        const endDate = formatDate(lastDay);

        return fetch(
                `${API_URL}/api/saving/dashboard/summary?start_date=${startDate}&end_date=${endDate}`,
                {
                        headers: {
                                Authorization: `Bearer ${token}`,
                        },
                }
        )
                .then((response) => response.json())
                .then((data) => {
                        const totalEl = document.getElementById("total-savings");
                        if (totalEl) totalEl.textContent = formatCurrency(data.total_savings);
                        const countEl = document.getElementById("saving-count");
                        if (countEl) countEl.textContent = data.saving_count;

                        return data;
                })
                .catch((error) => {
                        console.error("Error loading savings summary:", error);
                        showToast("Failed to load savings summary", "error");
                });
}

function loadRecentExpenses() {
	return fetch(`${API_URL}/api/expense/expenses?limit=5`, {
		headers: {
			Authorization: `Bearer ${token}`,
		},
	})
                .then((response) => response.json())
                .then((data) => {
                        const tableBody = document.getElementById("recent-expenses-table");
                        if (!tableBody) return data;
                        tableBody.innerHTML = "";

                        if (data.length === 0) {
                                const row = document.createElement("tr");
                                row.innerHTML =
                                        '<td colspan="5" class="text-center">No expenses found</td>';
                                tableBody.appendChild(row);
                                return;
                        }

			data.forEach((expense) => {
				const row = document.createElement("tr");
				row.innerHTML = `
                <td>${formatDate(new Date(expense.date))}</td>
                <td>
                    <span class="category-badge" style="background-color: ${
											expense.category.color
										}"></span>
                    ${expense.category.name}
                </td>
                <td>${expense.description || "-"}</td>
                <td>${expense.payment_method || "-"}</td>
                <td>${formatCurrency(expense.amount)}</td>
            `;
				tableBody.appendChild(row);
			});

			return data;
		})
		.catch((error) => {
			console.error("Error loading recent expenses:", error);
			showToast("Failed to load recent expenses", "error");
		});
}

function loadBudgetStatus() {
	return fetch(`${API_URL}/api/budget/dashboard/budget-status`, {
		headers: {
			Authorization: `Bearer ${token}`,
		},
	})
                .then((response) => response.json())
                .then((data) => {
                        // Update active budgets count
                        const activeEl = document.getElementById("active-budgets");
                        if (activeEl) activeEl.textContent = data.length;

			// Calculate total budget and remaining
			let totalBudget = 0;
			let totalRemaining = 0;

			data.forEach((budget) => {
				totalBudget += budget.amount;
				totalRemaining += budget.remaining;
			});

                        // Update budget remaining card
                        const remainingEl = document.getElementById("budget-remaining");
                        if (remainingEl)
                                remainingEl.textContent = formatCurrency(totalRemaining);

			// Update budget status container
                        const container = document.getElementById("budget-status-container");
                        if (!container) return data;
                        container.innerHTML = "";

                        if (data.length === 0) {
                                container.innerHTML = '<p class="text-center">No active budgets</p>';
                                return data;
                        }

			data.forEach((budget) => {
				const percentUsed = budget.percentage_used;
				const progressClass =
					percentUsed > 90
						? "bg-danger"
						: percentUsed > 75
						? "bg-warning"
						: "bg-success";

				const budgetItem = document.createElement("div");
				budgetItem.className = "budget-item";
				budgetItem.innerHTML = `
                <div class="d-flex justify-content-between align-items-center mb-1">
                    <div>
                        <strong>${budget.name}</strong>
                        ${
													budget.category
														? `<span class="text-muted"> (${budget.category.name})</span>`
														: ""
												}
                    </div>
                    <div>
                        <span class="text-${
													percentUsed > 90
														? "danger"
														: percentUsed > 75
														? "warning"
														: "success"
												}">
                            ${formatCurrency(budget.spent)} / ${formatCurrency(
					budget.amount
				)}
                        </span>
                    </div>
                </div>
                <div class="progress">
                    <div class="progress-bar ${progressClass}" role="progressbar" 
                         style="width: ${Math.min(percentUsed, 100)}%" 
                         aria-valuenow="${percentUsed}" aria-valuemin="0" aria-valuemax="100"></div>
                </div>
                <div class="d-flex justify-content-between">
                    <small class="text-muted">${Math.round(
											percentUsed
										)}% used</small>
                    <small class="text-muted">${formatCurrency(
											budget.remaining
										)} remaining</small>
                </div>
            `;
				container.appendChild(budgetItem);
			});

			return data;
		})
		.catch((error) => {
			console.error("Error loading budget status:", error);
			showToast("Failed to load budget status", "error");
		});
}

function loadExpenses() {
	// Get filter values
        const dateFilter = document.getElementById("expense-date-filter").value;
        const categoryId = document.getElementById("expense-category-filter").value;
        const methodFilter = document.getElementById("expense-method-filter")?.value;

	let startDate = null;
	let endDate = null;

	// Calculate date range based on filter
	const today = new Date();

	if (dateFilter === "this-month") {
		startDate = new Date(today.getFullYear(), today.getMonth(), 1);
		endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
	} else if (dateFilter === "last-month") {
		startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
		endDate = new Date(today.getFullYear(), today.getMonth(), 0);
	} else if (dateFilter === "last-3-months") {
		startDate = new Date(today.getFullYear(), today.getMonth() - 3, 1);
		endDate = today;
	} else if (dateFilter === "this-year") {
		startDate = new Date(today.getFullYear(), 0, 1);
		endDate = new Date(today.getFullYear(), 11, 31);
	} else if (dateFilter === "custom") {
		startDate = document.getElementById("expense-start-date").valueAsDate;
		endDate = document.getElementById("expense-end-date").valueAsDate;
	}

	// Build query string
	let queryString = "";
	if (startDate) {
		queryString += `start_date=${formatDate(startDate)}`;
	}
	if (endDate) {
		queryString += `${queryString ? "&" : ""}end_date=${formatDate(endDate)}`;
	}
        if (categoryId) {
                queryString += `${queryString ? "&" : ""}category_id=${categoryId}`;
        }
        if (methodFilter) {
                queryString += `${queryString ? "&" : ""}payment_method=${methodFilter}`;
        }

	return fetch(`${API_URL}/api/expense/expenses?${queryString}`, {
		headers: {
			Authorization: `Bearer ${token}`,
		},
	})
		.then((response) => response.json())
		.then((data) => {
			expenses = data;

			// Populate expenses table
			const tableBody = document.getElementById("expenses-table");
			tableBody.innerHTML = "";

                        if (expenses.length === 0) {
                                const row = document.createElement("tr");
                                row.innerHTML =
                                        '<td colspan="6" class="text-center">No expenses found</td>';
                                tableBody.appendChild(row);
                                return;
                        }

			expenses.forEach((expense) => {
				const row = document.createElement("tr");
				row.innerHTML = `
                <td>${formatDate(new Date(expense.date))}</td>
                <td>
                    <span class="category-badge" style="background-color: ${
											expense.category.color
										}"></span>
                    ${expense.category.name}
                </td>
                <td>${expense.description || "-"}</td>
                <td>${expense.payment_method || "-"}</td>
                <td>${formatCurrency(expense.amount)}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary edit-expense-btn" data-id="${
											expense.id
										}">
                        <i class="fas fa-edit"></i>
                    </button>
                </td>
            `;
				tableBody.appendChild(row);
			});

			// Add event listeners to edit buttons
			document.querySelectorAll(".edit-expense-btn").forEach((button) => {
				button.addEventListener("click", function () {
					const expenseId = this.getAttribute("data-id");
					openEditExpenseModal(expenseId);
				});
			});

			return expenses;
		})
		.catch((error) => {
			console.error("Error loading expenses:", error);
			showToast("Failed to load expenses", "error");
		});
}

function loadBudgets() {
	return fetch(`${API_URL}/api/budget/budgets`, {
		headers: {
			Authorization: `Bearer ${token}`,
		},
	})
		.then((response) => response.json())
		.then((data) => {
			budgets = data;

			// Populate active budgets container
			const activeBudgetsContainer = document.getElementById(
				"active-budgets-container"
			);
			activeBudgetsContainer.innerHTML = "";

			// Filter active budgets
			const today = new Date();
			const activeBudgets = budgets.filter((budget) => {
				const startDate = new Date(budget.start_date);
				const endDate = new Date(budget.end_date);
				return startDate <= today && endDate >= today;
			});

			if (activeBudgets.length === 0) {
				activeBudgetsContainer.innerHTML =
					'<p class="text-center">No active budgets</p>';
			} else {
				activeBudgets.forEach((budget) => {
					const percentUsed = budget.percentage_used;
					const progressClass =
						percentUsed > 90
							? "bg-danger"
							: percentUsed > 75
							? "bg-warning"
							: "bg-success";

					const budgetItem = document.createElement("div");
					budgetItem.className = "budget-item";
					budgetItem.innerHTML = `
                    <div class="d-flex justify-content-between align-items-center mb-1">
                        <div>
                            <strong>${budget.name}</strong>
                            ${
															budget.category
																? `<span class="text-muted"> (${getCategoryName(
																		budget.category_id
																  )})</span>`
																: ""
														}
                        </div>
                        <div>
                            <span class="text-${
															percentUsed > 90
																? "danger"
																: percentUsed > 75
																? "warning"
																: "success"
														}">
                                ${formatCurrency(
																	budget.spent
																)} / ${formatCurrency(budget.amount)}
                            </span>
                        </div>
                    </div>
                    <div class="progress">
                        <div class="progress-bar ${progressClass}" role="progressbar" 
                             style="width: ${Math.min(percentUsed, 100)}%" 
                             aria-valuenow="${percentUsed}" aria-valuemin="0" aria-valuemax="100"></div>
                    </div>
                    <div class="d-flex justify-content-between">
                        <small class="text-muted">${Math.round(
													percentUsed
												)}% used</small>
                        <small class="text-muted">${formatCurrency(
													budget.remaining
												)} remaining</small>
                    </div>
                `;
					activeBudgetsContainer.appendChild(budgetItem);
				});
			}

			// Populate budgets table
			const tableBody = document.getElementById("budgets-table");
			tableBody.innerHTML = "";

			if (budgets.length === 0) {
				const row = document.createElement("tr");
				row.innerHTML =
					'<td colspan="8" class="text-center">No budgets found</td>';
				tableBody.appendChild(row);
				return;
			}

			budgets.forEach((budget) => {
				const startDate = new Date(budget.start_date);
				const endDate = new Date(budget.end_date);
				const today = new Date();
				const isActive = startDate <= today && endDate >= today;

				const percentUsed = budget.percentage_used;
				const statusClass =
					percentUsed > 90
						? "danger"
						: percentUsed > 75
						? "warning"
						: "success";

				const row = document.createElement("tr");
				row.innerHTML = `
                <td>${budget.name}</td>
                <td>${
									budget.category_id
										? getCategoryName(budget.category_id)
										: "All Categories"
								}</td>
                <td>${formatDate(startDate)} - ${formatDate(endDate)}</td>
                <td>${formatCurrency(budget.amount)}</td>
                <td>${formatCurrency(budget.spent)}</td>
                <td>${formatCurrency(budget.remaining)}</td>
                <td>
                    <span class="badge bg-${statusClass}">${Math.round(
					percentUsed
				)}% used</span>
                    ${
											isActive
												? '<span class="badge bg-primary ms-1">Active</span>'
												: ""
										}
                </td>
                <td>
                    <button class="btn btn-sm btn-outline-primary edit-budget-btn" data-id="${
											budget.id
										}">
                        <i class="fas fa-edit"></i>
                    </button>
                </td>
            `;
				tableBody.appendChild(row);
			});

			// Add event listeners to edit buttons
			document.querySelectorAll(".edit-budget-btn").forEach((button) => {
				button.addEventListener("click", function () {
					const budgetId = this.getAttribute("data-id");
					openEditBudgetModal(budgetId);
				});
			});

			return budgets;
		})
		.catch((error) => {
			console.error("Error loading budgets:", error);
			showToast("Failed to load budgets", "error");
		});
}

// Chart functions
function initializeCharts() {
	// Destroy existing charts to prevent duplicates
	if (charts.expensesByCategory) {
		charts.expensesByCategory.destroy();
	}
	if (charts.budgetVsActual) {
		charts.budgetVsActual.destroy();
	}

	// Initialize expenses by category chart
        const expensesCanvas = document.getElementById("expenses-by-category-chart");
        if (!expensesCanvas) return;
        const expensesByCategoryCtx = expensesCanvas.getContext("2d");

	// Get current month date range
	const today = new Date();
	const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
	const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

	const startDate = formatDate(firstDay);
	const endDate = formatDate(lastDay);

	fetch(
		`${API_URL}/api/expense/dashboard/summary?start_date=${startDate}&end_date=${endDate}`,
		{
			headers: {
				Authorization: `Bearer ${token}`,
			},
		}
	)
		.then((response) => response.json())
		.then((data) => {
			if (
				!data.expenses_by_category ||
				data.expenses_by_category.length === 0
			) {
				// No data, show empty chart
				charts.expensesByCategory = new Chart(expensesByCategoryCtx, {
					type: "doughnut",
					data: {
						labels: ["No Data"],
						datasets: [
							{
								data: [1],
								backgroundColor: ["#e9ecef"],
								borderWidth: 0,
							},
						],
					},
					options: {
						responsive: true,
						maintainAspectRatio: false,
						plugins: {
							legend: {
								position: "right",
							},
							tooltip: {
								callbacks: {
									label: function (context) {
										return "No data available";
									},
								},
							},
						},
					},
				});
				return;
			}

			const labels = data.expenses_by_category.map((item) => item.name);
			const values = data.expenses_by_category.map((item) => item.amount);
			const backgroundColors = data.expenses_by_category.map((item, index) => {
				// Find category color if available
				const category = categories.find((cat) => cat.name === item.name);
				return category ? category.color : getRandomColor(index);
			});

			charts.expensesByCategory = new Chart(expensesByCategoryCtx, {
				type: "doughnut",
				data: {
					labels: labels,
					datasets: [
						{
							data: values,
							backgroundColor: backgroundColors,
							borderWidth: 0,
						},
					],
				},
				options: {
					responsive: true,
					maintainAspectRatio: false,
					plugins: {
						legend: {
							position: "right",
						},
						tooltip: {
							callbacks: {
								label: function (context) {
									const value = context.raw;
									const total = context.dataset.data.reduce((a, b) => a + b, 0);
									const percentage = Math.round((value / total) * 100);
									return `${context.label}: ${formatCurrency(
										value
									)} (${percentage}%)`;
								},
							},
						},
					},
				},
			});
		})
		.catch((error) => {
			console.error("Error loading chart data:", error);
		});

	// Initialize budget vs actual chart
        const budgetVsActualCanvas = document.getElementById("budget-vs-actual-chart");
        if (!budgetVsActualCanvas) return;
        const budgetVsActualCtx = budgetVsActualCanvas.getContext("2d");

	fetch(`${API_URL}/api/budget/dashboard/budget-status`, {
		headers: {
			Authorization: `Bearer ${token}`,
		},
	})
		.then((response) => response.json())
		.then((data) => {
			if (data.length === 0) {
				// No data, show empty chart
				charts.budgetVsActual = new Chart(budgetVsActualCtx, {
					type: "bar",
					data: {
						labels: ["No Data"],
						datasets: [
							{
								label: "Budget",
								data: [0],
								backgroundColor: "#e9ecef",
								borderWidth: 0,
							},
						],
					},
					options: {
						responsive: true,
						maintainAspectRatio: false,
						scales: {
							y: {
								beginAtZero: true,
								ticks: {
									callback: function (value) {
										return "$" + value;
									},
								},
							},
						},
						plugins: {
							legend: {
								display: true,
							},
						},
					},
				});
				return;
			}

			const labels = data.map((item) => item.name);
			const budgetValues = data.map((item) => item.amount);
			const spentValues = data.map((item) => item.spent);

			charts.budgetVsActual = new Chart(budgetVsActualCtx, {
				type: "bar",
				data: {
					labels: labels,
					datasets: [
						{
							label: "Budget",
							data: budgetValues,
							backgroundColor: "rgba(54, 162, 235, 0.5)",
							borderColor: "rgba(54, 162, 235, 1)",
							borderWidth: 1,
						},
						{
							label: "Actual",
							data: spentValues,
							backgroundColor: "rgba(255, 99, 132, 0.5)",
							borderColor: "rgba(255, 99, 132, 1)",
							borderWidth: 1,
						},
					],
				},
				options: {
					responsive: true,
					maintainAspectRatio: false,
					scales: {
						y: {
							beginAtZero: true,
							ticks: {
								callback: function (value) {
									return "$" + value;
								},
							},
						},
					},
					plugins: {
						tooltip: {
							callbacks: {
								label: function (context) {
									const value = context.raw;
									return `${context.dataset.label}: ${formatCurrency(value)}`;
								},
							},
						},
					},
				},
			});
		})
                .catch((error) => {
                        console.error("Error loading chart data:", error);
                });
}

// Load all data needed for the dashboard
function loadDashboardData() {
        return loadCategories()
                .then(() =>
                        Promise.all([
                                loadDashboardSummary(),
                                loadSavingsSummary(),
                                loadRecentExpenses(),
                                loadBudgetStatus(),
                        ])
                )
                .then(() => initializeCharts())
                .catch((error) => {
                        console.error("Error loading dashboard data:", error);
                        showToast("Failed to load dashboard data", "error");
                });
}

// Expense CRUD functions
function saveExpense() {
	const amount = document.getElementById("expense-amount").value;
        const categoryId = document.getElementById("expense-category").value;
        const date = document.getElementById("expense-date").value;
        const description = document.getElementById("expense-description").value;
        const method = document.getElementById("expense-method")?.value;

	if (!amount || !categoryId || !date) {
		showToast("Please fill in all required fields", "error");
		return;
	}

	fetch(`${API_URL}/api/expense/expenses`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${token}`,
		},
                body: JSON.stringify({
                        amount: parseFloat(amount),
                        category_id: parseInt(categoryId),
                        date: date,
                        description: description,
                        payment_method: method,
                }),
	})
		.then((response) => response.json())
		.then((data) => {
			if (data.id) {
				// Success
				showToast("Expense added successfully", "success");

				// Close modal
				const modal = bootstrap.Modal.getInstance(
					document.getElementById("addExpenseModal")
				);
				modal.hide();

				// Reset form
				document.getElementById("add-expense-form").reset();
				document.getElementById("expense-date").valueAsDate = new Date();

                                // Reload data
                                if (document.getElementById("expenses-page")) {
                                        loadExpenses();
                                } else {
                                        loadDashboardData();
                                }
			} else {
				showToast(data.message || "Failed to add expense", "error");
			}
		})
		.catch((error) => {
			console.error("Error saving expense:", error);
			showToast("An error occurred while saving the expense", "error");
		});
}

function openEditExpenseModal(expenseId) {
	const expense = expenses.find((e) => e.id == expenseId);
	if (!expense) {
		showToast("Expense not found", "error");
		return;
	}

	// Populate form
	document.getElementById("edit-expense-id").value = expense.id;
	document.getElementById("edit-expense-amount").value = expense.amount;
        document.getElementById("edit-expense-category").value = expense.category_id;
        document.getElementById("edit-expense-date").value = expense.date.substring(
                0,
                10
        ); // YYYY-MM-DD format
        document.getElementById("edit-expense-description").value =
                expense.description || "";
        const methodSelect = document.getElementById("edit-expense-method");
        if (methodSelect) methodSelect.value = expense.payment_method || "cash";

	// Show modal
	const modal = new bootstrap.Modal(
		document.getElementById("editExpenseModal")
	);
	modal.show();
}

function updateExpense() {
	const expenseId = document.getElementById("edit-expense-id").value;
	const amount = document.getElementById("edit-expense-amount").value;
	const categoryId = document.getElementById("edit-expense-category").value;
        const date = document.getElementById("edit-expense-date").value;
        const description = document.getElementById("edit-expense-description").value;
        const method = document.getElementById("edit-expense-method")?.value;

	if (!amount || !categoryId || !date) {
		showToast("Please fill in all required fields", "error");
		return;
	}

	fetch(`${API_URL}/api/expense/expenses/${expenseId}`, {
		method: "PUT",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${token}`,
		},
                body: JSON.stringify({
                        amount: parseFloat(amount),
                        category_id: parseInt(categoryId),
                        date: date,
                        description: description,
                        payment_method: method,
                }),
	})
		.then((response) => response.json())
		.then((data) => {
			if (data.id) {
				// Success
				showToast("Expense updated successfully", "success");

				// Close modal
				const modal = bootstrap.Modal.getInstance(
					document.getElementById("editExpenseModal")
				);
				modal.hide();

                                // Reload data
                                if (document.getElementById("expenses-page")) {
                                        loadExpenses();
                                } else {
                                        loadDashboardData();
                                }
			} else {
				showToast(data.message || "Failed to update expense", "error");
			}
		})
		.catch((error) => {
			console.error("Error updating expense:", error);
			showToast("An error occurred while updating the expense", "error");
		});
}

function deleteExpense() {
        const expenseId = document.getElementById("edit-expense-id").value;

	if (confirm("Are you sure you want to delete this expense?")) {
		fetch(`${API_URL}/api/expense/expenses/${expenseId}`, {
			method: "DELETE",
			headers: {
				Authorization: `Bearer ${token}`,
			},
		})
			.then((response) => response.json())
			.then((data) => {
				if (data.message === "Expense deleted successfully") {
					// Success
					showToast("Expense deleted successfully", "success");

					// Close modal
					const modal = bootstrap.Modal.getInstance(
						document.getElementById("editExpenseModal")
					);
					modal.hide();

                                        // Reload data
                                        if (document.getElementById("expenses-page")) {
                                                loadExpenses();
                                        } else {
                                                loadDashboardData();
                                        }
				} else {
					showToast(data.message || "Failed to delete expense", "error");
				}
			})
			.catch((error) => {
				console.error("Error deleting expense:", error);
				showToast("An error occurred while deleting the expense", "error");
			});
        }
}

// Income CRUD functions
function loadIncomes() {
        const dateFilter = document.getElementById("income-date-filter").value;
        const typeFilter = document.getElementById("income-type-filter").value;

        let startDate = null;
        let endDate = null;
        const today = new Date();

        if (dateFilter === "this-month") {
                startDate = new Date(today.getFullYear(), today.getMonth(), 1);
                endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        } else if (dateFilter === "last-month") {
                startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                endDate = new Date(today.getFullYear(), today.getMonth(), 0);
        } else if (dateFilter === "last-3-months") {
                startDate = new Date(today.getFullYear(), today.getMonth() - 3, 1);
                endDate = today;
        } else if (dateFilter === "this-year") {
                startDate = new Date(today.getFullYear(), 0, 1);
                endDate = new Date(today.getFullYear(), 11, 31);
        } else if (dateFilter === "custom") {
                startDate = document.getElementById("income-start-date").valueAsDate;
                endDate = document.getElementById("income-end-date").valueAsDate;
        }

        let queryString = "";
        if (startDate) queryString += `start_date=${formatDate(startDate)}`;
        if (endDate) queryString += `${queryString ? "&" : ""}end_date=${formatDate(endDate)}`;
        if (typeFilter) queryString += `${queryString ? "&" : ""}income_type=${typeFilter}`;

        return fetch(`${API_URL}/api/income/incomes?${queryString}`, {
                headers: { Authorization: `Bearer ${token}` },
        })
                .then((response) => response.json())
                .then((data) => {
                        incomes = data;
                        const tableBody = document.getElementById("incomes-table");
                        if (!tableBody) return incomes;
                        tableBody.innerHTML = "";

                        if (incomes.length === 0) {
                                const row = document.createElement("tr");
                                row.innerHTML = '<td colspan="5" class="text-center">No incomes found</td>';
                                tableBody.appendChild(row);
                                return incomes;
                        }

                        incomes.forEach((income) => {
                                const row = document.createElement("tr");
                                const typeText = income.income_type === "Other" && income.other_source ? `${income.income_type} - ${income.other_source}` : income.income_type;
                                row.innerHTML = `
                <td>${formatDate(new Date(income.date))}</td>
                <td>${typeText}</td>
                <td>${income.description || "-"}</td>
                <td>${formatCurrency(income.amount)}</td>
                <td><button class="btn btn-sm btn-outline-primary edit-income-btn" data-id="${income.id}"><i class="fas fa-edit"></i></button></td>`;
                                tableBody.appendChild(row);
                        });

                        document.querySelectorAll(".edit-income-btn").forEach((btn) => {
                                btn.addEventListener("click", function () {
                                        const id = this.getAttribute("data-id");
                                        openEditIncomeModal(id);
                                });
                        });

                        return incomes;
                })
                .catch((error) => {
                        console.error("Error loading incomes:", error);
                        showToast("Failed to load incomes", "error");
                });
}

function saveIncome() {
        const amount = document.getElementById("income-amount").value;
        const type = document.getElementById("income-type").value;
        const other = document.getElementById("other-source").value;
        const date = document.getElementById("income-date").value;
        const description = document.getElementById("income-description").value;

        if (!amount || !type || !date) {
                showToast("Please fill in all required fields", "error");
                return;
        }

        fetch(`${API_URL}/api/income/incomes`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                        amount: parseFloat(amount),
                        income_type: type,
                        other_source: other || null,
                        date: date,
                        description: description,
                }),
        })
                .then((response) => response.json())
                .then((data) => {
                        if (data.id) {
                                showToast("Income added successfully", "success");
                                const modal = bootstrap.Modal.getInstance(document.getElementById("addIncomeModal"));
                                modal.hide();
                                document.getElementById("add-income-form").reset();
                                document.getElementById("income-date").valueAsDate = new Date();
                                loadIncomes();
                        } else {
                                showToast(data.message || "Failed to add income", "error");
                        }
                })
                .catch((error) => {
                        console.error("Error saving income:", error);
                        showToast("An error occurred while saving the income", "error");
                });
}

function openEditIncomeModal(id) {
        const income = incomes.find((i) => i.id == id);
        if (!income) {
                showToast("Income not found", "error");
                return;
        }
        document.getElementById("edit-income-id").value = income.id;
        document.getElementById("edit-income-amount").value = income.amount;
        document.getElementById("edit-income-type").value = income.income_type;
        document.getElementById("edit-other-source").value = income.other_source || "";
        toggleEditIncomeOther();
        document.getElementById("edit-income-date").value = income.date.substring(0, 10);
        document.getElementById("edit-income-description").value = income.description || "";
        const modal = new bootstrap.Modal(document.getElementById("editIncomeModal"));
        modal.show();
}

function updateIncome() {
        const incomeId = document.getElementById("edit-income-id").value;
        const amount = document.getElementById("edit-income-amount").value;
        const type = document.getElementById("edit-income-type").value;
        const other = document.getElementById("edit-other-source").value;
        const date = document.getElementById("edit-income-date").value;
        const description = document.getElementById("edit-income-description").value;

        if (!amount || !type || !date) {
                showToast("Please fill in all required fields", "error");
                return;
        }

        fetch(`${API_URL}/api/income/incomes/${incomeId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                        amount: parseFloat(amount),
                        income_type: type,
                        other_source: other || null,
                        date: date,
                        description: description,
                }),
        })
                .then((response) => response.json())
                .then((data) => {
                        if (data.id) {
                                showToast("Income updated successfully", "success");
                                const modal = bootstrap.Modal.getInstance(document.getElementById("editIncomeModal"));
                                modal.hide();
                                loadIncomes();
                        } else {
                                showToast(data.message || "Failed to update income", "error");
                        }
                })
                .catch((error) => {
                        console.error("Error updating income:", error);
                        showToast("An error occurred while updating the income", "error");
                });
}

function deleteIncome() {
        const incomeId = document.getElementById("edit-income-id").value;
        if (confirm("Are you sure you want to delete this income?")) {
                fetch(`${API_URL}/api/income/incomes/${incomeId}`, {
                        method: "DELETE",
                        headers: { Authorization: `Bearer ${token}` },
                })
                        .then((response) => response.json())
                        .then((data) => {
                                if (data.message === "Income deleted successfully") {
                                        showToast("Income deleted successfully", "success");
                                        const modal = bootstrap.Modal.getInstance(document.getElementById("editIncomeModal"));
                                        modal.hide();
                                        loadIncomes();
                                } else {
                                        showToast(data.message || "Failed to delete income", "error");
                                }
                        })
                        .catch((error) => {
                                console.error("Error deleting income:", error);
                                showToast("An error occurred while deleting the income", "error");
                        });
        }
}

function toggleIncomeOther() {
        const type = document.getElementById("income-type").value;
        const group = document.getElementById("other-source-group");
        if (group) {
                if (type === "Other") {
                        group.classList.remove("d-none");
                } else {
                        group.classList.add("d-none");
                }
        }
}

function toggleEditIncomeOther() {
        const type = document.getElementById("edit-income-type").value;
        const group = document.getElementById("edit-other-source-group");
        if (group) {
                if (type === "Other") {
                        group.classList.remove("d-none");
                } else {
                        group.classList.add("d-none");
                }
        }
}

// Saving CRUD functions
function loadSavings() {
        const dateFilter = document.getElementById("saving-date-filter").value;

        let startDate = null;
        let endDate = null;
        const today = new Date();

        if (dateFilter === "this-month") {
                startDate = new Date(today.getFullYear(), today.getMonth(), 1);
                endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        } else if (dateFilter === "last-month") {
                startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                endDate = new Date(today.getFullYear(), today.getMonth(), 0);
        } else if (dateFilter === "last-3-months") {
                startDate = new Date(today.getFullYear(), today.getMonth() - 3, 1);
                endDate = today;
        } else if (dateFilter === "this-year") {
                startDate = new Date(today.getFullYear(), 0, 1);
                endDate = new Date(today.getFullYear(), 11, 31);
        } else if (dateFilter === "custom") {
                startDate = document.getElementById("saving-start-date").valueAsDate;
                endDate = document.getElementById("saving-end-date").valueAsDate;
        }

        let queryString = "";
        if (startDate) queryString += `start_date=${formatDate(startDate)}`;
        if (endDate) queryString += `${queryString ? "&" : ""}end_date=${formatDate(endDate)}`;

        return fetch(`${API_URL}/api/saving/savings?${queryString}`, {
                headers: { Authorization: `Bearer ${token}` },
        })
                .then((response) => response.json())
                .then((data) => {
                        savings = data;
                        const tableBody = document.getElementById("savings-table");
                        if (!tableBody) return savings;
                        tableBody.innerHTML = "";

                        if (savings.length === 0) {
                                const row = document.createElement("tr");
                                row.innerHTML = '<td colspan="4" class="text-center">No savings found</td>';
                                tableBody.appendChild(row);
                                return savings;
                        }

                        savings.forEach((saving) => {
                                const row = document.createElement("tr");
                                row.innerHTML = `
                <td>${formatDate(new Date(saving.date))}</td>
                <td>${saving.description || "-"}</td>
                <td>${formatCurrency(saving.amount)}</td>
                <td><button class="btn btn-sm btn-outline-primary edit-saving-btn" data-id="${saving.id}"><i class="fas fa-edit"></i></button></td>`;
                                tableBody.appendChild(row);
                        });

                        document.querySelectorAll(".edit-saving-btn").forEach((btn) => {
                                btn.addEventListener("click", function () {
                                        const id = this.getAttribute("data-id");
                                        openEditSavingModal(id);
                                });
                        });

                        return savings;
                })
                .catch((error) => {
                        console.error("Error loading savings:", error);
                        showToast("Failed to load savings", "error");
                });
}

function saveSaving() {
        const amount = document.getElementById("saving-amount").value;
        const date = document.getElementById("saving-date").value;
        const description = document.getElementById("saving-description").value;

        if (!amount || !date) {
                showToast("Please fill in all required fields", "error");
                return;
        }

        fetch(`${API_URL}/api/saving/savings`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                        amount: parseFloat(amount),
                        date: date,
                        description: description,
                }),
        })
                .then((response) => response.json())
                .then((data) => {
                        if (data.id) {
                                showToast("Saving added successfully", "success");
                                const modal = bootstrap.Modal.getInstance(document.getElementById("addSavingModal"));
                                modal.hide();
                                document.getElementById("add-saving-form").reset();
                                document.getElementById("saving-date").valueAsDate = new Date();
                                loadSavings();
                        } else {
                                showToast(data.message || "Failed to add saving", "error");
                        }
                })
                .catch((error) => {
                        console.error("Error saving saving:", error);
                        showToast("An error occurred while saving", "error");
                });
}

function openEditSavingModal(id) {
        const saving = savings.find((s) => s.id == id);
        if (!saving) {
                showToast("Saving not found", "error");
                return;
        }
        document.getElementById("edit-saving-id").value = saving.id;
        document.getElementById("edit-saving-amount").value = saving.amount;
        document.getElementById("edit-saving-date").value = saving.date.substring(0, 10);
        document.getElementById("edit-saving-description").value = saving.description || "";
        const modal = new bootstrap.Modal(document.getElementById("editSavingModal"));
        modal.show();
}

function updateSaving() {
        const savingId = document.getElementById("edit-saving-id").value;
        const amount = document.getElementById("edit-saving-amount").value;
        const date = document.getElementById("edit-saving-date").value;
        const description = document.getElementById("edit-saving-description").value;

        if (!amount || !date) {
                showToast("Please fill in all required fields", "error");
                return;
        }

        fetch(`${API_URL}/api/saving/savings/${savingId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                        amount: parseFloat(amount),
                        date: date,
                        description: description,
                }),
        })
                .then((response) => response.json())
                .then((data) => {
                        if (data.id) {
                                showToast("Saving updated successfully", "success");
                                const modal = bootstrap.Modal.getInstance(document.getElementById("editSavingModal"));
                                modal.hide();
                                loadSavings();
                        } else {
                                showToast(data.message || "Failed to update saving", "error");
                        }
                })
                .catch((error) => {
                        console.error("Error updating saving:", error);
                        showToast("An error occurred while updating", "error");
                });
}

function deleteSaving() {
        const savingId = document.getElementById("edit-saving-id").value;
        if (confirm("Are you sure you want to delete this saving?")) {
                fetch(`${API_URL}/api/saving/savings/${savingId}`, {
                        method: "DELETE",
                        headers: { Authorization: `Bearer ${token}` },
                })
                        .then((response) => response.json())
                        .then((data) => {
                                if (data.message === "Saving deleted successfully") {
                                        showToast("Saving deleted successfully", "success");
                                        const modal = bootstrap.Modal.getInstance(document.getElementById("editSavingModal"));
                                        modal.hide();
                                        loadSavings();
                                } else {
                                        showToast(data.message || "Failed to delete saving", "error");
                                }
                        })
                        .catch((error) => {
                                console.error("Error deleting saving:", error);
                                showToast("An error occurred while deleting", "error");
                        });
        }
}

function toggleSavingCustomDateRange() {
        const dateFilter = document.getElementById("saving-date-filter").value;
        const range = document.getElementById("saving-custom-date-range");

        if (dateFilter === "custom") {
                range.classList.remove("d-none");
        } else {
                range.classList.add("d-none");
        }
}

// Budget CRUD functions
function saveBudget() {
	const name = document.getElementById("budget-name").value;
	const amount = document.getElementById("budget-amount").value;
	const categoryId = document.getElementById("budget-category").value || null;
	const period = document.getElementById("budget-period").value;

	if (!name || !amount) {
		showToast("Please fill in all required fields", "error");
		return;
	}

	// Calculate date range based on period
	const today = new Date();
	let startDate, endDate;

	if (period === "monthly") {
		startDate = new Date(today.getFullYear(), today.getMonth(), 1);
		endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
	} else if (period === "quarterly") {
		const quarter = Math.floor(today.getMonth() / 3);
		startDate = new Date(today.getFullYear(), quarter * 3, 1);
		endDate = new Date(today.getFullYear(), (quarter + 1) * 3, 0);
	} else if (period === "yearly") {
		startDate = new Date(today.getFullYear(), 0, 1);
		endDate = new Date(today.getFullYear(), 11, 31);
	} else if (period === "custom") {
		startDate = document.getElementById("budget-start-date").valueAsDate;
		endDate = document.getElementById("budget-end-date").valueAsDate;

		if (!startDate || !endDate) {
			showToast("Please select start and end dates", "error");
			return;
		}
	}

	fetch(`${API_URL}/api/budget/budgets`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${token}`,
		},
		body: JSON.stringify({
			name: name,
			amount: parseFloat(amount),
			category_id: categoryId ? parseInt(categoryId) : null,
			start_date: formatDate(startDate),
			end_date: formatDate(endDate),
		}),
	})
		.then((response) => response.json())
		.then((data) => {
			if (data.id) {
				// Success
				showToast("Budget added successfully", "success");

				// Close modal
				const modal = bootstrap.Modal.getInstance(
					document.getElementById("addBudgetModal")
				);
				modal.hide();

				// Reset form
				document.getElementById("add-budget-form").reset();

                                // Reload data
                                if (document.getElementById("budgets-page")) {
                                        loadBudgets();
                                } else {
                                        loadDashboardData();
                                }
			} else {
				showToast(data.message || "Failed to add budget", "error");
			}
		})
		.catch((error) => {
			console.error("Error saving budget:", error);
			showToast("An error occurred while saving the budget", "error");
		});
}

function openEditBudgetModal(budgetId) {
	const budget = budgets.find((b) => b.id == budgetId);
	if (!budget) {
		showToast("Budget not found", "error");
		return;
	}

	// Populate form
	document.getElementById("edit-budget-id").value = budget.id;
	document.getElementById("edit-budget-name").value = budget.name;
	document.getElementById("edit-budget-amount").value = budget.amount;
	document.getElementById("edit-budget-category").value =
		budget.category_id || "";
	document.getElementById("edit-budget-start-date").value =
		budget.start_date.substring(0, 10); // YYYY-MM-DD format
	document.getElementById("edit-budget-end-date").value =
		budget.end_date.substring(0, 10); // YYYY-MM-DD format

	// Show modal
	const modal = new bootstrap.Modal(document.getElementById("editBudgetModal"));
	modal.show();
}

function updateBudget() {
	const budgetId = document.getElementById("edit-budget-id").value;
	const name = document.getElementById("edit-budget-name").value;
	const amount = document.getElementById("edit-budget-amount").value;
	const categoryId =
		document.getElementById("edit-budget-category").value || null;
	const startDate = document.getElementById("edit-budget-start-date").value;
	const endDate = document.getElementById("edit-budget-end-date").value;

	if (!name || !amount || !startDate || !endDate) {
		showToast("Please fill in all required fields", "error");
		return;
	}

	fetch(`${API_URL}/api/budget/budgets/${budgetId}`, {
		method: "PUT",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${token}`,
		},
		body: JSON.stringify({
			name: name,
			amount: parseFloat(amount),
			category_id: categoryId ? parseInt(categoryId) : null,
			start_date: startDate,
			end_date: endDate,
		}),
	})
		.then((response) => response.json())
		.then((data) => {
			if (data.id) {
				// Success
				showToast("Budget updated successfully", "success");

				// Close modal
				const modal = bootstrap.Modal.getInstance(
					document.getElementById("editBudgetModal")
				);
				modal.hide();

                                // Reload data
                                if (document.getElementById("budgets-page")) {
                                        loadBudgets();
                                } else {
                                        loadDashboardData();
                                }
			} else {
				showToast(data.message || "Failed to update budget", "error");
			}
		})
		.catch((error) => {
			console.error("Error updating budget:", error);
			showToast("An error occurred while updating the budget", "error");
		});
}

function deleteBudget() {
	const budgetId = document.getElementById("edit-budget-id").value;

	if (confirm("Are you sure you want to delete this budget?")) {
		fetch(`${API_URL}/api/budget/budgets/${budgetId}`, {
			method: "DELETE",
			headers: {
				Authorization: `Bearer ${token}`,
			},
		})
			.then((response) => response.json())
			.then((data) => {
				if (data.message === "Budget deleted successfully") {
					// Success
					showToast("Budget deleted successfully", "success");

					// Close modal
					const modal = bootstrap.Modal.getInstance(
						document.getElementById("editBudgetModal")
					);
					modal.hide();

                                        // Reload data
                                        if (document.getElementById("budgets-page")) {
                                                loadBudgets();
                                        } else {
                                                loadDashboardData();
                                        }
				} else {
					showToast(data.message || "Failed to delete budget", "error");
				}
			})
			.catch((error) => {
				console.error("Error deleting budget:", error);
				showToast("An error occurred while deleting the budget", "error");
			});
	}
}

// Report functions
function generateReport() {
	const reportType = document.getElementById("report-type").value;
	const reportPeriod = document.getElementById("report-period").value;

	// Calculate date range based on period
	const today = new Date();
	let startDate, endDate;

	if (reportPeriod === "this-month") {
		startDate = new Date(today.getFullYear(), today.getMonth(), 1);
		endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
	} else if (reportPeriod === "last-month") {
		startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
		endDate = new Date(today.getFullYear(), today.getMonth(), 0);
	} else if (reportPeriod === "last-3-months") {
		startDate = new Date(today.getFullYear(), today.getMonth() - 3, 1);
		endDate = today;
	} else if (reportPeriod === "this-year") {
		startDate = new Date(today.getFullYear(), 0, 1);
		endDate = new Date(today.getFullYear(), 11, 31);
	} else if (reportPeriod === "last-year") {
		startDate = new Date(today.getFullYear() - 1, 0, 1);
		endDate = new Date(today.getFullYear() - 1, 11, 31);
	} else if (reportPeriod === "custom") {
		startDate = document.getElementById("report-start-date").valueAsDate;
		endDate = document.getElementById("report-end-date").valueAsDate;

		if (!startDate || !endDate) {
			showToast("Please select start and end dates", "error");
			return;
		}
	}

	// Update report title
	let reportTitle = "";
	if (reportType === "category") {
		reportTitle = "Spending by Category";
	} else if (reportType === "time") {
		reportTitle = "Spending Over Time";
	} else if (reportType === "budget") {
		reportTitle = "Budget Performance";
	}

	reportTitle += ` (${formatDate(startDate)} - ${formatDate(endDate)})`;
	document.getElementById("report-title").textContent = reportTitle;

	// Generate report based on type
	if (reportType === "category") {
		generateCategoryReport(startDate, endDate);
	} else if (reportType === "time") {
		generateTimeReport(startDate, endDate);
	} else if (reportType === "budget") {
		generateBudgetReport(startDate, endDate);
	}
}

function generateCategoryReport(startDate, endDate) {
	const formattedStartDate = formatDate(startDate);
	const formattedEndDate = formatDate(endDate);

	fetch(
		`${API_URL}/api/expense/dashboard/summary?start_date=${formattedStartDate}&end_date=${formattedEndDate}`,
		{
			headers: {
				Authorization: `Bearer ${token}`,
			},
		}
	)
		.then((response) => response.json())
		.then((data) => {
			// Destroy existing chart
			if (charts.reportChart) {
				charts.reportChart.destroy();
			}

			const reportChartCtx = document
				.getElementById("report-chart")
				.getContext("2d");

			if (
				!data.expenses_by_category ||
				data.expenses_by_category.length === 0
			) {
				// No data
				charts.reportChart = new Chart(reportChartCtx, {
					type: "bar",
					data: {
						labels: ["No Data"],
						datasets: [
							{
								label: "Amount",
								data: [0],
								backgroundColor: "#e9ecef",
								borderWidth: 0,
							},
						],
					},
					options: {
						responsive: true,
						maintainAspectRatio: false,
						scales: {
							y: {
								beginAtZero: true,
								ticks: {
									callback: function (value) {
										return "$" + value;
									},
								},
							},
						},
					},
				});

				// Update summary
				document.getElementById("report-summary").innerHTML = `
                <div class="alert alert-info">
                    No expense data available for the selected period.
                </div>
            `;

				return;
			}

			// Sort categories by amount
			data.expenses_by_category.sort((a, b) => b.amount - a.amount);

			const labels = data.expenses_by_category.map((item) => item.name);
			const values = data.expenses_by_category.map((item) => item.amount);
			const backgroundColors = data.expenses_by_category.map((item, index) => {
				// Find category color if available
				const category = categories.find((cat) => cat.name === item.name);
				return category ? category.color : getRandomColor(index);
			});

			charts.reportChart = new Chart(reportChartCtx, {
				type: "bar",
				data: {
					labels: labels,
					datasets: [
						{
							label: "Amount",
							data: values,
							backgroundColor: backgroundColors,
							borderWidth: 0,
						},
					],
				},
				options: {
					responsive: true,
					maintainAspectRatio: false,
					scales: {
						y: {
							beginAtZero: true,
							ticks: {
								callback: function (value) {
									return "$" + value;
								},
							},
						},
					},
					plugins: {
						tooltip: {
							callbacks: {
								label: function (context) {
									const value = context.raw;
									const total = context.dataset.data.reduce((a, b) => a + b, 0);
									const percentage = Math.round((value / total) * 100);
									return `${context.label}: ${formatCurrency(
										value
									)} (${percentage}%)`;
								},
							},
						},
					},
				},
			});

			// Update summary
			let summaryHTML = `
                <div class="card mb-3">
                    <div class="card-body">
                        <h5 class="card-title">Summary</h5>
                        <p class="mb-1">Total Expenses: <strong>${formatCurrency(
													data.total_expenses
												)}</strong></p>
                        <p class="mb-1">Number of Expenses: <strong>${
													data.expense_count
												}</strong></p>
                        <p class="mb-1">Period: <strong>${formatDate(
													startDate
												)} - ${formatDate(endDate)}</strong></p>
                    </div>
                </div>
                <div class="card">
                    <div class="card-body">
                        <h5 class="card-title">Top Categories</h5>
                        <ul class="list-group list-group-flush">
            `;

			// Add top 5 categories
			const topCategories = data.expenses_by_category.slice(0, 5);
			topCategories.forEach((category) => {
				const percentage =
					data.total_expenses > 0
						? Math.round((category.amount / data.total_expenses) * 100)
						: 0;
				summaryHTML += `
                    <li class="list-group-item d-flex justify-content-between align-items-center">
                        <span>
                            <span class="category-badge" style="background-color: ${getCategoryColor(
															category.name
														)}"></span>
                            ${category.name}
                        </span>
                        <span>
                            ${formatCurrency(category.amount)}
                            <span class="badge bg-primary rounded-pill ms-1">${percentage}%</span>
                        </span>
                    </li>
                `;
			});

			summaryHTML += `
                        </ul>
                    </div>
                </div>
            `;

			document.getElementById("report-summary").innerHTML = summaryHTML;
		})
		.catch((error) => {
			console.error("Error generating category report:", error);
			showToast("Failed to generate report", "error");
		});
}

function generateTimeReport(startDate, endDate) {
	const formattedStartDate = formatDate(startDate);
	const formattedEndDate = formatDate(endDate);

	fetch(
		`${API_URL}/api/expense/expenses?start_date=${formattedStartDate}&end_date=${formattedEndDate}`,
		{
			headers: {
				Authorization: `Bearer ${token}`,
			},
		}
	)
		.then((response) => response.json())
		.then((data) => {
			// Destroy existing chart
			if (charts.reportChart) {
				charts.reportChart.destroy();
			}

			const reportChartCtx = document
				.getElementById("report-chart")
				.getContext("2d");

			if (data.length === 0) {
				// No data
				charts.reportChart = new Chart(reportChartCtx, {
					type: "line",
					data: {
						labels: ["No Data"],
						datasets: [
							{
								label: "Amount",
								data: [0],
								backgroundColor: "#e9ecef",
								borderWidth: 0,
							},
						],
					},
					options: {
						responsive: true,
						maintainAspectRatio: false,
						scales: {
							y: {
								beginAtZero: true,
								ticks: {
									callback: function (value) {
										return "$" + value;
									},
								},
							},
						},
					},
				});

				// Update summary
				document.getElementById("report-summary").innerHTML = `
                <div class="alert alert-info">
                    No expense data available for the selected period.
                </div>
            `;

				return;
			}

			// Group expenses by date
			const expensesByDate = {};
			let totalAmount = 0;

			data.forEach((expense) => {
				const date = expense.date.substring(0, 10); // YYYY-MM-DD format
				if (!expensesByDate[date]) {
					expensesByDate[date] = 0;
				}
				expensesByDate[date] += expense.amount;
				totalAmount += expense.amount;
			});

			// Create date range
			const dateRange = [];
			const currentDate = new Date(startDate);
			while (currentDate <= endDate) {
				dateRange.push(formatDate(currentDate));
				currentDate.setDate(currentDate.getDate() + 1);
			}

			// Create datasets
			const labels = dateRange;
			const values = dateRange.map((date) => expensesByDate[date] || 0);

			// Calculate moving average (7-day)
			const movingAverage = [];
			const windowSize = 7;

			for (let i = 0; i < values.length; i++) {
				let sum = 0;
				let count = 0;

				for (let j = Math.max(0, i - windowSize + 1); j <= i; j++) {
					sum += values[j];
					count++;
				}

				movingAverage.push(sum / count);
			}

			charts.reportChart = new Chart(reportChartCtx, {
				type: "line",
				data: {
					labels: labels,
					datasets: [
						{
							label: "Daily Expenses",
							data: values,
							backgroundColor: "rgba(54, 162, 235, 0.2)",
							borderColor: "rgba(54, 162, 235, 1)",
							borderWidth: 1,
							pointRadius: 2,
						},
						{
							label: "7-Day Average",
							data: movingAverage,
							backgroundColor: "rgba(255, 99, 132, 0.2)",
							borderColor: "rgba(255, 99, 132, 1)",
							borderWidth: 2,
							pointRadius: 0,
							tension: 0.4,
						},
					],
				},
				options: {
					responsive: true,
					maintainAspectRatio: false,
					scales: {
						y: {
							beginAtZero: true,
							ticks: {
								callback: function (value) {
									return "$" + value;
								},
							},
						},
					},
					plugins: {
						tooltip: {
							callbacks: {
								label: function (context) {
									const value = context.raw;
									return `${context.dataset.label}: ${formatCurrency(value)}`;
								},
							},
						},
					},
				},
			});

			// Calculate statistics
			const dailyAmounts = Object.values(expensesByDate);
			const avgDailySpending = totalAmount / dateRange.length;
			const maxDailySpending = Math.max(...dailyAmounts, 0);
			const daysWithExpenses = dailyAmounts.length;
			const daysWithoutExpenses = dateRange.length - daysWithExpenses;

			// Update summary
			let summaryHTML = `
            <div class="card mb-3">
                <div class="card-body">
                    <h5 class="card-title">Summary</h5>
                    <p class="mb-1">Total Expenses: <strong>${formatCurrency(
											totalAmount
										)}</strong></p>
                    <p class="mb-1">Number of Expenses: <strong>${
											data.length
										}</strong></p>
                    <p class="mb-1">Period: <strong>${formatDate(
											startDate
										)} - ${formatDate(endDate)}</strong></p>
                </div>
            </div>
            <div class="card">
                <div class="card-body">
                    <h5 class="card-title">Statistics</h5>
                    <ul class="list-group list-group-flush">
                        <li class="list-group-item d-flex justify-content-between align-items-center">
                            <span>Average Daily Spending</span>
                            <span>${formatCurrency(avgDailySpending)}</span>
                        </li>
                        <li class="list-group-item d-flex justify-content-between align-items-center">
                            <span>Maximum Daily Spending</span>
                            <span>${formatCurrency(maxDailySpending)}</span>
                        </li>
                        <li class="list-group-item d-flex justify-content-between align-items-center">
                            <span>Days with Expenses</span>
                            <span>${daysWithExpenses} of ${
				dateRange.length
			}</span>
                        </li>
                        <li class="list-group-item d-flex justify-content-between align-items-center">
                            <span>Days without Expenses</span>
                            <span>${daysWithoutExpenses} of ${
				dateRange.length
			}</span>
                        </li>
                    </ul>
                </div>
            </div>
        `;

			document.getElementById("report-summary").innerHTML = summaryHTML;
		})
		.catch((error) => {
			console.error("Error generating time report:", error);
			showToast("Failed to generate report", "error");
		});
}

function generateBudgetReport(startDate, endDate) {
	const formattedStartDate = formatDate(startDate);
	const formattedEndDate = formatDate(endDate);

	// Fetch budgets and expenses for the period
	Promise.all([
		fetch(
			`${API_URL}/api/budget/budgets?start_date=${formattedStartDate}&end_date=${formattedEndDate}`,
			{
				headers: {
					Authorization: `Bearer ${token}`,
				},
			}
		).then((response) => response.json()),
		fetch(
			`${API_URL}/api/expense/expenses?start_date=${formattedStartDate}&end_date=${formattedEndDate}`,
			{
				headers: {
					Authorization: `Bearer ${token}`,
				},
			}
		).then((response) => response.json()),
	])
		.then(([budgetsData, expensesData]) => {
			// Destroy existing chart
			if (charts.reportChart) {
				charts.reportChart.destroy();
			}

			const reportChartCtx = document
				.getElementById("report-chart")
				.getContext("2d");

			if (budgetsData.length === 0) {
				// No data
				charts.reportChart = new Chart(reportChartCtx, {
					type: "bar",
					data: {
						labels: ["No Data"],
						datasets: [
							{
								label: "Amount",
								data: [0],
								backgroundColor: "#e9ecef",
								borderWidth: 0,
							},
						],
					},
					options: {
						responsive: true,
						maintainAspectRatio: false,
						scales: {
							y: {
								beginAtZero: true,
								ticks: {
									callback: function (value) {
										return "$" + value;
									},
								},
							},
						},
					},
				});

				// Update summary
				document.getElementById("report-summary").innerHTML = `
                <div class="alert alert-info">
                    No budget data available for the selected period.
                </div>
            `;

				return;
			}

			// Create datasets
			const labels = budgetsData.map((budget) => budget.name);
			const budgetValues = budgetsData.map((budget) => budget.amount);
			const spentValues = budgetsData.map((budget) => budget.spent);
			const remainingValues = budgetsData.map((budget) => budget.remaining);

			charts.reportChart = new Chart(reportChartCtx, {
				type: "bar",
				data: {
					labels: labels,
					datasets: [
						{
							label: "Budget",
							data: budgetValues,
							backgroundColor: "rgba(54, 162, 235, 0.5)",
							borderColor: "rgba(54, 162, 235, 1)",
							borderWidth: 1,
						},
						{
							label: "Spent",
							data: spentValues,
							backgroundColor: "rgba(255, 99, 132, 0.5)",
							borderColor: "rgba(255, 99, 132, 1)",
							borderWidth: 1,
						},
						{
							label: "Remaining",
							data: remainingValues,
							backgroundColor: "rgba(75, 192, 192, 0.5)",
							borderColor: "rgba(75, 192, 192, 1)",
							borderWidth: 1,
						},
					],
				},
				options: {
					responsive: true,
					maintainAspectRatio: false,
					scales: {
						y: {
							beginAtZero: true,
							stacked: false,
							ticks: {
								callback: function (value) {
									return "$" + value;
								},
							},
						},
						x: {
							stacked: false,
						},
					},
					plugins: {
						tooltip: {
							callbacks: {
								label: function (context) {
									const value = context.raw;
									return `${context.dataset.label}: ${formatCurrency(value)}`;
								},
							},
						},
					},
				},
			});

			// Calculate statistics
			const totalBudget = budgetValues.reduce((a, b) => a + b, 0);
			const totalSpent = spentValues.reduce((a, b) => a + b, 0);
			const totalRemaining = remainingValues.reduce((a, b) => a + b, 0);
			const overBudgetCount = budgetsData.filter(
				(budget) => budget.spent > budget.amount
			).length;

			// Update summary
			let summaryHTML = `
            <div class="card mb-3">
                <div class="card-body">
                    <h5 class="card-title">Summary</h5>
                    <p class="mb-1">Total Budget: <strong>${formatCurrency(
											totalBudget
										)}</strong></p>
                    <p class="mb-1">Total Spent: <strong>${formatCurrency(
											totalSpent
										)}</strong></p>
                    <p class="mb-1">Total Remaining: <strong>${formatCurrency(
											totalRemaining
										)}</strong></p>
                    <p class="mb-1">Period: <strong>${formatDate(
											startDate
										)} - ${formatDate(endDate)}</strong></p>
                </div>
            </div>
            <div class="card">
                <div class="card-body">
                    <h5 class="card-title">Budget Status</h5>
                    <ul class="list-group list-group-flush">
                        <li class="list-group-item d-flex justify-content-between align-items-center">
                            <span>Number of Budgets</span>
                            <span>${budgetsData.length}</span>
                        </li>
                        <li class="list-group-item d-flex justify-content-between align-items-center">
                            <span>Over Budget</span>
                            <span>${overBudgetCount} of ${
				budgetsData.length
			}</span>
                        </li>
                        <li class="list-group-item d-flex justify-content-between align-items-center">
                            <span>Budget Utilization</span>
                            <span>${Math.round(
															(totalSpent / totalBudget) * 100
														)}%</span>
                        </li>
                    </ul>
                </div>
            </div>
        `;

			document.getElementById("report-summary").innerHTML = summaryHTML;
		})
		.catch((error) => {
			console.error("Error generating budget report:", error);
			showToast("Failed to generate report", "error");
		});
}

// Profile functions
function showUserProfile(e) {
        if (e) e.preventDefault();
	fetch(`${API_URL}/api/user/profile`, {
		headers: {
			Authorization: `Bearer ${token}`,
		},
	})
		.then((response) => response.json())
                .then((data) => {
                        const usernameEl = document.getElementById("profile-username");
                        if (usernameEl) {
                                if (usernameEl.tagName === "INPUT") {
                                        usernameEl.value = data.username;
                                } else {
                                        usernameEl.textContent = data.username;
                                }
                        }

                        const emailEl = document.getElementById("profile-email");
                        if (emailEl) {
                                if (emailEl.tagName === "INPUT") {
                                        emailEl.value = data.email;
                                } else {
                                        emailEl.textContent = data.email;
                                }
                        }

                        const createdEl = document.getElementById("profile-created");
                        if (createdEl) {
                                createdEl.textContent = new Date(data.created_at).toLocaleString();
                        }

                        const currencyEl = document.getElementById("profile-currency");
                        if (currencyEl) {
                                currencyEl.value = data.currency || "USD";
                        }

                        const passwordEl = document.getElementById("profile-password");
                        if (passwordEl && passwordEl.tagName === "INPUT") {
                                passwordEl.value = "";
                        }

                        // modal removed; profile data is shown on profile page
                })
                .catch((error) => {
                        showToast("Failed to load profile", "error");
                });
}

function saveUserProfile() {
        const username = document.getElementById("profile-username")?.value;
        const email = document.getElementById("profile-email")?.value;
        const password = document.getElementById("profile-password")?.value;
        const currency = document.getElementById("profile-currency").value;

        fetch(`${API_URL}/api/user/profile`, {
                method: "PUT",
                headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ username, email, password, currency }),
        })
                .then((response) => response.json())
                .then((data) => {
                        if (data.user) {
                                currentUser = data.user;
                                updateCurrencySymbols();

                                // Refresh current page
                                window.location.reload();

                                // modal removed
                                showToast("Profile updated", "success");
                        } else {
                                showToast(data.message || "Failed to update profile", "error");
                        }
                })
                .catch((error) => {
                        console.error("Profile update error:", error);
                        showToast("Failed to update profile", "error");
                });
}

// Utility functions
function getCurrencySymbol(currency) {
        const symbols = {
                USD: "$",
                LKR: "Rs",
                EUR: "€",
                GBP: "£",
        };
        return symbols[currency] || "$";
}

function formatCurrency(amount) {
        const symbol = getCurrencySymbol(currentUser && currentUser.currency);
        return (
                symbol + amount.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, "$&,")
        );
}

function formatDate(date) {
	const d = new Date(date);
	return d.toISOString().split("T")[0];
}

function formatMonthYear(date) {
	const d = new Date(date);
	return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function getCategoryName(categoryId) {
	const category = categories.find((c) => c.id == categoryId);
	return category ? category.name : "Unknown";
}

function getCategoryColor(categoryName) {
	const category = categories.find((c) => c.name === categoryName);
	return category ? category.color : getRandomColor(0);
}

function getRandomColor(index) {
	const colors = [
		"#FF5733",
		"#33A8FF",
		"#33FF57",
		"#A833FF",
		"#FF33A8",
		"#33FFA8",
		"#FF3333",
		"#3357FF",
		"#FFAA33",
		"#808080",
	];
        return colors[index % colors.length];
}

function updateCurrencySymbols() {
        const symbol = getCurrencySymbol(currentUser && currentUser.currency);
        document.querySelectorAll(".currency-symbol").forEach((el) => {
                el.textContent = symbol;
        });
}

function toggleCustomDateRange() {
        const dateFilter = document.getElementById("expense-date-filter").value;
        const customDateRange = document.getElementById("custom-date-range");

	if (dateFilter === "custom") {
		customDateRange.classList.remove("d-none");
	} else {
		customDateRange.classList.add("d-none");
	}
}

function toggleIncomeCustomDateRange() {
        const dateFilter = document.getElementById("income-date-filter").value;
        const range = document.getElementById("income-custom-date-range");

        if (dateFilter === "custom") {
                range.classList.remove("d-none");
        } else {
                range.classList.add("d-none");
        }
}

function toggleReportCustomDateRange() {
	const reportPeriod = document.getElementById("report-period").value;
	const customDateRange = document.getElementById("report-custom-date-range");

	if (reportPeriod === "custom") {
		customDateRange.classList.remove("d-none");
	} else {
		customDateRange.classList.add("d-none");
	}
}

function toggleBudgetCustomDates() {
	const budgetPeriod = document.getElementById("budget-period").value;
	const customDates = document.getElementById("budget-custom-dates");

	if (budgetPeriod === "custom") {
		customDates.classList.remove("d-none");
	} else {
		customDates.classList.add("d-none");
	}
}

function showToast(message, type = "info") {
	// Create toast container if it doesn't exist
	let toastContainer = document.querySelector(".toast-container");
	if (!toastContainer) {
		toastContainer = document.createElement("div");
		toastContainer.className = "toast-container";
		document.body.appendChild(toastContainer);
	}

	// Create toast
	const toastId = "toast-" + Date.now();
	const toast = document.createElement("div");
	toast.className = "toast show";
	toast.id = toastId;

	// Set background color based on type
	let bgColor = "bg-info";
	if (type === "success") {
		bgColor = "bg-success";
	} else if (type === "error") {
		bgColor = "bg-danger";
	} else if (type === "warning") {
		bgColor = "bg-warning";
	}

	// Set icon based on type
	let icon = "info-circle";
	if (type === "success") {
		icon = "check-circle";
	} else if (type === "error") {
		icon = "exclamation-circle";
	} else if (type === "warning") {
		icon = "exclamation-triangle";
	}

	toast.innerHTML = `
        <div class="toast-header">
            <strong class="me-auto"><i class="fas fa-${icon} text-${type}"></i> Notification</strong>
            <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close" onclick="document.getElementById('${toastId}').remove()"></button>
        </div>
        <div class="toast-body">
            ${message}
        </div>
    `;

	toastContainer.appendChild(toast);

	// Auto-remove after 5 seconds
	setTimeout(() => {
		if (document.getElementById(toastId)) {
			document.getElementById(toastId).remove();
		}
	}, 5000);
}
                                            // Enhanced budgets-specific functionality
                                            document.addEventListener('DOMContentLoaded', function () {
                                                // Update quick stats when budgets are loaded
                                                function updateQuickStats(budgets) {
                                                    if (!budgets || budgets.length === 0) {
                                                        document.getElementById('total-budgets-display').textContent = '0';
                                                        document.getElementById('total-budget-amount-display').innerHTML = '<span class="currency-symbol">$</span>0.00';
                                                        document.getElementById('total-spent-display').innerHTML = '<span class="currency-symbol">$</span>0.00';
                                                        document.getElementById('budgets-on-track-display').textContent = '0';
                                                        document.getElementById('active-budgets-empty').classList.remove('d-none');
                                                        document.getElementById('budgets-empty-state').classList.remove('d-none');
                                                        return;
                                                    }

                                                    document.getElementById('active-budgets-empty').classList.add('d-none');
                                                    document.getElementById('budgets-empty-state').classList.add('d-none');

                                                    const totalBudgetAmount = budgets.reduce((sum, budget) => sum + budget.amount, 0);
                                                    const totalSpent = budgets.reduce((sum, budget) => sum + (budget.spent || 0), 0);
                                                    const onTrackCount = budgets.filter(budget => getBudgetStatus(budget) === 'on-track').length;

                                                    // Animate the values
                                                    animateValue(document.getElementById('total-budgets-display'), 0, budgets.length, 800, false);
                                                    animateValue(document.getElementById('total-budget-amount-display'), 0, totalBudgetAmount, 1000, true);
                                                    animateValue(document.getElementById('total-spent-display'), 0, totalSpent, 1200, true);
                                                    animateValue(document.getElementById('budgets-on-track-display'), 0, onTrackCount, 600, false);
                                                }

                                                // Enhanced budget card creation
                                                function createBudgetCard(budget) {
                                                    const percentage = budget.amount > 0 ? Math.min((budget.spent / budget.amount) * 100, 100) : 0;
                                                    const status = getBudgetStatus(budget);
                                                    const statusClass = status === 'on-track' ? 'success' : status === 'warning' ? 'warning' : 'danger';
                                                    const remaining = budget.amount - (budget.spent || 0);

                                                    const card = document.createElement('div');
                                                    card.className = 'col-lg-4 col-md-6 mb-4 fade-in';

                                                    card.innerHTML = `
                                                                <div class="budget-card ${status === 'over-budget' ? 'border-danger' : ''}">
                                                                    ${status === 'over-budget' ? '<div class="budget-notification"></div>' : ''}
                                                                    <div class="budget-header">
                                                                        <div class="d-flex align-items-center">
                                                                            <div class="budget-icon ${statusClass}">
                                                                                <i class="fas ${status === 'on-track' ? 'fa-check' : status === 'warning' ? 'fa-exclamation' : 'fa-exclamation-triangle'}"></i>
                                                                            </div>
                                                                            <div class="flex-grow-1">
                                                                                <h6 class="mb-1">${budget.name}</h6>
                                                                                <small class="opacity-75">
                                                                                    ${budget.category ? budget.category.name : 'All Categories'}
                                                                                </small>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                    <div class="card-body">
                                                                        <div class="budget-detail-item">
                                                                            <span class="budget-detail-label">Budget Amount</span>
                                                                            <span class="budget-detail-value">${formatCurrency(budget.amount)}</span>
                                                                        </div>
                                                                        <div class="budget-detail-item">
                                                                            <span class="budget-detail-label">Spent</span>
                                                                            <span class="budget-detail-value text-danger">${formatCurrency(budget.spent || 0)}</span>
                                                                        </div>
                                                                        <div class="budget-detail-item">
                                                                            <span class="budget-detail-label">Remaining</span>
                                                                            <span class="budget-detail-value ${remaining >= 0 ? 'text-success' : 'text-danger'}">
                                                                                ${formatCurrency(remaining)}
                                                                            </span>
                                                                        </div>
                                                                        <div class="budget-progress">
                                                                            <div class="budget-progress-bar ${statusClass}" style="width: ${percentage}%"></div>
                                                                        </div>
                                                                        <div class="d-flex justify-content-between align-items-center mt-3">
                                                                            <span class="budget-status-badge status-${status}">
                                                                                ${status.replace('-', ' ').toUpperCase()}
                                                                            </span>
                                                                            <span class="text-muted">${percentage.toFixed(1)}%</span>
                                                                        </div>
                                                                        <div class="mt-3 d-flex gap-2">
                                                                            <button class="btn btn-outline-primary btn-sm edit-budget-btn" data-id="${budget.id}">
                                                                                <i class="fas fa-edit me-1"></i>Edit
                                                                            </button>
                                                                            <button class="btn btn-outline-success btn-sm" data-bs-toggle="modal" data-bs-target="#addExpenseModal">
                                                                                <i class="fas fa-plus me-1"></i>Add Expense
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            `;

                                                    return card;
                                                }

                                                // Enhanced table row creation
                                                function createBudgetRow(budget) {
                                                    const row = document.createElement('tr');
                                                    row.className = 'fade-in';

                                                    const percentage = budget.amount > 0 ? (budget.spent / budget.amount) * 100 : 0;
                                                    const status = getBudgetStatus(budget);
                                                    const remaining = budget.amount - (budget.spent || 0);
                                                    const categoryColor = budget.category ? budget.category.color : '#6c757d';

                                                    row.innerHTML = `
                                                                <td>
                                                                    <div class="d-flex align-items-center">
                                                                        <i class="fas fa-calculator text-primary me-2"></i>
                                                                        <strong>${budget.name}</strong>
                                                                    </div>
                                                                </td>
                                                                <td>
                                                                    <span class="category-badge" style="background-color: ${categoryColor}">
                                                                        ${budget.category ? budget.category.name : 'All Categories'}
                                                                    </span>
                                                                </td>
                                                                <td>
                                                                    <span class="budget-period-badge">
                                                                        ${formatBudgetPeriod(budget)}
                                                                    </span>
                                                                </td>
                                                                <td>
                                                                    <strong class="text-primary">${formatCurrency(budget.amount)}</strong>
                                                                </td>
                                                                <td>
                                                                    <span class="text-danger">${formatCurrency(budget.spent || 0)}</span>
                                                                </td>
                                                                <td>
                                                                    <span class="${remaining >= 0 ? 'text-success' : 'text-danger'}">
                                                                        ${formatCurrency(remaining)}
                                                                    </span>
                                                                </td>
                                                                <td>
                                                                    <span class="budget-status-badge status-${status}">
                                                                        ${status.replace('-', ' ').toUpperCase()}
                                                                    </span>
                                                                    <div class="budget-progress mt-1">
                                                                        <div class="budget-progress-bar ${status === 'on-track' ? 'success' : status === 'warning' ? 'warning' : 'danger'}" 
                                                                             style="width: ${Math.min(percentage, 100)}%"></div>
                                                                    </div>
                                                                </td>
                                                                <td>
                                                                    <button class="btn btn-outline-primary action-btn edit-budget-btn me-1" data-id="${budget.id}" title="Edit Budget">
                                                                        <i class="fas fa-edit"></i>
                                                                    </button>
                                                                    <button class="btn btn-outline-success action-btn" data-bs-toggle="modal" data-bs-target="#addExpenseModal" title="Add Expense">
                                                                        <i class="fas fa-plus"></i>
                                                                    </button>
                                                                </td>
                                                            `;

                                                    return row;
                                                }

                                                // Budget status calculation
                                                function getBudgetStatus(budget) {
                                                    const percentage = budget.amount > 0 ? (budget.spent / budget.amount) * 100 : 0;
                                                    if (percentage >= 100) return 'over-budget';
                                                    if (percentage >= 80) return 'warning';
                                                    return 'on-track';
                                                }

                                                // Format budget period
                                                function formatBudgetPeriod(budget) {
                                                    if (budget.period === 'monthly') return '📅 Monthly';
                                                    if (budget.period === 'quarterly') return '📊 Quarterly';
                                                    if (budget.period === 'yearly') return '🗓️ Yearly';
                                                    return '⚙️ Custom';
                                                }

                                                // Override the original loadBudgets function to use enhanced features
                                                const originalLoadBudgets = window.loadBudgets;
                                                window.loadBudgets = function () {
                                                    if (originalLoadBudgets) {
                                                        return originalLoadBudgets().then(budgets => {
                                                            updateQuickStats(budgets);

                                                            // Enhanced budget cards
                                                            const cardsContainer = document.getElementById('active-budgets-container');
                                                            if (cardsContainer && budgets && budgets.length > 0) {
                                                                cardsContainer.innerHTML = '';
                                                                budgets.slice(0, 6).forEach(budget => { // Show only first 6 active budgets
                                                                    const card = createBudgetCard(budget);
                                                                    cardsContainer.appendChild(card);
                                                                });
                                                            }

                                                            // Enhanced table population
                                                            const tableBody = document.getElementById('budgets-table');
                                                            if (tableBody && budgets && budgets.length > 0) {
                                                                tableBody.innerHTML = '';
                                                                budgets.forEach(budget => {
                                                                    const row = createBudgetRow(budget);
                                                                    tableBody.appendChild(row);
                                                                });

                                                                // Re-attach event listeners
                                                                document.querySelectorAll('.edit-budget-btn').forEach(button => {
                                                                    button.addEventListener('click', function () {
                                                                        const budgetId = this.getAttribute('data-id');
                                                                        openEditBudgetModal(budgetId);
                                                                    });
                                                                });
                                                            }

                                                            return budgets;
                                                        });
                                                    }
                                                };

                                                // Export functionality
                                                window.exportBudgets = function (format) {
                                                    const budgets = window.budgets || [];
                                                    if (budgets.length === 0) {
                                                        showToast('No budgets to export', 'warning');
                                                        return;
                                                    }

                                                    if (format === 'csv') {
                                                        exportBudgetsToCSV(budgets);
                                                    } else if (format === 'excel') {
                                                        exportBudgetsToExcel(budgets);
                                                    }
                                                };

                                                function exportBudgetsToCSV(budgets) {
                                                    const headers = ['Name', 'Category', 'Period', 'Budget Amount', 'Spent', 'Remaining', 'Status', 'Start Date', 'End Date'];
                                                    const csvContent = [
                                                        headers.join(','),
                                                        ...budgets.map(budget => {
                                                            const remaining = budget.amount - (budget.spent || 0);
                                                            const status = getBudgetStatus(budget);
                                                            return [
                                                                `"${budget.name}"`,
                                                                budget.category ? budget.category.name : 'All Categories',
                                                                budget.period || 'monthly',
                                                                budget.amount,
                                                                budget.spent || 0,
                                                                remaining,
                                                                status,
                                                                budget.start_date || '',
                                                                budget.end_date || ''
                                                            ].join(',');
                                                        })
                                                    ].join('\n');

                                                    downloadFile(csvContent, 'budgets.csv', 'text/csv');
                                                }

                                                function exportBudgetsToExcel(budgets) {
                                                    // This would require a library like SheetJS for proper Excel export
                                                    // For now, we'll export as CSV with .xlsx extension
                                                    showToast('Excel export feature coming soon! Exporting as CSV instead.', 'info');
                                                    exportBudgetsToCSV(budgets);
                                                }

                                                function downloadFile(content, fileName, contentType) {
                                                    const blob = new Blob([content], { type: contentType });
                                                    const url = window.URL.createObjectURL(blob);
                                                    const a = document.createElement('a');
                                                    a.href = url;
                                                    a.download = fileName;
                                                    document.body.appendChild(a);
                                                    a.click();
                                                    document.body.removeChild(a);
                                                    window.URL.revokeObjectURL(url);
                                                    showToast(`Exported ${fileName} successfully!`, 'success');
                                                }

                                                // Utility functions
                                                function animateValue(element, start, end, duration, isCurrency = false) {
                                                    let startTimestamp = null;
                                                    const step = (timestamp) => {
                                                        if (!startTimestamp) startTimestamp = timestamp;
                                                        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
                                                        const current = progress * (end - start) + start;

                                                        if (isCurrency) {
                                                            const symbol = element.querySelector('.currency-symbol');
                                                            if (symbol) {
                                                                element.innerHTML = symbol.outerHTML + current.toFixed(2);
                                                            } else {
                                                                element.textContent = formatCurrency(current);
                                                            }
                                                        } else {
                                                            element.textContent = Math.floor(current);
                                                        }

                                                        if (progress < 1) {
                                                            window.requestAnimationFrame(step);
                                                        }
                                                    };
                                                    window.requestAnimationFrame(step);
                                                }

                                                // Show/hide custom date fields based on period selection
                                                document.getElementById('budget-period')?.addEventListener('change', function () {
                                                    const customDates = document.getElementById('budget-custom-dates');
                                                    if (this.value === 'custom') {
                                                        customDates.classList.remove('d-none');
                                                    } else {
                                                        customDates.classList.add('d-none');
                                                    }
                                                });

                                                // Keyboard shortcuts
                                                document.addEventListener('keydown', function (e) {
                                                    // Ctrl/Cmd + N = Add Budget
                                                    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
                                                        e.preventDefault();
                                                        const addBudgetModal = new bootstrap.Modal(document.getElementById('addBudgetModal'));
                                                        addBudgetModal.show();
                                                    }

                                                    // Ctrl/Cmd + F = Focus on filters
                                                    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
                                                        e.preventDefault();
                                                        document.getElementById('budget-status-filter').focus();
                                                    }
                                                });

                                                // Auto-save draft functionality for forms
                                                const formFields = ['budget-name', 'budget-amount'];
                                                formFields.forEach(fieldId => {
                                                    const field = document.getElementById(fieldId);
                                                    if (field) {
                                                        field.addEventListener('input', function () {
                                                            localStorage.setItem(`draft_${fieldId}`, this.value);
                                                        });

                                                        // Restore draft on page load
                                                        const draftValue = localStorage.getItem(`draft_${fieldId}`);
                                                        if (draftValue) {
                                                            field.value = draftValue;
                                                        }
                                                    }
                                                });

                                                // Clear drafts when form is submitted successfully
                                                document.getElementById('save-budget')?.addEventListener('click', function () {
                                                    formFields.forEach(fieldId => {
                                                        localStorage.removeItem(`draft_${fieldId}`);
                                                    });
                                                });

                                                // Enhanced budget notifications
                                                function checkBudgetAlerts() {
                                                    const budgets = window.budgets || [];
                                                    let alertCount = 0;

                                                    budgets.forEach(budget => {
                                                        const status = getBudgetStatus(budget);
                                                        if (status === 'over-budget' || status === 'warning') {
                                                            alertCount++;
                                                        }
                                                    });

                                                    if (alertCount > 0) {
                                                        showBudgetAlert(alertCount);
                                                    }
                                                }

                                                function showBudgetAlert(count) {
                                                    const alertMessage = count === 1
                                                        ? 'You have 1 budget that needs attention!'
                                                        : `You have ${count} budgets that need attention!`;

                                                    showToast(alertMessage, 'warning', 5000);
                                                }

                                                // Enhanced search and filter functionality
                                                document.getElementById('apply-budget-filters')?.addEventListener('click', function () {
                                                    const statusFilter = document.getElementById('budget-status-filter').value;
                                                    const categoryFilter = document.getElementById('budget-category-filter').value;
                                                    const periodFilter = document.getElementById('budget-period-filter').value;

                                                    filterBudgets(statusFilter, categoryFilter, periodFilter);
                                                });

                                                function filterBudgets(status, category, period) {
                                                    const budgets = window.budgets || [];

                                                    const filteredBudgets = budgets.filter(budget => {
                                                        let matchesStatus = true;
                                                        let matchesCategory = true;
                                                        let matchesPeriod = true;

                                                        if (status) {
                                                            matchesStatus = getBudgetStatus(budget) === status;
                                                        }

                                                        if (category) {
                                                            matchesCategory = budget.category && budget.category.id == category;
                                                        }

                                                        if (period) {
                                                            matchesPeriod = budget.period === period;
                                                        }

                                                        return matchesStatus && matchesCategory && matchesPeriod;
                                                    });

                                                    // Update display with filtered results
                                                    updateBudgetDisplay(filteredBudgets);

                                                    const filterCount = filteredBudgets.length;
                                                    const totalCount = budgets.length;

                                                    showToast(`Showing ${filterCount} of ${totalCount} budgets`, 'info', 3000);
                                                }

                                                function updateBudgetDisplay(budgets) {
                                                    // Update cards
                                                    const cardsContainer = document.getElementById('active-budgets-container');
                                                    if (cardsContainer) {
                                                        cardsContainer.innerHTML = '';
                                                        budgets.slice(0, 6).forEach(budget => {
                                                            const card = createBudgetCard(budget);
                                                            cardsContainer.appendChild(card);
                                                        });
                                                    }

                                                    // Update table
                                                    const tableBody = document.getElementById('budgets-table');
                                                    if (tableBody) {
                                                        tableBody.innerHTML = '';
                                                        budgets.forEach(budget => {
                                                            const row = createBudgetRow(budget);
                                                            tableBody.appendChild(row);
                                                        });

                                                        // Re-attach event listeners
                                                        document.querySelectorAll('.edit-budget-btn').forEach(button => {
                                                            button.addEventListener('click', function () {
                                                                const budgetId = this.getAttribute('data-id');
                                                                openEditBudgetModal(budgetId);
                                                            });
                                                        });
                                                    }

                                                    // Show/hide empty states
                                                    if (budgets.length === 0) {
                                                        document.getElementById('active-budgets-empty')?.classList.remove('d-none');
                                                        document.getElementById('budgets-empty-state')?.classList.remove('d-none');
                                                    } else {
                                                        document.getElementById('active-budgets-empty')?.classList.add('d-none');
                                                        document.getElementById('budgets-empty-state')?.classList.add('d-none');
                                                    }
                                                }

                                                // Budget progress animation on scroll
                                                const observer = new IntersectionObserver((entries) => {
                                                    entries.forEach(entry => {
                                                        if (entry.isIntersecting) {
                                                            const progressBars = entry.target.querySelectorAll('.budget-progress-bar');
                                                            progressBars.forEach(bar => {
                                                                const width = bar.style.width;
                                                                bar.style.width = '0%';
                                                                setTimeout(() => {
                                                                    bar.style.width = width;
                                                                }, 100);
                                                            });
                                                        }
                                                    });
                                                }, { threshold: 0.1 });

                                                // Apply animation observer to budget cards
                                                document.querySelectorAll('.budget-card').forEach(card => {
                                                    observer.observe(card);
                                                });

                                                // Enhanced tooltips and help text
                                                function initializeTooltips() {
                                                    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[title]'));
                                                    tooltipTriggerList.map(function (tooltipTriggerEl) {
                                                        return new bootstrap.Tooltip(tooltipTriggerEl);
                                                    });
                                                }

                                                // Budget recommendation system
                                                function provideBudgetRecommendations() {
                                                    const budgets = window.budgets || [];
                                                    const expenses = window.expenses || [];

                                                    if (expenses.length > 0 && budgets.length === 0) {
                                                        showToast('💡 Tip: Create budgets based on your spending patterns to better control your finances!', 'info', 7000);
                                                    }

                                                    const overBudgetCount = budgets.filter(b => getBudgetStatus(b) === 'over-budget').length;
                                                    if (overBudgetCount > 0) {
                                                        showToast(`💰 ${overBudgetCount} budget(s) are over limit. Consider adjusting your spending or budget amounts.`, 'warning', 8000);
                                                    }
                                                }

                                                // Real-time budget updates
                                                function updateBudgetProgress(budgetId, newSpentAmount) {
                                                    const budgetCard = document.querySelector(`[data-id="${budgetId}"]`)?.closest('.budget-card');
                                                    if (budgetCard) {
                                                        const progressBar = budgetCard.querySelector('.budget-progress-bar');
                                                        const budget = window.budgets?.find(b => b.id == budgetId);

                                                        if (budget && progressBar) {
                                                            const newPercentage = (newSpentAmount / budget.amount) * 100;
                                                            progressBar.style.width = `${Math.min(newPercentage, 100)}%`;

                                                            // Update status classes
                                                            const newStatus = getBudgetStatus({ ...budget, spent: newSpentAmount });
                                                            progressBar.className = `budget-progress-bar ${newStatus === 'on-track' ? 'success' : newStatus === 'warning' ? 'warning' : 'danger'}`;
                                                        }
                                                    }
                                                }

                                                // Smart budget suggestions
                                                function suggestBudgetAmounts() {
                                                    const expenses = window.expenses || [];
                                                    if (expenses.length === 0) return;

                                                    const lastThreeMonths = expenses.filter(exp => {
                                                        const expDate = new Date(exp.date);
                                                        const threeMonthsAgo = new Date();
                                                        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
                                                        return expDate >= threeMonthsAgo;
                                                    });

                                                    const categorySpending = {};
                                                    lastThreeMonths.forEach(exp => {
                                                        const category = exp.category?.name || 'Uncategorized';
                                                        categorySpending[category] = (categorySpending[category] || 0) + exp.amount;
                                                    });

                                                    // Show suggestions when adding a new budget
                                                    const budgetCategorySelect = document.getElementById('budget-category');
                                                    if (budgetCategorySelect) {
                                                        budgetCategorySelect.addEventListener('change', function () {
                                                            const selectedCategory = this.options[this.selectedIndex].text;
                                                            const avgSpending = categorySpending[selectedCategory];

                                                            if (avgSpending) {
                                                                const suggestedAmount = Math.ceil(avgSpending / 3 * 1.1); // 10% buffer
                                                                const amountField = document.getElementById('budget-amount');
                                                                if (amountField && !amountField.value) {
                                                                    amountField.value = suggestedAmount;
                                                                    showToast(`💡 Suggested budget: $${suggestedAmount} (based on your spending history)`, 'info', 5000);
                                                                }
                                                            }
                                                        });
                                                    }
                                                }

                                                // Performance monitoring
                                                function trackBudgetPerformance() {
                                                    const budgets = window.budgets || [];
                                                    const performanceData = budgets.map(budget => {
                                                        const percentage = budget.amount > 0 ? (budget.spent / budget.amount) * 100 : 0;
                                                        return {
                                                            name: budget.name,
                                                            percentage: percentage,
                                                            status: getBudgetStatus(budget),
                                                            efficiency: percentage <= 100 ? 'good' : 'poor'
                                                        };
                                                    });

                                                    // Store performance data for analytics
                                                    localStorage.setItem('budgetPerformance', JSON.stringify(performanceData));
                                                }

                                                // Initialize all enhanced features
                                                function initializeEnhancedFeatures() {
                                                    initializeTooltips();
                                                    suggestBudgetAmounts();
                                                    checkBudgetAlerts();
                                                    provideBudgetRecommendations();
                                                    trackBudgetPerformance();
                                                }

                                                // Call initialization
                                                setTimeout(initializeEnhancedFeatures, 1000);

                                                // Intersection Observer for cards animation
                                                document.querySelectorAll('.card').forEach(card => {
                                                    card.style.opacity = '0';
                                                    card.style.transform = 'translateY(20px)';
                                                    card.style.transition = 'all 0.6s ease-out';
                                                    observer.observe(card);
                                                });

                                                // Enhanced budget validation
                                                function validateBudgetForm(form) {
                                                    const name = form.querySelector('#budget-name, #edit-budget-name')?.value;
                                                    const amount = parseFloat(form.querySelector('#budget-amount, #edit-budget-amount')?.value);
                                                    const startDate = form.querySelector('#budget-start-date, #edit-budget-start-date')?.value;
                                                    const endDate = form.querySelector('#budget-end-date, #edit-budget-end-date')?.value;

                                                    if (!name || name.trim().length < 3) {
                                                        showToast('Budget name must be at least 3 characters long', 'error');
                                                        return false;
                                                    }

                                                    if (!amount || amount <= 0) {
                                                        showToast('Budget amount must be greater than zero', 'error');
                                                        return false;
                                                    }

                                                    if (startDate && endDate && new Date(startDate) >= new Date(endDate)) {
                                                        showToast('End date must be after start date', 'error');
                                                        return false;
                                                    }

                                                    return true;
                                                }

                                                // Override form submission to include validation
                                                document.getElementById('save-budget')?.addEventListener('click', function (e) {
                                                    const form = document.getElementById('add-budget-form');
                                                    if (!validateBudgetForm(form)) {
                                                        e.preventDefault();
                                                        return false;
                                                    }
                                                });

                                                document.getElementById('update-budget')?.addEventListener('click', function (e) {
                                                    const form = document.getElementById('edit-budget-form');
                                                    if (!validateBudgetForm(form)) {
                                                        e.preventDefault();
                                                        return false;
                                                    }
                                                });
                                            });

                                                        // Enhanced error handling
                                                        window.addEventListener('error', function (e) {
                                                            console.error('Budgets page error:', e.error);
                                                            showToast('An unexpected error occurred. Please refresh the page.', 'error');
                                                        });

                                                        // Global utility functions for budget management
                                                        window.getBudgetStatus = function (budget) {
                                                            const percentage = budget.amount > 0 ? (budget.spent / budget.amount) * 100 : 0;
                                                            if (percentage >= 100) return 'over-budget';
                                                            if (percentage >= 80) return 'warning';
                                                            return 'on-track';
                                                        };

                                                        window.formatBudgetPeriod = function (budget) {
                                                            if (budget.period === 'monthly') return '📅 Monthly';
                                                            if (budget.period === 'quarterly') return '📊 Quarterly';
                                                            if (budget.period === 'yearly') return '🗓️ Yearly';
                                                            return '⚙️ Custom';
                                                        };

                                                        // Enhanced budget analytics
                                                        window.generateBudgetInsights = function () {
                                                            const budgets = window.budgets || [];
                                                            const insights = {
                                                                totalBudgets: budgets.length,
                                                                totalBudgetAmount: budgets.reduce((sum, b) => sum + b.amount, 0),
                                                                totalSpent: budgets.reduce((sum, b) => sum + (b.spent || 0), 0),
                                                                averageUtilization: budgets.length > 0 ?
                                                                    budgets.reduce((sum, b) => sum + (b.spent / b.amount * 100), 0) / budgets.length : 0,
                                                                budgetsOverLimit: budgets.filter(b => window.getBudgetStatus(b) === 'over-budget').length,
                                                                budgetsNearLimit: budgets.filter(b => window.getBudgetStatus(b) === 'warning').length,
                                                                budgetsOnTrack: budgets.filter(b => window.getBudgetStatus(b) === 'on-track').length
                                                            };

                                                            return insights;
                                                        };
            // Enhanced login functionality
            document.addEventListener('DOMContentLoaded', function () {
                const form = document.getElementById('login-form');
                const loginBtn = document.getElementById('login-btn');
                const errorAlert = document.getElementById('login-error');
                const errorMessage = document.getElementById('error-message');
                const usernameInput = document.getElementById('login-username');
                const passwordInput = document.getElementById('login-password');

                // Form validation and styling
                function validateInput(input) {
                    const isValid = input.checkValidity();
                    input.classList.toggle('is-valid', isValid && input.value.length > 0);
                    input.classList.toggle('is-invalid', !isValid && input.value.length > 0);
                    return isValid;
                }

                // Real-time validation
                [usernameInput, passwordInput].forEach(input => {
                    input.addEventListener('input', function () {
                        validateInput(this);
                        hideError();
                    });

                    input.addEventListener('blur', function () {
                        validateInput(this);
                    });
                });

                // Show error with animation
                function showError(message) {
                    errorMessage.textContent = message;
                    errorAlert.classList.remove('d-none');
                    errorAlert.style.animation = 'fadeIn 0.3s ease-out';
                }

                // Hide error
                function hideError() {
                    errorAlert.classList.add('d-none');
                }

                // Loading state
                function setLoading(loading) {
                    loginBtn.classList.toggle('loading', loading);
                    loginBtn.disabled = loading;

                    const btnText = loginBtn.querySelector('.btn-text');
                    if (loading) {
                        btnText.style.opacity = '0';
                    } else {
                        btnText.style.opacity = '1';
                    }
                }

                // Enhanced form submission
                form.addEventListener('submit', function (e) {
                    e.preventDefault();

                    // Clear previous errors
                    hideError();

                    // Validate all inputs
                    const isUsernameValid = validateInput(usernameInput);
                    const isPasswordValid = validateInput(passwordInput);

                    if (!isUsernameValid || !isPasswordValid) {
                        showError('Please fill in all required fields correctly.');
                        return;
                    }

                    // Set loading state
                    setLoading(true);

                    // Get form data
                    const username = usernameInput.value.trim();
                    const password = passwordInput.value;

                    // Make API call
                    fetch(`${window.location.origin}/api/user/login`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ username, password }),
                    })
                        .then(response => response.json())
                        .then(data => {
                            setLoading(false);

                            if (data.token) {
                                // Success - save token and redirect
                                localStorage.setItem('token', data.token);

                                // Set cookie for server-side authentication
                                document.cookie = `token=${data.token}; path=/; max-age=${24 * 60 * 60}`;

                                // Show success message briefly
                                loginBtn.innerHTML = '<i class="fas fa-check me-2"></i>Success!';
                                loginBtn.style.background = 'linear-gradient(135deg, #4cc9f0 0%, #4361ee 100%)';

                                // Redirect after short delay
                                setTimeout(() => {
                                    window.location.href = '/dashboard';
                                }, 1000);
                            } else {
                                // Show error
                                showError(data.message || 'Login failed. Please check your credentials.');
                            }
                        })
                        .catch(error => {
                            setLoading(false);
                            console.error('Login error:', error);
                            showError('An error occurred during login. Please try again.');
                        });
                });

                // Auto-focus first input
                usernameInput.focus();

                // Enter key handling
                document.addEventListener('keydown', function (e) {
                    if (e.key === 'Enter' && !loginBtn.disabled) {
                        form.dispatchEvent(new Event('submit'));
                    }
                });
            });

            // Password toggle functionality
            function togglePassword(inputId, button) {
                const input = document.getElementById(inputId);
                const icon = button.querySelector('i');

                if (input.type === 'password') {
                    input.type = 'text';
                    icon.classList.remove('fa-eye');
                    icon.classList.add('fa-eye-slash');
                } else {
                    input.type = 'password';
                    icon.classList.remove('fa-eye-slash');
                    icon.classList.add('fa-eye');
                }
            }

            // Smooth transitions for form elements
            document.querySelectorAll('.form-control').forEach(input => {
                input.addEventListener('focus', function () {
                    this.parentElement.style.transform = 'translateY(-2px)';
                });

                input.addEventListener('blur', function () {
                    this.parentElement.style.transform = 'translateY(0)';
                });
            });
            // Enhanced registration functionality
            document.addEventListener('DOMContentLoaded', function () {
                const form = document.getElementById('register-form');
                const registerBtn = document.getElementById('register-btn');
                const errorAlert = document.getElementById('register-error');
                const successAlert = document.getElementById('register-success');
                const errorMessage = document.getElementById('error-message');
                const successMessage = document.getElementById('success-message');

                const usernameInput = document.getElementById('register-username');
                const emailInput = document.getElementById('register-email');
                const passwordInput = document.getElementById('register-password');
                const confirmPasswordInput = document.getElementById('register-confirm-password');
                const termsCheckbox = document.getElementById('terms-checkbox');

                // Validation icons
                const usernameIcon = document.getElementById('username-icon');
                const emailIcon = document.getElementById('email-icon');
                const confirmPasswordIcon = document.getElementById('confirm-password-icon');

                // Password strength elements
                const passwordStrength = document.getElementById('password-strength');
                const strengthBar = document.getElementById('strength-bar');
                const strengthText = document.getElementById('strength-text');

                // Form validation
                function validateInput(input, customValidator = null) {
                    let isValid = input.checkValidity();

                    if (customValidator) {
                        isValid = customValidator() && isValid;
                    }

                    input.classList.toggle('is-valid', isValid && input.value.length > 0);
                    input.classList.toggle('is-invalid', !isValid && input.value.length > 0);

                    return isValid;
                }

                // Update validation icon
                function updateValidationIcon(icon, isValid, hasValue) {
                    if (!hasValue) {
                        icon.innerHTML = '';
                        return;
                    }

                    if (isValid) {
                        icon.innerHTML = '<i class="fas fa-check-circle valid"></i>';
                        icon.className = 'validation-icon valid';
                    } else {
                        icon.innerHTML = '<i class="fas fa-times-circle invalid"></i>';
                        icon.className = 'validation-icon invalid';
                    }
                }

                // Username validation
                usernameInput.addEventListener('input', function () {
                    const isValid = validateInput(this, () => {
                        const username = this.value.trim();
                        return username.length >= 3 && username.length <= 20 && /^[a-zA-Z0-9_]+$/.test(username);
                    });
                    updateValidationIcon(usernameIcon, isValid, this.value.length > 0);
                    hideError();
                });

                // Email validation
                emailInput.addEventListener('input', function () {
                    const isValid = validateInput(this, () => {
                        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.value);
                    });
                    updateValidationIcon(emailIcon, isValid, this.value.length > 0);
                    hideError();
                });

                // Password strength checking
                function checkPasswordStrength(password) {
                    let score = 0;
                    const requirements = {
                        length: password.length >= 6,
                        uppercase: /[A-Z]/.test(password),
                        lowercase: /[a-z]/.test(password),
                        number: /\d/.test(password)
                    };

                    // Update requirement indicators
                    Object.keys(requirements).forEach(req => {
                        const element = document.getElementById(`req-${req}`);
                        const icon = element.querySelector('i');

                        if (requirements[req]) {
                            element.classList.add('valid');
                            icon.className = 'fas fa-check';
                            score++;
                        } else {
                            element.classList.remove('valid');
                            icon.className = 'fas fa-times';
                        }
                    });

                    // Update strength bar and text
                    strengthBar.className = 'strength-bar';
                    if (score === 0) {
                        strengthText.textContent = 'Very Weak';
                    } else if (score === 1) {
                        strengthText.textContent = 'Weak';
                        strengthBar.classList.add('strength-weak');
                    } else if (score === 2) {
                        strengthText.textContent = 'Fair';
                        strengthBar.classList.add('strength-fair');
                    } else if (score === 3) {
                        strengthText.textContent = 'Good';
                        strengthBar.classList.add('strength-good');
                    } else if (score === 4) {
                        strengthText.textContent = 'Strong';
                        strengthBar.classList.add('strength-strong');
                    }

                    return score >= 3; // Consider good or strong as valid
                }

                // Password validation
                passwordInput.addEventListener('input', function () {
                    if (this.value.length > 0) {
                        passwordStrength.classList.remove('d-none');
                    } else {
                        passwordStrength.classList.add('d-none');
                    }

                    const isValid = checkPasswordStrength(this.value);
                    validateInput(this, () => isValid);

                    // Re-validate confirm password if it has value
                    if (confirmPasswordInput.value.length > 0) {
                        validateConfirmPassword();
                    }
                    hideError();
                });

                // Confirm password validation
                function validateConfirmPassword() {
                    const isValid = validateInput(confirmPasswordInput, () => {
                        return confirmPasswordInput.value === passwordInput.value && passwordInput.value.length > 0;
                    });
                    updateValidationIcon(confirmPasswordIcon, isValid, confirmPasswordInput.value.length > 0);
                    return isValid;
                }

                confirmPasswordInput.addEventListener('input', function () {
                    validateConfirmPassword();
                    hideError();
                });

                // Terms checkbox validation
                termsCheckbox.addEventListener('change', function () {
                    hideError();
                });

                // Show error with animation
                function showError(message) {
                    errorMessage.textContent = message;
                    errorAlert.classList.remove('d-none');
                    successAlert.classList.add('d-none');
                    errorAlert.style.animation = 'fadeIn 0.3s ease-out';
                }

                // Show success with animation
                function showSuccess(message) {
                    successMessage.textContent = message;
                    successAlert.classList.remove('d-none');
                    errorAlert.classList.add('d-none');
                    successAlert.style.animation = 'fadeIn 0.3s ease-out';
                }

                // Hide alerts
                function hideError() {
                    errorAlert.classList.add('d-none');
                    successAlert.classList.add('d-none');
                }

                // Loading state
                function setLoading(loading) {
                    registerBtn.classList.toggle('loading', loading);
                    registerBtn.disabled = loading;

                    const btnText = registerBtn.querySelector('.btn-text');
                    if (loading) {
                        btnText.style.opacity = '0';
                    } else {
                        btnText.style.opacity = '1';
                    }
                }

                // Form submission
                form.addEventListener('submit', function (e) {
                    e.preventDefault();

                    // Clear previous messages
                    hideError();

                    // Validate all inputs
                    const isUsernameValid = validateInput(usernameInput, () => {
                        const username = usernameInput.value.trim();
                        return username.length >= 3 && username.length <= 20 && /^[a-zA-Z0-9_]+$/.test(username);
                    });

                    const isEmailValid = validateInput(emailInput, () => {
                        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput.value);
                    });

                    const isPasswordValid = checkPasswordStrength(passwordInput.value);
                    const isConfirmPasswordValid = validateConfirmPassword();
                    const isTermsAccepted = termsCheckbox.checked;

                    // Show specific error messages
                    if (!isUsernameValid) {
                        showError('Username must be 3-20 characters and contain only letters, numbers, and underscores.');
                        return;
                    }

                    if (!isEmailValid) {
                        showError('Please enter a valid email address.');
                        return;
                    }

                    if (!isPasswordValid) {
                        showError('Password must be at least 6 characters with uppercase, lowercase, and number.');
                        return;
                    }

                    if (!isConfirmPasswordValid) {
                        showError('Passwords do not match.');
                        return;
                    }

                    if (!isTermsAccepted) {
                        showError('Please accept the Terms of Service and Privacy Policy.');
                        return;
                    }

                    // Set loading state
                    setLoading(true);

                    // Get form data
                    const username = usernameInput.value.trim();
                    const email = emailInput.value.trim();
                    const password = passwordInput.value;

                    // Make API call using the same API_URL pattern as other files
                    const API_URL = window.location.origin;

                    fetch(`${API_URL}/api/user/register`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ username, email, password }),
                    })
                        .then(response => response.json())
                        .then(data => {
                            setLoading(false);

                            if (data.message === 'User registered successfully') {
                                // Success
                                showSuccess('Account created successfully! Redirecting to login...');

                                // Add success animation to card
                                document.querySelector('.register-card').classList.add('success-animation');

                                // Update button
                                registerBtn.innerHTML = '<i class="fas fa-check me-2"></i>Account Created!';
                                registerBtn.style.background = 'linear-gradient(135deg, #4cc9f0 0%, #4361ee 100%)';

                                // Redirect after delay
                                setTimeout(() => {
                                    window.location.href = '/login';
                                }, 2000);
                            } else {
                                // Show error
                                showError(data.message || 'Registration failed. Please try again.');
                            }
                        })
                        .catch(error => {
                            setLoading(false);
                            console.error('Registration error:', error);
                            showError('An error occurred during registration. Please try again.');
                        });
                });

                // Auto-focus first input
                usernameInput.focus();

                // Enter key handling
                document.addEventListener('keydown', function (e) {
                    if (e.key === 'Enter' && !registerBtn.disabled) {
                        form.dispatchEvent(new Event('submit'));
                    }
                });
            });

            // Password toggle functionality
            function togglePassword(inputId, button) {
                const input = document.getElementById(inputId);
                const icon = button.querySelector('i');

                if (input.type === 'password') {
                    input.type = 'text';
                    icon.classList.remove('fa-eye');
                    icon.classList.add('fa-eye-slash');
                } else {
                    input.type = 'password';
                    icon.classList.remove('fa-eye-slash');
                    icon.classList.add('fa-eye');
                }
            }

            // Smooth transitions for form elements
            document.querySelectorAll('.form-control').forEach(input => {
                input.addEventListener('focus', function () {
                    this.parentElement.style.transform = 'translateY(-2px)';
                });

                input.addEventListener('blur', function () {
                    this.parentElement.style.transform = 'translateY(0)';
                });
            });
            // Smooth scrolling for navigation links
            document.addEventListener('DOMContentLoaded', function () {
                const links = document.querySelectorAll('a[href^="#"]');

                links.forEach(link => {
                    link.addEventListener('click', function (e) {
                        e.preventDefault();
                        const targetId = this.getAttribute('href');
                        const targetElement = document.querySelector(targetId);

                        if (targetElement) {
                            targetElement.scrollIntoView({
                                behavior: 'smooth',
                                block: 'start'
                            });
                        }
                    });
                });

                // Navbar background on scroll
                window.addEventListener('scroll', function () {
                    const navbar = document.querySelector('.navbar');
                    if (window.scrollY > 50) {
                        navbar.style.backgroundColor = 'rgba(67, 97, 238, 0.98)';
                    } else {
                        navbar.style.backgroundColor = 'rgba(67, 97, 238, 0.95)';
                    }
                });

                // Counter animation
                const counters = document.querySelectorAll('.stat-number');
                const speed = 200;

                const animateCounters = () => {
                    counters.forEach(counter => {
                        const updateCount = () => {
                            const target = parseInt(counter.textContent.replace(/[^\d]/g, ''));
                            const count = parseInt(counter.getAttribute('data-count') || '0');
                            const inc = target / speed;

                            if (count < target) {
                                counter.setAttribute('data-count', Math.ceil(count + inc));
                                if (counter.textContent.includes('K')) {
                                    counter.textContent = Math.ceil(count + inc) / 1000 + 'K+';
                                } else if (counter.textContent.includes('%')) {
                                    counter.textContent = Math.ceil(count + inc) + '%';
                                } else {
                                    counter.textContent = Math.ceil(count + inc) + '+';
                                }
                                setTimeout(updateCount, 1);
                            } else {
                                counter.textContent = counter.textContent;
                            }
                        };
                        updateCount();
                    });
                };

                // Trigger counter animation when stats section comes into view
                const observer = new IntersectionObserver((entries) => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting) {
                            animateCounters();
                            observer.unobserve(entry.target);
                        }
                    });
                });

                const statsSection = document.querySelector('.stats-section');
                if (statsSection) {
                    observer.observe(statsSection);
                }
            });
            // Additional dashboard-specific functionality
            document.addEventListener('DOMContentLoaded', function () {
                // Set default date for expense form
                const expenseDate = document.getElementById('expense-date');
                if (expenseDate) {
                    expenseDate.valueAsDate = new Date();
                }

                // Add smooth scrolling for internal links
                document.querySelectorAll('a[href^="#"]').forEach(anchor => {
                    anchor.addEventListener('click', function (e) {
                        e.preventDefault();
                        const target = document.querySelector(this.getAttribute('href'));
                        if (target) {
                            target.scrollIntoView({
                                behavior: 'smooth',
                                block: 'start'
                            });
                        }
                    });
                });

                // Add loading states to buttons
                document.querySelectorAll('button[type="submit"], #save-expense, #save-budget, #update-expense, #update-budget').forEach(btn => {
                    btn.addEventListener('click', function () {
                        const originalText = this.innerHTML;
                        this.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Processing...';
                        this.disabled = true;

                        // Reset after 3 seconds (should be handled by actual form submission)
                        setTimeout(() => {
                            this.innerHTML = originalText;
                            this.disabled = false;
                        }, 3000);
                    });
                });

                // Auto-refresh data every 5 minutes
                setInterval(() => {
                    if (typeof loadDashboardData === 'function') {
                        loadDashboardData();
                    }
                }, 300000); // 5 minutes

                // Add keyboard shortcuts
                document.addEventListener('keydown', function (e) {
                    // Ctrl/Cmd + E = Add Expense
                    if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
                        e.preventDefault();
                        const addExpenseModal = new bootstrap.Modal(document.getElementById('addExpenseModal'));
                        addExpenseModal.show();
                    }

                    // Ctrl/Cmd + B = Add Budget
                    if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
                        e.preventDefault();
                        const addBudgetModal = new bootstrap.Modal(document.getElementById('addBudgetModal'));
                        addBudgetModal.show();
                    }
                });

                // Add tooltips to metric cards
                const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
                tooltipTriggerList.map(function (tooltipTriggerEl) {
                    return new bootstrap.Tooltip(tooltipTriggerEl);
                });

                // Animate numbers on load
                function animateValue(element, start, end, duration) {
                    let startTimestamp = null;
                    const step = (timestamp) => {
                        if (!startTimestamp) startTimestamp = timestamp;
                        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
                        const current = progress * (end - start) + start;

                        // Fix: Use a proper check for currency symbol and set text correctly
                        if (element.classList.contains('currency-symbol') || element.textContent.trim().match(/^[\$\€\£\₨]/)) {
                            // Get the currency symbol from the element or default to $
                            let symbol = element.textContent.trim().charAt(0);
                            if (!/[\$\€\£\₨]/.test(symbol)) symbol = '$';
                            element.textContent = symbol + current.toFixed(2);
                        } else {
                            element.textContent = Math.floor(current);
                        }

                        if (progress < 1) {
                            window.requestAnimationFrame(step);
                        }
                    };
                    window.requestAnimationFrame(step);
                }

                // Animate metric cards when they come into view
                const observer = new IntersectionObserver((entries) => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting) {
                            entry.target.style.opacity = '1';
                            entry.target.style.transform = 'translateY(0)';
                        }
                    });
                }, { threshold: 0.1 });

                document.querySelectorAll('.metric-card').forEach(card => {
                    card.style.opacity = '0';
                    card.style.transform = 'translateY(20px)';
                    card.style.transition = 'all 0.6s ease-out';
                    observer.observe(card);
                });
            });

            // Enhanced error handling
            window.addEventListener('error', function (e) {
                console.error('Dashboard error:', e.error);
                // Could add user-friendly error notification here
            });

            // Add chart resize handler
            window.addEventListener('resize', function () {
                if (typeof charts !== 'undefined') {
                    Object.values(charts).forEach(chart => {
                        if (chart && typeof chart.resize === 'function') {
                            chart.resize();
                        }
                    });
                }
            });
            // Additional expenses-specific functionality
            document.addEventListener('DOMContentLoaded', function () {
                // Set default date for expense form
                const expenseDate = document.getElementById('expense-date');
                if (expenseDate) {
                    expenseDate.valueAsDate = new Date();
                }

                // Update quick stats when expenses are loaded
                function updateQuickStats(expenses) {
                    if (!expenses || expenses.length === 0) {
                        document.getElementById('total-expenses-display').innerHTML = '<span class="currency-symbol">$</span>0.00';
                        document.getElementById('expense-count-display').textContent = '0';
                        document.getElementById('avg-expense-display').innerHTML = '<span class="currency-symbol">$</span>0.00';
                        document.getElementById('last-expense-date').textContent = '-';
                        document.getElementById('empty-state').classList.remove('d-none');
                        return;
                    }

                    document.getElementById('empty-state').classList.add('d-none');

                    const total = expenses.reduce((sum, exp) => sum + exp.amount, 0);
                    const average = total / expenses.length;
                    const lastExpense = expenses[0]; // Assuming expenses are sorted by date desc

                    // Animate the values
                    animateValue(document.getElementById('total-expenses-display'), 0, total, 1000, true);
                    animateValue(document.getElementById('expense-count-display'), 0, expenses.length, 800, false);
                    animateValue(document.getElementById('avg-expense-display'), 0, average, 1200, true);

                    if (lastExpense) {
                        const lastDate = new Date(lastExpense.date);
                        document.getElementById('last-expense-date').textContent = formatDateShort(lastDate);
                    }
                }

                // Enhanced table row creation
                function createExpenseRow(expense) {
                    const row = document.createElement('tr');
                    row.className = 'fade-in';

                    const categoryColor = expense.category ? expense.category.color : '#6c757d';
                    const paymentMethodClass = expense.payment_method === 'cash' ? 'payment-cash' : 'payment-credit';
                    const paymentMethodIcon = expense.payment_method === 'cash' ? '💵' : '💳';

                    row.innerHTML = `
                    <td>
                        <div class="date-badge">
                            ${formatDate(new Date(expense.date))}
                        </div>
                    </td>
                    <td>
                        <span class="category-badge" style="background-color: ${categoryColor}">
                            ${expense.category ? expense.category.name : 'Uncategorized'}
                        </span>
                    </td>
                    <td>
                        <div class="expense-description">
                            ${expense.description || '<em class="text-muted">No description</em>'}
                        </div>
                    </td>
                    <td>
                        <span class="payment-method-badge ${paymentMethodClass}">
                            ${paymentMethodIcon} ${expense.payment_method ? expense.payment_method.charAt(0).toUpperCase() + expense.payment_method.slice(1) : 'Cash'}
                        </span>
                    </td>
                    <td>
                        <span class="amount-cell amount-negative">
                            ${formatCurrency(expense.amount)}
                        </span>
                    </td>
                    <td>
                        <button class="btn btn-outline-primary action-btn edit-expense-btn" data-id="${expense.id}" title="Edit Expense">
                            <i class="fas fa-edit"></i>
                        </button>
                    </td>
                `;

                    return row;
                }

                // Override the original loadExpenses function to use enhanced features
                const originalLoadExpenses = window.loadExpenses;
                window.loadExpenses = function () {
                    if (originalLoadExpenses) {
                        return originalLoadExpenses().then(expenses => {
                            updateQuickStats(expenses);

                            // Enhanced table population
                            const tableBody = document.getElementById('expenses-table');
                            if (tableBody && expenses && expenses.length > 0) {
                                tableBody.innerHTML = '';
                                expenses.forEach(expense => {
                                    const row = createExpenseRow(expense);
                                    tableBody.appendChild(row);
                                });

                                // Re-attach event listeners
                                document.querySelectorAll('.edit-expense-btn').forEach(button => {
                                    button.addEventListener('click', function () {
                                        const expenseId = this.getAttribute('data-id');
                                        openEditExpenseModal(expenseId);
                                    });
                                });
                            }

                            return expenses;
                        });
                    }
                };

                // Export functionality
                window.exportExpenses = function (format) {
                    const expenses = window.expenses || [];
                    if (expenses.length === 0) {
                        showToast('No expenses to export', 'warning');
                        return;
                    }

                    if (format === 'csv') {
                        exportToCSV(expenses);
                    } else if (format === 'excel') {
                        exportToExcel(expenses);
                    }
                };

                function exportToCSV(expenses) {
                    const headers = ['Date', 'Category', 'Description', 'Payment Method', 'Amount'];
                    const csvContent = [
                        headers.join(','),
                        ...expenses.map(exp => [
                            exp.date,
                            exp.category ? exp.category.name : 'Uncategorized',
                            `"${exp.description || ''}"`,
                            exp.payment_method || 'cash',
                            exp.amount
                        ].join(','))
                    ].join('\n');

                    downloadFile(csvContent, 'expenses.csv', 'text/csv');
                }

                function exportToExcel(expenses) {
                    // This would require a library like SheetJS for proper Excel export
                    // For now, we'll export as CSV with .xlsx extension
                    showToast('Excel export feature coming soon! Exporting as CSV instead.', 'info');
                    exportToCSV(expenses);
                }

                function downloadFile(content, fileName, contentType) {
                    const blob = new Blob([content], { type: contentType });
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = fileName;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    window.URL.revokeObjectURL(url);
                    showToast(`Exported ${fileName} successfully!`, 'success');
                }

                // Utility functions
                function animateValue(element, start, end, duration, isCurrency = false) {
                    let startTimestamp = null;
                    const step = (timestamp) => {
                        if (!startTimestamp) startTimestamp = timestamp;
                        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
                        const current = progress * (end - start) + start;

                        if (isCurrency) {
                            const symbol = element.querySelector('.currency-symbol');
                            if (symbol) {
                                element.innerHTML = symbol.outerHTML + current.toFixed(2);
                            } else {
                                element.textContent = formatCurrency(current);
                            }
                        } else {
                            element.textContent = Math.floor(current);
                        }

                        if (progress < 1) {
                            window.requestAnimationFrame(step);
                        }
                    };
                    window.requestAnimationFrame(step);
                }

                function formatDateShort(date) {
                    return date.toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric'
                    });
                }

                // Keyboard shortcuts
                document.addEventListener('keydown', function (e) {
                    // Ctrl/Cmd + N = Add Expense
                    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
                        e.preventDefault();
                        const addExpenseModal = new bootstrap.Modal(document.getElementById('addExpenseModal'));
                        addExpenseModal.show();
                    }

                    // Ctrl/Cmd + F = Focus on filters
                    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
                        e.preventDefault();
                        document.getElementById('expense-date-filter').focus();
                    }
                });

                // Auto-save draft functionality for forms
                const formFields = ['expense-amount', 'expense-description'];
                formFields.forEach(fieldId => {
                    const field = document.getElementById(fieldId);
                    if (field) {
                        field.addEventListener('input', function () {
                            localStorage.setItem(`draft_${fieldId}`, this.value);
                        });

                        // Restore draft on page load
                        const draftValue = localStorage.getItem(`draft_${fieldId}`);
                        if (draftValue) {
                            field.value = draftValue;
                        }
                    }
                });

                // Clear drafts when form is submitted successfully
                document.getElementById('save-expense')?.addEventListener('click', function () {
                    formFields.forEach(fieldId => {
                        localStorage.removeItem(`draft_${fieldId}`);
                    });
                });

                // Add tooltips
                const tooltipTriggerList = [].slice.call(document.querySelectorAll('[title]'));
                tooltipTriggerList.map(function (tooltipTriggerEl) {
                    return new bootstrap.Tooltip(tooltipTriggerEl);
                });

                // Intersection Observer for animations
                const observer = new IntersectionObserver((entries) => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting) {
                            entry.target.style.opacity = '1';
                            entry.target.style.transform = 'translateY(0)';
                        }
                    });
                }, { threshold: 0.1 });

                // Apply animation observer to cards
                document.querySelectorAll('.card').forEach(card => {
                    card.style.opacity = '0';
                    card.style.transform = 'translateY(20px)';
                    card.style.transition = 'all 0.6s ease-out';
                    observer.observe(card);
                });
            });

            // Enhanced error handling
            window.addEventListener('error', function (e) {
                console.error('Expenses page error:', e.error);
                showToast('An unexpected error occurred. Please refresh the page.', 'error');
            });
            // Additional incomes-specific functionality
            document.addEventListener('DOMContentLoaded', function () {
                // Set default date for income form
                const incomeDate = document.getElementById('income-date');
                if (incomeDate) {
                    incomeDate.valueAsDate = new Date();
                }

                // Update quick stats when incomes are loaded
                function updateQuickStats(incomes) {
                    if (!incomes || incomes.length === 0) {
                        document.getElementById('hero-total').innerHTML = '<span class="currency-symbol">$</span>0.00';
                        document.getElementById('hero-count').textContent = '0';
                        document.getElementById('hero-average').innerHTML = '<span class="currency-symbol">$</span>0.00';
                        document.getElementById('hero-last-date').textContent = '-';
                        document.getElementById('empty-state').classList.remove('d-none');
                        document.getElementById('record-count').textContent = '0 records';
                        return;
                    }

                    document.getElementById('empty-state').classList.add('d-none');

                    const total = incomes.reduce((sum, inc) => sum + inc.amount, 0);
                    const average = total / incomes.length;
                    const lastIncome = incomes[0]; // Assuming incomes are sorted by date desc

                    // Animate the values
                    animateValue(document.getElementById('hero-total'), 0, total, 1000, true);
                    animateValue(document.getElementById('hero-count'), 0, incomes.length, 800, false);
                    animateValue(document.getElementById('hero-average'), 0, average, 1200, true);

                    document.getElementById('record-count').textContent = `${incomes.length} record${incomes.length !== 1 ? 's' : ''}`;

                    if (lastIncome) {
                        const lastDate = new Date(lastIncome.date);
                        document.getElementById('hero-last-date').textContent = formatDateShort(lastDate);
                    }
                }

                // Enhanced table row creation
                function createIncomeRow(income) {
                    const row = document.createElement('tr');
                    row.className = 'slide-in-up';

                    const typeClass = getIncomeTypeClass(income.income_type);
                    const displayType = income.income_type === 'Other' && income.other_source
                        ? `${income.income_type} - ${income.other_source}`
                        : income.income_type;

                    row.innerHTML = `
                    <td>
                        <div class="income-row-date">
                            ${formatDate(new Date(income.date))}
                        </div>
                    </td>
                    <td>
                        <span class="income-type-pill ${typeClass}">
                            <span class="type-icon"></span>
                            ${displayType}
                        </span>
                    </td>
                    <td>
                        <div class="description-cell">
                            ${income.description || '<em class="text-muted">No description</em>'}
                        </div>
                    </td>
                    <td>
                        <span class="amount-display">
                            ${formatCurrency(income.amount)}
                        </span>
                    </td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn action-btn btn-edit edit-income-btn" data-id="${income.id}" title="Edit Income">
                                <i class="fas fa-edit"></i>
                            </button>
                        </div>
                    </td>
                `;

                    return row;
                }

                function getIncomeTypeClass(type) {
                    switch (type) {
                        case 'Salary': return 'type-salary';
                        case 'Business': return 'type-business';
                        case 'Investments': return 'type-investments';
                        default: return 'type-other';
                    }
                }

                // Override the original loadIncomes function to use enhanced features
                const originalLoadIncomes = window.loadIncomes;
                window.loadIncomes = function () {
                    if (originalLoadIncomes) {
                        return originalLoadIncomes().then(incomes => {
                            updateQuickStats(incomes);

                            // Enhanced table population
                            const tableBody = document.getElementById('incomes-table');
                            if (tableBody && incomes && incomes.length > 0) {
                                tableBody.innerHTML = '';
                                incomes.forEach(income => {
                                    const row = createIncomeRow(income);
                                    tableBody.appendChild(row);
                                });

                                // Re-attach event listeners
                                document.querySelectorAll('.edit-income-btn').forEach(button => {
                                    button.addEventListener('click', function () {
                                        const incomeId = this.getAttribute('data-id');
                                        openEditIncomeModal(incomeId);
                                    });
                                });
                            }

                            return incomes;
                        });
                    }
                };

                // Export functionality
                window.exportIncomes = function (format) {
                    const incomes = window.incomes || [];
                    if (incomes.length === 0) {
                        showToast('No incomes to export', 'warning');
                        return;
                    }

                    if (format === 'csv') {
                        exportToCSV(incomes);
                    } else if (format === 'excel') {
                        exportToExcel(incomes);
                    } else if (format === 'pdf') {
                        exportToPDF(incomes);
                    }
                };

                window.printIncomes = function () {
                    const incomes = window.incomes || [];
                    if (incomes.length === 0) {
                        showToast('No incomes to print', 'warning');
                        return;
                    }

                    const printWindow = window.open('', '_blank');
                    const printContent = generatePrintContent(incomes);
                    printWindow.document.write(printContent);
                    printWindow.document.close();
                    printWindow.print();
                };

                function exportToCSV(incomes) {
                    const headers = ['Date', 'Type', 'Other Source', 'Description', 'Amount'];
                    const csvContent = [
                        headers.join(','),
                        ...incomes.map(inc => [
                            inc.date,
                            inc.income_type,
                            `"${inc.other_source || ''}"`,
                            `"${inc.description || ''}"`,
                            inc.amount
                        ].join(','))
                    ].join('\n');

                    downloadFile(csvContent, 'incomes.csv', 'text/csv');
                }

                function exportToExcel(incomes) {
                    showToast('Excel export feature coming soon! Exporting as CSV instead.', 'info');
                    exportToCSV(incomes);
                }

                function exportToPDF(incomes) {
                    showToast('PDF export feature coming soon! Exporting as CSV instead.', 'info');
                    exportToCSV(incomes);
                }

                function generatePrintContent(incomes) {
                    const total = incomes.reduce((sum, inc) => sum + inc.amount, 0);
                    return `
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <title>Income Report</title>
                        <style>
                            body { font-family: Arial, sans-serif; margin: 20px; }
                            h1 { color: #28a745; text-align: center; }
                            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                            th { background-color: #28a745; color: white; }
                            .total { font-weight: bold; background-color: #f8f9fa; }
                        </style>
                    </head>
                    <body>
                        <h1>Income Report</h1>
                        <p>Generated on: ${new Date().toLocaleDateString()}</p>
                        <table>
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Type</th>
                                    <th>Description</th>
                                    <th>Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${incomes.map(inc => `
                                    <tr>
                                        <td>${formatDate(new Date(inc.date))}</td>
                                        <td>${inc.income_type === 'Other' && inc.other_source ? `${inc.income_type} - ${inc.other_source}` : inc.income_type}</td>
                                        <td>${inc.description || '-'}</td>
                                        <td>${formatCurrency(inc.amount)}</td>
                                    </tr>
                                `).join('')}
                                <tr class="total">
                                    <td colspan="3"><strong>Total Income</strong></td>
                                    <td><strong>${formatCurrency(total)}</strong></td>
                                </tr>
                            </tbody>
                        </table>
                    </body>
                    </html>
                `;
                }

                function downloadFile(content, fileName, contentType) {
                    const blob = new Blob([content], { type: contentType });
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = fileName;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    window.URL.revokeObjectURL(url);
                    showToast(`Exported ${fileName} successfully!`, 'success');
                }

                // Search functionality
                const searchInput = document.getElementById('income-search');
                if (searchInput) {
                    searchInput.addEventListener('input', function () {
                        const searchTerm = this.value.toLowerCase();
                        const rows = document.querySelectorAll('#incomes-table tr');

                        rows.forEach(row => {
                            const text = row.textContent.toLowerCase();
                            if (text.includes(searchTerm)) {
                                row.style.display = '';
                            } else {
                                row.style.display = 'none';
                            }
                        });
                    });
                }

                // Sorting functionality
                window.sortTable = function (column) {
                    const table = document.getElementById('incomes-table');
                    const rows = Array.from(table.rows);
                    const sortIcon = document.getElementById(`sort-${column}`);

                    // Toggle sort direction
                    const isAsc = sortIcon.classList.contains('fa-sort-up');

                    // Reset all sort icons
                    document.querySelectorAll('.sort-icon').forEach(icon => {
                        icon.className = 'fas fa-sort sort-icon';
                    });

                    // Set current sort icon
                    sortIcon.className = `fas fa-sort-${isAsc ? 'down' : 'up'} sort-icon`;

                    // Sort rows
                    rows.sort((a, b) => {
                        let aVal, bVal;

                        switch (column) {
                            case 'date':
                                aVal = new Date(a.cells[0].textContent.trim());
                                bVal = new Date(b.cells[0].textContent.trim());
                                break;
                            case 'type':
                                aVal = a.cells[1].textContent.trim();
                                bVal = b.cells[1].textContent.trim();
                                break;
                            case 'amount':
                                aVal = parseFloat(a.cells[3].textContent.replace(/[^0-9.-]+/g, ''));
                                bVal = parseFloat(b.cells[3].textContent.replace(/[^0-9.-]+/g, ''));
                                break;
                            default:
                                return 0;
                        }

                        if (aVal < bVal) return isAsc ? 1 : -1;
                        if (aVal > bVal) return isAsc ? -1 : 1;
                        return 0;
                    });

                    // Re-append sorted rows
                    rows.forEach(row => table.appendChild(row));
                };

                // Utility functions
                function animateValue(element, start, end, duration, isCurrency = false) {
                    let startTimestamp = null;
                    const step = (timestamp) => {
                        if (!startTimestamp) startTimestamp = timestamp;
                        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
                        const current = progress * (end - start) + start;

                        if (isCurrency) {
                            const symbol = element.querySelector('.currency-symbol');
                            if (symbol) {
                                element.innerHTML = symbol.outerHTML + current.toFixed(2);
                            } else {
                                element.textContent = formatCurrency(current);
                            }
                        } else {
                            element.textContent = Math.floor(current);
                        }

                        if (progress < 1) {
                            window.requestAnimationFrame(step);
                        }
                    };
                    window.requestAnimationFrame(step);
                }

                function formatDateShort(date) {
                    return date.toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric'
                    });
                }

                // Keyboard shortcuts
                document.addEventListener('keydown', function (e) {
                    // Ctrl/Cmd + N = Add Income
                    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
                        e.preventDefault();
                        const addIncomeModal = new bootstrap.Modal(document.getElementById('addIncomeModal'));
                        addIncomeModal.show();
                    }

                    // Ctrl/Cmd + F = Focus on search
                    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
                        e.preventDefault();
                        document.getElementById('income-search').focus();
                    }
                });

                // Auto-save draft functionality for forms
                const formFields = ['income-amount', 'income-description'];
                formFields.forEach(fieldId => {
                    const field = document.getElementById(fieldId);
                    if (field) {
                        field.addEventListener('input', function () {
                            localStorage.setItem(`draft_${fieldId}`, this.value);
                        });

                        // Restore draft on page load
                        const draftValue = localStorage.getItem(`draft_${fieldId}`);
                        if (draftValue) {
                            field.value = draftValue;
                        }
                    }
                });

                // Clear drafts when form is submitted successfully
                document.getElementById('save-income')?.addEventListener('click', function () {
                    formFields.forEach(fieldId => {
                        localStorage.removeItem(`draft_${fieldId}`);
                    });
                });

                // Add tooltips
                const tooltipTriggerList = [].slice.call(document.querySelectorAll('[title]'));
                tooltipTriggerList.map(function (tooltipTriggerEl) {
                    return new bootstrap.Tooltip(tooltipTriggerEl);
                });

                // Intersection Observer for animations
                const observer = new IntersectionObserver((entries) => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting) {
                            entry.target.style.opacity = '1';
                            entry.target.style.transform = 'translateY(0)';
                        }
                    });
                }, { threshold: 0.1 });

                // Apply animation observer to cards
                document.querySelectorAll('.slide-in-up').forEach(element => {
                    element.style.opacity = '0';
                    element.style.transform = 'translateY(20px)';
                    element.style.transition = 'all 0.6s ease-out';
                    observer.observe(element);
                });
            });

            // Enhanced error handling
            window.addEventListener('error', function (e) {
                console.error('Incomes page error:', e.error);
                showToast('An unexpected error occurred. Please refresh the page.', 'error');
            });
            // Additional savings-specific functionality
            document.addEventListener('DOMContentLoaded', function () {
                // Set default date for saving form
                const savingDate = document.getElementById('saving-date');
                if (savingDate) {
                    savingDate.valueAsDate = new Date();
                }

                // Update quick stats when savings are loaded
                function updateQuickStats(savings) {
                    if (!savings || savings.length === 0) {
                        document.getElementById('hero-total').innerHTML = '<span class="currency-symbol">$</span>0.00';
                        document.getElementById('hero-count').textContent = '0';
                        document.getElementById('hero-average').innerHTML = '<span class="currency-symbol">$</span>0.00';
                        document.getElementById('hero-last-date').textContent = '-';
                        document.getElementById('empty-state').classList.remove('d-none');
                        document.getElementById('record-count').textContent = '0 records';
                        return;
                    }

                    document.getElementById('empty-state').classList.add('d-none');

                    const total = savings.reduce((sum, sav) => sum + sav.amount, 0);
                    const average = total / savings.length;
                    const lastSaving = savings[0]; // Assuming savings are sorted by date desc

                    // Animate the values
                    animateValue(document.getElementById('hero-total'), 0, total, 1000, true);
                    animateValue(document.getElementById('hero-count'), 0, savings.length, 800, false);
                    animateValue(document.getElementById('hero-average'), 0, average, 1200, true);

                    document.getElementById('record-count').textContent = `${savings.length} record${savings.length !== 1 ? 's' : ''}`;

                    if (lastSaving) {
                        const lastDate = new Date(lastSaving.date);
                        document.getElementById('hero-last-date').textContent = formatDateShort(lastDate);
                    }
                }

                // Enhanced table row creation
                function createSavingRow(saving) {
                    const row = document.createElement('tr');
                    row.className = 'slide-in-up';

                    row.innerHTML = `
                                                    <td>
                                                        <div class="savings-row-date">
                                                            ${formatDate(new Date(saving.date))}
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div class="description-cell">
                                                            ${saving.description || '<em class="text-muted">No description</em>'}
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <span class="amount-display">
                                                            ${formatCurrency(saving.amount)}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <div class="action-buttons">
                                                            <button class="btn action-btn btn-edit edit-saving-btn" data-id="${saving.id}" title="Edit Saving">
                                                                <i class="fas fa-edit"></i>
                                                            </button>
                                                        </div>
                                                    </td>
                                                `;

                    return row;
                }

                // Override the original loadSavings function to use enhanced features
                const originalLoadSavings = window.loadSavings;
                window.loadSavings = function () {
                    if (originalLoadSavings) {
                        return originalLoadSavings().then(savings => {
                            updateQuickStats(savings);

                            // Enhanced table population
                            const tableBody = document.getElementById('savings-table');
                            if (tableBody && savings && savings.length > 0) {
                                tableBody.innerHTML = '';
                                savings.forEach(saving => {
                                    const row = createSavingRow(saving);
                                    tableBody.appendChild(row);
                                });

                                // Re-attach event listeners
                                document.querySelectorAll('.edit-saving-btn').forEach(button => {
                                    button.addEventListener('click', function () {
                                        const savingId = this.getAttribute('data-id');
                                        openEditSavingModal(savingId);
                                    });
                                });
                            }

                            return savings;
                        });
                    }
                };

                // Export functionality
                window.exportSavings = function (format) {
                    const savings = window.savings || [];
                    if (savings.length === 0) {
                        showToast('No savings to export', 'warning');
                        return;
                    }

                    if (format === 'csv') {
                        exportToCSV(savings);
                    } else if (format === 'excel') {
                        exportToExcel(savings);
                    } else if (format === 'pdf') {
                        exportToPDF(savings);
                    }
                };

                window.printSavings = function () {
                    const savings = window.savings || [];
                    if (savings.length === 0) {
                        showToast('No savings to print', 'warning');
                        return;
                    }

                    const printWindow = window.open('', '_blank');
                    const printContent = generatePrintContent(savings);
                    printWindow.document.write(printContent);
                    printWindow.document.close();
                    printWindow.print();
                };

                function exportToCSV(savings) {
                    const headers = ['Date', 'Description', 'Amount'];
                    const csvContent = [
                        headers.join(','),
                        ...savings.map(sav => [
                            sav.date,
                            `"${sav.description || ''}"`,
                            sav.amount
                        ].join(','))
                    ].join('\n');

                    downloadFile(csvContent, 'savings.csv', 'text/csv');
                }

                function exportToExcel(savings) {
                    showToast('Excel export feature coming soon! Exporting as CSV instead.', 'info');
                    exportToCSV(savings);
                }

                function exportToPDF(savings) {
                    showToast('PDF export feature coming soon! Exporting as CSV instead.', 'info');
                    exportToCSV(savings);
                }

                function generatePrintContent(savings) {
                    const total = savings.reduce((sum, sav) => sum + sav.amount, 0);
                    return `
                                                    <!DOCTYPE html>
                                                    <html>
                                                    <head>
                                                        <title>Savings Report</title>
                                                        <style>
                                                            body { font-family: Arial, sans-serif; margin: 20px; }
                                                            h1 { color: #6f42c1; text-align: center; }
                                                            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                                                            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                                                            th { background-color: #6f42c1; color: white; }
                                                            .total { font-weight: bold; background-color: #f8f9fa; }
                                                        </style>
                                                    </head>
                                                    <body>
                                                        <h1>Savings Report</h1>
                                                        <p>Generated on: ${new Date().toLocaleDateString()}</p>
                                                        <table>
                                                            <thead>
                                                                <tr>
                                                                    <th>Date</th>
                                                                    <th>Description</th>
                                                                    <th>Amount</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                ${savings.map(sav => `
                                                                    <tr>
                                                                        <td>${formatDate(new Date(sav.date))}</td>
                                                                        <td>${sav.description || '-'}</td>
                                                                        <td>${formatCurrency(sav.amount)}</td>
                                                                    </tr>
                                                                `).join('')}
                                                                <tr class="total">
                                                                    <td colspan="2"><strong>Total Savings</strong></td>
                                                                    <td><strong>${formatCurrency(total)}</strong></td>
                                                                </tr>
                                                            </tbody>
                                                        </table>
                                                    </body>
                                                    </html>
                                                `;
                }

                function downloadFile(content, fileName, contentType) {
                    const blob = new Blob([content], { type: contentType });
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = fileName;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    window.URL.revokeObjectURL(url);
                    showToast(`Exported ${fileName} successfully!`, 'success');
                }

                // Search functionality
                const searchInput = document.getElementById('saving-search');
                if (searchInput) {
                    searchInput.addEventListener('input', function () {
                        const searchTerm = this.value.toLowerCase();
                        const rows = document.querySelectorAll('#savings-table tr');

                        rows.forEach(row => {
                            const text = row.textContent.toLowerCase();
                            if (text.includes(searchTerm)) {
                                row.style.display = '';
                            } else {
                                row.style.display = 'none';
                            }
                        });
                    });
                }

                // Amount range filter
                const amountRangeFilter = document.getElementById('amount-range-filter');
                if (amountRangeFilter) {
                    amountRangeFilter.addEventListener('change', function () {
                        const range = this.value;
                        const rows = document.querySelectorAll('#savings-table tr');

                        rows.forEach(row => {
                            if (!range) {
                                row.style.display = '';
                                return;
                            }

                            const amountText = row.cells[2]?.textContent || '';
                            const amount = parseFloat(amountText.replace(/[^0-9.-]+/g, ''));

                            let show = false;
                            switch (range) {
                                case '0-100':
                                    show = amount >= 0 && amount <= 100;
                                    break;
                                case '100-500':
                                    show = amount > 100 && amount <= 500;
                                    break;
                                case '500-1000':
                                    show = amount > 500 && amount <= 1000;
                                    break;
                                case '1000+':
                                    show = amount > 1000;
                                    break;
                            }

                            row.style.display = show ? '' : 'none';
                        });
                    });
                }

                // Sorting functionality
                window.sortTable = function (column) {
                    const table = document.getElementById('savings-table');
                    const rows = Array.from(table.rows);
                    const sortIcon = document.getElementById(`sort-${column}`);

                    // Toggle sort direction
                    const isAsc = sortIcon.classList.contains('fa-sort-up');

                    // Reset all sort icons
                    document.querySelectorAll('.sort-icon').forEach(icon => {
                        icon.className = 'fas fa-sort sort-icon';
                    });

                    // Set current sort icon
                    sortIcon.className = `fas fa-sort-${isAsc ? 'down' : 'up'} sort-icon`;

                    // Sort rows
                    rows.sort((a, b) => {
                        let aVal, bVal;

                        switch (column) {
                            case 'date':
                                aVal = new Date(a.cells[0].textContent.trim());
                                bVal = new Date(b.cells[0].textContent.trim());
                                break;
                            case 'amount':
                                aVal = parseFloat(a.cells[2].textContent.replace(/[^0-9.-]+/g, ''));
                                bVal = parseFloat(b.cells[2].textContent.replace(/[^0-9.-]+/g, ''));
                                break;
                            default:
                                return 0;
                        }

                        if (aVal < bVal) return isAsc ? 1 : -1;
                        if (aVal > bVal) return isAsc ? -1 : 1;
                        return 0;
                    });

                    // Re-append sorted rows
                    rows.forEach(row => table.appendChild(row));
                };

                // Utility functions
                function animateValue(element, start, end, duration, isCurrency = false) {
                    let startTimestamp = null;
                    const step = (timestamp) => {
                        if (!startTimestamp) startTimestamp = timestamp;
                        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
                        const current = progress * (end - start) + start;

                        if (isCurrency) {
                            const symbol = element.querySelector('.currency-symbol');
                            if (symbol) {
                                element.innerHTML = symbol.outerHTML + current.toFixed(2);
                            } else {
                                element.textContent = formatCurrency(current);
                            }
                        } else {
                            element.textContent = Math.floor(current);
                        }

                        if (progress < 1) {
                            window.requestAnimationFrame(step);
                        }
                    };
                    window.requestAnimationFrame(step);
                }

                function formatDateShort(date) {
                    return date.toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric'
                    });
                }

                // Keyboard shortcuts
                document.addEventListener('keydown', function (e) {
                    // Ctrl/Cmd + N = Add Saving
                    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
                        e.preventDefault();
                        const addSavingModal = new bootstrap.Modal(document.getElementById('addSavingModal'));
                        addSavingModal.show();
                    }

                    // Ctrl/Cmd + F = Focus on search
                    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
                        e.preventDefault();
                        document.getElementById('saving-search').focus();
                    }
                });

                // Auto-save draft functionality for forms
                const formFields = ['saving-amount', 'saving-description'];
                formFields.forEach(fieldId => {
                    const field = document.getElementById(fieldId);
                    if (field) {
                        field.addEventListener('input', function () {
                            localStorage.setItem(`draft_${fieldId}`, this.value);
                        });

                        // Restore draft on page load
                        const draftValue = localStorage.getItem(`draft_${fieldId}`);
                        if (draftValue) {
                            field.value = draftValue;
                        }
                    }
                });

                // Clear drafts when form is submitted successfully
                document.getElementById('save-saving')?.addEventListener('click', function () {
                    formFields.forEach(fieldId => {
                        localStorage.removeItem(`draft_${fieldId}`);
                    });
                });

                // Animate progress bars on scroll
                const progressBars = document.querySelectorAll('.progress-bar-custom');
                const progressObserver = new IntersectionObserver((entries) => {
                    entries.forEach(entry => {
                        // Animate progress bars on scroll
                        const progressBars = document.querySelectorAll('.progress-bar-custom');
                        const progressObserver = new IntersectionObserver((entries) => {
                            entries.forEach(entry => {
                                if (entry.isIntersecting) {
                                    const bar = entry.target;
                                    const width = bar.style.width;
                                    bar.style.width = '0%';
                                    setTimeout(() => {
                                        bar.style.width = width;
                                    }, 100);
                                }
                            });
                        }, { threshold: 0.5 });

                        progressBars.forEach(bar => progressObserver.observe(bar));

                        // Add tooltips
                        const tooltipTriggerList = [].slice.call(document.querySelectorAll('[title]'));
                        tooltipTriggerList.map(function (tooltipTriggerEl) {
                            return new bootstrap.Tooltip(tooltipTriggerEl);
                        });

                        // Intersection Observer for animations
                        const observer = new IntersectionObserver((entries) => {
                            entries.forEach(entry => {
                                if (entry.isIntersecting) {
                                    entry.target.style.opacity = '1';
                                    entry.target.style.transform = 'translateY(0)';
                                }
                            });
                        }, { threshold: 0.1 });

                        // Apply animation observer to cards
                        document.querySelectorAll('.slide-in-up').forEach(element => {
                            element.style.opacity = '0';
                            element.style.transform = 'translateY(20px)';
                            element.style.transition = 'all 0.6s ease-out';
                            observer.observe(element);
                        });

                        // Savings goals functionality
                        function updateSavingsGoals() {
                            const savings = window.savings || [];
                            const totalSaved = savings.reduce((sum, saving) => sum + saving.amount, 0);

                            // Update emergency fund progress (assuming 60% of total for demo)
                            const emergencyProgress = Math.min((totalSaved * 0.6) / 10000 * 100, 100);
                            document.getElementById('emergency-progress').style.width = emergencyProgress + '%';

                            // Update car progress (assuming 25% of total for demo)
                            const carProgress = Math.min((totalSaved * 0.25) / 25000 * 100, 100);
                            document.getElementById('car-progress').style.width = carProgress + '%';

                            // Update vacation progress (assuming 15% of total for demo)
                            const vacationProgress = Math.min((totalSaved * 0.8) / 5000 * 100, 100);
                            document.getElementById('vacation-progress').style.width = vacationProgress + '%';
                        }

                        // Call updateSavingsGoals when savings are loaded
                        const originalLoadSavingsExtended = window.loadSavings;
                        window.loadSavings = function () {
                            if (originalLoadSavingsExtended) {
                                return originalLoadSavingsExtended().then(savings => {
                                    updateSavingsGoals();
                                    return savings;
                                });
                            }
                        };

                        // Enhanced saving goal selection
                        const savingGoalSelect = document.getElementById('saving-goal');
                        const goalTargetInput = document.getElementById('goal-target');

                        if (savingGoalSelect && goalTargetInput) {
                            savingGoalSelect.addEventListener('change', function () {
                                const selectedGoal = this.value;

                                // Set suggested target amounts
                                const suggestedAmounts = {
                                    'emergency': 10000,
                                    'vacation': 5000,
                                    'car': 25000,
                                    'house': 50000,
                                    'retirement': 100000,
                                    'education': 20000
                                };

                                if (suggestedAmounts[selectedGoal]) {
                                    goalTargetInput.value = suggestedAmounts[selectedGoal];
                                    goalTargetInput.placeholder = `Suggested: ${suggestedAmounts[selectedGoal].toLocaleString()}`;
                                } else {
                                    goalTargetInput.value = '';
                                    goalTargetInput.placeholder = 'Enter target amount';
                                }
                            });
                        }

                        // Add savings milestone celebrations
                        function checkMilestones(newAmount) {
                            const milestones = [100, 500, 1000, 5000, 10000, 25000, 50000];
                            const currentTotal = (window.savings || []).reduce((sum, s) => sum + s.amount, 0) + newAmount;

                            milestones.forEach(milestone => {
                                const previousTotal = currentTotal - newAmount;
                                if (previousTotal < milestone && currentTotal >= milestone) {
                                    showMilestoneNotification(milestone);
                                }
                            });
                        }

                        function showMilestoneNotification(amount) {
                            const notification = document.createElement('div');
                            notification.className = 'milestone-notification';
                            notification.style.cssText = `
                                                    position: fixed;
                                                    top: 50%;
                                                    left: 50%;
                                                    transform: translate(-50%, -50%);
                                                    background: linear-gradient(135deg, var(--savings-primary), var(--savings-secondary));
                                                    color: white;
                                                    padding: 30px;
                                                    border-radius: 20px;
                                                    text-align: center;
                                                    z-index: 10000;
                                                    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                                                    animation: milestonePopIn 0.6s ease-out;
                                                `;

                            notification.innerHTML = `
                                                    <div style="font-size: 3rem; margin-bottom: 10px;">🎉</div>
                                                    <h4 style="margin-bottom: 10px;">Milestone Reached!</h4>
                                                    <p style="margin: 0; font-size: 1.2rem;">You've saved ${formatCurrency(amount)}!</p>
                                                `;

                            document.body.appendChild(notification);

                            setTimeout(() => {
                                notification.style.animation = 'milestonePopOut 0.6s ease-in forwards';
                                setTimeout(() => notification.remove(), 600);
                            }, 3000);
                        }

                        // Add CSS for milestone animations
                        const style = document.createElement('style');
                        style.textContent = `
                                                @keyframes milestonePopIn {
                                                    0% { transform: translate(-50%, -50%) scale(0); opacity: 0; }
                                                    100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
                                                }
                                                @keyframes milestonePopOut {
                                                    0% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
                                                    100% { transform: translate(-50%, -50%) scale(0); opacity: 0; }
                                                }
                                            `;
                        document.head.appendChild(style);

                        // Override save saving function to check milestones
                        const originalSaveSaving = document.getElementById('save-saving')?.onclick;
                        document.getElementById('save-saving')?.addEventListener('click', function () {
                            const amount = parseFloat(document.getElementById('saving-amount').value);
                            if (amount > 0) {
                                setTimeout(() => checkMilestones(amount), 1000); // Delay to allow save to complete
                            }
                        });

                        // Savings insights and tips
                        function showSavingsInsights() {
                            const savings = window.savings || [];
                            if (savings.length === 0) return;

                            const total = savings.reduce((sum, s) => sum + s.amount, 0);
                            const average = total / savings.length;
                            const lastMonthSavings = savings.filter(s => {
                                const date = new Date(s.date);
                                const lastMonth = new Date();
                                lastMonth.setMonth(lastMonth.getMonth() - 1);
                                return date >= lastMonth;
                            });

                            const insights = [];

                            if (average > 500) {
                                insights.push("💪 Great job! Your average saving is above $500.");
                            }

                            if (lastMonthSavings.length > 4) {
                                insights.push("🔥 You're on fire! Multiple savings this month.");
                            }

                            if (total > 10000) {
                                insights.push("🏆 Excellent! You've built a solid emergency fund.");
                            }

                            if (insights.length > 0) {
                                const insightElement = document.createElement('div');
                                insightElement.className = 'alert alert-success mt-3';
                                insightElement.innerHTML = `
                                                        <h6><i class="fas fa-lightbulb me-2"></i>Savings Insights</h6>
                                                        ${insights.map(insight => `<p class="mb-1">${insight}</p>`).join('')}
                                                    `;

                                const heroSection = document.querySelector('.page-hero');
                                if (heroSection) {
                                    heroSection.parentNode.insertBefore(insightElement, heroSection.nextSibling);
                                }
                            }
                        }

                        // Show insights after loading savings
                        setTimeout(showSavingsInsights, 2000);

                        // Gamification elements
                        function addGamificationBadges() {
                            const savings = window.savings || [];
                            const total = savings.reduce((sum, s) => sum + s.amount, 0);
                            const badges = [];

                            if (savings.length >= 10) badges.push({ icon: '🏅', title: 'Consistent Saver', desc: '10+ savings entries' });
                            if (total >= 1000) badges.push({ icon: '💎', title: 'Four Figures', desc: 'Saved $1,000+' });
                            if (total >= 10000) badges.push({ icon: '👑', title: 'Savings King', desc: 'Saved $10,000+' });

                            if (badges.length > 0) {
                                const badgeContainer = document.createElement('div');
                                badgeContainer.className = 'badges-container mt-3';
                                badgeContainer.innerHTML = `
                                                        <h6>🏆 Your Achievements</h6>
                                                        <div class="d-flex gap-2 flex-wrap">
                                                            ${badges.map(badge => `
                                                                <div class="badge-item" style="background: var(--savings-primary); color: white; padding: 8px 12px; border-radius: 20px; font-size: 0.8rem;">
                                                                    ${badge.icon} ${badge.title}
                                                                </div>
                                                            `).join('')}
                                                        </div>
                                                    `;

                                const heroStats = document.querySelector('.hero-stats');
                                if (heroStats) {
                                    heroStats.parentNode.appendChild(badgeContainer);
                                }
                            }
                        }

                        // Add badges after loading
                        setTimeout(addGamificationBadges, 2500);
                    });

                    // Enhanced error handling
                    window.addEventListener('error', function (e) {
                        console.error('Savings page error:', e.error);
                        showToast('An unexpected error occurred. Please refresh the page.', 'error');
                    });
            // Enhanced reports-specific functionality
            document.addEventListener('DOMContentLoaded', function () {
                let currentChart = null;
                let currentReportType = 'category';
                let reportData = {};

                // Initialize report type selection
                function initializeReportTypes() {
                    const reportTypeCards = document.querySelectorAll('.report-type-card');
                    reportTypeCards.forEach(card => {
                        card.addEventListener('click', function () {
                            // Remove active class from all cards
                            reportTypeCards.forEach(c => c.classList.remove('active'));
                            // Add active class to clicked card
                            this.classList.add('active');
                            currentReportType = this.getAttribute('data-type');
                            updateReportTitle();
                        });
                    });

                    // Set default selection
                    document.querySelector('[data-type="category"]').classList.add('active');
                }

                // Update report title based on type and period
                function updateReportTitle() {
                    const reportType = currentReportType;
                    const period = document.getElementById('report-period').value;
                    const titles = {
                        'category': '📊 Spending by Category',
                        'time': '📈 Spending Trends Over Time',
                        'budget': '🎯 Budget Performance Analysis'
                    };
                    const periodTexts = {
                        'this-month': 'This Month',
                        'last-month': 'Last Month',
                        'last-3-months': 'Last 3 Months',
                        'this-year': 'This Year',
                        'last-year': 'Last Year',
                        'custom': 'Custom Period'
                    };

                    const title = `${titles[reportType]} - ${periodTexts[period]}`;
                    document.getElementById('report-title').innerHTML = `<i class="fas fa-chart-bar me-2"></i>${title}`;
                }

                // Show/hide custom date range
                document.getElementById('report-period').addEventListener('change', function () {
                    const customDateRange = document.getElementById('report-custom-date-range');
                    if (this.value === 'custom') {
                        customDateRange.classList.remove('d-none');
                    } else {
                        customDateRange.classList.add('d-none');
                    }
                    updateReportTitle();
                });

                // Generate report
                document.getElementById('generate-report').addEventListener('click', generateReport);

                function generateReport() {
                    showLoading();

                    // Simulate API call
                    setTimeout(() => {
                        const data = generateMockData();
                        renderReport(data);
                        generateInsights(data);
                        hideLoading();
                    }, 1500);
                }

                function showLoading() {
                    document.getElementById('chart-loading').classList.remove('d-none');
                    document.getElementById('summary-loading').classList.remove('d-none');
                    document.getElementById('chart-empty-state').classList.add('d-none');
                    if (currentChart) {
                        currentChart.destroy();
                    }
                }

                function hideLoading() {
                    document.getElementById('chart-loading').classList.add('d-none');
                    document.getElementById('summary-loading').classList.add('d-none');
                }

                // Generate mock data for demonstration
                function generateMockData() {
                    const reportType = currentReportType;

                    if (reportType === 'category') {
                        return {
                            labels: ['Food & Dining', 'Transportation', 'Shopping', 'Entertainment', 'Utilities', 'Healthcare'],
                            data: [1250, 680, 450, 320, 280, 180],
                            colors: ['#ff6384', '#36a2eb', '#ffce56', '#4bc0c0', '#9966ff', '#ff9f40'],
                            total: 3160
                        };
                    } else if (reportType === 'time') {
                        return {
                            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                            data: [2800, 3200, 2900, 3400, 3100, 3350],
                            colors: ['#667eea'],
                            total: 18750
                        };
                    } else if (reportType === 'budget') {
                        return {
                            labels: ['Food Budget', 'Transport Budget', 'Entertainment Budget'],
                            budgeted: [1500, 800, 400],
                            actual: [1250, 920, 380],
                            colors: ['#28a745', '#dc3545'],
                            total: 2700
                        };
                    }
                }

                // Render report based on type
                function renderReport(data) {
                    const canvas = document.getElementById('report-chart');
                    const ctx = canvas.getContext('2d');

                    if (currentChart) {
                        currentChart.destroy();
                    }

                    if (currentReportType === 'category') {
                        renderCategoryChart(ctx, data);
                    } else if (currentReportType === 'time') {
                        renderTimeChart(ctx, data);
                    } else if (currentReportType === 'budget') {
                        renderBudgetChart(ctx, data);
                    }

                    updateSummary(data);
                    updateQuickStats(data);
                    updateKeyMetrics(data);
                }

                function renderCategoryChart(ctx, data) {
                    currentChart = new Chart(ctx, {
                        type: 'doughnut',
                        data: {
                            labels: data.labels,
                            datasets: [{
                                data: data.data,
                                backgroundColor: data.colors,
                                borderWidth: 2,
                                borderColor: '#fff'
                            }]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                                legend: {
                                    position: 'bottom',
                                    labels: {
                                        padding: 20,
                                        usePointStyle: true
                                    }
                                },
                                tooltip: {
                                    callbacks: {
                                        label: function (context) {
                                            const percentage = ((context.parsed / data.total) * 100).toFixed(1);
                                            return `${context.label}: ${formatCurrency(context.parsed)} (${percentage}%)`;
                                        }
                                    }
                                }
                            },
                            animation: {
                                animateRotate: true,
                                duration: 1000
                            }
                        }
                    });
                }

                function renderTimeChart(ctx, data) {
                    currentChart = new Chart(ctx, {
                        type: 'line',
                        data: {
                            labels: data.labels,
                            datasets: [{
                                label: 'Monthly Spending',
                                data: data.data,
                                borderColor: '#667eea',
                                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                                borderWidth: 3,
                                fill: true,
                                tension: 0.4,
                                pointBackgroundColor: '#667eea',
                                pointBorderColor: '#fff',
                                pointBorderWidth: 2,
                                pointRadius: 6
                            }]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                                legend: {
                                    display: false
                                },
                                tooltip: {
                                    callbacks: {
                                        label: function (context) {
                                            return `${context.label}: ${formatCurrency(context.parsed.y)}`;
                                        }
                                    }
                                }
                            },
                            scales: {
                                y: {
                                    beginAtZero: true,
                                    ticks: {
                                        callback: function (value) {
                                            return formatCurrency(value);
                                        }
                                    }
                                }
                            },
                            animation: {
                                duration: 2000,
                                easing: 'easeInOutQuart'
                            }
                        }
                    });
                }

                function renderBudgetChart(ctx, data) {
                    currentChart = new Chart(ctx, {
                        type: 'bar',
                        data: {
                            labels: data.labels,
                            datasets: [
                                {
                                    label: 'Budgeted',
                                    data: data.budgeted,
                                    backgroundColor: 'rgba(40, 167, 69, 0.7)',
                                    borderColor: '#28a745',
                                    borderWidth: 2
                                },
                                {
                                    label: 'Actual',
                                    data: data.actual,
                                    backgroundColor: 'rgba(220, 53, 69, 0.7)',
                                    borderColor: '#dc3545',
                                    borderWidth: 2
                                }
                            ]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                                legend: {
                                    position: 'top'
                                },
                                tooltip: {
                                    callbacks: {
                                        label: function (context) {
                                            return `${context.dataset.label}: ${formatCurrency(context.parsed.y)}`;
                                        }
                                    }
                                }
                            },
                            scales: {
                                y: {
                                    beginAtZero: true,
                                    ticks: {
                                        callback: function (value) {
                                            return formatCurrency(value);
                                        }
                                    }
                                }
                            },
                            animation: {
                                duration: 1500,
                                easing: 'easeInOutQuart'
                            }
                        }
                    });
                }

                // Update summary panel
                function updateSummary(data) {
                    const summaryContainer = document.getElementById('report-summary');
                    let summaryHTML = '';

                    if (currentReportType === 'category') {
                        summaryHTML = `
                            <div class="summary-item">
                                <span class="summary-label">
                                    <i class="fas fa-dollar-sign text-success"></i>Total Spending
                                </span>
                                <span class="summary-value text-primary">${formatCurrency(data.total)}</span>
                            </div>
                            <div class="summary-item">
                                <span class="summary-label">
                                    <i class="fas fa-crown text-warning"></i>Top Category
                                </span>
                                <span class="summary-value">${data.labels[0]}</span>
                            </div>
                            <div class="summary-item">
                                <span class="summary-label">
                                    <i class="fas fa-chart-pie text-info"></i>Categories
                                </span>
                                <span class="summary-value">${data.labels.length}</span>
                            </div>
                            <div class="summary-item">
                                <span class="summary-label">
                                    <i class="fas fa-calculator text-secondary"></i>Average per Category
                                </span>
                                <span class="summary-value">${formatCurrency(data.total / data.labels.length)}</span>
                            </div>
                        `;
                    } else if (currentReportType === 'time') {
                        const avgMonthly = data.total / data.labels.length;
                        const trend = data.data[data.data.length - 1] > data.data[0] ? 'increasing' : 'decreasing';
                        summaryHTML = `
                            <div class="summary-item">
                                <span class="summary-label">
                                    <i class="fas fa-dollar-sign text-success"></i>Total Period
                                </span>
                                <span class="summary-value text-primary">${formatCurrency(data.total)}</span>
                            </div>
                            <div class="summary-item">
                                <span class="summary-label">
                                    <i class="fas fa-chart-line text-info"></i>Monthly Average
                                </span>
                                <span class="summary-value">${formatCurrency(avgMonthly)}</span>
                            </div>
                            <div class="summary-item">
                                <span class="summary-label">
                                    <i class="fas fa-trending-up text-warning"></i>Trend
                                </span>
                                <span class="summary-value ${trend === 'increasing' ? 'text-danger' : 'text-success'}">${trend.charAt(0).toUpperCase() + trend.slice(1)}</span>
                            </div>
                            <div class="summary-item">
                                <span class="summary-label">
                                    <i class="fas fa-calendar text-secondary"></i>Period Length
                                </span>
                                <span class="summary-value">${data.labels.length} months</span>
                            </div>
                        `;
                    } else if (currentReportType === 'budget') {
                        const totalBudgeted = data.budgeted.reduce((a, b) => a + b, 0);
                        const totalActual = data.actual.reduce((a, b) => a + b, 0);
                        const variance = totalActual - totalBudgeted;
                        summaryHTML = `
                            <div class="summary-item">
                                <span class="summary-label">
                                    <i class="fas fa-bullseye text-primary"></i>Total Budgeted
                                </span>
                                <span class="summary-value text-primary">${formatCurrency(totalBudgeted)}</span>
                            </div>
                            <div class="summary-item">
                                <span class="summary-label">
                                    <i class="fas fa-shopping-cart text-danger"></i>Total Actual
                                </span>
                                <span class="summary-value text-danger">${formatCurrency(totalActual)}</span>
                            </div>
                            <div class="summary-item">
                                <span class="summary-label">
                                    <i class="fas fa-balance-scale text-warning"></i>Variance
                                </span>
                                <span class="summary-value ${variance > 0 ? 'text-danger' : 'text-success'}">${formatCurrency(Math.abs(variance))} ${variance > 0 ? 'Over' : 'Under'}</span>
                            </div>
                            <div class="summary-item">
                                <span class="summary-label">
                                    <i class="fas fa-percentage text-info"></i>Performance
                                </span>
                                <span class="summary-value">${((totalActual / totalBudgeted) * 100).toFixed(1)}%</span>
                            </div>
                        `;
                    }

                    summaryContainer.innerHTML = summaryHTML;
                }

                // Update quick stats
                function updateQuickStats(data) {
                    if (currentReportType === 'category') {
                        animateValue(document.getElementById('total-period-expenses'), 0, data.total, 1000, true);
                        animateValue(document.getElementById('avg-daily-spending'), 0, data.total / 30, 1200, true);
                        animateValue(document.getElementById('top-category-amount'), 0, data.data[0], 800, true);

                        const trendElement = document.getElementById('trend-percentage');
                        const trendIndicator = document.getElementById('trend-indicator');
                        trendElement.textContent = '0%';
                        trendIndicator.innerHTML = '<i class="fas fa-minus me-1"></i>Stable';
                        trendIndicator.className = 'trend-indicator trend-stable';
                    }
                }

                // Update key metrics
                function updateKeyMetrics(data) {
                    const metricsContainer = document.getElementById('metrics-container');
                    let metricsHTML = '';

                    if (currentReportType === 'category') {
                        const topSpending = Math.max(...data.data);
                        const avgSpending = data.total / data.labels.length;
                        const efficiency = ((avgSpending / topSpending) * 100).toFixed(1);

                        metricsHTML = `
                            <div class="metric-card">
                                <div class="metric-value">${data.labels.length}</div>
                                <div class="metric-label">Active Categories</div>
                            </div>
                            <div class="metric-card">
                                <div class="metric-value">${efficiency}%</div>
                                <div class="metric-label">Spending Balance</div>
                            </div>
                        `;
                    } else if (currentReportType === 'time') {
                        const maxSpending = Math.max(...data.data);
                        const minSpending = Math.min(...data.data);
                        const volatility = (((maxSpending - minSpending) / minSpending) * 100).toFixed(1);

                        metricsHTML = `
                            <div class="metric-card">
                                <div class="metric-value">${formatCurrency(maxSpending)}</div>
                                <div class="metric-label">Peak Month</div>
                            </div>
                            <div class="metric-card">
                                <div class="metric-value">${volatility}%</div>
                                <div class="metric-label">Volatility</div>
                            </div>
                        `;
                    } else if (currentReportType === 'budget') {
                        const onTrack = data.actual.filter((actual, i) => actual <= data.budgeted[i]).length;
                        const accuracy = ((onTrack / data.labels.length) * 100).toFixed(0);

                        metricsHTML = `
                            <div class="metric-card">
                                <div class="metric-value">${onTrack}/${data.labels.length}</div>
                                <div class="metric-label">On Track</div>
                            </div>
                            <div class="metric-card">
                                <div class="metric-value">${accuracy}%</div>
                                <div class="metric-label">Accuracy</div>
                            </div>
                        `;
                    }

                    metricsContainer.innerHTML = metricsHTML;
                }

                // Generate AI insights
                function generateInsights(data) {
                    const insightsContainer = document.getElementById('insights-container');
                    const insightsSection = document.getElementById('insights-section');
                    let insights = [];

                    if (currentReportType === 'category') {
                        insights = [
                            {
                                icon: 'fas fa-exclamation-circle',
                                text: `Your top spending category is "${data.labels[0]}" at ${formatCurrency(data.data[0])}, representing ${((data.data[0] / data.total) * 100).toFixed(1)}% of total expenses.`
                            },
                            {
                                icon: 'fas fa-lightbulb',
                                text: `Consider setting a budget for "${data.labels[0]}" to better control your largest expense category.`
                            },
                            {
                                icon: 'fas fa-chart-pie',
                                text: `Your expenses are distributed across ${data.labels.length} categories with an average of ${formatCurrency(data.total / data.labels.length)} per category.`
                            }
                        ];
                    } else if (currentReportType === 'time') {
                        const trend = data.data[data.data.length - 1] > data.data[0] ? 'increasing' : 'decreasing';
                        insights = [
                            {
                                icon: 'fas fa-trending-up',
                                text: `Your spending trend is ${trend} over the selected period.`
                            },
                            {
                                icon: 'fas fa-calculator',
                                text: `Your average monthly spending is ${formatCurrency(data.total / data.labels.length)}.`
                            },
                            {
                                icon: 'fas fa-target',
                                text: `${trend === 'increasing' ? 'Consider reviewing your recent purchases to identify areas for improvement.' : 'Great job on reducing your spending! Keep up the good work.'}`
                            }
                        ];
                    } else if (currentReportType === 'budget') {
                        const totalBudgeted = data.budgeted.reduce((a, b) => a + b, 0);
                        const totalActual = data.actual.reduce((a, b) => a + b, 0);
                        const overBudget = data.actual.filter((actual, i) => actual > data.budgeted[i]).length;

                        insights = [
                            {
                                icon: 'fas fa-balance-scale',
                                text: `You're ${totalActual > totalBudgeted ? 'over' : 'under'} budget by ${formatCurrency(Math.abs(totalActual - totalBudgeted))}.`
                            },
                            {
                                icon: 'fas fa-chart-bar',
                                text: `${data.labels.length - overBudget} out of ${data.labels.length} budgets are on track.`
                            },
                            {
                                icon: 'fas fa-trophy',
                                text: overBudget === 0 ? 'Excellent! All your budgets are on track.' : `Focus on the ${overBudget} budget${overBudget > 1 ? 's' : ''} that exceeded limits.`
                            }
                        ];
                    }

                    let insightsHTML = '';
                    insights.forEach(insight => {
                        insightsHTML += `
                            <div class="insight-item">
                                <i class="${insight.icon} insight-icon"></i>
                                <div class="insight-text">${insight.text}</div>
                            </div>
                        `;
                    });

                    insightsContainer.innerHTML = insightsHTML;
                    insightsSection.classList.remove('d-none');
                }

                // Export functionality
                window.exportReport = function (format) {
                    showToast(`Exporting report as ${format.toUpperCase()}...`, 'info');

                    if (format === 'png' && currentChart) {
                        const url = currentChart.toBase64Image();
                        const link = document.createElement('a');
                        link.download = `report-${currentReportType}-${Date.now()}.png`;
                        link.href = url;
                        link.click();
                        showToast('Chart exported successfully!', 'success');
                    } else {
                        // Simulate export for other formats
                        setTimeout(() => {
                            showToast(`Report exported as ${format.toUpperCase()} successfully!`, 'success');
                        }, 1000);
                    }
                };

                window.shareReport = function () {
                    if (navigator.share) {
                        navigator.share({
                            title: 'Financial Report',
                            text: 'Check out my financial report from Expense Tracker',
                            url: window.location.href
                        });
                    } else {
                        // Fallback: copy link to clipboard
                        navigator.clipboard.writeText(window.location.href).then(() => {
                            showToast('Report link copied to clipboard!', 'success');
                        });
                    }
                };

                // Fullscreen chart functionality
                document.getElementById('fullscreen-chart').addEventListener('click', function () {
                    if (currentChart) {
                        const modal = new bootstrap.Modal(document.getElementById('fullscreenChartModal'));
                        modal.show();

                        // Clone chart to fullscreen modal
                        modal._element.addEventListener('shown.bs.modal', function () {
                            const fullscreenCanvas = document.getElementById('fullscreen-chart');
                            const fullscreenCtx = fullscreenCanvas.getContext('2d');

                            new Chart(fullscreenCtx, {
                                type: currentChart.config.type,
                                data: currentChart.config.data,
                                options: {
                                    ...currentChart.config.options,
                                    maintainAspectRatio: false
                                }
                            });
                        });
                    }
                });

                // Download chart functionality
                document.getElementById('download-chart').addEventListener('click', function () {
                    if (currentChart) {
                        exportReport('png');
                    }
                });

                // Refresh reports
                document.getElementById('refresh-reports').addEventListener('click', function () {
                    this.innerHTML = '<i class="fas fa-sync-alt fa-spin me-2"></i>Refreshing...';

                    setTimeout(() => {
                        generateReport();
                        this.innerHTML = '<i class="fas fa-sync-alt me-2"></i>Refresh Data';
                        showToast('Reports refreshed successfully!', 'success');
                    }, 1000);
                });

                // Utility functions
                function animateValue(element, start, end, duration, isCurrency = false) {
                    let startTimestamp = null;
                    const step = (timestamp) => {
                        if (!startTimestamp) startTimestamp = timestamp;
                        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
                        const current = progress * (end - start) + start;

                        if (isCurrency) {
                            const symbol = element.querySelector('.currency-symbol');
                            if (symbol) {
                                element.innerHTML = symbol.outerHTML + current.toFixed(2);
                            } else {
                                element.textContent = formatCurrency(current);
                            }
                        } else {
                            element.textContent = Math.floor(current);
                        }

                        if (progress < 1) {
                            window.requestAnimationFrame(step);
                        }
                    };
                    window.requestAnimationFrame(step);
                }

                // Keyboard shortcuts
                document.addEventListener('keydown', function (e) {
                    // Ctrl/Cmd + G = Generate Report
                    if ((e.ctrlKey || e.metaKey) && e.key === 'g') {
                        e.preventDefault();
                        generateReport();
                    }

                    // Ctrl/Cmd + F = Fullscreen chart
                    if ((e.ctrlKey || e.metaKey) && e.key === 'f' && currentChart) {
                        e.preventDefault();
                        document.getElementById('fullscreen-chart').click();
                    }

                    // Ctrl/Cmd + S = Export report
                    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                        e.preventDefault();
                        exportReport('pdf');
                    }
                });

                // Auto-refresh reports every 5 minutes
                setInterval(() => {
                    if (currentChart) {
                        generateReport();
                    }
                }, 300000);

                // Initialize everything
                initializeReportTypes();
                updateReportTitle();

                // Intersection Observer for animations
                const observer = new IntersectionObserver((entries) => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting) {
                            entry.target.style.opacity = '1';
                            entry.target.style.transform = 'translateY(0)';
                        }
                    });
                }, { threshold: 0.1 });

                // Apply animation observer to cards
                document.querySelectorAll('.card').forEach(card => {
                    card.style.opacity = '0';
                    card.style.transform = 'translateY(20px)';
                    card.style.transition = 'all 0.6s ease-out';
                    observer.observe(card);
                });

                // Initialize tooltips
                const tooltipTriggerList = [].slice.call(document.querySelectorAll('[title]'));
                tooltipTriggerList.map(function (tooltipTriggerEl) {
                    return new bootstrap.Tooltip(tooltipTriggerEl);
                });
            });

            // Enhanced error handling
            window.addEventListener('error', function (e) {
                console.error('Reports page error:', e.error);
                showToast('An unexpected error occurred. Please refresh the page.', 'error');
            });

            // Global utilities for reports
            window.formatCurrency = function (amount) {
                return new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD'
                }).format(amount);
            };

            window.showToast = function (message, type = 'info', duration = 3000) {
                // Create toast element
                const toast = document.createElement('div');
                toast.className = `toast align-items-center text-white bg-${type === 'error' ? 'danger' : type} border-0`;
                toast.setAttribute('role', 'alert');
                toast.innerHTML = `
                    <div class="d-flex">
                        <div class="toast-body">${message}</div>
                        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
                    </div>
                `;

                // Add to page
                let toastContainer = document.querySelector('.toast-container');
                if (!toastContainer) {
                    toastContainer = document.createElement('div');
                    toastContainer.className = 'toast-container position-fixed top-0 end-0 p-3';
                    document.body.appendChild(toastContainer);
                }
                toastContainer.appendChild(toast);

                // Show toast
                const bsToast = new bootstrap.Toast(toast, { delay: duration });
                bsToast.show();

                // Remove after hide
                toast.addEventListener('hidden.bs.toast', () => {
                    toast.remove();
                });
            };
