from flask import request, jsonify
from app import app
from database import db
from models.sample_model import User
from models import Dashboard, HelpDesk

@app.route('/api/login', methods=['POST'])
def login():
    """login user authentication"""
    data = request.get_json()
    username = data.get('username')
    email = data.get('email')
    user = User.query.filter_by(username=username, email=email).first()
    
    if user.username==username:
        return jsonify(user.to_dict())
    return jsonify(None)


# dashboard crud
@app.route('/api/dashboard', methods=['POST'])
def create_dashboard():
    try:
        data = request.get_json()
       
        # Create new user
        new_dashboard = Dashboard(
            title= data['title'],
            type= data['type'],
            query=data['query'],
            columns=data['columns'],
            user_id=data['user_id']
        )
        
        db.session.add(new_dashboard)
        db.session.commit()
        
        return jsonify({
            'message': 'Dashboard created successfully',
            'dashboard': new_dashboard.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# READ - Get all users
@app.route('/api/dashboards/<user_id>', methods=['GET'])
def get_dashboards(user_id):
    print('user-id:',user_id)
    try:
        dashboards = db.session.query(Dashboard).filter_by(user_id=user_id).order_by(Dashboard.created_at.desc()).all()
        dashboards = [das.to_dict() for das in dashboards]

        return jsonify({'data':dashboards}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# READ - Get a single user by ID
@app.route('/api/dashboard/<int:dashboard_id>', methods=['GET'])
def get_dashboard(dashboard_id):
    try:
        dashboard = Dashboard.query.get(dashboard_id)
        if not dashboard:
            return jsonify({'error': 'User not found'}), 404
        
        return jsonify({'dashboard':dashboard.to_dict()}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# UPDATE - Update a user
@app.route('/api/dashboard/<int:dashboard_id>', methods=['PUT'])
def update_dashboard(dashboard_id):
    try:
        dashboard = db.session.query(Dashboard).get(dashboard_id)
        if not dashboard:
            return jsonify({'error': 'Dashboard not found'}), 404
        
        data = request.get_json()
        
        # Update fields if provided
        
        if 'title' in data:
            dashboard.title=data['title']
        if 'columns' in data:
            dashboard.columns=data['columns']
        
        db.session.commit()
        
        return jsonify({
            'message': 'Dashboard updated successfully',
            'dashboard': dashboard.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# DELETE - Delete a user
@app.route('/api/dashboard/<int:dashboard_id>', methods=['DELETE'])
def delete_dashboard(dashboard_id):
    try:
        user = Dashboard.query.get_or_404(id)
        db.session.delete(user)
        db.session.commit()
        return jsonify({'message': 'User deleted successfully'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


# HelpDesk CRUD
@app.route('/api/helpdesk', methods=['POST'])
def create_helpdesk_entry():
    try:
        data = request.get_json()
        new_entry = HelpDesk(
            title=data['title'],
            query_description=data['query_description']
        )
        db.session.add(new_entry)
        db.session.commit()
        return jsonify({
            'message': 'HelpDesk entry created successfully',
            'entry': new_entry.to_dict()
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/helpdesk', methods=['GET'])
def get_all_helpdesk_entries():
    try:
        entries = HelpDesk.query.all()
        return jsonify({'data': [entry.to_dict() for entry in entries]}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/helpdesk/<string:title>', methods=['GET'])
def get_helpdesk_entry(title):
    try:
        entry = HelpDesk.query.get(title)
        if not entry:
            return jsonify({'error': 'HelpDesk entry not found'}), 404
        return jsonify({'entry': entry.to_dict()}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/helpdesk/<string:title>', methods=['PUT'])
def update_helpdesk_entry(title):
    try:
        entry = HelpDesk.query.get(title)
        if not entry:
            return jsonify({'error': 'HelpDesk entry not found'}), 404
        
        data = request.get_json()
        
        if 'query_description' in data:
            entry.query_description = data['query_description']
            
        db.session.commit()
        
        return jsonify({
            'message': 'HelpDesk entry updated successfully',
            'entry': entry.to_dict()
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/helpdesk/<string:title>', methods=['DELETE'])
def delete_helpdesk_entry(title):
    try:
        entry = HelpDesk.query.get(title)
        if not entry:
            return jsonify({'error': 'HelpDesk entry not found'}), 404
        
        db.session.delete(entry)
        db.session.commit()
        
        return jsonify({'message': 'HelpDesk entry deleted successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
        
    
