#!/usr/bin/env node

import { execFileSync, spawnSync } from "node:child_process";

const REPOSITORY = "therealjameswilson/ruby-rule-frus-quest";
const CLOSED_CODEX_COMPONENT_PRS = [59, 60, 61, 62, 63, 64, 65, 66, 67, 72];
const PERPLEXITY_ASSET_PRS = Array.from({ length: 16 }, (_, index) => index + 42);
const NO_PR_INTEGRATION_BRANCHES = new Set(["codex/add-new-files", "integrate/all-new-art"]);
const BINARY_ASSET_PATTERN = /\.(?:gif|jpe?g|mid|midi|ogg|png|svg|ttf|wav|woff2?)$/i;
const EXPECTED_PERPLEXITY_BINARY_ASSETS = 112;

function run(command, args) {
  return execFileSync(command, args, { encoding: "utf8" }).trim();
}

function succeeds(command, args) {
  return spawnSync(command, args, { stdio: "ignore" }).status === 0;
}

function isAncestor(commit, descendant = "origin/main") {
  return succeeds("git", ["merge-base", "--is-ancestor", commit, descendant]);
}

function blobAt(commit, file) {
  const spec = `${commit}:${file}`;
  return succeeds("git", ["cat-file", "-e", spec]) ? run("git", ["rev-parse", spec]) : null;
}

if (!process.argv.includes("--no-fetch")) {
  run("git", ["fetch", "origin", "--prune"]);
}

const pullRequests = JSON.parse(
  run("gh", [
    "pr",
    "list",
    "--repo",
    REPOSITORY,
    "--state",
    "all",
    "--limit",
    "200",
    "--json",
    "number,title,state,headRefName,headRefOid,baseRefName,mergeCommit,mergedAt,closedAt,url"
  ])
);

const currentBranch = run("git", ["branch", "--show-current"]);
const ownHeads = new Set([currentBranch, process.env.GITHUB_HEAD_REF].filter(Boolean));
const latestPullByHead = new Map();
for (const pull of pullRequests) {
  const previous = latestPullByHead.get(pull.headRefName);
  if (!previous || pull.number > previous.number) latestPullByHead.set(pull.headRefName, pull);
}

const problems = [];
const openComponents = pullRequests.filter(
  (pull) => pull.state === "OPEN" && !ownHeads.has(pull.headRefName)
);
for (const pull of openComponents) {
  problems.push(`PR #${pull.number} is still open from ${pull.headRefName}`);
}

const remoteRows = run("git", [
  "for-each-ref",
  "--format=%(refname:short)%09%(objectname)",
  "refs/remotes/origin"
])
  .split("\n")
  .filter(Boolean);

let prBackedBranches = 0;
let noPrIntegrationBranches = 0;
for (const row of remoteRows) {
  const [remoteRef, remoteSha] = row.split("\t");
  if (["origin", "origin/HEAD", "origin/main", "origin/gh-pages"].includes(remoteRef)) continue;

  const branch = remoteRef.replace(/^origin\//, "");
  const pull = latestPullByHead.get(branch);
  if (!pull) {
    if (NO_PR_INTEGRATION_BRANCHES.has(branch) && isAncestor(remoteSha)) {
      noPrIntegrationBranches += 1;
      continue;
    }
    problems.push(`remote branch ${branch} has no pull-request record or documented integration path`);
    continue;
  }

  prBackedBranches += 1;
  if (remoteSha !== pull.headRefOid) {
    problems.push(
      `remote branch ${branch} advanced after PR #${pull.number}: ${remoteSha} != ${pull.headRefOid}`
    );
  }
}

for (const branch of NO_PR_INTEGRATION_BRANCHES) {
  if (!succeeds("git", ["show-ref", "--verify", "--quiet", `refs/remotes/origin/${branch}`])) {
    problems.push(`documented no-PR integration branch ${branch} is missing from origin`);
  }
}

let representedClosedComponents = 0;
for (const number of CLOSED_CODEX_COMPONENT_PRS) {
  const pull = pullRequests.find((candidate) => candidate.number === number);
  if (!pull) {
    problems.push(`closed Codex component PR #${number} is absent from GitHub history`);
    continue;
  }
  if (!isAncestor(pull.headRefOid)) {
    problems.push(`closed Codex component PR #${number} is not represented on origin/main`);
    continue;
  }
  representedClosedComponents += 1;
}

const binaryAssets = new Map();
for (const number of PERPLEXITY_ASSET_PRS) {
  const pull = pullRequests.find((candidate) => candidate.number === number);
  if (!pull) {
    problems.push(`Perplexity asset/data PR #${number} is absent from GitHub history`);
    continue;
  }

  const files = run("git", ["diff-tree", "--no-commit-id", "--name-only", "-r", pull.headRefOid])
    .split("\n")
    .filter((file) => BINARY_ASSET_PATTERN.test(file));
  for (const file of files) binaryAssets.set(file, pull.headRefOid);
}

let exactBinaryAssets = 0;
for (const [file, sourceCommit] of binaryAssets) {
  const sourceBlob = blobAt(sourceCommit, file);
  const mainBlob = blobAt("origin/main", file);
  if (!mainBlob) {
    problems.push(`Perplexity binary asset is missing from origin/main: ${file}`);
  } else if (sourceBlob !== mainBlob) {
    problems.push(`Perplexity binary asset changed after integration: ${file}`);
  } else {
    exactBinaryAssets += 1;
  }
}

if (binaryAssets.size !== EXPECTED_PERPLEXITY_BINARY_ASSETS) {
  problems.push(
    `Perplexity binary inventory changed: expected ${EXPECTED_PERPLEXITY_BINARY_ASSETS}, found ${binaryAssets.size}`
  );
}

const supersededPull = pullRequests.find((pull) => pull.number === 41);
if (!supersededPull) {
  problems.push("superseded five-form DANN-E PR #41 is absent from GitHub history");
} else if (isAncestor(supersededPull.headRefOid)) {
  problems.push("superseded five-form DANN-E PR #41 unexpectedly entered origin/main");
}

const highestPull = Math.max(...pullRequests.map((pull) => pull.number));
const sourceBranchCount = prBackedBranches + noPrIntegrationBranches;

console.log("Codex + Perplexity pull harmonization audit");
console.log(`- PR records: ${pullRequests.length} through #${highestPull}`);
console.log(`- Open component PRs: ${openComponents.length}`);
console.log(`- Surviving source branches: ${sourceBranchCount}`);
console.log(`  - PR-backed branches still at recorded heads: ${prBackedBranches}`);
console.log(`  - No-PR integration branches already on main: ${noPrIntegrationBranches}`);
console.log(
  `- Closed Codex component heads represented: ${representedClosedComponents}/${CLOSED_CODEX_COMPONENT_PRS.length}`
);
console.log(`- Perplexity binary assets byte-identical: ${exactBinaryAssets}/${binaryAssets.size}`);
console.log("- PR #41: intentionally superseded by the canonical eight-form DANN-E roster");

if (problems.length > 0) {
  console.error("\nHarmonization problems:");
  for (const problem of problems) console.error(`- ${problem}`);
  process.exit(1);
}

console.log("PASS: all surviving Codex and Perplexity pull payloads are accounted for on origin/main.");
