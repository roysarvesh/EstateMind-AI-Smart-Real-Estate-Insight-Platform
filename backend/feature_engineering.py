#!/usr/bin/env python3
import pandas as pd
import numpy as np
import re
from sklearn.base import BaseEstimator, TransformerMixin
from sklearn.preprocessing import LabelEncoder

class RealEstateFeatureEngineer(BaseEstimator, TransformerMixin):
    
    def __init__(self):
        self.top_localities = None
        self.label_encoders = {}
        self.price_per_sqft_median = None
        self.area_quantile_75 = None
        
    def categorize_property_size(self, area):
        """Categorize property by area size"""
        if area < 500: return 'Compact'
        elif area < 1000: return 'Medium'
        elif area < 2000: return 'Large'
        else: return 'Luxury'

    def categorize_bhk(self, bhk):
        """Categorize BHK count"""
        if bhk <= 1: return '1BHK'
        elif bhk <= 2: return '2BHK'
        elif bhk <= 3: return '3BHK'
        else: return '4+BHK'

    def calculate_luxury_score(self, row):
        """Calculate luxury score based on features"""
        score = 0
        if row['Total_Area'] > 1500: score += 2
        elif row['Total_Area'] > 1000: score += 1
        
        if row['BHK'] >= 4: score += 2
        elif row['BHK'] >= 3: score += 1
        
        if row['Baths'] >= 3: score += 1
        if row['Has_Balcony']: score += 1
        
        return score
        
    def fit(self, X, y=None):
        """Fit on training data - EXACT replication of Multiple Algorithms preprocessing"""
        print(" Fitting Feature Engineering Pipeline (Multiple Algorithms Method)...")
        
        # Step 1: Data Cleaning (EXACT copy from Multiple Algorithms)
        df = X.copy()
        df = df.drop_duplicates()
        
        # Parse price (training only)
        if 'Price' in df.columns:
            df['Price_in_Lakhs'] = df['Price'].apply(self._parse_price_training)
        
        # Location parsing
        df['Location_split'] = df['Location'].str.split(',')
        df['Locality'] = df['Location_split'].apply(lambda x: x[0].strip() if x and len(x) > 0 else 'Unknown')
        df['City'] = df['Location_split'].apply(lambda x: x[-1].strip() if x and len(x) > 0 else 'Unknown')
        
        # BHK extraction
        def extract_bhk(title):
            if pd.isna(title):
                return 0
            bhk_match = re.search(r'(\d+)\s*BHK', str(title), re.IGNORECASE)
            return int(bhk_match.group(1)) if bhk_match else 0
        
        df['BHK'] = df['Property Title'].apply(extract_bhk)
        
        df['Has_Balcony'] = df['Balcony'].map({'Yes': 1, 'Y': 1, 'No': 0, 'N': 0}).fillna(0)
        
        df['Total_Area'] = pd.to_numeric(df['Total_Area'], errors='coerce')
        df['Price_per_SQFT'] = pd.to_numeric(df['Price_per_SQFT'], errors='coerce')
        df['Baths'] = pd.to_numeric(df['Baths'], errors='coerce').fillna(1)
        
        df['Total_Area'] = df['Total_Area'].fillna(df.groupby('BHK')['Total_Area'].transform('median'))

        locality_counts = df['Locality'].value_counts()
        self.top_localities = locality_counts.nlargest(30).index.tolist()
        df.loc[~df['Locality'].isin(self.top_localities), 'Locality'] = 'Other'
        
        # Step 2: Outlier Removal (EXACT copy from Multiple Algorithms)
        print("   Applying outlier removal...")
        def remove_outliers_iqr(series, factor=1.5):
            Q1 = series.quantile(0.25)
            Q3 = series.quantile(0.75)
            IQR = Q3 - Q1
            lower_bound = Q1 - factor * IQR
            upper_bound = Q3 + factor * IQR
            return (series >= lower_bound) & (series <= upper_bound)
        
        initial_count = len(df)
        
        # Apply to key columns
        price_mask = remove_outliers_iqr(df['Price_in_Lakhs'].dropna())
        area_mask = remove_outliers_iqr(df['Total_Area'].dropna())
        pps_mask = remove_outliers_iqr(df['Price_per_SQFT'].dropna())
        
        # Combine masks
        valid_price_idx = df['Price_in_Lakhs'].dropna().index
        combined_mask = price_mask & area_mask & pps_mask
        outlier_idx = valid_price_idx[~combined_mask]
        
        df = df.drop(outlier_idx)
        
        removed_count = initial_count - len(df)
        print(f"     Removed {removed_count} outliers ({removed_count/initial_count*100:.1f}%)")
        
        # Step 3: Store statistics AFTER outlier removal
        self.price_per_sqft_median = df['Price_per_SQFT'].median()
        self.area_quantile_75 = df['Total_Area'].quantile(0.75)
        
        # Step 4: Create categorical features
        df['Property_Size_Category'] = df['Total_Area'].apply(self.categorize_property_size)
        df['BHK_Category'] = df['BHK'].apply(self.categorize_bhk)
        
        # Step 5: Fit label encoders
        categorical_features = ['City', 'Locality', 'Property_Size_Category', 'BHK_Category']
        
        for feature in categorical_features:
            if feature in df.columns:
                le = LabelEncoder()
                le.fit(df[feature].astype(str))
                self.label_encoders[feature] = le
        
        print(" Feature Engineering Pipeline fitted with Multiple Algorithms method!")
        return self
        
    def transform(self, X):
        """Transform data for prediction"""
        print(" Transforming data...")
        df = X.copy()
        
        # Extract BHK if not present (for training data)
        if 'BHK' not in df.columns:
            if 'Property Title' in df.columns:
                df['BHK'] = df['Property Title'].apply(self._extract_bhk_training)
            else:
                df['BHK'] = 2  # Default value
        
        # Handle location columns
        if 'Locality' not in df.columns:
            if 'Location' in df.columns and any(',' in str(loc) for loc in df['Location'].dropna()):
                df['Location_split'] = df['Location'].str.split(',')
                df['Locality'] = df['Location_split'].apply(lambda x: x[0].strip() if x and len(x) > 0 else 'Unknown')
                df['City'] = df['Location_split'].apply(lambda x: x[-1].strip() if x and len(x) > 0 else 'Unknown')
            else:
                df['Locality'] = df.get('Location', 'Unknown')
                df['City'] = df.get('City', 'Unknown')
        
        # Handle bathroom column name
        if 'Baths' not in df.columns:
            df['Baths'] = df.get('Bathroom', 1)
        
        # Handle balcony
        if 'Has_Balcony' not in df.columns:
            if 'Balcony' in df.columns:
                df['Has_Balcony'] = df['Balcony'].map({'Yes': 1, 'Y': 1, 'No': 0, 'N': 0, True: 1, False: 0}).fillna(0)
            else:
                df['Has_Balcony'] = 0
        
        # Basic data cleaning and type conversion
        df['Total_Area'] = pd.to_numeric(df['Total_Area'], errors='coerce')
        df['Price_per_SQFT'] = pd.to_numeric(df['Price_per_SQFT'], errors='coerce')
        df['BHK'] = pd.to_numeric(df['BHK'], errors='coerce').fillna(2)
        df['Baths'] = pd.to_numeric(df['Baths'], errors='coerce').fillna(1)
        
        # Fill missing values
        df['Total_Area'] = df['Total_Area'].fillna(df['Total_Area'].median())
        df['Price_per_SQFT'] = df['Price_per_SQFT'].fillna(self.price_per_sqft_median)
        df['Has_Balcony'] = df['Has_Balcony'].fillna(0)
        
        # Handle location grouping
        df.loc[~df['Locality'].isin(self.top_localities), 'Locality'] = 'Other'
        
        # Create categorical features
        df['Property_Size_Category'] = df['Total_Area'].apply(self.categorize_property_size)
        df['BHK_Category'] = df['BHK'].apply(self.categorize_bhk)
        
        # =============== ADVANCED FEATURE ENGINEERING (Match Multiple_Algorithms) ===============
        # 1. Log transformations (trees can handle these well)
        df['log_area'] = np.log1p(df['Total_Area'])
        df['log_price_per_sqft'] = np.log1p(df['Price_per_SQFT'].fillna(self.price_per_sqft_median))
        
        # 2. Ratio features (very important for pricing)
        df['Area_per_Room'] = df['Total_Area'] / np.maximum(df['BHK'], 1)
        df['log_area_per_room'] = np.log1p(df['Area_per_Room'])
        df['Bath_to_BHK_ratio'] = df['Baths'] / np.maximum(df['BHK'], 1)
        df['Total_Rooms'] = df['BHK'] + df['Baths']
        df['Area_Efficiency'] = df['Total_Area'] / np.maximum(df['Total_Rooms'], 1)
        
        # 3. Interaction features (trees excel at these)
        df['Area_x_BHK'] = df['Total_Area'] * df['BHK']
        df['Area_x_Baths'] = df['Total_Area'] * df['Baths']
        df['log_Area_x_BHK'] = np.log1p(df['Area_x_BHK'])
        
        # 4. Advanced features for price prediction
        df['Price_per_Room'] = df['Price_per_SQFT'] * df['Area_per_Room']
        df['Is_Premium_Size'] = (df['Total_Area'] > self.area_quantile_75).astype(int)
        df['Has_Multiple_Baths'] = (df['Baths'] >= 2).astype(int)
        
        # Create luxury score
        df['Luxury_Score'] = df.apply(self.calculate_luxury_score, axis=1)
        
        # Encode categorical variables
        categorical_features = ['City', 'Locality', 'Property_Size_Category', 'BHK_Category']
        for feature in categorical_features:
            if feature in df.columns and feature in self.label_encoders:
                le = self.label_encoders[feature]
                # Handle unseen categories
                df[feature] = df[feature].astype(str).apply(
                    lambda x: x if x in le.classes_ else 'Other'
                )
                # Add 'Other' to classes if needed
                if 'Other' not in le.classes_:
                    le.classes_ = np.append(le.classes_, 'Other')
                df[feature] = le.transform(df[feature])
        
        # Select final features for prediction (EXACT MATCH to Multiple_Algorithms)
        feature_cols = ['log_area', 'Baths', 'Has_Balcony', 'BHK',
    'log_area_per_room', 'Bath_to_BHK_ratio', 'Total_Rooms', 'Area_Efficiency',
    'Area_x_Baths', 'log_Area_x_BHK', 'Is_Premium_Size', 'Has_Multiple_Baths','Price_per_Room',
      'Luxury_Score','City', 'Locality', 'Property_Size_Category', 'BHK_Category']
        
        # Ensure all required features exist
        for col in feature_cols:
            if col not in df.columns:
                df[col] = 0
        
        result = df[feature_cols]
        print(f" Transformed data shape: {result.shape}")
        return result
    
    def get_target(self, X):
        """Extract target variable with EXACT Multiple Algorithms preprocessing"""
        df = X.copy()
        if 'Price' in df.columns:
            # Apply EXACT same preprocessing as fit method
            df = df.drop_duplicates()
            
            # Parse price
            df['Price_in_Lakhs'] = df['Price'].apply(self._parse_price_training)
            
            # Location parsing
            df['Location_split'] = df['Location'].str.split(',')
            df['Locality'] = df['Location_split'].apply(lambda x: x[0].strip() if x and len(x) > 0 else 'Unknown')
            df['City'] = df['Location_split'].apply(lambda x: x[-1].strip() if x and len(x) > 0 else 'Unknown')
            
            # BHK extraction
            def extract_bhk(title):
                if pd.isna(title):
                    return 0
                bhk_match = re.search(r'(\d+)\s*BHK', str(title), re.IGNORECASE)
                return int(bhk_match.group(1)) if bhk_match else 0
            
            df['BHK'] = df['Property Title'].apply(extract_bhk)
            
            df['Has_Balcony'] = df['Balcony'].map({'Yes': 1, 'Y': 1, 'No': 0, 'N': 0}).fillna(0)
            
            df['Total_Area'] = pd.to_numeric(df['Total_Area'], errors='coerce')
            df['Price_per_SQFT'] = pd.to_numeric(df['Price_per_SQFT'], errors='coerce')
            df['Baths'] = pd.to_numeric(df['Baths'], errors='coerce').fillna(1)
            
            df['Total_Area'] = df['Total_Area'].fillna(df.groupby('BHK')['Total_Area'].transform('median'))

            locality_counts = df['Locality'].value_counts()
            top_localities = locality_counts.nlargest(30).index.tolist()
            df.loc[~df['Locality'].isin(top_localities), 'Locality'] = 'Other'
            
            # Apply EXACT outlier removal
            def remove_outliers_iqr(series, factor=1.5):
                Q1 = series.quantile(0.25)
                Q3 = series.quantile(0.75)
                IQR = Q3 - Q1
                lower_bound = Q1 - factor * IQR
                upper_bound = Q3 + factor * IQR
                return (series >= lower_bound) & (series <= upper_bound)
            
            # Apply to key columns
            price_mask = remove_outliers_iqr(df['Price_in_Lakhs'].dropna())
            area_mask = remove_outliers_iqr(df['Total_Area'].dropna())
            pps_mask = remove_outliers_iqr(df['Price_per_SQFT'].dropna())
            
            # Combine masks
            valid_price_idx = df['Price_in_Lakhs'].dropna().index
            combined_mask = price_mask & area_mask & pps_mask
            outlier_idx = valid_price_idx[~combined_mask]
            
            df = df.drop(outlier_idx)
            
            return df['Price_in_Lakhs'].dropna()
        else:
            raise ValueError("Price column not found - cannot extract target")
    
    def _parse_price_training(self, price_str):
        """Parse price from training dataset format"""
        if pd.isna(price_str):
            return np.nan
        
        price_str = str(price_str).strip().replace('₹', '').replace(',', '')
        
        if 'Cr' in price_str or 'cr' in price_str:
            numeric = re.findall(r'[\d.]+', price_str)
            if numeric:
                return float(numeric[0]) * 100
        elif 'L' in price_str or 'l' in price_str:
            numeric = re.findall(r'[\d.]+', price_str)
            if numeric:
                return float(numeric[0])
        else:
            numeric = re.findall(r'[\d.]+', price_str)
            if numeric:
                val = float(numeric[0])
                if val > 10000:
                    return val / 100000
                return val
        return np.nan
    
    def _extract_bhk_training(self, title_str):
        """Extract BHK from property title during training"""
        if pd.isna(title_str):
            return 2
        
        title_str = str(title_str).upper()
        
        # Look for patterns like "2 BHK", "3BHK", "4-BHK"
        bhk_match = re.search(r'(\d+)\s*[-]?\s*BHK', title_str)
        if bhk_match:
            return int(bhk_match.group(1))
        
        # Look for patterns like "2 BEDROOM", "3 BEDROOM"
        bedroom_match = re.search(r'(\d+)\s*BEDROOM', title_str)
        if bedroom_match:
            return int(bedroom_match.group(1))
        
        # Default to 2 BHK if no pattern found
        return 2
    
    def _extract_bhk(self, X):
        """Extract BHK from size column"""
        X_copy = X.copy()
        
        # If BHK already exists, use it
        if 'BHK' in X_copy.columns:
            return X_copy
            
        # Extract BHK from size column if it exists
        if 'size' in X_copy.columns:
            X_copy['BHK'] = X_copy['size'].str.extract(r'(\d+)').astype(float)
            # Fill NaN values with median or default value
            median_bhk = X_copy['BHK'].median() if not X_copy['BHK'].isna().all() else 2.0
            X_copy['BHK'] = X_copy['BHK'].fillna(median_bhk)
        else:
            # If no size column, create default BHK
            X_copy['BHK'] = 2.0
            
        return X_copy
    
    def _remove_outliers_iqr(self, df, columns, factor=1.5):
        """Remove outliers using IQR method - training only"""
        df = df.copy()
        initial_count = len(df)
        
        masks = []
        for col in columns:
            if col in df.columns and df[col].notna().sum() > 0:
                series = df[col].dropna()
                Q1 = series.quantile(0.25)
                Q3 = series.quantile(0.75)
                IQR = Q3 - Q1
                lower_bound = Q1 - factor * IQR
                upper_bound = Q3 + factor * IQR
                mask = (df[col] >= lower_bound) & (df[col] <= upper_bound)
                masks.append(mask)
        
        if masks:
            combined_mask = masks[0]
            for mask in masks[1:]:
                combined_mask = combined_mask & mask
            df = df[combined_mask | df[columns].isna().any(axis=1)]
        
        removed_count = initial_count - len(df)
        print(f"     TRAINING ONLY: Removed {removed_count} outliers ({removed_count/initial_count*100:.1f}%)")
        
        return df

print(" RealEstateFeatureEngineer class loaded from feature_engineering module!")