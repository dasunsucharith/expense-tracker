// Global variables
let API_URL = "";
let token = localStorage.getItem("token");
let currentUser = null;
let categories = [];
let expenses = [];
let budgets = [];
let charts = {};

// Initialize the application
document.addEventListener("DOMContentLoaded", function () {
	// Set API URL based on current location
	API_URL = window.location.origin;

	// Check if user is logged in
	if (token) {
		fetchUserProfile();
	} else {
		showAuthSection();
	}

	// Set up event listeners
	setupEventListeners();

        // Set default date for expense form
        document.getElementById("expense-date").valueAsDate = new Date();

        // Initialize currency symbols with default or user currency
        updateCurrencySymbols();
});

// Setup all event listeners
function setupEventListeners() {
	// Auth forms
	document.getElementById("login-form").addEventListener("submit", handleLogin);
	document
		.getElementById("register-form")
		.addEventListener("submit", handleRegister);

	// Navigation
	document.querySelectorAll(".nav-link[data-page]").forEach((link) => {
		link.addEventListener("click", function (e) {
			e.preventDefault();
			navigateTo(this.getAttribute("data-page"));
		});
	});

	// Logout
	document
		.getElementById("logout-link")
		.addEventListener("click", handleLogout);

	// Expense form
	document
		.getElementById("save-expense")
		.addEventListener("click", saveExpense);
	document
		.getElementById("update-expense")
		.addEventListener("click", updateExpense);
	document
		.getElementById("delete-expense")
		.addEventListener("click", deleteExpense);

	// Budget form
	document.getElementById("save-budget").addEventListener("click", saveBudget);
	document
		.getElementById("update-budget")
		.addEventListener("click", updateBudget);
	document
		.getElementById("delete-budget")
		.addEventListener("click", deleteBudget);

	// Filters
	document
		.getElementById("expense-date-filter")
		.addEventListener("change", toggleCustomDateRange);
	document
		.getElementById("apply-expense-filters")
		.addEventListener("click", loadExpenses);

	// Reports
	document
		.getElementById("report-period")
		.addEventListener("change", toggleReportCustomDateRange);
	document
		.getElementById("generate-report")
		.addEventListener("click", generateReport);

	// Budget period selection
	document
		.getElementById("budget-period")
		.addEventListener("change", toggleBudgetCustomDates);

	// Profile
	document
		.getElementById("profile-link")
		.addEventListener("click", showUserProfile);
}

// Authentication functions
function handleLogin(e) {
	e.preventDefault();

	const username = document.getElementById("login-username").value;
	const password = document.getElementById("login-password").value;

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
				localStorage.setItem("token", token);
                                currentUser = data.user;
                                updateCurrencySymbols();

				// Show dashboard
				showDashboard();
				loadDashboardData();
			} else {
				// Show error
				const errorElement = document.getElementById("login-error");
				errorElement.textContent =
					data.message || "Login failed. Please check your credentials.";
				errorElement.classList.remove("d-none");
			}
		})
		.catch((error) => {
			console.error("Login error:", error);
			const errorElement = document.getElementById("login-error");
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
				document.getElementById("login-tab").click();
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
	currentUser = null;

	// Show auth section
	showAuthSection();
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
                        showDashboard();
                        loadDashboardData();
                })
		.catch((error) => {
			console.error("Profile fetch error:", error);
			// Token invalid, show auth section
			token = null;
			localStorage.removeItem("token");
			showAuthSection();
		});
}

// UI functions
function showAuthSection() {
	document.getElementById("auth-section").classList.remove("d-none");
	document.getElementById("dashboard-section").classList.add("d-none");
}

function showDashboard() {
	document.getElementById("auth-section").classList.add("d-none");
	document.getElementById("dashboard-section").classList.remove("d-none");

	// Set username in navbar
	document.getElementById("username-display").textContent =
		currentUser.username;

	// Show dashboard page by default
	navigateTo("dashboard");
}

function navigateTo(page) {
	// Hide all pages
	document.querySelectorAll(".dashboard-page").forEach((element) => {
		element.classList.add("d-none");
	});

	// Show selected page
	document.getElementById(`${page}-page`).classList.remove("d-none");

	// Update active nav link
	document.querySelectorAll(".nav-link").forEach((link) => {
		link.classList.remove("active");
	});
	document
		.querySelector(`.nav-link[data-page="${page}"]`)
		.classList.add("active");

	// Load page-specific data
	if (page === "dashboard") {
		loadDashboardData();
	} else if (page === "expenses") {
		loadCategories().then(() => loadExpenses());
	} else if (page === "budgets") {
		loadCategories().then(() => loadBudgets());
	} else if (page === "reports") {
		// Reports page is loaded on demand
	}
}

// Data loading functions
function loadDashboardData() {
	// Load all required data for dashboard
	Promise.all([
		loadCategories(),
		loadDashboardSummary(),
		loadRecentExpenses(),
		loadBudgetStatus(),
	]).then(() => {
		// Initialize charts after data is loaded
		initializeCharts();
	});
}

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
			document.getElementById("total-expenses").textContent = formatCurrency(
				data.total_expenses
			);
			document.getElementById("expense-count").textContent = data.expense_count;
			document.getElementById(
				"expense-period"
			).textContent = `${formatMonthYear(firstDay)}`;

			return data;
		})
		.catch((error) => {
			console.error("Error loading dashboard summary:", error);
			showToast("Failed to load dashboard summary", "error");
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
			tableBody.innerHTML = "";

			if (data.length === 0) {
				const row = document.createElement("tr");
				row.innerHTML =
					'<td colspan="4" class="text-center">No expenses found</td>';
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
			document.getElementById("active-budgets").textContent = data.length;

			// Calculate total budget and remaining
			let totalBudget = 0;
			let totalRemaining = 0;

			data.forEach((budget) => {
				totalBudget += budget.amount;
				totalRemaining += budget.remaining;
			});

			// Update budget remaining card
			document.getElementById("budget-remaining").textContent =
				formatCurrency(totalRemaining);

			// Update budget status container
			const container = document.getElementById("budget-status-container");
			container.innerHTML = "";

			if (data.length === 0) {
				container.innerHTML = '<p class="text-center">No active budgets</p>';
				return;
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
					'<td colspan="5" class="text-center">No expenses found</td>';
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
	const expensesByCategoryCtx = document
		.getElementById("expenses-by-category-chart")
		.getContext("2d");

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
	const budgetVsActualCtx = document
		.getElementById("budget-vs-actual-chart")
		.getContext("2d");

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

// Expense CRUD functions
function saveExpense() {
	const amount = document.getElementById("expense-amount").value;
	const categoryId = document.getElementById("expense-category").value;
	const date = document.getElementById("expense-date").value;
	const description = document.getElementById("expense-description").value;

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
				if (
					document
						.querySelector('.nav-link[data-page="expenses"]')
						.classList.contains("active")
				) {
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
				if (
					document
						.querySelector('.nav-link[data-page="expenses"]')
						.classList.contains("active")
				) {
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
					if (
						document
							.querySelector('.nav-link[data-page="expenses"]')
							.classList.contains("active")
					) {
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
				if (
					document
						.querySelector('.nav-link[data-page="budgets"]')
						.classList.contains("active")
				) {
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
				if (
					document
						.querySelector('.nav-link[data-page="budgets"]')
						.classList.contains("active")
				) {
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
					if (
						document
							.querySelector('.nav-link[data-page="budgets"]')
							.classList.contains("active")
					) {
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
			document.getElementById("profile-username").textContent = data.username;
			document.getElementById("profile-email").textContent = data.email;
			document.getElementById("profile-created").textContent = new Date(
				data.created_at
			).toLocaleString();
			// Show the Bootstrap modal
			const modal = new bootstrap.Modal(
				document.getElementById("profileModal")
			);
			modal.show();
		})
		.catch((error) => {
			showToast("Failed to load profile", "error");
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
