import * as bigInt from 'big-integer';
import mimcHash from '../hash/mimc';

export const LOCATION_ID_UB = bigInt(
  '21888242871839275222246405745257275088548364400416034343698204186575808495617'
);

export const STARTING_HAND_COMMIT = mimcHash(0, 0, 0, 0).toString();

// no slash at end plz
export const BLOCK_EXPLORER_URL = 'https://blockscout.com/poa/xdai';

export const XDAI_CHAIN_ID = 100;
