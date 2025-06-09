import os
import pytest

os.environ['SECRET_KEY'] = 'test'

from src.app_factory import create_app
from src.models.user import db

@pytest.fixture
def app():
    app = create_app("sqlite:///:memory:")
    app.config['TESTING'] = True
    with app.app_context():
        yield app
        db.drop_all()

@pytest.fixture
def client(app):
    return app.test_client()
