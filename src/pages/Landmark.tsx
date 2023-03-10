import { useState, useRef, useEffect } from 'react';
import * as faceLandmarksDetection from '@tensorflow-models/face-landmarks-detection';
import Webcam from 'react-webcam';
import { toast } from 'react-toastify';

import styled, { css } from 'styled-components';
import { drawMesh, checkHorizontalRatio } from 'lib/landmarkUtilities';

const Landmark = () => {
  const webcamRef = useRef<null | Webcam>(null);
  const canvasRef = useRef<null | HTMLCanvasElement>(null);

  const [isWebcamReady, setIsWebcamReady] = useState(false);
  const [horizontalRatio, setHorizontalRatio] = useState(0.5);
  const [irisPosition, setIrisPosition] = useState<'left' | 'center' | 'right'>('center');
  const [detector, setDetector] = useState<null | faceLandmarksDetection.FaceLandmarksDetector>(null);

  // Load facemesh
  const loadFacemesh = async () => {
    const model = faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh;
    const detectorConfig: faceLandmarksDetection.MediaPipeFaceMeshMediaPipeModelConfig = {
      runtime: 'mediapipe',
      solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh',
      refineLandmarks: true,
    };
    const d = await faceLandmarksDetection.createDetector(model, detectorConfig);
    setDetector(d);
  };

  const detect = async (detector: faceLandmarksDetection.FaceLandmarksDetector) => {
    try {
      if (!canvasRef.current) {
        throw new Error('no canvasRef.current');
      }
      if (!webcamRef.current) {
        throw new Error('no webcamRef.current');
      }
      if (!webcamRef.current.video) {
        throw new Error('no webcamRef.current.video');
      }

      const { video } = webcamRef.current;
      const { readyState, videoWidth, videoHeight } = video;

      if (readyState !== 4) {
        throw new Error('video not ready');
      }

      video.width = videoWidth;
      video.height = videoHeight;
      canvasRef.current.width = videoWidth;
      canvasRef.current.height = videoHeight;

      const ctx = canvasRef.current.getContext('2d');

      if (!ctx) {
        throw new Error('ctx not ready');
      }

      const [face] = await detector.estimateFaces(video);

      if (face) {
        drawMesh(face.keypoints, ctx);
        const ratio = checkHorizontalRatio(face.keypoints);
        setHorizontalRatio(ratio);
      }
    } catch (e) {
      console.log(e);
    }
  };

  useEffect(() => {
    if (isWebcamReady) {
      (async () => {
        await loadFacemesh();
      })();
    }
  }, [isWebcamReady]);

  useEffect(() => {
    if (detector) {
      const intervalId = window.setInterval(async () => {
        await detect(detector);
      }, 100);

      return (() => {
        window.clearInterval(intervalId);
      });
    }
  }, [detector]);

  useEffect(() => {
    if (horizontalRatio >= 0.6) {
      setIrisPosition('left');
    } else if (horizontalRatio <= 0.4) {
      setIrisPosition('right');
    } else {
      setIrisPosition('center');
    }
  }, [horizontalRatio]);

  useEffect(() => {
    if (irisPosition !== 'center') {
      toast('???????????? ?????????', {
        position: 'top-right',
        autoClose: 2000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: 'light',
      });
    }
  }, [irisPosition]);

  return (
    <StyledLayout>
      <StyledWebcam ref={webcamRef} mirrored={false} onCanPlay={() => setIsWebcamReady(true)} />
      <StyledCanvas ref={canvasRef} />
    </StyledLayout>
  );
};

export default Landmark;

const StyledLayout = styled.div`
  position: relative;
`;

const commonStyle = css`
  position: absolute;
  left: 0;
  right: 0;
  margin: 0 auto;
  text-align: center;
  z-index: 9;
  width: 640px;
  height: 480px;
`;

const StyledWebcam = styled(Webcam)`
  ${commonStyle}
`;

const StyledCanvas = styled.canvas`
  ${commonStyle}
`;
