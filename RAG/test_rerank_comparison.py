"""
Script to compare original retrieval results vs re-ranked results.
"""
import os
from langchain_ollama import OllamaEmbeddings
from langchain_chroma import Chroma
from rag_pipeline import get_retriever


def main():
    persist_dir = os.path.join(os.path.dirname(__file__), "chroma")
    
    print("Loading vector store...")
    embeddings = OllamaEmbeddings(model="nomic-embed-text")
    vector_store = Chroma(
        persist_directory=persist_dir,
        embedding_function=embeddings,
        collection_name="product_longdescriptions"
    )
    
    # Get total number of chunks
    # collection = vector_store._collection
    # total_chunks = collection.count()
    # print(f"Total number of chunks in vector store: {total_chunks}")
    
    fuid = "FUID-0014M:01501-4377-00"
    query = "What is the calender link for technical support queries"
    
    print(f"\nFUID: {fuid}")
    print(f"Query: {query}")
    
    # Original retrieval (no re-ranking)
    print("\n" + "="*60)
    print("ORIGINAL RETRIEVAL (k=5, no re-ranking)")
    print("="*60)
    original_retriever = get_retriever(fuid, vector_store, rerank=False)
    original_docs = original_retriever.invoke(query)
    
    for i, doc in enumerate(original_docs, 1):
        print(f"\n--- Document {i} ---")
        print(f"Content: {doc.page_content[:200]}...")
        print(f"Metadata: {doc.metadata}")
    
    # Re-ranked retrieval
    print("\n" + "="*60)
    print("RE-RANKED RETRIEVAL (initial k=10, top_n=5 after re-ranking)")
    print("="*60)
    reranked_retriever = get_retriever(fuid, vector_store, rerank=True)
    reranked_docs = reranked_retriever.invoke(query)
    
    for i, doc in enumerate(reranked_docs, 1):
        print(f"\n--- Document {i} ---")
        print(f"Content: {doc.page_content[:200]}...")
        print(f"Metadata: {doc.metadata}")
    
    print("\n" + "="*60)
    print("COMPARISON SUMMARY")
    print("="*60)
    print(f"Original results: {len(original_docs)} documents")
    print(f"Re-ranked results: {len(reranked_docs)} documents")


if __name__ == "__main__":
    main()

