import React, { useEffect, useState } from 'react';
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

const channel = new BroadcastChannel('ls-channel');

export function useStoredState(key: StoredKey) {
  const hook = useState<boolean>(true);
  const [val, setVal] = hook;

  const lsKey = `storedstate-item-${key}`;

  // init
  useEffect(() => {
    const stored = localStorage.getItem(lsKey);
    if (stored) setVal(stored === 'true' ? true : false);
  }, [key]);

  // update
  useEffect(() => {
    console.log('effect fired');
    localStorage.setItem(lsKey, val.toString());

    console.log('posting message', { key, value: val });
    channel.postMessage({ key, value: val });
  }, [val]);

  return hook;
}

export function Controls() {
  const [music, setMusic] = useStoredState(StoredKey.Music);
  const [sound, setSound] = useStoredState(StoredKey.Sound);

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
