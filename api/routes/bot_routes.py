from flask import Flask, request, jsonify
from sqlalchemy import text, inspect
from api2 import app, db
from gen_sql.sql_gen_lg import run_qgn_chatbot, get_messages
from utils import extract_sql

@app.route('/chatbot', methods=['POST'])
def chat():
    user_input = request.json.get('user_input')
    thread_id = request.json.get('thread_id')
    if not user_input:
        return jsonify({"error": "user_input is required"}), 400
    
    response = run_qgn_chatbot(user_input, thread_id)
    return jsonify({"response": response})

@app.route("/api/get-bot-messages/<thread_id>")
def get_bot_messages(thread_id):
    try:
        messages=get_messages(thread_id)
        return {'messages': messages}
        
    except Exception as e:
        print(f'Error: {str(e)}')
        return {'error': str(e)}, 500
    
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
        return {'error': str(e), 'query': sql, 'data': []}, 500
    
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
        return {'error': str(e), 'data':[]}, 500

