# Expense Tracker

A web dashboard for tracking expenses, budgets, income and savings. The application is built with Flask and uses MySQL via SQLAlchemy. This project assumes Python 3.11+.

## Setup

1. **Create and activate a virtual environment** (optional but recommended):
   ```bash
   python -m venv venv
   source venv/bin/activate
   ```

2. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure environment variables**. Create a `.env` file or export these variables in your shell:
   - `SECRET_KEY` – secret key for Flask sessions and JWT tokens
   - `DEBUG` – set to `True` to enable debug mode
   - `DB_USERNAME` – MySQL username
   - `DB_PASSWORD` – MySQL password
   - `DB_HOST` – MySQL host (e.g. `localhost`)
   - `DB_PORT` – MySQL port (default `3306`)
   - `DB_NAME` – name of the MySQL database

   Example `.env` snippet:
   ```env
   SECRET_KEY=change_me
   DEBUG=True
   DB_USERNAME=username
   DB_PASSWORD=password
   DB_HOST=localhost
   DB_PORT=3306
   DB_NAME=expense_tracker
   ```

4. **Run database migrations**. Set the Flask application and upgrade the database:
   ```bash
   export FLASK_APP=src.main:app
   flask db upgrade
   ```

5. **Start the development server**:
   ```bash
   python src/main.py
   ```
   The application will be available on `http://localhost:5000/` by default.

## Running Tests

The project does not yet include automated tests. Once tests are added, run them with:
```bash
pytest
```

