import {describe,it,expect} from 'vitest';
import {isNaraVisit,naraScoutUrl} from './naraScout';
describe('NARA Scout handoff',()=>{
 it('uses the supported permalink contract without assigning a topic',()=>{
  const url=new URL(naraScoutUrl()),p=new URLSearchParams(url.hash.slice(1));
  expect(url.origin+url.pathname).toBe('https://therealjameswilson.github.io/nara-scout/');
  expect(p.get('from')).toBe('1989');expect(p.get('to')).toBe('2001');
  expect(p.get('scope')).toBe('bush41,clinton');expect(p.has('q')).toBe(false);
 });
 it('encodes query text as data',()=>{expect(new URLSearchParams(new URL(naraScoutUrl('arms & control #1')).hash.slice(1)).get('q')).toBe('arms & control #1');});
 it('belongs to both NARA stops',()=>{expect(isNaraVisit('nara')).toBe(true);expect(isNaraVisit('college-park')).toBe(true);expect(isNaraVisit('loc')).toBe(false);});
});
