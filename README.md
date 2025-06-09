# Expense Tracker


This application is a simple Flask based dashboard for managing expenses, budgets, incomes and savings.

## Running the Application

1. Install the required packages:

   ```bash
   pip install -r requirements.txt
   ```

2. Set the necessary environment variables for database access and the Flask secret key.

   **Note:** The `SECRET_KEY` variable must be defined so `/api/csrf-token` works. Example:

   ```bash
   export SECRET_KEY="your-secret"
   ```

   Without this variable the endpoint returns `500`.

3. Create the database tables using the migrations:


   ```bash
   export FLASK_APP=src.main:app
   flask db upgrade
   ```

   Running `flask db upgrade` will apply all migrations and create the tables if they do not yet exist.

4. Start the server:

   ```bash
   python src/main.py
   ```

## Updating the Database Schema

When you modify models, generate a new migration and apply it:

```bash
export FLASK_APP=src.main:app
flask db migrate -m "describe change"
flask db upgrade
```
