# Outdoor disguise loading verification

A held image request previously left only UIScene active and removed the outdoor world. Crossings now use the cached DANN-E pose while the next disguise loads in the background.

Bounded browser fixtures passed movement during a held request, successful replacement, rapid crossings, failed-image fallback, and retry with B. Zero page errors. Screenshot inspected. These are approach-placement fixtures, not a fresh campaign playthrough.

Eight local hardware-backed Chrome/Metal crossings had maximum frame intervals of 17.8–24.7 ms, compared with 18.4–41.4 ms before. This is a narrow local measurement, not physical iPhone validation.

Production build and 282 test files / 2,116 tests passed. Standard client movement passed; its native canvas capture retains the known black-capture limitation.
