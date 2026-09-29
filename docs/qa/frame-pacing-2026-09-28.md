# Gameplay frame-pacing baseline

Current local runtime afd7c52. Five-second rightward keyboard input in each scene, Chromium390x844 DPR3, CDP4x CPU throttling after one-second warmup. Measures requestAnimationFrame intervals, not physical-device GPU performance or input latency. Direct scene starts, no earned campaign claim. Outdoor movement crossed to Capital Commons. Enemy encounters are incidental, not a controlled boss fight.

| Scene | Samples | Median ms | P95 ms |
| --- | ---: | ---: | ---: |
| Research world |298|16.7|16.7|
| Office |300|16.7|16.8|
| Archive |259|16.7|33.4|
| Network |264|16.7|33.3|
| Black vault |300|16.7|16.7|

No page errors. Only one interval above33.5ms (outdoors); none above50ms. Archive/network have enough double-frame intervals to warrant follow-up, despite similar medians. Compositor screenshots inspected for world,office,archive,network. Raw /tmp/frus-frame-audit and /tmp/frus-dungeon-frame-audit.

A separate5-second archive CPU profile at the same throttle is saved as /tmp/frus-dungeon-frame-audit/archive.cpuprofile. Most samples are unattributed program time; named samples include Phaser sprite batching and image rendering. This is insufficient to attribute the dropped frames to a particular game function. Do not optimize a guessed bottleneck or reduce art fidelity on this evidence.

Next: capture a browser performance trace with rendering/compositor events for Archive/Network and compare unthrottled runs. Keep hardware Safari and controller latency verification separate. No runtime modifications, full-suite rerun, or publication this turn; latest2145tests remain the prior commit's evidence.
