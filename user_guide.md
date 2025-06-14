# Expense Calculator Web Dashboard - User Guide

## Overview

The Expense Calculator Web Dashboard is a comprehensive financial management tool that helps you track expenses, manage budgets, and visualize your spending patterns. This guide will walk you through all the features and functionality of the dashboard.

## Installation
1. Create and activate a virtual environment for Python 3.10+.

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Set the environment variables described below and run the app:
   ```bash
   python src/main.py

   ```


## Accessing the Dashboard

Navigate to the application root URL. You will land on `/` which provides links to
`/login` and `/register`. After logging in you can access the dashboard at
`/dashboard` as well as `/expenses`, `/budgets`, `/reports` and `/profile`.

## Features

### User Authentication
- **Registration**: Create a new account with username, email, and password
- **Login**: Access your personal dashboard with your credentials
- **Profile Management**: Update your profile information

### Dashboard Overview
The main dashboard provides a quick snapshot of your financial status:
- Total expenses for the current month
- Budget remaining
- Number of expenses
- Active budgets
- Expense breakdown by category (pie chart)
- Budget vs. actual spending comparison (bar chart)
- Recent expenses list
- Budget status with progress bars

### Expense Management
- **Add Expenses**: Record new expenses with amount, category, payment method, date, and description
- **Edit Expenses**: Modify existing expense details
- **Delete Expenses**: Remove unwanted expense entries
- **Filter Expenses**: View expenses by date range, category, or payment method
- **Expense History**: Browse through all your past expenses

### Income Management
- **Add Incomes**: Record new income sources with amount, type, date, and description
- **Edit Incomes**: Modify existing income entries
- **Delete Incomes**: Remove income records you no longer need
- **Filter Incomes**: View incomes by date range or type

### Savings Management
- **Add Savings**: Record money you have saved with amount, date, and description
- **Edit Savings**: Modify existing saving entries
- **Delete Savings**: Remove savings records you no longer need
- **Filter Savings**: View savings by date range

### Budget Management
- **Create Budgets**: Set up budgets with name, amount, category (optional), and time period
- **Edit Budgets**: Modify budget details
- **Delete Budgets**: Remove unwanted budgets
- **Budget Tracking**: Monitor your spending against budgets
- **Budget Status**: View progress bars showing budget utilization

### Reports and Analytics
- **Spending by Category**: Visualize how your money is distributed across different categories
- **Spending Over Time**: Track your spending patterns over days, weeks, or months
- **Budget Performance**: Compare your actual spending against your budgets
- **Custom Date Ranges**: Generate reports for specific time periods

## How to Use

### Getting Started
1. Open `/` and choose **Login** or **Register**
2. After logging in you will arrive at `/dashboard`
3. Use the navigation bar to visit the expenses, budgets, reports or profile pages

### Adding an Income
1. Click the "Incomes" tab in the navigation menu
2. Click the "Add Income" button
3. Fill in the income details (amount, type, date, description)
4. Provide an additional source when choosing "Other"
5. Click "Save Income"

### Adding an Expense
1. Click the "Expenses" tab in the navigation menu
2. Click the "Add Expense" button
3. Fill in the expense details (amount, category, date, description)
4. Click "Save Expense"

### Creating a Budget
1. Click the "Budgets" tab in the navigation menu
2. Click the "Add Budget" button
3. Fill in the budget details (name, amount, category, period)
4. Click "Save Budget"

### Generating Reports
1. Click the "Reports" tab in the navigation menu
2. Select the report type (Spending by Category, Spending Over Time, Budget Performance)
3. Choose the time period
4. Click "Generate Report"

## Tips for Effective Use

1. **Categorize Consistently**: Use consistent categories for your expenses to get more accurate reports
2. **Regular Updates**: Add expenses as they occur for the most accurate tracking
3. **Monthly Review**: Review your spending patterns at the end of each month
4. **Budget Adjustments**: Adjust your budgets based on your actual spending patterns
5. **Use Reports**: Generate reports to identify areas where you can reduce spending

## Technical Information

The Expense Calculator Web Dashboard is built using:
- **Backend**: Flask (Python) with MySQL database
- **Database ORM**: Flask-SQLAlchemy with migrations managed by Flask-Migrate
- **Frontend**: HTML, CSS, JavaScript with Bootstrap framework
- **Data Visualization**: Chart.js for interactive charts

### Database Migrations
After modifying a model, generate and apply a migration without dropping data:
1. Set the application module:
   ```bash
   export FLASK_APP=src.main:app
   ```
2. Create a migration script:
   ```bash
   flask db migrate -m "describe change"
   ```
3. Apply the migration to your database:
   ```bash
   flask db upgrade
   ```

### Environment Variables

Set the following variables before running the application:

- `SECRET_KEY` – secret key used for Flask sessions and JWT tokens.
- `DEBUG` – set to `True` to enable debug mode (defaults to `False`).

## Support

If you encounter any issues or have questions about using the dashboard, please contact support.

---

Thank you for using the Expense Calculator Web Dashboard!
