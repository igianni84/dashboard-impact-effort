class ImpactEffortDashboard {
    constructor() {
        this.data = null;
        this.filteredData = null;
        this.chart = null;
        this.weights = {
            impact: 40,
            effort: 30,
            preference: 30
        };
        this.filters = {
            people: new Set(),
            macroAreas: new Set(),
            features: new Set()
        };
        this.currentView = 'matrix';
        this.impactScalingEnabled = false;
        this.effortScalingEnabled = false;
        this.selectedQuadrant = null;
        
        this.init();
    }

    async init() {
        try {
            await this.loadData();
            this.setupEventListeners();
            this.processData();
            this.renderFilters();
            this.renderMatrix();
            this.updateCounts();
        } catch (error) {
            console.error('Errore durante l\'inizializzazione:', error);
        }
    }

    async loadData() {
        try {
            const response = await fetch('./output.json');
            this.data = await response.json();
            this.filteredData = this.processFeatures();
        } catch (error) {
            console.error('Errore nel caricamento dei dati:', error);
            // Fallback ai dati dall'HTML se il fetch fallisce
            this.data = [];
            this.filteredData = [];
        }
    }

    processFeatures() {
        if (!this.data || !Array.isArray(this.data)) return [];
        
        const featuresMap = new Map();
        
        // Aggrega le features di tutte le persone
        this.data.forEach(person => {
            person.features.forEach(feature => {
                const key = feature.feature_name;
                
                if (!featuresMap.has(key)) {
                    featuresMap.set(key, {
                        name: feature.feature_name,
                        description: feature.description,
                        macro_area: feature.macro_area.replace(/"/g, ''),
                        evaluations: [],
                        avgImpact: 0,
                        avgEffort: 0,
                        selectionRate: 0,
                        people: []
                    });
                }
                
                const featureData = featuresMap.get(key);
                featureData.evaluations.push({
                    person: person.person_name,
                    impact: feature.impact,
                    effort: feature.effort,
                    selected: feature.selected
                });
                
                featureData.people.push({
                    name: person.person_name,
                    selected: feature.selected
                });
            });
        });

        // Calcola medie e tassi di selezione
        const features = Array.from(featuresMap.values()).map(feature => {
            const impacts = feature.evaluations.map(e => e.impact);
            const efforts = feature.evaluations.map(e => e.effort);
            const selections = feature.evaluations.filter(e => e.selected).length;
            
            feature.avgImpact = impacts.reduce((a, b) => a + b, 0) / impacts.length;
            feature.avgEffort = efforts.reduce((a, b) => a + b, 0) / efforts.length;
            feature.selectionRate = (selections / feature.evaluations.length) * 100;
            
            return feature;
        });

        return features;
    }

    getMacroAreaColors() {
        return {
            'Discovery & Education': '#e63946',                      // Rosso
            'Personalization & Advisory': '#f77f00',                // Arancione
            'Wine Investment & Financial Tools': '#fcbf49',         // Giallo
            'Provenance, Certification & Trust': '#2a9d8f',         // Verde
            'Gamification & Social Sharing': '#1d3557',            // Blu
            'Digital Cellar & Collection Management': '#6a4c93',    // Viola
            'Logistics, Delivery & Post-Purchase Care': '#8d6e63',  // Marrone
            'Consumption Support & Experience': '#00b4d8'           // Azzurro
        };
    }

    processData() {
        if (!this.filteredData) return;
        
        // Estrai persone e macro aree per i filtri
        const allPeople = new Set();
        const allMacroAreas = new Set();
        
        this.data.forEach(person => {
            allPeople.add(person.person_name);
            person.features.forEach(feature => {
                allMacroAreas.add(feature.macro_area.replace(/"/g, ''));
            });
        });
        
        // Inizializza i filtri con tutto selezionato
        this.filters.people = new Set(allPeople);
        this.filters.macroAreas = new Set(allMacroAreas);
        this.filters.features = new Set(this.filteredData.map(f => f.name));
    }

    calculateScore(feature) {
        const impactScore = (feature.avgImpact / 5) * (this.weights.impact / 100);
        const effortPenalty = (feature.avgEffort / 5) * (this.weights.effort / 100);
        const preferenceBonus = (feature.selectionRate / 100) * (this.weights.preference / 100);
        
        // Formula: (Impact * weight) + (Preferences * weight) - (Effort * weight)
        // Normalizzato su scala 0-100
        const score = (impactScore + preferenceBonus - effortPenalty + 1) * 50;
        return Math.max(0, Math.min(100, score));
    }

    getFeatureQuadrant(feature) {
        const highImpact = feature.avgImpact > 3;
        const lowEffort = feature.avgEffort < 3;
        
        if (highImpact && lowEffort) return 'quick-wins';
        if (highImpact && !lowEffort) return 'major-projects';
        if (!highImpact && lowEffort) return 'fill-ins';
        return 'thankless-tasks';
    }

    getFilteredFeatures() {
        if (!this.filteredData) return [];
        
        return this.filteredData.filter(feature => {
            // Filtra per macro area
            if (!this.filters.macroAreas.has(feature.macro_area)) return false;
            
            // Filtra per feature
            if (!this.filters.features.has(feature.name)) return false;
            
            // Verifica che almeno una delle persone selezionate abbia valutato questa feature
            const hasSelectedPersonEvaluation = feature.evaluations.some(evaluation => 
                this.filters.people.has(evaluation.person)
            );
            
            // Se nessuna persona selezionata ha valutato questa feature, escludila
            if (!hasSelectedPersonEvaluation) return false;
            
            return true;
        }).map(feature => {
            // Ricalcola le medie considerando solo le persone selezionate
            const selectedEvaluations = feature.evaluations.filter(evaluation => 
                this.filters.people.has(evaluation.person)
            );
            
            const selectedImpacts = selectedEvaluations.map(e => e.impact);
            const selectedEfforts = selectedEvaluations.map(e => e.effort);
            const selectedCount = selectedEvaluations.filter(e => e.selected).length;
            
            return {
                ...feature,
                avgImpact: selectedImpacts.reduce((a, b) => a + b, 0) / selectedImpacts.length,
                avgEffort: selectedEfforts.reduce((a, b) => a + b, 0) / selectedEfforts.length,
                selectionRate: (selectedCount / selectedEvaluations.length) * 100,
                evaluations: selectedEvaluations // Mantieni solo le valutazioni delle persone selezionate
            };
        });
    }

    scaleImpactValues(features) {
        if (!this.impactScalingEnabled || features.length === 0) {
            return features;
        }

        // Trova il valore minimo e massimo di impact
        const impactValues = features.map(f => f.avgImpact);
        const minImpact = Math.min(...impactValues);
        const maxImpact = Math.max(...impactValues);
        
        // Se tutti i valori sono uguali, non fare nulla
        if (minImpact === maxImpact) {
            return features;
        }

        // Scala i valori da 1 a 5
        return features.map(feature => ({
            ...feature,
            avgImpact: 1 + ((feature.avgImpact - minImpact) / (maxImpact - minImpact)) * 4,
            originalAvgImpact: feature.avgImpact // Mantieni il valore originale
        }));
    }

    scaleEffortValues(features) {
        if (!this.effortScalingEnabled || features.length === 0) {
            return features;
        }

        // Trova il valore minimo e massimo di effort
        const effortValues = features.map(f => f.avgEffort);
        const minEffort = Math.min(...effortValues);
        const maxEffort = Math.max(...effortValues);
        
        // Se tutti i valori sono uguali, non fare nulla
        if (minEffort === maxEffort) {
            return features;
        }

        // Scala i valori da 1 a 5
        return features.map(feature => ({
            ...feature,
            avgEffort: 1 + ((feature.avgEffort - minEffort) / (maxEffort - minEffort)) * 4,
            originalAvgEffort: feature.avgEffort // Mantieni il valore originale
        }));
    }

    toggleImpactScaling() {
        this.impactScalingEnabled = !this.impactScalingEnabled;
        
        // Aggiorna il testo del bottone
        const button = document.getElementById('scale-impact');
        if (button) {
            if (this.impactScalingEnabled) {
                button.textContent = '🔄 Reset Impact';
                button.title = 'Ripristina i valori originali di Impact';
                button.classList.add('active');
            } else {
                button.textContent = '📊 Scala Impact';
                button.title = 'Scala i valori di Impact per migliorare la distribuzione';
                button.classList.remove('active');
            }
        }
        
        // Rigenera la matrice
        this.renderMatrix();
    }

    toggleEffortScaling() {
        this.effortScalingEnabled = !this.effortScalingEnabled;
        
        // Aggiorna il testo del bottone
        const button = document.getElementById('scale-effort');
        if (button) {
            if (this.effortScalingEnabled) {
                button.textContent = '🔄 Reset Effort';
                button.title = 'Ripristina i valori originali di Effort';
                button.classList.add('active');
            } else {
                button.textContent = '📊 Scala Effort';
                button.title = 'Scala i valori di Effort per migliorare la distribuzione';
                button.classList.remove('active');
            }
        }
        
        // Rigenera la matrice
        this.renderMatrix();
    }

    renderFilters() {
        this.renderPersonFilters();
        this.renderMacroAreaFilters();
    }

    renderPersonFilters() {
        const container = document.getElementById('person-filters');
        if (!container) return;
        
        const allPeople = [...new Set(this.data.flatMap(p => [p.person_name]))].sort();
        
        container.innerHTML = allPeople.map(person => {
            const featureCount = this.data.find(p => p.person_name === person)?.features.length || 0;
            const isChecked = this.filters.people.has(person);
            
            return `
                <div class="filter-item">
                    <input type="checkbox" 
                           id="person-${person}" 
                           ${isChecked ? 'checked' : ''}
                           data-type="person" 
                           data-value="${person}">
                    <label for="person-${person}">${person}</label>
                    <span class="filter-count">${featureCount}</span>
                </div>
            `;
        }).join('');
    }

    renderMacroAreaFilters() {
        const container = document.getElementById('area-filters');
        if (!container) return;
        
        const areaCountMap = new Map();
        this.filteredData.forEach(feature => {
            const area = feature.macro_area;
            areaCountMap.set(area, (areaCountMap.get(area) || 0) + 1);
        });
        
        const sortedAreas = Array.from(areaCountMap.entries())
            .sort(([a], [b]) => a.localeCompare(b));
        
        const macroAreaColors = this.getMacroAreaColors();
        
        container.innerHTML = sortedAreas.map(([area, count]) => {
            const isChecked = this.filters.macroAreas.has(area);
            const areaId = area.replace(/[^a-zA-Z0-9]/g, '-');
            const color = macroAreaColors[area] || '#667eea';
            
            return `
                <div class="filter-item">
                    <div class="color-dot" style="background-color: ${color};"></div>
                    <input type="checkbox" 
                           id="area-${areaId}" 
                           ${isChecked ? 'checked' : ''}
                           data-type="area" 
                           data-value="${area}">
                    <label for="area-${areaId}" title="${area}">${area}</label>
                    <span class="filter-count">${count}</span>
                </div>
            `;
        }).join('');
    }

    renderMatrix() {
        const canvas = document.getElementById('impact-effort-matrix');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        
        // Distruggi il grafico esistente
        if (this.chart) {
            this.chart.destroy();
        }

        const filteredFeatures = this.getFilteredFeatures();
        let scaledFeatures = this.scaleImpactValues(filteredFeatures);
        scaledFeatures = this.scaleEffortValues(scaledFeatures);
        
        // Prepara dati per Chart.js
        const chartData = scaledFeatures.map(feature => {
            // Applica un piccolo offset casuale per evitare la sovrapposizione perfetta
            const jitterX = (Math.random() - 0.5) * 0.2; // Jitter between -0.1 and +0.1
            const jitterY = (Math.random() - 0.5) * 0.2; // Jitter between -0.1 and +0.1
            
            return {
                x: feature.avgEffort + jitterX,
                y: feature.avgImpact + jitterY,
                feature: feature,
                score: this.calculateScore(feature)
            };
        });

        this.chart = new Chart(ctx, {
            type: 'scatter',
            data: {
                datasets: [{
                    label: 'Features',
                    data: chartData,
                    backgroundColor: (context) => {
                        const dataIndex = context.dataIndex;
                        if (dataIndex === undefined || !context.dataset.data[dataIndex]) return '#667eea';
                        
                        const feature = context.dataset.data[dataIndex].feature;
                        if (!feature) return '#667eea';
                        
                        // Colora in base alla macro area
                        const macroAreaColors = this.getMacroAreaColors();
                        return macroAreaColors[feature.macro_area] || '#667eea';
                    },
                    borderColor: '#4a5568',
                    borderWidth: 2,
                    pointRadius: 8, // Radius fisso per tutti i punti
                    pointHoverRadius: 12
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        type: 'linear',
                        position: 'bottom',
                        min: 1,
                        max: 5,
                        title: {
                            display: true,
                            text: 'Effort (Sforzo) →',
                            font: { size: 14, weight: 'bold' }
                        },
                        grid: {
                            display: true,
                            color: '#e2e8f0'
                        },
                        ticks: {
                            stepSize: 1,
                            callback: (value) => {
                                return (value >= 1 && value <= 5 && value % 1 === 0) ? value : '';
                            }
                        }
                    },
                    y: {
                        min: 1,
                        max: 5,
                        title: {
                            display: true,
                            text: '↑ Impact (Impatto)',
                            font: { size: 14, weight: 'bold' }
                        },
                        grid: {
                            display: true,
                            color: '#e2e8f0'
                        },
                        ticks: {
                            stepSize: 1,
                            callback: (value) => {
                                return (value >= 1 && value <= 5 && value % 1 === 0) ? value : '';
                            }
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.9)',
                        titleColor: '#ffffff',
                        bodyColor: '#ffffff',
                        borderColor: '#667eea',
                        borderWidth: 1,
                        cornerRadius: 6,
                        displayColors: false,
                        callbacks: {
                            title: (context) => {
                                const feature = context[0].raw.feature;
                                return feature.name;
                            },
                            label: (context) => {
                                const feature = context.raw.feature;
                                const impactLabel = this.impactScalingEnabled && feature.originalAvgImpact !== undefined 
                                    ? `Impact: ${feature.avgImpact.toFixed(1)}/5 (orig: ${feature.originalAvgImpact.toFixed(1)})`
                                    : `Impact: ${feature.avgImpact.toFixed(1)}/5`;
                                
                                const effortLabel = this.effortScalingEnabled && feature.originalAvgEffort !== undefined 
                                    ? `Effort: ${feature.avgEffort.toFixed(1)}/5 (orig: ${feature.originalAvgEffort.toFixed(1)})`
                                    : `Effort: ${feature.avgEffort.toFixed(1)}/5`;
                                
                                return [
                                    impactLabel,
                                    effortLabel,
                                    `Area: ${feature.macro_area}`,
                                    '',
                                    `${feature.description.substring(0, 120)}...`
                                ];
                            }
                        }
                    }
                },
                onClick: (event, elements) => {
                    if (elements.length > 0) {
                        const feature = elements[0].element.raw.feature;
                        this.showFeatureDetails(feature);
                    }
                },
                onHover: (event, elements) => {
                    event.native.target.style.cursor = elements.length > 0 ? 'pointer' : 'default';
                }
            }
        });

        // Aggiungi linee di divisione quadranti
        this.addQuadrantLines();
    }

    addQuadrantLines() {
        if (!this.chart) return;
        
        // Plugin per disegnare le linee di divisione
        const quadrantPlugin = {
            id: 'quadrantLines',
            afterDraw: (chart) => {
                const ctx = chart.ctx;
                const xAxis = chart.scales.x;
                const yAxis = chart.scales.y;
                
                ctx.save();
                ctx.strokeStyle = '#a0aec0';
                ctx.lineWidth = 2;
                ctx.setLineDash([5, 5]);
                
                // Linea verticale a x=3
                const xPos = xAxis.getPixelForValue(3);
                ctx.beginPath();
                ctx.moveTo(xPos, yAxis.top);
                ctx.lineTo(xPos, yAxis.bottom);
                ctx.stroke();
                
                // Linea orizzontale a y=3
                const yPos = yAxis.getPixelForValue(3);
                ctx.beginPath();
                ctx.moveTo(xAxis.left, yPos);
                ctx.lineTo(xAxis.right, yPos);
                ctx.stroke();
                
                ctx.restore();
            }
        };
        
        Chart.register(quadrantPlugin);
    }

    renderTable() {
        const tbody = document.querySelector('#features-table tbody');
        if (!tbody) return;

        const filteredFeatures = this.getFilteredFeatures();
        const sortBy = document.getElementById('sort-by')?.value || 'score';
        const sortOrder = document.getElementById('sort-order')?.value || 'desc';
        
        // Calcola score e ordina
        const featuresWithScore = filteredFeatures.map(feature => ({
            ...feature,
            score: this.calculateScore(feature)
        }));

        featuresWithScore.sort((a, b) => {
            let valueA, valueB;
            
            switch (sortBy) {
                case 'score':
                    valueA = a.score;
                    valueB = b.score;
                    break;
                case 'impact':
                    valueA = a.avgImpact;
                    valueB = b.avgImpact;
                    break;
                case 'effort':
                    valueA = a.avgEffort;
                    valueB = b.avgEffort;
                    break;
                case 'name':
                    valueA = a.name.toLowerCase();
                    valueB = b.name.toLowerCase();
                    break;
                default:
                    valueA = a.score;
                    valueB = b.score;
            }
            
            if (sortOrder === 'asc') {
                return valueA > valueB ? 1 : -1;
            } else {
                return valueA < valueB ? 1 : -1;
            }
        });

        tbody.innerHTML = featuresWithScore.map((feature, index) => {
            const peopleHtml = feature.people
                .filter(person => person.selected) // Mostra solo le persone che hanno selezionato la feature
                .map(person => 
                    `<span class="person-tag selected">${person.name}</span>`
                ).join('');
            
            const maxScore = 100;
            const scorePercentage = (feature.score / maxScore) * 100;

            return `
                <tr>
                    <td class="position-cell">${index + 1}</td>
                    <td>
                        <div class="feature-name">${feature.name}</div>
                    </td>
                    <td><span class="macro-area">${feature.macro_area}</span></td>
                    <td class="metric-value impact-value">${feature.avgImpact.toFixed(1)}</td>
                    <td class="metric-value effort-value">${feature.avgEffort.toFixed(1)}</td>
                    <td class="metric-value preference-value">${feature.selectionRate.toFixed(0)}%</td>
                    <td class="metric-value score-value">
                        ${feature.score.toFixed(0)}
                        <div class="score-bar">
                            <div class="score-fill" style="width: ${scorePercentage}%"></div>
                        </div>
                    </td>
                    <td>
                        <div class="people-list">${peopleHtml}</div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    showFeatureDetails(feature) {
        // Implementazione per mostrare dettagli feature (modal o sidebar)
        console.log('Feature details:', feature);
    }

    showQuadrantFeatures(quadrant) {
        this.selectedQuadrant = quadrant;
        
        // Rimuovi active da tutti i quadranti
        document.querySelectorAll('.quadrant.clickable').forEach(q => q.classList.remove('active'));
        
        // Aggiungi active al quadrante selezionato
        const selectedQuadrantElement = document.querySelector(`[data-quadrant="${quadrant}"]`);
        if (selectedQuadrantElement) {
            selectedQuadrantElement.classList.add('active');
        }
        
        // Ottieni le features del quadrante
        const filteredFeatures = this.getFilteredFeatures();
        let scaledFeatures = this.scaleImpactValues(filteredFeatures);
        scaledFeatures = this.scaleEffortValues(scaledFeatures);
        
        const quadrantFeatures = scaledFeatures.filter(feature => {
            return this.getFeatureQuadrant(feature) === quadrant;
        });
        
        // Ordina per score decrescente
        const featuresWithScore = quadrantFeatures.map(feature => ({
            ...feature,
            score: this.calculateScore(feature)
        })).sort((a, b) => b.score - a.score);
        
        // Aggiorna il titolo
        const titles = {
            'quick-wins': 'Quick Wins - Alto Impact, Basso Effort',
            'major-projects': 'Major Projects - Alto Impact, Alto Effort',
            'fill-ins': 'Fill-ins - Basso Impact, Basso Effort',
            'thankless-tasks': 'Thankless Tasks - Basso Impact, Alto Effort'
        };
        
        document.getElementById('quadrant-title').textContent = titles[quadrant] || 'Features del Quadrante';
        
        // Popola la tabella
        const tbody = document.querySelector('#quadrant-features-table tbody');
        if (tbody) {
            tbody.innerHTML = featuresWithScore.map(feature => {
                const maxScore = 100;
                const scorePercentage = (feature.score / maxScore) * 100;
                
                return `
                    <tr>
                        <td><div class="quadrant-feature-name">${feature.name}</div></td>
                        <td><span class="macro-area">${feature.macro_area}</span></td>
                        <td class="quadrant-impact-value">${feature.avgImpact.toFixed(1)}</td>
                        <td class="quadrant-effort-value">${feature.avgEffort.toFixed(1)}</td>
                        <td class="quadrant-score-cell">
                            <span class="quadrant-score-value">${feature.score.toFixed(0)}</span>
                            <div class="quadrant-score-bar">
                                <div class="quadrant-score-fill" style="width: ${scorePercentage}%"></div>
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');
        }
        
        // Mostra la sezione
        const quadrantFeaturesSection = document.getElementById('quadrant-features');
        if (quadrantFeaturesSection) {
            quadrantFeaturesSection.style.display = 'block';
            quadrantFeaturesSection.scrollIntoView({ behavior: 'smooth' });
        }
    }

    hideQuadrantFeatures() {
        this.selectedQuadrant = null;
        
        // Rimuovi active da tutti i quadranti
        document.querySelectorAll('.quadrant.clickable').forEach(q => q.classList.remove('active'));
        
        // Nascondi la sezione
        const quadrantFeaturesSection = document.getElementById('quadrant-features');
        if (quadrantFeaturesSection) {
            quadrantFeaturesSection.style.display = 'none';
        }
    }

    updateWeights() {
        const impactWeight = parseInt(document.getElementById('impact-weight')?.value || 40);
        const effortWeight = parseInt(document.getElementById('effort-weight')?.value || 30);
        const preferenceWeight = parseInt(document.getElementById('preference-weight')?.value || 30);
        
        this.weights.impact = impactWeight;
        this.weights.effort = effortWeight;
        this.weights.preference = preferenceWeight;
        
        // Aggiorna visualizzazioni pesi
        document.getElementById('impact-weight-value').textContent = `${impactWeight}%`;
        document.getElementById('effort-weight-value').textContent = `${effortWeight}%`;
        document.getElementById('preference-weight-value').textContent = `${preferenceWeight}%`;
        
        const total = impactWeight + effortWeight + preferenceWeight;
        const totalElement = document.getElementById('weight-total');
        totalElement.textContent = `${total}%`;
        totalElement.classList.toggle('invalid', total !== 100);
        
        // Ricalcola e aggiorna visualizzazioni
        if (this.currentView === 'matrix') {
            this.renderMatrix();
        } else {
            this.renderTable();
        }
        
        // Se c'è un quadrante selezionato, aggiorna anche quello
        if (this.selectedQuadrant) {
            this.showQuadrantFeatures(this.selectedQuadrant);
        }
    }

    updateFilters(type, value, checked) {
        const filterSet = this.filters[type === 'person' ? 'people' : 'macroAreas'];
        
        if (checked) {
            filterSet.add(value);
        } else {
            filterSet.delete(value);
        }
        
        // Aggiorna visualizzazioni
        if (this.currentView === 'matrix') {
            this.renderMatrix();
        } else {
            this.renderTable();
        }
        
        // Se c'è un quadrante selezionato, aggiorna anche quello
        if (this.selectedQuadrant) {
            this.showQuadrantFeatures(this.selectedQuadrant);
        }
        
        this.updateCounts();
    }

    updateCounts() {
        const filteredFeatures = this.getFilteredFeatures();
        // Conta solo le feature selezionate da almeno una persona tra quelle filtrate
        const selectedFeatures = filteredFeatures.filter(feature => {
            // Verifica se almeno una persona filtrata ha selezionato questa feature
            return feature.people.some(person => 
                this.filters.people.has(person.name) && person.selected
            );
        });
        
        document.getElementById('selected-count').textContent = selectedFeatures.length;
        document.getElementById('total-count').textContent = filteredFeatures.length;
    }

    switchView(view) {
        this.currentView = view;
        
        // Aggiorna bottoni
        document.querySelectorAll('.view-controls button').forEach(btn => {
            btn.classList.remove('active');
        });
        document.getElementById(`show-${view}`).classList.add('active');
        
        // Mostra/nascondi viste
        document.getElementById('matrix-view').style.display = view === 'matrix' ? 'block' : 'none';
        document.getElementById('table-view').style.display = view === 'table' ? 'block' : 'none';
        
        // Se non siamo nella vista matrix, nascondi la tabella dei quadranti
        if (view !== 'matrix') {
            this.hideQuadrantFeatures();
        }
        
        // Renderizza vista appropriata
        if (view === 'matrix') {
            this.renderMatrix();
        } else {
            this.renderTable();
        }
    }

    setupEventListeners() {
        // Event listeners per i pesi
        ['impact-weight', 'effort-weight', 'preference-weight'].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('input', () => this.updateWeights());
            }
        });

        // Event listeners per i filtri (usando delegazione degli eventi)
        document.addEventListener('change', (e) => {
            if (e.target.matches('[data-type="person"]')) {
                this.updateFilters('person', e.target.dataset.value, e.target.checked);
            } else if (e.target.matches('[data-type="area"]')) {
                this.updateFilters('area', e.target.dataset.value, e.target.checked);
            }
        });

        // Event listeners per la vista
        const showMatrix = document.getElementById('show-matrix');
        const showTable = document.getElementById('show-table');
        
        if (showMatrix) showMatrix.addEventListener('click', () => this.switchView('matrix'));
        if (showTable) showTable.addEventListener('click', () => this.switchView('table'));

        // Event listeners per l'ordinamento della tabella
        const sortBy = document.getElementById('sort-by');
        const sortOrder = document.getElementById('sort-order');
        
        if (sortBy) sortBy.addEventListener('change', () => this.renderTable());
        if (sortOrder) sortOrder.addEventListener('change', () => this.renderTable());

        // Event listener per il bottone scala impact
        const scaleButton = document.getElementById('scale-impact');
        if (scaleButton) scaleButton.addEventListener('click', () => this.toggleImpactScaling());

        // Event listener per il bottone scala effort
        const scaleEffortButton = document.getElementById('scale-effort');
        if (scaleEffortButton) scaleEffortButton.addEventListener('click', () => this.toggleEffortScaling());

        // Event listeners per i quadranti cliccabili
        document.addEventListener('click', (e) => {
            if (e.target.closest('.quadrant.clickable')) {
                const quadrant = e.target.closest('.quadrant.clickable').dataset.quadrant;
                if (quadrant) {
                    if (this.selectedQuadrant === quadrant) {
                        this.hideQuadrantFeatures();
                    } else {
                        this.showQuadrantFeatures(quadrant);
                    }
                }
            }
        });

        // Event listener per il bottone di chiusura
        document.addEventListener('click', (e) => {
            if (e.target.id === 'close-quadrant-table') {
                this.hideQuadrantFeatures();
            }
        });
    }
}

// Inizializzazione quando il DOM è pronto
document.addEventListener('DOMContentLoaded', () => {
    window.dashboard = new ImpactEffortDashboard();
});
