import React, { useEffect } from "react";
import { useState } from "react";
import GameManager from "../api/GameManager";
import GameUIManager from "./board/GameUIManager";
import { Game } from "./Game";

export function LandingPage() {
  const [uiManager, setUIManager] = useState<GameUIManager | null>(null);
  const [initialized, setInitialized] = useState<boolean>(true);

  const startGame = async () => {
    const newGameManager = await GameManager.create();
    const newGameUIManager = await GameUIManager.create(newGameManager);
    setUIManager(newGameUIManager);
  };

  // sync dependencies to initialized
  useEffect(() => {
    if (!uiManager) return;
    else setInitialized(true);
  }, [uiManager]);

  return (
    <div>
      {initialized && uiManager ? (
        <Game uiManager={uiManager} />
      ) : (
        <p onClick={startGame}>start game!</p>
      )}
    </div>
  );
}
