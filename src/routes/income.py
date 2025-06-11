from flask import Blueprint, request, jsonify
from src.csrf_utils import csrf_protect
from src.models.user import db
from src.models.income import Income
from src.routes.user import token_required
from datetime import datetime

income_bp = Blueprint('income', __name__)

@income_bp.route('/incomes', methods=['GET'])
@token_required
def get_incomes(current_user):
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    income_type = request.args.get('income_type')

    query = Income.query.filter_by(user_id=current_user.id)

    if start_date:
        query = query.filter(Income.date >= datetime.strptime(start_date, '%Y-%m-%d').date())
    if end_date:
        query = query.filter(Income.date <= datetime.strptime(end_date, '%Y-%m-%d').date())
    if income_type:
        query = query.filter_by(income_type=income_type)

    incomes = query.order_by(Income.date.desc()).all()
    return jsonify([income.to_dict() for income in incomes]), 200

@income_bp.route('/incomes', methods=['POST'])
@token_required
@csrf_protect
def create_income(current_user):
    data = request.get_json()

    if not data or not data.get('amount') or not data.get('income_type'):
        return jsonify({'message': 'Amount and income_type are required'}), 400

    income_date = datetime.utcnow().date()
    if data.get('date'):
        try:
            income_date = datetime.strptime(data['date'], '%Y-%m-%d').date()
        except ValueError:
            return jsonify({'message': 'Invalid date format. Use YYYY-MM-DD'}), 400

    try:
        amount = float(data['amount'])
    except ValueError:
        return jsonify({'message': 'Invalid amount format. Amount must be a number.'}), 400
    if amount <= 0:
        return jsonify({'message': 'Amount must be a positive number.'}), 400

    new_income = Income(
        amount=amount,
        description=data.get('description'),
        income_type=data['income_type'],
        other_source=data.get('other_source'),
        date=income_date,
        user_id=current_user.id
    )

    db.session.add(new_income)
    db.session.commit()

    return jsonify(new_income.to_dict()), 201

@income_bp.route('/incomes/<int:income_id>', methods=['PUT'])
@token_required
@csrf_protect
def update_income(current_user, income_id):
    income = Income.query.get_or_404(income_id)

    if income.user_id != current_user.id:
        return jsonify({'message': 'Unauthorized access to this income'}), 403

    data = request.get_json()

    if data.get('amount'):
        try:
            income.amount = float(data['amount'])
        except ValueError:
            return jsonify({'message': 'Invalid amount format. Amount must be a number.'}), 400
        if income.amount <= 0:
            return jsonify({'message': 'Amount must be a positive number.'}), 400
    if data.get('description') is not None:
        income.description = data['description']
    if data.get('income_type'):
        income.income_type = data['income_type']
    if 'other_source' in data:
        income.other_source = data['other_source']
    if data.get('date'):
        try:
            income.date = datetime.strptime(data['date'], '%Y-%m-%d').date()
        except ValueError:
            return jsonify({'message': 'Invalid date format. Use YYYY-MM-DD'}), 400

    db.session.commit()

    return jsonify(income.to_dict()), 200

@income_bp.route('/incomes/<int:income_id>', methods=['DELETE'])
@token_required
@csrf_protect
def delete_income(current_user, income_id):
    income = Income.query.get_or_404(income_id)

    if income.user_id != current_user.id:
        return jsonify({'message': 'Unauthorized access to this income'}), 403

    db.session.delete(income)
    db.session.commit()

    return jsonify({'message': 'Income deleted successfully'}), 200
