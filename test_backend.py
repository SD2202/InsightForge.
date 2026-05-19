import pandas as pd
import json
import sys
import os

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from engine.preprocessor import preprocess
from engine.analyzer import analyze
from engine.insight_generator import generate_insights

try:
    data = preprocess("sample_data.csv")
    df = data["cleaned_df"]
    report = data["report"]
    
    analysis, _ = analyze(df)
    insights = generate_insights(report, analysis, df)
    
    print("INSIGHTS GENERATED SUCCESSFULLY:")
    for insight in insights:
        print(f"- [{insight['severity']}] {insight['category']}: {insight['text'][:100]}...")
except Exception as e:
    print("ERROR:", e)
