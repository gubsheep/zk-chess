import React, {ChangeEvent, useEffect, useRef} from 'react';
import {useState} from 'react';
import {Wallet} from 'ethers';
import AbstractGameManager, {
  GameManagerEvent,
} from '../api/AbstractGameManager';
import EthereumAccountManager from '../api/EthereumAccountManager';
import GameManager from '../api/GameManager';
import {ContractEvent} from '../_types/darkforest/api/ContractsAPITypes';
import {EthAddress, GameStatus} from '../_types/global/GlobalTypes';
import {useParams} from 'react-router-dom';
import Game from './Game';
import styled from 'styled-components';
import {address} from '../utils/CheckedTypeUtils';
import {
  getGameIdForTable,
  isAddressWhitelisted,
  setGameIdForTable,
  submitWhitelistKey,
} from '../api/UtilityServerAPI';
import {isBrave} from '../utils/Utils';

enum InitState {
  NONE,
  DISPLAY_LOGIN_OPTIONS,
  DISPLAY_ACCOUNTS,
  ASK_WHITELIST_KEY,
  FETCHING_ETH_DATA,
  NO_GAME_AT_TABLE,
  DISPLAY_GAMES,
  GAME_SELECTED,
  WAITING_FOR_PLAYERS,
  COMPLETE,
  TERMINATED,
}

const Aa = styled.a`
  &:hover {
    text-decoration: underline;
  }
`;

export function LandingPage() {
  const {tableId} = useParams<{tableId: string}>();

  let gameManagerRef = useRef<AbstractGameManager | null>();
  const [knownAddrs, setKnownAddrs] = useState<EthAddress[]>([]);
  const [gameIds, setGameIds] = useState<string[]>([]);
  const [initState, setInitState] = useState<InitState>(
    InitState.DISPLAY_ACCOUNTS
  );
  const [wlKey, setWlKey] = useState<string>('');

  const onWlKeyChange = (e: ChangeEvent<HTMLInputElement>) => {
    setWlKey(e.target.value);
  };

  useEffect(() => {
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
  }, []);

  const selectGame = (id: string) => async () => {
    const gameManager = gameManagerRef.current;
    if (!gameManager) {
      console.log('no game manager');
      return;
    }
    console.log('there is a game manager');
    try {
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
        // if (player1.address === myAddress || player2.address === myAddress) {
        // game has started, i'm in the game
        setInitState(InitState.COMPLETE);
        // }
        // game has started but i'm not in it. don't change initstate
      }
    } catch (e) {
      setInitState(InitState.NO_GAME_AT_TABLE);
      console.error(e);
    }
  };

  const onAccountSelected = async (addr: EthAddress) => {
    setInitState(InitState.FETCHING_ETH_DATA);
    const gameManager = await GameManager.create();
    gameManagerRef.current = gameManager;
    setGameIds(gameManager.getAllGameIds());
    gameManager.on(ContractEvent.CreatedGame, () => {
      setGameIds((gameManager as GameManager).getAllGameIds());
    });
    const isWhitelisted = await isAddressWhitelisted(addr);
    if (isWhitelisted) {
      onWhitelistConfirmed();
    } else {
      setInitState(InitState.ASK_WHITELIST_KEY);
    }
  };

  const selectAccount = (id: EthAddress) => async () => {
    const ethConnection = EthereumAccountManager.getInstance();
    ethConnection.setAccount(id);
    try {
      await onAccountSelected(id);
    } catch (e) {
      console.error(e);
      setInitState(InitState.DISPLAY_ACCOUNTS);
    }
  };

  const newAccount = async () => {
    const ethConnection = EthereumAccountManager.getInstance();

    try {
      const newWallet = Wallet.createRandom();
      const newSKey = newWallet.privateKey;
      const newAddr = address(newWallet.address);
      ethConnection.addAccount(newSKey);
      ethConnection.setAccount(newAddr);
      await onAccountSelected(newAddr);
    } catch (e) {
      console.error(e);
      setInitState(InitState.DISPLAY_ACCOUNTS);
    }
  };

  const enterWhitelistKey = async () => {
    const ethConnection = EthereumAccountManager.getInstance();
    const txHash = await submitWhitelistKey(wlKey, ethConnection.getAddress());
    if (txHash) {
      onWhitelistConfirmed();
    } else {
      setWlKey('');
      setInitState(InitState.ASK_WHITELIST_KEY);
    }
  };

  const onWhitelistConfirmed = async () => {
    const gameId = await getGameIdForTable(tableId);
    if (gameId) {
      selectGame(gameId)();
    } else if (tableId) {
      setInitState(InitState.NO_GAME_AT_TABLE);
    } else {
      setInitState(InitState.DISPLAY_GAMES);
    }
  };

  // creates a fresh new game and ties it to this table
  const createGame = async () => {
    console.log('create game clicked');
    const gameManager = gameManagerRef.current;
    if (!gameManager) {
      console.log('no game manager');
      return;
    }
    const newGameId = Math.floor(Math.random() * 1000000).toString();
    await gameManager.createGame(newGameId);
    if (tableId) {
      await setGameIdForTable(tableId, newGameId);
    }
    gameManager.on(GameManagerEvent.CreatedGame, (gameId) => {
      if (gameId === newGameId) {
        selectGame(gameId)();
      }
    });
  };

  const joinGame = async () => {
    const gameManager = gameManagerRef.current;
    if (!gameManager) {
      return;
    }
    gameManager.on(GameManagerEvent.GameStart, () => {
      setInitState(InitState.COMPLETE);
    });
    gameManager.joinGame();
    setInitState(InitState.WAITING_FOR_PLAYERS);
  };

  const [brave, setBrave] = useState<boolean>(false);
  (async () => {
    setBrave(await isBrave());
  })();

  if (initState === InitState.DISPLAY_ACCOUNTS) {
    return (
      <div>
        {knownAddrs.map((addr) => (
          <p key={addr}>
            <Aa onClick={selectAccount(addr)}>{addr}</Aa>
          </p>
        ))}
        <p>
          <Aa onClick={newAccount}>Create new account</Aa>
        </p>
        {brave && (
          <p>
            Looks like you're using Brave. Please make sure you turn off Brave
            Shield, or the game may not work!
          </p>
        )}
      </div>
    );
  } else if (initState === InitState.FETCHING_ETH_DATA) {
    return (
      <div>
        <p>Fetching data...</p>
      </div>
    );
  } else if (initState === InitState.ASK_WHITELIST_KEY) {
    return (
      <div>
        <input type='text' value={wlKey} onChange={onWlKeyChange} />
        <Aa onClick={enterWhitelistKey}>go</Aa>
      </div>
    );
  } else if (initState === InitState.DISPLAY_GAMES) {
    return (
      <div>
        <p>Games List</p>
        {gameIds.map((id) => (
          <p key={id}>
            <Aa onClick={selectGame(id)}>{id}</Aa>
          </p>
        ))}
        <p>
          <Aa onClick={createGame}>New Game</Aa>
        </p>
      </div>
    );
  } else if (initState === InitState.NO_GAME_AT_TABLE) {
    return (
      <div>
        <p>
          <Aa onClick={createGame}>New Game</Aa>
        </p>
      </div>
    );
  } else if (initState === InitState.GAME_SELECTED) {
    return (
      <div>
        <Aa onClick={joinGame}>Join Game</Aa>
      </div>
    );
  } else if (initState === InitState.WAITING_FOR_PLAYERS) {
    return (
      <div>
        <p>Waiting for players...</p>
      </div>
    );
  } else if (initState === InitState.COMPLETE && gameManagerRef.current) {
    return <Game gameManager={gameManagerRef.current} />;
  }
  return <div></div>;
}
