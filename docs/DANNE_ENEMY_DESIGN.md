# DANN-E Enemy Design

This roster turns the eight existing DANN-E variant assets from PR #7/#8 into live room enemies. No extra DANN-E variants are introduced here. Each form is a fictional rogue-AI obstacle in the FRUS workflow and must be defeated with the matching human-review tool. Wrong tools may knock a form back, but they do not damage it.

| Variant | Loaded texture key | AI | Weakness | HP | Speed | Damage | Risk tier | Loot |
| --- | --- | --- | --- | ---: | ---: | ---: | --- | --- |
| DANN-E Prime | `danne-prime-humanoid` | Chase | Review Folder | 3 | 18 | 5 | Guarded / 2 | 4 document points |
| DANN-E Mark I | `danne-mark-i-prototype` | Turret | Review Folder | 2 | 0 | 4 | Low / 1 | 4 document points |
| DANN-E Colossus | `danne-colossus-final-form` | Turret | Red Pencil | 6 | 0 | 8 | Severe / 5 | 8 document points, SOP stamp, Black Vault Review Fragment |
| DANN-E Cloud Form | `danne-cloud-form` | Patrol | Citation Stamp | 4 | 24 | 7 | High / 4 | 6 document points |
| DANN-E Executive | `danne-executive-suit` | Chase | Review Folder | 4 | 20 | 6 | Elevated / 3 | 5 document points |
| DANN-E Swarm | `danne-swarm` | Patrol | Citation Stamp | 2 | 22 | 3 | Low / 1 | 4 document points |
| DANN-E Defeated | `danne-defeated` | Turret | Red Pencil | 2 | 0 | 5 | Elevated / 3 | 2 document points |
| DANN-E Ascendant | `danne-ascendant` | Chase | Red Pencil | 7 | 25 | 9 | Severe / 5 | 10 document points, Ascendant Record Fragment |

## Room Placement

- Black Vault: Colossus, Cloud Form, Ascendant, and the Defeated false-surrender decoy. Clearing all four opens the west and north blast doors.
- NARA Stacks: Mark I and Swarm patrol the stacks as a mid-game room-clear challenge.
- Embassy Compound: Prime applies disguised shortcut pressure.
- Capitol Hill: Executive applies false-certainty pressure near hearing spaces.

## Difficulty Curve

The live room graph ramps DANN-E pressure by reliability risk, not only by enemy count. Earlier rooms keep HP low and damage forgiving so the player can learn tool-specific counters. Later rooms increase HP, chase speed, and Ego-bolt damage, and the HUD surfaces a `RELIABILITY RISK` warning whenever an active tier-4 or tier-5 enemy is present.

| Room | Variants | Rationale |
| --- | --- | --- |
| NARA Stacks | Mark I, Swarm | First DANN-E room-clear lesson. Mark I is stationary and Swarm is quick but fragile; both are low-risk and teach Review Folder/Citation Stamp counters without heavy reliability loss. |
| Embassy Compound | Prime | Mid-early disguised shortcut pressure. Prime has one extra HP over the NARA variants and moderate chase speed, making the Review Folder counter matter without overwhelming the player. |
| Capitol Hill | Executive | Late-mid hearing pressure. Executive has elevated HP, speed, and damage to make false certainty feel more dangerous before the player reaches the vault. |
| Black Vault | Cloud Form, Colossus, Defeated Decoy, Ascendant | Final miniboss room. Cloud introduces high-risk source-trail blur, Colossus and Ascendant are severe tier-5 checks, and the Defeated decoy prevents the final room from being solved by reading labels alone. |

## Room-Clear Loop

1. Enter a room with DANN-E pressure.
2. Identify each variant and its required FRUS counter-tool.
3. Strike with the wrong tool: the enemy is knocked back but loses no HP.
4. Strike with the correct tool: HP drops, the HP bar appears, and the enemy flashes.
5. Defeat every DANN-E enemy in the room.
6. The room-clear flag opens the vault/exit and awards any configured process stamp or FRUS volume fragment.

The Black Vault currently uses this loop to open its west and north blast doors.
