import os
import sys
# DON'T CHANGE THIS !!!
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from flask import Flask, send_from_directory, jsonify
from src.models.user import db
from src.routes.user import user_bp
from src.routes.expense import expense_bp
from src.routes.budget import budget_bp
from flask_cors import CORS

app = Flask(__name__, static_folder=os.path.join(os.path.dirname(__file__), 'static'))
CORS(app)  # Enable CORS for all routes
app.config['SECRET_KEY'] = 'asdf#FGSgvasgf$5$WGT'

# Register blueprints
app.register_blueprint(user_bp, url_prefix='/api/user')
app.register_blueprint(expense_bp, url_prefix='/api/expense')
app.register_blueprint(budget_bp, url_prefix='/api/budget')

# Enable database
app.config['SQLALCHEMY_DATABASE_URI'] = f"mysql+pymysql://{os.getenv('DB_USERNAME', 'root')}:{os.getenv('DB_PASSWORD', '')}@{os.getenv('DB_HOST', 'localhost')}:{os.getenv('DB_PORT', '3306')}/{os.getenv('DB_NAME', 'et_db')}"
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db.init_app(app)

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

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    static_folder_path = app.static_folder
    if static_folder_path is None:
            return "Static folder not configured", 404

    if path != "" and os.path.exists(os.path.join(static_folder_path, path)):
        return send_from_directory(static_folder_path, path)
    else:
        index_path = os.path.join(static_folder_path, 'index.html')
        if os.path.exists(index_path):
            return send_from_directory(static_folder_path, 'index.html')
        else:
            return "index.html not found", 404

@app.errorhandler(404)
def not_found(e):
    return jsonify({"message": "Resource not found"}), 404

@app.errorhandler(500)
def server_error(e):
    return jsonify({"message": "Internal server error"}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
