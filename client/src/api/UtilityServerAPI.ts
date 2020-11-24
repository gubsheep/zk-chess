const isProd = process.env.NODE_ENV === 'production';
const WEBSERVER_URL = isProd
  ? 'https://dark-forest.online'
  : 'https://dark-forest.online';
import {EthAddress} from '../_types/global/GlobalTypes';

export enum EmailResponse {
  Success,
  Invalid,
  ServerError,
}

export const submitWhitelistKey = async (
  key: string,
  address: EthAddress
): Promise<string | null> => {
  try {
    const {txHash} = await fetch(`${WEBSERVER_URL}/whitelist/register`, {
      method: 'POST',
      body: JSON.stringify({
        key,
        address,
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    }).then((x) => x.json());

    return txHash;
  } catch (e) {
    console.error(`error when registering for whitelist: ${e}`);
    return null;
  }
};

export const isAddressWhitelisted = async (
  address: EthAddress
): Promise<boolean> => {
  try {
    const res = await fetch(
      `${WEBSERVER_URL}/whitelist/address/${address}/isWhitelisted`
    ).then((x) => x.json());
    return res.whitelisted;
  } catch (e) {
    console.log('Whitelist internal error, returning false.');
    console.error(e);
    return false;
  }
};

export const getGameIdForTable = async (
  tableId: string
): Promise<string | null> => {
  try {
    const {gameId} = await fetch(
      `${WEBSERVER_URL}/bote/api/${tableId}`
    ).then((x) => x.json());
    return gameId;
  } catch (e) {
    console.error(e);
    return null;
  }
};

export const setGameIdForTable = async (
  tableId: string,
  gameId: string
): Promise<boolean> => {
  try {
    const {success} = await fetch(
      `${WEBSERVER_URL}/bote/api/setGameId/${tableId}`,
      {
        method: 'POST',
        body: JSON.stringify({
          gameId,
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      }
    ).then((x) => x.json());
    return success;
  } catch (e) {
    console.error(e);
    return false;
  }
};
