from google import genai
import os
import schema
import logging

def get_query_prompt(tableNames, allSchema, query_description, is_double_quoted_table_name=False, table_alias='', column_alias=''):

    filteredSchema=schema.filter_schemas_by_table_names(tableNames, allSchema)
    doubleQuotedTableName =''
    if is_double_quoted_table_name:
        doubleQuotedTableName = 'keep the table names like "tableName"' 
    
    prompt = f"""
    Given this database schema:
    ```
    {filteredSchema}
    ```

    {table_alias}

    {column_alias}

    Generate a SQL query for postgresql that:
    {query_description}
    
    please do not add such a table name or column name in your query that not match with the given database schema.
    That will raise fatal error once I run this query.

    If you can't match any table name from the given schema, return - You query description is not sufficient to make a valid query.

    {doubleQuotedTableName}
    Please provide only the SQL query without any explanations.
    """
    return prompt

def get_table_name_prompt(schemaStr, query_description, table_alias=''):
    tableNames = schema.extract_table_names(schemaStr)
    prompt = f"""
    Given this database table names with description([tableName] - [description]):
    ```
    {tableNames}
    ```
    
    {table_alias}
    
    Find expected table names that:
    {query_description}

    please only consider the given table names. Do not add any additional table names in your response.
    
    Please provide only the comma separated table names without any explanations.
    """
    return prompt

def generate_sql_query(schema, query_description, is_double_quoted_table_name=False, table_alias='', column_alias=''):
    """
    Uses Gemini to generate a SQL query based on a schema and description.
    
    Args:
        schema (str): The database schema description
        query_description (str): What the query should do
        table_alias (str): Sample example below there:
          please consider the table alias:
          orders as o1,o2,o3
          products as p1,p2,p3
        column_alias (str): Sample example below there:
          please consider the table.column alias:
          orders.status as s1,s2,s3
          orders.total_amount as t1,t2,t3
    
    Returns:
        str: The generated SQL query
    """
    # Initialize the Anthropic client
    client = genai.Client(api_key=os.environ.get('GOOGLE_API_KEY'))
    #client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))
    
    prompt =get_table_name_prompt(schema, query_description, table_alias=table_alias)

    logging.info('Expected table prompt')
    logging.info(prompt)
    # Generate the expected table names
    response = client.models.generate_content(
    model="gemini-2.0-flash", contents=prompt
    )
    
    logging.info(f'table names: {response.text}')
    prompt = get_query_prompt(response.text, schema, query_description, is_double_quoted_table_name, table_alias=table_alias, column_alias=column_alias)
    
    logging.info('Query prompt')
    logging.info(prompt)
    # Generate the SQL query
    response = client.models.generate_content(
    model="gemini-2.0-flash", contents=prompt
    )
    logging.info(response.text)
    # Extract and return the SQL query
    return response.text.replace('```sql','').replace('```','')


# Example usage
if __name__ == "__main__":
    # Example schema
    schemaStr = """
    Table: customers
        customer_id (INT, Primary Key)
        name (VARCHAR)
        email (VARCHAR)
        registration_date (DATE)
        last_login (TIMESTAMP)
    
    Table: products
        product_id (INT, Primary Key)
        name (VARCHAR)
        description (TEXT)
        price (DECIMAL)
        category (VARCHAR)
        stock_quantity (INT)
    
    Table: orders
        order_id (INT, Primary Key)
        customer_id (INT, Foreign Key to customers.customer_id)
        order_date (DATE)
        total_amount (DECIMAL)
        status (VARCHAR)
    
    Table: order_items
        item_id (INT, Primary Key)
        order_id (INT, Foreign Key to orders.order_id)
        product_id (INT, Foreign Key to products.product_id)
        quantity (INT)
        unit_price (DECIMAL)
    """

    table_alias="""
    please consider the table alias:
    orders as o1,o2,o3
    products as p1,p2,p3"""

    column_alias="""
    please consider the table.column alias:
    orders.status as s1,s2,s3
    orders.total_amount as t1,t2,t3"""
    
    # Example query description 1: Simple query
    query_description_1 = """
    - Find all customers who have placed orders in the last 30 days
    - Include their names, emails, and the total number of orders they've placed
    - Sort by the number of orders in descending order
    """
    
    # Example query description 2: More complex query
    query_description_2 = """
    - Calculate the revenue per product category for the current year
    - Include only completed orders
    - Show the category name, total revenue, and number of items sold
    - Sort by total revenue in descending order
    """
    
    # Generate and print SQL queries
    # sql_query_1 = generate_sql_query(schema, query_description_1)
    # print("Query 1:")
    # print(sql_query_1)
    # print("\n")
    
    sql_query_2 = generate_sql_query(schemaStr, 'get all o1', table_alias=table_alias)
    print("Query 2:")
    print(sql_query_2)

    #can you recommend a techy looking guitar
    #please order me two motherboard guitar, my name is jack
    #analyze our orders and draw me a graph of sales by month and project next months sales