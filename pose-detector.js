// Pose Detector Wrapper using MediaPipe Pose (Lite fast model)
class PoseEngine {
    constructor() {
        this.videoElement = null;
        this.camera = null;
        this.pose = null;
        this.isRunning = false;
        this.onResultsCallback = null;
        this.onStatusCallback = null;
        this.isModelLoaded = false;
        this.selectedCameraId = null;
    }

    async init() {
        if (this.isModelLoaded && this.pose) return;

        if (this.onStatusCallback) this.onStatusCallback('loading', 'Chargement du modèle IA...');

        // Ensure MediaPipe Pose is loaded
        if (typeof window.Pose === 'undefined') {
            await this.loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js');
            await this.loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js');
        }

        this.pose = new window.Pose({
            locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
            }
        });

        // Use modelComplexity 0 (Lite) for lightning-fast loading and 60 FPS
        this.pose.setOptions({
            modelComplexity: 0,
            smoothLandmarks: true,
            enableSegmentation: false,
            smoothSegmentation: false,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        });

        this.pose.onResults((results) => {
            if (this.onStatusCallback && !this.hasReceivedFirstFrame) {
                this.hasReceivedFirstFrame = true;
                this.onStatusCallback('ready', 'Caméra & IA prêtes !');
            }
            if (this.onResultsCallback) {
                this.onResultsCallback(results);
            }
        });

        this.isModelLoaded = true;
    }

    loadScript(src) {
        return new Promise((resolve, reject) => {
            const existing = document.querySelector(`script[src="${src}"]`);
            if (existing) {
                resolve();
                return;
            }
            const script = document.createElement('script');
            script.src = src;
            script.crossOrigin = 'anonymous';
            script.onload = () => resolve();
            script.onerror = () => reject(new Error(`Failed to load script ${src}`));
            document.head.appendChild(script);
        });
    }

    async start(videoElement, onResultsCallback, onStatusCallback) {
        this.videoElement = videoElement;
        this.onResultsCallback = onResultsCallback;
        this.onStatusCallback = onStatusCallback;
        this.hasReceivedFirstFrame = false;

        if (this.onStatusCallback) this.onStatusCallback('requesting', 'Demande d\'accès à la caméra...');

        // Start video stream first
        const constraints = {
            video: {
                width: { ideal: 1280 },
                height: { ideal: 720 },
                facingMode: 'user',
                ...(this.selectedCameraId ? { deviceId: { exact: this.selectedCameraId } } : {})
            },
            audio: false
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        this.videoElement.srcObject = stream;
        try {
            await this.videoElement.play();
        } catch (e) {
            console.warn("video play exception:", e);
        }

        this.isRunning = true;

        // Init model
        await this.init();

        if (this.onStatusCallback) this.onStatusCallback('active', 'Analyse des mouvements active');

        if (window.Camera) {
            this.camera = new window.Camera(this.videoElement, {
                onFrame: async () => {
                    if (this.isRunning && this.videoElement && this.videoElement.readyState >= 2) {
                        try {
                            await this.pose.send({ image: this.videoElement });
                        } catch (e) {
                            // ignore frame drop
                        }
                    }
                },
                width: 1280,
                height: 720
            });
            this.camera.start();
        } else {
            const loop = async () => {
                if (!this.isRunning) return;
                if (this.videoElement && this.videoElement.readyState >= 2) {
                    try {
                        await this.pose.send({ image: this.videoElement });
                    } catch (e) {}
                }
                requestAnimationFrame(loop);
            };
            requestAnimationFrame(loop);
        }
    }

    stop() {
        this.isRunning = false;
        if (this.camera) {
            try { this.camera.stop(); } catch (e) {}
            this.camera = null;
        }
        if (this.videoElement && this.videoElement.srcObject) {
            const tracks = this.videoElement.srcObject.getTracks();
            tracks.forEach(track => track.stop());
            this.videoElement.srcObject = null;
        }
    }

    static calculateAngle(a, b, c) {
        if (!a || !b || !c) return 0;
        const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
        let angle = Math.abs((radians * 180.0) / Math.PI);
        if (angle > 180.0) {
            angle = 360 - angle;
        }
        return angle;
    }

    static distance(p1, p2) {
        if (!p1 || !p2) return 0;
        return Math.hypot(p1.x - p2.x, p1.y - p2.y);
    }
}

window.PoseEngine = PoseEngine;
