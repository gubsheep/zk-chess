import { PixiManager } from "../../../api/PixiManager";
import { GAME_WIDTH, GAME_HEIGHT } from "./GameBoard";
import { PixiObject } from "../PixiObject";
import { BoardCoords } from "../PixiTypes";
import { BoardCell, CELL_W } from "./BoardCell";

const BORDER = 2;

export class GameGrid extends PixiObject {
  cells: BoardCell[][];

  width: number;
  height: number;

  constructor(manager: PixiManager) {
    super(manager);

    // make grid
    this.width = GAME_WIDTH;
    this.height = GAME_HEIGHT;

    const grid: (BoardCell | null)[][] = [...Array(this.height)].map((_e) =>
      Array(this.width).map(() => null)
    );

    for (let i = 0; i < GAME_HEIGHT; i++) {
      for (let j = 0; j < GAME_WIDTH; j++) {
        const idx: BoardCoords = { row: i, col: j };
        const x = idx.col * CELL_W + (idx.col - 1) * BORDER;
        const y = idx.row * CELL_W + (idx.row - 1) * BORDER;

        const cell = new BoardCell(manager, idx, { x, y });
        grid[i][j] = cell;
        this.addChild(cell);
      }
    }
    this.cells = grid as BoardCell[][];
  }

  getWidth() {
    return (BORDER + CELL_W) * GAME_WIDTH - BORDER;
  }

  getHeight() {
    return (BORDER + CELL_W) * GAME_HEIGHT - BORDER;
  }
}