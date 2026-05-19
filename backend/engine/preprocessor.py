"""
InsightForge Preprocessor Engine
=================================
Handles:
  - Missing value imputation (median for numeric, mode for categorical)
  - Duplicate row removal
  - Outlier detection & capping via IQR
  - Column type auto-detection (numerical, categorical, datetime)
  - Label encoding for categorical columns

Optimized with vectorized Pandas operations — no Python loops over rows.
"""
import os
import pandas as pd
import numpy as np
from typing import Dict, Any


def load_dataframe(file_path: str) -> pd.DataFrame:
    """Load CSV or Excel file into a DataFrame."""
    ext = os.path.splitext(file_path)[1].lower()
    if ext == ".csv":
        # Try common encodings
        for enc in ["utf-8", "latin-1", "cp1252"]:
            try:
                return pd.read_csv(file_path, encoding=enc, low_memory=False)
            except UnicodeDecodeError:
                continue
        raise ValueError("Could not decode CSV file. Please ensure it is UTF-8 or Latin-1 encoded.")
    elif ext in [".xlsx", ".xls"]:
        return pd.read_excel(file_path, engine="openpyxl" if ext == ".xlsx" else "xlrd")
    else:
        raise ValueError(f"Unsupported file extension: {ext}")


def detect_column_types(df: pd.DataFrame) -> Dict[str, str]:
    """
    Auto-detect column types:
      - 'datetime': parseable as dates
      - 'numerical': numeric dtype or high-cardinality numeric-looking object
      - 'categorical': everything else
    """
    col_types = {}
    for col in df.columns:
        if pd.api.types.is_datetime64_any_dtype(df[col]):
            col_types[col] = "datetime"
        elif pd.api.types.is_bool_dtype(df[col]):
            col_types[col] = "categorical"
        elif pd.api.types.is_numeric_dtype(df[col]):
            col_types[col] = "numerical"
        else:
            # Try parsing as datetime
            sample = df[col].dropna().head(50)
            try:
                parsed = pd.to_datetime(sample, infer_datetime_format=True)
                if parsed.notna().sum() > len(sample) * 0.8:
                    col_types[col] = "datetime"
                    continue
            except Exception:
                pass
            col_types[col] = "categorical"
    return col_types


def drop_unnecessary_columns(df: pd.DataFrame) -> tuple:
    """
    Drop columns that are:
      - 100% missing values
      - Zero variance (all values are identical)
    Returns (cleaned_df, drop_report)
    """
    df = df.copy()
    dropped_cols = []
    
    for col in df.columns:
        # 1. 100% missing
        if df[col].isna().all():
            dropped_cols.append({"column": col, "reason": "100% missing values"})
            continue
            
        # 2. Zero variance (only 1 unique value, excluding NaNs)
        if df[col].nunique(dropna=True) <= 1:
            val = df[col].dropna().unique()[0] if df[col].nunique(dropna=True) == 1 else "None"
            dropped_cols.append({"column": col, "reason": f"Zero variance (all values are '{val}')"})
            continue

    df = df.drop(columns=[d["column"] for d in dropped_cols])
    return df, dropped_cols


def enforce_tight_types(df: pd.DataFrame) -> pd.DataFrame:
    """
    Attempt to cast columns back to their tightest possible types.
    Pandas often casts ints to floats if there are NaNs. After filling,
    we can cast them back.
    - float (all integers) -> int
    - float (all 0/1) -> bool (if originally bool-like)
    """
    df = df.copy()
    for col in df.columns:
        if pd.api.types.is_numeric_dtype(df[col]):
            # Check if it's float but could be int
            if pd.api.types.is_float_dtype(df[col]):
                # Check if all values are finite and have no decimals
                if np.all(np.mod(df[col].dropna(), 1) == 0):
                    try:
                        df[col] = df[col].astype(int)
                    except (ValueError, TypeError, OverflowError):
                        pass
    return df


def impute_missing_values(df: pd.DataFrame, col_types: Dict[str, str]) -> tuple:
    """
    Fill missing values:
      - Numeric  → Median (Grouped by first categorical column if possible)
      - Categorical/Datetime → Mode (Most Frequent)
    Returns (filled_df, missing_report)
    """
    missing_report = {}
    df = df.copy()
    
    # Heuristic: Find the first categorical column with reasonable cardinality to use as a "Group By" key
    group_col = None
    for col, ctype in col_types.items():
        if ctype == "categorical" and 1 < df[col].nunique() < 50:
            group_col = col
            break

    for col in df.columns:
        n_missing = df[col].isna().sum()
        if n_missing == 0:
            continue

        pct = round(n_missing / len(df) * 100, 1)
        ctype = col_types.get(col, "categorical")

        if ctype == "numerical":
            if group_col and group_col != col:
                # Try grouped median
                fill_val_series = df.groupby(group_col)[col].transform("median")
                # Fill remaining with global median if some groups are all NaN
                df[col] = df[col].fillna(fill_val_series).fillna(df[col].median())
                strategy = f"grouped_median (by {group_col})"
                fill_val = "dynamic"
            else:
                fill_val = df[col].median()
                df[col] = df[col].fillna(fill_val)
                strategy = "global_median"
        else:
            mode_vals = df[col].mode()
            fill_val = mode_vals[0] if len(mode_vals) > 0 else "Unknown"
            df[col] = df[col].fillna(fill_val)
            strategy = "mode"

        missing_report[col] = {
            "missing_count": int(n_missing),
            "missing_pct": pct,
            "fill_strategy": strategy,
            "fill_value": str(fill_val),
        }

    return df, missing_report


def remove_duplicates(df: pd.DataFrame) -> tuple:
    """Remove exact duplicate rows. Returns (deduped_df, count_removed)."""
    original_len = len(df)
    df = df.drop_duplicates()
    return df, original_len - len(df)


def handle_outliers_iqr(df: pd.DataFrame, col_types: Dict[str, str]) -> tuple:
    """
    Cap outliers in numeric columns using IQR method:
      lower_bound = Q1 - 1.5 * IQR
      upper_bound = Q3 + 1.5 * IQR
    Values beyond bounds are clipped.
    Returns (capped_df, outlier_report)
    """
    df = df.copy()
    outlier_report = {}

    numeric_cols = [c for c, t in col_types.items() if t == "numerical"]

    for col in numeric_cols:
        if col not in df.columns:
            continue
            
        # Heuristic: Don't cap discrete counts or indices
        # Only cap if there's high variation (>20 unique values)
        if df[col].nunique() < 20: 
            continue

        Q1 = df[col].quantile(0.25)
        Q3 = df[col].quantile(0.75)
        IQR = Q3 - Q1
        lower = Q1 - 1.5 * IQR
        upper = Q3 + 1.5 * IQR

        n_outliers = ((df[col] < lower) | (df[col] > upper)).sum()
        if n_outliers > 0:
            df[col] = df[col].clip(lower=lower, upper=upper)
            outlier_report[col] = {
                "outliers_capped": int(n_outliers),
                "lower_bound": round(float(lower), 4),
                "upper_bound": round(float(upper), 4),
            }

    return df, outlier_report


def label_encode_categoricals(df: pd.DataFrame, col_types: Dict[str, str]) -> tuple:
    """
    Label-encode categorical columns with moderate cardinality (≤50 unique values).
    High-cardinality columns (e.g. names, IDs) are left as-is.
    Returns (encoded_df, encoding_map)
    """
    df = df.copy()
    encoding_map = {}

    for col, ctype in col_types.items():
        if ctype != "categorical" or col not in df.columns:
            continue
        n_unique = df[col].nunique()
        if n_unique > 50:
            continue  # Skip high-cardinality — likely IDs or free text

        cat = pd.Categorical(df[col])
        df[col] = cat.codes
        encoding_map[col] = dict(enumerate(cat.categories))

    return df, encoding_map


def preprocess(file_path: str) -> Dict[str, Any]:
    """
    Full preprocessing pipeline.
    Returns dict with keys: cleaned_df, report
    """
    # 1. Load
    df = load_dataframe(file_path)

    # Sample large datasets for speed (>100k rows → sample 50k)
    original_rows, original_cols = df.shape
    if len(df) > 100_000:
        df = df.sample(n=50_000, random_state=42)

    # 2. Cleanup: Drop unnecessary columns
    df, dropped_report = drop_unnecessary_columns(df)

    # 3. Detect types
    col_types = detect_column_types(df)

    # 4. Impute missing values (Grouped Median Emphasized)
    df, missing_report = impute_missing_values(df, col_types)

    # 5. Remove duplicates
    df, dupes_removed = remove_duplicates(df)

    # 6. Outlier handling REMOVED
    # Per user request: DO NOT CHANGE EXISTING DATA.
    outlier_report = {}

    # 7. Final Polish: Enforce tight types (e.g. float -> int)
    df = enforce_tight_types(df)
    
    # Re-detect types for the report
    final_col_types = detect_column_types(df)

    report = {
        "original_rows": original_rows,
        "original_cols": original_cols,
        "cleaned_rows": len(df),
        "cleaned_cols": len(df.columns),
        "columns_dropped": dropped_report,
        "duplicates_removed": dupes_removed,
        "missing_values": missing_report,
        "outliers": outlier_report,
        "col_types": final_col_types,
        "encoding_map": {}, 
    }

    return {"cleaned_df": df, "report": report}
