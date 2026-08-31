import { benchmarkCadence } from "./cadence.js";

function run() {
  const candidates = [120, 128, 240, 360, 500];
  const results = [];

  console.log("Running cadence benchmarks...");

  for (const hz of candidates) {
    console.log(`Benchmarking ${hz} Hz for 10 seconds...`);
    const result = benchmarkCadence(hz, 10);
    results.push(result);
  }

  console.log("\n--- Results ---");
  console.table(results);
}

run();
