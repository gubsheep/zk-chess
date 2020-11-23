import * as PIXI from 'pixi.js';
import { InitState } from '../../../api/GameAPI';
import { GameZIndex, PixiManager } from '../../../api/PixiManager';
import { PlayerName } from '../@PixiTypes';
import { PixiObject, Wrapper } from '../PixiObject';
import { CHAR_H, LINE_SPACING } from '../Utils/FontLoader';
import { TextObject } from '../Utils/TextObject';
import { JoinGame } from './InitButtons/JoinGame';

const INIT_W = 150;
const INIT_H = 70;

export class InitOverlay extends PixiObject {
  join: JoinGame;
  awaiting: TextObject;

  constructor(manager: PixiManager) {
    super(manager, GameZIndex.GameOver);

    const modalBg = new PIXI.Graphics();
    modalBg.beginFill(0x333388, 0.8);
    modalBg.lineStyle(1, 0x99ccff, 1);
    modalBg.drawRoundedRect(0, 0, INIT_W, INIT_H, 2);
    modalBg.endFill();
    const modalContainer = new PIXI.Container();
    modalContainer.addChild(modalBg);
    const modalWrapper = new Wrapper(manager, modalContainer);

    const { playerName } = manager;

    let otherName = PlayerName.Bob;
    if (playerName === PlayerName.Bob) otherName = PlayerName.Alice;

    const text = new Wrapper(manager, new PIXI.Container());
    const welcome = new TextObject(manager, `Welcome ${playerName}`);
    const join = new JoinGame(manager);
    const awaiting = new TextObject(manager, `Awaiting ${otherName}...`);

    [awaiting, join].forEach((el) => {
      el.setPosition({ y: 2 * (CHAR_H + LINE_SPACING), x: 0 });
    });

    this.join = join;
    this.awaiting = awaiting;

    text.addChild(welcome, join, awaiting);

    text.setPosition({ x: 5, y: 5 });
    this.addChild(modalWrapper);
    this.addChild(text);

    this.positionSelf();
  }

  positionSelf() {
    const { width, height } = this.manager.renderer;
    this.setPosition({
      x: 0.5 * (width - INIT_W),
      y: 0.5 * (height - INIT_H),
    });
  }

  loop() {
    super.loop();

    const state = this.manager.api.getInitState();

    this.join.setActive(false);
    this.awaiting.setActive(false);

    if (state === InitState.NotJoined) this.join.setActive(true);
    else if (state === InitState.WaitingForPlayers)
      this.awaiting.setActive(true);
    /* gamestarted */ else this.setActive(false);
  }
}
