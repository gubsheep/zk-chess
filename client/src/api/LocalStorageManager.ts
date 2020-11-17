import {BoardLocation, EthAddress} from '../_types/global/GlobalTypes';

export class LocalStorageManager {
  public static addGame(account: EthAddress, contract: EthAddress): void {
    const key = `COMMITMENTS_${account}_${contract}`;
    if (!localStorage.getItem(key)) {
      localStorage.setItem(key, JSON.stringify([]));
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

  public static saveCommitment(
    commit: string,
    loc: BoardLocation,
    salt: string,
    account: EthAddress,
    contract: EthAddress
  ): void {
    localStorage.setItem(
      `COMMIT_${account}_${contract}_${commit}`,
      JSON.stringify([loc[1], loc[0], salt])
    );

    let commitments: string[] = [];
    const allCommitmentsStr = localStorage.getItem(
      `COMMITMENTS_${account}_${contract}`
    );
    if (allCommitmentsStr) {
      commitments = JSON.parse(allCommitmentsStr) as string[];
    }
    commitments.push(`${account},${contract},${commit}`);
    commitments = [...new Set(commitments)];
    localStorage.setItem(
      `COMMITMENTS_${account}_${contract}`,
      JSON.stringify(commitments)
    );
  }

  public static getCommitment(
    commit: string,
    account: EthAddress,
    contract: EthAddress
  ): [BoardLocation, string] {
    const commitmentDataStr = localStorage.getItem(
      `COMMIT_${account}_${contract}_${commit}`
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
}
