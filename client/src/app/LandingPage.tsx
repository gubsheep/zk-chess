import React from 'react';
import { useState } from 'react';
import AbstractGameManager, {
  GameManagerEvent,
} from '../api/AbstractGameManager';
import EthereumAccountManager from '../api/EthereumAccountManager';
import GameManager from '../api/GameManager';
import { ContractEvent } from '../_types/darkforest/api/ContractsAPITypes';
import { EthAddress, GameStatus } from '../_types/global/GlobalTypes';

enum InitState {
  NONE,
  DISPLAY_LOGIN_OPTIONS,
  DISPLAY_ACCOUNTS,
  FETCHING_ETH_DATA,
  FETCHED_ETH_DATA,
  DISPLAY_GAMES,
  GAME_SELECTED,
  WAITING_FOR_PLAYERS,
  COMPLETE,
  TERMINATED,
}

export function LandingPage() {
  const [gameManager, setGameManager] = useState<AbstractGameManager | null>(
    null
  );
  const [knownAddrs, setKnownAddrs] = useState<EthAddress[]>([]);
  const [gameIds, setGameIds] = useState<string[]>([]);
  const [initState, setInitState] = useState<InitState>(InitState.NONE);

  const startGame = async () => {
    console.log('started game');

    setInitState(InitState.DISPLAY_LOGIN_OPTIONS);
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
    let newGameManager: AbstractGameManager;
    newGameManager = await GameManager.create();
    setGameManager(newGameManager);
    setGameIds(newGameManager.getAllGameIds());
    newGameManager.on(ContractEvent.CreatedGame, () => {
      setGameIds(newGameManager.getAllGameIds());
    });
    setInitState(InitState.DISPLAY_GAMES);
  };

  const selectGame = (id: string) => async () => {
    if (!gameManager) {
      return;
    }
    await gameManager.setGame(id);
    const {
      myAddress,
      player1,
      player2,
      gameStatus,
    } = gameManager.getGameState();
    if (gameStatus === GameStatus.WAITING_FOR_PLAYERS) {
      if (player1.address === myAddress || player2.address === myAddress) {
        // i'm in the game, but game hasn't started
        setInitState(InitState.WAITING_FOR_PLAYERS);
      } else {
        // i'm not in the game yet, game is waiting for players, i can join
        setInitState(InitState.GAME_SELECTED);
      }
    } else {
      if (player1.address === myAddress || player2.address === myAddress) {
        // game has started, i'm in the game
        setInitState(InitState.COMPLETE);
      }
      // game has started but i'm not in it. don't change initstate
    }
  };

  const createGame = async () => {
    console.log('create game clicked');
    if (!gameManager) {
      console.log('no game manager');
      return;
    }
    await gameManager.createGame();
  };

  const joinGame = async () => {
    if (!gameManager) {
      return;
    }
    gameManager.on(GameManagerEvent.GameStart, () => {
      setInitState(InitState.COMPLETE);
    });
    gameManager.joinGame();
    setInitState(InitState.WAITING_FOR_PLAYERS);
  };

  if (initState === InitState.NONE) {
    return (
      <div>
        <p onClick={startGame}>start game!</p>
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
  } else if (initState === InitState.DISPLAY_GAMES) {
    return (
      <div>
        <p>Games List</p>
        {gameIds.map((id) => (
          <p key={id} onClick={selectGame(id)}>
            {id}
          </p>
        ))}
        <p onClick={createGame}>New Game</p>
      </div>
    );
  } else if (initState === InitState.GAME_SELECTED) {
    return (
      <div>
        <p onClick={joinGame}>Join Game</p>
      </div>
    );
  } else if (initState === InitState.WAITING_FOR_PLAYERS) {
    return (
      <div>
        <p>Waiting for players...</p>
      </div>
    );
  } else if (initState === InitState.COMPLETE && gameManager) {
    return (
      <></>
      // <ZKChessStateProvider gameManager={gameManager}>
      //   {/* <Game /> */}
      // </ZKChessStateProvider>
    );
  }
  return <div></div>;
}
