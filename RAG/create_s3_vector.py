import json
import os
import boto3
from typing import List, Dict
from bs4 import BeautifulSoup
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_ollama import OllamaEmbeddings
import requests

# AWS S3 Vectors configuration
VECTOR_BUCKET = "rag-testing"
INDEX_NAME = "rag-index"
REGION = "us-east-2"
EMBED_DIM = 512

# Ollama configuration
OLLAMA_URL = os.environ.get("OLLAMA_URL", "http://localhost:11434")
EMBED_MODEL = "nomic-embed-text"  # Note: outputs 768 dims, will truncate/pad to 512


def html_to_text(html_content: str) -> str:
    """Convert HTML content to plain text."""
    if not html_content or html_content.upper() == "NA":
        return ""
    soup = BeautifulSoup(html_content, "html.parser")
    return soup.get_text(separator=" ", strip=True)


def get_embedding(text: str) -> List[float]:
    """Get embedding from Ollama with 512 dimensions.
    
    Note: nomic-embed-text outputs 768 dimensions. We truncate to 512
    to match S3 Vector Store requirements. For better results, consider
    using a model that natively outputs 512 dimensions or use PCA.
    """
    # Use Ollama API directly to get embeddings
    response = requests.post(
        f"{OLLAMA_URL}/api/embeddings",
        json={"model": EMBED_MODEL, "prompt": text}
    )
    response.raise_for_status()
    embedding = response.json()["embedding"]
    
    # If embedding is not 512 dimensions, truncate or pad
    if len(embedding) > EMBED_DIM:
        # Truncate to 512 dimensions (first 512 components)
        embedding = embedding[:EMBED_DIM]
    elif len(embedding) < EMBED_DIM:
        # Pad with zeros if needed (unlikely but handle it)
        embedding = embedding + [0.0] * (EMBED_DIM - len(embedding))
    
    return embedding


def load_products(data_file: str, limit: int = None) -> List[Dict]:
    """Load products from data.json."""
    with open(data_file, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    fuid_mappings = data.get("fuid_mappings", {})
    products = []
    count = 0
    
    for fuid_key, product_data in fuid_mappings.items():
        if limit and count >= limit:
            break
        
        long_desc = product_data.get("longDescription", "")
        if not long_desc or long_desc.upper() == "NA":
            continue
        
        plain_text = html_to_text(long_desc)
        if not plain_text.strip():
            continue
        
        products.append({
            "fuid": product_data.get("fuid", ""),
            "product": product_data.get("product", ""),
            "platform": product_data.get("platform", ""),
            "categories": product_data.get("categories", ""),
            "company": product_data.get("company", ""),
            "company_id": product_data.get("company_id", ""),
            "product_id": product_data.get("product_id", ""),
            "version": product_data.get("version", ""),
            "shortDescription": product_data.get("shortDescription", ""),
            "url": product_data.get("url", ""),
            "text": plain_text
        })
        count += 1
    
    return products


def chunk_text(text: str, chunk_size: int = 512, chunk_overlap: int = 50) -> List[str]:
    """Split text into chunks."""
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        length_function=len
    )
    chunks = splitter.split_text(text)
    return chunks


def create_vectors_for_product(product: Dict) -> List[Dict]:
    """Create vector embeddings for all chunks of a product."""
    chunks = chunk_text(product["text"])
    vectors = []
    
    for idx, chunk_content in enumerate(chunks):
        embedding = get_embedding(chunk_content)
        
        vector_id = f"{product['fuid']}_chunk_{idx:03d}"
        
        metadata = {
            "fuid": product["fuid"],
            "product_id": product["product_id"],
            "product": product["product"],
            "company": product["company"],
            "company_id": product["company_id"],
            "platform": product["platform"],
            "categories": str(product["categories"]),
            "version": product["version"],
            "shortDescription": product["shortDescription"],
            "url": product["url"],
            "chunk_index": idx,
            "chunk_text": chunk_content  # Store full chunk text in metadata
        }
        
        vectors.append({
            "key": vector_id,
            "data": embedding,
            "metadata": metadata
        })
    
    return vectors


def ingest_to_s3_vectors(vectors: List[Dict], batch_size: int = 100):
    """Ingest vectors into S3 Vector Store in batches."""
    s3vectors = boto3.client("s3vectors", region_name=REGION)
    
    total_vectors = len(vectors)
    print(f"Total vectors to ingest: {total_vectors}")
    
    for i in range(0, total_vectors, batch_size):
        batch = vectors[i:i + batch_size]
        print(f"Ingesting batch {i//batch_size + 1} ({len(batch)} vectors)...")
        
        try:
            response = s3vectors.put_vectors(
                vectorBucketName=VECTOR_BUCKET,
                indexName=INDEX_NAME,
                vectors=batch
            )
            print(f"  ✓ Successfully ingested {len(batch)} vectors")
        except Exception as e:
            print(f"  ✗ Error ingesting batch: {e}")
            raise


def main():
    """Main function to create and ingest vectors."""
    import argparse
    
    parser = argparse.ArgumentParser(description="Create and ingest vectors to S3 Vector Store")
    parser.add_argument("--data-file", type=str, default="data.json",
                       help="Path to data.json file")
    parser.add_argument("--limit", type=int, default=5,
                       help="Limit number of products to process (default: 5)")
    parser.add_argument("--batch-size", type=int, default=100,
                       help="Batch size for ingestion")
    args = parser.parse_args()
    
    data_file = os.path.join(os.path.dirname(__file__), args.data_file)
    
    print(f"Loading first {args.limit} products with non-empty long descriptions...")
    products = load_products(data_file, limit=args.limit)
    print(f"Loaded {len(products)} products")
    
    print("\nCreating vectors...")
    all_vectors = []
    for idx, product in enumerate(products):
        if (idx + 1) % 10 == 0:
            print(f"  Processed {idx + 1}/{len(products)} products...")
        vectors = create_vectors_for_product(product)
        all_vectors.extend(vectors)
    
    print(f"\nCreated {len(all_vectors)} vectors from {len(products)} products")
    
    print("\nIngesting to S3 Vector Store...")
    ingest_to_s3_vectors(all_vectors, batch_size=args.batch_size)
    
    print("\n✓ Ingestion complete!")


if __name__ == "__main__":
    main()
