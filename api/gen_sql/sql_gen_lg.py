import os
import re
from dotenv import load_dotenv
from typing import Annotated, Sequence
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages
from langchain.chat_models import init_chat_model
#from pydantic import BaseModel, Field
from langchain_core.messages import HumanMessage,AIMessage, SystemMessage, BaseMessage
from typing_extensions import TypedDict
#from langchain_openai import ChatOpenAI
from langgraph.checkpoint.memory import InMemorySaver
#from langgraph.types import Command, interrupt
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from gen_sql.schema import  get_schema, extract_table_names, filter_schemas_by_table_names
load_dotenv()

db_system=os.getenv('DB_SYSTEM', 'sqlite')

class State(TypedDict):
  messages: Annotated[Sequence[BaseMessage], add_messages]
  schema: str
  next: str # ''|query|extended_query

llm = init_chat_model(
        model="gemini-2.0-flash",
        #temperature=0.7, 
        model_provider="google_genai"
)

def analyze_input(state:State):
  if not state["messages"]:
    return state      
  last_message = state["messages"][-1]
  if isinstance(last_message, HumanMessage):
    content = last_message.content.lower()
    intent = 'extended_query'
    if any(word in content for word in ["find", "get", "calculate","select"]):
        intent = 'table_names'
    if intent == 'table_names':
      if(len(state['messages']) >= 30):
        del state['messages'][10:]
        print('raised state overflow:',len(state['messages']))
        print('*'*80)
    return {'next':intent }
  return state

def get_table_names(state:State):
  last_message = state["messages"][-1]
  system_message = SystemMessage(content="you are my assistant, please answer my question to the best of your ability.")
  human_message = HumanMessage(content=f"""
     Given this database table names with description([tableName] - [description]):
    ```
    {extract_table_names(get_schema())}
    default -
    ```
    Find expected table names that would be used to create sql query using the following query description:
    {last_message.content}

    If no table names match the provided table names, return: ""
    Please provide only the comma separated table names without any explanations.
    """)  
                            
  reply = llm.invoke([system_message, human_message])
  print('TABLES:',reply.content)
  schema = filter_schemas_by_table_names(reply.content, get_schema())
 
  if not schema:
    return{
      'messages':[AIMessage(content='Your query description is not sufficient to generate a valid query.')],
      'next':'check_reply'
    }
  return {
    'schema': schema,
    'next': 'query'
  }


def get_query(state:State):
  last_message = state["messages"][-1]
  
  system_message = SystemMessage(content="you are my assistant, please answer my question to the best of your ability.")
  human_message = HumanMessage(content=f"""
    Given this database schema:
    ```
    {state.get('schema')}
    ```                           
    Generate a SQL query for {db_system} using the following query description:
    {last_message.content}

    When writing SQL queries with aggregate functions, always assign meaningful alias names to aggregated columns using AS. For example: SELECT COUNT(*) AS total_records, AVG(price) AS average_price, SUM(quantity) AS total_quantity FROM table_name.
    Only use table and column names that exist in the given database schema. Mismatched names will result in a fatal error when running the query.
    If no table names match the provided schema, return: "Your query description is not sufficient to generate a valid query."

    Please provide only the SQL query without any explanations.
    """)
  state['messages'].append(system_message)
  state['messages'].append(human_message)
  return get_extended_query(state) 

def get_extended_query(state: State):
  items=state['messages']
  idx=0
  for it in reversed(items):
     idx +=1
     if isinstance(it, SystemMessage):
        break
  items=items[-idx:]
  return {'messages':[llm.invoke(items)]}


graph_builder = StateGraph(State)

graph_builder.add_node('analyze_input', analyze_input)
graph_builder.add_node('table_names', get_table_names)
graph_builder.add_node('query', get_query)
graph_builder.add_node('extended_query', get_extended_query)

graph_builder.add_edge(START, 'analyze_input')
graph_builder.add_conditional_edges(
  'analyze_input',
   lambda state: state.get("next"),
   {'table_names':'table_names','extended_query':'extended_query'}
  )
graph_builder.add_conditional_edges(
  'table_names',
   lambda state: state.get("next"),
    {'check_reply':END,'query':'query'}
  )
graph_builder.add_edge('extended_query', END)
graph_builder.add_edge('query', END)

graph = graph_builder.compile(checkpointer=InMemorySaver())

def get_messages(thread_id):
   print('db_system: ', db_system)
   if not thread_id:
        return []
   print(thread_id)
   config = {"configurable": {"thread_id": thread_id}}
   current_state = graph.get_state(config)
   if not current_state.values:
      return []
   
   messages=current_state.values['messages']
   messages=[msg for msg in messages if not (isinstance(msg, SystemMessage) or msg.content.strip().startswith('Given this database schema:'))]
   res=[]
   
   for msg in messages:
      if isinstance(msg, HumanMessage):
        res.append({'text':msg.content, 'sender': 'user' })
      else:
         res.append({'text':extract(msg.content), 'sender': 'bot' })
   return res

def run_qgn_chatbot(user_input, thread_id):
    if not thread_id:
        thread_id = "1"
    
    config = {"configurable": {"thread_id": thread_id}}
    current_state = graph.get_state(config)
    # Initialize state if it doesn't exist
    if not current_state.values:
        initial_state = {
            "messages": [],
            "schema": '',
            "next": ''
        }
    else:
        initial_state = current_state.values

    user_message = HumanMessage(content=user_input)
    initial_state["messages"].append(user_message)
    response = graph.invoke(initial_state, config=config)
    print("len:", len(response["messages"]))
    return response["messages"][-1].content

def extract(text):
    json_regex = r'```(?:sqlite|sql)\s*([\s\S]*?)\s*```'
    match = re.search(json_regex, text)
    
    if not match:
        return text
    
    if not match.group(1):
        return text
    
    return match.group(1).strip()
    
def main():
  config = {"configurable": {"thread_id": '1'}}
  
  while True:
    current_state = graph.get_state(config)
    # Initialize state if it doesn't exist
    if not current_state.values:
        initial_state = {
            "messages": [],
            "schema": '',
            "next": ''
        }
    else:
        initial_state = current_state.values
    user_input=input('You: ')
    if user_input=='q':
      break
    if user_input=='m':
      print(graph.get_state(config))
      continue
    print('message size: ', len(initial_state["messages"]))
    human_message = HumanMessage(content=user_input)
    initial_state["messages"].append(human_message)
    response = graph.invoke(initial_state, config=config)
    print(f'Ai: {response["messages"][-1].content}')

# query_description_1 = """
#     - Find all customers who have placed orders in the last 30 days
#     - Include their names, emails, and the total number of orders they've placed
#     - Sort by the number of orders in descending order
#     """
    
#     # Example query description 2: More complex query
# query_description_2 = """
#     - Calculate the revenue per product category for the current year
#     - Include only completed orders
#     - Show the category name, total revenue, and number of items sold
#     - Sort by total revenue in descending order
#     """
if __name__=='__main__':
  main()
