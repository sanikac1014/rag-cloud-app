#!/usr/bin/env python3
"""
Check if Ollama is running and which models are available
"""

import requests
import os
import sys

def check_ollama():
    """Check Ollama status and available models"""
    ollama_url = os.environ.get('OLLAMA_URL', 'http://localhost:11434')
    llm_model = os.environ.get('LLM_MODEL_NAME', 'llama3.2:3b')
    embed_model = os.environ.get('EMBED_MODEL_NAME', 'mxbai-embed-large')
    
    print("🔍 Checking Ollama Status...")
    print(f"   URL: {ollama_url}")
    print()
    
    # Check if Ollama is running
    try:
        response = requests.get(f"{ollama_url}/api/tags", timeout=5)
        if response.status_code == 200:
            print("✅ Ollama is running")
        else:
            print(f"❌ Ollama returned status {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print(f"❌ Cannot connect to Ollama at {ollama_url}")
        print()
        print("💡 To fix this:")
        print("   1. Install Ollama: https://ollama.ai")
        print("   2. Start Ollama: `ollama serve`")
        print("   3. Or run Ollama as a service")
        return False
    except Exception as e:
        print(f"❌ Error checking Ollama: {e}")
        return False
    
    # Get available models
    try:
        models_resp = requests.get(f"{ollama_url}/api/tags", timeout=5)
        if models_resp.status_code == 200:
            models = models_resp.json().get('models', [])
            model_names = [m.get('name', '') for m in models]
            
            print(f"\n📦 Available models ({len(model_names)}):")
            for model in model_names:
                print(f"   - {model}")
            
            print()
            
            # Check if required models are available
            llm_available = llm_model in model_names
            embed_available = embed_model in model_names
            
            if llm_available:
                print(f"✅ LLM model '{llm_model}' is available")
            else:
                print(f"❌ LLM model '{llm_model}' is NOT available")
                print(f"   Pull it with: `ollama pull {llm_model}`")
            
            if embed_available:
                print(f"✅ Embedding model '{embed_model}' is available")
            else:
                print(f"❌ Embedding model '{embed_model}' is NOT available")
                print(f"   Pull it with: `ollama pull {embed_model}`")
            
            if llm_available and embed_available:
                print("\n✅ All required models are available!")
                return True
            else:
                print("\n⚠️  Some required models are missing. RAG will not work properly.")
                return False
        else:
            print(f"❌ Failed to get models list (status {models_resp.status_code})")
            return False
    except Exception as e:
        print(f"❌ Error getting models: {e}")
        return False

if __name__ == "__main__":
    success = check_ollama()
    sys.exit(0 if success else 1)

