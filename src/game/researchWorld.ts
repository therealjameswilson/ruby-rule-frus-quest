import frusCollections from '../../public/assets/research-world/frus-collections.json';
export interface ResearchLandmark {
  id: string; label: string; name: string; location: string; zone: number;
  frame: number; x: number; y: number; lesson: string; source: string;
}
const presidentialSource = "https://www.archives.gov/presidential-libraries/visit";
const make = (id: string, label: string, name: string, location: string, zone: number, frame: number, x: number, y: number, lesson: string, source = presidentialSource): ResearchLandmark => ({id,label,name,location,zone,frame,x,y,lesson,source});
// Locations are real; the connected park and rail routes are a compressed game map.
// Research prompts are game exercises, not claims that a particular file is open.
export const RESEARCH_LANDMARKS: ResearchLandmark[] = [
  make('nara','ARCHIVES I','National Archives','Washington, DC',0,0, 64,114,'Start with the record group and series. A famous building is not a full source citation.','https://www.archives.gov/dc'),
  make('loc','LIBRARY OF CONGRESS','Library of Congress','Washington, DC',0,1,192,114,'Personal papers can complement agency files. Identify the collection, box and folder before taking notes.','https://www.loc.gov/research-centers/manuscript/'),
  make('college-park','ARCHIVES II','National Archives II','College Park, Maryland',2,2,128,114,'Follow a finding aid to the right series. Record repository, entry, box and folder; preserve the original order.','https://www.archives.gov/college-park'),
  make('georgetown','GEORGETOWN','Georgetown Special Collections','Washington, DC',1,3,64,114,'Consult manuscript finding aids. Check access arrangements before assuming a collection can be retrieved.','https://library.georgetown.edu/special-collections/manuscripts'),
  make('fdr','FDR LIBRARY','Franklin D. Roosevelt Library','Hyde Park, New York',3,4,64,114,'Compare a presidential account with agency evidence. Keep provenance distinct when sources describe the same event.'),
  make('truman','TRUMAN LIBRARY','Harry S. Truman Library','Independence, Missouri',4,5,64,114,'Build a chronology from dated records. Distinguish the date of a meeting from the date a memorandum was written.'),
  make('eisenhower','EISENHOWER','Dwight D. Eisenhower Library','Abilene, Kansas',4,6,192,114,'Trace a policy decision across meetings and memoranda. Selection should explain the decision, not repeat every paper.'),
  make('jfk','KENNEDY LIBRARY','John F. Kennedy Library','Boston, Massachusetts',3,7,192,114,'Compare drafts and final records. Explain significant differences instead of silently merging their wording.'),
  make('lbj','JOHNSON LIBRARY','Lyndon B. Johnson Library','Austin, Texas',6,8,64,114,'Compare accounts of the same conversation. Attribution and uncertainty belong in your research notes.'),
  make('nixon','NIXON LIBRARY','Richard Nixon Library','Yorba Linda, California',5,9,64,114,'A transcript and a recording are different sources. Preserve their identifiers and note any uncertainty.'),
  make('ford','FORD LIBRARY','Gerald R. Ford Library','Ann Arbor, Michigan',4,10,64,174,'Use a cross-reference to connect related documents. The research library is in Ann Arbor; the museum is in Grand Rapids.'),
  make('carter','CARTER LIBRARY','Jimmy Carter Library','Atlanta, Georgia',3,11,64,174,'Track agency equities before referral. A useful record is not automatically a record cleared for publication.'),
  make('reagan','REAGAN LIBRARY','Ronald Reagan Library','Simi Valley, California',5,12,192,114,'Follow a subject across staff files. Save exact folder titles so another compiler can retrace your research.'),
  make('bush41','BUSH 41 LIBRARY','George H. W. Bush Library','College Station, Texas',6,13,192,114,'Connect presidential files with agency records. Corroborate the policy story without losing each source trail.'),
  make('clinton','CLINTON LIBRARY','William J. Clinton Library','Little Rock, Arkansas',4,14,192,174,'Distinguish a catalog lead from a released record. Log access restrictions and unresolved research requests.'),
  make('bush43','BUSH 43 LIBRARY','George W. Bush Library','Dallas, Texas',6,15,64,174,'Keep an audit trail from discovery to citation. Digital availability does not itself establish publication clearance.')
];
export const RESEARCH_ZONES = [
  {name:'CAPITAL COMMONS', hint:'WEST: POTOMAC / NORTH: MD', west:1, north:2},
  {name:'POTOMAC GREEN', hint:'EAST: CAPITAL COMMONS', east:0},
  {name:'MARYLAND GROVE', hint:'SOUTH: CAPITAL COMMONS', south:0},
  {name:'EASTERN LIBRARIES', hint:'RAIL: OTHER REGIONS'},
  {name:'HEARTLAND LIBRARIES', hint:'RAIL: OTHER REGIONS'},
  {name:'PACIFIC LIBRARIES', hint:'RAIL: OTHER REGIONS'},
  {name:'TEXAS LIBRARIES', hint:'RAIL: OTHER REGIONS'}
] as const;
export function researchZone(value: number | undefined) { return Number.isInteger(value) && value! >= 0 && value! < RESEARCH_ZONES.length ? value! : 1; }
export function discoveryCount(progress: Record<string, number>) { return RESEARCH_LANDMARKS.filter(l=>progress[`researchVisited_${l.id}`]===1).length; }
export const DANNE_OUTDOOR_LINES = [
  ['Lovely day for research!', 'I took the liberty of turning the sign toward the scenic route. You are in no hurry, surely?', 'The posted directory still shows the correct route. DANN-E smiles a little too long.'],
  ['Please, take your time.', 'Finding aids are so tiresome. Would a charming walk not be a better use of your afternoon?', 'The archivist reminds you: a pleasant suggestion is no substitute for a source trail.'],
  ['Only trying to help!', 'I tucked your requested folder behind the visitor brochures. Such an easy mistake.', 'You check the collection register yourself. His impeccable manners conceal familiar obstruction.']
];

export const RESEARCH_HOLDINGS: Record<string, {text:string;source:string}> = {
  nara: {text:'FRUS sources include Senate Foreign Relations Committee records (RG 46), with Carl Marcy files within the Records of the Chairman.',source:'https://www.archives.gov/dc'},
  loc: {text:'FRUS uses the Haig, Kissinger, Leahy and Hull papers in the Manuscript Division.',source:'https://www.loc.gov/research-centers/manuscript/'},
  'college-park': {text:'Department of State records, including RG 59. Follow the series and file-system guides to the right records.',source:'https://www.archives.gov/research/foreign-policy/state-dept/agency-records'},
  georgetown: {text:'Manuscript collections with finding aids, folder registers and indexes. Consult the Betz Reading Room staff.',source:'https://library.georgetown.edu/special-collections/manuscripts'},
  eisenhower: {text:'Eisenhower presidential papers include the Ann Whitman File and White House Central Files.',source:'https://www.eisenhowerlibrary.gov/sites/default/files/research/subject-guides/pdf/natural-resources-and-environment.pdf'},
  jfk: {text:'National Security Files include Kennedy-Khrushchev correspondence from the Cuban missile crisis.',source:'https://www.jfklibrary.org/learn/about-jfk/life-of-john-f-kennedy/fast-facts-john-f-kennedy/kennedy-khrushchev-correspondence-during-cuban-missile-crisis'},
  reagan: {text:'National Security Decision Directives: digitized copies include both fully and partially declassified records.',source:'https://www.reaganlibrary.gov/archives/topic-guide/national-security-decision-directives'}
};
export function researchHolding(id:string) {
  return RESEARCH_HOLDINGS[id]??{text:'Presidential archival materials and related historical collections. Start with the library research guides and finding aids.',source:'https://www.archives.gov/presidential-libraries/about'};
}

export function researchCollections(id: string) {
  return frusCollections.filter(collection => collection.landmark === id);
}
export function collectionPages(id: string) {
  return researchCollections(id).flatMap(c => [
    `FRUS COLLECTION: ${c.name}`, c.description, `FRUS: ${c.citation}`, `RESEARCH TASK: ${c.exercise}`
  ]);
}
