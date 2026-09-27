import {EventEmitter} from 'node:events';
import type Phaser from 'phaser';
import {beforeEach,afterEach,it,expect,vi} from 'vitest';
import {installBootProgress,BOOT_STALL_MS} from './bootProgress';
let load:EventEmitter,events:EventEmitter,nodes:Record<string,any>,failed:()=>boolean;
beforeEach(()=>{
 vi.useFakeTimers();load=new EventEmitter();events=new EventEmitter();nodes={};
 for(const id of ['boot-loader','boot-loader-bar','boot-loader-text','boot-loader-retry'])nodes[id]={dataset:{},style:{},hidden:true,textContent:'',setAttribute:vi.fn(),querySelector:()=>({style:{}}),addEventListener:vi.fn(),removeEventListener:vi.fn()};
 vi.stubGlobal('document',{getElementById:(id:string)=>nodes[id]});vi.stubGlobal('window',{setInterval,clearInterval,location:{reload:vi.fn()}});
 failed=installBootProgress({load,events} as unknown as Phaser.Scene);
});
afterEach(()=>{events.emit('shutdown');vi.useRealTimers();vi.unstubAllGlobals();});
it('offers retry for a stall without failing the load, then clears it on progress',()=>{
 vi.advanceTimersByTime(BOOT_STALL_MS);expect(nodes['boot-loader'].dataset.state).toBe('waiting');expect(nodes['boot-loader-retry'].hidden).toBe(false);expect(failed()).toBe(false);
 load.emit('progress',.5);expect(nodes['boot-loader'].dataset.state).toBe('loading');expect(nodes['boot-loader-retry'].hidden).toBe(true);
 load.emit('complete');vi.advanceTimersByTime(BOOT_STALL_MS*2);expect(nodes['boot-loader-text'].textContent).toContain('Preparing');expect(failed()).toBe(false);
});
it('keeps an actual load failure visible even if other files finish',()=>{
 load.emit('loaderror');load.emit('progress',1);load.emit('complete');vi.advanceTimersByTime(BOOT_STALL_MS*2);expect(failed()).toBe(true);expect(nodes['boot-loader'].dataset.state).toBe('error');expect(nodes['boot-loader-retry'].hidden).toBe(false);
});
it('resets the stall interval even when file progress rounds to the same percent',()=>{
 vi.advanceTimersByTime(14000);load.emit('progress',.001);vi.advanceTimersByTime(14000);expect(nodes['boot-loader'].dataset.state).toBe('loading');events.emit('shutdown');expect(vi.getTimerCount()).toBe(0);expect(load.listenerCount('progress')).toBe(0);expect(nodes['boot-loader-retry'].removeEventListener).toHaveBeenCalled();
});
