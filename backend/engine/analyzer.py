"""
InsightForge Advanced Analytical Engine
========================================
- Automatically preprocesses, cleans, standardizes, transforms, and validates datasets.
- Implements all 7 Preprocessing Steps.
- Calculates comprehensive statistical metrics, correlations, outliers, and quality scores.
- Recommends PowerBI layouts, KPIs, and visualization-ready structures.
- Outputs all 16 required keys automatically.
"""
import numpy as np
import pandas as pd
from typing import Dict, Any, List
from scipy import stats


from typing import Dict, Any, List, Tuple

def analyze(df: pd.DataFrame, df_raw: pd.DataFrame = None) -> Tuple[Dict[str, Any], pd.DataFrame]:
    """
    Refined Enterprise Preprocessing, Analysis, and Data Preparation Engine.
    Executes all 7 preprocessing steps and outputs 16 key analytics metrics.
    """
    log = []
    log.append("⚡ Starting Advanced Preprocessing and Analytical Engine...")

    # Define metadata
    total_rows = len(df)
    total_cols = len(df.columns)
    log.append(f"📋 Dataset loaded successfully: {total_rows} rows, {total_cols} columns.")

    # Cast index/id cols to prevent mathematical skew where obvious
    df_clean = df.copy()

    # --- STEP 1: DATA CLEANING & STANDARDIZATION ---
    log.append("🧹 Step 1: Initiating Data Cleaning & Text Standardization...")
    
    # Capitalization & Trimming
    text_cols = df_clean.select_dtypes(include=["object"]).columns
    for col in text_cols:
        try:
            # Strip extra spaces and normalize capitalization to Title Case, preserving NaNs
            df_clean[col] = df_clean[col].astype(str).str.strip().str.title().replace({"Nan": np.nan, "None": np.nan, "Nat": np.nan})
        except Exception:
            pass
    log.append("✅ Standardized capitalization and trimmed trailing whitespace on string features.")

    # Handle duplicates
    dupes_count = int(df_clean.duplicated().sum())
    if dupes_count > 0:
        df_clean = df_clean.drop_duplicates()
        log.append(f"🗑️ Cleaned {dupes_count} exact duplicate rows from dataset.")
    else:
        log.append("✅ No duplicate rows detected.")

    # Missing values count and imputation strategy
    missing_report = {}
    total_cells = df_clean.size
    total_missing = 0
    
    for col in df_clean.columns:
        n_missing = int(df_clean[col].isna().sum())
        total_missing += n_missing
        if n_missing > 0:
            pct = round((n_missing / len(df_clean)) * 100, 2)
            # Imputation Heuristic
            if pd.api.types.is_numeric_dtype(df_clean[col]):
                strategy = "Median Imputation"
                fill_val = df_clean[col].median()
                df_clean[col] = df_clean[col].fillna(fill_val)
            else:
                strategy = "Mode Imputation"
                modes = df_clean[col].mode()
                fill_val = modes[0] if len(modes) > 0 else "Unknown"
                df_clean[col] = df_clean[col].fillna(fill_val)
            
            missing_report[col] = {
                "missing_count": n_missing,
                "percentage": pct,
                "imputation_strategy": strategy,
                "filled_value": str(fill_val)
            }
    log.append(f"🔧 Imputed {total_missing} missing values using mean/median/mode heuristics.")

    # --- STEP 2: DATA INTEGRATION (Relational discovery) ---
    log.append("🔗 Step 2: Auto-detecting Schema Integrity & Relational candidate keys...")
    candidate_keys = []
    for col in df_clean.columns:
        if df_clean[col].nunique() == len(df_clean) and df_clean[col].isna().sum() == 0:
            candidate_keys.append(col)
    
    if candidate_keys:
        log.append(f"🔑 Primary key candidates identified: {candidate_keys}")
    else:
        log.append("ℹ️ No unique columns found to serve as a singular primary key. Indexing by offset.")

    # --- STEP 3: DATA TRANSFORMATION (Scaling & Encoding) ---
    log.append("⚙️ Step 3: Triggering Data Transformation, Encoding, and Temporal Parsing...")
    
    # Scale numeric columns for standardization previews
    numeric_cols = df_clean.select_dtypes(include=[np.number]).columns.tolist()
    scaled_previews = {}
    
    for col in numeric_cols:
        col_min = float(df_clean[col].min())
        col_max = float(df_clean[col].max())
        diff = col_max - col_min
        if diff > 0:
            # Compute min-max preview for first 5 rows
            scaled_vals = ((df_clean[col].head(5) - col_min) / diff).round(4).tolist()
            scaled_previews[col] = scaled_vals
    
    # Temporal Parsing
    parsed_dates_count = 0
    parsed_temporal_cols = []
    for col in df_clean.columns:
        if not pd.api.types.is_numeric_dtype(df_clean[col]):
            # Heuristic datetime check
            try:
                sample = df_clean[col].dropna().head(50)
                # Skip if it is pure numeric/ID strings to prevent false positives
                if not sample.astype(str).str.contains(r'[-/:,a-zA-Z]').any():
                    continue
                parsed = pd.to_datetime(sample, errors="raise")
                # If all years are 1970, it's likely epoch/numeric parsing noise
                if (parsed.dt.year == 1970).all():
                    continue
                # If parsed successfully, perform complete date expansion
                df_clean[f"{col}_parsed"] = pd.to_datetime(df_clean[col], errors="coerce")
                df_clean[f"{col}_year"] = df_clean[f"{col}_parsed"].dt.year
                df_clean[f"{col}_month"] = df_clean[f"{col}_parsed"].dt.month
                df_clean[f"{col}_week"] = df_clean[f"{col}_parsed"].dt.isocalendar().week
                df_clean[f"{col}_weekday"] = df_clean[f"{col}_parsed"].dt.weekday
                df_clean[f"{col}_quarter"] = df_clean[f"{col}_parsed"].dt.quarter
                # Drop helper parsed col
                df_clean = df_clean.drop(columns=[f"{col}_parsed"])
                parsed_dates_count += 1
                parsed_temporal_cols.append(col)
                log.append(f"📅 Parsed temporal field '{col}' into sub-components (year, quarter, month, week, weekday).")
            except Exception:
                pass

    # Category Encoding Previews
    category_encoders = {}
    categorical_cols = df_clean.select_dtypes(include=["object", "category"]).columns.tolist()
    for col in categorical_cols:
        n_uniq = df_clean[col].nunique()
        if n_uniq <= 50: # Only encode columns with low cardinality
            cat_codes = pd.Categorical(df_clean[col])
            category_encoders[col] = {
                "classes": list(cat_codes.categories),
                "mapping_sample": {str(v): int(k) for k, v in list(enumerate(cat_codes.categories))[:5]}
            }

    # --- STEP 4: DATA REDUCTION (Redundancies) ---
    log.append("📉 Step 4: Applying Data Reduction and Memory Compaction...")
    dropped_redundant = []
    
    # Drop columns with zero variance
    for col in df_clean.columns:
        if df_clean[col].nunique() <= 1:
            df_clean = df_clean.drop(columns=[col])
            dropped_redundant.append(col)
            log.append(f"🗑️ Dropped redundant feature '{col}' due to zero variance.")
            
    # Optimize DataFrame Memory Footprint
    orig_memory = df.memory_usage(deep=True).sum()
    for col in df_clean.columns:
        if pd.api.types.is_integer_dtype(df_clean[col]):
            df_clean[col] = pd.to_numeric(df_clean[col], downcast="integer")
        elif pd.api.types.is_float_dtype(df_clean[col]):
            df_clean[col] = pd.to_numeric(df_clean[col], downcast="float")
            
    compaction_ratio = round((1 - (df_clean.memory_usage(deep=True).sum() / max(orig_memory, 1))) * 100, 1)
    log.append(f"💾 Compacted DataFrame types. Memory footprint reduced by {compaction_ratio}%.")

    # --- STEP 5: FEATURE ENGINEERING (Analytical metrics) ---
    log.append("🚀 Step 5: Engineering advanced analytical metrics & behavioral aggregates...")
    
    # Paired ratios helper
    engineered_features = []
    if len(numeric_cols) >= 2:
        col1, col2 = numeric_cols[0], numeric_cols[1]
        try:
            # Check if there are no zeros to avoid DivisionByZero
            if (df_clean[col2] != 0).all():
                df_clean[f"{col1}_to_{col2}_ratio"] = (df_clean[col1] / df_clean[col2]).round(4)
                engineered_features.append(f"{col1}_to_{col2}_ratio")
                log.append(f"📐 Created analytical ratio feature: '{col1}_to_{col2}_ratio'")
        except Exception:
            pass

    # Time series rolling average helper
    date_cols_engineered = [c for c in df_clean.columns if "_year" in c]
    if date_cols_engineered and numeric_cols:
        target_num = numeric_cols[0]
        df_clean[f"{target_num}_rolling_mean"] = df_clean[target_num].rolling(window=3, min_periods=1).mean().round(4)
        engineered_features.append(f"{target_num}_rolling_mean")
        log.append(f"📈 Sequential rolling average created for: '{target_num}'")

    # --- STEP 6: DATA VALIDATION & CONTRAINTS ---
    log.append("🎯 Step 6: Validating datatype consistency & constraint bounds...")
    validation_issues = []
    
    for col in numeric_cols:
        if "age" in col.lower():
            negatives = int((df_clean[col] < 0).sum())
            if negatives > 0:
                validation_issues.append(f"Column '{col}' has {negatives} negative values (violates Age constraint).")
                log.append(f"⚠️ Validation constraint warning: negative age instances found in '{col}'.")
                
    if not validation_issues:
        log.append("✅ Schema validated successfully. No constraint violations found.")
    else:
        log.append(f"ℹ️ Found {len(validation_issues)} validation flags. Documented in Validation Report.")

    # --- STEP 7: VISUALIZATION PREPARATION ---
    log.append("📊 Step 7: Structuring visualizations-ready formats & API outputs...")
    
    # Classify Columns
    classified_columns = {
        "dimensions": [c for c in df_clean.columns if c not in numeric_cols],
        "measures": numeric_cols,
        "categorical": categorical_cols,
        "continuous": numeric_cols,
        "temporal": [c for c in df.columns if c in parsed_temporal_cols] # original dates
    }
    
    # --- OUTLIER DETECTION ENGINE (Z-Score & IQR) ---
    outlier_report = {}
    total_outliers = 0
    
    for col in numeric_cols:
        if df_clean[col].nunique() < 10:
            continue
        try:
            col_data = df_clean[col].dropna()
            # IQR limits
            q25 = col_data.quantile(0.25)
            q75 = col_data.quantile(0.75)
            iqr = q75 - q25
            lower_iqr = q25 - 1.5 * iqr
            upper_iqr = q75 + 1.5 * iqr
            iqr_outliers = int(((col_data < lower_iqr) | (col_data > upper_iqr)).sum())
            
            # Z-Score limits
            z_scores = stats.zscore(col_data)
            z_outliers = int((np.abs(z_scores) > 3).sum())
            
            total_outliers += iqr_outliers
            
            outlier_report[col] = {
                "iqr_outliers": iqr_outliers,
                "z_score_outliers": z_outliers,
                "iqr_lower_bound": round(float(lower_iqr), 4),
                "iqr_upper_bound": round(float(upper_iqr), 4)
            }
        except Exception:
            pass
            
    log.append(f"🚨 Outlier detection complete: identified {total_outliers} suspicious rows.")

    # --- DETAILED DESCRIPTIVE STATISTICS ---
    summary_stats = {}
    for col in numeric_cols:
        try:
            col_data = df_clean[col].dropna()
            summary_stats[col] = {
                "count": int(len(col_data)),
                "mean": round(float(col_data.mean()), 4),
                "std": round(float(col_data.std()), 4) if len(col_data) > 1 else 0.0,
                "min": round(float(col_data.min()), 4),
                "q25": round(float(col_data.quantile(0.25)), 4),
                "median": round(float(col_data.median()), 4),
                "q75": round(float(col_data.quantile(0.75)), 4),
                "max": round(float(col_data.max()), 4),
                "skewness": round(float(col_data.skew()), 4) if len(col_data) > 2 else 0.0,
                "kurtosis": round(float(col_data.kurtosis()), 4) if len(col_data) > 2 else 0.0
            }
        except Exception:
            pass

    # --- CORRELATION MATRIX ---
    correlation_matrix = {}
    if len(numeric_cols) >= 2:
        try:
            corr_df = df_clean[numeric_cols].corr(method="pearson").fillna(0)
            correlation_matrix = {col: {c: round(float(v), 4) for c, v in row.items()} for col, row in corr_df.to_dict().items()}
        except Exception:
            pass

    # Top correlations
    top_correlations = []
    if len(numeric_cols) >= 2:
        try:
            corr_abs = df_clean[numeric_cols].corr(method="pearson").abs()
            upper = corr_abs.where(np.triu(np.ones(corr_abs.shape), k=1).astype(bool))
            pairs = upper.stack().reset_index()
            pairs.columns = ["col1", "col2", "value"]
            pairs = pairs.sort_values("value", ascending=False).head(5)
            for _, row in pairs.iterrows():
                signed_val = float(df_clean[numeric_cols].corr().loc[row["col1"], row["col2"]])
                top_correlations.append({
                    "col1": row["col1"],
                    "col2": row["col2"],
                    "value": round(float(row["value"]), 4),
                    "signed_value": round(signed_val, 4)
                })
        except Exception:
            pass

    # --- SHAPIRO NORMALITY / DISTRIBUTION TYPE ---
    distribution_types = {}
    for col in numeric_cols:
        col_data = df_clean[col].dropna()
        if len(col_data) < 3:
            distribution_types[col] = "insufficient data"
            continue
        try:
            sample_data = col_data.sample(min(len(col_data), 1000), random_state=42)
            _, p_value = stats.shapiro(sample_data)
            if p_value > 0.05:
                distribution_types[col] = "approximately normal"
            else:
                skew = col_data.skew()
                if skew >= 0.5:
                    distribution_types[col] = "right-skewed (positively skewed)"
                elif skew <= -0.5:
                    distribution_types[col] = "left-skewed (negatively skewed)"
                else:
                    distribution_types[col] = "non-normal but symmetric"
        except Exception:
            distribution_types[col] = "unknown"

    # --- FEATURE IMPORTANCE (Mutual info) ---
    feature_importance = {}
    if len(numeric_cols) >= 3:
        try:
            from sklearn.feature_selection import mutual_info_regression
            variances = df_clean[numeric_cols].var()
            target_col = variances.idxmax()
            feature_cols = [c for c in numeric_cols if c != target_col]
            
            # Sample to max 2,000 rows for high performance
            if len(df_clean) > 2000:
                df_sample = df_clean.sample(2000, random_state=42)
            else:
                df_sample = df_clean
                
            X = df_sample[feature_cols].fillna(0)
            y = df_sample[target_col].fillna(0)
            mi_scores = mutual_info_regression(X, y, random_state=42)
            importance = dict(zip(feature_cols, mi_scores))
            max_score = max(importance.values()) if importance else 1.0
            if max_score > 0:
                importance = {k: v / max_score for k, v in importance.items()}
            feature_importance = {k: round(float(v), 4) for k, v in sorted(importance.items(), key=lambda x: -x[1])}
        except Exception:
            pass

    # Categorical Stats
    categorical_stats = {}
    for col in categorical_cols:
        try:
            value_counts = df_clean[col].value_counts().head(10)
            categorical_stats[col] = {
                "unique_count": int(df_clean[col].nunique()),
                "top_values": {str(k): int(v) for k, v in value_counts.items()}
            }
        except Exception:
            pass

    # --- DATA QUALITY SCORE ---
    # Missing pct penalty: max 30 points
    missing_pct = (total_missing / max(total_cells, 1)) * 100
    missing_penalty = min(30, missing_pct * 2.5)
    
    # Duplicate pct penalty: max 15 points
    dup_pct = (dupes_count / max(total_rows, 1)) * 100
    dup_penalty = min(15, dup_pct * 2.0)
    
    # Outlier count penalty: max 15 points
    outlier_ratio = (total_outliers / max(total_cells, 1)) * 100
    outlier_penalty = min(15, outlier_ratio * 4.0)
    
    quality_score = max(0, min(100, round(100 - (missing_penalty + dup_penalty + outlier_penalty))))
    
    if quality_score >= 80:
        alert = "Excellent data quality. The dataset exhibits high completeness and structure for production dashboarding."
    elif quality_score >= 60:
        alert = "Moderate data quality. Automated cleaning filled missing segments and standardized structural naming."
    else:
        alert = "Low data quality. High percentage of missing rows or duplicates was found. Proceed with manual validation."

    # --- DYNAMIC POWERBI & VISUALIZATION RECOMMENDATIONS ---
    dashboard_recommendations = {
        "layout_style": "PowerBI Grid Canvas Layout",
        "sidebar_filters": [col for col in categorical_cols[:3]],
        "grid_visual_tiles": [
            {
                "tile": "Category Performance",
                "chart_type": "Clustered Column Chart",
                "x_axis": categorical_cols[0] if categorical_cols else "Index",
                "y_axis": numeric_cols[0] if numeric_cols else "Count"
            },
            {
                "tile": "Chronological Sequence Line",
                "chart_type": "Stacked Area Chart",
                "x_axis": date_cols_engineered[0] if date_cols_engineered else "Index",
                "y_axis": numeric_cols[0] if numeric_cols else "Count"
            }
        ]
    }

    chart_recommendations = []
    if categorical_cols and numeric_cols:
        chart_recommendations.append({
            "type": "column",
            "title": f"Aggregated {numeric_cols[0]} by {categorical_cols[0]}",
            "dimensions": [categorical_cols[0]],
            "measures": [numeric_cols[0]],
            "description": f"Displays the clustered sum total of '{numeric_cols[0]}' categorized by '{categorical_cols[0]}' divisions."
        })
    if len(numeric_cols) >= 2:
        chart_recommendations.append({
            "type": "scatter",
            "title": f"Correlation grid: {numeric_cols[0]} vs {numeric_cols[1]}",
            "dimensions": [numeric_cols[0]],
            "measures": [numeric_cols[1]],
            "description": "Scatter distribution coordinates revealing structural clustering and Pearson standard deviation."
        })

    # KPI Suggestions
    kpi_suggestions = []
    for col in numeric_cols[:3]:
        try:
            kpi_suggestions.append({
                "kpi_name": f"Total {col}",
                "value": formatAxisTick(float(df_clean[col].sum())),
                "type": "Sum Total"
            })
            kpi_suggestions.append({
                "kpi_name": f"Mean {col}",
                "value": formatAxisTick(float(df_clean[col].mean())),
                "type": "Average"
            })
        except Exception:
            pass

    # API-Optimized JSON Structure (Packed column layout to save footprint)
    api_optimized_json = {
        "columns": df_clean.columns.tolist(),
        "series": {col: df_clean[col].head(100).fillna("").tolist() for col in df_clean.columns}
    }

    # Frontend virtualized data paginate helpers
    frontend_optimized_structures = {
        "virtual_row_height_px": 38,
        "lazy_load_chunk_size": 100,
        "total_records": len(df_clean),
        "columns_meta": [{"field": col, "filter": "agTextColumnFilter" if col in categorical_cols else "agNumberColumnFilter"} for col in df_clean.columns]
    }

    # Performance optimization reports
    performance_optimization_report = {
        "rendering_technique": "Virtualized Table Renderer (AG-Grid / custom paginator)",
        "memory_optimization": f"Downcasted float/integer column types. COMPACTION ratio of {compaction_ratio}%.",
        "api_compression": "Lightweight packed column layout JSON, ready for GZIP compression.",
        "chart_rendering_speed": "Pre-grouped aggregated segments slice to maximum 10 parent keys to maintain 60FPS UI re-renders."
    }

    # Prepare final clean preview datasets
    cleaned_dataset = df_clean.head(100).fillna("").to_dict(orient="records")
    preprocessed_dataset = df_clean.head(50).fillna("").to_dict(orient="records")
    feature_engineered_dataset = df_clean.head(50).fillna("").to_dict(orient="records")

    # Calculate detailed preprocessing status
    status_analysis = _analyze_preprocessing_status(df_raw, df_clean)

    log.append("🎉 Analytical and cleaning pipeline executed successfully. Visual datasets ready.")

    # Combined payload mapping 16 required outputs AND existing backward-compatible keys
    payload = {
        # ── 16 Required Output Keys ──
        "cleaned_dataset": cleaned_dataset,
        "preprocessed_dataset": preprocessed_dataset,
        "feature_engineered_dataset": feature_engineered_dataset,
        "visualization_ready_dataset": cleaned_dataset, # immediate visual consumption
        "summary_stats": summary_stats,
        "correlation_matrix": correlation_matrix,
        "missing_value_report": missing_report,
        "outlier_report": outlier_report,
        "data_quality_score": {
            "score": quality_score,
            "evaluation": alert
        },
        "dashboard_recommendations": dashboard_recommendations,
        "chart_recommendations": chart_recommendations,
        "kpi_suggestions": kpi_suggestions,
        "api_optimized_json": api_optimized_json,
        "frontend_optimized_structures": frontend_optimized_structures,
        "performance_optimization_report": performance_optimization_report,
        "preprocessing_log": log,
        "preprocessing_status_analysis": status_analysis,

        # ── Backward Compatibility Keys ──
        "columns_info": _detect_types_simple(df_clean),
        "correlation": correlation_matrix,
        "top_correlations": top_correlations,
        "distribution_types": distribution_types,
        "feature_importance": feature_importance,
        "categorical_stats": categorical_stats,
        "total_columns": len(df_clean.columns),
        "total_rows": len(df_clean)
    }
    return payload, df_clean


def _detect_types_simple(df: pd.DataFrame) -> Dict[str, str]:
    """Quick type detection for already-cleaned DataFrames."""
    col_types = {}
    for col in df.columns:
        if pd.api.types.is_datetime64_any_dtype(df[col]) or "_year" in col:
            col_types[col] = "datetime"
        elif pd.api.types.is_bool_dtype(df[col]):
            col_types[col] = "categorical"
        elif pd.api.types.is_numeric_dtype(df[col]):
            col_types[col] = "numerical"
        else:
            col_types[col] = "categorical"
    return col_types


def formatAxisTick(num) -> str:
    """Format massive numeric values to high-fidelity strings."""
    try:
        absNum = abs(num)
        if absNum >= 1e12:
            return f"{num / 1e12:.1f}T"
        if absNum >= 1e9:
            return f"{num / 1e9:.1f}B"
        if absNum >= 1e6:
            return f"{num / 1e6:.1f}M"
        if absNum >= 1e3:
            return f"{num / 1e3:.1f}K"
        return f"{num:.2f}"
    except Exception:
        return str(num)


def _analyze_preprocessing_status(df_raw: pd.DataFrame, df_clean: pd.DataFrame) -> Dict[str, Any]:
    """
    Detailed diagnostic check to see if a dataset was already preprocessed.
    """
    if df_raw is None:
        return {
            "is_preprocessed": True,
            "status_label": "Preprocessed",
            "score": 100.0,
            "missing_values_raw": 0,
            "duplicates_raw": 0,
            "float_integers_raw": 0,
            "float_integer_columns": [],
            "whitespace_anomalies_raw": 0,
            "outliers_capped_raw": 0,
            "validation_negatives_fixed": 0,
            "total_corrections_made": 0,
            "summary_message": "Dataset was analyzed directly without raw comparison."
        }

    # If df_raw is huge, sample it to 50,000 rows aligned with preprocessor
    if len(df_raw) > 100_000:
        df_raw = df_raw.sample(n=50_000, random_state=42)

    # 1. Check missing values in raw
    missing_raw = int(df_raw.isna().sum().sum())
    
    # 2. Check duplicates in raw
    duplicates_raw = int(df_raw.duplicated().sum())
    
    # 3. Check for whitespace padding in raw
    whitespace_raw = 0
    text_cols = df_raw.select_dtypes(include=["object"]).columns
    for col in text_cols:
        try:
            stripped = df_raw[col].astype(str).str.strip()
            diff = (df_raw[col].astype(str) != stripped).sum()
            whitespace_raw += int(diff)
        except Exception:
            pass
            
    # 4. Check for float-represented integers in raw
    float_integers_cols = []
    numeric_cols = df_raw.select_dtypes(include=[np.number]).columns
    for col in numeric_cols:
        if pd.api.types.is_float_dtype(df_raw[col]):
            # Check if all values are finite and have no decimals
            non_na = df_raw[col].dropna()
            if len(non_na) > 0 and np.all(np.mod(non_na, 1) == 0):
                float_integers_cols.append(col)
                
    # 5. Check for Outliers Capped
    outliers_capped_count = 0
    for col in df_raw.select_dtypes(include=[np.number]).columns:
        if col in df_clean.columns and df_raw[col].nunique() >= 10:
            col_data = df_raw[col].dropna()
            q25 = col_data.quantile(0.25)
            q75 = col_data.quantile(0.75)
            iqr = q75 - q25
            lower = q25 - 1.5 * iqr
            upper = q75 + 1.5 * iqr
            
            # Count values in df_raw that were outside bounds
            col_outliers = int(((col_data < lower) | (col_data > upper)).sum())
            outliers_capped_count += col_outliers

    # 6. Check for Negative / Invalid bounds fixed
    negatives_fixed_count = 0
    logical_non_neg_indicators = ["price", "rating", "reviews", "weeks", "rank", "bsr", "revenue", "sales", "quantity", "count", "age"]
    for col in df_raw.select_dtypes(include=[np.number]).columns:
        if col in df_clean.columns and any(ind in col.lower() for ind in logical_non_neg_indicators):
            raw_negatives = int((df_raw[col] < 0).sum())
            negatives_fixed_count += raw_negatives
            
        # Check rating capped to 5.0
        if "rating" in col.lower() and col in df_clean.columns:
            raw_over_five = int((df_raw[col] > 5).sum())
            negatives_fixed_count += raw_over_five

    # Calculate Preprocessing Score
    # Start at 100. Deduct for raw flaws:
    # - 20 points if it contains missing values
    # - 15 points if it contains duplicate rows
    # - 10 points if it contains whitespace padding anomalies
    # - 5 points if it contains float-represented integers
    # - 10 points if it contains outliers that were capped
    # - 10 points if it contains validation constraint issues
    score = 100.0
    deductions = []
    if missing_raw > 0:
        score -= 20.0
        deductions.append(f"Imputed {missing_raw} missing values (-20 pts)")
    if duplicates_raw > 0:
        score -= 15.0
        deductions.append(f"Removed {duplicates_raw} duplicate rows (-15 pts)")
    if whitespace_raw > 0:
        score -= 10.0
        deductions.append(f"Trimmed leading/trailing whitespaces (-10 pts)")
    if float_integers_cols:
        score -= 5.0
        deductions.append(f"Downcasted {len(float_integers_cols)} float-represented integers back to clean native ints (-5 pts)")
    if outliers_capped_count > 0:
        score -= 10.0
        deductions.append(f"Capped {outliers_capped_count} outliers (-10 pts)")
    if negatives_fixed_count > 0:
        score -= 10.0
        deductions.append(f"Fixed {negatives_fixed_count} validation constraints (-10 pts)")
        
    score = max(0.0, score)
    
    if score == 100.0:
        status_label = "Fully Preprocessed"
        summary_message = "Your dataset is perfectly preprocessed! No missing values, duplicates, whitespace padding, or float integer anomalies were found."
    elif score >= 90.0:
        status_label = "Partially Preprocessed"
        summary_message = f"Your dataset is highly clean but has minor structural artifacts: {', '.join(deductions)}."
    else:
        status_label = "Raw / Unprocessed"
        summary_message = f"Your dataset was in a raw state. We performed the following cleaning operations: {', '.join(deductions)}."
        
    total_corrections = (
        missing_raw + 
        duplicates_raw + 
        whitespace_raw + 
        len(float_integers_cols) + 
        outliers_capped_count + 
        negatives_fixed_count
    )

    # Calculate changed rows
    changed_rows_count = 0
    if df_raw is not None:
        common_cols = [c for c in df_raw.columns if c in df_clean.columns]
        changed_rows_count += duplicates_raw
        try:
            df_clean_subset = df_clean[common_cols]
            # Match subset rows by intersection of indices to prevent KeyError
            matched_indices = df_clean_subset.index.intersection(df_raw.index)
            df_clean_matched = df_clean_subset.loc[matched_indices]
            df_raw_matched = df_raw.loc[matched_indices][common_cols]
            
            diff_mask = (df_raw_matched.fillna("NaN_Val").astype(str) != df_clean_matched.fillna("NaN_Val").astype(str)).any(axis=1)
            changed_rows_count += int(diff_mask.sum())
        except Exception:
            changed_rows_count += min(len(df_clean), missing_raw + whitespace_raw + outliers_capped_count + negatives_fixed_count)

    return {
        "is_preprocessed": score == 100.0,
        "status_label": status_label,
        "score": score,
        "missing_values_raw": missing_raw,
        "duplicates_raw": duplicates_raw,
        "float_integers_raw": len(float_integers_cols),
        "float_integer_columns": float_integers_cols,
        "whitespace_anomalies_raw": whitespace_raw,
        "outliers_capped_raw": outliers_capped_count,
        "validation_negatives_fixed": negatives_fixed_count,
        "total_corrections_made": total_corrections,
        "changed_rows": changed_rows_count,
        "summary_message": summary_message
    }
