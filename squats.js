// Squats Tracker Engine (Sport Général) with MediaPipe Pose
class SquatTracker {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.isActive = false;

        this.reps = 0;
        this.stage = 'up'; // 'up', 'down', 'going_down'
        this.currentDepthPercent = 0;
        this.minKneeAngleReached = 180;
        this.startTime = 0;
        this.elapsedSeconds = 0;
        this.timerInterval = null;
        this.animFrameId = null;

        this.feedbackMessage = "Placez-vous face ou de 3/4 à la caméra";
        this.feedbackColor = "#38bdf8";
        this.lastLandmarks = null;
        this.lastActiveJoints = null;

        this.repAnimations = [];
    }

    init(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');

        if (window.ResizeObserver && this.canvas.parentElement) {
            const ro = new ResizeObserver(() => this.resize());
            ro.observe(this.canvas.parentElement);
        }
        window.addEventListener('resize', () => this.resize());

        this.canvas.style.pointerEvents = 'auto';
        this.canvas.addEventListener('pointerdown', () => {
            if (!this.isActive) return;
            this.simulateRep();
        });

        window.addEventListener('keydown', (e) => {
            if (this.isActive && e.code === 'Space') {
                e.preventDefault();
                this.simulateRep();
            }
        });

        this.resize();
    }

    resize() {
        if (!this.canvas) return;
        const parent = this.canvas.parentElement;
        const w = (parent ? parent.clientWidth : 0) || window.innerWidth || 800;
        const h = (parent ? parent.clientHeight : 0) || 500;
        if (w > 50 && h > 50) {
            this.canvas.width = w;
            this.canvas.height = h;
        }
    }

    start() {
        this.isActive = true;
        this.reps = 0;
        this.stage = 'up';
        this.currentDepthPercent = 0;
        this.minKneeAngleReached = 180;
        this.startTime = Date.now();
        this.elapsedSeconds = 0;
        this.repAnimations = [];
        this.feedbackMessage = "Prêt ! Descendez les fesses vers l'arrière";
        this.feedbackColor = "#38bdf8";
        this.lastLandmarks = null;
        this.lastActiveJoints = null;

        this.resize();

        window.soundEngine.playBell();
        window.coachVoice.speak("Session de squats lancée ! Descendez cuisses parallèles au sol.", true);

        clearInterval(this.timerInterval);
        this.timerInterval = setInterval(() => {
            if (!this.isActive) return;
            this.elapsedSeconds = Math.floor((Date.now() - this.startTime) / 1000);
        }, 1000);

        if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
        this.loop();
    }

    stop() {
        this.isActive = false;
        clearInterval(this.timerInterval);
        if (this.animFrameId) {
            cancelAnimationFrame(this.animFrameId);
            this.animFrameId = null;
        }
    }

    simulateRep() {
        this.reps++;
        this.currentDepthPercent = 100;
        window.soundEngine.playRepCount(this.reps);
        this.triggerRepAnimation(this.reps);
        this.feedbackMessage = `🔥 Squat n°${this.reps} validé !`;
        this.feedbackColor = "#10b981";
        setTimeout(() => {
            this.currentDepthPercent = 0;
        }, 300);
    }

    processPose(landmarks) {
        if (!this.isActive || !landmarks) return;

        // Landmarks: 23/24 (Hips), 25/26 (Knees), 27/28 (Ankles)
        const leftConf = ((landmarks[23]?.visibility || 0) + (landmarks[25]?.visibility || 0) + (landmarks[27]?.visibility || 0)) / 3;
        const rightConf = ((landmarks[24]?.visibility || 0) + (landmarks[26]?.visibility || 0) + (landmarks[28]?.visibility || 0)) / 3;

        let hip, knee, ankle, shoulder;
        if (leftConf >= rightConf) {
            hip = landmarks[23];
            knee = landmarks[25];
            ankle = landmarks[27];
            shoulder = landmarks[11];
        } else {
            hip = landmarks[24];
            knee = landmarks[26];
            ankle = landmarks[28];
            shoulder = landmarks[12];
        }

        const kneeAngle = PoseEngine.calculateAngle(hip, knee, ankle);
        this.evaluateSquat(kneeAngle);

        this.lastLandmarks = landmarks;
        this.lastActiveJoints = { hip, knee, ankle, shoulder, kneeAngle };
    }

    evaluateSquat(kneeAngle) {
        if (!kneeAngle || isNaN(kneeAngle)) return;

        // Depth scale: 170 deg = 0%, 90 deg = 100%
        const depth = Math.min(100, Math.max(0, ((170 - kneeAngle) / (170 - 90)) * 100));
        this.currentDepthPercent = Math.round(depth);

        if (kneeAngle < this.minKneeAngleReached) {
            this.minKneeAngleReached = kneeAngle;
        }

        // DOWN threshold: <= 95 deg
        // UP threshold: >= 155 deg
        if (kneeAngle <= 95) {
            if (this.stage === 'up' || this.stage === 'going_down') {
                this.stage = 'down';
                this.feedbackMessage = "✅ Parfait ! Poussez sur vos talons !";
                this.feedbackColor = "#10b981";
            }
        } else if (kneeAngle >= 155) {
            if (this.stage === 'down') {
                this.reps++;
                this.stage = 'up';
                this.minKneeAngleReached = 180;

                window.soundEngine.playRepCount(this.reps);
                this.triggerRepAnimation(this.reps);

                if (this.reps % 10 === 0) {
                    window.coachVoice.speak(`${this.reps} squats ! Excellente puissance !`, true);
                } else if (this.reps % 5 === 0) {
                    window.coachVoice.speak(`${this.reps} ! Très bon rythme !`, false);
                } else {
                    this.feedbackMessage = `🔥 Squat n°${this.reps} validé !`;
                    this.feedbackColor = "#10b981";
                }
            } else if (this.stage === 'going_down') {
                if (this.minKneeAngleReached > 120) {
                    this.feedbackMessage = "❌ Descendez plus bas (cuisses à l'horizontale) !";
                    this.feedbackColor = "#ef4444";
                }
                this.stage = 'up';
                this.minKneeAngleReached = 180;
            }
        } else if (kneeAngle < 145 && this.stage === 'up') {
            this.stage = 'going_down';
            this.feedbackMessage = "Descendez... fléchissez les genoux !";
            this.feedbackColor = "#38bdf8";
        }
    }

    triggerRepAnimation(count) {
        this.repAnimations.push({
            count,
            x: this.canvas.width / 2,
            y: this.canvas.height * 0.45,
            scale: 1,
            alpha: 1
        });
    }

    loop() {
        if (!this.isActive) return;

        this.render();
        this.animFrameId = requestAnimationFrame(() => this.loop());
    }

    render() {
        const ctx = this.ctx;
        if (!ctx) return;
        const w = this.canvas.width;
        const h = this.canvas.height;

        ctx.clearRect(0, 0, w, h);

        if (this.lastLandmarks && this.lastActiveJoints) {
            this.renderSkeleton(ctx, w, h, this.lastActiveJoints);
        } else {
            ctx.save();
            ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
            ctx.roundRect(w / 2 - 200, h * 0.4, 400, 70, 14);
            ctx.fill();
            ctx.strokeStyle = '#10b981';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            ctx.fillStyle = '#10b981';
            ctx.font = 'bold 15px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText("📷 Reculez pour avoir les jambes visibles", w / 2, h * 0.4 + 30);
            ctx.fillStyle = '#94a3b8';
            ctx.font = '12px sans-serif';
            ctx.fillText("(Ou cliquez / appuyez sur Espace pour tester)", w / 2, h * 0.4 + 52);
            ctx.restore();
        }

        // Draw Depth Gauge (Left)
        this.renderDepthGauge(ctx, h);

        // Draw HUD
        this.renderHUD(ctx, w, h);

        // Celebrations
        this.renderRepAnimations(ctx);
    }

    renderSkeleton(ctx, w, h, joints) {
        ctx.save();
        const toCoords = (lm) => ({ x: (1 - lm.x) * w, y: lm.y * h });

        const drawLine = (p1, p2, color = '#10b981', width = 6) => {
            if (!p1 || !p2 || p1.visibility < 0.4 || p2.visibility < 0.4) return;
            const c1 = toCoords(p1);
            const c2 = toCoords(p2);
            ctx.strokeStyle = color;
            ctx.lineWidth = width;
            ctx.beginPath();
            ctx.moveTo(c1.x, c1.y);
            ctx.lineTo(c2.x, c2.y);
            ctx.stroke();
        };

        const drawJoint = (p, color = '#34d399', radius = 9) => {
            if (!p || p.visibility < 0.4) return;
            const c = toCoords(p);
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(c.x, c.y, radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.stroke();
        };

        const legColor = this.currentDepthPercent > 80 ? '#10b981' : (this.currentDepthPercent > 40 ? '#f59e0b' : '#38bdf8');
        drawLine(joints.hip, joints.knee, legColor, 8);
        drawLine(joints.knee, joints.ankle, legColor, 8);

        drawJoint(joints.hip, '#38bdf8', 8);
        drawJoint(joints.knee, legColor, 11);
        drawJoint(joints.ankle, '#38bdf8', 8);

        if (joints.knee && joints.knee.visibility > 0.4) {
            const kc = toCoords(joints.knee);
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 16px monospace';
            ctx.fillText(`${Math.round(joints.kneeAngle)}°`, kc.x + 18, kc.y);
        }

        ctx.restore();
    }

    renderDepthGauge(ctx, h) {
        ctx.save();
        const gx = 25;
        const gy = h * 0.25;
        const gw = 18;
        const gh = h * 0.45;

        ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
        ctx.roundRect(gx - 4, gy - 4, gw + 8, gh + 8, 8);
        ctx.fill();

        const fillHeight = (this.currentDepthPercent / 100) * gh;
        const color = this.currentDepthPercent >= 90 ? '#10b981' : (this.currentDepthPercent >= 50 ? '#f59e0b' : '#38bdf8');
        ctx.fillStyle = color;
        ctx.roundRect(gx, gy + gh - fillHeight, gw, fillHeight, 4);
        ctx.fill();

        const targetY = gy + gh * 0.1;
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(gx - 8, targetY);
        ctx.lineTo(gx + gw + 8, targetY);
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`FLEXION`, gx, gy - 12);
        ctx.fillText(`${this.currentDepthPercent}%`, gx, gy + gh + 22);

        ctx.restore();
    }

    renderHUD(ctx, w, h) {
        ctx.save();

        // Rep Counter (Center Top)
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.roundRect(w / 2 - 120, 20, 240, 85, 14);
        ctx.fill();
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#10b981';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('SQUATS VALIDÉS', w / 2, 42);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 44px "Inter", sans-serif';
        ctx.fillText(`${this.reps}`, w / 2, 88);

        // Feedback Banner (Bottom)
        ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
        ctx.roundRect(w / 2 - 250, h - 75, 500, 48, 12);
        ctx.fill();
        ctx.strokeStyle = this.feedbackColor;
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = this.feedbackColor;
        ctx.font = 'bold 17px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(this.feedbackMessage, w / 2, h - 45);

        // Stats card (Top Right)
        ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
        ctx.roundRect(w - 180, 20, 160, 85, 12);
        ctx.fill();

        const mins = Math.floor(this.elapsedSeconds / 60);
        const secs = this.elapsedSeconds % 60;
        const timeStr = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
        const calories = (this.reps * 0.45 + (this.elapsedSeconds * 0.09)).toFixed(1);

        ctx.textAlign = 'left';
        ctx.fillStyle = '#94a3b8';
        ctx.font = '12px sans-serif';
        ctx.fillText('Temps :', w - 165, 45);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 14px monospace';
        ctx.fillText(timeStr, w - 100, 45);

        ctx.fillStyle = '#94a3b8';
        ctx.font = '12px sans-serif';
        ctx.fillText('Calories :', w - 165, 75);
        ctx.fillStyle = '#f59e0b';
        ctx.font = 'bold 14px monospace';
        ctx.fillText(`${calories} kcal`, w - 95, 75);

        ctx.restore();
    }

    renderRepAnimations(ctx) {
        for (let i = this.repAnimations.length - 1; i >= 0; i--) {
            const anim = this.repAnimations[i];
            anim.scale += 0.04;
            anim.alpha -= 0.03;
            anim.y -= 1.5;

            if (anim.alpha <= 0) {
                this.repAnimations.splice(i, 1);
                continue;
            }

            ctx.save();
            ctx.globalAlpha = anim.alpha;
            ctx.fillStyle = '#10b981';
            ctx.font = `bold ${Math.floor(48 * anim.scale)}px "Inter", sans-serif`;
            ctx.textAlign = 'center';
            ctx.fillText(`+1 (${anim.count})`, anim.x, anim.y);
            ctx.restore();
        }
    }

    finishSession() {
        this.stop();
        window.soundEngine.playBell();

        const calories = Math.round(this.reps * 0.45 + (this.elapsedSeconds * 0.09));

        window.soundEngine.playRecordFanfare();
        window.coachVoice.speak(`Séance terminée ! ${this.reps} squats au compteur. Bravo !`, true);

        if (window.app) {
            window.app.onSquatSessionComplete({
                reps: this.reps,
                duration: this.elapsedSeconds,
                calories,
                title: "SÉANCE DE SQUATS TERMINÉE 🦵",
                message: `Vous avez validé ${this.reps} squats avec une excellente profondeur !`
            });
        }
    }
}

window.squatTracker = new SquatTracker();
