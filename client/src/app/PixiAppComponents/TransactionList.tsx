import autoBind from 'auto-bind';
import { EventEmitter } from 'events';
import _ from 'lodash';
import React, { useEffect, useState } from 'react';
import AbstractGameManager, {
  GameManagerEvent,
} from '../../api/AbstractGameManager';
import {
  SubmittedTx,
  TxIntent,
} from '../../_types/darkforest/api/ContractsAPITypes';
import styled from 'styled-components';

const StyledTxTable = styled.div`
  width: 100%;

  display: flex;
  flex-direction: column;
`;

enum TxManagerEvent {
  ListUpdated = 'ListUpdated',
}

enum TxState {
  Init = 'INITIALIZED',
  Submit = 'SUBMITTED',
  SubmitFail = 'SUBMIT FAILED',
  Revert = 'REVERTED',
  Confirm = 'CONFIRMED',
}

type DisplayedTx =
  | { state: TxState.Init; tx: TxIntent }
  | { state: TxState.SubmitFail; tx: TxIntent }
  | { state: TxState.Submit; tx: SubmittedTx }
  | { state: TxState.Revert; tx: SubmittedTx }
  | { state: TxState.Confirm; tx: SubmittedTx };

type TxList = DisplayedTx[];

export class TransactionManager extends EventEmitter {
  static instance: TransactionManager | null;
  gameManager: AbstractGameManager;

  txList: TxList; // keyed by intent

  constructor(gameManager: AbstractGameManager) {
    super();

    this.gameManager = gameManager;
    this.txList = [];

    autoBind(this);

    gameManager.addListener(GameManagerEvent.TxInitialized, this.txInit);
    gameManager.addListener(GameManagerEvent.TxSubmitted, this.txSubmit);
    gameManager.addListener(GameManagerEvent.TxSubmitFailed, this.txSubmitFail);
    gameManager.addListener(GameManagerEvent.TxReverted, this.txRevert);
    gameManager.addListener(GameManagerEvent.TxConfirmed, this.txConfirm);

    console.log('txm initialized');
  }

  static initialize(gameManager: AbstractGameManager) {
    const txManager = new TransactionManager(gameManager);
    TransactionManager.instance = txManager;
    return txManager;
  }

  private updateTx(tx: TxIntent, state: TxState) {
    for (let i = 0; i < this.txList.length; i++) {
      if (this.txList[i].tx.txIntentId === tx.txIntentId) {
        this.txList[i] = { tx, state } as DisplayedTx;
        this.update();
        return;
      }
    }

    this.txList.push({ tx, state } as DisplayedTx);
    this.update();
  }
  private update() {
    console.log('updating');
    this.emit(TxManagerEvent.ListUpdated, this.txList);
  }

  private txInit(tx: TxIntent) {
    this.updateTx(tx, TxState.Init);
  }

  private txSubmit(tx: SubmittedTx) {
    this.updateTx(tx, TxState.Submit);
  }

  private txSubmitFail(tx: TxIntent) {
    this.updateTx(tx, TxState.SubmitFail);
  }

  private txRevert(tx: SubmittedTx) {
    this.updateTx(tx, TxState.Revert);
  }

  private txConfirm(tx: SubmittedTx) {
    this.updateTx(tx, TxState.Confirm);
  }
}

const BLOCK_EXPLORER_URL = 'https://blockscout.com/poa/xdai/tx/';

const StyledTx = styled.div<{ color: string }>`
  width: 100%;
  height: 6em;
  padding: 0.5em;
  background: #454545;
  border-radius: 3px;

  display: flex;
  flex-direction: row;
  margin-top: 0.5em;

  & .gray {
    color: #aaa;
  }

  & > div {
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: space-around;
  }

  & > div:first-child {
    width: 10em;
    align-items: center;

    border: 1px solid ${({ color }) => color};
    color: ${({ color }) => color};
    border-radius: 3px;
  }

  & > div:last-child {
    margin-left: 2em;
  }

  a:hover .link {
    text-decoration: underline;
  }
`;

function Tx({ tx: d }: { tx: DisplayedTx }) {
  return (
    <StyledTx
      key={d.tx.txIntentId}
      color={
        [TxState.SubmitFail, TxState.Revert].includes(d.state)
          ? 'red'
          : '#66cc77'
      }
    >
      <div>
        <span></span>
        <span>
          <b>{d.tx.type}</b>
        </span>
        <span>{d.state}</span>
        <span></span>
      </div>
      <div>
        <span>
          {d.tx.txIntentId} <span className='gray'>{'>>> '}</span>
          {d.state !== TxState.Init && d.state !== TxState.SubmitFail
            ? d.tx.txHash
            : 'N / A'}
        </span>
        {d.state !== TxState.Init && d.state !== TxState.SubmitFail && (
          <>
            <span>
              <a href={BLOCK_EXPLORER_URL + d.tx.txHash}>
                <span className='gray'>View Transaction</span>{' '}
                <span className='tx'>{d.tx.txHash.substring(0, 12)}</span>{' '}
                <span className='gray'>on Block Explorer</span>
              </a>
            </span>
            <span>
              <span className='gray'>Submitted at UTC</span>
              {d.tx.sentAtTimestamp}
            </span>
          </>
        )}
      </div>
    </StyledTx>
  );
}

export function TransactionList() {
  const [txList, setTxList] = useState<TxList>([]);

  // this is probably horrible but whatever
  useEffect(() => {
    if (!TransactionManager.instance) return;

    console.log('effect fired');
    const txm = TransactionManager.instance;

    const update = (list: TxList) => {
      setTxList(_.cloneDeep(list));
    };

    txm.addListener(TxManagerEvent.ListUpdated, update);

    return () => {
      txm.removeAllListeners(TxManagerEvent.ListUpdated);
    };
  }, [TransactionManager.instance]);

  return (
    <StyledTxTable>
      {txList.length === 0 && (
        <p>Make a move for transactions to be displayed here!</p>
      )}
      {txList.map((d: DisplayedTx) => (
        <Tx tx={d} key={d.tx.txIntentId} />
      ))}
    </StyledTxTable>
  );
}
