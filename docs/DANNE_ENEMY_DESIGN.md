# DANN-E Enemy Design

This roster turns DANN-E from static set dressing into room-clear enemies. Each enemy is a fictional rogue-AI obstacle in the FRUS workflow and must be defeated with the matching human-review tool. Wrong tools may knock the enemy back, but they do not damage it.

| Variant | Texture source | AI | Weakness | Loot |
| --- | --- | --- | --- | --- |
| Redactor Drone | `danne-pack/sprites/11_sprite_redactor_drone.png` | Patrol | Citation Stamp | 3 document points |
| Censorship Wraith | `danne-pack/sprites/12_sprite_censorship_wraith.png` | Chase | Red Pencil | 5 document points |
| DANN-E Mark I | `bosses/danne-variants/02_danne_mark_i_prototype.png` | Turret | Review Folder | 4 document points |
| DANN-E Executive | `bosses/danne-variants/05_danne_executive_suit.png` | Chase | Review Folder | 5 document points |
| Mini DANN-E | `danne-pack/bosses/sprite_dann_e.png` | Patrol | Citation Stamp | 2 document points |
| DANN-E Gate Node | `danne-pack/bosses/sprite_dann_e.png` | Turret | Red Pencil | 8 document points, SOP stamp, Black Vault Review Fragment |

## Room-Clear Loop

1. Enter a gated room.
2. Identify each DANN-E variant and its required FRUS counter-tool.
3. Strike with the wrong tool: the enemy is knocked back but loses no HP.
4. Strike with the correct tool: HP drops, the HP bar appears, and the enemy flashes.
5. Defeat every DANN-E enemy in the room.
6. The room-clear flag opens the vault/exit and awards any configured process stamp or FRUS volume fragment.

The Black Vault currently uses this loop to open its west and north blast doors.
