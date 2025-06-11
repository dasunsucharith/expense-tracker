import pytest
from datetime import date, timedelta, datetime

# Import fixtures from test_expense.py
from .test_expense import auth_data

# Import models (User might not be directly needed in tests if auth_data handles user creation well)
# from src.models.user import User, db
from src.models.saving import Saving # To verify instance types if necessary

# Fixture to create a new saving item using API
@pytest.fixture
def new_saving_fixture(client, auth_data):
    headers = auth_data['headers']

    saving_date_str = date.today().strftime('%Y-%m-%d')

    response = client.post('/api/saving/savings', json={
        'amount': 100.0,  # Valid amount
        'description': 'Rainy day fund',
        'date': saving_date_str
    }, headers=headers)
    assert response.status_code == 201
    return response.get_json()

def test_saving_crud_operations(client, auth_data): # new_saving_fixture can be used
    headers = auth_data['headers']
    user_id = auth_data['user_id']

    saving_date_str = date.today().strftime('%Y-%m-%d')

    # Create saving
    resp_create = client.post('/api/saving/savings', json={
        'amount': 150.0,
        'description': 'Vacation fund',
        'date': saving_date_str
    }, headers=headers)
    assert resp_create.status_code == 201
    saving_created = resp_create.get_json()
    saving_id = saving_created['id']
    assert saving_created['amount'] == 150.0
    assert saving_created['description'] == 'Vacation fund'
    # if 'user_id' in saving_created:
    #     assert saving_created['user_id'] == user_id


    # List savings (verify creation)
    resp_list = client.get('/api/saving/savings', headers=headers)
    assert resp_list.status_code == 200
    assert any(s['id'] == saving_id for s in resp_list.get_json())

    # Update saving
    resp_update = client.put(f'/api/saving/savings/{saving_id}', json={
        'amount': 175.0,
        'description': 'Vacation fund (Updated)'
    }, headers=headers)
    assert resp_update.status_code == 200
    updated_saving = resp_update.get_json()
    assert updated_saving['amount'] == 175.0
    assert updated_saving['description'] == 'Vacation fund (Updated)'

    # Delete saving
    resp_delete = client.delete(f'/api/saving/savings/{saving_id}', headers=headers)
    assert resp_delete.status_code == 200
    assert resp_delete.get_json()['message'] == 'Saving deleted successfully'

    # Verify saving is deleted
    resp_list_after_delete = client.get('/api/saving/savings', headers=headers)
    assert resp_list_after_delete.status_code == 200
    assert not any(s['id'] == saving_id for s in resp_list_after_delete.get_json())

# --- Tests for Amount Validation ---

def test_create_saving_invalid_amount_format(client, auth_data):
    headers = auth_data['headers']
    saving_date_str = date.today().strftime('%Y-%m-%d')

    response = client.post('/api/saving/savings', json={
        'amount': 'bad_amount', # Invalid format
        'description': 'Invalid amount saving',
        'date': saving_date_str
    }, headers=headers)
    assert response.status_code == 400
    assert response.json['message'] == 'Invalid amount format. Amount must be a number.'

def test_create_saving_non_positive_amount(client, auth_data):
    headers = auth_data['headers']
    saving_date_str = date.today().strftime('%Y-%m-%d')

    # Test with zero amount
    response_zero = client.post('/api/saving/savings', json={
        'amount': 0, # Non-positive
        'description': 'Zero amount saving',
        'date': saving_date_str
    }, headers=headers)
    assert response_zero.status_code == 400
    assert response_zero.json['message'] == 'Amount must be a positive number.'

    # Test with negative amount
    response_negative = client.post('/api/saving/savings', json={
        'amount': -200, # Non-positive
        'description': 'Negative amount saving',
        'date': saving_date_str
    }, headers=headers)
    assert response_negative.status_code == 400
    assert response_negative.json['message'] == 'Amount must be a positive number.'

def test_update_saving_invalid_amount_format(client, auth_data, new_saving_fixture):
    headers = auth_data['headers']
    saving_id = new_saving_fixture['id']

    response = client.put(f'/api/saving/savings/{saving_id}', json={
        'amount': 'still_bad' # Invalid format
    }, headers=headers)
    assert response.status_code == 400
    assert response.json['message'] == 'Invalid amount format. Amount must be a number.'

def test_update_saving_non_positive_amount(client, auth_data, new_saving_fixture):
    headers = auth_data['headers']
    saving_id = new_saving_fixture['id']

    # Test with zero amount
    response_zero = client.put(f'/api/saving/savings/{saving_id}', json={
        'amount': 0 # Non-positive
    }, headers=headers)
    assert response_zero.status_code == 400
    assert response_zero.json['message'] == 'Amount must be a positive number.'

    # Test with negative amount
    response_negative = client.put(f'/api/saving/savings/{saving_id}', json={
        'amount': -250 # Non-positive
    }, headers=headers)
    assert response_negative.status_code == 400
    assert response_negative.json['message'] == 'Amount must be a positive number.'
