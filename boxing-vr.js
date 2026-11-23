// 3D VR Boxing Simulator Engine (Manny Boxing VR Style) - 3 Min Rounds & Recovery
class BoxingVRGame {
    constructor() {
        this.container = null;
        this.canvas = null;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.isActive = false;

        // Match Structure: 3-Minute Rounds (180s) + 60s Recovery
        this.difficulty = 'normal';
        this.roundDuration = 180; // 3 minutes
        this.timeLeft = 180;
        this.currentRound = 1;
        this.maxRounds = 3;
        this.isInRecovery = false;
        this.recoveryTimeLeft = 60;
        this.timerInterval = null;

        // Stats
        this.punchesCount = 0;
        this.roundPunches = 0;
        this.dodgesCount = 0;
        this.roundDodges = 0;
        this.combo = 0;
        this.maxCombo = 0;
        this.score = 0;

        // Realistic Opponent HP (takes 60-80 solid punches to drop)
        this.opponentMaxHp = 750;
        this.opponentHp = 750;
        this.playerMaxHp = 100;
        this.playerHp = 100;

        // 3D Objects
        this.ringGroup = null;
        this.opponentGroup = null;
        this.playerGloves = { left: null, right: null };
        this.opponentParts = {};

        // Opponent Animation State
        this.opponentAnim = {
            state: 'idle', // idle, attacking, hurt, ko
            phase: 0,
            attackTimer: 0,
            attackCooldown: 3000,
            lastAttackTime: Date.now() + 2500,
            attackType: 'left_jab',
            dodgeRequired: 'none',
            hurtTimer: 0
        };

        // Tracking history
        this.prevLWrist = null;
        this.prevRWrist = null;
        this.lastHitTime = 0;

        this.animFrameId = null;
        this.clock = null;
    }

    async init(container) {
        this.container = container;
        if (!window.THREE) {
            await this.loadThreeJS();
        }

        this.clock = new THREE.Clock();
        this.setupScene();
        this.buildBoxingRing();
        this.buildOpponent();
        this.buildPlayerGloves();

        window.addEventListener('resize', () => this.resize());
        if (window.ResizeObserver && this.container) {
            const ro = new ResizeObserver(() => this.resize());
            ro.observe(this.container);
        }

        // Mouse click to punch
        this.container.addEventListener('pointerdown', (e) => {
            if (!this.isActive || this.isInRecovery) return;
            const rect = this.container.getBoundingClientRect();
            const clickX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            const isRightHand = clickX > 0;
            this.triggerPlayerPunch(isRightHand ? 'right' : 'left');
        });

        // Space, F, J to punch
        window.addEventListener('keydown', (e) => {
            if (!this.isActive || this.isInRecovery) return;
            if (e.code === 'KeyF' || e.code === 'KeyA') {
                this.triggerPlayerPunch('left');
            } else if (e.code === 'KeyJ' || e.code === 'KeyD' || e.code === 'Space') {
                this.triggerPlayerPunch('right');
            }
        });

        // Skip recovery button
        const skipBtn = document.getElementById('vr-skip-rest-btn');
        if (skipBtn) {
            skipBtn.addEventListener('click', () => {
                this.endRecovery();
            });
        }
    }

    loadThreeJS() {
        return new Promise((resolve, reject) => {
            if (window.THREE) return resolve();
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js';
            script.crossOrigin = 'anonymous';
            script.onload = () => resolve();
            script.onerror = () => reject(new Error("Impossible de charger Three.js"));
            document.head.appendChild(script);
        });
    }

    setupScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x070b13);
        this.scene.fog = new THREE.FogExp2(0x070b13, 0.035);

        const w = this.container.clientWidth || 800;
        const h = this.container.clientHeight || 500;

        // Caméra légèrement reculée (z=2.2 au lieu de 1.8) et plus haute (y=1.65)
        this.camera = new THREE.PerspectiveCamera(70, w / h, 0.1, 100);
        this.camera.position.set(0, 1.62, 2.1);

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
        this.renderer.setSize(w, h);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;

        const oldCanvas = this.container.querySelector('canvas.three-canvas');
        if (oldCanvas) oldCanvas.remove();
        this.renderer.domElement.className = 'three-canvas w-full h-full object-cover';
        this.container.appendChild(this.renderer.domElement);

        // Lumière ambiante plus forte pour voir l'adversaire clairement
        const ambientLight = new THREE.AmbientLight(0xffffff, 1.1);
        this.scene.add(ambientLight);

        // Spot principal au-dessus du ring
        const mainSpot = new THREE.SpotLight(0xffffff, 2.8);
        mainSpot.position.set(0, 7, 1);
        mainSpot.angle = Math.PI / 2.5;
        mainSpot.penumbra = 0.4;
        mainSpot.target.position.set(0, 0, -0.5);
        this.scene.add(mainSpot);
        this.scene.add(mainSpot.target);

        // Éclairage face à l'adversaire (frontal fort)
        const frontFill = new THREE.DirectionalLight(0xffffff, 1.2);
        frontFill.position.set(0, 2, 3);
        this.scene.add(frontFill);

        const blueRim = new THREE.DirectionalLight(0x60a5fa, 1.2);
        blueRim.position.set(-3, 4, -1);
        this.scene.add(blueRim);

        const redRim = new THREE.DirectionalLight(0xf87171, 1.0);
        redRim.position.set(3, 4, 1);
        this.scene.add(redRim);
    }

    buildBoxingRing() {
        this.ringGroup = new THREE.Group();

        // 1. Blue Canvas Ring Floor
        const floorGeo = new THREE.PlaneGeometry(8, 8);
        const floorMat = new THREE.MeshStandardMaterial({
            color: 0x1d4ed8,
            roughness: 0.65,
            metalness: 0.1
        });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        this.ringGroup.add(floor);

        const apronGeo = new THREE.BoxGeometry(8.6, 0.4, 8.6);
        const apronMat = new THREE.MeshStandardMaterial({ color: 0x0f172a });
        const apron = new THREE.Mesh(apronGeo, apronMat);
        apron.position.y = -0.22;
        this.ringGroup.add(apron);

        // 2. Corner Posts & Pads
        const postGeo = new THREE.CylinderGeometry(0.08, 0.08, 2.4, 16);
        const redMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.3 });
        const blueMat = new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.3 });
        const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.4 });

        // Red padded corner protector (Left)
        const postFL = new THREE.Mesh(postGeo, redMat);
        postFL.position.set(-3.2, 1.2, 3.2);
        this.ringGroup.add(postFL);

        const padFL = new THREE.Mesh(new THREE.BoxGeometry(0.35, 1.8, 0.35), redMat);
        padFL.position.set(-3.2, 1.2, 3.2);
        this.ringGroup.add(padFL);

        const postFR = new THREE.Mesh(postGeo, blueMat);
        postFR.position.set(3.2, 1.2, 3.2);
        this.ringGroup.add(postFR);

        const postBL = new THREE.Mesh(postGeo, whiteMat);
        postBL.position.set(-3.2, 1.2, -3.2);
        this.ringGroup.add(postBL);

        const postBR = new THREE.Mesh(postGeo, blueMat);
        postBR.position.set(3.2, 1.2, -3.2);
        this.ringGroup.add(postBR);

        // 3. Ring Ropes
        const ropeHeights = [0.6, 1.0, 1.4, 1.8];
        ropeHeights.forEach((ry, idx) => {
            const ropeColor = idx === 0 ? 0xdc2626 : (idx === 3 ? 0x2563eb : 0xffffff);
            const rMat = new THREE.MeshStandardMaterial({ color: ropeColor, roughness: 0.5 });

            const rLeft = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 6.4), rMat);
            rLeft.rotation.x = Math.PI / 2;
            rLeft.position.set(-3.2, ry, 0);
            this.ringGroup.add(rLeft);

            const rRight = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 6.4), rMat);
            rRight.rotation.x = Math.PI / 2;
            rRight.position.set(3.2, ry, 0);
            this.ringGroup.add(rRight);

            const rBack = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 6.4), rMat);
            rBack.rotation.z = Math.PI / 2;
            rBack.position.set(0, ry, -3.2);
            this.ringGroup.add(rBack);
        });

        // 4. Stadium Trusses
        const trussMat = new THREE.MeshBasicMaterial({ color: 0x334155, wireframe: true });
        const trussBack = new THREE.Mesh(new THREE.BoxGeometry(16, 5, 1), trussMat);
        trussBack.position.set(0, 4.5, -6);
        this.ringGroup.add(trussBack);

        this.scene.add(this.ringGroup);
    }

    buildOpponent() {
        this.opponentGroup = new THREE.Group();
        // Repositionné encore plus près — Z=-0.35 au lieu de -0.45
        this.opponentGroup.position.set(0, 0, -0.35);

        // Matériaux — adversaire plus coloré et lisible
        const skinMat    = new THREE.MeshStandardMaterial({ color: 0xd4956a, roughness: 0.5, metalness: 0.0 });
        const shortsMat  = new THREE.MeshStandardMaterial({ color: 0x1e40af, roughness: 0.4 });
        const waistMat   = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });
        const helmetMat  = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.3, metalness: 0.15 });
        const gloveMat   = new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.2, metalness: 0.1 });
        const shirtMat   = new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.6 });

        this.opponentParts.materials = [skinMat, shortsMat, helmetMat, gloveMat, shirtMat];

        // ═══════════════════════════════════════════════
        // HEAD + CASQUE BLEU — plus gros (0.20 de rayon)
        // ═══════════════════════════════════════════════
        const headGroup = new THREE.Group();
        headGroup.position.set(0, 1.75, 0);

        const face = new THREE.Mesh(new THREE.SphereGeometry(0.20, 20, 20), skinMat);
        face.scale.set(1, 1.1, 1);
        headGroup.add(face);

        // Casque plein sauf la face
        const helmetTop = new THREE.Mesh(new THREE.SphereGeometry(0.225, 20, 20, 0, Math.PI * 2, 0, Math.PI * 0.65), helmetMat);
        headGroup.add(helmetTop);

        // Joue-pads gauche/droite
        const padGeo = new THREE.BoxGeometry(0.07, 0.17, 0.12);
        const padL = new THREE.Mesh(padGeo, helmetMat);
        padL.position.set(-0.19, -0.04, 0.05);
        headGroup.add(padL);
        const padR = new THREE.Mesh(padGeo, helmetMat);
        padR.position.set(0.19, -0.04, 0.05);
        headGroup.add(padR);

        // Menton / chin-guard
        const chin = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.07, 0.10), helmetMat);
        chin.position.set(0, -0.19, 0.05);
        headGroup.add(chin);

        // Yeux (petites sphères blanches)
        const eyeGeo = new THREE.SphereGeometry(0.03, 8, 8);
        const eyeMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
        const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
        eyeL.position.set(-0.075, 0.02, 0.19);
        headGroup.add(eyeL);
        const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
        eyeR.position.set(0.075, 0.02, 0.19);
        headGroup.add(eyeR);

        this.opponentParts.head = headGroup;
        this.opponentGroup.add(headGroup);

        // ═══════════════════════════════════════════════
        // NECK
        // ═══════════════════════════════════════════════
        const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.14, 12), skinMat);
        neck.position.set(0, 1.58, 0);
        this.opponentGroup.add(neck);

        // ═══════════════════════════════════════════════
        // TORSO — plus large (0.32 rayon haut)
        // ═══════════════════════════════════════════════
        const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.30, 0.22, 0.75, 20), shirtMat);
        torso.position.set(0, 1.14, 0);
        this.opponentParts.torso = torso;
        this.opponentGroup.add(torso);

        // Abs lignes (2 bandes décoratives)
        const bandGeo = new THREE.BoxGeometry(0.52, 0.03, 0.08);
        const bandMat = new THREE.MeshStandardMaterial({ color: 0xe2d5b0, roughness: 0.8 });
        [1.22, 1.08, 0.94].forEach(y => {
            const band = new THREE.Mesh(bandGeo, bandMat);
            band.position.set(0, y, 0.21);
            this.opponentGroup.add(band);
        });

        // ═══════════════════════════════════════════════
        // SHORTS
        // ═══════════════════════════════════════════════
        const waistband = new THREE.Mesh(new THREE.CylinderGeometry(0.225, 0.225, 0.10, 16), waistMat);
        waistband.position.set(0, 0.78, 0);
        this.opponentGroup.add(waistband);

        const shorts = new THREE.Mesh(new THREE.CylinderGeometry(0.235, 0.29, 0.52, 16), shortsMat);
        shorts.position.set(0, 0.52, 0);
        this.opponentGroup.add(shorts);

        // Lignes latérales shorts
        const stripeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 });
        const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.50, 0.08), stripeMat);
        stripe.position.set(-0.23, 0.52, 0);
        this.opponentGroup.add(stripe);
        const stripeR = stripe.clone();
        stripeR.position.set(0.23, 0.52, 0);
        this.opponentGroup.add(stripeR);

        // ═══════════════════════════════════════════════
        // LEGS
        // ═══════════════════════════════════════════════
        const legMat = skinMat;
        const legL = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.075, 0.68, 12), legMat);
        legL.position.set(-0.13, 0.00, 0);
        this.opponentGroup.add(legL);

        const legR = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.075, 0.68, 12), legMat);
        legR.position.set(0.13, 0.00, 0);
        this.opponentGroup.add(legR);

        // Chaussures
        const shoeGeo = new THREE.BoxGeometry(0.14, 0.09, 0.26);
        const shoeMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });
        const shoeL = new THREE.Mesh(shoeGeo, shoeMat);
        shoeL.position.set(-0.13, -0.37, 0.04);
        this.opponentGroup.add(shoeL);
        const shoeR = new THREE.Mesh(shoeGeo, shoeMat);
        shoeR.position.set(0.13, -0.37, 0.04);
        this.opponentGroup.add(shoeR);

        // ═══════════════════════════════════════════════
        // ARMS & BLUE GLOVES — en garde haute
        // ═══════════════════════════════════════════════
        const armGeo = new THREE.CylinderGeometry(0.07, 0.065, 0.42, 12);

        // Bras gauche de l'adversaire (à droite côté joueur)
        const armLGroup = new THREE.Group();
        armLGroup.position.set(-0.35, 1.52, 0);
        const armL = new THREE.Mesh(armGeo, skinMat);
        armL.rotation.z = Math.PI / 3.5;
        armLGroup.add(armL);

        // Avant-bras gauche
        const forearmL = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.055, 0.36, 12), skinMat);
        forearmL.rotation.z = Math.PI / 2.5;
        forearmL.position.set(0.18, -0.08, 0.14);
        armLGroup.add(forearmL);

        // Gant gauche — plus gros (0.16 rayon)
        const gloveL = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 16), gloveMat);
        gloveL.scale.set(1.1, 1.0, 1.4);
        gloveL.position.set(0.33, -0.14, 0.38);
        armLGroup.add(gloveL);
        // Poignet gant
        const wristL = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.08, 0.10, 12), waistMat);
        wristL.rotation.x = Math.PI / 2;
        wristL.position.set(0.33, -0.14, 0.26);
        armLGroup.add(wristL);

        this.opponentParts.armL = armLGroup;
        this.opponentParts.gloveL = gloveL;
        this.opponentGroup.add(armLGroup);

        // Bras droit de l'adversaire
        const armRGroup = new THREE.Group();
        armRGroup.position.set(0.35, 1.52, 0);
        const armR = new THREE.Mesh(armGeo, skinMat);
        armR.rotation.z = -Math.PI / 3.5;
        armRGroup.add(armR);

        const forearmR = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.055, 0.36, 12), skinMat);
        forearmR.rotation.z = -Math.PI / 2.5;
        forearmR.position.set(-0.18, -0.08, 0.14);
        armRGroup.add(forearmR);

        const gloveR = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 16), gloveMat);
        gloveR.scale.set(1.1, 1.0, 1.4);
        gloveR.position.set(-0.33, -0.14, 0.38);
        armRGroup.add(gloveR);
        const wristR = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.08, 0.10, 12), waistMat);
        wristR.rotation.x = Math.PI / 2;
        wristR.position.set(-0.33, -0.14, 0.26);
        armRGroup.add(wristR);

        this.opponentParts.armR = armRGroup;
        this.opponentParts.gloveR = gloveR;
        this.opponentGroup.add(armRGroup);

        // Label flottant nom adversaire
        this.scene.add(this.opponentGroup);
    }

    buildPlayerGloves() {
        // Red Gloves in First Person POV — plus grands et mieux centrés
        const redGloveMat = new THREE.MeshStandardMaterial({
            color: 0xef4444,
            roughness: 0.25,
            metalness: 0.08
        });
        const cuffMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });
        const ajiLogoMat = new THREE.MeshStandardMaterial({ color: 0x000000, roughness: 0.8 });

        // Gant gauche (plus gros: rayon 0.22)
        const pGloveLGroup = new THREE.Group();
        const mainL = new THREE.Mesh(new THREE.SphereGeometry(0.22, 20, 20), redGloveMat);
        mainL.scale.set(1.1, 1.0, 1.5);
        pGloveLGroup.add(mainL);

        const cuffL = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.15, 0.16, 16), cuffMat);
        cuffL.rotation.x = Math.PI / 2;
        cuffL.position.set(0, 0, 0.21);
        pGloveLGroup.add(cuffL);

        // Marque "Aji" sur le gant
        const logoL = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.05), ajiLogoMat);
        logoL.position.set(0, 0.05, -0.33);
        logoL.rotation.x = Math.PI;
        pGloveLGroup.add(logoL);

        pGloveLGroup.position.set(-0.42, 1.08, 1.0);
        pGloveLGroup.rotation.x = -0.15;
        this.playerGloves.left = pGloveLGroup;
        this.scene.add(pGloveLGroup);

        // Gant droit
        const pGloveRGroup = new THREE.Group();
        const mainR = new THREE.Mesh(new THREE.SphereGeometry(0.22, 20, 20), redGloveMat);
        mainR.scale.set(1.1, 1.0, 1.5);
        pGloveRGroup.add(mainR);

        const cuffR = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.15, 0.16, 16), cuffMat);
        cuffR.rotation.x = Math.PI / 2;
        cuffR.position.set(0, 0, 0.21);
        pGloveRGroup.add(cuffR);

        const logoR = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.05), ajiLogoMat);
        logoR.position.set(0, 0.05, -0.33);
        logoR.rotation.x = Math.PI;
        pGloveRGroup.add(logoR);

        pGloveRGroup.position.set(0.42, 1.08, 1.0);
        pGloveRGroup.rotation.x = -0.15;
        this.playerGloves.right = pGloveRGroup;
        this.scene.add(pGloveRGroup);
    }

    resize() {
        if (!this.container || !this.renderer || !this.camera) return;
        const w = this.container.clientWidth || 800;
        const h = this.container.clientHeight || 500;
        if (w > 50 && h > 50) {
            this.camera.aspect = w / h;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(w, h);
        }
    }

    start(difficulty = 'normal') {
        this.difficulty = difficulty;
        this.isActive = true;
        this.currentRound = 1;
        this.isInRecovery = false;
        this.punchesCount = 0;
        this.roundPunches = 0;
        this.dodgesCount = 0;
        this.roundDodges = 0;
        this.combo = 0;
        this.maxCombo = 0;
        this.score = 0;

        // Long Health Bar (Tough Opponent: 750 HP on normal, 1100 on hard)
        const hpMap = { easy: 500, normal: 750, hard: 1100 };
        this.opponentMaxHp = hpMap[difficulty] || 750;
        this.opponentHp = this.opponentMaxHp;
        this.playerHp = this.playerMaxHp;

        // 3-Minute Round (180s)
        this.roundDuration = 180;
        this.timeLeft = this.roundDuration;

        this.opponentAnim.state = 'idle';
        this.opponentAnim.lastAttackTime = Date.now() + 3000;

        const recoveryModal = document.getElementById('vr-recovery-overlay');
        if (recoveryModal) recoveryModal.classList.add('hidden');

        this.updateHUD();
        window.soundEngine.playBell();
        window.coachVoice.speak("Round 1 ! 3 minutes de combat, donnez tout !", true);

        clearInterval(this.timerInterval);
        this.timerInterval = setInterval(() => {
            if (!this.isActive) return;

            if (this.isInRecovery) {
                // Recovery countdown
                this.recoveryTimeLeft--;
                const restEl = document.getElementById('vr-rest-timer');
                if (restEl) restEl.textContent = `${this.recoveryTimeLeft}s`;

                if (this.recoveryTimeLeft <= 0) {
                    this.endRecovery();
                }
            } else {
                // Active round countdown
                this.timeLeft--;
                this.updateHUD();

                if (this.timeLeft <= 0) {
                    this.onRoundFinished();
                }
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

    // --- RECOVERY PHASE BETWEEN ROUNDS ---
    onRoundFinished() {
        window.soundEngine.playBell();

        if (this.currentRound >= this.maxRounds) {
            // Fight completed after 3 full rounds! Decide on points
            this.endGame('points');
            return;
        }

        // Enter 60s Recovery Rest
        this.isInRecovery = true;
        this.recoveryTimeLeft = 60;

        // Player recovers 30 HP
        this.playerHp = Math.min(this.playerMaxHp, this.playerHp + 30);
        this.updateHUD();

        // Update Recovery Overlay Stats
        const punchesEl = document.getElementById('vr-round-punches');
        if (punchesEl) punchesEl.textContent = this.roundPunches;

        const dodgesEl = document.getElementById('vr-round-dodges');
        if (dodgesEl) dodgesEl.textContent = this.roundDodges;

        const restEl = document.getElementById('vr-rest-timer');
        if (restEl) restEl.textContent = '60s';

        const recoveryModal = document.getElementById('vr-recovery-overlay');
        if (recoveryModal) recoveryModal.classList.remove('hidden');

        window.coachVoice.speak(`Fin du round ${this.currentRound} ! Reprenez votre souffle, hydratez-vous.`, true);
    }

    endRecovery() {
        this.isInRecovery = false;
        this.currentRound++;
        this.roundPunches = 0;
        this.roundDodges = 0;
        this.timeLeft = this.roundDuration; // Reset to 3 minutes!

        const recoveryModal = document.getElementById('vr-recovery-overlay');
        if (recoveryModal) recoveryModal.classList.add('hidden');

        this.updateHUD();
        window.soundEngine.playBell();
        window.coachVoice.speak(`Round ${this.currentRound} ! C'est reparti, en garde !`, true);
    }

    // MediaPipe Pose processing
    processPose(landmarks) {
        if (!this.isActive || this.isInRecovery || !landmarks) return;

        const nose = landmarks[0];
        const lWrist = landmarks[15];
        const rWrist = landmarks[16];

        if (nose) {
            const headX = (0.5 - nose.x) * 1.8;
            this.camera.position.x = THREE.MathUtils.lerp(this.camera.position.x, headX * 0.4, 0.15);

            if (this.opponentAnim.state === 'attacking') {
                this.checkDodge(headX);
            }
        }

        if (lWrist && this.playerGloves.left) {
            const tx = (0.5 - lWrist.x) * 1.5 - 0.2;
            const ty = 1.6 - (lWrist.y * 1.3);

            let isPunch = false;
            if (this.prevLWrist) {
                const dz = this.prevLWrist.z - lWrist.z;
                const dy = this.prevLWrist.y - lWrist.y;
                if (dz > 0.04 || lWrist.z < -0.12 || (Math.hypot(dz, dy) > 0.08 && lWrist.z < 0)) {
                    isPunch = true;
                }
            } else if (lWrist.z < -0.15) {
                isPunch = true;
            }

            this.updatePlayerGlove('left', tx, ty, isPunch);
            this.prevLWrist = { x: lWrist.x, y: lWrist.y, z: lWrist.z };
        }

        if (rWrist && this.playerGloves.right) {
            const tx = (0.5 - rWrist.x) * 1.5 + 0.2;
            const ty = 1.6 - (rWrist.y * 1.3);

            let isPunch = false;
            if (this.prevRWrist) {
                const dz = this.prevRWrist.z - rWrist.z;
                const dy = this.prevRWrist.y - rWrist.y;
                if (dz > 0.04 || rWrist.z < -0.12 || (Math.hypot(dz, dy) > 0.08 && rWrist.z < 0)) {
                    isPunch = true;
                }
            } else if (rWrist.z < -0.15) {
                isPunch = true;
            }

            this.updatePlayerGlove('right', tx, ty, isPunch);
            this.prevRWrist = { x: rWrist.x, y: rWrist.y, z: rWrist.z };
        }
    }

    updatePlayerGlove(side, targetX, targetY, isPunching) {
        const glove = this.playerGloves[side];
        if (!glove) return;

        glove.position.x = THREE.MathUtils.lerp(glove.position.x, targetX, 0.28);
        glove.position.y = THREE.MathUtils.lerp(glove.position.y, targetY, 0.28);

        if (isPunching && !glove.userData.isPunching) {
            this.triggerPlayerPunch(side);
        }
    }

    triggerPlayerPunch(side) {
        const glove = this.playerGloves[side];
        if (!glove || glove.userData.isPunching) return;

        const now = Date.now();
        if (now - this.lastHitTime < 120) return;
        this.lastHitTime = now;

        glove.userData.isPunching = true;
        const initialZ = glove.position.z;
        const initialY = glove.position.y;

        // Portée étendue: le poing va jusqu'à Z=-0.80 pour atteindre l'adversaire à Z=-0.35
        const targetZ = -0.80;
        const targetY = initialY + 0.08; // légère montée

        const punchStart = Date.now();
        const punchDuration = 160;

        let hasHit = false;

        const animatePunch = () => {
            const elapsed = Date.now() - punchStart;
            const progress = elapsed / punchDuration;

            if (progress < 0.5) {
                const t = progress * 2;
                glove.position.z = THREE.MathUtils.lerp(initialZ, targetZ, t);
                glove.position.y = THREE.MathUtils.lerp(initialY, targetY, t);
                glove.scale.setScalar(THREE.MathUtils.lerp(1, 1.3, t)); // gonfle au contact
            } else if (progress < 1.0) {
                const t = (progress - 0.5) * 2;
                glove.position.z = THREE.MathUtils.lerp(targetZ, initialZ, t);
                glove.position.y = THREE.MathUtils.lerp(targetY, initialY, t);
                glove.scale.setScalar(THREE.MathUtils.lerp(1.3, 1.0, t));
            } else {
                glove.position.z = initialZ;
                glove.position.y = initialY;
                glove.scale.setScalar(1.0);
                glove.userData.isPunching = false;
                return;
            }

            if (progress >= 0.35 && progress <= 0.70 && !hasHit) {
                hasHit = true;
                this.checkOpponentHit(glove.position);
            }

            requestAnimationFrame(animatePunch);
        };
        animatePunch();
    }

    checkOpponentHit(glovePos) {
        if (this.opponentHp <= 0 || this.isInRecovery) return;

        // Position monde de la tête et du torse
        const oppHeadPos = new THREE.Vector3();
        this.opponentParts.head.getWorldPosition(oppHeadPos);

        const oppTorsoPos = new THREE.Vector3();
        this.opponentParts.torso.getWorldPosition(oppTorsoPos);

        const distHead   = glovePos.distanceTo(oppHeadPos);
        const distTorso  = glovePos.distanceTo(oppTorsoPos);

        // Hitbox très large pour que les coups connectent facilement
        const headHit  = distHead  < 0.90;
        const torsoHit = distTorso < 0.95;

        if (headHit || torsoHit) {
            this.punchesCount++;
            this.roundPunches++;
            this.combo++;
            if (this.combo > this.maxCombo) this.maxCombo = this.combo;

            // Dégâts: 8 à 22 HP selon combo. KO en ~50-70 coups
            let damage = 10 + Math.min(this.combo * 1.0, 20);
            if (headHit)   damage *= 1.3; // bonus coup à la tête
            if (this.opponentAnim.state === 'stunned') damage *= 2.0; // counter bonus
            damage = Math.round(damage);

            this.opponentHp = Math.max(0, this.opponentHp - damage);
            this.score += 100 + (this.combo * 15);

            // Recul de l'adversaire
            this.opponentAnim.state = 'hurt';
            this.opponentAnim.hurtTimer = Date.now();
            this.opponentParts.head.rotation.x = headHit ? -0.45 : -0.2;
            this.opponentParts.head.rotation.z = (Math.random() - 0.5) * 0.3;
            this.opponentGroup.position.z = -0.60; // recule

            this.flashOpponentHit();

            if (this.combo >= 5 && this.combo % 5 === 0) {
                window.soundEngine.playHeavyPunch();
                window.coachVoice.speak(`Super combo x${this.combo} !`, false);
            } else {
                window.soundEngine.playPunch(1.3);
            }

            const hitZone = headHit ? '🎯 HEADSHOT' : '💥 BODY';
            this.showHitBanner(`${hitZone} ! -${damage} HP  Combo x${this.combo}`);
            this.updateHUD();

            if (this.opponentHp <= 0) {
                this.endGame('ko');
            }
        }
    }

    flashOpponentHit() {
        this.opponentParts.materials.forEach(mat => {
            if (mat && mat.color) {
                const orig = mat.color.getHex();
                mat.color.setHex(0xff3333);
                setTimeout(() => {
                    mat.color.setHex(orig);
                }, 140);
            }
        });
    }

    showHitBanner(text) {
        let banner = document.getElementById('vr-hit-indicator');
        if (!banner) {
            banner = document.createElement('div');
            banner.id = 'vr-hit-indicator';
            banner.className = 'absolute top-28 left-1/2 transform -translate-x-1/2 z-30 px-5 py-2 rounded-xl bg-cyan-500/90 text-black font-black text-lg tracking-wider shadow-2xl pointer-events-none transition-all duration-150';
            this.container.appendChild(banner);
        }
        banner.textContent = text;
        banner.style.opacity = '1';
        banner.style.transform = 'translate(-50%, -10px) scale(1.1)';
        clearTimeout(banner.timer);
        banner.timer = setTimeout(() => {
            banner.style.opacity = '0';
            banner.style.transform = 'translate(-50%, 0) scale(1)';
        }, 400);
    }

    checkDodge(headX) {
        const req = this.opponentAnim.dodgeRequired;
        const isSafe = (req === 'left' && headX < -0.30) ||
                       (req === 'right' && headX > 0.30);

        if (isSafe) {
            this.opponentAnim.state = 'stunned';
            this.dodgesCount++;
            this.roundDodges++;
            this.combo += 2;
            this.score += 150;

            window.soundEngine.playWhoosh();
            window.coachVoice.speak("Esquivé ! Il est sonné, frappe !", false);

            const alertEl = document.getElementById('vr-dodge-alert');
            if (alertEl) alertEl.classList.add('hidden');

            this.showHitBanner("🛡️ ESQUIVE PARFAITE ! IL EST SONNÉ !");

            setTimeout(() => {
                if (this.opponentAnim.state === 'stunned') {
                    this.opponentAnim.state = 'idle';
                    this.opponentAnim.lastAttackTime = Date.now() + 2800;
                }
            }, 2000);
        }
    }

    loop() {
        if (!this.isActive) return;

        const delta = this.clock.getDelta();
        const now = Date.now();

        this.opponentAnim.phase += delta * 4;
        const bob = Math.sin(this.opponentAnim.phase) * 0.03;
        const sway = Math.cos(this.opponentAnim.phase * 0.5) * 0.05;

        if (this.opponentAnim.state === 'idle') {
            this.opponentGroup.position.y = bob;
            this.opponentGroup.position.x = sway;
            // Maintenu bien proche — Z=-0.35 au repos
            this.opponentGroup.position.z = THREE.MathUtils.lerp(this.opponentGroup.position.z, -0.35, 0.08);

            // Bras qui bougent en garde
            this.opponentParts.armL.position.y = 1.52 + bob * 0.5;
            this.opponentParts.armR.position.y = 1.52 - bob * 0.5;

            if (!this.isInRecovery && now > this.opponentAnim.lastAttackTime) {
                this.triggerOpponentAttack();
            }
        } else if (this.opponentAnim.state === 'hurt') {
            if (now - this.opponentAnim.hurtTimer > 280) {
                this.opponentAnim.state = 'idle';
                this.opponentParts.head.rotation.x = 0;
                this.opponentParts.head.rotation.z = 0;
            }
        } else if (this.opponentAnim.state === 'attacking') {
            this.updateOpponentAttack(now);
        }

        this.renderer.render(this.scene, this.camera);
        this.animFrameId = requestAnimationFrame(() => this.loop());
    }

    triggerOpponentAttack() {
        this.opponentAnim.state = 'attacking';
        this.opponentAnim.attackStartTime = Date.now();
        this.opponentAnim.attackDuration = this.difficulty === 'hard' ? 1400 : 1900;

        const isLeft = Math.random() > 0.5;
        this.opponentAnim.attackType = isLeft ? 'left_jab' : 'right_hook';
        this.opponentAnim.dodgeRequired = isLeft ? 'right' : 'left';

        window.soundEngine.playWarning();
        const sideFr = this.opponentAnim.dodgeRequired === 'left' ? "À GAUCHE !" : "À DROITE !";
        window.coachVoice.speak(`Esquive ${sideFr}`, true);

        const alertEl = document.getElementById('vr-dodge-alert');
        if (alertEl) {
            alertEl.classList.remove('hidden');
            alertEl.textContent = `⚠️ ESQUIVEZ ${sideFr}`;
        }
    }

    updateOpponentAttack(now) {
        const elapsed = now - this.opponentAnim.attackStartTime;
        const progress = Math.min(1, elapsed / this.opponentAnim.attackDuration);

        const attackingArm = this.opponentAnim.attackType === 'left_jab' ? this.opponentParts.armL : this.opponentParts.armR;

        if (progress < 0.6) {
            attackingArm.position.z = THREE.MathUtils.lerp(0, 1.1, progress / 0.6);
        } else if (progress < 1.0) {
            attackingArm.position.z = THREE.MathUtils.lerp(1.1, 0, (progress - 0.6) / 0.4);
        } else {
            attackingArm.position.z = 0;
            this.handlePlayerDamage();
        }
    }

    handlePlayerDamage() {
        this.opponentAnim.state = 'idle';
        this.combo = 0;

        const alertEl = document.getElementById('vr-dodge-alert');
        if (alertEl) alertEl.classList.add('hidden');

        const dmg = this.difficulty === 'hard' ? 24 : 16;
        this.playerHp = Math.max(0, this.playerHp - dmg);

        window.soundEngine.playDamage();

        const vignette = document.getElementById('vr-damage-flash');
        if (vignette) {
            vignette.classList.remove('opacity-0');
            vignette.classList.add('opacity-80');
            setTimeout(() => {
                vignette.classList.remove('opacity-80');
                vignette.classList.add('opacity-0');
            }, 250);
        }

        this.updateHUD();
        this.opponentAnim.lastAttackTime = Date.now() + 2600;

        if (this.playerHp <= 0) {
            this.endGame('tko');
        }
    }

    updateHUD() {
        const oppBar = document.getElementById('vr-opp-hp');
        if (oppBar) {
            const pct = Math.max(0, (this.opponentHp / this.opponentMaxHp) * 100);
            oppBar.style.width = `${pct}%`;
        }

        const playerBar = document.getElementById('vr-player-hp');
        if (playerBar) {
            const pct = Math.max(0, (this.playerHp / this.playerMaxHp) * 100);
            playerBar.style.width = `${pct}%`;
        }

        const punchesEl = document.getElementById('vr-punches-count');
        if (punchesEl) punchesEl.textContent = this.punchesCount;

        const timerEl = document.getElementById('vr-timer');
        if (timerEl) {
            const mins = Math.floor(this.timeLeft / 60);
            const secs = this.timeLeft % 60;
            timerEl.textContent = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
        }

        const roundLabel = document.getElementById('vr-round-label');
        if (roundLabel) {
            roundLabel.textContent = `Round ${this.currentRound} / ${this.maxRounds}`;
        }
    }

    endGame(reason) {
        this.stop();
        window.soundEngine.playBell();

        const alertEl = document.getElementById('vr-dodge-alert');
        if (alertEl) alertEl.classList.add('hidden');

        const recoveryModal = document.getElementById('vr-recovery-overlay');
        if (recoveryModal) recoveryModal.classList.add('hidden');

        let title = "FIN DU COMBAT";
        let message = `Match terminé ! Vous avez porté ${this.punchesCount} coups en 3D !`;
        let victory = false;

        if (reason === 'ko') {
            title = "VICTOIRE PAR K.O. ! 🥊🏆";
            message = `Adversaire terrassé après un combat épique ! ${this.punchesCount} coups portés !`;
            victory = true;
            window.soundEngine.playRecordFanfare();
            window.coachVoice.speak("K.O. ! Magnifique victoire par K.O. sur le ring !", true);
        } else if (reason === 'points') {
            // Decided on points after 3 rounds
            const playerDmgDealt = this.opponentMaxHp - this.opponentHp;
            const playerDmgTaken = this.playerMaxHp - this.playerHp;
            victory = playerDmgDealt >= playerDmgTaken;
            title = victory ? "VICTOIRE AUX POINTS ! 🏆" : "DÉFAITE AUX POINTS";
            message = `3 rounds intenses complétés ! ${this.punchesCount} coups donnés. Score arbitre : ${this.score} pts.`;
            if (victory) window.soundEngine.playRecordFanfare();
            window.coachVoice.speak(victory ? "Victoire aux points après 3 grands rounds !" : "Fin des 3 rounds. Bel affrontement !", true);
        } else if (reason === 'tko') {
            title = "DÉFAITE PAR T.K.O.";
            message = "L'adversaire a percé votre garde. Pensez à esquiver et à bien récupérer !";
            window.coachVoice.speak("Arrêt du combat par l'arbitre.", true);
        }

        if (window.app) {
            window.app.onBoxingSessionComplete({
                punches: this.punchesCount,
                maxCombo: this.maxCombo,
                dodges: this.dodgesCount,
                score: this.score,
                duration: (this.currentRound - 1) * 180 + (180 - this.timeLeft),
                title,
                message,
                victory,
                mode: 'duel'
            });
        }
    }
}

window.boxingVRGame = new BoxingVRGame();
