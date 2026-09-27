import { expect, it } from 'vitest';
import { selectRequestEntry, attachRequestLocator, setRequestAccess, toggleRequestFollowup, setRequestProvenance, logRequestRelease } from './libraryRequest';
import { classifyComparisonCard, toggleComparisonFollowup } from './libraryComparison';
import { chooseSourceNoteField, toggleSourceNoteLog } from './librarySourceNote';
import { libraryPacketReadout, togglePacketPart, evaluateLibraryPacket, fileLibraryPacket } from './libraryPacket';
function ready() {
 const p:Record<string,number>={libraryResearch_v2_reagan:3};
 selectRequestEntry(p,2);attachRequestLocator(p);setRequestAccess(p,1);toggleRequestFollowup(p,'retrieval');toggleRequestFollowup(p,'withdrawals');
 for(const [id,lane] of [[1,1],[2,2],[3,2],[4,3]])classifyComparisonCard(p,id,lane);
 toggleComparisonFollowup(p,1);toggleComparisonFollowup(p,2);
 for(const field of ['kind','date','locator','scope'] as const)chooseSourceNoteField(p,field,1);
 toggleSourceNoteLog(p,'lead');toggleSourceNoteLog(p,'followups');return p;
}
it('requires actual saved evidence as well as attachments, without granting stage credit',()=>{
 const p=ready();expect(evaluateLibraryPacket(p).ok).toBe(false);
 for(const id of [1,2,3])togglePacketPart(p,id);
 expect(evaluateLibraryPacket(p).ok).toBe(true);
 chooseSourceNoteField(p,'locator',2);
 expect(evaluateLibraryPacket(p).ok).toBe(false);expect(fileLibraryPacket(p)).toBe(false);
 chooseSourceNoteField(p,'locator',1);expect(fileLibraryPacket(p)).toBe(true);
 expect(fileLibraryPacket(p)).toBe(false);expect(p.libraryResearch_v2_reagan).toBe(3);
 const saved=JSON.stringify(p);togglePacketPart(p,1);expect(JSON.stringify(p)).toBe(saved);
 const packet=libraryPacketReadout(JSON.parse(saved));expect(packet.filed).toBe(true);
 expect(packet.parts.every(part=>part.ready&&part.attached)).toBe(true);
 expect(packet.openWork).toHaveLength(3);expect(packet.limit).toContain('not a completed chapter');
});
it('allows partial packet drafts but never treats legacy stage credit as researched evidence',()=>{
 const legacy={libraryResearch_v2_reagan:4};togglePacketPart(legacy,1);
 expect(evaluateLibraryPacket(legacy).ok).toBe(false);expect(fileLibraryPacket(legacy)).toBe(false);
 expect(libraryPacketReadout(legacy).parts.every(p=>!p.ready&&!p.attached)).toBe(true);
 const p=ready();togglePacketPart(p,2);togglePacketPart(p,99);
 const restored=JSON.parse(JSON.stringify(p));expect(libraryPacketReadout(restored).parts.map(p=>p.attached)).toEqual([false,true,false]);
 expect(evaluateLibraryPacket(restored).ok).toBe(false);
 toggleSourceNoteLog(restored,'followups');expect(libraryPacketReadout(restored).openWork).toHaveLength(3);
});

it('files Bush41 work independently and preserves unexamined holdings after filing',()=>{
 const p:Record<string,number>={libraryResearch_v2_bush41:3};
 selectRequestEntry(p,1,'bush41');attachRequestLocator(p,'bush41');setRequestAccess(p,1,'bush41');
 toggleRequestFollowup(p,'retrieval','bush41');toggleRequestFollowup(p,'withdrawals','bush41');
 for(const [id,lane] of [[1,1],[2,2],[3,1],[4,3]])classifyComparisonCard(p,id,lane,'bush41');
 toggleComparisonFollowup(p,1,'bush41');toggleComparisonFollowup(p,2,'bush41');
 for(const field of ['kind','date','locator','scope'] as const)chooseSourceNoteField(p,field,1,'bush41');
 toggleSourceNoteLog(p,'lead','bush41');toggleSourceNoteLog(p,'followups','bush41');
 for(const id of [1,2,3])togglePacketPart(p,id,'bush41');
 expect(evaluateLibraryPacket(p,'bush41').ok).toBe(true);
 chooseSourceNoteField(p,'date',2,'bush41');expect(fileLibraryPacket(p,'bush41')).toBe(false);
 chooseSourceNoteField(p,'date',1,'bush41');expect(fileLibraryPacket(p,'bush41')).toBe(true);
 const packet=libraryPacketReadout(p,'bush41');
 expect(packet.parts[2].label).toBe('Research log');expect(packet.openWork.join(' ')).toContain('Unexamined leads');
 expect(packet.parts[0].contents.join(' ')).toContain('On-site folder lead');
 expect(packet.parts[1].sources).toHaveLength(1);
 expect(libraryPacketReadout(p).filed).toBe(false);expect(evaluateLibraryPacket(p).ok).toBe(false);
 const saved=JSON.stringify(p);togglePacketPart(p,1,'bush41');expect(fileLibraryPacket(p,'bush41')).toBe(false);
 expect(JSON.stringify(p)).toBe(saved);expect(p.libraryResearch_v2_bush41).toBe(3);
});


it('requires Clinton MDR provenance and preserves examination gaps in the filed packet',()=>{
 const p:Record<string,number>={libraryResearch_v2_clinton:3};
 selectRequestEntry(p,1,'clinton');attachRequestLocator(p,'clinton');setRequestAccess(p,1,'clinton');
 toggleRequestFollowup(p,'retrieval','clinton');toggleRequestFollowup(p,'withdrawals','clinton');
 for(const [id,lane] of [[1,1],[2,2],[3,2],[4,3]])classifyComparisonCard(p,id,lane,'clinton');
 toggleComparisonFollowup(p,1,'clinton');toggleComparisonFollowup(p,2,'clinton');
 for(const field of ['kind','date','locator','scope'] as const)chooseSourceNoteField(p,field,1,'clinton');
 toggleSourceNoteLog(p,'lead','clinton');toggleSourceNoteLog(p,'followups','clinton');
 expect(evaluateLibraryPacket(p,'clinton').ok).toBe(false);
 setRequestProvenance(p,1,'clinton');for(const id of [1,2,3])togglePacketPart(p,id,'clinton');
 expect(fileLibraryPacket(p,'clinton')).toBe(true);
 const packet=libraryPacketReadout(p,'clinton');expect(packet.parts[0].label).toBe('Release record');
 expect(packet.parts[0].contents.join(' ')).toContain('Individual conversations');
 expect(packet.parts[2].label).toBe('Research log');expect(packet.openWork[0]).toContain('Unexamined release');
 expect(libraryPacketReadout(p).filed).toBe(false);expect(libraryPacketReadout(p,'bush41').filed).toBe(false);
 const saved=JSON.stringify(p);togglePacketPart(p,1,'clinton');expect(fileLibraryPacket(p,'clinton')).toBe(false);
 expect(JSON.stringify(p)).toBe(saved);expect(p.libraryResearch_v2_clinton).toBe(3);
});


it('requires Bush43 release accounting and preserves unprocessed work after filing',()=>{
 const p:Record<string,number>={libraryResearch_v2_bush43:3};
 selectRequestEntry(p,1,'bush43');attachRequestLocator(p,'bush43');setRequestAccess(p,1,'bush43');setRequestProvenance(p,1,'bush43');
 toggleRequestFollowup(p,'retrieval','bush43');toggleRequestFollowup(p,'withdrawals','bush43');
 for(const [id,lane] of [[1,1],[2,2],[3,3],[4,3]])classifyComparisonCard(p,id,lane,'bush43');
 toggleComparisonFollowup(p,1,'bush43');toggleComparisonFollowup(p,2,'bush43');
 for(const field of ['kind','date','locator','scope'] as const)chooseSourceNoteField(p,field,1,'bush43');
 toggleSourceNoteLog(p,'lead','bush43');toggleSourceNoteLog(p,'followups','bush43');
 expect(evaluateLibraryPacket(p,'bush43').ok).toBe(false);
 logRequestRelease(p,'bush43');for(const id of [1,2,3])togglePacketPart(p,id,'bush43');
 expect(fileLibraryPacket(p,'bush43')).toBe(true);
 const packet=libraryPacketReadout(p,'bush43');expect(packet.parts[0].label).toBe('Release record');
 expect(packet.parts[0].contents.join(' ')).toContain('177 released in full, 22 withheld in part, 16 withheld in full');
 expect(packet.openWork.join(' ')).toContain('unprocessed');expect(packet.parts[2].label).toBe('Research log');
 expect(libraryPacketReadout(p,'clinton').filed).toBe(false);
 const saved=JSON.stringify(p);togglePacketPart(p,1,'bush43');expect(fileLibraryPacket(p,'bush43')).toBe(false);
 expect(JSON.stringify(p)).toBe(saved);expect(p.libraryResearch_v2_bush43).toBe(3);
});
