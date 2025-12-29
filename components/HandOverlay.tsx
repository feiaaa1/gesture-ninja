
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Gesture } from '../types';
import { analyzeGesture } from '../services/HandRecognition';

// 使用来自 CDN 的全局 MediaPipe 对象
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
  
  // 用于跟踪活动状态并防止调用已删除的 WASM 对象的 Ref
  const isActive = useRef(true);

  // 使用 ref 保存最新的手势变化回调，以避免在回调标识更改时
  // 重新初始化整个 MediaPipe 堆栈
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
    
    // 镜像绘制
    canvasCtx.translate(canvasRef.current.width, 0);
    canvasCtx.scale(-1, 1);

    // 将视频帧绘制到画布叠加层
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

    // 仅在组件仍处于活动状态时更新状态
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
        // 关键：在将帧发送到 WASM 之前检查组件是否仍处于活动状态
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
      // 使用小延迟或 try-catch 来确保 hands.close 时没有并发的 WASM 访问
      try {
        hands.close();
      } catch (e) {
        console.error("Error closing MediaPipe hands:", e);
      }
    };
  }, [onResults]); // 稳定的 onResults 确保此副作用仅运行一次

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
