import {beforeEach,describe,it,expect,vi} from 'vitest';
import type Phaser from 'phaser';
import {gameState,resetGameState} from '../game/state';
import {DANNE_VFX_ASSETS} from '../game/danneAtlas';
import {WEAPON_VFX_ASSET} from './weaponState';
import {gameplayArtReady,preloadCombatEffects,selectedAttackSheet,startWithPlayerArt} from './playerArtLoading';
const keys=[WEAPON_VFX_ASSET.key,...DANNE_VFX_ASSETS.map(a=>a.key)];
const scene=(loaded:string[])=>({textures:{exists:(key:string)=>loaded.includes(key)},scene:{start:vi.fn()},load:{spritesheet:vi.fn()}});
beforeEach(()=>resetGameState());
describe('gameplay artwork boundary',()=>{
 it('does not delay menus for combat textures',()=>{const s=scene([]);startWithPlayerArt(s as unknown as Phaser.Scene,'TitleScene');expect(s.scene.start).toHaveBeenCalledWith('TitleScene',undefined);});
 it.each(keys)('keeps gameplay gated while %s is missing',missing=>{const s=scene([...keys,selectedAttackSheet()!.key].filter(k=>k!==missing));expect(gameplayArtReady(s as unknown as Phaser.Scene)).toBe(false);startWithPlayerArt(s as unknown as Phaser.Scene,'OfficeScene');expect(s.scene.start).toHaveBeenCalledWith('PlayerArtLoadScene',{target:'OfficeScene',data:undefined});});
 it('requires effects even for a role with no custom attack sheet',()=>{gameState.playerProfile.roleId='editor';const s=scene([]);expect(selectedAttackSheet()).toBeUndefined();expect(gameplayArtReady(s as unknown as Phaser.Scene)).toBe(false);});
 it('reuses loaded effects while retrying only the absent one',()=>{const s=scene([WEAPON_VFX_ASSET.key]);preloadCombatEffects(s as unknown as Phaser.Scene);expect(s.load.spritesheet).toHaveBeenCalledTimes(DANNE_VFX_ASSETS.length);expect(s.load.spritesheet.mock.calls[0][0]).toBe(DANNE_VFX_ASSETS[0].key);});
 it('starts gameplay immediately when all required artwork is cached',()=>{const s=scene([...keys,selectedAttackSheet()!.key]);expect(gameplayArtReady(s as unknown as Phaser.Scene)).toBe(true);startWithPlayerArt(s as unknown as Phaser.Scene,'OfficeScene',{resume:true});expect(s.scene.start).toHaveBeenCalledWith('OfficeScene',{resume:true});});
});
