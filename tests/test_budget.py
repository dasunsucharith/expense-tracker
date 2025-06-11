import pytest
from datetime import date, timedelta, datetime # Added datetime for general use

# Import fixtures from test_expense.py
# Ensure test_expense.py has these fixtures correctly defined and importable.
from .test_expense import auth_data, new_category_fixture

# Fixture to create a new budget using API
@pytest.fixture
def new_budget_fixture(client, auth_data, new_category_fixture):
    headers = auth_data['headers']
    # Ensure new_category_fixture provides a category ID that this user (from auth_data) can use.
    # If categories are user-specific, new_category_fixture should use the same auth_data.
    category_id = new_category_fixture['id']

    today_str = date.today().strftime('%Y-%m-%d')
    end_date_str = (date.today() + timedelta(days=30)).strftime('%Y-%m-%d')

    response = client.post('/api/budget/budgets', json={
        'amount': 200.0,
        'name': 'Monthly Test Budget',
        'start_date': today_str,
        'end_date': end_date_str,
        'category_id': category_id
    }, headers=headers)
    assert response.status_code == 201
    return response.get_json()

def test_budget_crud_operations(client, auth_data, new_category_fixture): # Renamed from test_budget_endpoints_updated
    headers = auth_data['headers']
    category_id = new_category_fixture['id']

    today = date.today()
    start_date_str = today.strftime('%Y-%m-%d')
    end_date_str = (today + timedelta(days=7)).strftime('%Y-%m-%d')

    # Create budget
    resp_create = client.post('/api/budget/budgets', json={
        'amount': 100.0,
        'name': 'Weekly Budget',
        'start_date': start_date_str,
        'end_date': end_date_str,
        'category_id': category_id
    }, headers=headers)
    assert resp_create.status_code == 201
    budget_created = resp_create.get_json()
    budget_id = budget_created['id']
    assert budget_created['name'] == 'Weekly Budget'

    # List budgets (verify creation)
    resp_list = client.get('/api/budget/budgets', headers=headers)
    assert resp_list.status_code == 200
    assert any(b['id'] == budget_id for b in resp_list.get_json())

    # Update budget
    resp_update = client.put(f'/api/budget/budgets/{budget_id}', json={'amount': 150.0}, headers=headers)
    assert resp_update.status_code == 200
    assert resp_update.get_json()['amount'] == 150.0

    # Delete budget
    resp_delete = client.delete(f'/api/budget/budgets/{budget_id}', headers=headers)
    assert resp_delete.status_code == 200
    assert resp_delete.get_json()['message'] == 'Budget deleted successfully'

    # Verify budget is deleted (e.g., trying to get it by ID returns 404)
    # This assumes your API has a GET /api/budget/budgets/<id> endpoint.
    # If not, check if it's absent in the list from GET /api/budget/budgets.
    # For now, let's assume a direct GET for a single budget would 404.
    # If your API doesn't have a "get budget by ID", this check needs to be different.
    # A common pattern is that listing all budgets again wouldn't include the deleted one.
    resp_list_after_delete = client.get('/api/budget/budgets', headers=headers)
    assert resp_list_after_delete.status_code == 200
    assert not any(b['id'] == budget_id for b in resp_list_after_delete.get_json())


# --- New Tests for Amount Validation ---

def test_create_budget_invalid_amount_format(client, auth_data, new_category_fixture):
    headers = auth_data['headers']
    category_id = new_category_fixture['id']
    today_str = date.today().strftime('%Y-%m-%d')
    end_date_str = (date.today() + timedelta(days=30)).strftime('%Y-%m-%d')

    response = client.post('/api/budget/budgets', json={
        'amount': 'xyz', # Invalid format
        'name': 'Invalid Amount Format Budget',
        'start_date': today_str,
        'end_date': end_date_str,
        'category_id': category_id
    }, headers=headers)
    assert response.status_code == 400
    assert response.json['message'] == 'Invalid amount format. Amount must be a number.'

def test_create_budget_non_positive_amount(client, auth_data, new_category_fixture):
    headers = auth_data['headers']
    category_id = new_category_fixture['id']
    today_str = date.today().strftime('%Y-%m-%d')
    end_date_str = (date.today() + timedelta(days=30)).strftime('%Y-%m-%d')

    # Test with zero amount
    response_zero = client.post('/api/budget/budgets', json={
        'amount': 0, # Non-positive
        'name': 'Zero Amount Budget',
        'start_date': today_str,
        'end_date': end_date_str,
        'category_id': category_id
    }, headers=headers)
    assert response_zero.status_code == 400
    assert response_zero.json['message'] == 'Amount must be a positive number.'

    # Test with negative amount
    response_negative = client.post('/api/budget/budgets', json={
        'amount': -50, # Non-positive
        'name': 'Negative Amount Budget',
        'start_date': today_str,
        'end_date': end_date_str,
        'category_id': category_id
    }, headers=headers)
    assert response_negative.status_code == 400
    assert response_negative.json['message'] == 'Amount must be a positive number.'

def test_update_budget_invalid_amount_format(client, auth_data, new_budget_fixture):
    headers = auth_data['headers']
    budget_id = new_budget_fixture['id']

    response = client.put(f'/api/budget/budgets/{budget_id}', json={
        'amount': 'xyz' # Invalid format
    }, headers=headers)
    assert response.status_code == 400
    assert response.json['message'] == 'Invalid amount format. Amount must be a number.'

def test_update_budget_non_positive_amount(client, auth_data, new_budget_fixture):
    headers = auth_data['headers']
    budget_id = new_budget_fixture['id']

    # Test with zero amount
    response_zero = client.put(f'/api/budget/budgets/{budget_id}', json={
        'amount': 0 # Non-positive
    }, headers=headers)
    assert response_zero.status_code == 400
    assert response_zero.json['message'] == 'Amount must be a positive number.'

    # Test with negative amount
    response_negative = client.put(f'/api/budget/budgets/{budget_id}', json={
        'amount': -50 # Non-positive
    }, headers=headers)
    assert response_negative.status_code == 400
    assert response_negative.json['message'] == 'Amount must be a positive number.'
