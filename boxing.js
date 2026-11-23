// Enhanced Boxing Engine: Supports "Coach Mitaines (Instructions)" & "Combat Duel (Adversaire Agressif)"
class BoxingGame {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.isActive = false;
        this.gameMode = 'coach'; // 'coach' (Pattes d'ours dictées) or 'duel' (Adversaire agressif)
        this.difficulty = 'normal';

        // Stats
        this.punchesCount = 0;
        this.dodgesCount = 0;
        this.combo = 0;
        this.maxCombo = 0;
        this.score = 0;
        this.roundTime = 90;
        this.timeLeft = 90;
        this.timerInterval = null;

        // Health
        this.opponentMaxHp = 150;
        this.opponentHp = 150;
        this.playerMaxHp = 100;
        this.playerHp = 100;

        // Screen Shake
        this.shakeTimer = 0;

        // Opponent (For Duel Mode)
        this.opponent = {
            x: 400,
            y: 250,
            targetX: 0,
            targetY: 0,
            bobPhase: 0,
            state: 'idle', // idle, charging, punch_incoming, stunned, ko
            attackType: null,
            attackStartTime: 0,
            attackDuration: 1800,
            fistScale: 1,
            fistX: 0,
            fistY: 0,
            dodgeRequired: 'none', // 'left', 'right', 'down'
            lastAttackTime: 0
        };

        // Coach Mode Instructions Queue & Active Command
        this.coachCommand = null;
        this.coachCommandTimer = 0;
        this.coachCommandDuration = 2800; // ms to execute
        this.coachCommandsPool = [
            { id: 'jab', label: '🥊 JAB ! (Direct Gauche)', speech: 'Jab !', targetId: 'chin', type: 'punch', hand: 'Gauche' },
            { id: 'cross', label: '💥 CROSS ! (Direct Droit)', speech: 'Cross !', targetId: 'chin', type: 'punch', hand: 'Droite' },
            { id: 'hook_l', label: '🥊 CROCHET GAUCHE !', speech: 'Crochet gauche !', targetId: 'right_cheek', type: 'punch', hand: 'Gauche' },
            { id: 'hook_r', label: '💥 CROCHET DROIT !', speech: 'Crochet droit !', targetId: 'left_cheek', type: 'punch', hand: 'Droite' },
            { id: 'body', label: '⚡ COUP AU CORPS !', speech: 'Au corps !', targetId: 'body', type: 'punch', hand: 'N\'importe' },
            { id: 'dodge_l', label: '🛡️ ESQUIVE À GAUCHE !', speech: 'Esquive à gauche !', dodgeSide: 'left', type: 'dodge' },
            { id: 'dodge_r', label: '🛡️ ESQUIVE À DROITE !', speech: 'Esquive à droite !', dodgeSide: 'right', type: 'dodge' },
            { id: 'combo_12', label: '🔥 COMBO 1 - 2 ! (Jab + Cross)', speech: 'Combo un deux !', targetId: 'chin', type: 'punch', hitsNeeded: 2 }
        ];

        // Targets, Particles & Texts
        this.targets = [];
        this.particles = [];
        this.floatingTexts = [];

        this.prevLeftWrist = null;
        this.prevRightWrist = null;
        this.lastHitTime = 0;
        this.animFrameId = null;
    }

    init(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');

        if (window.ResizeObserver && this.canvas.parentElement) {
            const ro = new ResizeObserver(() => this.resize());
            ro.observe(this.canvas.parentElement);
        }
        window.addEventListener('resize', () => this.resize());

        // Pointer click / touch punch
        this.canvas.style.pointerEvents = 'auto';
        this.canvas.addEventListener('pointerdown', (e) => {
            if (!this.isActive) return;
            const rect = this.canvas.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const clickY = e.clientY - rect.top;

            let hitAny = false;
            this.targets.forEach(target => {
                if (!target.active) return;
                const d = Math.hypot(clickX - target.x, clickY - target.y);
                if (d < target.radius + 28) {
                    this.handlePunchSuccess(target, { x: clickX, y: clickY }, 'Clic');
                    hitAny = true;
                }
            });

            if (!hitAny) {
                this.createHitParticles(clickX, clickY, '#38bdf8');
                window.soundEngine.playWhoosh();
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
            this.opponent.x = w / 2;
            this.opponent.y = h * 0.45;
            this.generateTargets();
        }
    }

    start(mode = 'coach', difficulty = 'normal') {
        this.gameMode = mode;
        this.difficulty = difficulty;
        this.isActive = true;
        this.punchesCount = 0;
        this.dodgesCount = 0;
        this.combo = 0;
        this.maxCombo = 0;
        this.score = 0;
        this.shakeTimer = 0;

        this.resize();

        const hpMap = { easy: 500, normal: 750, hard: 1100 };
        this.opponentMaxHp = hpMap[difficulty] || 750;
        this.opponentHp = this.opponentMaxHp;
        this.playerHp = this.playerMaxHp;

        // 3 Minutes (180s) Round
        this.roundTime = 180;
        this.timeLeft = this.roundTime;

        this.particles = [];
        this.floatingTexts = [];
        this.generateTargets();

        this.opponent.state = 'idle';
        this.opponent.lastAttackTime = Date.now() + 2500;

        window.soundEngine.playBell();

        if (this.gameMode === 'coach') {
            window.coachVoice.speak("Entraînement pattes d'ours ! Écoutez mes ordres !", true);
            setTimeout(() => this.nextCoachCommand(), 1000);
        } else {
            window.coachVoice.speak("Combat duel ! Protégez-vous, l'adversaire vous attaque !", true);
        }

        clearInterval(this.timerInterval);
        this.timerInterval = setInterval(() => {
            if (!this.isActive) return;
            this.timeLeft--;
            if (this.timeLeft <= 0) {
                this.endGame('time');
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

    generateTargets() {
        const cx = (this.canvas && this.canvas.width > 0) ? this.canvas.width / 2 : 400;
        const cy = (this.canvas && this.canvas.height > 0) ? this.canvas.height * 0.42 : 220;

        this.targets = [
            { id: 'chin', label: 'DIRECT (JAB/CROSS)', x: cx, y: cy - 25, radius: 46, active: true, points: 50, isHighlight: false },
            { id: 'left_cheek', label: 'CROCHET D', x: cx - 110, y: cy - 40, radius: 44, active: true, points: 70, isHighlight: false },
            { id: 'right_cheek', label: 'CROCHET G', x: cx + 110, y: cy - 40, radius: 44, active: true, points: 70, isHighlight: false },
            { id: 'body', label: 'CORPS', x: cx, y: cy + 95, radius: 52, active: true, points: 60, isHighlight: false }
        ];
    }

    // --- COACH MODE LOGIC ---
    nextCoachCommand() {
        if (!this.isActive || this.gameMode !== 'coach') return;

        // Pick next random command
        const pool = this.coachCommandsPool;
        const cmd = pool[Math.floor(Math.random() * pool.length)];

        this.coachCommand = {
            ...cmd,
            startTime: Date.now(),
            hitsDone: 0
        };

        // Reset highlight on targets
        this.targets.forEach(t => {
            t.isHighlight = (cmd.type === 'punch' && t.id === cmd.targetId);
            t.active = true;
        });

        // Coach voice announces the command
        window.coachVoice.speak(cmd.speech, true);
    }

    // --- POSE PROCESSING ---
    processPose(landmarks) {
        if (!this.isActive || !landmarks) return;

        const w = this.canvas.width;
        const h = this.canvas.height;

        const nose = { x: (1 - landmarks[0].x) * w, y: landmarks[0].y * h };
        const leftWrist = { x: (1 - landmarks[15].x) * w, y: landmarks[15].y * h, z: landmarks[15].z };
        const rightWrist = { x: (1 - landmarks[16].x) * w, y: landmarks[16].y * h, z: landmarks[16].z };

        // Check punches
        this.checkPunch(leftWrist, this.prevLeftWrist, 'Gauche');
        this.checkPunch(rightWrist, this.prevRightWrist, 'Droite');

        this.prevLeftWrist = { ...leftWrist };
        this.prevRightWrist = { ...rightWrist };

        // Check dodges in Coach mode
        if (this.gameMode === 'coach' && this.coachCommand && this.coachCommand.type === 'dodge') {
            this.checkCoachDodge(nose);
        }

        // Check dodges in Duel mode (when boss attacks)
        if (this.gameMode === 'duel' && this.opponent.state === 'punch_incoming') {
            this.checkDuelDodge(nose);
        }
    }

    checkPunch(wrist, prevWrist, handName) {
        if (!prevWrist) return;

        const now = Date.now();
        if (now - this.lastHitTime < 140) return;

        const dist = Math.hypot(wrist.x - prevWrist.x, wrist.y - prevWrist.y);
        const isFast = dist > 10; // More sensitive speed threshold

        this.targets.forEach(target => {
            if (!target.active) return;

            const hitDist = Math.hypot(wrist.x - target.x, wrist.y - target.y);
            // Generous hit box so punches register cleanly
            if (hitDist < target.radius + 50 && isFast) {
                this.handlePunchSuccess(target, wrist, handName);
            }
        });
    }

    handlePunchSuccess(target, hitPos, handName) {
        this.lastHitTime = Date.now();

        this.punchesCount++;
        this.combo++;
        if (this.combo > this.maxCombo) this.maxCombo = this.combo;

        // Damage depends on mode
        let damage = Math.floor(12 + Math.min(this.combo * 1.5, 25));
        if (this.opponent.state === 'stunned') damage *= 2; // Critical hit during stunned boss!

        this.opponentHp = Math.max(0, this.opponentHp - damage);

        const pts = target.points + (this.combo * 10);
        this.score += pts;

        this.createHitParticles(hitPos.x, hitPos.y, '#00f2fe');
        this.createFloatingText(`+${pts} ${target.label}`, hitPos.x, hitPos.y - 30, '#00f2fe');

        // Opponent hurt animation
        this.opponent.targetX = (Math.random() - 0.5) * 50;
        this.opponent.targetY = -20;

        // Check Coach command fulfillment
        if (this.gameMode === 'coach' && this.coachCommand && this.coachCommand.type === 'punch') {
            if (target.id === this.coachCommand.targetId || this.coachCommand.targetId === 'chin') {
                this.coachCommand.hitsDone = (this.coachCommand.hitsDone || 0) + 1;
                const needed = this.coachCommand.hitsNeeded || 1;
                if (this.coachCommand.hitsDone >= needed) {
                    // Validated!
                    this.createFloatingText('EXCELLENT ! +100', this.canvas.width / 2, 140, '#10b981');
                    this.score += 100;
                    window.soundEngine.playHeavyPunch();
                    setTimeout(() => this.nextCoachCommand(), 800);
                }
            }
        }

        // Sound
        if (this.combo > 0 && this.combo % 5 === 0) {
            window.soundEngine.playHeavyPunch();
        } else {
            window.soundEngine.playPunch(1.1);
        }

        // Duel boss KO check
        if (this.opponentHp <= 0) {
            this.endGame('ko');
        }
    }

    checkCoachDodge(nose) {
        const midX = this.canvas.width / 2;
        const side = this.coachCommand.dodgeSide;
        const isSafe = (side === 'left' && nose.x < midX - 65) ||
                       (side === 'right' && nose.x > midX + 65);

        if (isSafe) {
            this.dodgesCount++;
            this.combo++;
            this.score += 80;
            this.createFloatingText('ESQUIVE PARFAITE ! +80', nose.x, nose.y - 40, '#10b981');
            window.soundEngine.playWhoosh();
            window.coachVoice.speak("Bien esquivé !", false);
            this.coachCommand = null;
            setTimeout(() => this.nextCoachCommand(), 800);
        }
    }

    checkDuelDodge(nose) {
        const midX = this.canvas.width / 2;
        const req = this.opponent.dodgeRequired;
        const isSafe = (req === 'left' && nose.x < midX - 70) ||
                       (req === 'right' && nose.x > midX + 70);

        if (isSafe) {
            // Dodged boss attack! Boss becomes stunned for counter attack!
            this.opponent.state = 'stunned';
            this.dodgesCount++;
            this.combo += 2;
            this.score += 120;

            this.createHitParticles(nose.x, nose.y, '#10b981');
            this.createFloatingText('ESQUIVE REUSSIE ! BOSS VULNÉRABLE !', nose.x, nose.y - 50, '#f59e0b');

            window.soundEngine.playWhoosh();
            window.coachVoice.speak("Il a raté son coup ! Contre-attaque !", false);

            // Stunned duration (player can deal double damage!)
            setTimeout(() => {
                if (this.opponent.state === 'stunned') {
                    this.opponent.state = 'idle';
                    this.opponent.lastAttackTime = Date.now() + 2500;
                }
            }, 2000);
        }
    }

    update() {
        const now = Date.now();

        // Screen shake decay
        if (this.shakeTimer > 0) this.shakeTimer--;

        // Coach Command Timeout
        if (this.gameMode === 'coach' && this.coachCommand) {
            const elapsed = now - this.coachCommand.startTime;
            if (elapsed > this.coachCommandDuration) {
                // Command missed, advance to next
                this.combo = 0;
                this.nextCoachCommand();
            }
        }

        // Duel Mode Boss Attack AI
        if (this.gameMode === 'duel') {
            this.updateDuelBoss(now);
        }

        // Natural Opponent Breathing / Movement
        this.opponent.bobPhase += 0.05;
        const bobY = Math.sin(this.opponent.bobPhase) * 8;
        const bobX = Math.cos(this.opponent.bobPhase * 0.4) * 6;

        this.opponent.x = (this.canvas.width / 2) + bobX + (this.opponent.targetX || 0);
        this.opponent.y = (this.canvas.height * 0.45) + bobY + (this.opponent.targetY || 0);

        if (this.opponent.targetX) this.opponent.targetX *= 0.85;
        if (this.opponent.targetY) this.opponent.targetY *= 0.85;
    }

    updateDuelBoss(now) {
        // Trigger incoming attack regularly
        if (this.opponent.state === 'idle' && now > this.opponent.lastAttackTime) {
            this.opponent.state = 'punch_incoming';
            this.opponent.attackStartTime = now;
            this.opponent.attackDuration = this.difficulty === 'hard' ? 1400 : (this.difficulty === 'easy' ? 2200 : 1800);

            const isLeft = Math.random() > 0.5;
            this.opponent.dodgeRequired = isLeft ? 'right' : 'left'; // attack left side, safe is right
            this.opponent.fistScale = 0.5;

            window.soundEngine.playWarning();
            const sideWord = this.opponent.dodgeRequired === 'left' ? "À GAUCHE" : "À DROITE";
            window.coachVoice.speak(`Attention ! Esquive ${sideWord} !`, true);
        }

        // Boss Attack Landing Check
        if (this.opponent.state === 'punch_incoming') {
            const elapsed = now - this.opponent.attackStartTime;
            const progress = Math.min(1, elapsed / this.opponent.attackDuration);
            // Fist scales up directly towards camera!
            this.opponent.fistScale = 0.6 + progress * 2.2;

            if (progress >= 1) {
                // Player hit by boss punch!
                this.handleBossHitPlayer();
            }
        }
    }

    handleBossHitPlayer() {
        this.opponent.state = 'idle';
        this.combo = 0;
        this.shakeTimer = 18; // Heavy screen shake!

        const damage = this.difficulty === 'hard' ? 25 : 18;
        this.playerHp = Math.max(0, this.playerHp - damage);

        window.soundEngine.playDamage();
        this.createFloatingText(`IMPACT DIRECT ! -${damage} HP`, this.canvas.width / 2, this.canvas.height / 2, '#ef4444');

        this.opponent.lastAttackTime = Date.now() + 2600;

        if (this.playerHp <= 0) {
            this.endGame('tko');
        }
    }

    createHitParticles(x, y, color) {
        for (let i = 0; i < 18; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 2 + Math.random() * 6;
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

    render() {
        const ctx = this.ctx;
        if (!ctx) return;
        const w = this.canvas.width;
        const h = this.canvas.height;

        ctx.save();

        // Screen Shake during heavy damage
        if (this.shakeTimer > 0) {
            const sx = (Math.random() - 0.5) * 16;
            const sy = (Math.random() - 0.5) * 16;
            ctx.translate(sx, sy);
        }

        ctx.clearRect(0, 0, w, h);

        // 1. Duel Boss Incoming Attack Overlay
        if (this.gameMode === 'duel' && this.opponent.state === 'punch_incoming') {
            this.renderBossAttackWarning(ctx, w, h);
        }

        // 2. Render Opponent
        this.renderOpponent(ctx);

        // 3. Render Targets / Mitts
        this.renderTargets(ctx);

        // 4. Render Coach Directives Banner
        if (this.gameMode === 'coach' && this.coachCommand) {
            this.renderCoachDirective(ctx, w);
        }

        // 5. Render Giant Incoming Boss Fist (3D punch toward screen)
        if (this.gameMode === 'duel' && this.opponent.state === 'punch_incoming') {
            this.renderIncomingFist(ctx, w, h);
        }

        // 6. Particles & Texts
        this.renderEffects(ctx);

        // 7. HUD
        this.renderHUD(ctx, w, h);

        ctx.restore();
    }

    renderCoachDirective(ctx, w) {
        const cmd = this.coachCommand;
        const now = Date.now();
        const elapsed = now - cmd.startTime;
        const progress = Math.min(1, elapsed / this.coachCommandDuration);

        ctx.save();
        // Central Directive Banner
        ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
        ctx.roundRect(w / 2 - 240, 75, 480, 70, 16);
        ctx.fill();
        ctx.strokeStyle = '#00f2fe';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        ctx.fillStyle = '#f59e0b';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('ORDRE DU COACH EN DIRECT :', w / 2, 95);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 24px "Inter", sans-serif';
        ctx.fillText(cmd.label, w / 2, 126);

        // Reaction Timer Bar
        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.fillRect(w / 2 - 210, 134, 420, 5);
        ctx.fillStyle = progress > 0.7 ? '#ef4444' : '#10b981';
        ctx.fillRect(w / 2 - 210, 134, 420 * (1 - progress), 5);

        ctx.restore();
    }

    renderBossAttackWarning(ctx, w, h) {
        const isLeftDanger = this.opponent.dodgeRequired === 'right';
        const dangerX = isLeftDanger ? 0 : w / 2;
        const safeX = isLeftDanger ? w / 2 : 0;

        // Red danger pulse
        ctx.fillStyle = 'rgba(239, 68, 68, 0.22)';
        ctx.fillRect(dangerX, 0, w / 2, h);

        // Safe green border
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 5;
        ctx.strokeRect(safeX + 10, 10, w / 2 - 20, h - 20);

        // Warning Text
        ctx.save();
        ctx.fillStyle = '#ef4444';
        ctx.font = 'black 28px "Inter", sans-serif';
        ctx.textAlign = 'center';
        const sideFr = this.opponent.dodgeRequired === 'left' ? "← ESQUIVEZ À GAUCHE !" : "ESQUIVEZ À DROITE ! →";
        ctx.fillText(sideFr, w / 2, 90);
        ctx.restore();
    }

    renderIncomingFist(ctx, w, h) {
        // A huge red boxing glove punching straight into the camera!
        const scale = this.opponent.fistScale;
        const fistX = this.opponent.dodgeRequired === 'right' ? w * 0.35 : w * 0.65;
        const fistY = h * 0.5;

        ctx.save();
        ctx.translate(fistX, fistY);
        ctx.scale(scale, scale);

        // Fist Glove
        ctx.fillStyle = '#dc2626';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 4;

        ctx.beginPath();
        ctx.arc(0, 0, 45, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Knuckle highlights
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(-15, -15, 14, 0, Math.PI * 2);
        ctx.arc(15, -15, 14, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    renderOpponent(ctx) {
        const ox = this.opponent.x;
        const oy = this.opponent.y;

        ctx.save();

        // Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.beginPath();
        ctx.ellipse(ox, oy + 210, 120, 28, 0, 0, Math.PI * 2);
        ctx.fill();

        // Stunned indicator (stars circling head)
        if (this.opponent.state === 'stunned') {
            const now = Date.now();
            ctx.fillStyle = '#f59e0b';
            ctx.font = '22px sans-serif';
            for (let i = 0; i < 3; i++) {
                const angle = (now * 0.006) + (i * (Math.PI * 2 / 3));
                const sx = ox + Math.cos(angle) * 65;
                const sy = oy - 90 + Math.sin(angle) * 20;
                ctx.fillText('⭐', sx, sy);
            }
        }

        // Torso
        ctx.fillStyle = '#1e293b';
        ctx.strokeStyle = this.gameMode === 'duel' ? '#ef4444' : '#38bdf8';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.roundRect(ox - 90, oy + 30, 180, 150, 20);
        ctx.fill();
        ctx.stroke();

        // Head
        ctx.fillStyle = this.opponent.state === 'stunned' ? '#ca8a04' : '#334155';
        ctx.beginPath();
        ctx.arc(ox, oy - 40, 55, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Headgear
        ctx.fillStyle = this.gameMode === 'duel' ? '#7f1d1d' : '#dc2626';
        ctx.beginPath();
        ctx.arc(ox, oy - 50, 56, Math.PI * 0.8, Math.PI * 2.2);
        ctx.fill();

        // Eyes
        ctx.fillStyle = this.opponent.state === 'stunned' ? '#f59e0b' : '#38bdf8';
        ctx.beginPath();
        ctx.arc(ox - 18, oy - 42, 6, 0, Math.PI * 2);
        ctx.arc(ox + 18, oy - 42, 6, 0, Math.PI * 2);
        ctx.fill();

        // Opponent Gloves (Guard)
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(ox - 75, oy + 10, 32, 0, Math.PI * 2);
        ctx.arc(ox + 75, oy + 10, 32, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    renderTargets(ctx) {
        const now = Date.now();
        this.targets.forEach(target => {
            if (!target.active) return;

            ctx.save();
            const isHigh = target.isHighlight;
            const pulse = Math.sin(now * 0.01) * (isHigh ? 8 : 4);

            // Highlight glow if requested by coach!
            ctx.strokeStyle = isHigh ? '#f59e0b' : 'rgba(0, 242, 254, 0.85)';
            ctx.lineWidth = isHigh ? 5 : 3;
            if (!isHigh) ctx.setLineDash([6, 6]);

            ctx.beginPath();
            ctx.arc(target.x, target.y, target.radius + pulse, 0, Math.PI * 2);
            ctx.stroke();

            ctx.setLineDash([]);
            ctx.fillStyle = isHigh ? 'rgba(245, 158, 11, 0.35)' : 'rgba(0, 242, 254, 0.2)';
            ctx.beginPath();
            ctx.arc(target.x, target.y, target.radius, 0, Math.PI * 2);
            ctx.fill();

            // Target pointer arrow if highlighted
            if (isHigh) {
                ctx.fillStyle = '#f59e0b';
                ctx.font = 'bold 22px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('👇 FRAPPE ICI !', target.x, target.y - target.radius - 12);
            }

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 11px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(target.label, target.x, target.y + target.radius + 15);
            ctx.restore();
        });
    }

    renderEffects(ctx) {
        // Particles
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

        // Floating texts
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
            ctx.font = 'bold 20px "Inter", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(ft.text, ft.x, ft.y);
            ctx.restore();
        }
    }

    renderHUD(ctx, w, h) {
        ctx.save();

        // Top Opponent Bar
        const hpBarW = Math.min(360, w * 0.7);
        const hpBarH = 18;
        const hpBarX = (w - hpBarW) / 2;
        const hpBarY = 22;

        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.fillRect(hpBarX - 4, hpBarY - 4, hpBarW + 8, hpBarH + 8);

        const oppPercent = Math.max(0, this.opponentHp / this.opponentMaxHp);
        ctx.fillStyle = oppPercent > 0.3 ? '#ef4444' : '#b91c1c';
        ctx.fillRect(hpBarX, hpBarY, hpBarW * oppPercent, hpBarH);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        const title = this.gameMode === 'duel' ? `BOSS : ${Math.round(this.opponentHp)} HP` : `MITAINES CIBLES : ${Math.round(this.opponentHp)} HP`;
        ctx.fillText(title, w / 2, hpBarY + 14);

        // Round Timer
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.roundRect(w - 130, 16, 115, 45, 8);
        ctx.fill();
        ctx.fillStyle = this.timeLeft <= 10 ? '#ef4444' : '#38bdf8';
        ctx.font = 'bold 22px monospace';
        ctx.textAlign = 'center';
        const mins = Math.floor(this.timeLeft / 60);
        const secs = this.timeLeft % 60;
        ctx.fillText(`${mins}:${secs < 10 ? '0' : ''}${secs}`, w - 72, 46);

        // Stats
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.roundRect(15, 16, 170, 60, 8);
        ctx.fill();
        ctx.fillStyle = '#00f2fe';
        ctx.font = 'bold 18px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`COUPS : ${this.punchesCount}`, 25, 40);

        if (this.combo > 1) {
            ctx.fillStyle = '#f59e0b';
            ctx.font = 'bold 14px sans-serif';
            ctx.fillText(`COMBO x${this.combo} !`, 25, 62);
        } else {
            ctx.fillStyle = '#94a3b8';
            ctx.font = '12px sans-serif';
            ctx.fillText(`Score : ${this.score}`, 25, 62);
        }

        // Player HP Bar (Bottom)
        if (this.gameMode === 'duel') {
            const playerHpW = Math.min(300, w * 0.6);
            const playerHpX = (w - playerHpW) / 2;
            const playerHpY = h - 35;

            ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
            ctx.roundRect(playerHpX - 4, playerHpY - 4, playerHpW + 8, 22, 6);
            ctx.fill();

            const playerPercent = Math.max(0, this.playerHp / this.playerMaxHp);
            ctx.fillStyle = playerPercent > 0.4 ? '#10b981' : '#f59e0b';
            ctx.fillRect(playerHpX, playerHpY, playerHpW * playerPercent, 14);

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 11px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`VOTRE VIE : ${Math.round(this.playerHp)}%`, w / 2, playerHpY + 11);
        }

        ctx.restore();
    }

    endGame(reason) {
        this.stop();
        window.soundEngine.playBell();

        let title = "FIN DU ROUND";
        let message = `Vous avez porté ${this.punchesCount} coups !`;

        if (reason === 'ko') {
            title = "VICTOIRE PAR K.O. ! 🥊🏆";
            message = `Adversaire terrassé ! ${this.punchesCount} coups donnés avec un combo max de ${this.maxCombo} !`;
            window.soundEngine.playRecordFanfare();
            window.coachVoice.speak("K.O. ! Victoire écrasante !", true);
        } else if (reason === 'tko') {
            title = "DÉFAITE PAR T.K.O.";
            message = "L'adversaire a percé votre garde. Entraînez-vous aux esquives !";
            window.coachVoice.speak("Match arrêté. Protégez-vous mieux la prochaine fois !", true);
        } else {
            window.coachVoice.speak("Fin du round ! Belle séance d'entraînement !", true);
        }

        if (window.app) {
            window.app.onBoxingSessionComplete({
                punches: this.punchesCount,
                maxCombo: this.maxCombo,
                dodges: this.dodgesCount,
                score: this.score,
                duration: this.roundTime - this.timeLeft,
                title,
                message,
                victory: reason === 'ko',
                mode: this.gameMode
            });
        }
    }
}

window.boxingGame = new BoxingGame();
