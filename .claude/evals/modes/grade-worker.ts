// Runs gradeRun off the runner's event loop: its suites, CLI timings and judge call are
// synchronous, and on the main thread they would stall every other case in flight.
import { parentPort, workerData } from "node:worker_threads";
import { gradeRun } from "./grade.ts";

const { task, repo, base, reply, env } = workerData;
parentPort?.postMessage(gradeRun(task, repo, base, reply, env));
