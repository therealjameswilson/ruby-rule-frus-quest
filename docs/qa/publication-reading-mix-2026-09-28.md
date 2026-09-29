# Publication reading mix and page state

Summary pages now acquire one reading-mix lease across certificate, record, process and readers. Volume return, Title and scene shutdown release it idempotently. Existing reading arrangement is used; saved mix preferences are unchanged. Quiet navigation feedback accompanies focus/page changes. Confirm input is accepted alongside A and Start.

Ending and TrueEnding text-state callbacks now identify the Readers page and correct Process-to-Readers button. Previously Readers fell through to the record description.

30 focused tests pass, including lease reuse, cancel, shutdown, Title cleanup and confirm. Typecheck/build pass. Three-layout browser replay from earned publication storage with FRUS_QA_AUDIO=1 at fresh Vite5240 asserts reading inactive on volume, active on record/readers, inactive after return, correct visibleEntities and no page errors. Title/Continue preserve certification. Compositor phone screenshot inspected. Standard client completed with Office exploration state. Raw /tmp/frus-publication-reading-mix; build /tmp/frus-publication-reading-build.

No human listening or hardware validation claimed. Local only; no deployment.

- Final full source suite passed: 287 files / 2145 tests; /tmp/frus-publication-reading-tests.log.
