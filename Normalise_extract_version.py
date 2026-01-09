import pandas as pd
import unicodedata
import re
import string
import requests
import time

# Normalise the company name and product name
# Extract the version number from the product name using LLM Ollama

# Use the original dataset from the CSV file and save the results to a new CSV file
# New csv file name: output_normalized.csv

def normalize_text(text):
    """
    Normalize text by:
    1. Converting to lowercase
    2. Unicode normalization
    3. Removing punctuation and special characters
    """
    if pd.isna(text) or text is None:
        return ""
    
    # Convert to string if not already
    text = str(text)
    
    # Step 1: Convert to lowercase
    text = text.lower()
    
    # Step 2: Unicode normalization (NFD - Canonical Decomposition)
    text = unicodedata.normalize('NFD', text)
    
    # Step 3: Remove punctuation and special characters (except dots)
    # Keep only alphanumeric characters, spaces, and dots
    text = re.sub(r'[^\w\s.]', '', text)
    
    # Remove extra whitespace
    text = re.sub(r'\s+', ' ', text).strip()
    
    return text

def main():
    """
    Main function to read CSV, apply normalization, and save results
    """
    try:
        # Read the CSV file
        print("Reading output.csv...")
        df = pd.read_csv('output.csv')
        
        print(f"Original dataframe shape: {df.shape}")
        print(f"Columns: {list(df.columns)}")
        
        
        # Apply normalization to companyName and rawProductName

        df['normalised_company_name'] = df['companyName'].apply(normalize_text)
        df['normalised_product_name'] = df['rawProductName'].apply(normalize_text)
        
        # Display some sample results
        print("\nSample normalization results:")
        print("="*50)
        
        # Show first 5 rows of original and normalized data
        sample_df = df[['companyName', 'normalised_company_name', 'rawProductName', 'normalised_product_name']].head()

        # Add version extraction using Ollama
        print("\nExtracting version information using LLM...")
        
        # Initialize version column
        df['Version'] = ''
        
        # Prepare the prompt template
        prompt_template = """You are cloud marketplace expert.
        Extract only the version or year from the product name. 
        Return ONLY the version/year number, nothing else.
        If no version exists, return "NO VERSION FOUND"

            These are some of the Examples you can use to understand the pattern:
            - intellicus bi server v22.1 5 users → 22.1
            - dockermaventerraform on windows server2022 → 2022  
            - siemonster v5 training non mssps → 5
            - windows server 2019 datacenter hardened image level 1 → 2019

            Product name: {product_name}
            Version: """

        # Process each product name through Ollama
        try:
            for idx, row in df.iterrows():
                # print(f"Processing product {idx}...")
                if idx > 0 and idx % 100 == 0:
                    print(f"Processed {idx} products...")
                
                product_name = row['normalised_product_name']
                
                # Skip empty product names
                if not product_name or pd.isna(product_name):
                    continue
                
                # Call Ollama API
                response = requests.post('http://localhost:11434/api/generate',
                                      json={
                                          'model': 'llama3.2',
                                          'prompt': prompt_template.format(product_name=product_name),
                                          'stream': False
                                      })
                #print(response.json())
            
                
                if response.status_code == 200:
                    version = response.json()['response'].strip()
                    df.at[idx, 'Version'] = version
                    
                # Add small delay to avoid overwhelming the API
                time.sleep(0.1)
                
        except Exception as e:
            print(f"Error during version extraction: {str(e)}")
            
        # Display sample results with versions
        print("\nSample results with extracted versions:")
        print("="*80)
        sample_with_versions = df[['rawProductName', 'normalised_product_name', 'Version']].head(10)
        print(sample_with_versions.to_string())



        # Save the updated dataframe
        output_filename = 'output_normalize_July28.csv'
        print(f"\nSaving normalized data to {output_filename}...")
        df.to_csv(output_filename, index=False)
        

    except FileNotFoundError:
        print("Error: output.csv file not found. Please make sure the file exists in the current directory.")
    except Exception as e:
        print(f"An error occurred: {str(e)}")

if __name__ == "__main__":
    main() 