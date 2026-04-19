document.addEventListener('DOMContentLoaded', async () => {
    const form = document.getElementById('prediction-form');
    const predictBtn = document.getElementById('predict-btn');
    const btnText = predictBtn.querySelector('span');
    const btnLoader = document.getElementById('btn-loader');
    const resultsSection = document.getElementById('results-section');
    
    let shapChartInstance = null;
    let cmChartInstance = null;
    let currentReportText = '';

    // Fetch Global Metrics on Load
    try {
        const res = await fetch('/metrics');
        if (res.ok) {
            const metrics = await res.json();
            if (metrics.RandomForest && metrics.ANN) {
                document.getElementById('rf-acc').textContent = (metrics.RandomForest.accuracy * 100).toFixed(1) + '%';
                document.getElementById('ann-acc').textContent = (metrics.ANN.accuracy * 100).toFixed(1) + '%';
                renderConfusionMatrix(metrics.RandomForest.confusion_matrix, metrics.ANN.confusion_matrix);
            }
        }
    } catch (e) {
        console.log("Could not load metrics:", e);
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // UI Loading State
        btnText.classList.add('hidden');
        btnLoader.classList.remove('hidden');
        predictBtn.disabled = true;
        
        // Gather data
        const formData = new FormData(form);
        const data = {};
        for (const [key, value] of formData.entries()) {
            data[key] = parseFloat(value);
        }

        try {
            // API Call
            const response = await fetch('/predict', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.detail || 'Prediction failed. Ensure the model is trained.');
            }

            const result = await response.json();
            
            // Render Results
            renderResults(result);
            renderShapChart(result.shap_values);
            generateReportText(data, result);
            
            // Show Results Panel
            resultsSection.classList.remove('hidden');
            resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

        } catch (error) {
            alert('Error: ' + error.message);
        } finally {
            // Reset UI Loading State
            btnText.classList.remove('hidden');
            btnLoader.classList.add('hidden');
            predictBtn.disabled = false;
        }
    });

    function renderResults(result) {
        const riskCircle = document.getElementById('risk-circle-path');
        const riskText = document.getElementById('risk-percentage-text');
        const assessmentTitle = document.getElementById('assessment-title');
        const assessmentCard = document.getElementById('assessment-card');
        
        document.getElementById('res-rf').textContent = result.models.random_forest_risk;
        document.getElementById('res-ann').textContent = result.models.ann_risk;
        
        assessmentTitle.textContent = result.assessment;
        
        assessmentCard.classList.remove('risk-low', 'risk-moderate', 'risk-high');
        if (result.risk_percentage > 60 || result.assessment.includes('High')) {
            assessmentCard.classList.add('risk-high');
        } else if (result.risk_percentage > 30 || result.assessment.includes('Moderate')) {
            assessmentCard.classList.add('risk-moderate');
        } else {
            assessmentCard.classList.add('risk-low');
        }

        setTimeout(() => {
            riskCircle.setAttribute('stroke-dasharray', `${result.risk_percentage}, 100`);
            
            let start = 0;
            const end = result.risk_percentage;
            const duration = 1500;
            const increment = end / (duration / 16); 
            
            const counter = setInterval(() => {
                start += increment;
                if (start >= end) {
                    riskText.textContent = end.toFixed(1) + '%';
                    clearInterval(counter);
                } else {
                    riskText.textContent = start.toFixed(1) + '%';
                }
            }, 16);
        }, 100);

        const rulesList = document.getElementById('expert-rules-list');
        rulesList.innerHTML = '';
        if (result.expert_rules && result.expert_rules.length > 0) {
            result.expert_rules.forEach(rule => {
                const li = document.createElement('li');
                li.textContent = rule;
                rulesList.appendChild(li);
            });
        } else {
            rulesList.innerHTML = '<li>No critical rule-based flags triggered. Evaluation relies strictly on DL/ML models.</li>';
        }

        const precautionsList = document.getElementById('precautions-list');
        precautionsList.innerHTML = '';
        if (result.precautions) {
            result.precautions.forEach(p => {
                const li = document.createElement('li');
                li.textContent = p;
                precautionsList.appendChild(li);
            });
        }
    }

    function renderShapChart(shapDict) {
        const ctx = document.getElementById('shapChart').getContext('2d');
        if (shapChartInstance) shapChartInstance.destroy();

        // Sort by absolute importance
        const entries = Object.entries(shapDict).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
        const labels = entries.map(e => e[0].toUpperCase());
        const values = entries.map(e => e[1]);
        
        const backgroundColors = values.map(v => v > 0 ? 'rgba(239, 68, 68, 0.7)' : 'rgba(16, 185, 129, 0.7)');
        const borderColors = values.map(v => v > 0 ? 'rgba(239, 68, 68, 1)' : 'rgba(16, 185, 129, 1)');

        shapChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Impact on Risk (SHAP Value)',
                    data: values,
                    backgroundColor: backgroundColors,
                    borderColor: borderColors,
                    borderWidth: 1,
                    borderRadius: 4
                }]
            },
            options: {
                indexAxis: 'y', // horizontal bar chart
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { grid: { color: 'rgba(255, 255, 255, 0.1)' }, ticks: { color: '#94a3b8' } },
                    y: { grid: { display: false }, ticks: { color: '#94a3b8' } }
                }
            }
        });
    }

    function renderConfusionMatrix(cmRF, cmANN) {
        // Flattening metrics for a simple grouped bar chart for comparison
        // Classes: True Neg(0,0), False Pos(0,1), False Neg(1,0), True Pos(1,1)
        const ctx = document.getElementById('cmChart').getContext('2d');
        if (cmChartInstance) cmChartInstance.destroy();

        const labels = ['True Negatives', 'False Positives', 'False Negatives', 'True Positives'];
        const rfData = [cmRF[0][0], cmRF[0][1], cmRF[1][0], cmRF[1][1]];
        const annData = [cmANN[0][0], cmANN[0][1], cmANN[1][0], cmANN[1][1]];

        cmChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    { label: 'Random Forest', data: rfData, backgroundColor: 'rgba(16, 185, 129, 0.7)' },
                    { label: 'Neural Network', data: annData, backgroundColor: 'rgba(59, 130, 246, 0.7)' }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } },
                    x: { grid: { display: false }, ticks: { color: '#94a3b8' } }
                },
                plugins: { legend: { labels: { color: '#f8fafc' } } }
            }
        });
    }

    function generateReportText(inputs, result) {
        currentReportText = `===========================================
CARDIOVASCULAR RISK ASSESSMENT REPORT (PRO)
===========================================

PATIENT DATA:
Age: ${inputs.age}
Gender (1=M, 0=F): ${inputs.sex}
Chest Pain Type: ${inputs.cp}
Resting Blood Pressure: ${inputs.trestbps} mm Hg
Cholesterol: ${inputs.chol} mg/dl
Max Heart Rate: ${inputs.thalach}

===========================================
PREDICTION RESULTS
===========================================
Assessment: ${result.assessment}
Overall Risk Probability: ${result.risk_percentage.toFixed(2)}%

MODEL BREAKDOWN:
- Random Forest Risk: ${result.models.random_forest_risk}%
- Neural Network Risk: ${result.models.ann_risk}%

EXPERT SYSTEM INSIGHTS:
${result.expert_rules && result.expert_rules.length > 0 ? result.expert_rules.map(r => '- ' + r).join('\n') : 'No critical insights triggered.'}

RECOMMENDED PRECAUTIONS:
${result.precautions ? result.precautions.map(p => '- ' + p).join('\n') : ''}

===========================================
Disclaimer: This is an AI tool and not a substitute for professional medical advice.
===========================================`;
    }

    document.getElementById('download-btn').addEventListener('click', () => {
        const blob = new Blob([currentReportText], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `CardioAI_Pro_Report_${new Date().getTime()}.txt`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    });
});
