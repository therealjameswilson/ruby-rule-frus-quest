import type { GameplayMapKey, OverworldRegionKey } from "../assets/registry";

export type DistrictNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export type District = {
  id: string;
  region: OverworldRegionKey;
  number: DistrictNumber;
  displayName: string;
  bounds: { x: number; y: number; w: number; h: number };
  destinationScene?: GameplayMapKey;
  locked?: boolean;
};

export const REGION_ORDER: OverworldRegionKey[] = ["europe", "pacific", "middle_east", "latin_america", "africa", "overseas_post"];

export const REGION_LABELS: Record<OverworldRegionKey, string> = {
  europe: "Cold War Europe",
  pacific: "Pacific Theater",
  middle_east: "Middle East Crossroads",
  latin_america: "Latin America",
  africa: "African Cold War Front",
  overseas_post: "Overseas Post"
};

const zone = (centerX: number, centerY: number, width = 270, height = 82) => ({
  x: Math.round(centerX - width / 2),
  y: Math.round(centerY - height / 2),
  w: width,
  h: height
});

export const DISTRICTS: District[] = [
  { id: "west_berlin", region: "europe", number: 1, displayName: "West Berlin", bounds: zone(300, 326, 300, 90), destinationScene: "west_wing" },
  { id: "paris", region: "europe", number: 2, displayName: "Paris", bounds: zone(835, 132, 260, 78), destinationScene: "frus_floor" },
  { id: "bonn", region: "europe", number: 3, displayName: "Bonn", bounds: zone(385, 112, 250, 78), destinationScene: "nara_stacks" },
  { id: "london", region: "europe", number: 4, displayName: "London", bounds: zone(292, 596, 250, 78), destinationScene: "embassy" },
  { id: "rome", region: "europe", number: 5, displayName: "Rome", bounds: zone(732, 650, 245, 78), destinationScene: "foggy_bottom" },
  { id: "vienna", region: "europe", number: 6, displayName: "Vienna", bounds: zone(760, 402, 270, 78), destinationScene: "embassy" },
  { id: "geneva", region: "europe", number: 7, displayName: "Geneva", bounds: zone(1172, 530, 260, 78), destinationScene: "historian_office" },
  { id: "iron_curtain", region: "europe", number: 8, displayName: "Iron Curtain", bounds: zone(1240, 360, 285, 84), destinationScene: "capitol_hill" },

  { id: "tokyo", region: "pacific", number: 1, displayName: "Tokyo", bounds: zone(260, 326, 255, 84), destinationScene: "embassy" },
  { id: "seoul", region: "pacific", number: 2, displayName: "Seoul", bounds: zone(1160, 101, 255, 78), destinationScene: "west_wing" },
  { id: "manila", region: "pacific", number: 3, displayName: "Manila", bounds: zone(390, 96, 255, 78), destinationScene: "embassy" },
  { id: "saigon", region: "pacific", number: 4, displayName: "Saigon", bounds: zone(282, 645, 250, 78), destinationScene: "nara_stacks" },
  { id: "beijing", region: "pacific", number: 5, displayName: "Beijing", bounds: zone(1172, 646, 260, 78), destinationScene: "west_wing" },
  { id: "hong_kong", region: "pacific", number: 6, displayName: "Hong Kong", bounds: zone(750, 672, 270, 78), destinationScene: "foggy_bottom" },
  { id: "honolulu", region: "pacific", number: 7, displayName: "Honolulu", bounds: zone(1218, 398, 270, 78), destinationScene: "historian_office" },
  { id: "guam", region: "pacific", number: 8, displayName: "Guam", bounds: zone(748, 350, 250, 78), destinationScene: "capitol_hill" },

  { id: "cairo", region: "middle_east", number: 1, displayName: "Cairo", bounds: zone(272, 448, 250, 78), destinationScene: "embassy" },
  { id: "jerusalem", region: "middle_east", number: 2, displayName: "Jerusalem", bounds: zone(878, 82, 275, 78), destinationScene: "west_wing" },
  { id: "beirut", region: "middle_east", number: 3, displayName: "Beirut", bounds: zone(390, 80, 250, 78), destinationScene: "embassy" },
  { id: "damascus", region: "middle_east", number: 4, displayName: "Damascus", bounds: zone(312, 552, 275, 78), destinationScene: "nara_stacks" },
  { id: "baghdad", region: "middle_east", number: 5, displayName: "Baghdad", bounds: zone(1132, 542, 275, 78), destinationScene: "black_vault" },
  { id: "tehran", region: "middle_east", number: 6, displayName: "Tehran", bounds: zone(750, 762, 260, 78), destinationScene: "black_vault" },
  { id: "riyadh", region: "middle_east", number: 7, displayName: "Riyadh", bounds: zone(1178, 318, 260, 78), destinationScene: "foggy_bottom" },
  { id: "suez", region: "middle_east", number: 8, displayName: "Suez", bounds: zone(738, 448, 245, 78), destinationScene: "capitol_hill" },

  { id: "mexico_city", region: "latin_america", number: 1, displayName: "Mexico City", bounds: zone(720, 122, 300, 78), destinationScene: "embassy" },
  { id: "havana", region: "latin_america", number: 2, displayName: "Havana", bounds: zone(1140, 100, 255, 78), destinationScene: "nara_stacks" },
  { id: "panama", region: "latin_america", number: 3, displayName: "Panama", bounds: zone(260, 96, 255, 78), destinationScene: "foggy_bottom" },
  { id: "bogota", region: "latin_america", number: 4, displayName: "Bogota", bounds: zone(228, 540, 255, 78), destinationScene: "embassy" },
  { id: "lima", region: "latin_america", number: 5, displayName: "Lima", bounds: zone(246, 750, 245, 78), destinationScene: "frus_floor" },
  { id: "santiago", region: "latin_america", number: 6, displayName: "Santiago", bounds: zone(694, 760, 270, 78), destinationScene: "black_vault" },
  { id: "buenos_aires", region: "latin_america", number: 7, displayName: "Buenos Aires", bounds: zone(1180, 550, 300, 78), destinationScene: "historian_office" },
  { id: "rio_de_janeiro", region: "latin_america", number: 8, displayName: "Rio de Janeiro", bounds: zone(736, 550, 330, 78), destinationScene: "capitol_hill" },

  { id: "algiers", region: "africa", number: 1, displayName: "Algiers", bounds: zone(280, 277, 265, 78), destinationScene: "nara_stacks" },
  { id: "kinshasa", region: "africa", number: 2, displayName: "Kinshasa", bounds: zone(1210, 210, 270, 78), destinationScene: "embassy" },
  { id: "lagos", region: "africa", number: 3, displayName: "Lagos", bounds: zone(750, 278, 260, 78), destinationScene: "foggy_bottom" },
  { id: "addis_ababa", region: "africa", number: 4, displayName: "Addis Ababa", bounds: zone(462, 545, 300, 78), destinationScene: "embassy" },
  { id: "nairobi", region: "africa", number: 5, displayName: "Nairobi", bounds: zone(1215, 758, 270, 78), destinationScene: "frus_floor" },
  { id: "luanda", region: "africa", number: 6, displayName: "Luanda", bounds: zone(850, 758, 255, 78), destinationScene: "black_vault" },
  { id: "pretoria", region: "africa", number: 7, displayName: "Pretoria", bounds: zone(1025, 565, 270, 78), destinationScene: "embassy" },
  { id: "cape_town", region: "africa", number: 8, displayName: "Cape Town", bounds: zone(240, 828, 285, 78), destinationScene: "capitol_hill" },

  { id: "regional_bureau", region: "overseas_post", number: 1, displayName: "Regional Bureau", bounds: zone(312, 600, 250, 150), destinationScene: "historian_office" },
  { id: "chancery", region: "overseas_post", number: 2, displayName: "Chancery", bounds: zone(1168, 256, 250, 150), destinationScene: "embassy" },
  { id: "consular_section", region: "overseas_post", number: 3, displayName: "Consular Section", bounds: zone(400, 240, 250, 150), destinationScene: "embassy" },
  { id: "pouch_room", region: "overseas_post", number: 4, displayName: "Classified Pouch Room", bounds: zone(320, 816, 250, 150), destinationScene: "nara_stacks" },
  { id: "comms_vault", region: "overseas_post", number: 5, displayName: "Communications Vault", bounds: zone(1168, 776, 250, 150), destinationScene: "black_vault" },
  { id: "ministry_liaison", region: "overseas_post", number: 6, displayName: "Foreign Ministry Liaison Office", bounds: zone(744, 840, 250, 150), destinationScene: "foggy_bottom" },
  { id: "archives_annex", region: "overseas_post", number: 7, displayName: "Records & Archives Annex", bounds: zone(1168, 552, 250, 150), destinationScene: "frus_floor" },
  { id: "marine_post", region: "overseas_post", number: 8, displayName: "Marine Security Post", bounds: zone(744, 480, 250, 150), destinationScene: "capitol_hill" }
];

export function districtsForRegion(region: OverworldRegionKey) {
  return DISTRICTS.filter((district) => district.region === region).sort((a, b) => a.number - b.number);
}

export function getDistrictById(id: string) {
  return DISTRICTS.find((district) => district.id === id) ?? null;
}
