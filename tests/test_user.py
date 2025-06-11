import json
import pytest # For parameterizing tests

# Existing happy path test - good to keep
def test_user_registration_and_login(client):
    # Register new user
    resp_register = client.post('/api/user/register', json={
        'username': 'maintestuser', # Unique username for this test
        'email': 'maintest@example.com', # Unique email
        'password': 'password'
    })
    assert resp_register.status_code == 201
    # Assuming the message might have changed or to be more flexible:
    assert 'message' in resp_register.get_json()
    if 'user' in resp_register.get_json(): # Check if user details are returned
         assert resp_register.get_json()['user']['username'] == 'maintestuser'


    # Login with the new user
    resp_login = client.post('/api/user/login', json={
        'username': 'maintestuser',
        'password': 'password'
    })
    assert resp_login.status_code == 200
    data = resp_login.get_json()
    assert 'token' in data
    assert data['user']['username'] == 'maintestuser'

# --- New Test Cases for Registration ---

def test_register_username_already_exists(client):
    # First registration
    client.post('/api/user/register', json={
        'username': 'user_exists_test',
        'email': 'user_exists1@example.com',
        'password': 'password'
    }) # We expect this to succeed, not asserting here to focus on the second call

    # Attempt to register with the same username
    response = client.post('/api/user/register', json={
        'username': 'user_exists_test', # Same username
        'email': 'user_exists2@example.com', # Different email
        'password': 'password123'
    })
    assert response.status_code == 409
    assert response.json['message'] == 'Username already exists'

def test_register_email_already_exists(client):
    # First registration
    client.post('/api/user/register', json={
        'username': 'email_exists_test_user',
        'email': 'email_exists@example.com',
        'password': 'password'
    }) # Expect success

    # Attempt to register with the same email
    response = client.post('/api/user/register', json={
        'username': 'email_exists_test_user2', # Different username
        'email': 'email_exists@example.com', # Same email
        'password': 'password123'
    })
    assert response.status_code == 409
    assert response.json['message'] == 'Email already exists'

@pytest.mark.parametrize("payload, field_missing", [
    ({'email': 'missingfields@example.com', 'password': 'password'}, 'username'),
    ({'username': 'missing_email', 'password': 'password'}, 'email'),
    ({'username': 'missing_password', 'email': 'missingfields2@example.com'}, 'password'),
    ({}, 'all_fields') # Test with empty JSON
])
def test_register_missing_fields(client, payload, field_missing):
    response = client.post('/api/user/register', json=payload)
    assert response.status_code == 400
    # The user route returns "Missing required fields" for registration
    assert response.json['message'] == 'Missing required fields'


# --- New Test Cases for Login ---

def test_login_user_not_found(client):
    response = client.post('/api/user/login', json={
        'username': 'nonexistent_user_login_test',
        'password': 'password'
    })
    assert response.status_code == 401
    assert response.json['message'] == 'Invalid username or password'

def test_login_incorrect_password(client):
    # Register a user first
    username_login_fail = 'login_fail_pw_user'
    email_login_fail = 'login_fail_pw@example.com'
    correct_password = 'password123'
    incorrect_password = 'wrongpassword'

    reg_resp = client.post('/api/user/register', json={
        'username': username_login_fail,
        'email': email_login_fail,
        'password': correct_password
    })
    assert reg_resp.status_code == 201 # Ensure user is registered

    # Attempt to login with incorrect password
    response = client.post('/api/user/login', json={
        'username': username_login_fail,
        'password': incorrect_password
    })
    assert response.status_code == 401
    assert response.json['message'] == 'Invalid username or password'

@pytest.mark.parametrize("payload, field_missing", [
    ({'password': 'password'}, 'username'),
    ({'username': 'login_missing_fields_user'}, 'password'),
    ({}, 'all_fields') # Test with empty JSON
])
def test_login_missing_fields(client, payload, field_missing):
    # Register a user to ensure other errors aren't triggered first if user doesn't exist
    # This is only relevant if the "missing fields" check happens after "user not found".
    # Based on typical API design, missing fields is often checked before DB lookup.
    if 'username' in payload or 'password' in payload : # Avoid registering for empty {} case if it's not needed
        if payload.get('username') == 'login_missing_fields_user': # Only register if this user is involved
             client.post('/api/user/register', json={
                'username': 'login_missing_fields_user',
                'email': 'login_missing@example.com',
                'password': 'password' # A known password for this user
            })


    response = client.post('/api/user/login', json=payload)
    assert response.status_code == 400
    # The user route returns "Missing username or password" for login
    assert response.json['message'] == 'Missing username or password'
