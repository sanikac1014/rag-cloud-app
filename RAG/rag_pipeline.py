import argparse
import json
import os
import requests
import boto3
from typing import List, Optional
from bs4 import BeautifulSoup
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_ollama import OllamaEmbeddings, OllamaLLM
from langchain_chroma import Chroma
from langchain_core.documents import Document
from langchain_core.prompts import ChatPromptTemplate
from langchain_classic.chains import create_retrieval_chain
from langchain_classic.chains.combine_documents import create_stuff_documents_chain
from langchain_classic.retrievers import ContextualCompressionRetriever
from langchain_community.cross_encoders import HuggingFaceCrossEncoder
from langchain_classic.retrievers.document_compressors import CrossEncoderReranker


def html_to_text(html_content: str) -> str:
    """Convert HTML content to plain text."""
    if not html_content or html_content.upper() == "NA":
        return ""
    soup = BeautifulSoup(html_content, "html.parser")
    return soup.get_text(separator=" ", strip=True)


def load_products(data_file: str, limit: int = 5) -> List[Document]:
    """Load products from data.json and create Document objects."""
    with open(data_file, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    fuid_mappings = data.get("fuid_mappings", {})
    documents = []
    count = 0
    
    for fuid_key, product_data in fuid_mappings.items():
        if count >= limit:
            break
        
        long_desc = product_data.get("longDescription", "")
        if not long_desc or long_desc.upper() == "NA":
            continue
        
        plain_text = html_to_text(long_desc)
        if not plain_text.strip():
            continue
        
        doc = Document(
            page_content=plain_text,
            metadata={
                "fuid": product_data.get("fuid", ""),
                "product": product_data.get("product", ""),
                "platform": product_data.get("platform", ""),
                "categories": product_data.get("categories", ""),
            }
        )
        documents.append(doc)
        count += 1
    
    return documents


def chunk_documents(documents: List[Document]) -> List[Document]:
    """Split documents into chunks."""
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=512,
        chunk_overlap=50
    )
    return text_splitter.split_documents(documents)


def build_vector_store(chunks: List[Document], persist_dir: str = "./chroma") -> Chroma:
    """Build and persist ChromaDB vector store."""
    embeddings = OllamaEmbeddings(model="nomic-embed-text")
    
    vector_store = Chroma.from_documents(
        documents=chunks,
        embedding=embeddings,
        collection_name="product_longdescriptions",
        persist_directory=persist_dir
    )
    
    return vector_store


def get_retriever(fuid: str, vector_store: Chroma, rerank: bool = False):
    """Get retriever filtered by FUID, optionally with re-ranking."""
    if rerank:
        base_retriever = vector_store.as_retriever(
            search_type="similarity",
            search_kwargs={"k": 8, "filter": {"fuid": fuid}}
        )
        compressor = CrossEncoderReranker(
            model=HuggingFaceCrossEncoder(model_name="BAAI/bge-reranker-large"),
            top_n=3
        )
        return ContextualCompressionRetriever(
            base_retriever=base_retriever,
            base_compressor=compressor
        )
    return vector_store.as_retriever(
        search_kwargs={"k": 3, "filter": {"fuid": fuid}}
    )


def answer_query(fuid: str, question: str, vector_store: Chroma, rerank: bool = False) -> str:
    """Answer a query using RAG for a specific product."""
    retriever = get_retriever(fuid, vector_store, rerank=rerank)
    llm = OllamaLLM(model="llama3.2")
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", "Answer the question based only on the provided context. If the answer is not in the context, respond with: 'The documentation for this product does not contain that information.'"),
        ("human", "Context: {context}\n\nQuestion: {input}")
    ])
    
    document_chain = create_stuff_documents_chain(llm, prompt)
    retrieval_chain = create_retrieval_chain(retriever, document_chain)
    
    result = retrieval_chain.invoke({"input": question})
    return result["answer"]


def main():
    """Main function to build index and test."""
    parser = argparse.ArgumentParser(description="RAG Pipeline with optional re-ranking")
    parser.add_argument("--rerank", type=str, default="false", 
                        help="Enable re-ranking (true/false)")
    args = parser.parse_args()
    
    rerank = args.rerank.lower() == "true"
    
    data_file = os.path.join(os.path.dirname(__file__), "data.json")
    persist_dir = os.path.join(os.path.dirname(__file__), "chroma")
    
    if os.path.exists(persist_dir) and os.listdir(persist_dir):
        print("Loading existing vector store...")
        embeddings = OllamaEmbeddings(model="nomic-embed-text")
        vector_store = Chroma(
            persist_directory=persist_dir,
            embedding_function=embeddings,
            collection_name="product_longdescriptions"
        )
    else:
        print("Building vector store...")
        documents = load_products(data_file, limit=5)
        print(f"Loaded {len(documents)} products")
        
        chunks = chunk_documents(documents)
        print(f"Created {len(chunks)} chunks")
        
        vector_store = build_vector_store(chunks, persist_dir)
        print("Vector store built and persisted")
    
    selected_fuid = "FUID-0014M:01501-4377-00"
    question = "What does this product do?"
    
    print(f"\nQuerying FUID: {selected_fuid}")
    print(f"Question: {question}")
    print(f"Re-ranking: {'Enabled' if rerank else 'Disabled'}")
    answer = answer_query(selected_fuid, question, vector_store, rerank=rerank)
    print(f"\nAnswer: {answer}")


# S3 Vector Store functions
S3_VECTOR_BUCKET = os.environ.get("S3_VECTOR_BUCKET", "rag-testing")
S3_INDEX_NAME = os.environ.get("S3_INDEX_NAME", "rag-index")
S3_REGION = os.environ.get("S3_VECTOR_REGION", "us-east-2")
S3_EMBED_DIM = 512
OLLAMA_EMBED_URL = os.environ.get("OLLAMA_URL", "http://localhost:11434")
OLLAMA_EMBED_MODEL = "nomic-embed-text"


def get_embedding_from_ollama(text: str) -> List[float]:
    """Get embedding from Ollama API with 512 dimensions.
    
    Note: nomic-embed-text outputs 768 dimensions. We truncate to 512
    to match S3 Vector Store requirements. For better results, consider
    using a model that natively outputs 512 dimensions or use PCA.
    """
    response = requests.post(
        f"{OLLAMA_EMBED_URL}/api/embeddings",
        json={"model": OLLAMA_EMBED_MODEL, "prompt": text}
    )
    response.raise_for_status()
    embedding = response.json()["embedding"]
    
    # Ensure 512 dimensions (truncate if larger, pad if smaller)
    if len(embedding) > S3_EMBED_DIM:
        embedding = embedding[:S3_EMBED_DIM]
    elif len(embedding) < S3_EMBED_DIM:
        embedding = embedding + [0.0] * (S3_EMBED_DIM - len(embedding))
    
    return embedding


def query_s3_vector_store(query: str, k: int = 5, fuid: Optional[str] = None) -> List[Document]:
    """Query S3 Vector Store and return Document objects."""
    s3vectors = boto3.client("s3vectors", region_name=S3_REGION)
    
    query_embedding = get_embedding_from_ollama(query)
    
    # AWS S3 Vectors expects queryVector as a dict with 'float32' key
    query_params = {
        "vectorBucketName": S3_VECTOR_BUCKET,
        "indexName": S3_INDEX_NAME,
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
    
    try:
        response = s3vectors.query_vectors(**query_params)
        results = response.get("results", [])
        
        # Convert to Document objects
        documents = []
        for result in results:
            metadata = result.get("metadata", {})
            chunk_text = metadata.get("chunk_text", "")
            
            doc = Document(
                page_content=chunk_text,
                metadata=metadata
            )
            documents.append(doc)
        
        return documents
    except Exception as e:
        print(f"Error querying S3 Vector Store: {e}")
        return []


def get_s3_retriever(fuid: Optional[str] = None, k: int = 5):
    """Get a retriever-like object that queries S3 Vector Store."""
    class S3Retriever:
        def __init__(self, fuid: Optional[str], k: int):
            self.fuid = fuid
            self.k = k
        
        def get_relevant_documents(self, query: str) -> List[Document]:
            return query_s3_vector_store(query, k=self.k, fuid=self.fuid)
    
    return S3Retriever(fuid, k)


def answer_query_with_s3(fuid: Optional[str], question: str, k: int = 5, rerank: bool = False) -> str:
    """Answer a query using RAG with S3 Vector Store."""
    # Query S3 Vector Store
    documents = query_s3_vector_store(question, k=k, fuid=fuid)
    
    if not documents:
        return "No relevant documents found in the vector store."
    
    # Apply re-ranking if requested
    if rerank:
        # Re-rank using cross-encoder
        reranker = HuggingFaceCrossEncoder(model_name="BAAI/bge-reranker-large")
        
        # Create pairs of query and documents
        pairs = [[question, doc.page_content] for doc in documents]
        scores = reranker.predict(pairs)
        
        # Sort by scores and take top k
        scored_docs = list(zip(documents, scores))
        scored_docs.sort(key=lambda x: x[1], reverse=True)
        documents = [doc for doc, score in scored_docs[:k]]
    
    # Create context from retrieved documents
    context = "\n\n".join([doc.page_content for doc in documents])
    
    # Generate answer using LLM
    llm = OllamaLLM(model="llama3.2")
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", "Answer the question based only on the provided context. If the answer is not in the context, respond with: 'The documentation for this product does not contain that information.'"),
        ("human", "Context: {context}\n\nQuestion: {input}")
    ])
    
    chain = prompt | llm
    answer = chain.invoke({"context": context, "input": question})
    
    return answer


if __name__ == "__main__":
    main()

