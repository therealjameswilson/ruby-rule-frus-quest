export type RoutingNetwork = "OpenNet" | "ClassNet";

export function networkRoutingComplete(progress: Readonly<Record<string, number>>, hasNetworkStamp: boolean) {
  return Boolean(progress.networkRoutingComplete) || hasNetworkStamp;
}

export type NetworkRoutePacketId =
  | "public_research"
  | "public_proof"
  | "sbu_review"
  | "classified_review";

export interface NetworkRoutePacket {
  id: NetworkRoutePacketId;
  order: 1 | 2 | 3 | 4;
  label: string;
  shortLabel: string;
  marking: string;
  routingClue: string;
  classification: "unclassified" | "sbu" | "classified";
  network: RoutingNetwork;
  itemLabels: readonly string[];
}

export interface NetworkRouteResult {
  ok: boolean;
  packet: NetworkRoutePacket;
  destination: RoutingNetwork;
  nextStep: number;
  complete: boolean;
  leakRisk: boolean;
  message: string;
}

export const NETWORK_ROUTE_PACKETS = [
  {
    id: "public_research",
    order: 1,
    label: "Published Research",
    shortLabel: "PUBLIC",
    marking: "PUBLISHED",
    routingClue: "Already published. OpenNet carries this public research.",
    classification: "unclassified",
    network: "OpenNet",
    itemLabels: [
      "Published FRUS cross-reference research",
      "Publication status verification"
    ]
  },
  {
    id: "public_proof",
    order: 2,
    label: "Unclassified Proof",
    shortLabel: "PROOF",
    marking: "PUBLIC PROOF",
    routingClue: "This proof is unclassified and prepared for publication. Use OpenNet.",
    classification: "unclassified",
    network: "OpenNet",
    itemLabels: ["Typeset unclassified proof"]
  },
  {
    id: "sbu_review",
    order: 3,
    label: "SBU Review Folder",
    shortLabel: "SBU",
    marking: "INTERNAL REVIEW",
    routingClue: "This folder is still under internal review, not a public copy. This exercise routes it on ClassNet.",
    classification: "sbu",
    network: "ClassNet",
    itemLabels: [
      "SBU annotation sheet",
      "Excision language review"
    ]
  },
  {
    id: "classified_review",
    order: 4,
    label: "Classified Review",
    shortLabel: "CLASS",
    marking: "CLASSIFIED",
    routingClue: "The source note and its attachment are classified. Keep them on ClassNet for review.",
    classification: "classified",
    network: "ClassNet",
    itemLabels: [
      "Classified source note",
      "Codeword document review"
    ]
  }
] as const satisfies readonly NetworkRoutePacket[];

export const NETWORK_ROUTE_ITEM_TOTAL = NETWORK_ROUTE_PACKETS.reduce(
  (total, packet) => total + packet.itemLabels.length,
  0
);

export function getNetworkRoutePacket(step: number) {
  return NETWORK_ROUTE_PACKETS[
    Math.max(0, Math.min(NETWORK_ROUTE_PACKETS.length - 1, step))
  ];
}

export function networkRouteGuidance(step: number, hintOrder = 0): RoutingNetwork | null {
  if (step >= NETWORK_ROUTE_PACKETS.length) return null;
  const packet = getNetworkRoutePacket(step);
  return step === 0 || hintOrder === packet.order ? packet.network : null;
}

export function networkRoutingObjective(step: number, carried: boolean, hintOrder = 0) {
  if (step >= NETWORK_ROUTE_PACKETS.length) return "EXIT EAST - VAULT";
  const packet = getNetworkRoutePacket(step);
  return carried
    ? networkRouteGuidance(step, hintOrder)
      ? `ROUTE ${packet.order}/4: ${packet.network.toUpperCase()}`
      : `${packet.order}/4 ${packet.marking}`
    : step === 0
      ? "SORT RESEARCH FILES"
      : `RESUME ${packet.order}/4 AT SORTER`;
}

export function routedItemCount(step: number) {
  return NETWORK_ROUTE_PACKETS
    .slice(0, Math.max(0, Math.min(NETWORK_ROUTE_PACKETS.length, step)))
    .reduce((total, packet) => total + packet.itemLabels.length, 0);
}

export function routeNetworkPacket(
  step: number,
  packetId: NetworkRoutePacketId,
  destination: RoutingNetwork
): NetworkRouteResult {
  const expected = getNetworkRoutePacket(step);
  const packet = NETWORK_ROUTE_PACKETS.find((candidate) => candidate.id === packetId) ?? expected;
  const currentPacket = packet.id === expected.id;
  const correctNetwork = destination === packet.network;
  const ok = currentPacket && correctNetwork;
  const nextStep = ok ? step + 1 : step;
  const leakRisk = destination === "OpenNet" && packet.network === "ClassNet";
  return {
    ok,
    packet,
    destination,
    nextStep,
    complete: ok && nextStep >= NETWORK_ROUTE_PACKETS.length,
    leakRisk,
    message: ok
      ? `${packet.label} routed to ${destination}.`
      : currentPacket
        ? `${packet.label} belongs on ${packet.network}. Packet remains in hand.`
        : `${expected.label} is the next packet in the sorter.`
  };
}

export function networkBatchPacketAfterRoute(result: NetworkRouteResult): NetworkRoutePacket | null {
  if (result.complete) return null;
  return result.ok ? getNetworkRoutePacket(result.nextStep) : result.packet;
}
