import { HandLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

console.log = (message: string) => {
    const ele = document.getElementById("console");
    if (ele == null) return;
    ele.textContent += message;
}


// HTML要素の取得
const videoElement = document.getElementById('video') as HTMLVideoElement;
const canvasElement = document.getElementById('canvas') as HTMLCanvasElement;
const canvasCtx = canvasElement.getContext('2d') as CanvasRenderingContext2D;

let handLandmarker: HandLandmarker | null = null;
let lastVideoTime = -1;

const createHandLandmarker = async () => {
    try {
        const vision = await FilesetResolver.forVisionTasks(
            'wasm'
        );
        handLandmarker = await HandLandmarker.createFromOptions(vision, {
            baseOptions: {
                modelAssetPath: `hand_landmarker.task`,
                delegate: "GPU"
            },
            runningMode: 'VIDEO',
            numHands: 2,
        });
        console.log("HandLandmarker initialized.");
    } catch (error) {
        console.log("Failed to create HandLandmarker:", JSON.stringify(error));
    }
};

const setupCamera = async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        videoElement.srcObject = stream;
        videoElement.onloadeddata = () => {
            videoElement.play();
            canvasElement.width = videoElement.videoWidth;
            canvasElement.height = videoElement.videoHeight;
            requestAnimationFrame(predictWebcam);
        };
    } catch (error) {
        console.error('カメラにアクセスできませんでした:', error);
    }
};

const predictWebcam = () => {
    if (!handLandmarker) {
        console.error("HandLandmarker has not been loaded yet.");
        return;
    }

    let results = null;
    if (videoElement.currentTime !== lastVideoTime) {
        results = handLandmarker.detectForVideo(videoElement, performance.now());
        lastVideoTime = videoElement.currentTime;
    }

    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    canvasCtx.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);

    if (results && results.landmarks && results.landmarks.length > 0) {
        console.log(`Detected hands: ${results.landmarks.length}`);
        for (const landmarks of results.landmarks) {
            drawHand(canvasCtx, landmarks, canvasElement.width, canvasElement.height);
        }
    } else {
        console.log("No hands detected.");
    }

    canvasCtx.restore();
    requestAnimationFrame(predictWebcam);
};

const drawHand = (ctx: CanvasRenderingContext2D, landmarks: any, width: number, height: number) => {
    if (!landmarks || landmarks.length === 0) return;

    const points = landmarks.map((point: any) => ({
        x: point.x * width,
        y: point.y * height,
    }));
    
    // 赤いバウンディングボックスを描画
    const xCoords = points.map((p: any) => p.x);
    const yCoords = points.map((p: any) => p.y);
    const minX = Math.min(...xCoords);
    const minY = Math.min(...yCoords);
    const maxX = Math.max(...xCoords);
    const maxY = Math.max(...yCoords);
    
    ctx.strokeStyle = 'red';
    ctx.lineWidth = 2;
    ctx.strokeRect(minX, minY, maxX - minX, maxY - minY);
    
    // 手の接続点（指の線）を描画
    const connections = [
        [0, 1, 2, 3, 4], 
        [0, 5, 6, 7, 8],
        [0, 9, 10, 11, 12],
        [0, 13, 14, 15, 16],
        [0, 17, 18, 19, 20],
        [5, 9, 13, 17]
    ];

    ctx.strokeStyle = '#00FF00';
    ctx.lineWidth = 5;

    for (const path of connections) {
        ctx.beginPath();
        for (let i = 0; i < path.length; i++) {
            const index = path[i];
            if (i === 0) {
                ctx.moveTo(points[index].x, points[index].y);
            } else {
                ctx.lineTo(points[index].x, points[index].y);
            }
        }
        ctx.stroke();
    }
    
    // ランドマーク（関節）を描画
    ctx.fillStyle = '#FF0000';
    for (const point of points) {
        ctx.beginPath();
        ctx.arc(point.x, point.y, 5, 0, 2 * Math.PI);
        ctx.fill();
    }
};

const main = async () => {
    await createHandLandmarker();
    await setupCamera();
};

main();