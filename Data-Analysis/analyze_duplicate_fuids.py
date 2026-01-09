import pandas as pd
import numpy as np
from collections import defaultdict

def analyze_duplicate_fuids():
    """
    Analyze the outputs_with_flywl_ids.csv file to find duplicate FUIDs
    and create a summary of FUIDs that appear in multiple platforms.
    """
    
    print("Loading CSV file...")
    try:
        # Read the CSV file with low_memory=False to handle mixed types
        df = pd.read_csv('outputs_with_flywl_ids.csv', low_memory=False)
        print(f"Successfully loaded CSV file with {len(df)} rows")
        
        # Display column names to understand the structure
        print(f"\nColumns in the file: {list(df.columns)}")
        
        # Check if 'FUID' column exists (case insensitive)
        fuid_column = None
        for col in df.columns:
            if 'fuid' in col.lower() or 'flywl_unique_id' in col.lower():
                fuid_column = col
                break
        
        if not fuid_column:
            print("Error: No FUID column found in the CSV file")
            print(f"Available columns: {list(df.columns)}")
            return
        
        print(f"Using column '{fuid_column}' for FUID analysis")
        
        # Check for platform column
        platform_column = None
        for col in df.columns:
            if 'platform' in col.lower():
                platform_column = col
                break
        
        if not platform_column:
            print("Warning: No platform column found, will use 'Unknown' for all entries")
            df['Platform'] = 'Unknown'
            platform_column = 'Platform'
        else:
            print(f"Using column '{platform_column}' for platform analysis")
        
        # Remove rows with missing FUIDs and convert to string to handle mixed types
        df_clean = df.dropna(subset=[fuid_column])
        df_clean[fuid_column] = df_clean[fuid_column].astype(str)
        print(f"After removing rows with missing FUIDs: {len(df_clean)} rows")
        
        # Group by FUID and count occurrences
        fuid_counts = df_clean[fuid_column].value_counts()
        
        # Find FUIDs that appear more than once
        duplicate_fuids = fuid_counts[fuid_counts > 1]
        
        print(f"\nFound {len(duplicate_fuids)} FUIDs that appear more than once")
        
        # Create detailed analysis for duplicate FUIDs
        duplicate_analysis = []
        
        for fuid, count in duplicate_fuids.items():
            # Get all rows for this FUID
            fuid_rows = df_clean[df_clean[fuid_column] == fuid]
            
            # Get unique platforms for this FUID (handle NaN values)
            platforms = fuid_rows[platform_column].dropna().unique()
            platforms_str = ', '.join(sorted([str(p) for p in platforms])) if len(platforms) > 0 else 'Unknown'
            
            duplicate_analysis.append({
                'FUID': fuid,
                'Number_of_Occurrences': count,
                'Platforms': platforms_str,
                'Platform_Count': len(platforms)
            })
        
        # Create DataFrame for duplicate analysis
        duplicate_df = pd.DataFrame(duplicate_analysis)
        
        # Sort by number of occurrences (descending)
        duplicate_df = duplicate_df.sort_values('Number_of_Occurrences', ascending=False)
        
        # Save to CSV
        output_filename = 'duplicate_fuids_analysis.csv'
        duplicate_df.to_csv(output_filename, index=False)
        print(f"\nDuplicate FUIDs analysis saved to: {output_filename}")
        
        # Print summary statistics
        total_fuids = len(fuid_counts)
        total_unique_fuids = len(fuid_counts)
        total_duplicate_fuids = len(duplicate_fuids)
        total_duplicate_fuids_multiple_platforms = len(duplicate_df[duplicate_df['Platform_Count'] > 1])
        
        print("\n" + "="*60)
        print("SUMMARY STATISTICS")
        print("="*60)
        print(f"Total number of FUID entries: {len(df_clean)}")
        print(f"Total number of unique FUIDs: {total_unique_fuids}")
        print(f"Total number of FUIDs that appear more than once: {total_duplicate_fuids}")
        print(f"Total number of FUIDs present in more than 1 platform: {total_duplicate_fuids_multiple_platforms}")
        print("="*60)
        
        # Display top 10 most duplicated FUIDs
        # print("\nTop 10 Most Duplicated FUIDs:")
        # print("-" * 80)
        # for i, row in duplicate_df.head(10).iterrows():
        #     print(f"FUID: {row['FUID']}")
        #     print(f"  Occurrences: {row['Number_of_Occurrences']}")
        #     print(f"  Platforms: {row['Platforms']}")
        #     print(f"  Platform Count: {row['Platform_Count']}")
        #     print()
        
        # Additional analysis: FUIDs in multiple platforms
        # multi_platform_fuids = duplicate_df[duplicate_df['Platform_Count'] > 1]
        # if len(multi_platform_fuids) > 0:
        #     print(f"\nFUIDs present in multiple platforms ({len(multi_platform_fuids)} total):")
        #     print("-" * 80)
        #     for i, row in multi_platform_fuids.iterrows():
        #         print(f"FUID: {row['FUID']}")
        #         print(f"  Occurrences: {row['Number_of_Occurrences']}")
        #         print(f"  Platforms: {row['Platforms']}")
        #         print()
        
        return duplicate_df
        
    except FileNotFoundError:
        print("Error: outputs_with_flywl_ids.csv file not found in the current directory")
        return None
    except Exception as e:
        print(f"Error analyzing CSV file: {str(e)}")
        return None

if __name__ == "__main__":
    print("FUID Duplicate Analysis Tool")
    print("=" * 40)
    
    result = analyze_duplicate_fuids()
    
    if result is not None:
        print("\nAnalysis completed successfully!")
    else:
        print("\nAnalysis failed!") 