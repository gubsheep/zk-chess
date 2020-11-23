import React, { useEffect, useRef, useState } from 'react';
import { PixiManager } from '../api/PixiManager';
import AbstractGameManager from '../api/AbstractGameManager';
import {
  StyledPixiApp,
  GameWrapper,
  TV,
  StyledTable,
  CanvasWrapper,
  Toolbar,
  TextBody,
} from './PixiAppComponents';

export default function PixiApp({
  gameManager,
}: {
  gameManager: AbstractGameManager;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [pixiManager, setPixiManager] = useState<PixiManager | null>(null);

  // note: gather is about 1000 x 800, gba is 240 x 160, NES is 256 x 240
  // const width = 360;
  // const height = 240;
  const width = 360; // 480 * 2 = 960
  const height = 320; // 320 * 2 = 640
  const scale = 2;

  useEffect(() => {
    if (!canvasRef.current || !gameManager) {
      if (pixiManager) setPixiManager(PixiManager.destroy());
      return;
    }

    setPixiManager(
      PixiManager.initialize({ canvas: canvasRef.current, gameManager })
    );
  }, [canvasRef, gameManager]);

  const dimObj = {
    width: `${scale * width}px`,
    height: `${scale * height}px`,
  };

  console.log(
    'Colors and styles shamelessly copied from https://www.lexaloffle.com/pico-8.php. Thanks, Lexaloffle!'
  );

  return (
    <StyledPixiApp>
      <GameWrapper>
        <TV>
          <div className='wrapper img'>
            <img
              src={'public/assets/tv.png'}
              width={461 * scale}
              height={436 * scale}
            />
          </div>
          <div className='wrapper canvas'>
            <CanvasWrapper style={dimObj}>
              <canvas
                ref={canvasRef}
                width={width}
                height={height}
                style={dimObj}
              ></canvas>
            </CanvasWrapper>
          </div>
        </TV>
        <StyledTable>
          <img
            src={'public/assets/bgbar.png'}
            width={scale * 842}
            height={scale * 128}
            style={{
              width: scale * 842 + 'px',
              height: scale * 128 + 'px',
            }}
          />
        </StyledTable>
        <Toolbar>
          <span>TRANSACTIONS</span>
          <span>HELP</span>
          <span>PIECE LIST</span>
        </Toolbar>
      </GameWrapper>
      <TextBody>
        asldfjklaf
        asdflkjasdfkasdjf
        asdfklasdjflaksjdf

      </TextBody>
    </StyledPixiApp>
  );
}
