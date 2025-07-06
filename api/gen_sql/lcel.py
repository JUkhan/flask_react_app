"""
LangChain Examples with Gemini and LCEL (LangChain Expression Language)
"""

# First, install required packages:
# pip install langchain langchain-google-genai python-dotenv

import os
from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate, PromptTemplate
from langchain_core.output_parsers import StrOutputParser, PydanticOutputParser
from langchain_core.runnables import RunnablePassthrough, RunnableLambda
from langchain.schema import Document
from pydantic import BaseModel, Field
from typing import List

# Load environment variables
load_dotenv()

# Initialize Gemini model
llm = ChatGoogleGenerativeAI(
    model="gemini-1.5-flash",
    google_api_key=os.getenv("GOOGLE_API_KEY"),
    temperature=0.7
)

# =============================================================================
# Example 1: Basic LCEL Chain - Simple Q&A
# =============================================================================

def example_1_basic_chain():
    """Basic LCEL chain with prompt + model + output parser"""
    
    prompt = ChatPromptTemplate.from_template(
        "You are a helpful assistant. Answer the question: {question}"
    )
    
    # LCEL Chain: prompt | model | output_parser
    chain = prompt | llm | StrOutputParser()
    
    result = chain.invoke({"question": "What is the capital of France?"})
    print("Example 1 - Basic Chain:")
    print(result)
    print("-" * 50)

# =============================================================================
# Example 2: Multi-step Chain with Data Processing
# =============================================================================

def example_2_multi_step_chain():
    """Multi-step chain that processes data through multiple stages"""
    
    # Step 1: Summarize text
    summarize_prompt = ChatPromptTemplate.from_template(
        "Summarize the following text in 2-3 sentences:\n\n{text}"
    )
    
    # Step 2: Extract key points
    extract_prompt = ChatPromptTemplate.from_template(
        "Extract 3 key points from this summary:\n\n{summary}"
    )
    
    # LCEL Chain: First summarize, then extract key points
    chain = (
        {"text": RunnablePassthrough()}
        | RunnableLambda(lambda x: {"text": x["text"]})
        | summarize_prompt
        | llm
        | StrOutputParser()
        | (lambda summary: {"summary": summary})
        | extract_prompt
        | llm
        | StrOutputParser()
    )
    
    text = """
    Artificial Intelligence has revolutionized many industries in recent years. 
    From healthcare to finance, AI systems are being deployed to automate tasks, 
    improve decision-making, and enhance user experiences. Machine learning algorithms 
    can now process vast amounts of data to identify patterns and make predictions 
    with remarkable accuracy. However, the rapid advancement of AI also raises 
    important ethical questions about privacy, job displacement, and algorithmic bias 
    that society must address.
    """
    
    result = chain.invoke({"text": text})
    print("Example 2 - Multi-step Chain:")
    print(result)
    print("-" * 50)

# =============================================================================
# Example 3: Structured Output with Pydantic
# =============================================================================

class MovieReview(BaseModel):
    """Movie review structure"""
    title: str = Field(description="Movie title")
    rating: int = Field(description="Rating out of 10")
    pros: List[str] = Field(description="List of positive aspects")
    cons: List[str] = Field(description="List of negative aspects")
    recommendation: str = Field(description="Would you recommend this movie?")

def example_3_structured_output():
    """Chain that returns structured output using Pydantic"""
    
    parser = PydanticOutputParser(pydantic_object=MovieReview)
    
    prompt = ChatPromptTemplate.from_template(
        """
        Analyze the following movie review and extract structured information:
        
        {review_text}
        
        {format_instructions}
        """
    )
    
    chain = (
        {
            "review_text": RunnablePassthrough(),
            "format_instructions": lambda _: parser.get_format_instructions()
        }
        | prompt
        | llm
        | parser
    )
    
    review_text = """
    I just watched "The Matrix" and it was absolutely mind-blowing! The special effects 
    were groundbreaking for its time, and the philosophical themes about reality and 
    consciousness were fascinating. Keanu Reeves delivered a solid performance, and the 
    action sequences were incredible. However, some of the dialogue felt a bit cheesy, 
    and the pacing was slow in the middle. Overall, I'd definitely recommend it to 
    anyone who enjoys sci-fi films. I'd give it an 8 out of 10.
    """
    
    result = chain.invoke(review_text)
    print("Example 3 - Structured Output:")
    print(f"Title: {result.title}")
    print(f"Rating: {result.rating}/10")
    print(f"Pros: {result.pros}")
    print(f"Cons: {result.cons}")
    print(f"Recommendation: {result.recommendation}")
    print("-" * 50)

# =============================================================================
# Example 4: Conditional Chain (Routing)
# =============================================================================

def example_4_conditional_chain():
    """Chain that routes to different processors based on input type"""
    
    # Classification prompt
    classify_prompt = ChatPromptTemplate.from_template(
        """
        Classify the following text as either 'question', 'complaint', or 'compliment':
        
        Text: {text}
        
        Respond with only one word: question, complaint, or compliment
        """
    )
    
    # Different response templates
    question_prompt = ChatPromptTemplate.from_template(
        "Answer this question helpfully: {text}"
    )
    
    complaint_prompt = ChatPromptTemplate.from_template(
        "Address this complaint with empathy and solutions: {text}"
    )
    
    compliment_prompt = ChatPromptTemplate.from_template(
        "Respond graciously to this compliment: {text}"
    )
    
    def route_chain(classification_result):
        """Route to appropriate chain based on classification"""
        classification = classification_result["classification"].strip().lower()
        text = classification_result["text"]
        
        if "question" in classification:
            return question_prompt | llm | StrOutputParser()
        elif "complaint" in classification:
            return complaint_prompt | llm | StrOutputParser()
        else:
            return compliment_prompt | llm | StrOutputParser()
    
    # Main chain
    chain = (
        {"text": RunnablePassthrough()}
        | RunnableLambda(lambda x: {
            "text": x["text"],
            "classification": (classify_prompt | llm | StrOutputParser()).invoke({"text": x["text"]})
        })
        | RunnableLambda(route_chain)
        | RunnableLambda(lambda chain_func: chain_func.invoke({"text": "How can I improve my Python skills?"}))
    )
    
    # Test with different types of input
    inputs = [
        "How can I improve my Python skills?",
        "Your service is terrible and I want a refund!",
        "Thank you for the excellent customer support!"
    ]
    
    print("Example 4 - Conditional Chain:")
    for i, input_text in enumerate(inputs, 1):
        # Simplified version for demo
        classify_result = (classify_prompt | llm | StrOutputParser()).invoke({"text": input_text})
        print(f"Input {i}: {input_text}")
        print(f"Classification: {classify_result}")
        
        if "question" in classify_result.lower():
            response = (question_prompt | llm | StrOutputParser()).invoke({"text": input_text})
        elif "complaint" in classify_result.lower():
            response = (complaint_prompt | llm | StrOutputParser()).invoke({"text": input_text})
        else:
            response = (compliment_prompt | llm | StrOutputParser()).invoke({"text": input_text})
        
        print(f"Response: {response}")
        print("-" * 30)
    print("-" * 50)

# =============================================================================
# Example 5: RAG-like Chain with Document Processing
# =============================================================================

def example_5_rag_chain():
    """Simple RAG-like chain that processes documents and answers questions"""
    
    # Sample documents
    documents = [
        Document(page_content="Python is a high-level programming language known for its simplicity and readability."),
        Document(page_content="Machine learning is a subset of AI that enables computers to learn from data."),
        Document(page_content="LangChain is a framework for developing applications powered by language models."),
    ]
    
    def format_docs(docs):
        """Format documents for context"""
        return "\n\n".join([doc.page_content for doc in docs])
    
    def retrieve_docs(query):
        """Simple retrieval - in practice, you'd use vector search"""
        # Simple keyword matching for demo
        relevant_docs = []
        query_lower = query.lower()
        
        for doc in documents:
            if any(word in doc.page_content.lower() for word in query_lower.split()):
                relevant_docs.append(doc)
        
        return relevant_docs if relevant_docs else documents
    
    # RAG prompt
    rag_prompt = ChatPromptTemplate.from_template(
        """
        Answer the question based on the following context:
        
        Context:
        {context}
        
        Question: {question}
        
        If the answer cannot be found in the context, say "I don't have enough information to answer this question."
        """
    )
    
    # LCEL RAG Chain
    rag_chain = (
        {"context": lambda x: format_docs(retrieve_docs(x["question"])), "question": RunnablePassthrough()}
        | rag_prompt
        | llm
        | StrOutputParser()
    )
    
    questions = [
        "What is Python?",
        "Tell me about machine learning",
        "What is the weather like today?"  # This should return "don't have enough information"
    ]
    
    print("Example 5 - RAG Chain:")
    for question in questions:
        result = rag_chain.invoke({"question": question})
        print(f"Q: {question}")
        print(f"A: {result}")
        print("-" * 30)
    print("-" * 50)

# =============================================================================
# Example 6: Parallel Chain Execution
# =============================================================================

def example_6_parallel_chains():
    """Execute multiple chains in parallel and combine results"""
    
    from langchain_core.runnables import RunnableParallel
    
    # Define different analysis chains
    sentiment_prompt = ChatPromptTemplate.from_template(
        "Analyze the sentiment of this text (positive/negative/neutral): {text}"
    )
    
    summary_prompt = ChatPromptTemplate.from_template(
        "Summarize this text in one sentence: {text}"
    )
    
    keywords_prompt = ChatPromptTemplate.from_template(
        "Extract 3 key words from this text: {text}"
    )
    
    # Parallel execution
    parallel_chain = RunnableParallel(
        sentiment=sentiment_prompt | llm | StrOutputParser(),
        summary=summary_prompt | llm | StrOutputParser(),
        keywords=keywords_prompt | llm | StrOutputParser()
    )
    
    # Combine results
    combine_prompt = ChatPromptTemplate.from_template(
        """
        Based on the following analysis of a text:
        
        Sentiment: {sentiment}
        Summary: {summary}
        Keywords: {keywords}
        
        Provide a brief overall assessment of the text.
        """
    )
    
    final_chain = (
        {"text": RunnablePassthrough()}
        | parallel_chain
        | combine_prompt
        | llm
        | StrOutputParser()
    )
    
    text = "I absolutely love this new restaurant! The food is incredible, the service is outstanding, and the atmosphere is perfect for a romantic dinner. Highly recommended!"
    
    result = final_chain.invoke(text)
    print("Example 6 - Parallel Chains:")
    print(result)
    print("-" * 50)

# =============================================================================
# Run Examples
# =============================================================================

if __name__ == "__main__":
    print("LangChain + Gemini + LCEL Examples")
    print("=" * 50)
    
    # Make sure to set your GOOGLE_API_KEY environment variable
    if not os.getenv("GOOGLE_API_KEY"):
        print("Please set your GOOGLE_API_KEY environment variable")
        exit(1)
    
    try:
        example_1_basic_chain()
        #example_2_multi_step_chain()
        #example_3_structured_output()
        #example_4_conditional_chain()
        #example_5_rag_chain()
        #example_6_parallel_chains()
        
    except Exception as e:
        print(f"Error running examples: {e}")
        print("Make sure you have set your GOOGLE_API_KEY and installed required packages")