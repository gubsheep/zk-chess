import mimcHash from '../hash/mimc';
import {
  BoardLocation,
  CardHand,
  EthAddress,
} from '../_types/global/GlobalTypes';

export class LocalStorageManager {
  public static addGame(account: EthAddress, contract: EthAddress): void {
    const locKey = `LOC_COMMITS_${account}_${contract}`;
    if (!localStorage.getItem(locKey)) {
      localStorage.setItem(locKey, JSON.stringify([]));
    }

    const handKey = `HAND_COMMITS_${account}_${contract}`;
    if (!localStorage.getItem(handKey)) {
      localStorage.setItem(handKey, JSON.stringify([]));
    }

    let games: string[] = [];
    const allGamesStr = localStorage.getItem('ALL_GAMES');
    if (allGamesStr) {
      games = JSON.parse(allGamesStr) as string[];
    }
    games.push(`${account},${contract}`);
    games = [...new Set(games)];
    localStorage.setItem('ALL_GAMES', JSON.stringify(games));
  }

  public static saveLocCommitment(
    commit: string,
    loc: BoardLocation,
    salt: string,
    account: EthAddress,
    contract: EthAddress
  ): void {
    localStorage.setItem(
      `LOC_COMMIT_${account}_${contract}_${commit}`,
      JSON.stringify([loc[1], loc[0], salt])
    );

    let commitments: string[] = [];
    const allCommitmentsStr = localStorage.getItem(
      `LOC_COMMITS_${account}_${contract}`
    );
    if (allCommitmentsStr) {
      commitments = JSON.parse(allCommitmentsStr) as string[];
    }
    commitments.push(`${commit}`);
    commitments = [...new Set(commitments)];
    localStorage.setItem(
      `LOC_COMMITS_${account}_${contract}`,
      JSON.stringify(commitments)
    );
  }

  public static getLocCommitment(
    commit: string,
    account: EthAddress,
    contract: EthAddress
  ): [BoardLocation, string] {
    const commitmentDataStr = localStorage.getItem(
      `LOC_COMMIT_${account}_${contract}_${commit}`
    );
    if (!commitmentDataStr) throw new Error('commitment not found');
    const commitData = JSON.parse(commitmentDataStr) as [
      number,
      number,
      string
    ];
    const location: BoardLocation = [commitData[1], commitData[0]];
    const salt = commitData[2];
    return [location, salt];
  }

  public static saveSeed(
    seed: string,
    account: EthAddress,
    contract: EthAddress
  ): void {
    localStorage.setItem(`SEED_${account}_${contract}`, seed);
  }

  public static getSeed(account: EthAddress, contract: EthAddress): string {
    const seed = localStorage.getItem(`SEED_${account}_${contract}`);
    if (!seed) throw new Error('seed not found');
    return seed;
  }

  public static saveHandCommitment(
    commit: string,
    cardIds: [number, number, number],
    salt: string,
    account: EthAddress,
    contract: EthAddress
  ): void {
    localStorage.setItem(
      `HAND_COMMIT_${account}_${contract}_${commit}`,
      JSON.stringify([cardIds[0], cardIds[1], cardIds[2], salt])
    );

    let commitments: string[] = [];
    const allCommitmentsStr = localStorage.getItem(
      `HAND_COMMITS_${account}_${contract}`
    );
    if (allCommitmentsStr) {
      commitments = JSON.parse(allCommitmentsStr) as string[];
    }
    commitments.push(`${commit}`);
    commitments = [...new Set(commitments)];
    localStorage.setItem(
      `HAND_COMMITS_${account}_${contract}`,
      JSON.stringify(commitments)
    );
  }

  public static getHandCommitment(
    commit: string,
    account: EthAddress,
    contract: EthAddress
  ): CardHand {
    const commitmentDataStr = localStorage.getItem(
      `HAND_COMMIT_${account}_${contract}_${commit}`
    );
    if (!commitmentDataStr) throw new Error('commitment not found');
    const commitData = JSON.parse(commitmentDataStr) as [
      number,
      number,
      number,
      string
    ];
    const hand: [number, number, number] = [
      commitData[0],
      commitData[1],
      commitData[2],
    ];
    const salt = commitData[3];
    return {
      cards: hand,
      salt,
    };
  }
}
