import os
from dotenv import load_dotenv

load_dotenv()

import sys
# DON'T CHANGE THIS !!!
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from flask import Flask, send_from_directory, jsonify, render_template
from src.models.user import db
from flask_migrate import Migrate
from src.routes.user import user_bp, login_required
from src.routes.expense import expense_bp
from src.routes.budget import budget_bp
from src.routes.income import income_bp
from src.routes.saving import saving_bp
from flask_cors import CORS

static_dir = os.path.join(os.path.dirname(__file__), 'static')
app = Flask(__name__, static_folder=static_dir, template_folder=static_dir)
app.url_map.strict_slashes = False  # Allow routes with or without trailing slash
CORS(app)  # Enable CORS for all routes
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY')

# Register blueprints
app.register_blueprint(user_bp, url_prefix='/api/user')
app.register_blueprint(expense_bp, url_prefix='/api/expense')
app.register_blueprint(budget_bp, url_prefix='/api/budget')
app.register_blueprint(income_bp, url_prefix='/api/income')
app.register_blueprint(saving_bp, url_prefix='/api/saving')

# Enable database
app.config['SQLALCHEMY_DATABASE_URI'] = (
    f"mysql+pymysql://{os.getenv('DB_USERNAME')}:{os.getenv('DB_PASSWORD')}"
    f"@{os.getenv('DB_HOST')}:{os.getenv('DB_PORT')}/{os.getenv('DB_NAME')}"
)
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db.init_app(app)
migrate = Migrate(app, db)

# Create database tables
with app.app_context():
    db.create_all()
    
    # Check if we need to create default categories
    from src.models.expense import Category
    if Category.query.count() == 0:
        default_categories = [
            {'name': 'Food & Dining', 'color': '#FF5733', 'icon': 'utensils'},
            {'name': 'Transportation', 'color': '#33A8FF', 'icon': 'car'},
            {'name': 'Housing', 'color': '#33FF57', 'icon': 'home'},
            {'name': 'Entertainment', 'color': '#A833FF', 'icon': 'film'},
            {'name': 'Shopping', 'color': '#FF33A8', 'icon': 'shopping-bag'},
            {'name': 'Utilities', 'color': '#33FFA8', 'icon': 'bolt'},
            {'name': 'Healthcare', 'color': '#FF3333', 'icon': 'medkit'},
            {'name': 'Education', 'color': '#3357FF', 'icon': 'graduation-cap'},
            {'name': 'Travel', 'color': '#FFAA33', 'icon': 'plane'},
            {'name': 'Other', 'color': '#808080', 'icon': 'ellipsis-h'}
        ]
        
        for category_data in default_categories:
            category = Category(**category_data)
            db.session.add(category)
        
        db.session.commit()
        print("Default categories created")

@app.route('/')
def home():
    return render_template('home.html')

@app.route('/login')
def login_page():
    return render_template('login.html')

@app.route('/register')
def register_page():
    return render_template('register.html')


@app.route('/dashboard')
@login_required
def dashboard_page():
    return render_template('dashboard.html', active_page='dashboard')


@app.route('/expenses')
@login_required
def expenses_page():
    return render_template('expenses.html', active_page='expenses')


@app.route('/incomes')
@login_required
def incomes_page():
    return render_template('incomes.html', active_page='incomes')


@app.route('/savings')
@login_required
def savings_page():
    return render_template('savings.html', active_page='savings')


@app.route('/budgets')
@login_required
def budgets_page():
    return render_template('budgets.html', active_page='budgets')


@app.route('/reports')
@login_required
def reports_page():
    return render_template('reports.html', active_page='reports')


@app.route('/profile')
@login_required
def profile_page():
    return render_template('profile.html', active_page='profile')


@app.route('/<path:filename>')
def static_files(filename):
    file_path = os.path.join(app.static_folder, filename)
    if os.path.exists(file_path):
        return send_from_directory(app.static_folder, filename)
    else:
        return jsonify({"message": "Resource not found"}), 404

@app.errorhandler(404)
def not_found(e):
    return jsonify({"message": "Resource not found"}), 404

@app.errorhandler(500)
def server_error(e):
    return jsonify({"message": "Internal server error"}), 500

if __name__ == '__main__':
    debug_env = os.getenv('DEBUG', 'False')
    debug_mode = debug_env.lower() in ('1', 'true', 'yes', 'y', 't')
    app.run(host='0.0.0.0', port=5000, debug=debug_mode)
