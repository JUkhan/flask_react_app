import re
import json

def extract_json(text):
    """
    Extract JSON with more detailed error reporting.
    
    Args:
        text (str): The input text containing JSON code blocks
        
    Returns:
        tuple: (success: bool, data: dict/list/None, error: str/None)
    """
    json_regex = r'```json\s*([\s\S]*?)\s*```'
    match = re.search(json_regex, text)
    
    if not match:
        return False, None, 'No JSON content found within ```json ``` delimiters.'
    
    if not match.group(1):
        return False, None, 'Empty JSON block found.'
    
    json_string = match.group(1).strip()
    
    try:
        json_data = json.loads(json_string)
        return True, json_data, None
    except json.JSONDecodeError as error:
        return False, None, f'Error parsing JSON: {error}'

def extract_sql(text):
    """
    Extract SQL with more detailed error reporting.
    
    Args:
        text (str): The input text containing JSON code blocks
        
    Returns:
        tuple: (success: bool, data: dict/list/None, error: str/None)
    """
    json_regex = r'```(?:sqlite|sql)\s*([\s\S]*?)\s*```'
    match = re.search(json_regex, text)
    
    if not match:
        return ''
    
    if not match.group(1):
        return ''
    
    json_string = match.group(1).strip()
    
    try:
        return json_string
    except Exception:
        return ""