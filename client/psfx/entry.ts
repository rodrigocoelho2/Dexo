// Pokémon Showdown battle animations (pokemon-showdown-client): engine tables MIT, move animations CC0.
import { BattleEffects, BattleOtherAnims, BattleStatusAnims } from './core';
import { BattleMoveAnims } from './moves';
import MoveTypes from './movetypes.json';
(window as any).PSAnims = { BattleEffects, BattleOtherAnims, BattleStatusAnims, BattleMoveAnims, MoveTypes };
