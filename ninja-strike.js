// Ninja Strike / Slash Vision (Sport Ludique & Réflexes IA)
class NinjaStrikeGame {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.isActive = false;

        this.score = 0;
        this.combo = 0;
        this.maxCombo = 0;
        this.targetsSliced = 0;
        this.timeLeft = 60;
        this.timerInterval = null;
        this.animFrameId = null;

        // Targets: { x, y, vx, vy, radius, color, type ('normal', 'golden', 'bomb'), sliced: false }
        this.targets = [];
        this.spawnTimer = 0;

        // Hand Trail Positions for left and right hands
        this.leftHandTrail = [];
        this.rightHandTrail = [];
        this.prevLeft = null;
        this.prevRight = null;

        // Particles
        this.particles = [];
        this.floatingTexts = [];
    }

    init(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');

        if (window.ResizeObserver && this.canvas.parentElement) {
            const ro = new ResizeObserver(() => this.resize());
            ro.observe(this.canvas.parentElement);
        }
        window.addEventListener('resize', () => this.resize());

        // Mouse slash support
        this.canvas.style.pointerEvents = 'auto';
        let isMouseDown = false;
        this.canvas.addEventListener('pointerdown', (e) => {
            isMouseDown = true;
            this.handlePointerSlash(e);
        });
        this.canvas.addEventListener('pointermove', (e) => {
            if (isMouseDown) this.handlePointerSlash(e);
        });
        window.addEventListener('pointerup', () => { isMouseDown = false; });

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
        this.resize();
        this.isActive = true;
        this.score = 0;
        this.combo = 0;
        this.maxCombo = 0;
        this.targetsSliced = 0;
        this.timeLeft = 60;
        this.targets = [];
        this.particles = [];
        this.floatingTexts = [];
        this.leftHandTrail = [];
        this.rightHandTrail = [];
        this.spawnTimer = 0;

        window.soundEngine.playBell();
        window.coachVoice.speak("Ninja Strike lancé ! Tranchez les cibles avec vos mains, évitez les bombes !", true);

        clearInterval(this.timerInterval);
        this.timerInterval = setInterval(() => {
            if (!this.isActive) return;
            this.timeLeft--;
            if (this.timeLeft <= 0) {
                this.endGame();
            }
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

    handlePointerSlash(e) {
        if (!this.isActive) return;
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        this.rightHandTrail.push({ x, y, alpha: 1 });
        this.checkSlashAtPoint({ x, y });
    }

    processPose(landmarks) {
        if (!this.isActive || !landmarks) return;

        const w = this.canvas.width;
        const h = this.canvas.height;

        // Landmarks: 15 (Left wrist), 16 (Right wrist), 19/20 (Index fingers)
        const lWrist = landmarks[15];
        const rWrist = landmarks[16];

        if (lWrist && lWrist.visibility > 0.4) {
            const lx = (1 - lWrist.x) * w;
            const ly = lWrist.y * h;
            this.leftHandTrail.push({ x: lx, y: ly, alpha: 1 });
            this.checkSlashLine(this.prevLeft, { x: lx, y: ly });
            this.prevLeft = { x: lx, y: ly };
        }

        if (rWrist && rWrist.visibility > 0.4) {
            const rx = (1 - rWrist.x) * w;
            const ry = rWrist.y * h;
            this.rightHandTrail.push({ x: rx, y: ry, alpha: 1 });
            this.checkSlashLine(this.prevRight, { x: rx, y: ry });
            this.prevRight = { x: rx, y: ry };
        }
    }

    checkSlashLine(p1, p2) {
        if (!p2) return;
        if (!p1) return this.checkSlashAtPoint(p2);

        // Check if hand moved with speed
        const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
        if (dist > 12) {
            // Check targets along the line segment
            this.targets.forEach(t => {
                if (t.sliced) return;
                const d = this.distToSegment(t, p1, p2);
                if (d < t.radius + 15) {
                    this.sliceTarget(t);
                }
            });
        }
    }

    checkSlashAtPoint(p) {
        this.targets.forEach(t => {
            if (t.sliced) return;
            const d = Math.hypot(t.x - p.x, t.y - p.y);
            if (d < t.radius + 15) {
                this.sliceTarget(t);
            }
        });
    }

    distToSegment(p, v, w) {
        const l2 = (v.x - w.x) ** 2 + (v.y - w.y) ** 2;
        if (l2 === 0) return Math.hypot(p.x - v.x, p.y - v.y);
        let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
        t = Math.max(0, Math.min(1, t));
        return Math.hypot(p.x - (v.x + t * (w.x - v.x)), p.y - (v.y + t * (w.y - v.y)));
    }

    sliceTarget(target) {
        target.sliced = true;

        if (target.type === 'bomb') {
            // Hit a bomb!
            window.soundEngine.playBomb();
            this.combo = 0;
            this.score = Math.max(0, this.score - 50);
            this.createExplosion(target.x, target.y, '#ef4444');
            this.createFloatingText('💣 BOOM ! -50 PTS', target.x, target.y, '#ef4444');
            return;
        }

        // Sliced normal or golden target!
        this.targetsSliced++;
        this.combo++;
        if (this.combo > this.maxCombo) this.maxCombo = this.combo;

        const basePts = target.type === 'golden' ? 60 : 25;
        const pts = basePts + (this.combo * 5);
        this.score += pts;

        window.soundEngine.playSlice();
        this.createSlashSparks(target.x, target.y, target.color);
        this.createFloatingText(`+${pts} ${target.emoji}`, target.x, target.y - 20, target.color);
    }

    createSlashSparks(x, y, color) {
        for (let i = 0; i < 20; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 3 + Math.random() * 8;
            this.particles.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                radius: 3 + Math.random() * 4,
                alpha: 1,
                color
            });
        }
    }

    createExplosion(x, y, color) {
        for (let i = 0; i < 35; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 4 + Math.random() * 12;
            this.particles.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                radius: 5 + Math.random() * 5,
                alpha: 1,
                color
            });
        }
    }

    createFloatingText(text, x, y, color) {
        this.floatingTexts.push({
            text, x, y,
            vy: -1.8,
            alpha: 1,
            color
        });
    }

    loop() {
        if (!this.isActive) return;

        this.update();
        this.render();

        this.animFrameId = requestAnimationFrame(() => this.loop());
    }

    update() {
        const w = this.canvas.width;
        const h = this.canvas.height;

        // Spawn targets
        this.spawnTimer--;
        if (this.spawnTimer <= 0) {
            this.spawnTarget();
            this.spawnTimer = Math.max(30, 65 - Math.floor(this.score / 60));
        }

        // Update targets physics (arcs launching upwards from bottom)
        for (let i = this.targets.length - 1; i >= 0; i--) {
            const t = this.targets[i];
            t.x += t.vx;
            t.y += t.vy;
            t.vy += 0.28; // gravity

            if (t.y > h + 60 || t.sliced) {
                this.targets.splice(i, 1);
            }
        }

        // Fade trails
        this.updateTrail(this.leftHandTrail);
        this.updateTrail(this.rightHandTrail);
    }

    updateTrail(trail) {
        for (let i = trail.length - 1; i >= 0; i--) {
            trail[i].alpha -= 0.08;
            if (trail[i].alpha <= 0) {
                trail.splice(i, 1);
            }
        }
    }

    spawnTarget() {
        const w = this.canvas.width;
        const h = this.canvas.height;

        const isLeft = Math.random() > 0.5;
        const startX = isLeft ? (w * 0.2 + Math.random() * (w * 0.2)) : (w * 0.6 + Math.random() * (w * 0.2));
        const startY = h + 20;

        const vx = (isLeft ? 1 : -1) * (1.5 + Math.random() * 3);
        const vy = -(11 + Math.random() * 5); // powerful launch upwards

        // Types: 15% bomb, 20% golden, 65% normal
        const rand = Math.random();
        let type = 'normal';
        let emoji = '🍉';
        let color = '#10b981';

        if (rand < 0.15) {
            type = 'bomb';
            emoji = '💣';
            color = '#ef4444';
        } else if (rand < 0.35) {
            type = 'golden';
            emoji = '⚡';
            color = '#fbbf24';
        } else {
            const fruits = [
                { emoji: '🍉', color: '#10b981' },
                { emoji: '🍊', color: '#f97316' },
                { emoji: '🍎', color: '#ef4444' },
                { emoji: '🍇', color: '#a855f7' }
            ];
            const chosen = fruits[Math.floor(Math.random() * fruits.length)];
            emoji = chosen.emoji;
            color = chosen.color;
        }

        this.targets.push({
            x: startX,
            y: startY,
            vx, vy,
            radius: type === 'golden' ? 32 : 36,
            type,
            emoji,
            color,
            sliced: false
        });
    }

    render() {
        const ctx = this.ctx;
        if (!ctx) return;
        const w = this.canvas.width;
        const h = this.canvas.height;

        ctx.clearRect(0, 0, w, h);

        // 1. Draw Hand Slash Trails (Neon Blades)
        this.renderTrail(ctx, this.leftHandTrail, '#00f2fe'); // Cyan left blade
        this.renderTrail(ctx, this.rightHandTrail, '#f59e0b'); // Gold right blade

        // 2. Draw Flying Targets
        this.renderTargets(ctx);

        // 3. Draw Particles & Texts
        this.renderParticles(ctx);

        // 4. Draw HUD
        this.renderHUD(ctx, w);
    }

    renderTrail(ctx, trail, color) {
        if (trail.length < 2) return;
        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        for (let i = 1; i < trail.length; i++) {
            const p1 = trail[i - 1];
            const p2 = trail[i];
            ctx.globalAlpha = p2.alpha;
            ctx.lineWidth = 14 * p2.alpha;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
        }
        ctx.restore();
    }

    renderTargets(ctx) {
        this.targets.forEach(t => {
            if (t.sliced) return;

            ctx.save();
            // Glow circle
            ctx.fillStyle = t.type === 'bomb' ? 'rgba(239, 68, 68, 0.25)' : 'rgba(255, 255, 255, 0.15)';
            ctx.beginPath();
            ctx.arc(t.x, t.y, t.radius + 6, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = t.color;
            ctx.lineWidth = 3;
            ctx.stroke();

            // Emoji target icon
            ctx.font = `${t.radius * 1.3}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(t.emoji, t.x, t.y);
            ctx.restore();
        });
    }

    renderParticles(ctx) {
        // Sparks
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.alpha -= 0.035;

            if (p.alpha <= 0) {
                this.particles.splice(i, 1);
                continue;
            }

            ctx.save();
            ctx.globalAlpha = p.alpha;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // Texts
        for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
            const ft = this.floatingTexts[i];
            ft.y += ft.vy;
            ft.alpha -= 0.025;

            if (ft.alpha <= 0) {
                this.floatingTexts.splice(i, 1);
                continue;
            }

            ctx.save();
            ctx.globalAlpha = ft.alpha;
            ctx.fillStyle = ft.color;
            ctx.font = 'bold 22px "Inter", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(ft.text, ft.x, ft.y);
            ctx.restore();
        }
    }

    renderHUD(ctx, w) {
        ctx.save();

        // Score (Center)
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.roundRect(w / 2 - 100, 16, 200, 60, 14);
        ctx.fill();
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 32px "Inter", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${this.score}`, w / 2, 58);

        // Timer (Top Right)
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.roundRect(w - 140, 16, 120, 50, 10);
        ctx.fill();
        ctx.fillStyle = this.timeLeft <= 10 ? '#ef4444' : '#38bdf8';
        ctx.font = 'bold 24px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`0:${this.timeLeft < 10 ? '0' : ''}${this.timeLeft}`, w - 80, 50);

        // Combo & Slices (Top Left)
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.roundRect(20, 16, 170, 55, 10);
        ctx.fill();

        ctx.textAlign = 'left';
        ctx.fillStyle = '#10b981';
        ctx.font = 'bold 15px sans-serif';
        ctx.fillText(`Tranchés : ${this.targetsSliced}`, 32, 38);

        if (this.combo > 1) {
            ctx.fillStyle = '#f59e0b';
            ctx.font = 'bold 13px sans-serif';
            ctx.fillText(`COMBO x${this.combo} ! 🔥`, 32, 58);
        } else {
            ctx.fillStyle = '#94a3b8';
            ctx.font = '12px sans-serif';
            ctx.fillText(`Bougez les bras !`, 32, 58);
        }

        ctx.restore();
    }

    endGame() {
        this.stop();
        window.soundEngine.playRecordFanfare();
        window.coachVoice.speak(`Session Ninja terminée ! Vous avez tranché ${this.targetsSliced} cibles avec un score de ${this.score} !`, true);

        if (window.app) {
            window.app.onNinjaSessionComplete({
                score: this.score,
                sliced: this.targetsSliced,
                maxCombo: this.maxCombo,
                calories: Math.round(this.targetsSliced * 0.35 + 15)
            });
        }
    }
}

window.ninjaStrikeGame = new NinjaStrikeGame();
