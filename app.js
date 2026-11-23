// Main Application Controller & State Management (Multi-Sport & Fitness Ludique)
class App {
    constructor() {
        this.currentView = 'dashboard';
        this.records = {
            boxingPunches: 0,
            boxingCombo: 0,
            pushupReps: 0,
            squatReps: 0,
            flappyScore: 0,
            ninjaScore: 0,
            totalWorkouts: 0,
            totalCalories: 0
        };
        this.history = [];
        this.poseEngine = new PoseEngine();
        this.activeSport = null; // 'boxing', 'boxing-vr', 'pushups', 'squats', 'flappy', 'ninja'
    }

    init() {
        this.loadStorage();
        this.bindEvents();
        this.updateDashboardUI();
        this.setupCanvases();
        if (window.weightTracker) window.weightTracker.init();
        if (window.sportShop) window.sportShop.init();
    }

    loadStorage() {
        try {
            const savedRecords = localStorage.getItem('apexfit_records');
            if (savedRecords) {
                this.records = { ...this.records, ...JSON.parse(savedRecords) };
            }

            const savedHistory = localStorage.getItem('apexfit_history');
            if (savedHistory) {
                this.history = JSON.parse(savedHistory);
            }
        } catch (e) {
            console.warn("Storage loading failed:", e);
        }
    }

    saveStorage() {
        try {
            localStorage.setItem('apexfit_records', JSON.stringify(this.records));
            localStorage.setItem('apexfit_history', JSON.stringify(this.history));
        } catch (e) {
            console.warn("Storage save failed:", e);
        }
    }

    setupCanvases() {
        const boxingCanvas = document.getElementById('boxing-canvas');
        if (boxingCanvas) window.boxingGame.init(boxingCanvas);

        const vrContainer = document.getElementById('boxing-vr-container');
        if (vrContainer) window.boxingVRGame.init(vrContainer);

        const pushupsCanvas = document.getElementById('pushups-canvas');
        if (pushupsCanvas) window.pushupTracker.init(pushupsCanvas);

        const squatsCanvas = document.getElementById('squats-canvas');
        if (squatsCanvas) window.squatTracker.init(squatsCanvas);

        const flappyCanvas = document.getElementById('flappy-canvas');
        if (flappyCanvas) window.flappyPushupsGame.init(flappyCanvas);

        const ninjaCanvas = document.getElementById('ninja-canvas');
        if (ninjaCanvas) window.ninjaStrikeGame.init(ninjaCanvas);
    }

    bindEvents() {
        // Navigation Buttons
        document.querySelectorAll('[data-nav]').forEach(btn => {
            btn.addEventListener('click', () => {
                const target = btn.getAttribute('data-nav');
                if (target === 'boxing-coach') {
                    this.startBoxingCoachSession();
                } else if (target === 'boxing-duel') {
                    this.startBoxingVRDuelSession();
                } else if (target === 'pushups') {
                    this.startPushupSession();
                } else if (target === 'squats') {
                    this.startSquatSession();
                } else if (target === 'flappy') {
                    this.startFlappySession();
                } else if (target === 'ninja') {
                    this.startNinjaSession();
                } else {
                    this.navigate(target);
                }
            });
        });

        // Dashboard Launch Buttons
        const startCoachBtn = document.getElementById('start-boxing-coach-btn');
        if (startCoachBtn) startCoachBtn.addEventListener('click', () => this.startBoxingCoachSession());

        const startDuelBtn = document.getElementById('start-boxing-duel-btn');
        if (startDuelBtn) {
            startDuelBtn.addEventListener('click', () => {
                const diff = document.getElementById('boxing-difficulty')?.value || 'normal';
                this.startBoxingVRDuelSession(diff);
            });
        }

        const startPushupsBtn = document.getElementById('start-pushups-btn');
        if (startPushupsBtn) startPushupsBtn.addEventListener('click', () => this.startPushupSession());

        const startSquatsBtn = document.getElementById('start-squats-btn');
        if (startSquatsBtn) startSquatsBtn.addEventListener('click', () => this.startSquatSession());

        const startFlappyBtn = document.getElementById('start-flappy-btn');
        if (startFlappyBtn) startFlappyBtn.addEventListener('click', () => this.startFlappySession());

        const startNinjaBtn = document.getElementById('start-ninja-btn');
        if (startNinjaBtn) startNinjaBtn.addEventListener('click', () => this.startNinjaSession());

        // In-Session Action buttons
        const stopBoxingBtn = document.getElementById('stop-boxing-btn');
        if (stopBoxingBtn) stopBoxingBtn.addEventListener('click', () => window.boxingGame.endGame('manual'));

        const stopVRBtn = document.getElementById('stop-vr-btn');
        if (stopVRBtn) stopVRBtn.addEventListener('click', () => window.boxingVRGame.endGame('manual'));

        const finishPushupsBtn = document.getElementById('finish-pushups-btn');
        if (finishPushupsBtn) finishPushupsBtn.addEventListener('click', () => window.pushupTracker.finishSession());

        const finishSquatsBtn = document.getElementById('finish-squats-btn');
        if (finishSquatsBtn) finishSquatsBtn.addEventListener('click', () => window.squatTracker.finishSession());

        const stopFlappyBtn = document.getElementById('stop-flappy-btn');
        if (stopFlappyBtn) stopFlappyBtn.addEventListener('click', () => window.flappyPushupsGame.gameOver());

        const stopNinjaBtn = document.getElementById('stop-ninja-btn');
        if (stopNinjaBtn) stopNinjaBtn.addEventListener('click', () => window.ninjaStrikeGame.endGame());

        // Sound & Voice toggles
        const soundToggle = document.getElementById('sound-toggle');
        if (soundToggle) {
            soundToggle.addEventListener('change', (e) => {
                window.soundEngine.setMuted(!e.target.checked);
            });
        }

        const voiceToggle = document.getElementById('voice-toggle');
        if (voiceToggle) {
            voiceToggle.addEventListener('change', (e) => {
                window.coachVoice.setEnabled(e.target.checked);
            });
        }

        // Close Summary Modal
        const closeModalBtn = document.getElementById('modal-close-btn');
        if (closeModalBtn) {
            closeModalBtn.addEventListener('click', () => {
                document.getElementById('summary-modal').classList.add('hidden');
                this.navigate('dashboard');
            });
        }

        // Reset Records
        const resetBtn = document.getElementById('reset-records-btn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                if (confirm("Voulez-vous réinitialiser vos statistiques et records ?")) {
                    this.records = {
                        boxingPunches: 0,
                        boxingCombo: 0,
                        pushupReps: 0,
                        squatReps: 0,
                        flappyScore: 0,
                        ninjaScore: 0,
                        totalWorkouts: 0,
                        totalCalories: 0
                    };
                    this.history = [];
                    this.saveStorage();
                    this.updateDashboardUI();
                }
            });
        }
    }

    navigate(view) {
        if (this.currentView !== view) {
            this.stopActiveSport();
        }

        this.currentView = view;

        document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));

        const targetView = document.getElementById(`${view}-view`);
        if (targetView) targetView.classList.remove('hidden');

        if (view === 'dashboard') {
            this.updateDashboardUI();
            if (window.weightTracker) {
                window.weightTracker.renderChart();
                window.weightTracker.updateMetrics();
            }
        } else if (view === 'shop') {
            if (window.sportShop) {
                window.sportShop.renderProducts();
                window.sportShop.updateCartBadge();
            }
        }
    }

    // 1. COACH BOXE
    startBoxingCoachSession() {
        this.navigate('boxing');
        this.activeSport = 'boxing';

        const titleEl = document.getElementById('boxing-mode-title');
        if (titleEl) titleEl.textContent = "🥊 Leçon Coach Pattes d'Ours";

        window.boxingGame.start('coach');
        this.bindPoseToVideo('boxing-video', 'boxing-camera-badge', (res) => {
            window.boxingGame.processPose(res.poseLandmarks);
        });
    }

    // 2. 3D VR BOXING DUEL
    async startBoxingVRDuelSession(difficulty = 'normal') {
        this.navigate('boxing-vr');
        this.activeSport = 'boxing-vr';

        const container = document.getElementById('boxing-vr-container');
        if (container) {
            await window.boxingVRGame.init(container);
            window.boxingVRGame.start(difficulty);
        }

        this.bindPoseToVideo('vr-video', 'vr-camera-badge', (res) => {
            window.boxingVRGame.processPose(res.poseLandmarks);
        });
    }

    // 3. PUSHUPS CLASSIC TRACKER
    startPushupSession() {
        this.navigate('pushups');
        this.activeSport = 'pushups';

        window.pushupTracker.start();
        this.bindPoseToVideo('pushups-video', 'pushups-camera-badge', (res) => {
            window.pushupTracker.processPose(res.poseLandmarks);
        });
    }

    // 4. SQUATS TRACKER (SPORT GÉNÉRAL)
    startSquatSession() {
        this.navigate('squats');
        this.activeSport = 'squats';

        window.squatTracker.start();
        this.bindPoseToVideo('squats-video', 'squats-camera-badge', (res) => {
            window.squatTracker.processPose(res.poseLandmarks);
        });
    }

    // 5. FLAPPY PUSHUP (SPORT LUDIQUE)
    startFlappySession() {
        this.navigate('flappy');
        this.activeSport = 'flappy';

        window.flappyPushupsGame.start();
        this.bindPoseToVideo('flappy-video', 'flappy-camera-badge', (res) => {
            window.flappyPushupsGame.processPose(res.poseLandmarks);
        });
    }

    // 6. NINJA STRIKE (SPORT LUDIQUE)
    startNinjaSession() {
        this.navigate('ninja');
        this.activeSport = 'ninja';

        window.ninjaStrikeGame.start();
        this.bindPoseToVideo('ninja-video', 'ninja-camera-badge', (res) => {
            window.ninjaStrikeGame.processPose(res.poseLandmarks);
        });
    }

    bindPoseToVideo(videoId, badgeId, onResults) {
        const video = document.getElementById(videoId);
        const badge = document.getElementById(badgeId);

        if (badge) {
            badge.className = "text-xs font-semibold px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse";
            badge.textContent = "🟡 Connexion caméra...";
        }

        this.poseEngine.start(
            video,
            (res) => {
                if (res.poseLandmarks) onResults(res);
            },
            (status) => {
                if (!badge) return;
                if (status === 'ready' || status === 'active') {
                    badge.className = "text-xs font-semibold px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30";
                    badge.textContent = "🟢 Caméra & IA Actives";
                }
            }
        ).catch(() => {
            if (badge) {
                badge.className = "text-xs font-semibold px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30";
                badge.textContent = "🖱️ Clic / Tactile actif";
            }
        });
    }

    stopActiveSport() {
        if (this.activeSport === 'boxing') window.boxingGame.stop();
        else if (this.activeSport === 'boxing-vr') window.boxingVRGame.stop();
        else if (this.activeSport === 'pushups') window.pushupTracker.stop();
        else if (this.activeSport === 'squats') window.squatTracker.stop();
        else if (this.activeSport === 'flappy') window.flappyPushupsGame.stop();
        else if (this.activeSport === 'ninja') window.ninjaStrikeGame.stop();

        this.poseEngine.stop();
        this.activeSport = null;
    }

    onBoxingSessionComplete(data) {
        this.stopActiveSport();

        let isNewPunchesRecord = false;
        let isNewComboRecord = false;

        if (data.punches > this.records.boxingPunches) {
            this.records.boxingPunches = data.punches;
            isNewPunchesRecord = true;
        }

        if (data.maxCombo > this.records.boxingCombo) {
            this.records.boxingCombo = data.maxCombo;
            isNewComboRecord = true;
        }

        const calories = Math.round(data.punches * 0.45 + (data.duration * 0.12));
        this.records.totalWorkouts++;
        this.records.totalCalories += calories;

        const isDuel = data.mode === 'duel';
        this.history.unshift({
            id: Date.now(),
            date: new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }),
            sport: 'boxe',
            title: isDuel ? 'Combat 3D Ring : Boss Adversaire' : 'Leçon Boxe : Coach Pattes d\'Ours',
            mainMetric: `${data.punches} coups`,
            secondaryMetric: `Combo: x${data.maxCombo}`,
            duration: `${Math.floor(data.duration / 60)}m ${data.duration % 60}s`,
            calories: `${calories} kcal`,
            isRecord: isNewPunchesRecord || isNewComboRecord
        });

        this.saveStorage();

        this.showSummaryModal({
            title: data.title,
            sport: "Boxe",
            isRecord: isNewPunchesRecord,
            recordText: isNewPunchesRecord ? `🔥 NOUVEAU RECORD DE COUPS : ${data.punches} !` : null,
            stats: [
                { label: "Coups portés", value: data.punches },
                { label: "Combo max", value: `x${data.maxCombo}` },
                { label: "Esquives", value: data.dodges },
                { label: "Score", value: data.score },
                { label: "Calories", value: `${calories} kcal` }
            ],
            message: data.message
        });
    }

    onPushupSessionComplete(data) {
        this.stopActiveSport();

        let isNewPushupRecord = false;
        if (data.reps > this.records.pushupReps) {
            this.records.pushupReps = data.reps;
            isNewPushupRecord = true;
        }

        this.records.totalWorkouts++;
        this.records.totalCalories += data.calories;

        this.history.unshift({
            id: Date.now(),
            date: new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }),
            sport: 'musculation',
            title: 'Série de Pompes Classique IA',
            mainMetric: `${data.reps} pompes`,
            secondaryMetric: `Cadence: ${data.cadence}/min`,
            duration: `${Math.floor(data.duration / 60)}m ${data.duration % 60}s`,
            calories: `${data.calories} kcal`,
            isRecord: isNewPushupRecord
        });

        this.saveStorage();

        this.showSummaryModal({
            title: data.title,
            sport: "Musculation",
            isRecord: isNewPushupRecord,
            recordText: isNewPushupRecord ? `🔥 NOUVEAU RECORD DE POMPES : ${data.reps} !` : null,
            stats: [
                { label: "Pompes validées", value: data.reps },
                { label: "Cadence", value: `${data.cadence} /min` },
                { label: "Durée", value: `${Math.floor(data.duration / 60)}m ${data.duration % 60}s` },
                { label: "Calories", value: `${data.calories} kcal` }
            ],
            message: data.message
        });
    }

    onSquatSessionComplete(data) {
        this.stopActiveSport();

        let isNewSquatRecord = false;
        if (data.reps > this.records.squatReps) {
            this.records.squatReps = data.reps;
            isNewSquatRecord = true;
        }

        this.records.totalWorkouts++;
        this.records.totalCalories += data.calories;

        this.history.unshift({
            id: Date.now(),
            date: new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }),
            sport: 'musculation',
            title: 'Session Squats IA (Sport Général)',
            mainMetric: `${data.reps} squats`,
            secondaryMetric: `Angle: 90°`,
            duration: `${Math.floor(data.duration / 60)}m ${data.duration % 60}s`,
            calories: `${data.calories} kcal`,
            isRecord: isNewSquatRecord
        });

        this.saveStorage();

        this.showSummaryModal({
            title: data.title,
            sport: "Squats",
            isRecord: isNewSquatRecord,
            recordText: isNewSquatRecord ? `🔥 NOUVEAU RECORD DE SQUATS : ${data.reps} !` : null,
            stats: [
                { label: "Squats validés", value: data.reps },
                { label: "Angle de flexion", value: "90° Parfait" },
                { label: "Durée", value: `${Math.floor(data.duration / 60)}m ${data.duration % 60}s` },
                { label: "Calories", value: `${data.calories} kcal` }
            ],
            message: data.message
        });
    }

    onFlappySessionComplete(data) {
        this.stopActiveSport();

        let isNewFlappyRecord = false;
        if (data.score > this.records.flappyScore) {
            this.records.flappyScore = data.score;
            isNewFlappyRecord = true;
        }

        let isNewPushupRecord = false;
        if (data.pushups > this.records.pushupReps) {
            this.records.pushupReps = data.pushups;
            isNewPushupRecord = true;
        }

        const calories = Math.round(data.pushups * 0.4);
        this.records.totalWorkouts++;
        this.records.totalCalories += calories;

        this.history.unshift({
            id: Date.now(),
            date: new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }),
            sport: 'ludique',
            title: 'Mini-Jeu Flappy Pompes 🐥',
            mainMetric: `${data.score} pts`,
            secondaryMetric: `${data.pushups} pompes`,
            duration: `Arcade`,
            calories: `${calories} kcal`,
            isRecord: isNewFlappyRecord
        });

        this.saveStorage();

        this.showSummaryModal({
            title: "PARTIE FLAPPY POMPES TERMINÉE 🐥",
            sport: "Flappy Pompes",
            isRecord: isNewFlappyRecord,
            recordText: isNewFlappyRecord ? `🔥 NOUVEAU MEILLEUR SCORE : ${data.score} PTS !` : null,
            stats: [
                { label: "Score obstacles", value: data.score },
                { label: "Pompes faites", value: data.pushups },
                { label: "Record actuel", value: `${this.records.flappyScore} pts` },
                { label: "Calories", value: `${calories} kcal` }
            ],
            message: `Bravo ! Vous avez fait ${data.pushups} pompes pour faire voler votre oiseau à travers les obstacles !`
        });
    }

    onNinjaSessionComplete(data) {
        this.stopActiveSport();

        let isNewNinjaRecord = false;
        if (data.score > this.records.ninjaScore) {
            this.records.ninjaScore = data.score;
            isNewNinjaRecord = true;
        }

        this.records.totalWorkouts++;
        this.records.totalCalories += data.calories;

        this.history.unshift({
            id: Date.now(),
            date: new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }),
            sport: 'ludique',
            title: 'Ninja Strike Slash Vision 🍉',
            mainMetric: `${data.score} pts`,
            secondaryMetric: `${data.sliced} tranchés`,
            duration: `60s Cardio`,
            calories: `${data.calories} kcal`,
            isRecord: isNewNinjaRecord
        });

        this.saveStorage();

        this.showSummaryModal({
            title: "NINJA STRIKE TERMINÉ 🍉⚡",
            sport: "Ninja Strike",
            isRecord: isNewNinjaRecord,
            recordText: isNewNinjaRecord ? `🔥 NOUVEAU RECORD NINJA : ${data.score} PTS !` : null,
            stats: [
                { label: "Score", value: data.score },
                { label: "Cibles tranchées", value: data.sliced },
                { label: "Combo max", value: `x${data.maxCombo}` },
                { label: "Calories", value: `${data.calories} kcal` }
            ],
            message: `Super réflexes ! Vous avez découpé ${data.sliced} cibles avec vos mains en direct !`
        });
    }

    showSummaryModal(modalData) {
        const modal = document.getElementById('summary-modal');
        if (!modal) return;

        document.getElementById('modal-title').textContent = modalData.title;
        document.getElementById('modal-message').textContent = modalData.message;

        const recordBadge = document.getElementById('modal-record-badge');
        if (modalData.isRecord) {
            recordBadge.classList.remove('hidden');
            recordBadge.textContent = modalData.recordText || "🔥 NOUVEAU RECORD PERSONNEL !";
        } else {
            recordBadge.classList.add('hidden');
        }

        const statsGrid = document.getElementById('modal-stats-grid');
        statsGrid.innerHTML = modalData.stats.map(s => `
            <div class="bg-slate-800/80 p-4 rounded-xl border border-slate-700/60 text-center">
                <span class="text-xs uppercase tracking-wider text-slate-400 font-semibold block mb-1">${s.label}</span>
                <span class="text-2xl font-black text-white">${s.value}</span>
            </div>
        `).join('');

        modal.classList.remove('hidden');
    }

    updateDashboardUI() {
        document.getElementById('dash-record-boxing').textContent = this.records.boxingPunches;
        document.getElementById('dash-record-combo').textContent = `x${this.records.boxingCombo}`;
        document.getElementById('dash-record-pushups').textContent = this.records.pushupReps;
        document.getElementById('dash-total-workouts').textContent = this.records.totalWorkouts;
        document.getElementById('dash-total-calories').textContent = `${this.records.totalCalories} kcal`;

        const squatEl = document.getElementById('dash-record-squats');
        if (squatEl) squatEl.textContent = this.records.squatReps || 0;

        const flappyEl = document.getElementById('dash-record-flappy');
        if (flappyEl) flappyEl.textContent = `${this.records.flappyScore || 0} pts`;

        const ninjaEl = document.getElementById('dash-record-ninja');
        if (ninjaEl) ninjaEl.textContent = `${this.records.ninjaScore || 0} pts`;

        const historyContainer = document.getElementById('recent-activity-list');
        if (!historyContainer) return;

        if (this.history.length === 0) {
            historyContainer.innerHTML = `
                <div class="text-center py-12 px-4 rounded-2xl bg-slate-800/40 border border-slate-700/40">
                    <div class="w-14 h-14 mx-auto mb-3 rounded-full bg-slate-700/40 flex items-center justify-center text-2xl">⚡</div>
                    <p class="text-slate-300 font-medium text-base mb-1">Aucune séance enregistrée pour le moment</p>
                    <p class="text-slate-500 text-sm">Choisissez une rubrique ci-dessus pour lancer votre premier entraînement !</p>
                </div>
            `;
            return;
        }

        historyContainer.innerHTML = this.history.slice(0, 6).map(item => {
            const isBoxe = item.sport === 'boxe';
            const isLudique = item.sport === 'ludique';
            const iconBg = isBoxe ? 'bg-red-500/20 text-red-400 border-red-500/30' : (isLudique ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30');
            const icon = isBoxe ? '🥊' : (item.title.includes('Flappy') ? '🐥' : (item.title.includes('Ninja') ? '🍉' : (item.title.includes('Squat') ? '🦵' : '🏋️')));

            return `
                <div class="bg-slate-800/70 hover:bg-slate-800 border border-slate-700/50 p-4 rounded-2xl transition flex items-center justify-between gap-4">
                    <div class="flex items-center gap-4">
                        <div class="w-12 h-12 rounded-xl flex items-center justify-center text-xl border ${iconBg}">
                            ${icon}
                        </div>
                        <div>
                            <div class="flex items-center gap-2">
                                <h4 class="font-bold text-white text-base">${item.title}</h4>
                                ${item.isRecord ? '<span class="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">Record</span>' : ''}
                            </div>
                            <p class="text-xs text-slate-400 mt-0.5">${item.date} • ${item.duration}</p>
                        </div>
                    </div>
                    <div class="text-right">
                        <span class="text-lg font-black text-white block">${item.mainMetric}</span>
                        <span class="text-xs text-slate-400">${item.secondaryMetric} • <span class="text-amber-400 font-semibold">${item.calories}</span></span>
                    </div>
                </div>
            `;
        }).join('');
    }
}

window.app = new App();
window.addEventListener('DOMContentLoaded', () => {
    window.app.init();
});
