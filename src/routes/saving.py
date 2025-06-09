from flask import Blueprint, request, jsonify
from src.csrf_utils import csrf_protect
from src.models.user import db
from src.models.saving import Saving
from src.routes.user import token_required
from datetime import datetime

saving_bp = Blueprint('saving', __name__)

@saving_bp.route('/savings', methods=['GET'])
@token_required
def get_savings(current_user):
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')

    query = Saving.query.filter_by(user_id=current_user.id)

    if start_date:
        query = query.filter(Saving.date >= datetime.strptime(start_date, '%Y-%m-%d').date())
    if end_date:
        query = query.filter(Saving.date <= datetime.strptime(end_date, '%Y-%m-%d').date())

    savings = query.order_by(Saving.date.desc()).all()
    return jsonify([s.to_dict() for s in savings]), 200

@saving_bp.route('/savings', methods=['POST'])
@token_required
@csrf_protect
def create_saving(current_user):
    data = request.get_json()

    if not data or not data.get('amount'):
        return jsonify({'message': 'Amount is required'}), 400

    saving_date = datetime.utcnow().date()
    if data.get('date'):
        try:
            saving_date = datetime.strptime(data['date'], '%Y-%m-%d').date()
        except ValueError:
            return jsonify({'message': 'Invalid date format. Use YYYY-MM-DD'}), 400

    new_saving = Saving(
        amount=float(data['amount']),
        description=data.get('description'),
        date=saving_date,
        user_id=current_user.id
    )

    db.session.add(new_saving)
    db.session.commit()

    return jsonify(new_saving.to_dict()), 201

@saving_bp.route('/savings/<int:saving_id>', methods=['PUT'])
@token_required
@csrf_protect
def update_saving(current_user, saving_id):
    saving = Saving.query.get_or_404(saving_id)

    if saving.user_id != current_user.id:
        return jsonify({'message': 'Unauthorized access to this saving'}), 403

    data = request.get_json()

    if data.get('amount'):
        saving.amount = float(data['amount'])
    if data.get('description') is not None:
        saving.description = data['description']
    if data.get('date'):
        try:
            saving.date = datetime.strptime(data['date'], '%Y-%m-%d').date()
        except ValueError:
            return jsonify({'message': 'Invalid date format. Use YYYY-MM-DD'}), 400

    db.session.commit()

    return jsonify(saving.to_dict()), 200

@saving_bp.route('/savings/<int:saving_id>', methods=['DELETE'])
@token_required
@csrf_protect
def delete_saving(current_user, saving_id):
    saving = Saving.query.get_or_404(saving_id)

    if saving.user_id != current_user.id:
        return jsonify({'message': 'Unauthorized access to this saving'}), 403

    db.session.delete(saving)
    db.session.commit()

    return jsonify({'message': 'Saving deleted successfully'}), 200

@saving_bp.route('/dashboard/summary', methods=['GET'])
@token_required
def get_saving_summary(current_user):
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')

    query = Saving.query.filter_by(user_id=current_user.id)

    if start_date:
        query = query.filter(Saving.date >= datetime.strptime(start_date, '%Y-%m-%d').date())
    if end_date:
        query = query.filter(Saving.date <= datetime.strptime(end_date, '%Y-%m-%d').date())

    savings = query.all()
    total_savings = sum(s.amount for s in savings)

    return jsonify({
        'total_savings': total_savings,
        'saving_count': len(savings)
    }), 200
