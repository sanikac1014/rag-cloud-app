import sys
import os
from langchain_ollama import OllamaEmbeddings
from langchain_chroma import Chroma
from rag_pipeline import answer_query


def main():
    if len(sys.argv) != 3:
        print("Usage: python test_rag.py <FUID> <query>")
        sys.exit(1)
    
    fuid = sys.argv[1]
    query = sys.argv[2]
    
    persist_dir = os.path.join(os.path.dirname(__file__), "chroma")
    
    if not os.path.exists(persist_dir):
        print("Error: Vector store not found. Please run rag_pipeline.py first to build the index.")
        sys.exit(1)
    
    embeddings = OllamaEmbeddings(model="nomic-embed-text")
    vector_store = Chroma(
        persist_directory=persist_dir,
        embedding_function=embeddings,
        collection_name="product_longdescriptions"
    )
    
    answer = answer_query(fuid, query, vector_store)
    print(answer)


if __name__ == "__main__":
    main()

