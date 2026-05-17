'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { Camera, CameraOff } from 'lucide-react';
import { usePhotoBoothStore } from '@/stores/photoBoothStore';
import { captureAndStorePhoto, getRecentPhotos } from '@/lib/storage/photos';
import { useAuthStore } from '@/stores/authStore';

export default function PhotoBoothApp() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const { photos, addPhoto, setPhotos, captureRequested, clearCaptureRequest } =
    usePhotoBoothStore();
  const userId = useAuthStore((s) => s.userId);

  useEffect(() => {
    let mounted = true;

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (!mounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setHasPermission(true);
      } catch {
        if (mounted) setHasPermission(false);
      }
    }

    startCamera();

    return () => {
      mounted = false;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  useEffect(() => {
    if (userId) {
      getRecentPhotos(10).then((urls) => {
        if (urls.length > 0) setPhotos(urls);
      });
    }
  }, [userId, setPhotos]);

  const capture = useCallback(async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);

    // Always create a local capture first so the shutter action succeeds
    // even when auth/storage is unavailable.
    const localDataUrl = canvas.toDataURL('image/png');

    if (!userId) {
      addPhoto(localDataUrl);
      return;
    }

    try {
      const result = await captureAndStorePhoto(canvas);
      addPhoto(result?.signedUrl || localDataUrl);
    } catch {
      addPhoto(localDataUrl);
    }
  }, [addPhoto, userId]);

  useEffect(() => {
    if (captureRequested && hasPermission) {
      capture();
      clearCaptureRequest();
    }
  }, [captureRequested, hasPermission, capture, clearCaptureRequest]);

  if (hasPermission === false) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-white text-black/50 gap-3">
        <CameraOff className="w-10 h-10" />
        <p className="text-sm">Camera access denied</p>
        <p className="text-xs text-black/30">Allow camera access to use Photo Booth</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex-1 relative flex items-center justify-center overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />
        {hasPermission === null && (
          <div className="absolute inset-0 flex items-center justify-center bg-white">
            <p className="text-black/50 text-sm">Requesting camera...</p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-center py-3 bg-white border-t border-black/10 gap-3">
        <button
          onClick={capture}
          disabled={!hasPermission}
          className="w-14 h-14 rounded-full bg-white border-2 border-black/40 hover:border-black transition-all flex items-center justify-center disabled:opacity-30"
        >
          <Camera className="w-6 h-6 text-black" />
        </button>
      </div>

      {photos.length > 0 && (
        <div className="flex gap-1 p-2 bg-neutral-50 border-t border-black/10 overflow-x-auto">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {photos.slice(0, 4).map((photo, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
              src={photo}
              alt={`Capture ${i + 1}`}
              className="w-16 h-12 object-cover rounded border border-black/10 grayscale"
            />
          ))}
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
