from flask import Flask, request, jsonify, render_template_string
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.exc import IntegrityError
from datetime import datetime
import os
import logging

app = Flask(__name__)

# Database configuration
DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://flask_user:your_password@localhost:5432/flask_app')
app.config['SQLALCHEMY_DATABASE_URI'] = DATABASE_URL
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Initialize SQLAlchemy
db = SQLAlchemy(app)

# User model
class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    age = db.Column(db.Integer)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships (example)
    posts = db.relationship('Post', backref='author', lazy=True, cascade='all, delete-orphan')
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'email': self.email,
            'age': self.age,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
    
    def __repr__(self):
        return f'<User {self.name}>'

# Post model (example of relationship)
class Post(db.Model):
    __tablename__ = 'posts'
    
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    content = db.Column(db.Text)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'content': self.content,
            'user_id': self.user_id,
            'author': self.author.name if self.author else None,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
    
    def __repr__(self):
        return f'<Post {self.title}>'

# Initialize database
def init_db():
    with app.app_context():
        db.create_all()
        app.logger.info("Database tables created successfully")

# Routes
@app.route('/')
def index():
    return render_template_string('''
    <!DOCTYPE html>
    <html>
    <head>
        <title>Flask SQLAlchemy PostgreSQL Demo</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 40px; }
            .container { max-width: 1000px; margin: 0 auto; }
            .section { margin: 20px 0; padding: 20px; border: 1px solid #ddd; }
            .form-group { margin: 10px 0; }
            label { display: block; margin-bottom: 5px; font-weight: bold; }
            input, textarea, button { padding: 8px; margin: 5px 0; }
            input, textarea { width: 300px; }
            button { background: #007bff; color: white; border: none; cursor: pointer; padding: 10px 20px; }
            button:hover { background: #0056b3; }
            .user-list, .post-list { margin-top: 20px; }
            .user-item, .post-item { border: 1px solid #ddd; padding: 15px; margin: 10px 0; }
            .user-posts { margin-top: 10px; padding-left: 20px; }
            .error { color: red; }
            .success { color: green; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>Flask SQLAlchemy PostgreSQL Demo</h1>
            
            <div class="section">
                <h2>Add New User</h2>
                <form id="userForm">
                    <div class="form-group">
                        <label>Name:</label>
                        <input type="text" id="name" required>
                    </div>
                    <div class="form-group">
                        <label>Email:</label>
                        <input type="email" id="email" required>
                    </div>
                    <div class="form-group">
                        <label>Age:</label>
                        <input type="number" id="age" min="1" max="120">
                    </div>
                    <button type="submit">Add User</button>
                </form>
            </div>
            
            <div class="section">
                <h2>Add New Post</h2>
                <form id="postForm">
                    <div class="form-group">
                        <label>User:</label>
                        <select id="postUserId" required>
                            <option value="">Select a user</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Title:</label>
                        <input type="text" id="postTitle" required>
                    </div>
                    <div class="form-group">
                        <label>Content:</label>
                        <textarea id="postContent" rows="4"></textarea>
                    </div>
                    <button type="submit">Add Post</button>
                </form>
            </div>
            
            <div class="section">
                <h2>Users and Posts</h2>
                <button onclick="loadData()">Refresh Data</button>
                <div id="dataList" class="user-list"></div>
            </div>
            
            <div id="message"></div>
        </div>

        <script>
            function showMessage(text, isError = false) {
                const messageDiv = document.getElementById('message');
                messageDiv.textContent = text;
                messageDiv.className = isError ? 'error' : 'success';
                setTimeout(() => messageDiv.textContent = '', 3000);
            }
            
            async function addUser(event) {
                event.preventDefault();
                
                const userData = {
                    name: document.getElementById('name').value,
                    email: document.getElementById('email').value,
                    age: parseInt(document.getElementById('age').value) || null
                };
                
                try {
                    const response = await fetch('/users', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(userData)
                    });
                    
                    if (response.ok) {
                        document.getElementById('userForm').reset();
                        loadData();
                        showMessage('User added successfully!');
                    } else {
                        const error = await response.json();
                        showMessage('Error: ' + error.error, true);
                    }
                } catch (error) {
                    showMessage('Error: ' + error.message, true);
                }
            }
            
            async function addPost(event) {
                event.preventDefault();
                
                const postData = {
                    title: document.getElementById('postTitle').value,
                    content: document.getElementById('postContent').value,
                    user_id: parseInt(document.getElementById('postUserId').value)
                };
                
                try {
                    const response = await fetch('/posts', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(postData)
                    });
                    
                    if (response.ok) {
                        document.getElementById('postForm').reset();
                        loadData();
                        showMessage('Post added successfully!');
                    } else {
                        const error = await response.json();
                        showMessage('Error: ' + error.error, true);
                    }
                } catch (error) {
                    showMessage('Error: ' + error.message, true);
                }
            }
            
            async function loadData() {
                try {
                    const response = await fetch('/users');
                    const users = await response.json();
                    
                    // Update user select dropdown
                    const userSelect = document.getElementById('postUserId');
                    userSelect.innerHTML = '<option value="">Select a user</option>';
                    users.forEach(user => {
                        userSelect.innerHTML += `<option value="${user.id}">${user.name}</option>`;
                    });
                    
                    // Load posts for each user
                    const dataList = document.getElementById('dataList');
                    const userElements = await Promise.all(users.map(async user => {
                        const postsResponse = await fetch(`/users/${user.id}/posts`);
                        const posts = await postsResponse.json();
                        
                        const postsHtml = posts.map(post => `
                            <div class="post-item">
                                <strong>${post.title}</strong><br>
                                ${post.content}<br>
                                <small>Posted: ${new Date(post.created_at).toLocaleString()}</small>
                                <button onclick="deletePost(${post.id})">Delete Post</button>
                            </div>
                        `).join('');
                        
                        return `
                            <div class="user-item">
                                <strong>${user.name}</strong> (${user.email})<br>
                                Age: ${user.age || 'Not specified'}<br>
                                Created: ${new Date(user.created_at).toLocaleDateString()}<br>
                                <button onclick="deleteUser(${user.id})">Delete User</button>
                                <div class="user-posts">
                                    <h4>Posts (${posts.length}):</h4>
                                    ${postsHtml || '<p>No posts yet.</p>'}
                                </div>
                            </div>
                        `;
                    }));
                    
                    dataList.innerHTML = userElements.join('');
                } catch (error) {
                    showMessage('Error loading data: ' + error.message, true);
                }
            }
            
            async function deleteUser(userId) {
                if (confirm('Are you sure? This will also delete all posts by this user.')) {
                    try {
                        const response = await fetch(`/users/${userId}`, {
                            method: 'DELETE'
                        });
                        
                        if (response.ok) {
                            loadData();
                            showMessage('User deleted successfully!');
                        } else {
                            const error = await response.json();
                            showMessage('Error: ' + error.error, true);
                        }
                    } catch (error) {
                        showMessage('Error: ' + error.message, true);
                    }
                }
            }
            
            async function deletePost(postId) {
                if (confirm('Are you sure you want to delete this post?')) {
                    try {
                        const response = await fetch(`/posts/${postId}`, {
                            method: 'DELETE'
                        });
                        
                        if (response.ok) {
                            loadData();
                            showMessage('Post deleted successfully!');
                        } else {
                            const error = await response.json();
                            showMessage('Error: ' + error.error, true);
                        }
                    } catch (error) {
                        showMessage('Error: ' + error.message, true);
                    }
                }
            }
            
            document.getElementById('userForm').addEventListener('submit', addUser);
            document.getElementById('postForm').addEventListener('submit', addPost);
            loadData(); // Load data on page load
        </script>
    </body>
    </html>
    ''')

# User routes
@app.route('/users', methods=['GET'])
def get_users():
    try:
        users = User.query.order_by(User.created_at.desc()).all()
        return jsonify([user.to_dict() for user in users])
    except Exception as e:
        app.logger.error(f"Error fetching users: {e}")
        return jsonify({'error': 'Failed to fetch users'}), 500

@app.route('/users', methods=['POST'])
def create_user():
    try:
        data = request.get_json()
        
        if not data or not data.get('name') or not data.get('email'):
            return jsonify({'error': 'Name and email are required'}), 400
        
        user = User(
            name=data['name'],
            email=data['email'],
            age=data.get('age')
        )
        
        db.session.add(user)
        db.session.commit()
        
        return jsonify(user.to_dict()), 201
        
    except IntegrityError:
        db.session.rollback()
        return jsonify({'error': 'Email already exists'}), 400
    except Exception as e:
        db.session.rollback()
        app.logger.error(f"Error creating user: {e}")
        return jsonify({'error': 'Failed to create user'}), 500

@app.route('/users/<int:user_id>', methods=['GET'])
def get_user(user_id):
    try:
        user = User.query.get_or_404(user_id)
        return jsonify(user.to_dict())
    except Exception as e:
        app.logger.error(f"Error fetching user: {e}")
        return jsonify({'error': 'Failed to fetch user'}), 500

@app.route('/users/<int:user_id>', methods=['PUT'])
def update_user(user_id):
    try:
        user = User.query.get_or_404(user_id)
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Update fields if provided
        if 'name' in data:
            user.name = data['name']
        if 'email' in data:
            user.email = data['email']
        if 'age' in data:
            user.age = data['age']
        
        db.session.commit()
        return jsonify(user.to_dict())
        
    except IntegrityError:
        db.session.rollback()
        return jsonify({'error': 'Email already exists'}), 400
    except Exception as e:
        db.session.rollback()
        app.logger.error(f"Error updating user: {e}")
        return jsonify({'error': 'Failed to update user'}), 500

@app.route('/users/<int:user_id>', methods=['DELETE'])
def delete_user(user_id):
    try:
        user = User.query.get_or_404(user_id)
        db.session.delete(user)
        db.session.commit()
        
        return jsonify({'message': 'User deleted successfully'})
        
    except Exception as e:
        db.session.rollback()
        app.logger.error(f"Error deleting user: {e}")
        return jsonify({'error': 'Failed to delete user'}), 500

# Post routes
@app.route('/posts', methods=['GET'])
def get_posts():
    try:
        posts = Post.query.order_by(Post.created_at.desc()).all()
        return jsonify([post.to_dict() for post in posts])
    except Exception as e:
        app.logger.error(f"Error fetching posts: {e}")
        return jsonify({'error': 'Failed to fetch posts'}), 500

@app.route('/posts', methods=['POST'])
def create_post():
    try:
        data = request.get_json()
        
        if not data or not data.get('title') or not data.get('user_id'):
            return jsonify({'error': 'Title and user_id are required'}), 400
        
        # Verify user exists
        user = User.query.get_or_404(data['user_id'])
        
        post = Post(
            title=data['title'],
            content=data.get('content', ''),
            user_id=data['user_id']
        )
        
        db.session.add(post)
        db.session.commit()
        
        return jsonify(post.to_dict()), 201
        
    except Exception as e:
        db.session.rollback()
        app.logger.error(f"Error creating post: {e}")
        return jsonify({'error': 'Failed to create post'}), 500

@app.route('/posts/<int:post_id>', methods=['DELETE'])
def delete_post(post_id):
    try:
        post = Post.query.get_or_404(post_id)
        db.session.delete(post)
        db.session.commit()
        
        return jsonify({'message': 'Post deleted successfully'})
        
    except Exception as e:
        db.session.rollback()
        app.logger.error(f"Error deleting post: {e}")
        return jsonify({'error': 'Failed to delete post'}), 500

@app.route('/users/<int:user_id>/posts', methods=['GET'])
def get_user_posts(user_id):
    try:
        user = User.query.get_or_404(user_id)
        posts = Post.query.filter_by(user_id=user_id).order_by(Post.created_at.desc()).all()
        return jsonify([post.to_dict() for post in posts])
    except Exception as e:
        app.logger.error(f"Error fetching user posts: {e}")
        return jsonify({'error': 'Failed to fetch user posts'}), 500

# Advanced queries examples
@app.route('/users/search', methods=['GET'])
def search_users():
    try:
        query = request.args.get('q', '')
        min_age = request.args.get('min_age', type=int)
        max_age = request.args.get('max_age', type=int)
        
        filters = []
        
        if query:
            filters.append(User.name.ilike(f'%{query}%'))
        
        if min_age is not None:
            filters.append(User.age >= min_age)
            
        if max_age is not None:
            filters.append(User.age <= max_age)
        
        if filters:
            users = User.query.filter(*filters).order_by(User.name).all()
        else:
            users = User.query.order_by(User.name).all()
        
        return jsonify([user.to_dict() for user in users])
        
    except Exception as e:
        app.logger.error(f"Error searching users: {e}")
        return jsonify({'error': 'Failed to search users'}), 500

@app.route('/stats', methods=['GET'])
def get_stats():
    try:
        user_count = User.query.count()
        post_count = Post.query.count()
        
        # Users with most posts
        from sqlalchemy import func
        top_users = db.session.query(
            User.name,
            func.count(Post.id).label('post_count')
        ).join(Post).group_by(User.id, User.name).order_by(
            func.count(Post.id).desc()
        ).limit(5).all()
        
        return jsonify({
            'total_users': user_count,
            'total_posts': post_count,
            'top_users': [{'name': name, 'post_count': count} for name, count in top_users]
        })
        
    except Exception as e:
        app.logger.error(f"Error getting stats: {e}")
        return jsonify({'error': 'Failed to get stats'}), 500

# Health check endpoint
@app.route('/health')
def health_check():
    try:
        # Test database connection
        db.session.execute(db.text('SELECT 1'))
        return jsonify({'status': 'healthy', 'database': 'connected'})
    except Exception as e:
        return jsonify({'status': 'unhealthy', 'error': str(e)}), 500

if __name__ == '__main__':
    logging.basicConfig(level=logging.INFO)
    
    try:
        init_db()
        app.logger.info("Database initialized successfully")
    except Exception as e:
        app.logger.error(f"Failed to initialize database: {e}")
        exit(1)
    
    app.run(debug=True, host='0.0.0.0', port=5000)

# requirement
# Flask==2.3.3
# Flask-SQLAlchemy==3.0.5
# psycopg2-binary==2.9.7
# python-dotenv==1.0.0

#bash
# Connect to PostgreSQL
# sudo -u postgres psql

# # Create database and user
# CREATE DATABASE flask_app;
# CREATE USER flask_user WITH PASSWORD 'your_password';
# GRANT ALL PRIVILEGES ON DATABASE flask_app TO flask_user;
# \q