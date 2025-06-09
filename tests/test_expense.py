import json


def auth_headers(client):
    # helper to register and login, returning headers with token
    client.post('/api/user/register', json={
        'username': 'expenseuser',
        'email': 'expense@example.com',
        'password': 'password'
    })
    login_resp = client.post('/api/user/login', json={
        'username': 'expenseuser',
        'password': 'password'
    })
    token = login_resp.get_json()['token']
    return {'Authorization': f'Bearer {token}'}


def test_expense_crud(client):
    headers = auth_headers(client)

    # create category
    resp = client.post('/api/expense/categories', json={'name': 'Food'}, headers=headers)
    assert resp.status_code == 201
    category_id = resp.get_json()['id']

    # create expense
    resp = client.post('/api/expense/expenses', json={
        'amount': 10.5,
        'category_id': category_id,
        'description': 'Lunch'
    }, headers=headers)
    assert resp.status_code == 201
    expense = resp.get_json()
    expense_id = expense['id']
    assert expense['amount'] == 10.5

    # list expenses
    resp = client.get('/api/expense/expenses', headers=headers)
    assert resp.status_code == 200
    expenses = resp.get_json()
    assert len(expenses) == 1

    # update expense
    resp = client.put(f'/api/expense/expenses/{expense_id}', json={'amount': 12.0}, headers=headers)
    assert resp.status_code == 200
    assert resp.get_json()['amount'] == 12.0

    # delete expense
    resp = client.delete(f'/api/expense/expenses/{expense_id}', headers=headers)
    assert resp.status_code == 200
    assert resp.get_json()['message'] == 'Expense deleted successfully'

    # ensure expense removed
    resp = client.get('/api/expense/expenses', headers=headers)
    assert resp.status_code == 200
    assert resp.get_json() == []
