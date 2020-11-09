import {
  ContractCallArgs,
  GhostMoveArgs,
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

  async getGhostMoveProof(
    x1: number,
    y1: number,
    salt1: string,
    x2: number,
    y2: number,
    salt2: string
  ): Promise<GhostMoveArgs> {
    try {
      const input = {
        x1: modPBigInt(x1).toString(),
        y1: modPBigInt(y1).toString(),
        salt1: modPBigInt(salt1).toString(),
        x2: modPBigInt(x2).toString(),
        y2: modPBigInt(y2).toString(),
        salt2: modPBigInt(salt2).toString(),
      };

      const snarkProof: SnarkJSProofAndSignals = await window.snarkjs.groth16.fullProve(
        input,
        '/public/circuits/move/circuit.wasm',
        '/public/move.zkey'
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
