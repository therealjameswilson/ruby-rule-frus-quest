# DANN-E Enemy Design

This roster turns the eight existing DANN-E variant assets from PR #7/#8 into live room enemies. No extra DANN-E variants are introduced here. Each form is a fictional rogue-AI obstacle in the FRUS workflow and must be defeated with the matching human-review tool. Wrong tools may knock a form back, but they do not damage it.

| Variant | Loaded texture key | AI | Weakness | Loot |
| --- | --- | --- | --- | --- |
| DANN-E Prime | `danne-prime-humanoid` | Chase | Review Folder | 4 document points |
| DANN-E Mark I | `danne-mark-i-prototype` | Turret | Review Folder | 4 document points |
| DANN-E Colossus | `danne-colossus-final-form` | Turret | Red Pencil | 8 document points, SOP stamp, Black Vault Review Fragment |
| DANN-E Cloud Form | `danne-cloud-form` | Patrol | Citation Stamp | 6 document points |
| DANN-E Executive | `danne-executive-suit` | Chase | Review Folder | 5 document points |
| DANN-E Swarm | `danne-swarm` | Patrol | Citation Stamp | 4 document points |
| DANN-E Defeated | `danne-defeated` | Turret | Red Pencil | 2 document points |
| DANN-E Ascendant | `danne-ascendant` | Chase | Red Pencil | 10 document points, Ascendant Record Fragment |

## Room Placement

- Black Vault: Colossus, Cloud Form, Ascendant, and the Defeated false-surrender decoy. Clearing all four opens the west and north blast doors.
- NARA Stacks: Mark I and Swarm patrol the stacks as a mid-game room-clear challenge.
- Embassy Compound: Prime applies disguised shortcut pressure.
- Capitol Hill: Executive applies false-certainty pressure near hearing spaces.

## Room-Clear Loop

1. Enter a room with DANN-E pressure.
2. Identify each variant and its required FRUS counter-tool.
3. Strike with the wrong tool: the enemy is knocked back but loses no HP.
4. Strike with the correct tool: HP drops, the HP bar appears, and the enemy flashes.
5. Defeat every DANN-E enemy in the room.
6. The room-clear flag opens the vault/exit and awards any configured process stamp or FRUS volume fragment.

The Black Vault currently uses this loop to open its west and north blast doors.
