import pytest
from datetime import date, timedelta, datetime

# Import fixtures from test_expense.py
from .test_expense import auth_data

# Import models (User might not be directly needed in tests if auth_data handles user creation well)
# from src.models.user import User, db # db might be needed if direct db interaction is required
from src.models.income import Income # To verify instance types if necessary, not for direct creation in these tests

# Fixture to create a new income item using API
@pytest.fixture
def new_income_fixture(client, auth_data):
    headers = auth_data['headers']

    # Income typically requires amount, description, income_type, date
    income_date_str = date.today().strftime('%Y-%m-%d')

    response = client.post('/api/income/incomes', json={
        'amount': 300.0,  # Valid amount
        'description': 'Salary',
        'income_type': 'Salary', # Example income type
        'date': income_date_str
    }, headers=headers)
    assert response.status_code == 201
    return response.get_json()

def test_income_crud_operations(client, auth_data): # new_income_fixture can be used if preferred for update/delete
    headers = auth_data['headers']
    user_id = auth_data['user_id'] # Useful for verifying ownership if API returns user_id

    income_date_str = date.today().strftime('%Y-%m-%d')

    # Create income
    resp_create = client.post('/api/income/incomes', json={
        'amount': 500.0,
        'description': 'Freelance Gig',
        'income_type': 'Freelance',
        'date': income_date_str
    }, headers=headers)
    assert resp_create.status_code == 201
    income_created = resp_create.get_json()
    income_id = income_created['id']
    assert income_created['amount'] == 500.0
    assert income_created['income_type'] == 'Freelance'
    # if 'user_id' in income_created: # If API returns user_id in response
    #     assert income_created['user_id'] == user_id

    # List incomes (verify creation)
    resp_list = client.get('/api/income/incomes', headers=headers)
    assert resp_list.status_code == 200
    assert any(i['id'] == income_id for i in resp_list.get_json())

    # Update income
    resp_update = client.put(f'/api/income/incomes/{income_id}', json={
        'amount': 550.0,
        'description': 'Freelance Gig (Updated)'
    }, headers=headers)
    assert resp_update.status_code == 200
    updated_income = resp_update.get_json()
    assert updated_income['amount'] == 550.0
    assert updated_income['description'] == 'Freelance Gig (Updated)'

    # Delete income
    resp_delete = client.delete(f'/api/income/incomes/{income_id}', headers=headers)
    assert resp_delete.status_code == 200
    assert resp_delete.get_json()['message'] == 'Income deleted successfully'

    # Verify income is deleted
    resp_list_after_delete = client.get('/api/income/incomes', headers=headers)
    assert resp_list_after_delete.status_code == 200
    assert not any(i['id'] == income_id for i in resp_list_after_delete.get_json())

# --- Tests for Amount Validation ---

def test_create_income_invalid_amount_format(client, auth_data):
    headers = auth_data['headers']
    income_date_str = date.today().strftime('%Y-%m-%d')

    response = client.post('/api/income/incomes', json={
        'amount': 'abc', # Invalid format
        'description': 'Invalid amount income',
        'income_type': 'Bonus',
        'date': income_date_str
    }, headers=headers)
    assert response.status_code == 400
    assert response.json['message'] == 'Invalid amount format. Amount must be a number.'

def test_create_income_non_positive_amount(client, auth_data):
    headers = auth_data['headers']
    income_date_str = date.today().strftime('%Y-%m-%d')

    # Test with zero amount
    response_zero = client.post('/api/income/incomes', json={
        'amount': 0, # Non-positive
        'description': 'Zero amount income',
        'income_type': 'Gift',
        'date': income_date_str
    }, headers=headers)
    assert response_zero.status_code == 400
    assert response_zero.json['message'] == 'Amount must be a positive number.'

    # Test with negative amount
    response_negative = client.post('/api/income/incomes', json={
        'amount': -100, # Non-positive
        'description': 'Negative amount income',
        'income_type': 'Other',
        'date': income_date_str
    }, headers=headers)
    assert response_negative.status_code == 400
    assert response_negative.json['message'] == 'Amount must be a positive number.'

def test_update_income_invalid_amount_format(client, auth_data, new_income_fixture):
    headers = auth_data['headers']
    income_id = new_income_fixture['id']

    response = client.put(f'/api/income/incomes/{income_id}', json={
        'amount': 'xyz' # Invalid format
    }, headers=headers)
    assert response.status_code == 400
    assert response.json['message'] == 'Invalid amount format. Amount must be a number.'

def test_update_income_non_positive_amount(client, auth_data, new_income_fixture):
    headers = auth_data['headers']
    income_id = new_income_fixture['id']

    # Test with zero amount
    response_zero = client.put(f'/api/income/incomes/{income_id}', json={
        'amount': 0 # Non-positive
    }, headers=headers)
    assert response_zero.status_code == 400
    assert response_zero.json['message'] == 'Amount must be a positive number.'

    # Test with negative amount
    response_negative = client.put(f'/api/income/incomes/{income_id}', json={
        'amount': -150 # Non-positive
    }, headers=headers)
    assert response_negative.status_code == 400
    assert response_negative.json['message'] == 'Amount must be a positive number.'
