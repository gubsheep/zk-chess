import React, {useEffect, MouseEvent} from 'react';
import {useState} from 'react';
import EthereumAccountManager from '../api/EthereumAccountManager';
import FakeGameManager from '../api/FakeGameManager';
import GameManager from '../api/GameManager';
import {EthAddress} from '../_types/global/GlobalTypes';
import AbstractUIManager from './board/AbstractUIManager';
import GameUIManager from './board/GameUIManager';
import {Game} from './Game';

enum InitState {
  NONE,
  DISPLAY_LOGIN_OPTIONS,
  DISPLAY_ACCOUNTS,
  // GENERATE_ACCOUNT,
  ASKING_GAME_ADDR,
  FETCHING_ETH_DATA,
  FETCHED_ETH_DATA,
  ALL_CHECKS_PASS,
  COMPLETE,
  TERMINATED,
}

const MOCK_GAME = false;

export function LandingPage() {
  const [uiManager, setUIManager] = useState<AbstractUIManager | null>(null);
  const [initialized, setInitialized] = useState<boolean>(false);
  const [knownAddrs, setKnownAddrs] = useState<EthAddress[]>([]);
  const [initState, setInitState] = useState<InitState>(InitState.NONE);

  const startGame = async () => {
    setInitState(InitState.DISPLAY_LOGIN_OPTIONS);
    // const newGameManager = await GameManager.create();
    // const newGameUIManager = await GameUIManager.create(newGameManager);
    // setUIManager(newGameUIManager);
    /*
     */
  };

  const displayAccounts = () => {
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
    setInitState(InitState.DISPLAY_ACCOUNTS);
  };

  const selectAccount = (id: EthAddress) => async () => {
    const ethConnection = EthereumAccountManager.getInstance();
    ethConnection.setAccount(id);

    setInitState(InitState.FETCHING_ETH_DATA);
    if (MOCK_GAME) {
      const newGameManager = await FakeGameManager.create();
      const newGameUIManager = await GameUIManager.create(newGameManager);
      setUIManager(newGameUIManager);
    } else {
      const newGameManager = await GameManager.create();
      const newGameUIManager = await GameUIManager.create(newGameManager);
      setUIManager(newGameUIManager);
    }
    setInitState(InitState.FETCHED_ETH_DATA);
  };

  const joinGame = () => {
    uiManager?.joinGame();
  };

  // sync dependencies to initialized
  useEffect(() => {
    if (!uiManager) return;
    else setInitialized(true);
  }, [uiManager]);

  if (initState === InitState.NONE) {
    return (
      <div>
        {initialized && uiManager ? (
          <Game uiManager={uiManager} />
        ) : (
          <p onClick={startGame}>start game!</p>
        )}
      </div>
    );
  } else if (initState === InitState.DISPLAY_LOGIN_OPTIONS) {
    return (
      <div>
        <p onClick={displayAccounts}>display accounts</p>
      </div>
    );
  } else if (initState === InitState.DISPLAY_ACCOUNTS) {
    return (
      <div>
        {knownAddrs.map((addr) => (
          <p key={addr} onClick={selectAccount(addr)}>
            {addr}
          </p>
        ))}
      </div>
    );
  } else if (initState === InitState.FETCHING_ETH_DATA) {
    return (
      <div>
        <p>Fetching data...</p>
      </div>
    );
  } else if (initState === InitState.FETCHED_ETH_DATA) {
    return (
      <div>
        <p onClick={joinGame}>Join Game</p>
      </div>
    );
  }
  return <div></div>;
}
