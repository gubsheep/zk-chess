import {
  ContractCallArgs,
  GhostAttackArgs,
  GhostMoveArgs,
  GhostSummonArgs,
} from '../_types/darkforest/api/ContractsAPITypes';
import {
  SnarkJSProof,
  SnarkJSProofAndSignals,
} from '../_types/global/GlobalTypes';
import {BigInteger} from 'big-integer';
import {modPBigInt} from '../hash/mimc';

class SnarkArgsHelper {
  // private constructor() {}

  destroy(): void {
    // don't need to do anything
  }

  static create(): SnarkArgsHelper {
    const snarkArgsHelper = new SnarkArgsHelper();
    return snarkArgsHelper;
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
        '/public/circuits/dist1/circuit.wasm',
        '/public/dist1.zkey'
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
        '/public/circuits/dist2/circuit.wasm',
        '/public/dist2.zkey'
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
