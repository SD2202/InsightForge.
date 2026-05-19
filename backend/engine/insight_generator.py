"""
InsightForge Insight Generator
================================
Converts raw analysis and preprocessing reports into human-readable insights.
Avoids technical jargon — written as a friendly data analyst would explain findings.

Rules:
  - Always generate ≥5 insights
  - Start each insight with an emoji for visual scanning
  - Use plain language
  - Highlight actionable findings
"""
import pandas as pd
from typing import Dict, Any, List


def generate_insights(
    preprocess_report: Dict[str, Any],
    analysis_result: Dict[str, Any],
    df: pd.DataFrame,
) -> List[Dict[str, Any]]:
    """
    Generate a list of human-readable insights.
    Each insight is a dict: {id, category, text, severity}
    severity: 'info' | 'warning' | 'success'
    """
    insights = []

    # 1. Dataset overview insight
    insights.append(_dataset_overview(preprocess_report))

    # 2. Missing value insights
    insights.extend(_missing_value_insights(preprocess_report))

    # 3. Duplicate removal insight
    insights.extend(_duplicate_insights(preprocess_report))

    # 4. Outlier insights
    insights.extend(_outlier_insights(preprocess_report))

    # 5. Correlation insights
    insights.extend(_correlation_insights(analysis_result))

    # 6. Distribution insights
    insights.extend(_distribution_insights(analysis_result))

    # 7. Feature importance insights
    insights.extend(_feature_importance_insights(analysis_result))

    # 8. Categorical column insights
    insights.extend(_categorical_insights(analysis_result))

    # 9. Data quality score
    insights.append(_data_quality_score(preprocess_report, analysis_result, df))

    # Ensure minimum 5 insights
    if len(insights) < 5:
        insights.append({
            "id": len(insights) + 1,
            "category": "General",
            "text": (
                "✅ Your dataset looks clean and ready for analysis! "
                "No major issues were detected during preprocessing."
            ),
            "severity": "success",
        })

    # Number them sequentially
    for i, insight in enumerate(insights):
        insight["id"] = i + 1

    return insights


# ── Individual insight generators ─────────────────────────────────────────────

def _dataset_overview(report: Dict) -> Dict:
    orig_rows = report["original_rows"]
    orig_cols = report["original_cols"]
    clean_rows = report["cleaned_rows"]
    rows_retained = round(clean_rows / orig_rows * 100, 1) if orig_rows > 0 else 100

    sampled_note = ""
    if orig_rows > 100_000:
        sampled_note = f" (sampled to 50,000 rows for speed — original had {orig_rows:,} rows)"

    return {
        "id": 1,
        "category": "Dataset Overview",
        "text": (
            f"📊 Your dataset contains {orig_rows:,} rows and {orig_cols} columns{sampled_note}. "
            f"After cleaning, {clean_rows:,} rows were retained ({rows_retained}% of the original data)."
        ),
        "severity": "info",
    }


def _missing_value_insights(report: Dict) -> List[Dict]:
    missing = report.get("missing_values", {})
    insights = []

    if not missing:
        insights.append({
            "id": 0,
            "category": "Missing Values",
            "text": "✅ Great news! No missing values were found in your dataset. Your data is complete.",
            "severity": "success",
        })
        return insights

    # High missing (>30%)
    high_missing = [(col, info) for col, info in missing.items() if info["missing_pct"] > 30]
    # Moderate missing (10–30%)
    moderate_missing = [(col, info) for col, info in missing.items() if 10 <= info["missing_pct"] <= 30]
    # Low missing (<10%)
    low_missing = [(col, info) for col, info in missing.items() if info["missing_pct"] < 10]

    if high_missing:
        cols_str = ", ".join(
            [f"'{col}' ({info['missing_pct']}%)" for col, info in high_missing[:3]]
        )
        insights.append({
            "id": 0,
            "category": "Missing Values",
            "text": (
                f"⚠️ Columns {cols_str} have a high percentage of missing values (>30%). "
                f"These were filled using the most common value, but you may want to double-check these columns."
            ),
            "severity": "warning",
        })

    if moderate_missing:
        cols_str = ", ".join([f"'{col}'" for col, _ in moderate_missing[:3]])
        insights.append({
            "id": 0,
            "category": "Missing Values",
            "text": (
                f"🔧 Columns {cols_str} had moderate missing data (10–30%). "
                f"Numeric columns were filled with the median value, and text columns with the most frequent value."
            ),
            "severity": "warning",
        })

    if low_missing:
        filled_descriptions = []
        for col, info in low_missing[:4]:
            strategy = info["fill_strategy"]
            pct = info["missing_pct"]
            desc = f"'{col}' had {pct}% missing values filled using {strategy}"
            filled_descriptions.append(desc)
        text = "🔧 " + "; ".join(filled_descriptions) + "."
        insights.append({
            "id": 0,
            "category": "Missing Values",
            "text": text,
            "severity": "info",
        })

    return insights


def _duplicate_insights(report: Dict) -> List[Dict]:
    dupes = report.get("duplicates_removed", 0)
    total = report["original_rows"]

    if dupes == 0:
        return [{
            "id": 0,
            "category": "Duplicates",
            "text": "✅ No duplicate rows detected. Each record in your dataset is unique.",
            "severity": "success",
        }]

    pct = round(dupes / total * 100, 1)
    severity = "warning" if pct > 5 else "info"

    return [{
        "id": 0,
        "category": "Duplicates",
        "text": (
            f"🗑️ Found and removed {dupes:,} duplicate rows ({pct}% of your dataset). "
            f"Duplicate records can skew analysis results, so this cleanup improves accuracy."
        ),
        "severity": severity,
    }]


def _outlier_insights(report: Dict) -> List[Dict]:
    outliers = report.get("outliers", {})
    insights = []

    if not outliers:
        return insights

    for col, info in list(outliers.items())[:4]:
        count = info["outliers_capped"]
        lower = info["lower_bound"]
        upper = info["upper_bound"]
        insights.append({
            "id": 0,
            "category": "Outliers",
            "text": (
                f"📌 Column '{col}' contained {count:,} outlier values that were capped. "
                f"Values were kept between {lower:,.2f} and {upper:,.2f} using the IQR method "
                f"to prevent extreme values from distorting the analysis."
            ),
            "severity": "info",
        })

    return insights


def _correlation_insights(analysis: Dict) -> List[Dict]:
    top_corrs = analysis.get("top_correlations", [])
    insights = []

    if not top_corrs:
        return insights

    for pair in top_corrs[:3]:
        col1, col2 = pair["col1"], pair["col2"]
        signed = pair.get("signed_value", pair["value"])
        abs_val = abs(signed)

        if abs_val >= 0.7:
            direction = "positive" if signed > 0 else "negative"
            strength = "strong"
            emoji = "🔗"
        elif abs_val >= 0.4:
            direction = "positive" if signed > 0 else "negative"
            strength = "moderate"
            emoji = "↔️"
        else:
            direction = "weak"
            strength = "weak"
            emoji = "〰️"

        insights.append({
            "id": 0,
            "category": "Correlation",
            "text": (
                f"{emoji} A {strength} {direction} correlation ({signed:.2f}) was found between "
                f"'{col1}' and '{col2}'. "
                + (
                    f"As '{col1}' increases, '{col2}' tends to {'increase' if signed > 0 else 'decrease'} as well."
                    if abs_val >= 0.4
                    else f"These two columns don't show a strong linear relationship."
                )
            ),
            "severity": "info" if abs_val < 0.7 else "success",
        })

    return insights


def _distribution_insights(analysis: Dict) -> List[Dict]:
    dist_types = analysis.get("distribution_types", {})
    summary = analysis.get("summary_stats", {})
    insights = []

    skewed_cols = [(col, dtype) for col, dtype in dist_types.items() if "skewed" in dtype]
    normal_cols = [col for col, dtype in dist_types.items() if dtype == "approximately normal"]

    if skewed_cols:
        for col, dtype in skewed_cols[:2]:
            stats = summary.get(col, {})
            mean_val = stats.get("mean", "N/A")
            median_val = stats.get("median", "N/A")
            insights.append({
                "id": 0,
                "category": "Distribution",
                "text": (
                    f"📈 Column '{col}' failed the Shapiro-Wilk normality test and is {dtype}. "
                    f"The mean ({mean_val}) is {'higher' if 'right' in dtype else 'lower'} than the median ({median_val}), "
                    f"suggesting extreme values pull the average."
                ),
                "severity": "info",
            })

    if normal_cols:
        cols_str = ", ".join([f"'{c}'" for c in normal_cols[:3]])
        insights.append({
            "id": 0,
            "category": "Distribution",
            "text": (
                f"📊 Based on the Shapiro-Wilk statistical test, columns {cols_str} follow an approximately normal distribution, "
                f"which is ideal for many statistical analyses and machine learning models."
            ),
            "severity": "success",
        })

    return insights


def _feature_importance_insights(analysis: Dict) -> List[Dict]:
    importance = analysis.get("feature_importance", {})
    insights = []

    if not importance:
        return insights

    top_feature = list(importance.keys())[0]
    top_score = list(importance.values())[0]

    if len(importance) >= 2:
        second_feature = list(importance.keys())[1]
        second_score = list(importance.values())[1]
        insights.append({
            "id": 0,
            "category": "Mutual Information",
            "text": (
                f"🎯 Mutual Information analysis shows '{top_feature}' shares the most non-linear information "
                f"(normalized score: {top_score:.3f}) with the dataset's highest variance column, followed by '{second_feature}' "
                f"(score: {second_score:.3f}). These columns contain the most unique signal."
            ),
            "severity": "success",
        })
    else:
        insights.append({
            "id": 0,
            "category": "Mutual Information",
            "text": (
                f"🎯 '{top_feature}' appears to hold the most informational value "
                f"based on Mutual Information scores (score: {top_score:.3f})."
            ),
            "severity": "success",
        })

    return insights


def _categorical_insights(analysis: Dict) -> List[Dict]:
    cat_stats = analysis.get("categorical_stats", {})
    insights = []

    if not cat_stats:
        return insights

    for col, stats in list(cat_stats.items())[:2]:
        unique_count = stats["unique_count"]
        top_values = stats.get("top_values", {})

        if top_values:
            top_val = list(top_values.keys())[0]
            top_count = list(top_values.values())[0]
            total = analysis.get("total_rows", 1)
            pct = round(top_count / total * 100, 1)

            insights.append({
                "id": 0,
                "category": "Categorical Data",
                "text": (
                    f"🏷️ Column '{col}' has {unique_count} unique categories. "
                    f"The most common value is '{top_val}', appearing in {pct}% of records ({top_count:,} times)."
                ),
                "severity": "info",
            })

    return insights


def _data_quality_score(
    report: Dict, analysis: Dict, df: pd.DataFrame
) -> Dict:
    """Compute an overall data quality score and summarize it."""
    score = 100

    # Penalize for missing values
    total_missing = sum(info["missing_count"] for info in report.get("missing_values", {}).values())
    total_cells = report["original_rows"] * report["original_cols"]
    missing_pct = (total_missing / total_cells * 100) if total_cells > 0 else 0
    score -= min(30, missing_pct * 2)

    # Penalize for duplicates
    dup_pct = (report.get("duplicates_removed", 0) / max(report["original_rows"], 1)) * 100
    score -= min(15, dup_pct * 1.5)

    # Penalize for outliers
    total_outlier_cols = len(report.get("outliers", {}))
    score -= total_outlier_cols * 3

    score = max(0, round(score))

    if score >= 80:
        label = "Excellent"
        emoji = "🟢"
        severity = "success"
        message = "Your dataset is in great shape for analysis."
    elif score >= 60:
        label = "Good"
        emoji = "🟡"
        severity = "info"
        message = "Your dataset is usable but had some issues that were automatically fixed."
    else:
        label = "Fair"
        emoji = "🔴"
        severity = "warning"
        message = "Your dataset needed significant cleaning. Review the issues flagged above."

    return {
        "id": 0,
        "category": "Data Quality Score",
        "text": (
            f"{emoji} Overall Data Quality Score: {score}/100 — {label}. {message}"
        ),
        "severity": severity,
        "score": score,
    }
