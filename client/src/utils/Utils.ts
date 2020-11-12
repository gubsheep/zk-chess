import _ from 'lodash';
import {BoardLocation, Locatable} from '../_types/global/GlobalTypes';
import {getAdjacentTiles} from './ChessUtils';

export const getRandomTxIntentId = () => {
  const hex = '0123456789abcdef';

  let ret = '';
  for (let i = 0; i < 10; i += 1) {
    ret += hex[Math.floor(hex.length * Math.random())];
  }
  return ret;
};

export const aggregateBulkGetter = async <T>(
  total: number,
  querySize: number,
  getterFn: (startIdx: number, endIdx: number) => Promise<T[]>,
  printProgress = false
) => {
  const promises: Promise<T[]>[] = [];
  let soFar = 0;
  for (let i = 0; i < total / querySize; i += 1) {
    const start = i * querySize;
    const end = Math.min((i + 1) * querySize, total);
    promises.push(
      new Promise<T[]>(async (resolve) => {
        let res: T[] = [];
        let tries = 0;
        while (res.length === 0) {
          // retry with exponential backoff if request fails
          await new Promise<void>((resolve) => {
            setTimeout(resolve, Math.min(15, 2 ** tries - 1) * 1000);
          });
          res = await getterFn(start, end)
            .then((res) => {
              if (
                printProgress &&
                Math.floor((soFar * 20) / total) !==
                  Math.floor(((soFar + querySize) * 20) / total)
              ) {
                // print every 5%
                let _percent =
                  Math.floor(((soFar + querySize) * 20) / total) * 5;
                _percent = Math.min(_percent, 100);
              }
              soFar += querySize;
              console.log(`retrieved ${start}-${end}.`);
              return res;
            })
            .catch(() => {
              console.error(
                `error occurred querying ${start}-${end}. retrying...`
              );
              return [];
            });
          tries += 1;
        }
        resolve(res);
      })
    );
  }
  const unflattenedResults = await Promise.all(promises);
  return _.flatten(unflattenedResults);
};

export const isFirefox = () => navigator.userAgent.indexOf('Firefox') > 0;

export const isChrome = () => /Google Inc/.test(navigator.vendor);

export const isBrave = async () =>
  !!((navigator as any).brave && (await (navigator as any).brave.isBrave())); // eslint-disable-line @typescript-eslint/no-explicit-any

export const findPath = (
  from: BoardLocation,
  to: BoardLocation,
  size: number,
  obstacles: Locatable[],
  ignoreObstacles: boolean = false
): BoardLocation[] | null => {
  const distBoard: number[][] = [];
  for (let i = 0; i < size; i++) {
    distBoard.push([]);
    for (let j = 0; j < size; j++) {
      distBoard[i].push(-1);
    }
  }
  if (!ignoreObstacles) {
    for (let obstacle of obstacles) {
      distBoard[obstacle.location[1]][obstacle.location[0]] = -2;
    }
  }

  // floodfill
  distBoard[from[1]][from[0]] = 0;
  let current: BoardLocation;
  const queue: BoardLocation[] = [from];
  do {
    current = queue.shift() as BoardLocation; // else typescript mad lol
    const currentDist = distBoard[current[1]][current[0]];

    for (const loc of getAdjacentTiles(current)) {
      if (loc[0] >= size || loc[0] < 0 || loc[1] >= size || loc[1] < 0) {
        continue;
      }
      if (distBoard[loc[1]][loc[0]] === -1) {
        distBoard[loc[1]][loc[0]] = currentDist + 1;
        queue.push(loc);
      }
      if (loc[0] === to[0] && loc[1] === to[1]) {
        break;
      }
    }
  } while (queue.length > 0);

  if (distBoard[to[1]][to[0]] < 0) {
    console.log('no path between these two locations');
    return null;
  }

  // retrace path
  const path: BoardLocation[] = [];
  path.push(to);
  for (let i = distBoard[to[1]][to[0]] - 1; i > 0; i--) {
    const current = path[path.length - 1];
    for (const loc of getAdjacentTiles(current)) {
      if (
        loc[0] >= 0 &&
        loc[0] < size &&
        loc[1] >= 0 &&
        loc[1] < size &&
        distBoard[loc[1]][loc[0]] === i
      ) {
        path.push(loc);
        break;
      }
    }
  }
  return path.reverse();
};
