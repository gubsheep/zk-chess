import {
  CardDrawArgs,
  CardPlayArgs,
  ContractCallArgs,
  GhostAttackArgs,
  GhostMoveArgs,
  GhostSummonArgs,
} from '../_types/darkforest/api/ContractsAPITypes';
import {
  CardHand,
  SnarkJSProof,
  SnarkJSProofAndSignals,
} from '../_types/global/GlobalTypes';
import {BigInteger} from 'big-integer';
import mimcHash, {modPBigInt} from '../hash/mimc';

class SnarkArgsHelper {
  // private constructor() {}

  destroy(): void {
    // don't need to do anything
  }

  static create(): SnarkArgsHelper {
    const snarkArgsHelper = new SnarkArgsHelper();
    return snarkArgsHelper;
  }

  async getDrawCardProof(
    oldHand: CardHand,
    drawnCard: number,
    newSalt: string,
    atHandIndex: number,
    seed: string,
    lastTurnTimestamp: number
  ): Promise<CardDrawArgs> {
    try {
      const newCards = [...oldHand.cards];
      newCards[atHandIndex] = drawnCard;
      const input = {
        a: oldHand.cards[0].toString(),
        b: oldHand.cards[1].toString(),
        c: oldHand.cards[2].toString(),
        d: drawnCard.toString(),
        w: newCards[0].toString(),
        x: newCards[1].toString(),
        y: newCards[2].toString(),
        z: oldHand.cards[atHandIndex].toString(),
        seed: seed.toString(),
        salt1: oldHand.salt,
        salt2: newSalt,
        drawSalt: lastTurnTimestamp.toString(),
      };
      const snarkProof: SnarkJSProofAndSignals = await window.snarkjs.groth16.fullProve(
        input,
        '/bote/public/circuits/draw/circuit.wasm',
        '/bote/public/draw.zkey'
      );
      const ret = this.callArgsFromProofAndSignals(
        snarkProof.proof,
        snarkProof.publicSignals
      ) as CardDrawArgs;
      return ret;
    } catch (e) {
      console.error(e);
      throw new Error('error calculating zkSNARK.');
    }
  }

  async getPlayCardProof(
    oldHand: CardHand,
    playedCardIdx: number,
    newSalt: string
  ): Promise<CardPlayArgs> {
    try {
      const newCards = [...oldHand.cards];
      newCards[playedCardIdx] = 0;
      const input = {
        a: oldHand.cards[0].toString(),
        b: oldHand.cards[1].toString(),
        c: oldHand.cards[2].toString(),
        w: newCards[0].toString(),
        x: newCards[1].toString(),
        y: newCards[2].toString(),
        salt1: oldHand.salt,
        salt2: newSalt,
        z: oldHand.cards[playedCardIdx].toString(),
      };
      const snarkProof: SnarkJSProofAndSignals = await window.snarkjs.groth16.fullProve(
        input,
        '/bote/public/circuits/play/circuit.wasm',
        '/bote/public/play.zkey'
      );
      const ret = this.callArgsFromProofAndSignals(
        snarkProof.proof,
        snarkProof.publicSignals
      ) as CardPlayArgs;
      return ret;
    } catch (e) {
      console.error(e);
      throw new Error('error calculating zkSNARK.');
    }
  }

  async getSummonProof(
    r1: number,
    c1: number,
    salt1: string,
    r2: number,
    c2: number,
    dist: number,
    nRows: number,
    nCols: number
  ): Promise<GhostSummonArgs> {
    try {
      const input = {
        r1: modPBigInt(r1).toString(),
        c1: modPBigInt(c1).toString(),
        salt1: modPBigInt(salt1).toString(),
        r2: modPBigInt(r2).toString(),
        c2: modPBigInt(c2).toString(),
        dist: dist.toString(),
        nrows: nRows.toString(),
        ncols: nCols.toString(),
      };

      const snarkProof: SnarkJSProofAndSignals = await window.snarkjs.groth16.fullProve(
        input,
        '/bote/public/circuits/dist1/circuit.wasm',
        '/bote/public/dist1.zkey'
      );
      const ret = this.callArgsFromProofAndSignals(
        snarkProof.proof,
        snarkProof.publicSignals
      ) as GhostSummonArgs;
      return ret;
    } catch (e) {
      console.error(e);
      throw new Error('error calculating zkSNARK.');
    }
  }

  async getMoveProve(
    r1: number,
    c1: number,
    salt1: string,
    r2: number,
    c2: number,
    salt2: string,
    dist: number,
    nRows: number,
    nCols: number
  ): Promise<GhostMoveArgs> {
    try {
      const input = {
        r1: modPBigInt(r1).toString(),
        c1: modPBigInt(c1).toString(),
        salt1: modPBigInt(salt1).toString(),
        r2: modPBigInt(r2).toString(),
        c2: modPBigInt(c2).toString(),
        salt2: modPBigInt(salt2).toString(),
        dist: dist.toString(),
        nrows: nRows.toString(),
        ncols: nCols.toString(),
      };

      const snarkProof: SnarkJSProofAndSignals = await window.snarkjs.groth16.fullProve(
        input,
        '/bote/public/circuits/dist2/circuit.wasm',
        '/bote/public/dist2.zkey'
      );
      const ret = this.callArgsFromProofAndSignals(
        snarkProof.proof,
        snarkProof.publicSignals
      ) as GhostMoveArgs;
      return ret;
    } catch (e) {
      console.error(e);
      throw new Error('error calculating zkSNARK.');
    }
  }

  async getAttackProof(
    r1: number,
    c1: number,
    salt1: string,
    r2: number,
    c2: number,
    dist: number,
    nRows: number,
    nCols: number
  ): Promise<GhostAttackArgs> {
    return this.getSummonProof(r1, c1, salt1, r2, c2, dist, nRows, nCols);
  }

  private callArgsFromProofAndSignals(
    snarkProof: SnarkJSProof,
    publicSignals: (BigInteger | string)[]
  ): ContractCallArgs {
    // the object returned by genZKSnarkProof needs to be massaged into a set of parameters the verifying contract
    // will accept
    return [
      snarkProof.pi_a.slice(0, 2), // pi_a
      // genZKSnarkProof reverses values in the inner arrays of pi_b
      [snarkProof.pi_b[0].reverse(), snarkProof.pi_b[1].reverse()], // pi_b
      snarkProof.pi_c.slice(0, 2), // pi_c
      publicSignals.map((signal) => signal.toString(10)), // input
    ];
  }
}

export default SnarkArgsHelper;
