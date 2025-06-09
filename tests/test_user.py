import json

def test_user_registration_and_login(client):
    # Register new user
    response = client.post('/api/user/register', json={
        'username': 'testuser',
        'email': 'test@example.com',
        'password': 'password'
    })
    assert response.status_code == 201
    assert response.get_json()['message'] == 'User registered successfully'

    # Login with the new user
    response = client.post('/api/user/login', json={
        'username': 'testuser',
        'password': 'password'
    })
    assert response.status_code == 200
    data = response.get_json()
    assert 'token' in data
    assert data['user']['username'] == 'testuser'
