import {describe,it,expect} from 'vitest';
import {setRequestProvenance,logRequestRelease,selectRequestEntry,attachRequestLocator,setRequestAccess,toggleRequestFollowup,evaluateLibraryRequest,libraryRequestReadout} from './libraryRequest';
function ready(){const p:Record<string,number>={};selectRequestEntry(p,2);attachRequestLocator(p);setRequestAccess(p,1);toggleRequestFollowup(p,'retrieval');toggleRequestFollowup(p,'withdrawals');return p;}
describe('archival request slip',()=>{
 it('requires a matching dated lead, precise locator, and unresolved access work',()=>{const p=ready();expect(evaluateLibraryRequest(p).ok).toBe(true);expect(libraryRequestReadout(p).locator).toContain('02/20/1985 (1)(2)');toggleRequestFollowup(p,'withdrawals');expect(evaluateLibraryRequest(p).ok).toBe(false);});
 it('does not count an open finding-aid entry as documents reviewed online',()=>{const p=ready();setRequestAccess(p,2);expect(evaluateLibraryRequest(p).ok).toBe(false);expect(evaluateLibraryRequest(p).message).toContain('OPEN describes access');});
 it('invalidates the attached locator and access assessment after changing entries',()=>{const p=ready();selectRequestEntry(p,1);expect(libraryRequestReadout(p).locator).toBeNull();expect(libraryRequestReadout(p).access).toBeNull();expect(evaluateLibraryRequest(p).ok).toBe(false);selectRequestEntry(p,2);expect(evaluateLibraryRequest(p).ok).toBe(false);});
 it('persists a draft independently from completed research and ignores invalid selections',()=>{const p=ready();const restored=JSON.parse(JSON.stringify(p));selectRequestEntry(restored,99);expect(evaluateLibraryRequest(restored).ok).toBe(true);expect(restored.libraryResearch_v2_reagan).toBeUndefined();expect(evaluateLibraryRequest({}).ok).toBe(false);});
});
it('keeps requests from different repositories independent and uses actual file-unit IDs',()=>{
 const p=ready();selectRequestEntry(p,1,'bush41');attachRequestLocator(p,'bush41');setRequestAccess(p,1,'bush41');toggleRequestFollowup(p,'retrieval','bush41');toggleRequestFollowup(p,'withdrawals','bush41');
 expect(evaluateLibraryRequest(p,'bush41').ok).toBe(true);expect(evaluateLibraryRequest(p).ok).toBe(true);
 expect(libraryRequestReadout(p,'bush41').locator).toContain('CF00715-001');expect(libraryRequestReadout(p,'bush41').locator).toContain('470424829');
 selectRequestEntry(p,2,'bush41');expect(evaluateLibraryRequest(p,'bush41').ok).toBe(false);expect(evaluateLibraryRequest(p).ok).toBe(true);
 setRequestAccess(p,2,'bush41');selectRequestEntry(p,1,'bush41');attachRequestLocator(p,'bush41');setRequestAccess(p,2,'bush41');expect(evaluateLibraryRequest(p,'bush41').message).toContain('On Site');
 expect(evaluateLibraryRequest(p,'unknown').ok).toBe(false);
});
it.each(['clinton','bush43'])('keeps %s release provenance and examination gaps separate from completion',library=>{
 const p:Record<string,number>={};selectRequestEntry(p,1,library);attachRequestLocator(p,library);setRequestAccess(p,1,library);toggleRequestFollowup(p,'retrieval',library);toggleRequestFollowup(p,'withdrawals',library);
 expect(evaluateLibraryRequest(p,library).ok).toBe(false);
 setRequestProvenance(p,2,library);expect(evaluateLibraryRequest(p,library).ok).toBe(false);
 setRequestProvenance(p,1,library);
 if(library==='bush43'){expect(evaluateLibraryRequest(p,library).ok).toBe(false);logRequestRelease(p,library);expect(libraryRequestReadout(p,library).releaseLogged).toBe(true);}
 expect(evaluateLibraryRequest(p,library).ok).toBe(true);expect(libraryRequestReadout(p,library).access).toContain('not-reviewed');
 expect(p['libraryResearch_v2_'+library]).toBeUndefined();setRequestAccess(p,2,library);expect(evaluateLibraryRequest(p,library).ok).toBe(false);
});
