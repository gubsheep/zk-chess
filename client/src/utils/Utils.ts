import _ from 'lodash';

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
