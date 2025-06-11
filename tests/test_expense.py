import pytest
import json
from datetime import datetime, date, timedelta

from src.models.user import db, User # Added User for direct creation if needed, db for session
from src.models.expense import Category, Expense
from src.models.budget import Budget

# Fixture for auth headers and user_id
@pytest.fixture
def auth_data(client, app): # Added app fixture for db operations if needed within auth
    timestamp = datetime.utcnow().strftime('%Y%m%d%H%M%S%f')
    username = f'testuser_exp_{timestamp}'
    email = f'test_exp_{timestamp}@example.com'

    with app.app_context(): # Ensure DB operations are within app context
        reg_resp = client.post('/api/user/register', json={
            'username': username, 'email': email, 'password': 'password'
        })
        assert reg_resp.status_code == 201
        # Assuming register returns user object with id, e.g., {'user': {'id': 1, 'username': '...'}}
        # Modify this if the actual response structure is different.
        user_data = reg_resp.get_json().get('user')
        if not user_data or 'id' not in user_data:
            # Fallback: query user by username if not in response directly
            user_obj = User.query.filter_by(username=username).first()
            assert user_obj is not None, "User should have been created and findable"
            user_id = user_obj.id
        else:
            user_id = user_data['id']

        login_resp = client.post('/api/user/login', json={'username': username, 'password': 'password'})
        assert login_resp.status_code == 200
        token = login_resp.get_json()['token']

    return {'headers': {'Authorization': f'Bearer {token}'}, 'user_id': user_id, 'username': username}

# Fixture to create a new category using API
@pytest.fixture
def new_category_fixture(client, auth_data):
    response = client.post('/api/expense/categories', json={'name': 'Test Category API'}, headers=auth_data['headers'])
    assert response.status_code == 201
    return response.get_json()

# Fixture to create a new expense using API
@pytest.fixture
def new_expense_fixture(client, auth_data, new_category_fixture):
    category_id = new_category_fixture['id']
    response = client.post('/api/expense/expenses', json={
        'amount': 50.0,
        'category_id': category_id,
        'description': 'Test Expense API'
    }, headers=auth_data['headers'])
    assert response.status_code == 201
    return response.get_json()

def test_expense_crud(client, auth_data, new_category_fixture):
    headers = auth_data['headers']
    category_id = new_category_fixture['id']

    # Create expense
    resp_create = client.post('/api/expense/expenses', json={
        'amount': 10.5,
        'category_id': category_id,
        'description': 'Lunch'
    }, headers=headers)
    assert resp_create.status_code == 201
    expense_created = resp_create.get_json()
    expense_id = expense_created['id']
    assert expense_created['amount'] == 10.5

    # List expenses (verify creation)
    resp_list = client.get('/api/expense/expenses', headers=headers)
    assert resp_list.status_code == 200
    assert any(e['id'] == expense_id for e in resp_list.get_json())

    # Update expense
    resp_update = client.put(f'/api/expense/expenses/{expense_id}', json={'amount': 12.0}, headers=headers)
    assert resp_update.status_code == 200
    assert resp_update.get_json()['amount'] == 12.0

    # Delete expense
    resp_delete = client.delete(f'/api/expense/expenses/{expense_id}', headers=headers)
    assert resp_delete.status_code == 200
    assert resp_delete.get_json()['message'] == 'Expense deleted successfully'

    # Verify expense is deleted
    resp_list_after_delete = client.get('/api/expense/expenses', headers=headers)
    assert resp_list_after_delete.status_code == 200
    assert not any(e['id'] == expense_id for e in resp_list_after_delete.get_json())


# --- New Tests for Amount Validation ---

def test_create_expense_invalid_amount_format(client, auth_data, new_category_fixture):
    category_id = new_category_fixture['id']
    response = client.post('/api/expense/expenses', json={
        'amount': 'abc', # Invalid format
        'category_id': category_id,
        'description': 'Invalid Amount Expense'
    }, headers=auth_data['headers'])
    assert response.status_code == 400
    assert response.json['message'] == 'Invalid amount format. Amount must be a number.'

def test_create_expense_non_positive_amount(client, auth_data, new_category_fixture):
    category_id = new_category_fixture['id']
    # Test with zero amount
    response_zero = client.post('/api/expense/expenses', json={
        'amount': 0, # Non-positive
        'category_id': category_id,
        'description': 'Zero Amount Expense'
    }, headers=auth_data['headers'])
    assert response_zero.status_code == 400
    assert response_zero.json['message'] == 'Amount must be a positive number.'

    # Test with negative amount
    response_negative = client.post('/api/expense/expenses', json={
        'amount': -10, # Non-positive
        'category_id': category_id,
        'description': 'Negative Amount Expense'
    }, headers=auth_data['headers'])
    assert response_negative.status_code == 400
    assert response_negative.json['message'] == 'Amount must be a positive number.'

def test_update_expense_invalid_amount_format(client, auth_data, new_expense_fixture):
    expense_id = new_expense_fixture['id']
    response = client.put(f'/api/expense/expenses/{expense_id}', json={
        'amount': 'xyz' # Invalid format
    }, headers=auth_data['headers'])
    assert response.status_code == 400
    assert response.json['message'] == 'Invalid amount format. Amount must be a number.'

def test_update_expense_non_positive_amount(client, auth_data, new_expense_fixture):
    expense_id = new_expense_fixture['id']
    # Test with zero amount
    response_zero = client.put(f'/api/expense/expenses/{expense_id}', json={
        'amount': 0 # Non-positive
    }, headers=auth_data['headers'])
    assert response_zero.status_code == 400
    assert response_zero.json['message'] == 'Amount must be a positive number.'

    # Test with negative amount
    response_negative = client.put(f'/api/expense/expenses/{expense_id}', json={
        'amount': -20 # Non-positive
    }, headers=auth_data['headers'])
    assert response_negative.status_code == 400
    assert response_negative.json['message'] == 'Amount must be a positive number.'

# --- New Test for Deleting Category Used by Budget ---

def test_delete_category_used_by_budget(client, app, auth_data): # app fixture for db ops
    headers = auth_data['headers']
    user_id_for_budget = auth_data['user_id']

    # Create category using API, so it's owned by the auth_data user
    cat_resp = client.post('/api/expense/categories', json={'name': 'Category For Budget Deletion Test'}, headers=headers)
    assert cat_resp.status_code == 201
    category_id = cat_resp.json['id']

    # Programmatically create a Budget linked to this category and user
    with app.app_context(): # Ensure DB operations are within app context
        budget = Budget(
            name='Test Budget Linked to API Category',
            amount=100, # This amount is valid
            start_date=date.today(),
            end_date=(date.today() + timedelta(days=7)),
            user_id=user_id_for_budget,
            category_id=category_id
        )
        db.session.add(budget)
        db.session.commit()
        budget_id_for_cleanup = budget.id

        # Attempt to delete the category that is now in use by a budget
        response = client.delete(f'/api/expense/categories/{category_id}', headers=headers)

        assert response.status_code == 400
        assert response.json['message'] == 'Cannot delete category that is in use by expenses or budgets'

        # Cleanup the budget created programmatically
        # The category will be handled by db.drop_all as it was created via API by a test user
        # or if not deleted, it remains. The user is also transient.
        budget_to_delete = db.session.get(Budget, budget_id_for_cleanup)
        if budget_to_delete:
            db.session.delete(budget_to_delete)
            db.session.commit()
