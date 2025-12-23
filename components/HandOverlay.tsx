
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Gesture } from '../types';
import { analyzeGesture } from '../services/HandRecognition';

// Use global MediaPipe objects from CDN
declare const Hands: any;
declare const Camera: any;
declare const drawConnectors: any;
declare const drawLandmarks: any;
declare const HAND_CONNECTIONS: any;

interface HandOverlayProps {
  onGestureChange: (gesture: Gesture) => void;
}

const HandOverlay: React.FC<HandOverlayProps> = ({ onGestureChange }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [currentGesture, setCurrentGesture] = useState<Gesture>(Gesture.UNKNOWN);
  
  // Ref to track active state and prevent calls to deleted WASM objects
  const isActive = useRef(true);

  // Use a ref for the latest gesture change callback to avoid re-initializing 
  // the entire MediaPipe stack when the callback identity changes.
  const gestureCallbackRef = useRef(onGestureChange);
  useEffect(() => {
    gestureCallbackRef.current = onGestureChange;
  }, [onGestureChange]);

  const onResults = useCallback((results: any) => {
    if (!isActive.current || !canvasRef.current || !videoRef.current) return;

    const canvasCtx = canvasRef.current.getContext('2d');
    if (!canvasCtx) return;

    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    
    // Mirror the drawing
    canvasCtx.translate(canvasRef.current.width, 0);
    canvasCtx.scale(-1, 1);

    // Draw video frame to canvas overlay
    canvasCtx.drawImage(
      results.image, 0, 0, canvasRef.current.width, canvasRef.current.height
    );

    let detectedGesture = Gesture.UNKNOWN;

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      for (const landmarks of results.multiHandLandmarks) {
        if (typeof drawConnectors !== 'undefined') {
          drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS, { color: '#00FF00', lineWidth: 3 });
        }
        if (typeof drawLandmarks !== 'undefined') {
          drawLandmarks(canvasCtx, landmarks, { color: '#FF0000', lineWidth: 1, radius: 2 });
        }
        detectedGesture = analyzeGesture(landmarks);
      }
    }

    canvasCtx.restore();

    // Only update state if the component is still active
    if (isActive.current) {
      setCurrentGesture(prev => {
        if (prev !== detectedGesture) {
          gestureCallbackRef.current(detectedGesture);
          return detectedGesture;
        }
        return prev;
      });
    }
  }, []);

  useEffect(() => {
    if (!videoRef.current) return;
    isActive.current = true;

    const hands = new Hands({
      locateFile: (file: string) => {
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

    const camera = new Camera(videoRef.current, {
      onFrame: async () => {
        // Critical: Check if component is still active before sending frame to WASM
        if (isActive.current && videoRef.current) {
          try {
            await hands.send({ image: videoRef.current });
          } catch (e) {
            console.warn("MediaPipe send failed:", e);
          }
        }
      },
      width: 320,
      height: 240
    });

    camera.start()
      .then(() => {
        if (isActive.current) setIsLoaded(true);
      })
      .catch((err: any) => console.error("Camera start error:", err));

    return () => {
      isActive.current = false;
      camera.stop();
      // Use a small delay or try-catch for hands.close to ensure no concurrent WASM access
      try {
        hands.close();
      } catch (e) {
        console.error("Error closing MediaPipe hands:", e);
      }
    };
  }, [onResults]); // Stable onResults ensures this effect only runs once

  return (
    <div className="absolute top-4 right-4 w-64 h-48 border-2 border-blue-500 rounded-xl overflow-hidden shadow-2xl bg-black/50 z-50">
      <video
        ref={videoRef}
        className="hidden"
        playsInline
      />
      <canvas
        ref={canvasRef}
        className="w-full h-full object-cover"
        width={320}
        height={240}
      />
      <div className="absolute bottom-2 left-2 px-2 py-1 rounded bg-black/70 text-xs font-mono text-white flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${isLoaded ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
        {isLoaded ? 'CAMERA ACTIVE' : 'INITIALIZING...'}
      </div>
      <div className="absolute top-2 right-2 px-2 py-1 rounded bg-blue-600/90 text-xs font-bold text-white uppercase">
        {currentGesture}
      </div>
    </div>
  );
};

export default HandOverlay;
