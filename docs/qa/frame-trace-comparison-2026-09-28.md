# Archive / Network frame trace comparison

Runtime afd7c52, benchmark22f5b5c extended with configurable CPU rate and optional CDP trace capture. Each scene uses390x844,DPR3,five seconds of rightward keyboard input after warmup. No runtime modification.

Both unthrottled scenes:300samples, median16.7ms, P95<=16.8ms. At4xCPU, Archive268samples andNetwork238, P95~33.3ms. No pageerrors orframesover50ms. Exact results and duration aggregates in adjacent JSON. Trace durations nest/overlap across threads and must not be summed as exclusive CPUcost.

Rendering traces show roughly4seconds aggregate GLES2::ReadPixels waiting in each5second capture, compared with0.18-0.20seconds animation callback time unthrottled and0.62-0.64seconds at4x. No Layout or Paint events with duration. A fresh same-launch-options browser SystemInfo query reports ANGLE/SwiftShader Vulkan, software GPU compositing and rasterization. This limits inference to the software-rendered test environment; it does not establish a real-device bottleneck. Game config does not explicitly request preserveDrawingBuffer or call readPixels. Do not downgrade art or claim an iPhone framerate from this evidence.

Raw traces /tmp/frus-frames-unthrottled and /tmp/frus-frames-throttled. Throttled Network compositor inspected. Benchmark now records GPU environment and accepts FRUS_QA_CPU_RATE and FRUS_QA_TRACE. Next stop repeating this synthetic probe; pursue visual/interaction review and obtain hardware evidence when available. Prior full2145tests remain valid for unchanged runtime. No deployment.
