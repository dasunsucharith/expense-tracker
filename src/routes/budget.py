from flask import Blueprint, request, jsonify
from src.csrf_utils import csrf_protect
from src.models.user import db
from src.models.budget import Budget
from src.models.expense import Category, Expense
from src.routes.user import token_required
from datetime import datetime

budget_bp = Blueprint('budget', __name__)

@budget_bp.route('/budgets', methods=['GET'])
@token_required
def get_budgets(current_user):
    # Get query parameters for filtering
    start_date_str = request.args.get('start_date')
    end_date_str = request.args.get('end_date')
    
    # Base query
    query = Budget.query.filter_by(user_id=current_user.id)
    
    # Apply filters if provided
    if start_date_str:
        try:
            start_date_obj = datetime.strptime(start_date_str, '%Y-%m-%d').date()
            query = query.filter(Budget.end_date >= start_date_obj)
        except ValueError:
            return jsonify({'message': 'Invalid start_date format. Use YYYY-MM-DD'}), 400
            
    if end_date_str:
        try:
            end_date_obj = datetime.strptime(end_date_str, '%Y-%m-%d').date()
            query = query.filter(Budget.start_date <= end_date_obj)
        except ValueError:
            return jsonify({'message': 'Invalid end_date format. Use YYYY-MM-DD'}), 400
    
    # Order by start_date descending
    user_budgets = query.order_by(Budget.start_date.desc()).all()

    if not user_budgets:
        return jsonify([]), 200

    # Collect all unique, non-null category_ids from user_budgets
    unique_category_ids = list(set(b.category_id for b in user_budgets if b.category_id))

    categories_map = {}
    if unique_category_ids:
        categories = Category.query.filter(Category.id.in_(unique_category_ids)).all()
        categories_map = {cat.id: cat for cat in categories}

    # Determine the earliest start_date and latest end_date from user_budgets
    min_start_date = min(b.start_date for b in user_budgets)
    max_end_date = max(b.end_date for b in user_budgets)

    # Fetch all relevant Expense objects
    # Ensure that if min_start_date or max_end_date are None (e.g. no budgets), this query doesn't fail.
    # However, we already checked for `not user_budgets`, so min/max will be valid here.
    relevant_expenses = Expense.query.filter(
        Expense.user_id == current_user.id,
        Expense.date >= min_start_date,
        Expense.date <= max_end_date
    ).all()
    
    enhanced_budgets = []
    for budget in user_budgets:
        budget_dict = budget.to_dict()
        
        # Filter relevant_expenses for this specific budget
        current_budget_expenses = []
        for expense in relevant_expenses:
            if expense.date >= budget.start_date and \
               expense.date <= budget.end_date:
                if budget.category_id is not None: # Budget is for a specific category
                    if expense.category_id == budget.category_id:
                        current_budget_expenses.append(expense)
                else: # Budget is for all categories (overall budget)
                    current_budget_expenses.append(expense)
            
        total_spent = sum(expense.amount for expense in current_budget_expenses)
        
        budget_dict['spent'] = total_spent
        budget_dict['remaining'] = budget.amount - total_spent
        budget_dict['percentage_used'] = (total_spent / budget.amount * 100) if budget.amount > 0 else 0
        
        if budget.category_id and budget.category_id in categories_map:
            budget_dict['category'] = categories_map[budget.category_id].to_dict()
        elif budget.category_id: # category_id was set but not found in map (should not happen if DB is consistent)
            budget_dict['category'] = None
        
        enhanced_budgets.append(budget_dict)
    
    return jsonify(enhanced_budgets), 200

@budget_bp.route('/budgets', methods=['POST'])
@token_required
@csrf_protect
def create_budget(current_user):
    data = request.get_json()
    
    if not data or not data.get('amount') or not data.get('name') or not data.get('start_date') or not data.get('end_date'):
        return jsonify({'message': 'Missing required fields'}), 400
    
    # Parse dates
    try:
        start_date = datetime.strptime(data['start_date'], '%Y-%m-%d').date()
        end_date = datetime.strptime(data['end_date'], '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'message': 'Invalid date format. Use YYYY-MM-DD'}), 400
    
    # Validate date range
    if start_date > end_date:
        return jsonify({'message': 'Start date must be before end date'}), 400
    
    # Validate category if provided
    category_id = data.get('category_id')
    if category_id:
        category = Category.query.get(category_id)
        if not category:
            return jsonify({'message': 'Category not found'}), 404
    
    try:
        amount = float(data['amount'])
    except ValueError:
        return jsonify({'message': 'Invalid amount format. Amount must be a number.'}), 400
    if amount <= 0:
        return jsonify({'message': 'Amount must be a positive number.'}), 400

    new_budget = Budget(
        amount=amount,
        name=data['name'],
        start_date=start_date,
        end_date=end_date,
        user_id=current_user.id,
        category_id=category_id
    )
    
    db.session.add(new_budget)
    db.session.commit()
    
    return jsonify(new_budget.to_dict()), 201

@budget_bp.route('/budgets/<int:budget_id>', methods=['PUT'])
@token_required
@csrf_protect
def update_budget(current_user, budget_id):
    budget = Budget.query.get_or_404(budget_id)
    
    # Ensure budget belongs to current user
    if budget.user_id != current_user.id:
        return jsonify({'message': 'Unauthorized access to this budget'}), 403
    
    data = request.get_json()
    
    if data.get('amount'):
        try:
            budget.amount = float(data['amount'])
        except ValueError:
            return jsonify({'message': 'Invalid amount format. Amount must be a number.'}), 400
        if budget.amount <= 0:
            return jsonify({'message': 'Amount must be a positive number.'}), 400
    if data.get('name'):
        budget.name = data['name']
    
    # Update dates if provided
    if data.get('start_date'):
        try:
            budget.start_date = datetime.strptime(data['start_date'], '%Y-%m-%d').date()
        except ValueError:
            return jsonify({'message': 'Invalid start_date format. Use YYYY-MM-DD'}), 400
            
    if data.get('end_date'):
        try:
            budget.end_date = datetime.strptime(data['end_date'], '%Y-%m-%d').date()
        except ValueError:
            return jsonify({'message': 'Invalid end_date format. Use YYYY-MM-DD'}), 400
    
    # Validate date range
    if budget.start_date > budget.end_date:
        return jsonify({'message': 'Start date must be before end date'}), 400
    
    # Update category if provided
    if 'category_id' in data:
        if data['category_id'] is None:
            budget.category_id = None
        else:
            category = Category.query.get(data['category_id'])
            if not category:
                return jsonify({'message': 'Category not found'}), 404
            budget.category_id = data['category_id']
    
    db.session.commit()
    
    return jsonify(budget.to_dict()), 200

@budget_bp.route('/budgets/<int:budget_id>', methods=['DELETE'])
@token_required
@csrf_protect
def delete_budget(current_user, budget_id):
    budget = Budget.query.get_or_404(budget_id)
    
    # Ensure budget belongs to current user
    if budget.user_id != current_user.id:
        return jsonify({'message': 'Unauthorized access to this budget'}), 403
    
    db.session.delete(budget)
    db.session.commit()
    
    return jsonify({'message': 'Budget deleted successfully'}), 200

@budget_bp.route('/dashboard/budget-status', methods=['GET'])
@token_required
def get_budget_status(current_user):
    """Get status of all active budgets"""
    # Get current date
    today = datetime.utcnow().date()
    
    # Find all active budgets (where today falls between start and end date)
    active_budgets = Budget.query.filter_by(user_id=current_user.id)
    active_budgets = active_budgets.filter(Budget.start_date <= today)
    active_budgets = active_budgets.filter(Budget.end_date >= today)
    active_budgets = active_budgets.all()
    
    budget_status = []
    for budget in active_budgets:
        # Calculate actual spending for this budget period
        expense_query = Expense.query.filter_by(user_id=current_user.id)
        expense_query = expense_query.filter(Expense.date >= budget.start_date)
        expense_query = expense_query.filter(Expense.date <= today)  # Only count expenses up to today
        
        # If budget is for specific category, filter by category
        if budget.category_id:
            expense_query = expense_query.filter_by(category_id=budget.category_id)
            
        # Calculate total spending
        total_spent = sum(expense.amount for expense in expense_query.all())
        
        # Calculate days elapsed and total days in budget period
        days_elapsed = (today - budget.start_date).days + 1
        total_days = (budget.end_date - budget.start_date).days + 1
        
        # Calculate ideal spending based on time elapsed
        ideal_spending = (budget.amount / total_days) * days_elapsed
        
        # Add to budget status
        status = {
            'id': budget.id,
            'name': budget.name,
            'amount': budget.amount,
            'spent': total_spent,
            'remaining': budget.amount - total_spent,
            'percentage_used': (total_spent / budget.amount * 100) if budget.amount > 0 else 0,
            'days_elapsed': days_elapsed,
            'total_days': total_days,
            'percentage_time_elapsed': (days_elapsed / total_days * 100) if total_days > 0 else 0,
            'ideal_spending': ideal_spending,
            'spending_difference': ideal_spending - total_spent,
            'start_date': budget.start_date.isoformat(),
            'end_date': budget.end_date.isoformat()
        }
        
        # Add category info if applicable
        if budget.category_id:
            category = Category.query.get(budget.category_id)
            if category:
                status['category'] = category.to_dict()
        
        budget_status.append(status)
    
    return jsonify(budget_status), 200
