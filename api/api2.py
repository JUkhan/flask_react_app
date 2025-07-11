from flask import Flask, request, jsonify, render_template_string
from flask_sqlalchemy import SQLAlchemy
import os
#import re
from datetime import datetime
from typing import Dict, List
from sqlalchemy import text, inspect
#from gen_sql.lc_gen_query import generate_sql_query
from gen_sql.sql_gen_lg import run_qgn_chatbot
from gen_sql.schema import get_schema
from sqlalchemy import Column, Integer, String, Date, DateTime, Numeric, Text, ForeignKey
from sqlalchemy.orm import relationship
from dotenv import load_dotenv
from utils import extract_sql

load_dotenv()

print('api key::', os.getenv("GOOGLE_API_KEY"))
app = Flask(__name__)

# Configure SQLAlchemy
basedir = os.path.abspath(os.path.dirname(__file__))
app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{os.path.join(basedir, "database.db")}'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# Metadata Models
class TableDescription(db.Model):
    __tablename__ = 'table_descriptions'
    
    table_name = db.Column(db.String(100), primary_key=True)
    description = db.Column(db.Text, nullable=False)
    
    def to_dict(self):
        return {
            'table_name': self.table_name,
            'description': self.description
        }

class ColumnComment(db.Model):
    __tablename__ = 'column_comments'
    
    table_name = db.Column(db.String(100), primary_key=True)
    column_name = db.Column(db.String(100), primary_key=True)
    comment = db.Column(db.Text)
    
    def to_dict(self):
        return {
            'table_name': self.table_name,
            'column_name': self.column_name,
            'comment': self.comment
        }
    
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    posts = db.relationship('Post', backref='author', lazy=True, cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'created_at': self.created_at.isoformat(),
            'posts_count': len(self.posts)
        }

class Post(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    content = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)

    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'content': self.content,
            'created_at': self.created_at.isoformat(),
            'author': self.author.username
        }

class Dashboard(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    type = db.Column(db.Text, nullable=False)
    query = db.Column(db.Text, nullable=False)
    columns = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)

    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'type': self.type,
            'query':self.query,
            'columns':self.columns,
            'created_at': self.created_at.isoformat(),
            'user_id': self.user_id
        }

class Customer(db.Model):
    __tablename__ = 'customers'

    customer_id = Column(Integer, primary_key=True)
    name = Column(String)
    email = Column(String)
    registration_date = Column(Date)
    last_login = Column(DateTime)

    orders = relationship("Order", back_populates="customer")

    def __repr__(self):
        return f"<Customer(customer_id={self.customer_id}, name='{self.name}')>"


class Product(db.Model):
    __tablename__ = 'products'

    product_id = Column(Integer, primary_key=True)
    name = Column(String)
    description = Column(Text)
    price = Column(Numeric)  # Use Numeric for DECIMAL
    category = Column(String)
    stock_quantity = Column(Integer)

    order_items = relationship("OrderItem", back_populates="product")

    def __repr__(self):
        return f"<Product(product_id={self.product_id}, name='{self.name}')>"


class Order(db.Model):
    __tablename__ = 'orders'

    order_id = Column(Integer, primary_key=True)
    customer_id = Column(Integer, ForeignKey('customers.customer_id'))
    order_date = Column(Date)
    total_amount = Column(Numeric)  # Use Numeric for DECIMAL
    status = Column(String)

    customer = relationship("Customer", back_populates="orders")
    order_items = relationship("OrderItem", back_populates="order")

    def __repr__(self):
        return f"<Order(order_id={self.order_id}, order_date={self.order_date})>"


class OrderItem(db.Model):
    __tablename__ = 'order_items'

    item_id = Column(Integer, primary_key=True)
    order_id = Column(Integer, ForeignKey('orders.order_id'))
    product_id = Column(Integer, ForeignKey('products.product_id'))
    quantity = Column(Integer)
    unit_price = Column(Numeric)  # Use Numeric for DECIMAL

    order = relationship("Order", back_populates="order_items")
    product = relationship("Product", back_populates="order_items")

    def __repr__(self):
        return f"<OrderItem(item_id={self.item_id}, quantity={self.quantity})>"
# Schema Reader Class
class SchemaReader:
    def __init__(self, db_instance):
        self.db = db_instance
    
    def get_all_tables(self):
        """Get all user tables from the database"""
        inspector = inspect(self.db.engine)
        tables = inspector.get_table_names()
        # Filter out metadata tables
        return [table for table in tables if not table.startswith('table_descriptions') 
                and not table.startswith('column_comments')]
    
    def get_table_info(self, table_name: str) -> Dict:
        """Get detailed information about a table"""
        inspector = inspect(self.db.engine)
        
        # Get columns
        columns = inspector.get_columns(table_name)
        primary_keys = inspector.get_pk_constraint(table_name)['constrained_columns']
        foreign_keys = inspector.get_foreign_keys(table_name)
        unique_constraints = inspector.get_unique_constraints(table_name)
        
        # Process columns
        processed_columns = []
        for column in columns:
            column_info = {
                'name': column['name'],
                'type': str(column['type']),
                'constraints': [],
                'comment': self.get_column_comment(table_name, column['name'])
            }
            
            # Add constraints
            if column['name'] in primary_keys:
                column_info['constraints'].append('Primary Key')
            
            if not column['nullable'] and column['name'] not in primary_keys:
                column_info['constraints'].append('Not Null')
            
            # Check unique constraints
            for unique_constraint in unique_constraints:
                if column['name'] in unique_constraint['column_names']:
                    column_info['constraints'].append('Unique')
            
            # Check foreign keys
            for fk in foreign_keys:
                if column['name'] in fk['constrained_columns']:
                    ref_table = fk['referred_table']
                    ref_column = fk['referred_columns'][0]
                    column_info['constraints'].append(f'Foreign Key -> {ref_table}.{ref_column}')
            
            processed_columns.append(column_info)
        
        return {
            'description': self.get_table_description(table_name),
            'columns': processed_columns
        }
    
    def get_table_description(self, table_name: str) -> str:
        """Get table description from metadata"""
        table_desc = TableDescription.query.filter_by(table_name=table_name).first()
        if table_desc:
            return table_desc.description
        return f"Represents {table_name.replace('_', ' ')} data in the system."
    
    def get_column_comment(self, table_name: str, column_name: str) -> str:
        """Get column comment from metadata"""
        column_comment = ColumnComment.query.filter_by(
            table_name=table_name, 
            column_name=column_name
        ).first()
        if column_comment:
            return column_comment.comment
        return ""
    
    def format_table_info(self, table_name: str, table_info: Dict) -> str:
        """Format table information for output"""
        output = []
        output.append(f"Table: {table_name}")
        output.append(f"Description: {table_info['description']}")
        
        for column in table_info['columns']:
            column_line = f"        {column['name']} ({column['type']}"
            
            # Add constraints
            if column['constraints']:
                column_line += f", {', '.join(column['constraints'])}"
            
            column_line += ")"
            
            # Add comment if available
            if column['comment']:
                column_line += f" - {column['comment']}"
            
            output.append(column_line)
        
        return '\n'.join(output)
    
    def generate_schema_output(self, output_file: str = None) -> str:
        """Generate formatted schema output"""
        tables = self.get_all_tables()
        schema_parts = []
        
        for table_name in tables:
            table_info = self.get_table_info(table_name)
            schema_parts.append(self.format_table_info(table_name, table_info))
        
        schema_output = '\n\n'.join(schema_parts)
        
        if output_file:
            with open(output_file, 'w', encoding='utf-8') as f:
                f.write(schema_output)
        
        return schema_output

# Initialize schema reader
schema_reader = SchemaReader(db)

# API Routes
@app.route('/')
def index():
    """Main page with schema display"""
    return render_template_string(INDEX_TEMPLATE)

@app.route('/api/schema')
def get_schema():
    """Get formatted schema as JSON or text"""
    format_type = request.args.get('format', 'json')
    
    if format_type == 'text':
        schema_output = schema_reader.generate_schema_output()
        return schema_output, 200, {'Content-Type': 'text/plain'}
    
    # JSON format
    tables = schema_reader.get_all_tables()
    schema_data = {}
    
    for table_name in tables:
        schema_data[table_name] = schema_reader.get_table_info(table_name)
    
    return jsonify(schema_data)

@app.route('/api/schema/file')
def export_schema_file():
    """Export schema to file"""
    filename = request.args.get('filename', 'schema.txt')
    schema_output = schema_reader.generate_schema_output(filename)
    return jsonify({
        'message': f'Schema exported to {filename}',
        'content': schema_output
    })

@app.route('/api/tables')
def get_tables():
    """Get all tables"""
    tables = schema_reader.get_all_tables()
    return jsonify(tables)

@app.route('/api/tables/<table_name>')
def get_table_info(table_name):
    """Get information about a specific table"""
    try:
        table_info = schema_reader.get_table_info(table_name)
        formatted_info = schema_reader.format_table_info(table_name, table_info)
        return jsonify({
            'table_name': table_name,
            'raw_info': table_info,
            'formatted_info': formatted_info
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 404

@app.route('/api/descriptions', methods=['GET'])
def get_table_descriptions():
    """Get all table descriptions"""
    descriptions = TableDescription.query.all()
    return jsonify([desc.to_dict() for desc in descriptions])

@app.route('/api/descriptions', methods=['POST'])
def add_table_description():
    """Add or update table description"""
    data = request.get_json()
    table_name = data.get('table_name')
    description = data.get('description')
    
    if not table_name or not description:
        return jsonify({'error': 'table_name and description are required'}), 400
    
    # Check if table exists
    if table_name not in schema_reader.get_all_tables():
        return jsonify({'error': f'Table {table_name} does not exist'}), 404
    
    # Create or update description
    table_desc = TableDescription.query.filter_by(table_name=table_name).first()
    if table_desc:
        table_desc.description = description
    else:
        table_desc = TableDescription(table_name=table_name, description=description)
        db.session.add(table_desc)
    
    db.session.commit()
    return jsonify({'message': f'Description added for table {table_name}'})

@app.route('/api/comments', methods=['GET'])
def get_column_comments():
    """Get all column comments"""
    comments = ColumnComment.query.all()
    return jsonify([comment.to_dict() for comment in comments])

@app.route('/api/comments', methods=['POST'])
def add_column_comment():
    """Add or update column comment"""
    data = request.get_json()
    table_name = data.get('table_name')
    column_name = data.get('column_name')
    comment = data.get('comment')
    
    if not table_name or not column_name or not comment:
        return jsonify({'error': 'table_name, column_name, and comment are required'}), 400
    
    # Create or update comment
    column_comment = ColumnComment.query.filter_by(
        table_name=table_name, 
        column_name=column_name
    ).first()
    
    if column_comment:
        column_comment.comment = comment
    else:
        column_comment = ColumnComment(
            table_name=table_name, 
            column_name=column_name, 
            comment=comment
        )
        db.session.add(column_comment)
    
    db.session.commit()
    return jsonify({'message': f'Comment added for {table_name}.{column_name}'})

@app.route('/chatbot', methods=['POST'])
def chat():
    user_input = request.json.get('user_input')
    thread_id = request.json.get('thread_id')
    if not user_input:
        return jsonify({"error": "user_input is required"}), 400
    
    response = run_qgn_chatbot(user_input, thread_id)
    return jsonify({"response": response})

@app.route('/api/login', methods=['POST'])
def login():
    """login user authentication"""
    data = request.get_json()
    username = data.get('username')
    email = data.get('email')
    users = User.query.all()
    for user in users:
        if user.username==username:
            return jsonify(user.to_dict())
    return jsonify(None)

@app.route("/api/get-query-result", methods=['POST'])
def get_query_result():
    try:
        user_input = request.json.get('user_input')
        thread_id = request.json.get('thread_id')
        if not user_input:
            return jsonify({"error": "user_input is required"}), 400
        
        sql = run_qgn_chatbot(user_input, thread_id)
        
        if not sql or sql == "Your query description is not sufficient to generate a valid query.":
            return {'query': '', 'data': []}
        sql = extract_sql(sql)
        print('sql:',sql)
        result = db.session.execute(text(sql))
        
        # For SELECT queries only - simpler approach
        rows = result.fetchall()
        columns = result.keys()
        data_rows = [dict(zip(columns, row)) for row in rows]
        
        return {'query': sql, 'data': data_rows}
        
    except Exception as e:
        print(f'Error: {str(e)}')
        return {'error': str(e)}, 500
    
@app.route("/api/get-query-result2", methods=['POST'])
def get_query_result2():
    try:
        query = request.json.get('query')
        if not query:
            return jsonify({"error": "query is required"}), 400
        
        result = db.session.execute(text(query))
        
        # For SELECT queries only - simpler approach
        rows = result.fetchall()
        columns = result.keys()
        data_rows = [dict(zip(columns, row)) for row in rows]
        
        return { 'data': data_rows}
        
    except Exception as e:
        print(f'Error: {str(e)}')
        return {'error': str(e)}, 500


# HTML Template
INDEX_TEMPLATE = '''
<!DOCTYPE html>
<html>
<head>
    <title>Database Schema Reader</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .container { max-width: 1200px; margin: 0 auto; }
        .schema-output { background: #f5f5f5; padding: 20px; border-radius: 5px; white-space: pre-wrap; }
        .form-group { margin-bottom: 15px; }
        label { display: block; margin-bottom: 5px; }
        input, textarea { width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 3px; }
        button { background: #007bff; color: white; padding: 10px 20px; border: none; border-radius: 3px; cursor: pointer; }
        button:hover { background: #0056b3; }
        .tabs { margin-bottom: 20px; }
        .tab { display: inline-block; padding: 10px 20px; background: #f8f9fa; border: 1px solid #ddd; cursor: pointer; }
        .tab.active { background: #007bff; color: white; }
        .tab-content { display: none; }
        .tab-content.active { display: block; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Database Schema Reader</h1>
        
        <div class="tabs">
            <div class="tab active" onclick="showTab('schema')">Schema</div>
            <div class="tab" onclick="showTab('descriptions')">Table Descriptions</div>
            <div class="tab" onclick="showTab('comments')">Column Comments</div>
        </div>
        
        <div id="schema" class="tab-content active">
            <h2>Database Schema</h2>
            <button onclick="loadSchema()">Load Schema</button>
            <button onclick="exportSchema()">Export to File</button>
            <div id="schema-output" class="schema-output"></div>
        </div>
        
        <div id="descriptions" class="tab-content">
            <h2>Manage Table Descriptions</h2>
            <div class="form-group">
                <label>Table Name:</label>
                <input type="text" id="desc-table-name" placeholder="Enter table name">
            </div>
            <div class="form-group">
                <label>Description:</label>
                <textarea id="desc-description" placeholder="Enter table description"></textarea>
            </div>
            <button onclick="addDescription()">Add Description</button>
            <div id="descriptions-list"></div>
        </div>
        
        <div id="comments" class="tab-content">
            <h2>Manage Column Comments</h2>
            <div class="form-group">
                <label>Table Name:</label>
                <input type="text" id="comment-table-name" placeholder="Enter table name">
            </div>
            <div class="form-group">
                <label>Column Name:</label>
                <input type="text" id="comment-column-name" placeholder="Enter column name">
            </div>
            <div class="form-group">
                <label>Comment:</label>
                <textarea id="comment-comment" placeholder="Enter column comment"></textarea>
            </div>
            <button onclick="addComment()">Add Comment</button>
            <div id="comments-list"></div>
        </div>
    </div>

    <script>
        function showTab(tabName) {
            // Hide all tabs
            const tabs = document.querySelectorAll('.tab');
            const contents = document.querySelectorAll('.tab-content');
            
            tabs.forEach(tab => tab.classList.remove('active'));
            contents.forEach(content => content.classList.remove('active'));
            
            // Show selected tab
            document.querySelector(`[onclick="showTab('${tabName}')"]`).classList.add('active');
            document.getElementById(tabName).classList.add('active');
        }

        function loadSchema() {
            fetch('/api/schema?format=text')
                .then(response => response.text())
                .then(data => {
                    document.getElementById('schema-output').textContent = data;
                });
        }

        function exportSchema() {
            fetch('/api/schema/file?filename=schema.txt')
                .then(response => response.json())
                .then(data => {
                    alert(data.message);
                });
        }

        function addDescription() {
            const tableName = document.getElementById('desc-table-name').value;
            const description = document.getElementById('desc-description').value;
            
            fetch('/api/descriptions', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({table_name: tableName, description: description})
            })
            .then(response => response.json())
            .then(data => {
                alert(data.message || data.error);
                document.getElementById('desc-table-name').value = '';
                document.getElementById('desc-description').value = '';
            });
        }

        function addComment() {
            const tableName = document.getElementById('comment-table-name').value;
            const columnName = document.getElementById('comment-column-name').value;
            const comment = document.getElementById('comment-comment').value;
            
            fetch('/api/comments', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    table_name: tableName, 
                    column_name: columnName, 
                    comment: comment
                })
            })
            .then(response => response.json())
            .then(data => {
                alert(data.message || data.error);
                document.getElementById('comment-table-name').value = '';
                document.getElementById('comment-column-name').value = '';
                document.getElementById('comment-comment').value = '';
            });
        }

        // Load schema on page load
        window.onload = function() {
            loadSchema();
        };
    </script>
</body>
</html>
'''

# Standalone function for backward compatibility
def get_sqlite_schema_with_description(database_path="database.db", output_file="schema.txt"):
    """
    Standalone function to generate schema description file
    """
    # Configure app for standalone use
    app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{database_path}'
    
    with app.app_context():
        db.create_all()
        reader = SchemaReader(db)
        schema_output = reader.generate_schema_output(output_file)
        print(f"Schema successfully written to '{output_file}'")
        return True

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
@app.route('/api/dashboards/<int:user_id>', methods=['GET'])
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
def update_user(dashboard_id):
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
def delete_user(dashboard_id):
    try:
        user = db.session.query(Dashboard).get(dashboard_id)
        if not user:
            return jsonify({'error': 'Dashboard not found'}), 404
        
        db.session.delete(user)
        db.session.commit()
        
        return jsonify({'message': 'Dashboard deleted successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    # Create tables
    with app.app_context():
        db.create_all()
    
    # Run Flask app
    app.run(debug=True, port=5000)