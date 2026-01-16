import os
import boto3
import requests
from typing import List, Dict
from langchain_ollama import OllamaLLM
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.documents import Document

# AWS S3 Vectors configuration
VECTOR_BUCKET = "rag-testing"
INDEX_NAME = "rag-index"
REGION = "us-east-2"
EMBED_DIM = 512

# Ollama configuration
OLLAMA_URL = os.environ.get("OLLAMA_URL", "http://localhost:11434")
EMBED_MODEL = "nomic-embed-text"
LLM_MODEL = "llama3.2"


def get_embedding(text: str) -> List[float]:
    """Get embedding from Ollama with 512 dimensions."""
    response = requests.post(
        f"{OLLAMA_URL}/api/embeddings",
        json={"model": EMBED_MODEL, "prompt": text}
    )
    response.raise_for_status()
    embedding = response.json()["embedding"]
    
    # Ensure 512 dimensions
    if len(embedding) > EMBED_DIM:
        embedding = embedding[:EMBED_DIM]
    elif len(embedding) < EMBED_DIM:
        embedding = embedding + [0.0] * (EMBED_DIM - len(embedding))
    
    return embedding


def query_s3_vectors(query: str, k: int = 5, fuid: str = None) -> List[Dict]:
    """Query S3 Vector Store and return results."""
    s3vectors = boto3.client("s3vectors", region_name=REGION)
    
    query_embedding = get_embedding(query)
    
    # AWS S3 Vectors expects queryVector as a dict with 'float32' key
    query_params = {
        "vectorBucketName": VECTOR_BUCKET,
        "indexName": INDEX_NAME,
        "queryVector": {
            "float32": query_embedding
        },
        "topK": k,
        "returnMetadata": True,
        "returnDistance": True
    }
    
    # Optional filter by FUID
    if fuid:
        query_params["filter"] = {
            "fuid": {"eq": fuid}
        }
    
    response = s3vectors.query_vectors(**query_params)
    return response.get("results", [])


def answer_query_with_s3(query: str, fuid: str = None, k: int = 5) -> str:
    """Answer a query using RAG with S3 Vector Store."""
    # Query S3 Vector Store
    results = query_s3_vectors(query, k=k, fuid=fuid)
    
    if not results:
        return "No relevant documents found in the vector store."
    
    # Convert results to Document format
    documents = []
    for result in results:
        metadata = result.get("metadata", {})
        chunk_text = metadata.get("chunk_text", "")
        doc = Document(
            page_content=chunk_text,
            metadata=metadata
        )
        documents.append(doc)
    
    # Create context from retrieved documents
    context = "\n\n".join([doc.page_content for doc in documents])
    
    # Generate answer using LLM
    llm = OllamaLLM(model=LLM_MODEL)
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", "Answer the question based only on the provided context. If the answer is not in the context, respond with: 'The documentation for this product does not contain that information.'"),
        ("human", "Context: {context}\n\nQuestion: {input}")
    ])
    
    chain = prompt | llm
    answer = chain.invoke({"context": context, "input": query})
    
    return answer


def main():
    """Main function to test S3 Vector Store queries."""
    import argparse
    
    parser = argparse.ArgumentParser(description="Test S3 Vector Store RAG")
    parser.add_argument("--query", type=str, required=True,
                       help="Query to search for")
    parser.add_argument("--fuid", type=str, default=None,
                       help="Optional FUID to filter by")
    parser.add_argument("--k", type=int, default=5,
                       help="Number of results to retrieve")
    args = parser.parse_args()
    
    print(f"Query: {args.query}")
    if args.fuid:
        print(f"Filtering by FUID: {args.fuid}")
    print(f"Retrieving top {args.k} results...\n")
    
    # Query S3 Vector Store
    results = query_s3_vectors(args.query, k=args.k, fuid=args.fuid)
    
    print(f"Found {len(results)} results:\n")
    for i, result in enumerate(results, 1):
        metadata = result.get("metadata", {})
        score = result.get("score", 0.0)
        print(f"Result {i} (score: {score:.4f}):")
        print(f"  FUID: {metadata.get('fuid', 'N/A')}")
        print(f"  Product: {metadata.get('product', 'N/A')}")
        print(f"  Chunk Index: {metadata.get('chunk_index', 'N/A')}")
        print(f"  Preview: {metadata.get('chunk_text', '')[:200]}...")
        print()
    
    # Generate answer
    print("=" * 60)
    print("Generating answer using RAG...")
    print("=" * 60)
    answer = answer_query_with_s3(args.query, fuid=args.fuid, k=args.k)
    print(f"\nAnswer:\n{answer}\n")


if __name__ == "__main__":
    main()
