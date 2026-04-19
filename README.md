# CardioAI Pro - Deep Learning Expert System

CardioAI Pro is an end-to-end, AI-powered cardiovascular disease risk prediction web application. It combines traditional Machine Learning (Random Forest) with Deep Learning (Artificial Neural Network via TensorFlow/Keras) to provide robust, ensemble predictions. Furthermore, it implements Rule-based Expert System logic and AI explainability (SHAP) to interpret the model's decisions.

## Features
- **Machine Learning Pipeline**: Automates data fetching (UCI Heart Disease dataset), preprocessing, and model training.
- **Deep Learning**: Implements a Keras Sequential Artificial Neural Network alongside a Random Forest Classifier.
- **Ensemble Prediction**: Combines both models to determine a final risk probability score.
- **AI Explainability**: Uses SHAP (SHapley Additive exPlanations) to visualize how each clinical feature impacts the prediction.
- **Expert System**: Rule-based logic that identifies critical warning signs and suggests tailored precautions.
- **Beautiful UI**: A premium, responsive "medical dark mode" frontend with glassmorphism and interactive Chart.js visualizations.
- **REST API**: Built with FastAPI for high performance.

## Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/CardioAI.git
   cd CardioAI
   ```

2. **Install the required dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Train the Models:**
   *Note: This step downloads the dataset, trains the RF and ANN models, and saves the `.pkl` and `.keras` artifacts to the root directory.*
   ```bash
   python train_model.py
   ```

4. **Start the Web Server:**
   ```bash
   python app.py
   ```

5. **Access the application:**
   Open your browser and navigate to: `http://127.0.0.1:8000`

## Tech Stack
- **Backend**: Python, FastAPI
- **Machine Learning**: Scikit-Learn, TensorFlow, Keras, SHAP
- **Frontend**: HTML5, Vanilla CSS3, JavaScript, Chart.js
- **Dataset**: UCI Machine Learning Repository (Heart Disease)

## License
MIT License
