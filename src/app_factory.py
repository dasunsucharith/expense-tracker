from flask import Flask
from flask_cors import CORS
from flask_migrate import Migrate
from src.models.user import db
from src.routes.user import user_bp
from src.routes.expense import expense_bp
from src.routes.budget import budget_bp
from src.routes.income import income_bp
from src.routes.saving import saving_bp


def create_app(database_uri="sqlite:///:memory:"):
    app = Flask(__name__)
    CORS(app)
    app.config.update(
        SECRET_KEY="test",
        SQLALCHEMY_DATABASE_URI=database_uri,
        SQLALCHEMY_TRACK_MODIFICATIONS=False,
    )
    db.init_app(app)
    Migrate(app, db)
    app.register_blueprint(user_bp, url_prefix="/api/user")
    app.register_blueprint(expense_bp, url_prefix="/api/expense")
    app.register_blueprint(budget_bp, url_prefix="/api/budget")
    app.register_blueprint(income_bp, url_prefix="/api/income")
    app.register_blueprint(saving_bp, url_prefix="/api/saving")
    with app.app_context():
        db.create_all()
    return app
