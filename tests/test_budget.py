import json
from datetime import date, timedelta

from .test_expense import auth_headers


def test_budget_endpoints(client):
    headers = auth_headers(client)

    # ensure category exists for budget (optional but let's create one)
    resp = client.post('/api/expense/categories', json={'name': 'Misc'}, headers=headers)
    category_id = resp.get_json()['id']

    today = date.today()
    start = today.strftime('%Y-%m-%d')
    end = (today + timedelta(days=7)).strftime('%Y-%m-%d')

    # create budget
    resp = client.post('/api/budget/budgets', json={
        'amount': 100.0,
        'name': 'Weekly',
        'start_date': start,
        'end_date': end,
        'category_id': category_id
    }, headers=headers)
    assert resp.status_code == 201
    budget = resp.get_json()
    budget_id = budget['id']

    # list budgets
    resp = client.get('/api/budget/budgets', headers=headers)
    assert resp.status_code == 200
    budgets = resp.get_json()
    assert len(budgets) == 1
    assert budgets[0]['name'] == 'Weekly'

    # update budget
    resp = client.put(f'/api/budget/budgets/{budget_id}', json={'amount': 150.0}, headers=headers)
    assert resp.status_code == 200
    assert resp.get_json()['amount'] == 150.0

    # delete budget
    resp = client.delete(f'/api/budget/budgets/{budget_id}', headers=headers)
    assert resp.status_code == 200
    assert resp.get_json()['message'] == 'Budget deleted successfully'

    # ensure budgets list empty
    resp = client.get('/api/budget/budgets', headers=headers)
    assert resp.status_code == 200
    assert resp.get_json() == []
