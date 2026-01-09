import json
import os
import numpy as np
from rag_pipeline import load_products, chunk_documents, build_vector_store
from langchain_ollama import OllamaEmbeddings
from langchain_chroma import Chroma


# def print_chunks():
#     """Print documents after chunking to visualize the structure."""
#     data_file = os.path.join(os.path.dirname(__file__), "data.json")
#     
#     print("=" * 80)
#     print("Loading products...")
#     print("=" * 80)
#     documents = load_products(data_file, limit=5)
#     print(f"Loaded {len(documents)} products\n")
#     
#     print("=" * 80)
#     print("Original Documents (before chunking):")
#     print("=" * 80)
#     for i, doc in enumerate(documents, 1):
#         print(f"\n--- Document {i} ---")
#         print(f"FUID: {doc.metadata.get('fuid', 'N/A')}")
#         print(f"Product: {doc.metadata.get('product', 'N/A')}")
#         print(f"Platform: {doc.metadata.get('platform', 'N/A')}")
#         print(f"Content Length: {len(doc.page_content)} characters")
#         print(f"Content Preview (first 200 chars):")
#         print(doc.page_content[:200] + "..." if len(doc.page_content) > 200 else doc.page_content)
#     
#     print("\n" + "=" * 80)
#     print("Chunking documents...")
#     print("=" * 80)
#     chunks = chunk_documents(documents)
#     print(f"Created {len(chunks)} chunks from {len(documents)} documents\n")
#     
#     print("=" * 80)
#     print("Chunked Documents:")
#     print("=" * 80)
#     
#     current_fuid = None
#     chunk_num = 0
#     
#     for i, chunk in enumerate(chunks, 1):
#         fuid = chunk.metadata.get('fuid', 'N/A')
#         
#         if fuid != current_fuid:
#             if current_fuid is not None:
#                 print()  # Add spacing between products
#             current_fuid = fuid
#             chunk_num = 0
#             print(f"\n{'='*80}")
#             print(f"Product FUID: {fuid}")
#             print(f"Product Name: {chunk.metadata.get('product', 'N/A')}")
#             print(f"Platform: {chunk.metadata.get('platform', 'N/A')}")
#             print(f"{'='*80}")
#         
#         chunk_num += 1
#         print(f"\n--- Chunk {chunk_num} (Total Chunk #{i}) ---")
#         print(f"Metadata: {chunk.metadata}")
#         print(f"Content Length: {len(chunk.page_content)} characters")
#         print(f"Content:")
#         print("-" * 80)
#         print(chunk.page_content)
#         print("-" * 80)
#     
#     print("\n" + "=" * 80)
#     print("Summary:")
#     print("=" * 80)
#     print(f"Total Products: {len(documents)}")
#     print(f"Total Chunks: {len(chunks)}")
#     print(f"Average Chunks per Product: {len(chunks) / len(documents):.2f}")
#     
#     # Show chunk size distribution
#     chunk_sizes = [len(chunk.page_content) for chunk in chunks]
#     print(f"\nChunk Size Statistics:")
#     print(f"  Min: {min(chunk_sizes)} characters")
#     print(f"  Max: {max(chunk_sizes)} characters")
#     print(f"  Average: {sum(chunk_sizes) / len(chunk_sizes):.2f} characters")


def print_vector_store():
    """Print vector store structure with embeddings."""
    data_file = os.path.join(os.path.dirname(__file__), "data.json")
    persist_dir = os.path.join(os.path.dirname(__file__), "chroma")
    
    print("=" * 80)
    print("Loading products and building vector store...")
    print("=" * 80)
    
    documents = load_products(data_file, limit=5)
    print(f"Loaded {len(documents)} products")
    
    chunks = chunk_documents(documents)
    print(f"Created {len(chunks)} chunks")
    
    # Build or load vector store
    if os.path.exists(persist_dir) and os.listdir(persist_dir):
        print("Loading existing vector store...")
        embeddings = OllamaEmbeddings(model="nomic-embed-text")
        vector_store = Chroma(
            persist_directory=persist_dir,
            embedding_function=embeddings,
            collection_name="product_longdescriptions"
        )
    else:
        print("Building new vector store...")
        vector_store = build_vector_store(chunks, persist_dir)
    
    print(f"Vector store ready!\n")
    
    # Get collection info
    collection = vector_store._collection
    count = collection.count()
    print("=" * 80)
    print(f"Vector Store Information:")
    print("=" * 80)
    print(f"Total documents in collection: {count}")
    print(f"Collection name: {collection.name}\n")
    
    # Get first 5 items with their embeddings
    print("=" * 80)
    print("First 5 Elements in Vector Store:")
    print("=" * 80)
    
    # Get all data from collection (including embeddings)
    results = collection.get(limit=5, include=['embeddings', 'documents', 'metadatas'])
    
    ids = results.get('ids', [])
    metadatas = results.get('metadatas', [])
    documents_text = results.get('documents', [])
    embeddings_list = results.get('embeddings', [])
    
    for i in range(min(5, len(ids))):
        print(f"\n{'='*80}")
        print(f"Element #{i+1}")
        print(f"{'='*80}")
        print(f"ID: {ids[i]}")
        print(f"\nMetadata:")
        for key, value in metadatas[i].items():
            print(f"  {key}: {value}")
        
        print(f"\nDocument Content:")
        print("-" * 80)
        print(documents_text[i])
        print("-" * 80)
        
        if embeddings_list is not None and len(embeddings_list) > i:
            embedding = np.array(embeddings_list[i])
            print(f"\nEmbedding:")
            print(f"  Shape: {embedding.shape}")
            print(f"  Dtype: {embedding.dtype}")
            print(f"  First 10 values: {embedding[:10]}")
            print(f"  Last 10 values: {embedding[-10:]}")
            print(f"  Min value: {embedding.min():.6f}")
            print(f"  Max value: {embedding.max():.6f}")
            print(f"  Mean value: {embedding.mean():.6f}")
            print(f"  Norm (L2): {np.linalg.norm(embedding):.6f}")
        else:
            print("\nEmbedding: Not available (may need to regenerate)")
    
    print("\n" + "=" * 80)
    print("Summary:")
    print("=" * 80)
    if embeddings_list is not None and len(embeddings_list) > 0:
        embedding_dim = len(embeddings_list[0])
        print(f"Embedding dimension: {embedding_dim}")
        print(f"Total vectors shown: {min(5, len(ids))}")
        print(f"Total vectors in store: {count}")
    else:
        print("Embeddings not available in collection")
        print(f"Total vectors shown: {min(5, len(ids))}")
        print(f"Total vectors in store: {count}")


if __name__ == "__main__":
    print_vector_store()

