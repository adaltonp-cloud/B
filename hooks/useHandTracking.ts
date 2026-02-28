
import { useEffect, useRef, useState, useCallback } from 'react';
import { Hands, Results, HAND_CONNECTIONS } from '@mediapipe/hands';
import { Camera } from '@mediapipe/camera_utils';

export interface HandData {
    x: number;
    y: number;
    isClosed: boolean;
    isActive: boolean;
}

export const useHandTracking = (enabled: boolean) => {
    const [handData, setHandData] = useState<HandData>({ x: 0.5, y: 0.5, isClosed: false, isActive: false });
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const handsRef = useRef<Hands | null>(null);
    const cameraRef = useRef<Camera | null>(null);

    const onResults = useCallback((results: Results) => {
        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            const landmarks = results.multiHandLandmarks[0];
            
            // Get palm position (landmark 0 is wrist, 9 is middle finger base)
            // We'll use landmark 9 as the center of the hand for movement
            const palm = landmarks[9];
            
            // Determine if hand is closed
            // Heuristic: check if fingertips are below their respective finger bases
            // Landmarks: 8 (index tip) vs 6 (index base), 12 (middle tip) vs 10 (middle base), etc.
            const fingerPairs = [
                { tip: 8, base: 6 },
                { tip: 12, base: 10 },
                { tip: 16, base: 14 },
                { tip: 20, base: 18 }
            ];
            
            let closedCount = 0;
            fingerPairs.forEach(pair => {
                if (landmarks[pair.tip].y > landmarks[pair.base].y) {
                    closedCount++;
                }
            });

            setHandData({
                x: 1 - palm.x, // Mirror X for natural feeling
                y: palm.y,
                isClosed: closedCount >= 3,
                isActive: true
            });
        } else {
            setHandData(prev => ({ ...prev, isActive: false }));
        }
    }, []);

    useEffect(() => {
        if (!enabled) {
            if (cameraRef.current) {
                cameraRef.current.stop();
            }
            return;
        }

        const videoElement = document.createElement('video');
        videoElement.style.display = 'none';
        document.body.appendChild(videoElement);
        videoRef.current = videoElement;

        const hands = new Hands({
            locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
            }
        });

        hands.setOptions({
            maxNumHands: 1,
            modelComplexity: 1,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        });

        hands.onResults(onResults);
        handsRef.current = hands;

        const camera = new Camera(videoElement, {
            onFrame: async () => {
                await hands.send({ image: videoElement });
            },
            width: 640,
            height: 480
        });
        camera.start();
        cameraRef.current = camera;

        return () => {
            if (cameraRef.current) cameraRef.current.stop();
            if (handsRef.current) handsRef.current.close();
            if (videoRef.current) {
                videoRef.current.pause();
                videoRef.current.remove();
            }
        };
    }, [enabled, onResults]);

    return handData;
};
