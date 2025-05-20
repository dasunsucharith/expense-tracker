from flask import Blueprint, request, jsonify
from src.models.user import db
from src.models.expense import Expense, Category
from src.routes.user import token_required
from datetime import datetime

expense_bp = Blueprint('expense', __name__)

# Category routes
@expense_bp.route('/categories', methods=['GET'])
@token_required
def get_categories(current_user):
    categories = Category.query.all()
    return jsonify([category.to_dict() for category in categories]), 200

@expense_bp.route('/categories', methods=['POST'])
@token_required
def create_category(current_user):
    data = request.get_json()
    
    if not data or not data.get('name'):
        return jsonify({'message': 'Category name is required'}), 400
    
    new_category = Category(
        name=data['name'],
        color=data.get('color', '#3498db'),
        icon=data.get('icon')
    )
    
    db.session.add(new_category)
    db.session.commit()
    
    return jsonify(new_category.to_dict()), 201

@expense_bp.route('/categories/<int:category_id>', methods=['PUT'])
@token_required
def update_category(current_user, category_id):
    category = Category.query.get_or_404(category_id)
    data = request.get_json()
    
    if data.get('name'):
        category.name = data['name']
    if data.get('color'):
        category.color = data['color']
    if data.get('icon'):
        category.icon = data['icon']
    
    db.session.commit()
    
    return jsonify(category.to_dict()), 200

@expense_bp.route('/categories/<int:category_id>', methods=['DELETE'])
@token_required
def delete_category(current_user, category_id):
    category = Category.query.get_or_404(category_id)
    
    # Check if category is in use
    if Expense.query.filter_by(category_id=category_id).first():
        return jsonify({'message': 'Cannot delete category that is in use'}), 400
    
    db.session.delete(category)
    db.session.commit()
    
    return jsonify({'message': 'Category deleted successfully'}), 200

# Expense routes
@expense_bp.route('/expenses', methods=['GET'])
@token_required
def get_expenses(current_user):
    # Get query parameters for filtering
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    category_id = request.args.get('category_id')
    
    # Base query
    query = Expense.query.filter_by(user_id=current_user.id)
    
    # Apply filters if provided
    if start_date:
        query = query.filter(Expense.date >= datetime.strptime(start_date, '%Y-%m-%d').date())
    if end_date:
        query = query.filter(Expense.date <= datetime.strptime(end_date, '%Y-%m-%d').date())
    if category_id:
        query = query.filter_by(category_id=category_id)
    
    # Order by date descending
    expenses = query.order_by(Expense.date.desc()).all()
    
    return jsonify([expense.to_dict() for expense in expenses]), 200

@expense_bp.route('/expenses', methods=['POST'])
@token_required
def create_expense(current_user):
    data = request.get_json()
    
    if not data or not data.get('amount') or not data.get('category_id'):
        return jsonify({'message': 'Amount and category are required'}), 400
    
    # Validate category exists
    category = Category.query.get(data['category_id'])
    if not category:
        return jsonify({'message': 'Category not found'}), 404
    
    # Parse date if provided, otherwise use current date
    expense_date = datetime.utcnow().date()
    if data.get('date'):
        try:
            expense_date = datetime.strptime(data['date'], '%Y-%m-%d').date()
        except ValueError:
            return jsonify({'message': 'Invalid date format. Use YYYY-MM-DD'}), 400
    
    new_expense = Expense(
        amount=float(data['amount']),
        description=data.get('description', ''),
        date=expense_date,
        user_id=current_user.id,
        category_id=data['category_id']
    )
    
    db.session.add(new_expense)
    db.session.commit()
    
    return jsonify(new_expense.to_dict()), 201

@expense_bp.route('/expenses/<int:expense_id>', methods=['PUT'])
@token_required
def update_expense(current_user, expense_id):
    expense = Expense.query.get_or_404(expense_id)
    
    # Ensure expense belongs to current user
    if expense.user_id != current_user.id:
        return jsonify({'message': 'Unauthorized access to this expense'}), 403
    
    data = request.get_json()
    
    if data.get('amount'):
        expense.amount = float(data['amount'])
    if data.get('description') is not None:
        expense.description = data['description']
    if data.get('category_id'):
        # Validate category exists
        category = Category.query.get(data['category_id'])
        if not category:
            return jsonify({'message': 'Category not found'}), 404
        expense.category_id = data['category_id']
    if data.get('date'):
        try:
            expense.date = datetime.strptime(data['date'], '%Y-%m-%d').date()
        except ValueError:
            return jsonify({'message': 'Invalid date format. Use YYYY-MM-DD'}), 400
    
    db.session.commit()
    
    return jsonify(expense.to_dict()), 200

@expense_bp.route('/expenses/<int:expense_id>', methods=['DELETE'])
@token_required
def delete_expense(current_user, expense_id):
    expense = Expense.query.get_or_404(expense_id)
    
    # Ensure expense belongs to current user
    if expense.user_id != current_user.id:
        return jsonify({'message': 'Unauthorized access to this expense'}), 403
    
    db.session.delete(expense)
    db.session.commit()
    
    return jsonify({'message': 'Expense deleted successfully'}), 200

# Dashboard summary data
@expense_bp.route('/dashboard/summary', methods=['GET'])
@token_required
def get_dashboard_summary(current_user):
    # Get query parameters for time range
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    
    # Parse dates if provided
    start_date_obj = None
    end_date_obj = None
    
    if start_date:
        try:
            start_date_obj = datetime.strptime(start_date, '%Y-%m-%d').date()
        except ValueError:
            return jsonify({'message': 'Invalid start_date format. Use YYYY-MM-DD'}), 400
    
    if end_date:
        try:
            end_date_obj = datetime.strptime(end_date, '%Y-%m-%d').date()
        except ValueError:
            return jsonify({'message': 'Invalid end_date format. Use YYYY-MM-DD'}), 400
    
    # Base query for user's expenses
    query = Expense.query.filter_by(user_id=current_user.id)
    
    # Apply date filters if provided
    if start_date_obj:
        query = query.filter(Expense.date >= start_date_obj)
    if end_date_obj:
        query = query.filter(Expense.date <= end_date_obj)
    
    # Get all filtered expenses
    expenses = query.all()
    
    # Calculate total expenses
    total_expenses = sum(expense.amount for expense in expenses)
    
    # Calculate expenses by category
    expenses_by_category = {}
    for expense in expenses:
        category_name = expense.category.name
        if category_name in expenses_by_category:
            expenses_by_category[category_name] += expense.amount
        else:
            expenses_by_category[category_name] = expense.amount
    
    # Format category data for charts
    category_data = [
        {
            'name': category,
            'amount': amount,
            'percentage': (amount / total_expenses * 100) if total_expenses > 0 else 0
        }
        for category, amount in expenses_by_category.items()
    ]
    
    # Sort by amount descending
    category_data.sort(key=lambda x: x['amount'], reverse=True)
    
    return jsonify({
        'total_expenses': total_expenses,
        'expenses_by_category': category_data,
        'expense_count': len(expenses)
    }), 200
