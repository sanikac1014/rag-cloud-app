import json
import os
from typing import List
from bs4 import BeautifulSoup
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_ollama import OllamaEmbeddings, OllamaLLM
from langchain_chroma import Chroma
from langchain_core.documents import Document
from langchain_core.prompts import ChatPromptTemplate
from langchain.chains import create_retrieval_chain
from langchain.chains.combine_documents import create_stuff_documents_chain


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
        chunk_size=256,
        chunk_overlap=32
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


def get_retriever(fuid: str, vector_store: Chroma):
    """Get retriever filtered by FUID."""
    return vector_store.as_retriever(
        search_kwargs={"k": 3, "filter": {"fuid": fuid}}
    )


def answer_query(fuid: str, question: str, vector_store: Chroma) -> str:
    """Answer a query using RAG for a specific product."""
    retriever = get_retriever(fuid, vector_store)
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
    answer = answer_query(selected_fuid, question, vector_store)
    print(f"\nAnswer: {answer}")


if __name__ == "__main__":
    main()

