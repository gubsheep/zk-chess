import React, { useEffect, useRef, useState } from 'react';
import { PixiManager } from '../api/PixiManager';
import styled from 'styled-components';
import AbstractGameManager from '../api/AbstractGameManager';

const StyledPixiApp = styled.div`
  canvas {
    border: 1px solid red;
    image-rendering: -moz-crisp-edges;
    image-rendering: -webkit-crisp-edges;
    image-rendering: pixelated;
    image-rendering: crisp-edges;
  }
`;

export default function PixiApp({
  gameManager,
}: {
  gameManager: AbstractGameManager;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [pixiManager, setPixiManager] = useState<PixiManager | null>(null);

  const width = 640;
  const height = 400;
  const scale = 2;

  useEffect(() => {
    if (!canvasRef.current || !gameManager) {
      if (pixiManager) setPixiManager(PixiManager.destroy());
      return;
    }

    setPixiManager(PixiManager.initialize({ canvas: canvasRef.current, gameManager }));
  }, [canvasRef, gameManager]);

  return (
    <StyledPixiApp>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{
          width: `${scale * width}px`,
          height: `${scale * height}px`,
        }}
      ></canvas>
    </StyledPixiApp>
  );
}
