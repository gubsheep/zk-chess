import React, {useEffect} from 'react';
import {useState} from 'react';
import EthereumAccountManager from '../api/EthereumAccountManager';
import GameManager from '../api/GameManager';
import {EthAddress} from '../_types/global/GlobalTypes';
import GameUIManager from './board/GameUIManager';
import {Game} from './Game';

enum InitState {
  NONE,
  DISPLAY_LOGIN_OPTIONS,
  DISPLAY_ACCOUNTS,
  // GENERATE_ACCOUNT,
  ASKING_GAME_ADDR,
  FETCHING_ETH_DATA,
  ALL_CHECKS_PASS,
  COMPLETE,
  TERMINATED,
}

export function LandingPage() {
  const [uiManager, setUIManager] = useState<GameUIManager | null>(null);
  const [initialized, setInitialized] = useState<boolean>(true);
  const [knownAddrs, setKnownAddrs] = useState<EthAddress[]>([]);
  let initState = InitState.NONE;

  const startGame = async () => {
    initState = InitState.DISPLAY_LOGIN_OPTIONS;
    // const newGameManager = await GameManager.create();
    // const newGameUIManager = await GameUIManager.create(newGameManager);
    // setUIManager(newGameUIManager);
  };

  const displayAccounts = async () => {
    const ethConnection = EthereumAccountManager.getInstance();
    ethConnection.addAccount(
      '0x044C7963E9A89D4F8B64AB23E02E97B2E00DD57FCB60F316AC69B77135003AEF'
    );
    ethConnection.addAccount(
      '0x523170AAE57904F24FFE1F61B7E4FF9E9A0CE7557987C2FC034EACB1C267B4AE'
    );
    ethConnection.addAccount(
      '0x67195c963ff445314e667112ab22f4a7404bad7f9746564eb409b9bb8c6aed32'
    );
    setKnownAddrs(ethConnection.getKnownAccounts());
    initState = InitState.DISPLAY_ACCOUNTS;
  };

  // sync dependencies to initialized
  useEffect(() => {
    if (!uiManager) return;
    else setInitialized(true);
  }, [uiManager]);

  if (initState === InitState.NONE) {
    return (
      <div>
        {initialized ? <Game /> : <p onClick={startGame}>start game!</p>}
      </div>
    );
  } else if (initState === InitState.DISPLAY_LOGIN_OPTIONS) {
    return (
      <div>
        <p onClick={displayAccounts}>display accounts</p>
      </div>
    );
  } else if ((initState = InitState.DISPLAY_ACCOUNTS)) {
    return (
      <div>
        {knownAddrs.map((addr) => (
          <p key={addr}>{addr}</p>
        ))}
      </div>
    );
  }
  return <div></div>;
}
