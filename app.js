// Define the path to your data file
// NOTE: This path is guaranteed to match your successful server log.
const DATA_FILE_PATH = 'antibiotic_resistance_tracking.csv'; 

// List of antibiotic columns
const ANTIBIOTIC_COLS = ['Amoxicillin', 'Ciprofloxacin', 'Meropenem', 'Vancomycin', 'Colistin'];
// List of MDRO-indicating resistance genes
const MDRO_GENES = ['KPC', 'OXA-48', 'NDM-1', 'VIM'];

let fullData = []; 
let filteredData = []; 
let crossFilterSpecimen = null; 

/**
 * --- DATA LOADING AND INITIALIZATION ---
 */

d3.csv(DATA_FILE_PATH).then(data => {
    fullData = data.map(d => {
        d.Age = isNaN(+d.Age) ? null : +d.Age; 
        
        const resistanceGenesString = String(d.Resistance_Genes || 'None');
        
        d.isMDRO = MDRO_GENES.some(gene => resistanceGenesString.toUpperCase().includes(gene.toUpperCase()));
        
        d.hasAnyResistance = ANTIBIOTIC_COLS.some(a => {
            const result = d[a];
            return result && (String(result).toUpperCase() === 'RESISTANT' || String(result).toUpperCase() === 'INTERMEDIATE');
        });

        d.Specimen_Type = String(d.Specimen_Type || 'Unknown');
        d.Outcome = String(d.Outcome || 'Unknown');
        
        return d;
    }).filter(d => d.Patient_ID); 

    filteredData = [...fullData];
    setupFilters();
    renderDashboard();

}).catch(error => {
    console.error("CRITICAL ERROR: Data failed to load or render.", error);
    document.querySelector('.dashboard-header h1').innerHTML = "CRITICAL ERROR: Data failed to load. See console for details.";
});

/**
 * --- FILTER LOGIC ---
 */

function setupFilters() {
    const specimenTypes = [...new Set(fullData.map(d => d.Specimen_Type))].filter(v => v && v !== 'Unknown').sort();
    const genders = [...new Set(fullData.map(d => d.Gender))].filter(v => v).sort();
    const outcomes = [...new Set(fullData.map(d => d.Outcome))].filter(v => v && v !== 'Unknown').sort();

    populateSelect('specimen-filter', specimenTypes);
    populateSelect('gender-filter', genders);
    populateSelect('outcome-filter', outcomes);
}

function populateSelect(elementId, values) {
    const select = document.getElementById(elementId);
    select.innerHTML = '<option value="">All</option>'; 
    values.forEach(value => {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = value;
        select.appendChild(option);
    });
}

function applyFilters() {
    const dropdownSpecimen = document.getElementById('specimen-filter').value;
    const gender = document.getElementById('gender-filter').value;
    const outcome = document.getElementById('outcome-filter').value;

    const finalSpecimenFilter = crossFilterSpecimen || dropdownSpecimen;

    filteredData = fullData.filter(d => {
        return (finalSpecimenFilter ? d.Specimen_Type === finalSpecimenFilter : true) &&
               (gender ? d.Gender === gender : true) &&
               (outcome ? d.Outcome === outcome : true);
    });
    
    document.getElementById('specimen-filter').value = finalSpecimenFilter || "";

    renderDashboard();
}

function resetFilters() {
    document.getElementById('specimen-filter').value = "";
    document.getElementById('gender-filter').value = "";
    document.getElementById('outcome-filter').value = "";
    crossFilterSpecimen = null; 
    applyFilters();
}

function handleCrossFilter(specimenType) {
    if (crossFilterSpecimen === specimenType) {
        crossFilterSpecimen = null;
    } else {
        crossFilterSpecimen = specimenType;
    }
    document.getElementById('specimen-filter').value = ""; 
    applyFilters();
}


/**
 * --- VISUALIZATION AND RENDERING ---
 */

function renderDashboard() {
    // We update KPIs first
    updateKPIs();
    // Then render charts
    renderAntibiogramHeatmap();
    renderSpecimenPieChart(); 
    renderOutcomeBarChart();
    renderAgeBoxPlot();
}

function calculateResistanceRates() {
    const resistanceRates = {};
    const totalIsolates = filteredData.length;
    if (totalIsolates === 0) return {};

    ANTIBIOTIC_COLS.forEach(antibiotic => {
        let resistantCount = 0;
        let testedCount = 0; 
        filteredData.forEach(d => {
            const result = d[antibiotic];
            if (result) {
                testedCount++;
                if (String(result).toUpperCase() === 'RESISTANT') {
                    resistantCount++;
                }
            }
        });
        resistanceRates[antibiotic] = testedCount > 0 ? (resistantCount / testedCount) * 100 : 0;
    });
    return resistanceRates;
}

function updateKPIs() {
    const totalCount = filteredData.length;
    document.getElementById('kpi-total').textContent = totalCount;

    if (totalCount === 0) {
        document.getElementById('kpi-resistance-rate').textContent = '0.00%';
        document.getElementById('kpi-mdro-count').textContent = '0';
        return;
    }

    const rates = calculateResistanceRates();
    const rateValues = Object.values(rates);
    const totalResistance = rateValues.reduce((a, b) => a + b, 0);
    const avgResistanceRate = rateValues.length > 0 ? totalResistance / rateValues.length : 0;
    document.getElementById('kpi-resistance-rate').textContent = `${avgResistanceRate.toFixed(2)}%`;
    
    const mdroCount = filteredData.filter(d => d.isMDRO).length;
    document.getElementById('kpi-mdro-count').textContent = mdroCount;
}

function handleEmptyChart(chartId, title) {
    Plotly.newPlot(chartId, [], {
        title: title,
        xaxis: { visible: false },
        yaxis: { visible: false },
        annotations: [{
            text: 'No data to display based on current filters.',
            xref: 'paper',
            yref: 'paper',
            showarrow: false,
            font: { size: 16, color: '#999' }
        }],
        height: 350
    });
}


function renderAntibiogramHeatmap() {
    if (filteredData.length === 0) {
        return handleEmptyChart('antibiogram-heatmap', 'Antibiogram: Percent Resistance by Drug');
    }

    const rates = calculateResistanceRates();
    const antibiotics = Object.keys(rates);
    const resistancePercent = Object.values(rates).map(v => v.toFixed(2));

    const data = [{
        z: [resistancePercent], 
        x: antibiotics, 
        y: ['Overall Resistance'], 
        type: 'heatmap',
        hoverongaps: false,
        colorscale: [
            [0, 'rgb(10, 180, 10)'],      
            [0.5, 'rgb(255, 255, 100)'], 
            [1, 'rgb(200, 50, 50)']      
        ],
        colorbar: {
            title: 'Resistance (%)',
            titleside: 'right'
        }
    }];

    const layout = {
        title: {
            text: `Percentage Resistance by Antibiotic ${crossFilterSpecimen ? ` (Specimen: ${crossFilterSpecimen})` : ''}`,
            font: { size: 16 }
        },
        xaxis: {
            title: 'Antibiotics',
            automargin: true
        },
        yaxis: {
            automargin: true,
            tickangle: -45
        },
        height: 350,
        margin: { t: 50, r: 50, b: 100, l: 150 },
        responsive: true
    };

    Plotly.newPlot('antibiogram-heatmap', data, layout);
}


function renderSpecimenPieChart() {
    const chartData = filteredData.filter(d => d.Specimen_Type !== 'Unknown' && d.Specimen_Type);
    const groupedData = d3.group(chartData, d => d.Specimen_Type);
    
    const labels = [];
    const values = [];

    groupedData.forEach((group, specimen) => {
        labels.push(specimen);
        values.push(group.length);
    });

    if (labels.length === 0) {
        return handleEmptyChart('specimen-pie-chart', 'Isolate Distribution by Specimen Type');
    }

    // FIX: Use global d3 object instead of Plotly.d3
    const defaultColors = d3.scaleOrdinal(d3.schemeCategory10).range();
    
    const colors = labels.map((label, index) => 
        (crossFilterSpecimen && label === crossFilterSpecimen) ? '#1a73e8' : 
        (crossFilterSpecimen && label !== crossFilterSpecimen) ? '#e0e0e0' : defaultColors[index % defaultColors.length]
    );

    const data = [{
        labels: labels,
        values: values,
        type: 'pie',
        hoverinfo: 'label+percent+value',
        textinfo: 'percent',
        automargin: true,
        marker: {
            colors: colors 
        }
    }];

    const layout = {
        title: 'Isolate Count Distribution by Specimen Type',
        height: 400,
        margin: { t: 50, b: 50, l: 50, r: 50 },
        showlegend: true,
        responsive: true
    };

    Plotly.newPlot('specimen-pie-chart', data, layout);
    
    document.getElementById('specimen-pie-chart').on('plotly_click', function(data){
        const specimenType = data.points[0].label;
        handleCrossFilter(specimenType);
    });
}

function renderOutcomeBarChart() {
    const chartData = filteredData.filter(d => d.Outcome !== 'Unknown' && d.Outcome);
    const groupedData = d3.group(chartData, d => d.Outcome, d => d.hasAnyResistance);
    const outcomes = [...new Set(chartData.map(d => d.Outcome))].filter(v => v).sort();
    
    if (outcomes.length === 0) {
        return handleEmptyChart('outcome-stacked-bar-chart', 'Resistance Status by Patient Outcome');
    }

    const resistantCounts = [];
    const susceptibleCounts = [];

    outcomes.forEach(outcome => {
        const outcomeGroup = groupedData.get(outcome) || new Map();
        
        const resistantCount = (outcomeGroup.get(true) || []).length;
        const susceptibleCount = (outcomeGroup.get(false) || []).length;

        resistantCounts.push(resistantCount);
        susceptibleCounts.push(susceptibleCount);
    });

    const traceResistant = {
        x: outcomes,
        y: resistantCounts,
        name: 'Resistant / Intermediate',
        type: 'bar',
        marker: {
            color: '#d93025'
        }
    };

    const traceSusceptible = {
        x: outcomes,
        y: susceptibleCounts,
        name: 'Fully Susceptible',
        type: 'bar',
        marker: {
            color: '#34a853'
        }
    };

    const layout = {
        title: 'Resistance Status by Patient Outcome',
        barmode: 'stack',
        xaxis: {
            title: 'Patient Outcome',
            automargin: true
        },
        yaxis: {
            title: 'Count of Isolates',
            automargin: true
        },
        height: 400,
        responsive: true
    };

    Plotly.newPlot('outcome-stacked-bar-chart', [traceResistant, traceSusceptible], layout);
}

function renderAgeBoxPlot() {
    const cleanData = filteredData.filter(d => d.Age !== null && d.Outcome !== 'Unknown' && d.Outcome);
    const outcomes = [...new Set(cleanData.map(d => d.Outcome))].filter(v => v).sort();
    const data = [];

    if (outcomes.length === 0) {
        return handleEmptyChart('age-box-plot', 'Patient Age Distribution by Outcome');
    }

    outcomes.forEach(outcome => {
        const ages = cleanData
            .filter(d => d.Outcome === outcome)
            .map(d => d.Age);

        if (ages.length > 0) {
            data.push({
                y: ages,
                name: outcome,
                type: 'box',
                boxpoints: 'outliers', 
                jitter: 0.3, 
                pointpos: -1.8,
                // FIX: Use global d3 object instead of Plotly.d3
                marker: {
                    color: d3.scaleOrdinal(d3.schemeCategory10).range()[outcomes.indexOf(outcome) % 10]
                }
            });
        }
    });

    if (data.length === 0) {
        return handleEmptyChart('age-box-plot', 'Patient Age Distribution by Outcome');
    }

    const layout = {
        title: 'Patient Age Distribution Across Outcomes',
        xaxis: {
            title: 'Patient Outcome',
            automargin: true
        },
        yaxis: {
            title: 'Age (Years)',
            automargin: true
        },
        height: 400,
        responsive: true
    };

    Plotly.newPlot('age-box-plot', data, layout);
}