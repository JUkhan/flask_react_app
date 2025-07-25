### Retrieval Grader
from langchain_core.prompts import ChatPromptTemplate
from pydantic import BaseModel, Field
from graph_state import GraphState
from persisted_rag_loader import PersistedRAGLoader
from langchain_tavily import TavilySearch
from langchain_core.documents import Document
from llm import llm


# Data model
class GradeDocuments(BaseModel):
    """Binary score for relevance check on retrieved documents."""

    binary_score: str = Field(
        description="Documents are relevant to the question, 'yes' or 'no'"
    )


def retrieve(state):
    """
    Retrieve documents

    Args:
        state (dict): The current graph state

    Returns:
        state (dict): New key added to state, documents, that contains retrieved documents
    """
    print("---RETRIEVE---")
    question = state["question"]

    # Retrieval
    loader = PersistedRAGLoader(
            persist_directory='./chroma_db',
            collection_name="lilian-weng-rag"
        )
    loader.load()
    documents = loader.query(question)
    return {"documents": documents, "question": question}

def web_search(state: GraphState):
    """
    Web search based on the re-phrased question.
    Args:
        state (dict): The current graph state
    Returns:
        state (dict): Updates documents key with appended web results
    """
    print("---WEB SEARCH---")
    question = state["question"]
    web_search_tool = TavilySearch(max_results=3)
    
    # Web search
    docs = web_search_tool.invoke({"query": question})
    #print(docs)
    web_results = "\n".join([d["content"] for d in docs['results']])
    web_results = Document(page_content=web_results)
    return {"documents": [web_results], "question": question}


  
def grade_documents(state: GraphState):
    """
    Determines whether the retrieved documents are relevant to the question.

    Args:
        state (dict): The current graph state

    Returns:
        state (dict): Updates documents key with only filtered relevant documents
    """
    # LLM with function call
    structured_llm_grader = llm.with_structured_output(GradeDocuments)

      # Prompt
    system = """You are a grader assessing relevance of a retrieved document to a user question. \n 
          If the document contains keyword(s) or semantic meaning related to the user question, grade it as relevant. \n
          It does not need to be a stringent test. The goal is to filter out erroneous retrievals. \n
          Give a binary score 'yes' or 'no' score to indicate whether the document is relevant to the question."""
    grade_prompt = ChatPromptTemplate.from_messages(
          [
              ("system", system),
              ("human", "Retrieved document: \n\n {document} \n\n User question: {question}"),
          ]
    )

    retrieval_grader = grade_prompt | structured_llm_grader

    print("---CHECK DOCUMENT RELEVANCE TO QUESTION---")
    question = state["question"]
    documents = state["documents"]

    # Score each doc
    filtered_docs = []
    for d in documents:
        score = retrieval_grader.invoke(
            {"question": question, "document": d.page_content}
        )
        grade = score.binary_score
        if grade == "yes":
            print("---GRADE: DOCUMENT RELEVANT---")
            filtered_docs.append(d)
        else:
            print("---GRADE: DOCUMENT NOT RELEVANT---")
            continue
    return {"documents": filtered_docs, "question": question}
      