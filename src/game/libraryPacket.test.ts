import { expect, it } from 'vitest';
import { selectRequestEntry, attachRequestLocator, setRequestAccess, toggleRequestFollowup } from './libraryRequest';
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
