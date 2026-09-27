# Saved-quest card

Replaced the small legacy continue prompt with a framed compiler portrait, saved name, readable location, earned checkpoint count, and the saved next objective. Added clear filled Continue/New Game buttons at the existing interaction positions. Research-world, presidential-library and NSC-wing saves now have readable location labels.

The portrait uses the saved role/appearance, not the default new-game profile. Opening this screen reads the save without restoring it into a running level or changing its contents. Continue still restores through the existing save loader; new-game replacement still needs a second explicit choice, with Keep Save selected by default. Background taps do not choose Replace. The confirmation copy explains the consequence.

Added up/down menu navigation alongside left/right, and fullscreen handling. The logical 256×240 game layout is preserved. Build and the existing 279-file / 2,094-test suite passed. Browser evidence is recorded in resume-card-2026-09-27.json; tests use isolated copies of an earned save and do not modify the user's saved game.

This remains local work. Simulated touch/controller checks are not physical iPhone or controller verification.

Final browser run passed desktop, portrait phone, and landscape phone: opening confirmation preserves the save, background taps do not replace it, Keep Save returns safely, Continue restores earned points in ArchiveScene, and explicit replacement clears only the isolated fixture. Desktop fullscreen, simulated controller selection/cancel, and keyboard navigation/confirmation passed. An alternate saved compiler (Silver Bob) and a 92-character real objective fit the card. Their compositor screenshots were inspected.

The first enhanced check asserted immediately after a keyboard event and raced the update loop; waiting for the scene's resulting state resolved it. No controller runtime defect was found in that check. Final production build and focused confirmation/location tests passed (2 files, 3 tests); the full 279-file / 2,094-test suite passed before the final text-state/copy adjustment. The standard headed skill client reached TitleScene without recorded errors, but its canvas capture remains black; compositor screenshots supply visual evidence.
