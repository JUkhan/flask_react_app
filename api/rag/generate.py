### Generate

from langchain import hub
from langchain_core.output_parsers import StrOutputParser
from llm import llm


# Post-processing
def format_docs(docs):
    return "\n\n".join(doc.page_content for doc in docs)

def generate(state):
    """
    Generate answer

    Args:
        state (dict): The current graph state

    Returns:
        state (dict): New key added to state, generation, that contains LLM generation
    """
    
    
    # Prompt
    prompt = hub.pull("rlm/rag-prompt")

    # Chain
    rag_chain = prompt | llm | StrOutputParser()

    print("---GENERATE---")
    question = state["question"]
    documents = state["documents"]
    
    # RAG generation
    docs_txt = format_docs(documents)
    generation = rag_chain.invoke({"context": docs_txt, "question": question})
    return {"documents": documents, "question": question, "generation": generation}
