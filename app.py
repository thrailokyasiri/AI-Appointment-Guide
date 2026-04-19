from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
import pandas as pd
import numpy as np
import joblib
import os
import json
import shap
import tensorflow as tf

app = FastAPI(title="CardioAI Expert System - Enhanced")

# Mount static directory
app.mount("/static", StaticFiles(directory="static"), name="static")

# Load Models and Artifacts
try:
    preprocessor = joblib.load("preprocessor.pkl")
    rf_model = joblib.load("rf_model.pkl")
    ann_model = tf.keras.models.load_model("ann_model.keras")
    
    with open('feature_names.json', 'r') as f:
        feature_names = json.load(f)
        
    with open('metrics.json', 'r') as f:
        global_metrics = json.load(f)
        
    # Initialize SHAP explainer for Random Forest
    rf_explainer = shap.TreeExplainer(rf_model)
    
except Exception as e:
    print(f"Warning: Models not fully loaded. Please run train_model.py first. Error: {e}")
    preprocessor, rf_model, ann_model, rf_explainer = None, None, None, None
    feature_names, global_metrics = [], {}

class PatientData(BaseModel):
    age: float; sex: int; cp: int; trestbps: float; chol: float
    fbs: int; restecg: int; thalach: float; exang: int
    oldpeak: float; slope: int; ca: int; thal: int

@app.get("/")
async def read_index():
    return FileResponse("static/index.html")

@app.get("/metrics")
async def get_metrics():
    return global_metrics

@app.post("/predict")
async def predict(data: PatientData):
    if rf_model is None or ann_model is None or preprocessor is None:
        raise HTTPException(status_code=500, detail="Models not loaded. Run train_model.py.")
    
    input_dict = data.dict()
    df = pd.DataFrame([input_dict])
    
    try:
        # Preprocess
        X_processed = preprocessor.transform(df)
        
        # Random Forest Prediction
        rf_prob = float(rf_model.predict_proba(X_processed)[0][1])
        
        # ANN Prediction
        ann_prob = float(ann_model.predict(X_processed, verbose=0)[0][0])
        
        # Calculate SHAP values for RF
        # RF explainer returns a list of arrays if multi-class, or a single array.
        shap_values = rf_explainer.shap_values(X_processed)
        if isinstance(shap_values, list):
            # For class 1 (High Risk)
            patient_shap = shap_values[1][0].tolist() 
        else:
            patient_shap = shap_values[0].tolist()
            
        # Create shap dictionary mapped to feature names
        shap_dict = dict(zip(feature_names, patient_shap))
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")

    # Use Average Probability for Risk Percentage
    avg_prob = (rf_prob + ann_prob) / 2
    risk_percentage = round(avg_prob * 100, 2)
    
    # Expert System Logic
    expert_rules_triggered = []
    if data.chol > 240 and data.trestbps > 140:
        expert_rules_triggered.append("High cholesterol and high blood pressure indicates significant risk.")
    if data.age > 50 and data.cp > 0:
        expert_rules_triggered.append("Age over 50 combined with chest pain is a warning sign.")
    if data.fbs == 1:
        expert_rules_triggered.append("Fasting blood sugar > 120 mg/dl increases cardiovascular risk.")
    if data.thalach < 100 and data.age < 60:
        expert_rules_triggered.append("Unusually low maximum heart rate may indicate an underlying issue.")
    if data.ca > 1:
        expert_rules_triggered.append("Multiple vessels colored by fluoroscopy suggests blockages.")

    # Synthesize Final Assessment
    if risk_percentage > 60 or len(expert_rules_triggered) >= 2:
        final_assessment = "High Risk of Heart Disease"
        precautions = ["Consult a cardiologist immediately.", "Avoid strenuous physical activities.", "Strict heart-healthy diet."]
    elif risk_percentage > 30 or len(expert_rules_triggered) == 1:
        final_assessment = "Moderate Risk of Heart Disease"
        precautions = ["Schedule a check-up soon.", "Moderate exercise.", "Reduce dietary cholesterol."]
    else:
        final_assessment = "Low Risk of Heart Disease"
        precautions = ["Maintain healthy lifestyle.", "Routine check-ups."]

    return {
        "assessment": final_assessment,
        "risk_percentage": risk_percentage,
        "models": {
            "random_forest_risk": round(rf_prob * 100, 2),
            "ann_risk": round(ann_prob * 100, 2)
        },
        "shap_values": shap_dict,
        "expert_rules": expert_rules_triggered,
        "precautions": precautions,
        "feature_values": input_dict
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="127.0.0.1", port=8000, reload=True)
