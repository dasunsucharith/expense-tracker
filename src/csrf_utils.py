from functools import wraps
from flask import request, abort, current_app
from flask_wtf.csrf import validate_csrf

def verify_csrf_token():
    if current_app.config.get('TESTING'):
        return
    token = (
        request.headers.get('X-CSRFToken')
        or request.headers.get('X-CSRF-Token')
        or (request.form.get('csrf_token') if request.form else None)
    )
    if token is None and request.is_json:
        json_data = request.get_json(silent=True) or {}
        token = json_data.get('csrf_token')
    if not token:
        abort(400, description='Missing CSRF token')
    try:
        validate_csrf(token)
    except Exception:
        abort(400, description='Invalid CSRF token')


def csrf_protect(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        verify_csrf_token()
        return f(*args, **kwargs)

    return decorated_function
