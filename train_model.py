import pandas as pd
import numpy as np
from ucimlrepo import fetch_ucirepo 
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.metrics import accuracy_score, confusion_matrix
import joblib
import json

import os
# Suppress TF warnings
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'
import tensorflow as tf
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import Dense, Dropout

def build_ann(input_dim):
    model = Sequential([
        Dense(32, activation='relu', input_dim=input_dim),
        Dropout(0.2),
        Dense(16, activation='relu'),
        Dropout(0.2),
        Dense(1, activation='sigmoid')
    ])
    model.compile(optimizer='adam', loss='binary_crossentropy', metrics=['accuracy'])
    return model

def main():
    print("Fetching dataset from UCI ML Repository...")
    heart_disease = fetch_ucirepo(id=45) 
    X = heart_disease.data.features 
    y = heart_disease.data.targets 

    print("Data fetched. Preprocessing...")
    y_binary = (y > 0).astype(int)

    num_features = ['age', 'trestbps', 'chol', 'thalach', 'oldpeak']
    cat_features = ['sex', 'cp', 'fbs', 'restecg', 'exang', 'slope', 'ca', 'thal']

    num_pipeline = Pipeline([
        ('imputer', SimpleImputer(strategy='median')),
        ('scaler', StandardScaler())
    ])

    cat_pipeline = Pipeline([
        ('imputer', SimpleImputer(strategy='most_frequent'))
    ])

    preprocessor = ColumnTransformer([
        ('num', num_pipeline, num_features),
        ('cat', cat_pipeline, cat_features)
    ])

    X_train, X_test, y_train, y_test = train_test_split(X, y_binary, test_size=0.2, random_state=42)
    y_train_arr = y_train.values.ravel()
    y_test_arr = y_test.values.ravel()

    # Fit and transform preprocessor
    X_train_processed = preprocessor.fit_transform(X_train)
    X_test_processed = preprocessor.transform(X_test)
    
    # Save preprocessor
    joblib.dump(preprocessor, 'preprocessor.pkl')
    print("Preprocessor saved to preprocessor.pkl")

    metrics = {}

    # --- Random Forest ---
    print("Training Random Forest Classifier...")
    rf_model = RandomForestClassifier(n_estimators=100, random_state=42, class_weight='balanced')
    rf_model.fit(X_train_processed, y_train_arr)
    
    rf_preds = rf_model.predict(X_test_processed)
    rf_acc = accuracy_score(y_test_arr, rf_preds)
    rf_cm = confusion_matrix(y_test_arr, rf_preds).tolist()
    
    metrics['RandomForest'] = {
        'accuracy': rf_acc,
        'confusion_matrix': rf_cm
    }
    
    joblib.dump(rf_model, 'rf_model.pkl')
    print(f"Random Forest saved to rf_model.pkl. Accuracy: {rf_acc:.4f}")

    # --- Artificial Neural Network ---
    print("Training Artificial Neural Network...")
    ann_model = build_ann(X_train_processed.shape[1])
    # Early stopping
    callback = tf.keras.callbacks.EarlyStopping(monitor='val_loss', patience=10, restore_best_weights=True)
    
    ann_model.fit(X_train_processed, y_train_arr, epochs=100, batch_size=16, 
                  validation_split=0.2, callbacks=[callback], verbose=0)
    
    ann_preds_prob = ann_model.predict(X_test_processed)
    ann_preds = (ann_preds_prob > 0.5).astype(int).flatten()
    
    ann_acc = accuracy_score(y_test_arr, ann_preds)
    ann_cm = confusion_matrix(y_test_arr, ann_preds).tolist()
    
    metrics['ANN'] = {
        'accuracy': float(ann_acc),
        'confusion_matrix': ann_cm
    }
    
    ann_model.save('ann_model.keras')
    print(f"ANN saved to ann_model.keras. Accuracy: {ann_acc:.4f}")

    # Save metrics
    with open('metrics.json', 'w') as f:
        json.dump(metrics, f)
    print("Metrics saved to metrics.json")

    # To ensure feature names are passed to SHAP later, we need to know the order
    # ColumnTransformer concatenates 'num' then 'cat'
    feature_names = num_features + cat_features
    with open('feature_names.json', 'w') as f:
        json.dump(feature_names, f)
    print("Feature names saved to feature_names.json")

if __name__ == "__main__":
    main()
