import React, { useEffect, useLayoutEffect, useState } from 'react';
import { useBeforeunload } from 'react-beforeunload';
import styled from 'styled-components';

export enum StoredKey {
  Music = 'Music',
  Sound = 'Sound',
}

const StyledControls = styled.div`
  font-size: 14pt;

  position: absolute;
  left: 0.5em;
  top: 0.5em;

  z-index: 5;
  color: white;
`;

export const sessionId: () => string = (() => {
  const id = 'ls-channel' + Date.now() + '-' + Math.random();
  return () => {
    return id;
  };
})();

const channel = new BroadcastChannel(sessionId());

export function useStoredState(key: StoredKey) {
  const hook = useState<boolean>(false);
  const [val, setVal] = hook;

  const lsKey = `storedstate-item-${key}`;

  // init
  useLayoutEffect(() => {
    console.log('firing init effect!');
    const stored = localStorage.getItem(lsKey);
    if (stored) setVal(stored === 'true' ? true : false);
    else setVal(true);
  }, [key]);

  // update
  useLayoutEffect(() => {
    console.log('posting message', { key, value: val });
    channel.postMessage({ key, value: val });
  }, [val]);

  return hook;
}

export function Controls() {
  const [music, setMusic] = useStoredState(StoredKey.Music);
  const [sound, setSound] = useStoredState(StoredKey.Sound);

  useBeforeunload(() => {
    console.log('unloading!');
    for (const key in StoredKey) {
      console.log(key);
      const lsKey = `storedstate-item-${key}`;
      let val = music;
      if (key === StoredKey.Sound) val = sound;
      localStorage.setItem(lsKey, val.toString());
    }
  });

  return (
    <StyledControls>
      <div>
        <input
          type={'checkbox'}
          checked={music}
          onChange={(e) => setMusic(e.target.checked)}
        />{' '}
        Music
      </div>
      <div>
        <input
          type={'checkbox'}
          checked={sound}
          onChange={(e) => setSound(e.target.checked)}
        />{' '}
        Sound
      </div>
    </StyledControls>
  );
}
