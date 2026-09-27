import {describe,it,expect} from 'vitest';
import {selectRequestEntry,attachRequestLocator,setRequestAccess,toggleRequestFollowup,evaluateLibraryRequest,libraryRequestReadout} from './libraryRequest';
function ready(){const p:Record<string,number>={};selectRequestEntry(p,2);attachRequestLocator(p);setRequestAccess(p,1);toggleRequestFollowup(p,'retrieval');toggleRequestFollowup(p,'withdrawals');return p;}
describe('archival request slip',()=>{
 it('requires a matching dated lead, precise locator, and unresolved access work',()=>{const p=ready();expect(evaluateLibraryRequest(p).ok).toBe(true);expect(libraryRequestReadout(p).locator).toContain('02/20/1985 (1)(2)');toggleRequestFollowup(p,'withdrawals');expect(evaluateLibraryRequest(p).ok).toBe(false);});
 it('does not count an open finding-aid entry as documents reviewed online',()=>{const p=ready();setRequestAccess(p,2);expect(evaluateLibraryRequest(p).ok).toBe(false);expect(evaluateLibraryRequest(p).message).toContain('OPEN describes access');});
 it('invalidates the attached locator and access assessment after changing entries',()=>{const p=ready();selectRequestEntry(p,1);expect(libraryRequestReadout(p).locator).toBeNull();expect(libraryRequestReadout(p).access).toBeNull();expect(evaluateLibraryRequest(p).ok).toBe(false);selectRequestEntry(p,2);expect(evaluateLibraryRequest(p).ok).toBe(false);});
 it('persists a draft independently from completed research and ignores invalid selections',()=>{const p=ready();const restored=JSON.parse(JSON.stringify(p));selectRequestEntry(restored,99);expect(evaluateLibraryRequest(restored).ok).toBe(true);expect(restored.libraryResearch_v2_reagan).toBeUndefined();expect(evaluateLibraryRequest({}).ok).toBe(false);});
});
