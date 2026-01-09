#!/usr/bin/env python3
"""
Marketplace Data Analysis Report Generator
==========================================
This script analyzes the marketplace data from outputs_with_flywl_ids.csv
and generates a comprehensive summary report for management.
"""

import pandas as pd
import numpy as np
from datetime import datetime

def load_data(file_path):
    """Load the CSV data with proper error handling"""
    try:
        df = pd.read_csv(file_path)
        print(f"✅ Successfully loaded data from {file_path}")
        return df
    except FileNotFoundError:
        print(f"❌ Error: File {file_path} not found")
        return None
    except Exception as e:
        print(f"❌ Error loading data: {str(e)}")
        return None

def generate_report(df):
    """Generate comprehensive marketplace analysis report"""
    
    print("\n" + "="*80)
    print("🚀 MARKETPLACE DATA ANALYSIS REPORT")
    print("="*80)
    print(f"📅 Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("="*80)
    
    # 1. TOTAL LISTINGS
    total_listings = len(df)
    print(f"\n📊 TOTAL LISTINGS FROM ELASTIC SEARCH")
    print(f"{'─' * 50}")
    print(f"Total Number of Rows: {total_listings:,}")
    
    # 2. TOTAL VENDORS
    total_vendors = df['company_unique_id'].nunique()
    print(f"\n🏢 TOTAL VENDORS")
    print(f"{'─' * 50}")
    print(f"Unique Company IDs: {total_vendors:,}")
    
    # 3. TOTAL PRODUCTS (same as total listings)
    print(f"\n📦 TOTAL PRODUCTS")
    print(f"{'─' * 50}")
    print(f"Total Number of Products: {total_listings:,}")
    
    # 4. UNIQUE PRODUCTS (FUIDs)
    unique_fuids = df['flywl_unique_id'].nunique()
    print(f"\n🔗 UNIQUE PRODUCTS (FUIDs)")
    print(f"{'─' * 50}")
    print(f"Unique FUID Count: {unique_fuids:,}")
    
    # 5. AVERAGE UNIQUE PRODUCTS PER COMPANY
    company_fuid_counts = df.groupby('company_unique_id')['flywl_unique_id'].nunique()
    avg_products_per_company = company_fuid_counts.mean()
    print(f"\n📈 AVERAGE UNIQUE PRODUCTS PER COMPANY")
    print(f"{'─' * 50}")
    print(f"Average FUIDs per Company: {avg_products_per_company:.2f}")
    
    # Additional company statistics
    print(f"Median FUIDs per Company: {company_fuid_counts.median():.2f}")
    print(f"Max FUIDs per Company: {company_fuid_counts.max():,}")
    print(f"Min FUIDs per Company: {company_fuid_counts.min():,}")
    
    # 6. MARKETPLACE BREAKDOWN
    print(f"\n🌐 MARKETPLACE BREAKDOWN")
    print(f"{'─' * 50}")
    
    marketplace_stats = df.groupby('platform').agg({
        'flywl_unique_id': ['count', 'nunique']
    }).round(2)
    
    marketplace_stats.columns = ['Total Products', 'Unique Products']
    
    for platform in marketplace_stats.index:
        total_products = marketplace_stats.loc[platform, 'Total Products']
        unique_products = marketplace_stats.loc[platform, 'Unique Products']
        print(f"{platform}:")
        print(f"  • Total Products: {total_products:,.0f}")
        print(f"  • Unique Products: {unique_products:,.0f}")
        print()
    
    # 7. CROSS-MARKETPLACE ANALYSIS
    print(f"\n🔄 CROSS-MARKETPLACE PRESENCE ANALYSIS")
    print(f"{'─' * 50}")
    
    # Count how many marketplaces each FUID appears in
    fuid_marketplace_counts = df.groupby('rawProductName')['platform'].nunique()
    
    # Products in all 3 marketplaces
    products_in_all_3 = (fuid_marketplace_counts == 3).sum()
    fuids_in_all_3 = fuid_marketplace_counts[fuid_marketplace_counts == 3].index.tolist()
    
    # Products in 2 or more marketplaces
    products_in_2_plus = (fuid_marketplace_counts >= 2).sum()
    
    # Products in exactly 2 marketplaces
    products_in_exactly_2 = (fuid_marketplace_counts == 2).sum()
    
    print(f"Products present in ALL 3 marketplaces: {products_in_all_3:,}")
    print(f"Products present in 2+ marketplaces: {products_in_2_plus:,}")
    print(f"Products present in exactly 2 marketplaces: {products_in_exactly_2:,}")
    print(f"Products present in only 1 marketplace: {(fuid_marketplace_counts == 1).sum():,}")
    
    # Percentage analysis
    print(f"\n📊 CROSS-MARKETPLACE PENETRATION RATES:")
    print(f"  • All 3 marketplaces: {(products_in_all_3/unique_fuids)*100:.1f}%")
    print(f"  • 2+ marketplaces: {(products_in_2_plus/unique_fuids)*100:.1f}%")
    print(f"  • Single marketplace only: {((fuid_marketplace_counts == 1).sum()/unique_fuids)*100:.1f}%")
    
    # 8. ADDITIONAL INSIGHTS
    print(f"\n💡 ADDITIONAL INSIGHTS")
    print(f"{'─' * 50}")
    
    # Platform distribution
    platform_distribution = df['platform'].value_counts()
    print("Platform Distribution:")
    for platform, count in platform_distribution.items():
        percentage = (count/total_listings)*100
        print(f"  • {platform}: {count:,} ({percentage:.1f}%)")
    
    # Top companies by product count
    print(f"\n🏆 TOP 10 COMPANIES BY UNIQUE PRODUCT COUNT:")
    top_companies = company_fuid_counts.sort_values(ascending=False).head(10)
    for i, (company_id, fuid_count) in enumerate(top_companies.items(), 1):
        # Get company name for better readability
        company_name = df[df['company_unique_id'] == company_id]['normalised_company_name'].iloc[0]
        print(f"  {i:2d}. {company_name} ({company_id}): {fuid_count:,} unique products")
    
    # Version analysis
    version_stats = df['Version'].value_counts()
    no_version_count = version_stats.get('NO VERSION FOUND', 0)
    has_version_count = total_listings - no_version_count
    
    print(f"\n📋 VERSION INFORMATION:")
    print(f"  • Products with version info: {has_version_count:,} ({(has_version_count/total_listings)*100:.1f}%)")
    print(f"  • Products without version info: {no_version_count:,} ({(no_version_count/total_listings)*100:.1f}%)")
    
    print("\n" + "="*80)
    print("📋 EXECUTIVE SUMMARY")
    print("="*80)
    print(f"• Total marketplace listings analyzed: {total_listings:,}")
    print(f"• Unique vendors represented: {total_vendors:,}")
    print(f"• Unique products (FUIDs): {unique_fuids:,}")
    print(f"• Average products per vendor: {avg_products_per_company:.1f}")
    print(f"• Cross-platform products (2+ marketplaces): {products_in_2_plus:,} ({(products_in_2_plus/unique_fuids)*100:.1f}%)")
    print(f"• Universal products (all 3 marketplaces): {products_in_all_3:,} ({(products_in_all_3/unique_fuids)*100:.1f}%)")
    print("="*80)

def main():
    """Main execution function"""
    file_path = "/Users/arabellyabhinav/Desktop/Flywl/Unique-id/outputs_with_flywl_ids.csv"
    
    # Load data
    df = load_data(file_path)
    if df is None:
        return
    
    # Display basic info about the dataset
    print(f"Dataset shape: {df.shape}")
    print(f"Columns: {list(df.columns)}")
    
    # Generate the report
    generate_report(df)
    
    print(f"\n✅ Report generation completed successfully!")
    print(f"📧 This report is ready to be shared with your manager.")

if __name__ == "__main__":
    main() 