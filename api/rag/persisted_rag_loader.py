from langchain_chroma import Chroma
from langchain_google_genai import GoogleGenerativeAIEmbeddings
import os

# Method 1: Simple function to load persisted retriever
def load_retriever_from_persist_dir(persist_directory: str, 
                                   collection_name: str = "rag-chroma",
                                   embedding_model: str = "models/embedding-001"):
    """
    Load a retriever from a persisted Chroma directory.
    
    Args:
        persist_directory: Path to the persisted Chroma database
        collection_name: Name of the collection (must match the original)
        embedding_model: Embedding model used (must match the original)
    
    Returns:
        retriever: LangChain retriever object
    """
    # Initialize the same embeddings used during creation
    embeddings = GoogleGenerativeAIEmbeddings(model=embedding_model)
    
    # Load the persisted vectorstore
    vectorstore = Chroma(
        persist_directory=persist_directory,
        collection_name=collection_name,
        embedding_function=embeddings
    )
    
    # Create and return retriever
    retriever = vectorstore.as_retriever()
    return retriever, vectorstore


# Method 2: Enhanced class-based approach
class PersistedRAGLoader:
    """Class to handle loading and managing persisted RAG indices."""
    
    def __init__(self, persist_directory: str,
                 collection_name: str = "rag-chroma", 
                 embedding_model: str = "models/embedding-001"):
        self.persist_directory = persist_directory
        self.collection_name = collection_name
        self.embedding_model = embedding_model
        self.embeddings = GoogleGenerativeAIEmbeddings(model=embedding_model)
        self.vectorstore = None
        self.retriever = None
    
    def load(self):
        """Load the persisted vectorstore and create retriever."""
        if not os.path.exists(self.persist_directory):
            raise FileNotFoundError(f"Persist directory not found: {self.persist_directory}")
        
        self.vectorstore = Chroma(
            persist_directory=self.persist_directory,
            collection_name=self.collection_name,
            embedding_function=self.embeddings
        )
        
        self.retriever = self.vectorstore.as_retriever()
        print(f"Loaded vectorstore from {self.persist_directory}")
        return self.retriever
    
    def query(self, query: str, k: int = 4):
        """Query the loaded retriever."""
        if not self.retriever:
            raise ValueError("Retriever not loaded! Call load() first.")
        return self.retriever.invoke(query, k=k)
    
    def get_collection_info(self):
        """Get information about the loaded collection."""
        if not self.vectorstore:
            raise ValueError("Vectorstore not loaded! Call load() first.")
        
        collection = self.vectorstore._collection
        return {
            "count": collection.count(),
            "name": collection.name,
            "metadata": collection.metadata
        }


# Method 3: Enhanced RAGIndexBuilder with load capability
class EnhancedRAGIndexBuilder:
    """Enhanced version that can both create and load persisted indices."""
    
    def __init__(self, embedding_model: str = "models/embedding-001"):
        self.embedding_model = embedding_model
        self.embeddings = GoogleGenerativeAIEmbeddings(model=embedding_model)
        self.vectorstore = None
        self.retriever = None
    
    def load_persisted_index(self, persist_directory: str, 
                           collection_name: str = "rag-chroma"):
        """Load a previously persisted index."""
        if not os.path.exists(persist_directory):
            raise FileNotFoundError(f"Directory not found: {persist_directory}")
        
        self.vectorstore = Chroma(
            persist_directory=persist_directory,
            collection_name=collection_name,
            embedding_function=self.embeddings
        )
        
        self.retriever = self.vectorstore.as_retriever()
        print(f"Successfully loaded index from {persist_directory}")
        return self.retriever
    
    def query(self, query: str, k: int = 4):
        """Query the retriever."""
        if not self.retriever:
            raise ValueError("No index loaded! Use load_persisted_index() first.")
        return self.retriever.invoke(query, k=k)


# Example usage and testing
if __name__ == "__main__":
    persist_dir = "./chroma_db"
    
    # Method 1: Simple function approach
    print("=== Method 1: Simple Function ===")
    try:
        retriever, vectorstore = load_retriever_from_persist_dir(
            persist_directory=persist_dir,
            collection_name="lilian-weng-rag"  # Use your collection name
        )
        
        # Test query
        results = retriever.get_relevant_documents("What are AI agents?", k=2)
        print(f"Found {len(results)} results")
        for i, doc in enumerate(results):
            print(f"Result {i+1}: {doc.page_content[:100]}...")
            
    except Exception as e:
        print(f"Method 1 failed: {e}")
    
    print("\n=== Method 2: Class-based Loader ===")
    try:
        loader = PersistedRAGLoader(
            persist_directory=persist_dir,
            collection_name="lilian-weng-rag"
        )
        
        retriever = loader.load()
        
        # Get collection info
        info = loader.get_collection_info()
        print(f"Collection info: {info}")
        
        # Query
        results = loader.query("What is prompt engineering?", k=2)
        print(f"Found {len(results)} results")
        
    except Exception as e:
        print(f"Method 2 failed: {e}")
    
    print("\n=== Method 3: Enhanced Builder ===")
    try:
        builder = EnhancedRAGIndexBuilder()
        retriever = builder.load_persisted_index(
            persist_directory=persist_dir,
            collection_name="lilian-weng-rag"
        )
        
        results = builder.query("adversarial attacks on LLMs", k=2)
        print(f"Found {len(results)} results")
        
    except Exception as e:
        print(f"Method 3 failed: {e}")


# Quick utility function for common use case
def quick_load_retriever(persist_dir: str, collection_name: str = "rag-chroma"):
    """Quick utility to load retriever with minimal code."""
    embeddings = GoogleGenerativeAIEmbeddings(model="models/embedding-001")
    vectorstore = Chroma(
        persist_directory=persist_dir,
        collection_name=collection_name,
        embedding_function=embeddings
    )
    return vectorstore.as_retriever()


# Example of checking what collections exist in a directory
def list_collections_in_persist_dir(persist_directory: str):
    """List all collections in a persisted directory."""
    try:
        embeddings = GoogleGenerativeAIEmbeddings(model="models/embedding-001")
        
        # This is a bit tricky with Chroma - you need to know collection names
        # Alternatively, you can check the directory structure
        import sqlite3
        
        db_path = os.path.join(persist_directory, "chroma.sqlite3")
        if os.path.exists(db_path):
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
            tables = cursor.fetchall()
            conn.close()
            print(f"Tables in database: {tables}")
        else:
            print("No SQLite database found in persist directory")
            
    except Exception as e:
        print(f"Error listing collections: {e}")


# Usage examples:
"""
# Quick usage:
retriever = quick_load_retriever("./chroma_db", "rag-chroma")

# Or with error handling:
try:
    loader = PersistedRAGLoader("./chroma_db", "rag-chroma")
    retriever = loader.load()
    results = loader.query("your question here")
except FileNotFoundError:
    print("Persisted index not found. You need to create it first.")
"""