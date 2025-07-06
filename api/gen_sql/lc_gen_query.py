from langchain.chat_models import init_chat_model
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from dotenv import load_dotenv
import re
from . import schema
import os

load_dotenv()
def get_llm():
    llm = init_chat_model(
            model="gemini-2.0-flash", 
            google_api_key=os.getenv("GOOGLE_API_KEY"),
            temperature=0.3, 
            model_provider="google_genai"
        )
    return llm

def get_table_name_prompt(schemaStr, query_description):
    tableNames = schema.extract_table_names(schemaStr)
    prompt = f"""
    Given this database table names with description([tableName] - [description]):
    ```
    {tableNames}
    ```

    Find expected table names that:
    {query_description}

    please only consider the given table names. Do not add any additional table names in your response.
    
    Please provide only the comma separated table names without any explanations.
    """
    print(prompt)
    return prompt

def get_query_prompt(tableNames, schemaStr, query_description, is_double_quoted_table_name=False):

    filteredSchema=schema.filter_schemas_by_table_names(tableNames, schemaStr)
    if not filteredSchema:
        filteredSchema='empty'
    doubleQuotedTableName =''
    if is_double_quoted_table_name:
        doubleQuotedTableName = 'Ensure all table names from the given schema are formatted with double quotation marks, following this pattern: "[tableName]".' 
    
    prompt = f"""
    Given this database schema:
    ```
    {filteredSchema}
    ```
    {doubleQuotedTableName}

    Generate a SQL query for postgresql that:
    {query_description}
    
    Only use table and column names that exist in the given database schema. Mismatched names will result in a fatal error when running the query.

    If no table names match the provided schema, or if the schema is empty, return: "Your query description is not sufficient to generate a valid query."

    Please provide only the SQL query without any explanations.
    """
    print(prompt)
    return prompt

def generate_sql_query(schemaStr, query_description, is_double_quoted_table_name=False):
    table_prompt = ChatPromptTemplate.from_template(
        get_table_name_prompt(schemaStr, query_description)
    )

    query_prompt = ChatPromptTemplate.from_template('{description}')
    llm = get_llm()
    chain =(
        table_prompt
        | llm
        | StrOutputParser()
        | (lambda tableNames: {"description": get_query_prompt(tableNames, schemaStr, query_description, is_double_quoted_table_name)})
        | query_prompt
        | llm
        | StrOutputParser()
    )

    result = chain.invoke({})
    return extract_sql(result)

def extract_sql(text):
    sql_regex = r'```sql\s*([\s\S]*?)\s*```'
    match = re.search(sql_regex, text)
    if not match:
        return ''
    if not match.group(1):
        return ''
    return match.group(1).strip()
     
if __name__ == "__main__":
    schemaStr=schema.get_schema()
    res=generate_sql_query(schemaStr,'find all mads')
    print(res)