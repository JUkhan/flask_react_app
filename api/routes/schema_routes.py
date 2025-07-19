from flask import request, jsonify, render_template_string
from schema_readers.schema_reader import SchemaReader
from models import ColumnComment, TableDescription
from database import db
from app import app

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

    if filename:
            with open(filename, 'w', encoding='utf-8') as f:
                f.write(schema_output)
                
    return jsonify({
        'message': f'Schema exported to {filename}',
        'content': ''
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
        schema_reader.load_table_info(table_name)
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
        input, textarea, select { width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 3px; }
        button { background: #007bff; color: white; padding: 10px 20px; border: none; border-radius: 3px; cursor: pointer; }
        button:hover { background: #0056b3; }
        .tabs { margin-bottom: 20px; }
        .tab { display: inline-block; padding: 10px 20px; background: #f8f9fa; border: 1px solid #ddd; cursor: pointer; }
        .tab.active { background: #007bff; color: white; }
        .tab-content { display: none; }
        .tab-content.active { display: block; }
        .msg{
            padding: 20px;
            background-color: #007bff;
            color: white;
            margin-bottom:5px;
            position:absolute;
            top:65px;
            left:700px;
        }
        .error{
            background-color: #f44336;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Database Schema Reader</h1>
        <div id="msg"></div>
        <div class="tabs">
            <div class="tab active" onclick="showTab('schema')">Schema</div>
            <div class="tab" onclick="showTab('descriptions')">Table Descriptions</div>
            <div class="tab" onclick="showTab('comments')">Column Comments</div>
        </div>
        
        <div id="schema" class="tab-content active">
            <h2>Database Schema</h2>
            <button id="btn-load-schema" onclick="loadSchema()">Load Schema</button>
            <button id="btn-export" onclick="exportSchema()">Export to File</button>
            <div id="schema-output" class="schema-output"></div>
        </div>
        
        <div id="descriptions" class="tab-content">
            <h2>Manage Table Descriptions</h2>
            <div class="form-group">
                <label>Table Name:</label>
                <select onChange="desTableSelect(this.value)" id="desc-table-name"></select>
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
                <select onChange="commTableSelect(this.value)" id="comment-table-name"></select>
            </div>
            <div class="form-group">
                <label>Column Name:</label>
                <select onChange="onColumnSelect(this.value)" id="comment-column-name"></select>
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
        let selectedTable=null;
        function desTableSelect(val){
            getTableInfo(val).then(it=>{
                document.getElementById('desc-description').value=it.raw_info.description
            })
        }
        function commTableSelect(val){
            getTableInfo(val).then(it=>{
                selectedTable = it;
                populateDropdownWithPlaceholder('comment-column-name', it.raw_info.columns.map(it=>it.name),'Select column name')
            })
        }
        function onColumnSelect(val){
            if(!selectedTable){
                showMessage('Select a table name')
                return;
            }
            const col=selectedTable.raw_info.columns.find(it=>it.name===val);
            if(col)
                document.getElementById('comment-comment').value=col.comment
            
        }
        function showMessage(msg, time=3000){
            const div = document.getElementById('msg');
            div.innerHTML=`<span class="msg">${msg}</span>`
            setTimeout(function(){
                div.innerHTML='';
            }, time);   
        }
        function errorMessage(msg, time=3000){
            const div = document.getElementById('msg');
            div.innerHTML=`<span class="msg error">${msg}</span>`
            setTimeout(function(){
                div.innerHTML='';
            }, time);   
        }
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
            const btn=document.getElementById('btn-load-schema')
            btn.textContent='loading...'
            btn.disabled=true
            document.getElementById('schema-output').textContent='Loading...'
            fetch('/api/schema?format=text')
                .then(response => response.text())
                .then(data => {
                     btn.textContent='Load Schema'
                     btn.disabled=true
                    document.getElementById('schema-output').textContent = data;
                });
        }

        function exportSchema() {
            const btn=document.getElementById('btn-export')
            btn.textContent='loading...'
            btn.disabled=true
            fetch('/api/schema/file?filename=schema.txt')
                .then(response => response.json())
                .then(data => {
                    btn.textContent='Export to File'
                    btn.disabled=false
                    showMessage(data.message);
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
                if(data.error) errorMessage(data.error);
                else showMessage(data.message);
                if(!data.message)return;
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
                if(data.error) errorMessage(data.error);
                else showMessage(data.message);
                if(!data.message)return;
                document.getElementById('comment-table-name').value = '';
                document.getElementById('comment-column-name').value = '';
                document.getElementById('comment-comment').value = '';
            });
        }

        function getAllTableNames(){
            return fetch('/api/tables')
            .then(response => response.json())
        }

        function getTableInfo(tableName){
            return fetch('/api/tables/'+tableName)
            .then(response => response.json())
        }

        function populateDropdownWithPlaceholder(dropdownId, options, placeholder = 'Select an option...') {
            const dropdown = document.getElementById(dropdownId);
            
            if (!dropdown) {
                console.error(`Dropdown with ID '${dropdownId}' not found`);
                return;
            }
            
            // Clear existing options
            dropdown.innerHTML = '';
            
            // Add placeholder option
            if (placeholder) {
                const placeholderOption = document.createElement('option');
                placeholderOption.value = '';
                placeholderOption.textContent = placeholder;
                placeholderOption.disabled = true;
                placeholderOption.selected = true;
                dropdown.appendChild(placeholderOption);
            }
            
            // Add options from the array
            options.forEach(option => {
                const optionElement = document.createElement('option');
                optionElement.value = option;
                optionElement.textContent = option;
                dropdown.appendChild(optionElement);
            });
        }

        // Load schema on page load
        window.onload = function() {
            //loadSchema();
            getAllTableNames().then((options)=>{
                populateDropdownWithPlaceholder('desc-table-name',options,'Select table name.')
                populateDropdownWithPlaceholder('comment-table-name',options,'Select table name.')
           })
        };
    </script>
</body>
</html>
'''
