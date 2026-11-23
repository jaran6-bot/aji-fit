// Weight Loss Tracker & Interactive Chart Module (Courbe Perte de Poids)
class WeightTracker {
    constructor() {
        this.chart = null;
        this.canvasId = 'weight-chart-canvas';
        this.data = {
            goal: 75.0,
            userHeight: 178, // cm for BMI
            entries: [
                { date: '20 Oct', weight: 83.8 },
                { date: '27 Oct', weight: 83.0 },
                { date: '03 Nov', weight: 82.2 },
                { date: '10 Nov', weight: 81.4 },
                { date: '15 Nov', weight: 80.7 },
                { date: '19 Nov', weight: 79.9 }
            ]
        };
    }

    init() {
        this.loadStorage();
        this.bindEvents();
        this.renderChart();
        this.updateMetrics();
    }

    loadStorage() {
        try {
            const saved = localStorage.getItem('apexfit_weight_data');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed.entries && parsed.entries.length > 0) {
                    this.data = parsed;
                }
            }
        } catch (e) {
            console.warn("Erreur chargement données de poids:", e);
        }
    }

    saveStorage() {
        try {
            localStorage.setItem('apexfit_weight_data', JSON.stringify(this.data));
        } catch (e) {
            console.warn("Erreur sauvegarde poids:", e);
        }
    }

    bindEvents() {
        // Button open modal to add weight
        const openModalBtn = document.getElementById('open-weight-modal-btn');
        if (openModalBtn) {
            openModalBtn.addEventListener('click', () => {
                const modal = document.getElementById('weight-entry-modal');
                if (modal) {
                    const dateInput = document.getElementById('weight-input-date');
                    if (dateInput) {
                        const today = new Date().toISOString().split('T')[0];
                        dateInput.value = today;
                    }
                    const valInput = document.getElementById('weight-input-val');
                    if (valInput && this.data.entries.length > 0) {
                        valInput.value = this.data.entries[this.data.entries.length - 1].weight;
                    }
                    const goalInput = document.getElementById('weight-input-goal');
                    if (goalInput) {
                        goalInput.value = this.data.goal;
                    }
                    modal.classList.remove('hidden');
                }
            });
        }

        // Close modal
        const closeModalBtn = document.getElementById('close-weight-modal-btn');
        if (closeModalBtn) {
            closeModalBtn.addEventListener('click', () => {
                document.getElementById('weight-entry-modal')?.classList.add('hidden');
            });
        }

        // Form submit
        const form = document.getElementById('weight-entry-form');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                const weight = parseFloat(document.getElementById('weight-input-val')?.value);
                const dateStr = document.getElementById('weight-input-date')?.value;
                const newGoal = parseFloat(document.getElementById('weight-input-goal')?.value);

                if (!isNaN(weight) && weight > 20 && weight < 300) {
                    let formattedDate = 'Auj.';
                    if (dateStr) {
                        const d = new Date(dateStr);
                        formattedDate = d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
                    }
                    this.addEntry(weight, formattedDate);
                }

                if (!isNaN(newGoal) && newGoal > 20) {
                    this.data.goal = newGoal;
                }

                this.saveStorage();
                this.updateMetrics();
                this.renderChart();

                document.getElementById('weight-entry-modal')?.classList.add('hidden');
                window.soundEngine.playSuccess ? window.soundEngine.playSuccess() : window.soundEngine.playBell();
                window.coachVoice.speak("Pesée enregistrée avec succès !", false);
            });
        }

        // Reset weight history
        const resetWeightBtn = document.getElementById('reset-weight-data-btn');
        if (resetWeightBtn) {
            resetWeightBtn.addEventListener('click', () => {
                if (confirm("Réinitialiser le suivi de poids aux valeurs d'exemple ?")) {
                    this.data = {
                        goal: 75.0,
                        userHeight: 178,
                        entries: [
                            { date: '20 Oct', weight: 83.8 },
                            { date: '27 Oct', weight: 83.0 },
                            { date: '03 Nov', weight: 82.2 },
                            { date: '10 Nov', weight: 81.4 },
                            { date: '15 Nov', weight: 80.7 },
                            { date: '19 Nov', weight: 79.9 }
                        ]
                    };
                    this.saveStorage();
                    this.updateMetrics();
                    this.renderChart();
                }
            });
        }
    }

    addEntry(weight, dateLabel) {
        this.data.entries.push({
            date: dateLabel,
            weight: Math.round(weight * 10) / 10
        });
        this.saveStorage();
    }

    updateMetrics() {
        if (!this.data.entries || this.data.entries.length === 0) return;

        const initial = this.data.entries[0].weight;
        const current = this.data.entries[this.data.entries.length - 1].weight;
        const goal = this.data.goal;
        const diff = Math.round((current - initial) * 10) / 10;
        const toGoal = Math.round((current - goal) * 10) / 10;

        // Progress percentage toward goal
        const totalNeeded = initial - goal;
        const progressPct = totalNeeded > 0 ? Math.min(100, Math.max(0, Math.round(((initial - current) / totalNeeded) * 100))) : 100;

        // BMI Calculation: weight / (height/100)^2
        const hMeter = (this.data.userHeight || 178) / 100;
        const bmi = (current / (hMeter * hMeter)).toFixed(1);

        // Update DOM elements
        const currentEl = document.getElementById('weight-metric-current');
        if (currentEl) currentEl.textContent = `${current} kg`;

        const initialEl = document.getElementById('weight-metric-initial');
        if (initialEl) initialEl.textContent = `${initial} kg`;

        const goalEl = document.getElementById('weight-metric-goal');
        if (goalEl) goalEl.textContent = `${goal} kg`;

        const diffEl = document.getElementById('weight-metric-diff');
        if (diffEl) {
            const isLoss = diff < 0;
            diffEl.textContent = `${isLoss ? '' : '+'}${diff} kg`;
            diffEl.className = isLoss ? 'text-2xl font-black text-emerald-400 font-teko' : 'text-2xl font-black text-amber-400 font-teko';
        }

        const toGoalEl = document.getElementById('weight-metric-togoal');
        if (toGoalEl) {
            toGoalEl.textContent = toGoal > 0 ? `${toGoal} kg restant` : 'Objectif atteint ! 🎉';
        }

        const progressEl = document.getElementById('weight-progress-bar');
        if (progressEl) progressEl.style.width = `${progressPct}%`;

        const progressTxt = document.getElementById('weight-progress-text');
        if (progressTxt) progressTxt.textContent = `${progressPct}% de l'objectif accompli`;

        const bmiEl = document.getElementById('weight-metric-bmi');
        if (bmiEl) bmiEl.textContent = `IMC : ${bmi}`;
    }

    renderChart() {
        const canvas = document.getElementById(this.canvasId);
        if (!canvas) return;

        if (typeof window.Chart === 'undefined') {
            console.warn("Chart.js non encore chargé.");
            return;
        }

        const ctx = canvas.getContext('2d');
        if (this.chart) {
            this.chart.destroy();
        }

        const labels = this.data.entries.map(e => e.date);
        const weights = this.data.entries.map(e => e.weight);
        const goalData = labels.map(() => this.data.goal);

        // Gradient for chart area
        const gradient = ctx.createLinearGradient(0, 0, 0, 260);
        gradient.addColorStop(0, 'rgba(0, 242, 254, 0.45)');
        gradient.addColorStop(0.6, 'rgba(0, 242, 254, 0.12)');
        gradient.addColorStop(1, 'rgba(0, 242, 254, 0.0)');

        this.chart = new window.Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Votre Poids (kg)',
                        data: weights,
                        borderColor: '#00f2fe',
                        backgroundColor: gradient,
                        borderWidth: 3.5,
                        pointBackgroundColor: '#00f2fe',
                        pointBorderColor: '#ffffff',
                        pointBorderWidth: 2,
                        pointRadius: 5,
                        pointHoverRadius: 8,
                        tension: 0.35,
                        fill: true
                    },
                    {
                        label: `Objectif (${this.data.goal} kg)`,
                        data: goalData,
                        borderColor: '#10b981',
                        borderWidth: 2,
                        borderDash: [6, 6],
                        pointRadius: 0,
                        fill: false
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            color: '#94a3b8',
                            font: { family: 'Inter', size: 12, weight: 'bold' },
                            usePointStyle: true,
                            boxWidth: 8
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(15, 23, 42, 0.95)',
                        titleColor: '#00f2fe',
                        bodyColor: '#f1f5f9',
                        borderColor: 'rgba(255, 255, 255, 0.1)',
                        borderWidth: 1,
                        padding: 12,
                        boxPadding: 6,
                        usePointStyle: true,
                        callbacks: {
                            label: function(context) {
                                return ` ${context.dataset.label} : ${context.parsed.y} kg`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            color: 'rgba(255, 255, 255, 0.05)',
                            drawBorder: false
                        },
                        ticks: {
                            color: '#94a3b8',
                            font: { family: 'Inter', size: 11 }
                        }
                    },
                    y: {
                        grid: {
                            color: 'rgba(255, 255, 255, 0.06)',
                            drawBorder: false
                        },
                        ticks: {
                            color: '#94a3b8',
                            font: { family: 'Inter', size: 11 },
                            callback: function(val) {
                                return val + ' kg';
                            }
                        },
                        suggestedMin: Math.min(...weights, this.data.goal) - 2,
                        suggestedMax: Math.max(...weights) + 1.5
                    }
                }
            }
        });
    }
}

window.weightTracker = new WeightTracker();
