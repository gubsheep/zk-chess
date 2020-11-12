import {
  BoardLocation,
  ChessGame,
  ChessGameContractData,
  EthAddress,
  GameAction,
  GameStatus,
  isZKPiece,
  Piece,
  PieceStatDefaults,
  PieceType,
  Player,
} from '../_types/global/GlobalTypes';

export class GameState {
  gameAddress: EthAddress;
  gameId: string;

  myAddress: EthAddress;
  player1: Player;
  player2: Player;

  player1Mana: number;
  player2Mana: number;

  pieces: Piece[];
  pieceById: Map<number, Piece>;
  defaults: Map<PieceType, PieceStatDefaults>;
  gameActions: GameAction[];

  turnNumber: number;
  sequenceNumber: number;
  gameStatus: GameStatus;

  constructor(game: ChessGameContractData) {
    this.gameActions = [];

    this.update(game);
  }

  public update(contractData: ChessGameContractData) {
    this.gameId = contractData.gameId;
    this.myAddress = contractData.myAddress;
    this.player1 = contractData.player1;
    this.player2 = contractData.player2;
    this.player1Mana = contractData.player1Mana;
    this.player2Mana = contractData.player2Mana;
    this.defaults = contractData.defaults;
    this.turnNumber = contractData.turnNumber;
    this.sequenceNumber = contractData.sequenceNumber;
    this.gameStatus = contractData.gameStatus;

    this.pieces = [];
    this.pieceById = new Map<number, Piece>();

    for (let i = 0; i < contractData.pieces.length; i++) {
      let contractPiece = contractData.pieces[i];
      const defaultsForPiece = contractData.defaults.get(
        contractPiece.pieceType
      );
      if (!defaultsForPiece) continue;
      let piece: Piece = {
        ...contractPiece,
        mvRange: defaultsForPiece.mvRange,
        atkRange: defaultsForPiece.atkRange,
        atk: defaultsForPiece.atk,
        kamikaze: defaultsForPiece.kamikaze,
      };
      if (isZKPiece(piece)) {
        const commitment = piece.commitment;
        const commitmentDataStr = localStorage.getItem(`COMMIT_${commitment}`);
        if (commitmentDataStr) {
          const commitData = JSON.parse(commitmentDataStr) as [
            number,
            number,
            string
          ];
          const location: BoardLocation = [commitData[1], commitData[0]];
          const salt = commitData[2];
          const knownPiece = {
            ...piece,
            location,
            salt,
          };
          // zk piece with known location
          piece = knownPiece;
        }
      }
      this.pieces.push(piece);
      this.pieceById.set(piece.id, piece);
    }
  }

  public addGameAction(action: GameAction) {
    if (
      action.fromLocalData ||
      !this.gameActions[action.sequenceNumber]?.fromLocalData
    ) {
      this.gameActions[action.sequenceNumber] = action;
    }
  }

  public getGameState(): ChessGame {
    return {
      gameAddress: this.gameAddress,
      gameId: this.gameId,
      myAddress: this.myAddress,
      player1: this.player1,
      player2: this.player2,
      player1Mana: this.player1Mana,
      player2Mana: this.player2Mana,
      pieces: this.pieces,
      pieceById: this.pieceById,
      defaults: this.defaults,
      turnNumber: this.turnNumber,
      sequenceNumber: this.sequenceNumber,
      gameStatus: this.gameStatus,
    };
  }
}
