import {
  ContractCallArgs,
  InitializePlayerArgs,
} from '../_types/darkforest/api/ContractsAPITypes';
import {
  SnarkJSProof,
  SnarkJSProofAndSignals,
} from '../_types/global/GlobalTypes';
import { BigInteger } from 'big-integer';
import { modPBigInt, modPBigIntNative } from '../miner/mimc';
import * as bigInt from 'big-integer';

interface InitInfo {
  x: string;
  y: string;
  p: string;
  r: string;
}

interface MoveInfo {
  x1: string;
  y1: string;
  x2: string;
  y2: string;
  p2: string;
  r: string;
  distMax: string;
}

class SnarkArgsHelper {
  private readonly useMockHash: boolean;

  // private constructor() {}

  destroy(): void {
    // don't need to do anything
  }

  static create(): SnarkArgsHelper {
    const snarkArgsHelper = new SnarkArgsHelper();
    return snarkArgsHelper;
  }

  async getInitArgs(
    x: number,
    y: number,
    p: number,
    r: number
  ): Promise<InitializePlayerArgs> {
    try {
      const input: InitInfo = {
        x: modPBigInt(x).toString(),
        y: modPBigInt(y).toString(),
        p: modPBigInt(p).toString(),
        r: r.toString(),
      };

      const publicSignals: BigInteger[] = [bigInt(p), bigInt(p), bigInt(r)];
      // const publicSignals: BigInteger[] = [hash, bigInt(p), bigInt(r)];

      const snarkProof: SnarkJSProofAndSignals = await window.snarkjs.groth16.fullProve(
        input,
        '/public/circuits/init/circuit.wasm',
        '/public/init.zkey'
      );
      const ret = this.callArgsFromProofAndSignals(
        snarkProof.proof,
        publicSignals.map((x) => modPBigIntNative(x))
      ) as InitializePlayerArgs;

      return ret;
    } catch (e) {
      throw new Error('error calculating zkSNARK.');
    }
  }

  private callArgsFromProofAndSignals(
    snarkProof: SnarkJSProof,
    publicSignals: BigInteger[]
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
