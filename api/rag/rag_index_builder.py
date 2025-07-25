from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import WebBaseLoader
from langchain_chroma import Chroma
from langchain_google_genai import GoogleGenerativeAIEmbeddings
import os
from typing import List
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class RAGIndexBuilder:
    """A class to build and manage RAG indices from web documents."""
    
    def __init__(self, embedding_model: str = "models/embedding-001", 
                 chunk_size: int = 500, chunk_overlap: int = 50,
                 collection_name: str = "rag-chroma"):
        """
        Initialize the RAG Index Builder.
        
        Args:
            embedding_model: Google embedding model to use
            chunk_size: Size of text chunks for splitting
            chunk_overlap: Overlap between chunks (recommended: 10-20% of chunk_size)
            collection_name: Name for the Chroma collection
        """
        self.embedding_model = embedding_model
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        self.collection_name = collection_name
        
        # Initialize embeddings
        self.embeddings = GoogleGenerativeAIEmbeddings(model=embedding_model)
        
        # Initialize text splitter with overlap for better context preservation
        self.text_splitter = RecursiveCharacterTextSplitter.from_tiktoken_encoder(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap
        )
        
        self.vectorstore = None
        self.retriever = None
    
    def load_documents(self, urls: List[str]) -> List:
        """Load documents from a list of URLs."""
        logger.info(f"Loading {len(urls)} documents...")
        
        docs = []
        for url in urls:
            try:
                loader = WebBaseLoader(url)
                doc = loader.load()
                docs.extend(doc)
                logger.info(f"Successfully loaded: {url}")
            except Exception as e:
                logger.error(f"Failed to load {url}: {str(e)}")
        
        return docs
    
    def split_documents(self, docs: List) -> List:
        """Split documents into chunks."""
        logger.info("Splitting documents into chunks...")
        doc_splits = self.text_splitter.split_documents(docs)
        logger.info(f"Created {len(doc_splits)} document chunks")
        return doc_splits
    
    def build_vectorstore(self, doc_splits: List, persist_directory: str = None):
        """Build the vector store from document splits."""
        logger.info("Building vector store...")
        
        # Create vectorstore
        if persist_directory:
            self.vectorstore = Chroma.from_documents(
                documents=doc_splits,
                collection_name=self.collection_name,
                embedding=self.embeddings,
                persist_directory=persist_directory
            )
        else:
            self.vectorstore = Chroma.from_documents(
                documents=doc_splits,
                collection_name=self.collection_name,
                embedding=self.embeddings
            )
        
        # Create retriever
        self.retriever = self.vectorstore.as_retriever()
        logger.info("Vector store and retriever created successfully!")
    
    def build_index(self, urls: List[str], persist_directory: str = None):
        """Complete pipeline to build RAG index from URLs."""
        # Load documents
        docs = self.load_documents(urls)
        
        if not docs:
            raise ValueError("No documents were successfully loaded!")
        
        # Split documents
        doc_splits = self.split_documents(docs)
        
        # Build vectorstore
        self.build_vectorstore(doc_splits, persist_directory)
        
        return self.retriever
    
    def query(self, query: str, k: int = 4):
        """Query the retriever for relevant documents."""
        if not self.retriever:
            raise ValueError("Index not built yet! Call build_index() first.")
        
        return self.retriever.invoke(query, k=k)


# Example usage
if __name__ == "__main__":
    # URLs to index
    urls = [
        "https://lilianweng.github.io/posts/2023-06-23-agent/",
        "https://lilianweng.github.io/posts/2023-03-15-prompt-engineering/",
        "https://lilianweng.github.io/posts/2023-10-25-adv-attack-llm/",
    ]
    
    # Initialize builder with improved settings
    builder = RAGIndexBuilder(
        chunk_size=500,
        chunk_overlap=50,  # Adding overlap for better context
        collection_name="lilian-weng-rag"
    )
    
    try:
        # Build the index
        retriever = builder.build_index(urls, persist_directory="./chroma_db")
        
        # Test query
        test_query = "What are the key components of an AI agent?"
        results = builder.query(test_query)
        
        print(f"\nQuery: {test_query}")
        print(f"Found {len(results)} relevant documents:")
        for i, doc in enumerate(results[:2]):  # Show first 2 results
            print(f"\nResult {i+1}:")
            print(f"Content: {doc.page_content[:200]}...")
            print(f"Source: {doc.metadata.get('source', 'Unknown')}")
            
    except Exception as e:
        logger.error(f"Error building index: {str(e)}")


# Alternative: Simple function-based approach (similar to your original)
def build_simple_rag_index(urls: List[str], persist_directory: str = None):
    """Simple function to build RAG index - similar to your original approach."""
    
    # Set embeddings
    embd = GoogleGenerativeAIEmbeddings(model="models/embedding-001")
    
    # Load documents
    docs = [WebBaseLoader(url).load() for url in urls]
    docs_list = [item for sublist in docs for item in sublist]
    
    # Split with improved settings
    text_splitter = RecursiveCharacterTextSplitter.from_tiktoken_encoder(
        chunk_size=500, 
        chunk_overlap=50  # Added overlap
    )
    doc_splits = text_splitter.split_documents(docs_list)
    
    # Add to vectorstore
    if persist_directory:
        vectorstore = Chroma.from_documents(
            documents=doc_splits,
            collection_name="rag-chroma",
            embedding=embd,
            persist_directory=persist_directory
        )
    else:
        vectorstore = Chroma.from_documents(
            documents=doc_splits,
            collection_name="rag-chroma",
            embedding=embd,
        )
    
    retriever = vectorstore.as_retriever()
    return retriever, vectorstore