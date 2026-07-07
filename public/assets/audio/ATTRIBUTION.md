# Audio Attribution

The game stores public-domain MIDI clips for provenance and uses short, simplified Web Audio motifs derived from them during play.

The in-game `Eerie Bach Fugue` theme is a repo-local Web Audio arrangement that combines simplified note material from the public-domain Bach MIDI sources below with original low pedal and counterline programming. It does not use any copyrighted recording.

## MIDI Sources

- `midi/bach-contrapunctus-i.mid`
  - Work: J. S. Bach, `Die Kunst der Fuge, Contrapunctus I`, BWV 1080.
  - Source: The Mutopia Project.
  - Rights note: Mutopia lists this item as `Copyright: Public Domain` and `CC: No rights reserved`.
  - Page: https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=693

- `midi/bach-chromatic-fantasy-bwv903.mid`
  - Work: J. S. Bach, `Chromatic Fantasy and Fugue, BWV 903 (Fantasy)`.
  - Source: The Mutopia Project.
  - Rights note: Mutopia lists this item as `Copyright: Public Domain` and `CC: No rights reserved`.
  - Page: https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=1603

- `midi/satie-ogive-no2.mid`
  - Work: Erik Satie, `Ogive No. 2`.
  - Source: Wikimedia Commons.
  - Rights note: Commons states that the MIDI sequence was released into the public domain by its author.
  - Page: https://commons.wikimedia.org/wiki/File:Erik_Satie_-_Ogive_No.2.mid

## Region and Combat Chiptune Stems

The MIDI clips below are original, repo-local chiptune arrangements generated for
this project. Each arranges short melodic/rhythmic material from a public-domain
classical composition (every underlying work is in the worldwide public domain
because its composer died more than 95 years ago). No copyrighted game music or
ambiguous-license MIDI file is used; these are new short (< 20 second), loopable,
2-3 voice square-wave stems written directly for the Web Audio oscillator
pipeline in `src/systems/audio.ts`. The `.mid` files are Standard MIDI Files
(format 1) kept as provenance for their in-game square-wave motifs.

- `midi/office-hub-satie-gymnopedie.mid`
  - In-game motif: `officeHub` ("Office Hub Lilt"), used by `OfficeScene`.
  - Source work: Erik Satie, `Gymnopedie No. 1` (composed 1888; Satie died 1925).
  - Public-domain basis: composition is public domain worldwide (author died > 95 years ago).
  - Arrangement note: original repo-local chiptune arrangement of the theme's melodic contour; ~9.5 s, loopable, square lead + triangle bass + counterline.

- `midi/opennet-routing-bach-invention-i.mid`
  - In-game motif: `openNetRouting` ("OpenNet Routing Run"), used by `NetworkScene`.
  - Source work: J. S. Bach, `Invention No. 1 in C major, BWV 772` (Bach died 1750).
  - Public-domain basis: composition is public domain worldwide.
  - Arrangement note: original repo-local chiptune arrangement of the subject's sixteenth-note run; ~8.0 s, loopable, square lead + bass.

- `midi/referral-vault-bach-toccata-bwv565.mid`
  - In-game motif: `referralVault` ("Referral Vault Descent"), used by `ReferralVaultScene`.
  - Source work: J. S. Bach, `Toccata and Fugue in D minor, BWV 565` (Bach died 1750).
  - Public-domain basis: composition is public domain worldwide.
  - Arrangement note: original repo-local chiptune arrangement of the opening descending gesture; ~7.8 s, loopable, square lead + bass.

- `midi/silent-read-tower-satie-gnossienne-i.mid`
  - In-game motif: `silentReadTower` ("Silent Read Tower"), used by `SilentReadScene` (Editor's Labyrinth / Silent Read Tower).
  - Source work: Erik Satie, `Gnossienne No. 1` (composed 1890; Satie died 1925).
  - Public-domain basis: composition is public domain worldwide (author died > 95 years ago).
  - Arrangement note: original repo-local chiptune arrangement of the theme's contemplative line; ~10.6 s, loopable, square lead + triangle bass + counterline.

- `midi/danne-combat-beethoven-sym5.mid`
  - In-game motif: `danneCombat` ("DANN-E Combat Encounter"), used by `DanneBoss`.
  - Source work: L. van Beethoven, `Symphony No. 5 in C minor, Op. 67` (opening motif; Beethoven died 1827).
  - Public-domain basis: composition is public domain worldwide.
  - Arrangement note: original repo-local chiptune arrangement of the four-note "fate" motif; ~5.2 s, loopable, square lead + bass.

- `midi/miniboss-grieg-mountain-king.mid`
  - In-game motif: `miniboss` ("Miniboss March").
  - Source work: Edvard Grieg, `In the Hall of the Mountain King`, from `Peer Gynt Suite, Op. 46` (Grieg died 1907).
  - Public-domain basis: composition is public domain worldwide (author died > 95 years ago).
  - Arrangement note: original repo-local chiptune arrangement of the ascending theme; ~7.3 s, loopable, square lead + bass.

- `midi/binding-ceremony-beethoven-ode-to-joy.mid`
  - In-game motif: `bindingCeremony` ("Binding Ceremony Fanfare"), used by `EndingScene`.
  - Source work: L. van Beethoven, `Ode to Joy`, from `Symphony No. 9 in D minor, Op. 125` (Beethoven died 1827).
  - Public-domain basis: composition is public domain worldwide.
  - Arrangement note: original repo-local chiptune arrangement of the "Ode to Joy" melody; ~9.2 s, loopable, square lead + bass + counterline.
