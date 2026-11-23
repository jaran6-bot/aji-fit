// Push-ups Tracker Engine with MediaPipe Pose + Interactive Fallback
class PushupTracker {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.isActive = false;

        // Rep counting state machine
        this.reps = 0;
        this.stage = 'up'; // 'up', 'down', 'going_down', 'going_up'
        this.currentDepthPercent = 0; // 0% to 100%
        this.minElbowAngleReached = 180;
        this.startTime = 0;
        this.elapsedSeconds = 0;
        this.timerInterval = null;
        this.animFrameId = null;

        // Feedback
        this.feedbackMessage = "Placez-vous de profil face à la caméra";
        this.feedbackColor = "#38bdf8";
        this.lastRepTime = 0;
        this.lastLandmarks = null;
        this.lastActiveJoints = null;

        // Animation
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

        // Pointer click to test a rep
        this.canvas.style.pointerEvents = 'auto';
        this.canvas.addEventListener('pointerdown', () => {
            if (!this.isActive) return;
            this.simulateRep();
        });

        // Spacebar to test a rep
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
        this.minElbowAngleReached = 180;
        this.startTime = Date.now();
        this.elapsedSeconds = 0;
        this.repAnimations = [];
        this.feedbackMessage = "Prêt ! Descendez la poitrine au sol";
        this.feedbackColor = "#38bdf8";
        this.lastLandmarks = null;
        this.lastActiveJoints = null;

        this.resize();

        window.soundEngine.playBell();
        window.coachVoice.speak("Tracker activé ! En position de pompes.", true);

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
        this.feedbackMessage = `🔥 Pompe n°${this.reps} validée (test) !`;
        this.feedbackColor = "#10b981";
        setTimeout(() => {
            this.currentDepthPercent = 0;
        }, 300);
    }

    processPose(landmarks) {
        if (!this.isActive || !landmarks) return;

        // Evaluate Left side vs Right side visibility
        const leftConf = ((landmarks[11]?.visibility || 0) + (landmarks[13]?.visibility || 0) + (landmarks[15]?.visibility || 0)) / 3;
        const rightConf = ((landmarks[12]?.visibility || 0) + (landmarks[14]?.visibility || 0) + (landmarks[16]?.visibility || 0)) / 3;

        let shoulder, elbow, wrist, hip, ankle;
        if (leftConf >= rightConf) {
            shoulder = landmarks[11];
            elbow = landmarks[13];
            wrist = landmarks[15];
            hip = landmarks[23];
            ankle = landmarks[27];
        } else {
            shoulder = landmarks[12];
            elbow = landmarks[14];
            wrist = landmarks[16];
            hip = landmarks[24];
            ankle = landmarks[28];
        }

        const elbowAngle = PoseEngine.calculateAngle(shoulder, elbow, wrist);
        let bodyAngle = 180;
        if (hip && ankle && hip.visibility > 0.4) {
            bodyAngle = PoseEngine.calculateAngle(shoulder, hip, ankle);
        }

        this.evaluateRep(elbowAngle, bodyAngle);
        this.lastLandmarks = landmarks;
        this.lastActiveJoints = { shoulder, elbow, wrist, hip, elbowAngle, bodyAngle };
    }

    evaluateRep(elbowAngle, bodyAngle) {
        if (!elbowAngle || isNaN(elbowAngle)) return;

        // Scale depth: 160 deg = 0%, 90 deg = 100%
        const depth = Math.min(100, Math.max(0, ((160 - elbowAngle) / (160 - 90)) * 100));
        this.currentDepthPercent = Math.round(depth);

        if (bodyAngle < 135) {
            this.feedbackMessage = "⚠️ Gaine le dos ! Ne creuse pas les hanches";
            this.feedbackColor = "#f59e0b";
        }

        if (elbowAngle < this.minElbowAngleReached) {
            this.minElbowAngleReached = elbowAngle;
        }

        if (elbowAngle <= 95) {
            if (this.stage === 'up' || this.stage === 'going_down') {
                this.stage = 'down';
                this.feedbackMessage = "✅ Bonne profondeur ! Poussez vers le haut !";
                this.feedbackColor = "#10b981";
            }
        } else if (elbowAngle >= 152) {
            if (this.stage === 'down') {
                this.reps++;
                this.stage = 'up';
                this.minElbowAngleReached = 180;
                this.lastRepTime = Date.now();

                window.soundEngine.playRepCount(this.reps);
                this.triggerRepAnimation(this.reps);

                if (this.reps % 10 === 0) {
                    window.coachVoice.speak(`${this.reps} pompes ! Formidable !`, true);
                } else if (this.reps % 5 === 0) {
                    window.coachVoice.speak(`${this.reps} ! Continue !`, false);
                } else {
                    this.feedbackMessage = `🔥 Pompe n°${this.reps} validée !`;
                    this.feedbackColor = "#10b981";
                }
            } else if (this.stage === 'going_down') {
                if (this.minElbowAngleReached > 115) {
                    this.feedbackMessage = "❌ Descente incomplète ! Descends plus bas";
                    this.feedbackColor = "#ef4444";
                    window.coachVoice.speak("Descends plus bas !", false);
                }
                this.stage = 'up';
                this.minElbowAngleReached = 180;
            }
        } else if (elbowAngle < 140 && this.stage === 'up') {
            this.stage = 'going_down';
            this.feedbackMessage = "Descendez... encore un peu !";
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

        // Draw Skeleton highlights if detected
        if (this.lastLandmarks && this.lastActiveJoints) {
            this.renderSkeleton(ctx, this.lastLandmarks, w, h, this.lastActiveJoints);
        } else {
            // Guide waiting message
            ctx.save();
            ctx.fillStyle = 'rgba(15, 23, 42, 0.65)';
            ctx.roundRect(w / 2 - 200, h * 0.4, 400, 70, 14);
            ctx.fill();
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            ctx.fillStyle = '#38bdf8';
            ctx.font = 'bold 15px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText("📷 Placez-vous dans le champ de la caméra", w / 2, h * 0.4 + 30);
            ctx.fillStyle = '#94a3b8';
            ctx.font = '12px sans-serif';
            ctx.fillText("(Vous pouvez aussi cliquer sur l'écran pour tester)", w / 2, h * 0.4 + 52);
            ctx.restore();
        }

        // Draw Depth Gauge (Left side)
        this.renderDepthGauge(ctx, h);

        // Draw HUD (Rep Count, Timer, Cadence, Calories)
        this.renderHUD(ctx, w, h);

        // Draw Rep Celebrations
        this.renderRepAnimations(ctx);
    }

    renderSkeleton(ctx, landmarks, w, h, activeJoints) {
        ctx.save();

        const toCoords = (lm) => ({ x: (1 - lm.x) * w, y: lm.y * h });

        const drawLine = (p1, p2, color = '#38bdf8', width = 4) => {
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

        const drawJoint = (p, color = '#00f2fe', radius = 6) => {
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

        const armColor = this.currentDepthPercent > 80 ? '#10b981' : (this.currentDepthPercent > 40 ? '#f59e0b' : '#38bdf8');
        drawLine(activeJoints.shoulder, activeJoints.elbow, armColor, 6);
        drawLine(activeJoints.elbow, activeJoints.wrist, armColor, 6);

        drawJoint(activeJoints.shoulder, '#38bdf8', 8);
        drawJoint(activeJoints.elbow, armColor, 10);
        drawJoint(activeJoints.wrist, '#38bdf8', 8);

        if (activeJoints.elbow && activeJoints.elbow.visibility > 0.4) {
            const ec = toCoords(activeJoints.elbow);
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 16px monospace';
            ctx.fillText(`${Math.round(activeJoints.elbowAngle)}°`, ec.x + 15, ec.y - 10);
        }

        ctx.restore();
    }

    renderDepthGauge(ctx, h) {
        ctx.save();
        const gx = 25;
        const gy = h * 0.25;
        const gw = 18;
        const gh = h * 0.45;

        // Background
        ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
        ctx.roundRect(gx - 4, gy - 4, gw + 8, gh + 8, 8);
        ctx.fill();

        // Fill
        const fillHeight = (this.currentDepthPercent / 100) * gh;
        const color = this.currentDepthPercent >= 90 ? '#10b981' : (this.currentDepthPercent >= 50 ? '#f59e0b' : '#38bdf8');
        ctx.fillStyle = color;
        ctx.roundRect(gx, gy + gh - fillHeight, gw, fillHeight, 4);
        ctx.fill();

        // Target line (90%)
        const targetY = gy + gh * 0.1;
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(gx - 8, targetY);
        ctx.lineTo(gx + gw + 8, targetY);
        ctx.stroke();

        // Label
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`DESCENTE`, gx, gy - 12);
        ctx.fillText(`${this.currentDepthPercent}%`, gx, gy + gh + 22);

        ctx.restore();
    }

    renderHUD(ctx, w, h) {
        ctx.save();

        // Rep Counter (Top Center)
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.roundRect(w / 2 - 120, 20, 240, 85, 14);
        ctx.fill();
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('RÉPÉTITIONS', w / 2, 42);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 44px "Inter", sans-serif';
        ctx.fillText(`${this.reps}`, w / 2, 88);

        // Feedback Banner (Bottom Center)
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

        const ppm = this.elapsedSeconds > 5 ? Math.round((this.reps / (this.elapsedSeconds / 60))) : 0;
        const calories = (this.reps * 0.35 + (this.elapsedSeconds * 0.08)).toFixed(1);

        ctx.textAlign = 'left';
        ctx.fillStyle = '#94a3b8';
        ctx.font = '12px sans-serif';
        ctx.fillText('Temps :', w - 165, 44);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 14px monospace';
        ctx.fillText(timeStr, w - 100, 44);

        ctx.fillStyle = '#94a3b8';
        ctx.font = '12px sans-serif';
        ctx.fillText('Cadence :', w - 165, 68);
        ctx.fillStyle = '#10b981';
        ctx.font = 'bold 14px monospace';
        ctx.fillText(`${ppm} /min`, w - 95, 68);

        ctx.fillStyle = '#94a3b8';
        ctx.font = '12px sans-serif';
        ctx.fillText('Calories :', w - 165, 92);
        ctx.fillStyle = '#f59e0b';
        ctx.font = 'bold 14px monospace';
        ctx.fillText(`${calories} kcal`, w - 95, 92);

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

        const calories = Math.round(this.reps * 0.35 + (this.elapsedSeconds * 0.08));
        const ppm = this.elapsedSeconds > 5 ? Math.round((this.reps / (this.elapsedSeconds / 60))) : 0;

        window.soundEngine.playRecordFanfare();
        window.coachVoice.speak(`Séance terminée ! ${this.reps} pompes au compteur. Bravo !`, true);

        if (window.app) {
            window.app.onPushupSessionComplete({
                reps: this.reps,
                duration: this.elapsedSeconds,
                cadence: ppm,
                calories,
                title: "SÉANCE DE POMPES TERMINÉE 🏋️",
                message: `Vous avez validé ${this.reps} pompes en ${Math.floor(this.elapsedSeconds / 60)}m ${this.elapsedSeconds % 60}s !`
            });
        }
    }
}

window.pushupTracker = new PushupTracker();
