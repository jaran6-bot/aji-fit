// Flappy Push-Up Arcade Mini-Game (Vision Powered)
class FlappyPushupsGame {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.isActive = false;

        // Game State
        this.score = 0;
        this.pushupsCount = 0;
        this.lives = 3;
        this.highScore = 0;
        this.isGameOver = false;

        // Bird (Athlete Hero)
        this.bird = {
            x: 120,
            y: 200,
            width: 44,
            height: 38,
            vy: 0,
            gravity: 0.38,
            flapPower: -8.5,
            rotation: 0
        };

        // Obstacles (Pipes & Bonuses)
        this.pipes = [];
        this.coins = [];
        this.particles = [];
        this.spawnTimer = 0;
        this.speed = 2.8;

        // Pushup detection state
        this.lastElbowAngle = 180;
        this.stage = 'up';
        this.minElbowAngleReached = 180;

        this.animFrameId = null;
        this.loadHighScore();
    }

    loadHighScore() {
        try {
            this.highScore = parseInt(localStorage.getItem('apexfit_flappy_record') || '0', 10);
        } catch (e) {}
    }

    saveHighScore() {
        if (this.score > this.highScore) {
            this.highScore = this.score;
            try {
                localStorage.setItem('apexfit_flappy_record', this.highScore.toString());
            } catch (e) {}
        }
    }

    init(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');

        if (window.ResizeObserver && this.canvas.parentElement) {
            const ro = new ResizeObserver(() => this.resize());
            ro.observe(this.canvas.parentElement);
        }
        window.addEventListener('resize', () => this.resize());

        // Click / Touch to flap
        this.canvas.style.pointerEvents = 'auto';
        this.canvas.addEventListener('pointerdown', () => {
            if (this.isGameOver) {
                this.restart();
            } else if (this.isActive) {
                this.flap("Clic");
            }
        });

        // Spacebar to flap
        window.addEventListener('keydown', (e) => {
            if (this.isActive && e.code === 'Space') {
                e.preventDefault();
                if (this.isGameOver) {
                    this.restart();
                } else {
                    this.flap("Espace");
                }
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
        this.resize();
        this.isActive = true;
        this.isGameOver = false;
        this.score = 0;
        this.pushupsCount = 0;
        this.lives = 3;
        this.speed = 2.8;

        this.bird.x = Math.min(140, this.canvas.width * 0.2);
        this.bird.y = this.canvas.height * 0.45;
        this.bird.vy = 0;

        this.pipes = [];
        this.coins = [];
        this.particles = [];
        this.spawnTimer = 60; // first pipe soon

        this.stage = 'up';
        this.minElbowAngleReached = 180;

        window.soundEngine.playBell();
        window.coachVoice.speak("Flappy Pompe lancé ! Faites des pompes pour voler !", true);

        if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
        this.loop();
    }

    stop() {
        this.isActive = false;
        if (this.animFrameId) {
            cancelAnimationFrame(this.animFrameId);
            this.animFrameId = null;
        }
    }

    restart() {
        this.start();
    }

    // Flap action triggered by a completed push-up (or click/space)
    flap(source = 'pushup') {
        if (!this.isActive || this.isGameOver) return;

        this.bird.vy = this.bird.flapPower;
        window.soundEngine.playFlap();

        // Particle feather burst
        this.createFeathers(this.bird.x, this.bird.y);

        if (source === 'pushup') {
            this.pushupsCount++;
            this.score += 5; // Bonus points for a real pushup!
            window.soundEngine.playRepCount(this.pushupsCount);
            this.createFloatingText(`+5 POMPE N°${this.pushupsCount} !`, this.bird.x + 30, this.bird.y - 30, '#10b981');
        }
    }

    // MediaPipe Pose processing
    processPose(landmarks) {
        if (!this.isActive || !landmarks) return;

        const leftConf = ((landmarks[11]?.visibility || 0) + (landmarks[13]?.visibility || 0) + (landmarks[15]?.visibility || 0)) / 3;
        const rightConf = ((landmarks[12]?.visibility || 0) + (landmarks[14]?.visibility || 0) + (landmarks[16]?.visibility || 0)) / 3;

        let shoulder, elbow, wrist;
        if (leftConf >= rightConf) {
            shoulder = landmarks[11];
            elbow = landmarks[13];
            wrist = landmarks[15];
        } else {
            shoulder = landmarks[12];
            elbow = landmarks[14];
            wrist = landmarks[16];
        }

        const elbowAngle = PoseEngine.calculateAngle(shoulder, elbow, wrist);
        this.evaluatePushupForFlap(elbowAngle);
    }

    evaluatePushupForFlap(elbowAngle) {
        if (!elbowAngle || isNaN(elbowAngle)) return;

        if (elbowAngle < this.minElbowAngleReached) {
            this.minElbowAngleReached = elbowAngle;
        }

        // DOWN threshold: <= 95 deg
        // UP threshold: >= 150 deg
        if (elbowAngle <= 95) {
            if (this.stage === 'up' || this.stage === 'going_down') {
                this.stage = 'down';
                // Slight upward hover encouragement while down
                this.bird.vy = Math.min(this.bird.vy, -1.5);
            }
        } else if (elbowAngle >= 150) {
            if (this.stage === 'down') {
                // SUCCESSFUL PUSH-UP COMPLETED -> BIG FLAP BOOST!
                this.stage = 'up';
                this.minElbowAngleReached = 180;
                this.flap('pushup');
            } else {
                this.stage = 'up';
            }
        } else if (elbowAngle < 140 && this.stage === 'up') {
            this.stage = 'going_down';
        }
    }

    loop() {
        if (!this.isActive) return;

        this.update();
        this.render();

        this.animFrameId = requestAnimationFrame(() => this.loop());
    }

    update() {
        if (this.isGameOver) return;

        const h = this.canvas.height;
        const w = this.canvas.width;

        // Bird Physics
        this.bird.vy += this.bird.gravity;
        this.bird.y += this.bird.vy;

        // Clamp to ceiling and floor
        if (this.bird.y < 20) {
            this.bird.y = 20;
            this.bird.vy = 0;
        }

        const floorY = h - 60;
        if (this.bird.y + this.bird.height / 2 >= floorY) {
            this.bird.y = floorY - this.bird.height / 2;
            this.handleHitObstacle();
        }

        // Spawn Pipes
        this.spawnTimer--;
        if (this.spawnTimer <= 0) {
            this.spawnPipe();
            this.spawnTimer = Math.max(90, 150 - Math.floor(this.score * 1.5));
        }

        // Update Pipes
        const gap = Math.max(140, 190 - Math.min(this.score * 1.5, 40));
        for (let i = this.pipes.length - 1; i >= 0; i--) {
            const pipe = this.pipes[i];
            pipe.x -= this.speed;

            // Check if passed for score
            if (!pipe.passed && pipe.x + pipe.width < this.bird.x) {
                pipe.passed = true;
                this.score++;
                window.soundEngine.playCoin();
                this.saveHighScore();
            }

            // Collision check
            if (this.checkCollision(this.bird, pipe, gap)) {
                this.handleHitObstacle();
                this.pipes.splice(i, 1);
                continue;
            }

            // Remove off-screen pipes
            if (pipe.x + pipe.width < -20) {
                this.pipes.splice(i, 1);
            }
        }

        // Update Coins / Dumbbells
        for (let i = this.coins.length - 1; i >= 0; i--) {
            const coin = this.coins[i];
            coin.x -= this.speed;

            const dist = Math.hypot((this.bird.x) - coin.x, (this.bird.y) - coin.y);
            if (dist < 35) {
                this.score += 3;
                window.soundEngine.playCoin();
                this.createFloatingText('+3', coin.x, coin.y, '#f59e0b');
                this.coins.splice(i, 1);
                continue;
            }

            if (coin.x < -20) {
                this.coins.splice(i, 1);
            }
        }

        // Slightly increase speed as score goes up
        this.speed = 2.8 + Math.min(this.score * 0.04, 2.5);
    }

    spawnPipe() {
        const h = this.canvas.height;
        const w = this.canvas.width;
        const gap = Math.max(145, 190 - Math.min(this.score * 1.5, 40));
        const minTop = 60;
        const maxTop = h - gap - 120;
        const topHeight = minTop + Math.random() * (maxTop - minTop);

        this.pipes.push({
            x: w + 20,
            topHeight: topHeight,
            bottomY: topHeight + gap,
            width: 65,
            passed: false
        });

        // 40% chance of golden dumbbell inside the gap
        if (Math.random() < 0.45) {
            this.coins.push({
                x: w + 20 + 32,
                y: topHeight + gap / 2,
                radius: 14
            });
        }
    }

    checkCollision(bird, pipe, gap) {
        const bx = bird.x - bird.width / 2;
        const by = bird.y - bird.height / 2;
        const bw = bird.width;
        const bh = bird.height;

        // In horizontal range of pipe
        if (bx + bw > pipe.x && bx < pipe.x + pipe.width) {
            // In vertical range of top pipe or bottom pipe
            if (by < pipe.topHeight || by + bh > pipe.bottomY) {
                return true;
            }
        }
        return false;
    }

    handleHitObstacle() {
        this.lives--;
        window.soundEngine.playDamage();
        this.createHitSparks(this.bird.x, this.bird.y);

        if (this.lives <= 0) {
            this.gameOver();
        } else {
            this.bird.vy = -6; // small bounce back
            this.createFloatingText(`-1 VIE ! (${this.lives} restantes)`, this.bird.x, this.bird.y - 40, '#ef4444');
        }
    }

    createFeathers(x, y) {
        for (let i = 0; i < 6; i++) {
            this.particles.push({
                x, y,
                vx: (Math.random() - 0.5) * 3,
                vy: (Math.random() - 0.5) * 3 + 1,
                radius: 3 + Math.random() * 3,
                alpha: 1,
                color: '#38bdf8'
            });
        }
    }

    createHitSparks(x, y) {
        for (let i = 0; i < 15; i++) {
            this.particles.push({
                x, y,
                vx: (Math.random() - 0.5) * 8,
                vy: (Math.random() - 0.5) * 8,
                radius: 4 + Math.random() * 3,
                alpha: 1,
                color: '#ef4444'
            });
        }
    }

    createFloatingText(text, x, y, color) {
        this.particles.push({
            isText: true,
            text, x, y,
            vy: -1.6,
            alpha: 1,
            color
        });
    }

    gameOver() {
        this.isGameOver = true;
        this.saveHighScore();
        window.soundEngine.playGameOver();
        window.coachVoice.speak(`Partie terminée ! Score : ${this.score}. Vous avez fait ${this.pushupsCount} pompes !`, true);

        // Record session to history
        if (window.app && this.pushupsCount > 0) {
            window.app.onFlappySessionComplete({
                score: this.score,
                pushups: this.pushupsCount
            });
        }
    }

    render() {
        const ctx = this.ctx;
        if (!ctx) return;
        const w = this.canvas.width;
        const h = this.canvas.height;

        ctx.clearRect(0, 0, w, h);

        // 1. Retro Gym/Sky Background
        this.renderBackground(ctx, w, h);

        // 2. Render Pipes (Gym Dumbbell Pillars)
        this.renderPipes(ctx, h);

        // 3. Render Collectible Coins
        this.renderCoins(ctx);

        // 4. Render Flappy Hero Bird
        this.renderBird(ctx);

        // 5. Render Floor
        this.renderFloor(ctx, w, h);

        // 6. Render Particles
        this.renderParticles(ctx);

        // 7. Render HUD (Score, Pompes validées, Vies)
        this.renderHUD(ctx, w);

        // 8. Render Game Over Screen if finished
        if (this.isGameOver) {
            this.renderGameOver(ctx, w, h);
        }
    }

    renderBackground(ctx, w, h) {
        // Gradient sky
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, '#0c1a30');
        grad.addColorStop(0.7, '#1e293b');
        grad.addColorStop(1, '#0f172a');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        // Distant athletic silhouette city / stadium lights
        ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
        for (let i = 0; i < 8; i++) {
            ctx.beginPath();
            ctx.arc((i * 140 + 40) % w, h * 0.25, 40, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    renderPipes(ctx, h) {
        this.pipes.forEach(pipe => {
            ctx.save();

            // Top Pipe
            const topGrad = ctx.createLinearGradient(pipe.x, 0, pipe.x + pipe.width, 0);
            topGrad.addColorStop(0, '#10b981');
            topGrad.addColorStop(0.5, '#34d399');
            topGrad.addColorStop(1, '#059669');

            ctx.fillStyle = topGrad;
            ctx.strokeStyle = '#065f46';
            ctx.lineWidth = 3;

            // Top pipe body
            ctx.fillRect(pipe.x, 0, pipe.width, pipe.topHeight);
            ctx.strokeRect(pipe.x, -2, pipe.width, pipe.topHeight + 2);

            // Top pipe rim
            ctx.fillRect(pipe.x - 4, pipe.topHeight - 22, pipe.width + 8, 22);
            ctx.strokeRect(pipe.x - 4, pipe.topHeight - 22, pipe.width + 8, 22);

            // Bottom Pipe body
            const bottomHeight = h - pipe.bottomY;
            ctx.fillRect(pipe.x, pipe.bottomY, pipe.width, bottomHeight);
            ctx.strokeRect(pipe.x, pipe.bottomY, pipe.width, bottomHeight + 2);

            // Bottom pipe rim
            ctx.fillRect(pipe.x - 4, pipe.bottomY, pipe.width + 8, 22);
            ctx.strokeRect(pipe.x - 4, pipe.bottomY, pipe.width + 8, 22);

            ctx.restore();
        });
    }

    renderCoins(ctx) {
        const now = Date.now();
        this.coins.forEach(coin => {
            ctx.save();
            const bounce = Math.sin(now * 0.008) * 4;
            ctx.fillStyle = '#fbbf24';
            ctx.strokeStyle = '#d97706';
            ctx.lineWidth = 3;

            ctx.beginPath();
            ctx.arc(coin.x, coin.y + bounce, coin.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // Dumbbell icon in center
            ctx.fillStyle = '#78350f';
            ctx.font = 'bold 12px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('🏋️', coin.x, coin.y + bounce);
            ctx.restore();
        });
    }

    renderBird(ctx) {
        const b = this.bird;
        ctx.save();
        ctx.translate(b.x, b.y);

        // Rotation according to velocity
        const rot = Math.min(Math.PI / 4, Math.max(-Math.PI / 4, b.vy * 0.08));
        ctx.rotate(rot);

        // Bird Body (Athlete Cyan / Gold)
        ctx.fillStyle = '#00f2fe';
        ctx.strokeStyle = '#0284c7';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(0, 0, 22, 17, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Boxer Headband (Red)
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(-18, -14, 34, 6);

        // Eye
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(10, -5, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(12, -5, 3, 0, Math.PI * 2);
        ctx.fill();

        // Beak
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.moveTo(18, -2);
        ctx.lineTo(28, 2);
        ctx.lineTo(18, 6);
        ctx.closePath();
        ctx.fill();

        // Wing (flaps when jumping)
        const wingY = b.vy < 0 ? -10 : 2;
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.ellipse(-6, wingY, 11, 7, b.vy * 0.05, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    renderFloor(ctx, w, h) {
        ctx.save();
        const floorY = h - 60;
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(0, floorY, w, 60);

        // Striped gym border
        ctx.fillStyle = '#00f2fe';
        ctx.fillRect(0, floorY, w, 5);

        ctx.fillStyle = '#94a3b8';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('⚡ 1 POMPE RÉALISÉE = 1 BATTEMENT PUISSANT (+5 PTS) ⚡', w / 2, floorY + 35);
        ctx.restore();
    }

    renderParticles(ctx) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx || 0;
            p.y += p.vy || 0;
            p.alpha -= 0.025;

            if (p.alpha <= 0) {
                this.particles.splice(i, 1);
                continue;
            }

            ctx.save();
            ctx.globalAlpha = p.alpha;
            if (p.isText) {
                ctx.fillStyle = p.color;
                ctx.font = 'bold 18px "Inter", sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(p.text, p.x, p.y);
            } else {
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }
    }

    renderHUD(ctx, w) {
        ctx.save();

        // Score (Top Center)
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.roundRect(w / 2 - 90, 16, 180, 55, 12);
        ctx.fill();
        ctx.strokeStyle = '#00f2fe';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 32px "Inter", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${this.score}`, w / 2, 54);

        // Pompes counter (Top Left)
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.roundRect(20, 16, 170, 55, 12);
        ctx.fill();
        ctx.fillStyle = '#10b981';
        ctx.font = 'bold 18px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`🏋️ POMPES : ${this.pushupsCount}`, 32, 50);

        // Lives & Highscore (Top Right)
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.roundRect(w - 180, 16, 160, 55, 12);
        ctx.fill();
        ctx.fillStyle = '#ef4444';
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'left';
        const hearts = "❤️".repeat(Math.max(0, this.lives));
        ctx.fillText(`Vies : ${hearts}`, w - 165, 38);
        ctx.fillStyle = '#f59e0b';
        ctx.font = 'bold 11px sans-serif';
        ctx.fillText(`Record : ${this.highScore} pts`, w - 165, 58);

        ctx.restore();
    }

    renderGameOver(ctx, w, h) {
        ctx.save();
        ctx.fillStyle = 'rgba(7, 11, 19, 0.85)';
        ctx.fillRect(0, 0, w, h);

        ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
        ctx.roundRect(w / 2 - 190, h / 2 - 140, 380, 280, 20);
        ctx.fill();
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.fillStyle = '#ef4444';
        ctx.font = 'black 34px "Inter", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('GAME OVER !', w / 2, h / 2 - 80);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 20px sans-serif';
        ctx.fillText(`Score Final : ${this.score}`, w / 2, h / 2 - 35);

        ctx.fillStyle = '#10b981';
        ctx.font = 'bold 18px sans-serif';
        ctx.fillText(`Pompes effectuées : ${this.pushupsCount} 🏋️`, w / 2, h / 2);

        ctx.fillStyle = '#f59e0b';
        ctx.font = '14px sans-serif';
        ctx.fillText(`Meilleur score : ${this.highScore} pts`, w / 2, h / 2 + 30);

        // Play Again Button
        ctx.fillStyle = '#00f2fe';
        ctx.roundRect(w / 2 - 130, h / 2 + 60, 260, 48, 12);
        ctx.fill();

        ctx.fillStyle = '#070b13';
        ctx.font = 'bold 16px sans-serif';
        ctx.fillText('REJOUER (Clic ou Espace)', w / 2, h / 2 + 90);

        ctx.restore();
    }
}

window.flappyPushupsGame = new FlappyPushupsGame();
