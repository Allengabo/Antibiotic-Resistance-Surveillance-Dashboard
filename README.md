# Antibiotic Resistance Surveillance Dashboard

A web-based interactive dashboard designed to track antibiotic resistance patterns, monitor Multidrug-Resistant Organisms (MDROs), and visualize patient outcomes based on laboratory isolate data.

**[🔴 View Live Dashboard](https://allengabo.github.io/Antibiotic-Resistance-Surveillance-Dashboard/)**

## 📖 Overview
This dashboard allows health informatics professionals and researchers to analyze large datasets of antibiotic susceptibility testing (AST) results. It provides real-time filtering and visualization to identify resistance trends and critical MDRO cases (e.g., KPC, NDM-1).

## ✨ Key Features
* **Dynamic Filtering:** Filter data by Specimen Type, Gender, and Patient Outcome.
* **KPI Tracking:** Real-time calculation of Total Isolates, Overall Resistance Rate, and MDRO counts.
* **Antibiogram Heatmap:** Visualizes resistance percentages across key antibiotics (Amoxicillin, Ciprofloxacin, Meropenem, Vancomycin, Colistin).
* **Outcome Analysis:** Stacked bar charts comparing resistance status against patient outcomes (e.g., Discharged, Deceased).
* **Demographic Insights:** Box plots analyzing patient age distribution and pie charts for specimen types.
* **MDRO Detection:** Automatically flags records containing resistance genes like KPC, OXA-48, NDM-1, and VIM.

## 🛠️ Technologies Used
* **Frontend:** HTML5, CSS3, JavaScript (ES6+)
* **Data Visualization:** [Plotly.js](https://plotly.com/javascript/)
* **Data Manipulation:** [D3.js (v7)](https://d3js.org/)
* **Hosting:** GitHub Pages

## 📂 Project Structure
```text
/
├── index.html         # Main dashboard layout
├── styles.css         # Custom styling and layout
├── app.js             # Logic for data fetching, filtering, and rendering charts
├── antibiotic_resistance_tracking.csv  # Raw dataset
└── README.md          # Project documentation
