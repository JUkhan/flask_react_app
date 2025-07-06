
def get_schema(fileName='schema.txt'):
    with open(fileName, 'r') as file:
      schema = file.read()
    return schema

def extract_table_names(schemas):
    """
    Extract table names from a schema string and return them as a comma-separated string.
    
    Args:
        schemas (str): A string containing schema definitions with table names following
                      the format "Table: table_name"
    
    Returns:
        str: Comma-separated list of table names
    """
    table_names = []
    
    # Split the schemas into lines
    lines = schemas.split('\n')
    
    # Look for lines starting with "Table: "
    for idx, line in enumerate(lines):
        line = line.strip()
        if line.lower().startswith('table:'):
            # Extract the table name (everything after "Table: ")
            nextLine=lines[idx+1].strip()
            table_name = line[6:].strip()
            if nextLine.startswith('Description:'):
                table_names.append(f'{table_name} - {nextLine[12:].strip()}')
            else:
                table_names.append(f'{table_name} - ')
    
    # Join the table names with commas
    return '\n'.join(table_names)



def filter_schemas_by_table_names(table_names_str, schemas):
    """
    Filter schemas to include only those that match the specified table names.
    
    Args:
        table_names_str (str): Comma-separated list of table names
        schemas (str): A string containing schema definitions
    
    Returns:
        str: Filtered schemas containing only the specified tables
    """
    # Convert comma-separated string to list and strip whitespace
    table_names = [name.strip() for name in table_names_str.split(',')]
    
    # Split the schemas into individual table definitions
    schema_lines = schemas.split('\n')
    
    filtered_schema = []
    include_current_table = False
    current_table_name = None
    
    for line in schema_lines:
        # Check if line defines a new table
        if line.strip().lower().startswith('table:'):
            # Extract the table name
            current_table_name = line.strip()[6:].strip()
            # Determine if this table should be included
            include_current_table = current_table_name in table_names
            
            # Add a newline before a new table definition (except for the first one)
            if include_current_table and filtered_schema and filtered_schema[-1].strip():
                filtered_schema.append("")
        
        # Include line if it belongs to a table we want to keep
        if include_current_table and line.strip():
            filtered_schema.append(line)
    
    # Join the lines back together
    return '\n'.join(filtered_schema)