/**
 * CHILD LOOP verification (Execution 13) — Task 31: host/worker-agent
 * neutrality. Task Source Requirement: "Context generation cannot assume
 * Claude/Codex. Host capabilities and selected worker are inputs; the same
 * ContextPack schema works across agents."
 *
 * Proves, with falsifiable final-state evidence:
 * - identical request content under different host/worker identities
 *   (including kinds and agentType strings no upstream product uses)
 *   produces the IDENTICAL packHash and item order — generation is
 *   agent-independent;
 * - the selected worker's identity does not affect content identity
 *   (worker present vs absent → same packHash);
 * - a built pack records WHICH host/worker it was built for (provenance
 *   round-trips through the store; worker null when the request had none);
 * - a pre-1.11.0 row (provenance columns never recorded) reads back with
 *   null provenance and is otherwise fully intact;
 * - a pack built under one host attaches to a worker of a different
 *   agentType, and cross-agent content sharing via dedupeByHash works
 *   (same packHash → same pack row reused);
 * - context.select's ranking is agent-independent;
 * - the versioned dispatcher surface accepts arbitrary agent identities
 *   and rejects malformed ones (unknown kind, oversized agentType, missing
 *   hostAgent) with the typed validation error.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";

import { ContextEngine } from "../src/engine/contextEngine.ts";
import { dispatch } from "../src/engine/dispatcher.ts";
import { validateContextRequest } from "../src/engine/normalize.ts";
import { CONTEXT_ENGINE_CONTRACT_VERSION } from "../src/contracts/version.ts";
import type { ContextProvider } from "../src/contracts/providers.ts";
import type { AgentIdentity, ContextRequest } from "../src/contracts/types.ts";

function tempStorePath(name: string): string {
  const dir = mkdtempSync(join(tmpdir(), `ctx-t31-${name}-`));
  return join(dir, "context.db");
}

function baseRequest(overrides: Partial<ContextRequest> = {}): ContextRequest {
  return {
    contractVersion: CONTEXT_ENGINE_CONTRACT_VERSION,
    project: { projectKey: "demo" },
    taskText: "summarize the provider contract",
    hostAgent: { kind: "agent", name: "host-a", agentType: "claude" },
    mode: "agent",
    budget: { maxTokens: 10_000 },
    privacyPolicy: { maxPrivacyClass: "internal" },
    callerCapabilities: { actorKind: "agent", agentType: "claude" },
    createdAt: "2026-08-30T00:00:00Z",
    ...overrides,
  };
}

function stubProvider(id: string): ContextProvider {
  return {
    declaration: {
      id,
      displayName: id,
      description: "stub",
      capabilities: ["file_content"],
      cost: { relativeCost: "low" as const },
      freshness: { kind: "live" as const },
      privacy: { maxPrivacyClass: "internal" as const },
      version: "1.0.0",
    },
    discover: async () => [],
    retrieve: async (_request, refs) =>
      refs.map((r) => ({
        providerId: id,
        ref: r.ref,
        title: r.title,
        estimatedTokens: 10,
        content: `content for ${r.ref}`,
        retrievedAt: new Date().toISOString(),
      })),
    healthCheck: async () => ({ available: true, degraded: false }),
  };
}

const items = [{ providerId: "p", ref: "contract.md" }];
const createdBy = { kind: "human" as const, name: "kim" };

function agent(kind: AgentIdentity["kind"], name: string, agentType?: string): AgentIdentity {
  return agentType !== undefined ? { kind, name, agentType } : { kind, name };
}

test("T31: identical content under different host/worker identities produces the identical packHash and order", async () => {
  const engine = new ContextEngine({ storePath: tempStorePath("hash-equality") });
  engine.registerProvider(stubProvider("p"));

  // Five callers spanning every ActorKind, several real-world agentType
  // labels, and one agentType no product uses today ("future-agent-x") —
  // if generation assumed any particular agent, at least one hash would
  // diverge.
  const identities: Array<{ host: AgentIdentity; worker?: AgentIdentity }> = [
    { host: { kind: "human", name: "kim" } },
    { host: { kind: "agent", name: "host-a", agentType: "claude" }, worker: { kind: "agent", name: "worker-a", agentType: "codex" } },
    { host: { kind: "agent", name: "host-b", agentType: "codex" }, worker: { kind: "agent", name: "worker-b", agentType: "gemini" } },
    { host: { kind: "agent", name: "host-c", agentType: "opencode" }, worker: { kind: "agent", name: "worker-c", agentType: "future-agent-x" } },
    { host: { kind: "engine", name: "library-memory" }, worker: { kind: "tool", name: "lib-tools", agentType: "toolkit" } },
  ];

  const hashes: string[] = [];
  const orders: Array<Array<[string, string, number]>> = [];
  for (const { host, worker } of identities) {
    const pack = await engine.buildPack({
      request: baseRequest({ hostAgent: host, ...(worker !== undefined ? { workerAgent: worker } : {}) }),
      items,
      rankingVersion: "manual-v1",
      creationReason: "t31-neutrality",
      createdBy: host,
    });
    hashes.push(pack.packHash);
    orders.push(pack.items.map((i) => [i.providerId, i.ref, i.order] as [string, string, number]));
  }

  assert.equal(new Set(hashes).size, 1, `expected one agent-independent packHash, got ${hashes.length}`);
  for (const order of orders) {
    assert.deepEqual(order, orders[0]);
  }
});

test("T31: the selected worker's identity does not affect content identity (worker present vs absent vs different)", async () => {
  const engine = new ContextEngine({ storePath: tempStorePath("worker-irrelevant") });
  engine.registerProvider(stubProvider("p"));

  const host = agent("agent", "host-a", "claude");
  const noWorker = await engine.buildPack({ request: baseRequest({ hostAgent: host }), items, rankingVersion: "v1", creationReason: "t31", createdBy });
  const withWorker = await engine.buildPack({
    request: baseRequest({ hostAgent: host, workerAgent: agent("agent", "worker-a", "codex") }),
    items,
    rankingVersion: "v1",
    creationReason: "t31",
    createdBy,
  });
  const otherWorker = await engine.buildPack({
    request: baseRequest({ hostAgent: host, workerAgent: agent("agent", "worker-z", "gemini") }),
    items,
    rankingVersion: "v1",
    creationReason: "t31",
    createdBy,
  });

  assert.equal(withWorker.packHash, noWorker.packHash);
  assert.equal(otherWorker.packHash, noWorker.packHash);
});

test("T31: a built pack records which host/worker it was built for, round-tripping the store", async () => {
  const engine = new ContextEngine({ storePath: tempStorePath("provenance") });
  engine.registerProvider(stubProvider("p"));

  const host = agent("agent", "host-a", "claude");
  const worker = agent("agent", "worker-a", "codex");
  const pack = await engine.buildPack({
    request: baseRequest({ hostAgent: host, workerAgent: worker }),
    items,
    rankingVersion: "v1",
    creationReason: "t31-provenance",
    createdBy,
  });

  assert.deepEqual(pack.hostAgent, host);
  assert.deepEqual(pack.workerAgent, worker);

  const fetched = engine.getPack(pack.packId);
  assert.deepEqual(fetched.hostAgent, host, "host provenance must survive persistence");
  assert.deepEqual(fetched.workerAgent, worker, "worker provenance must survive persistence");

  // No worker declared -> null, never a fabricated identity.
  const lone = await engine.buildPack({ request: baseRequest({ hostAgent: host }), items, rankingVersion: "v1", creationReason: "t31-lone", createdBy });
  assert.equal(lone.workerAgent, null);
  assert.deepEqual(engine.getPack(lone.packId).workerAgent, null);
});

test("T31: a pre-1.11.0 row with unrecorded provenance reads back with null host/worker and is otherwise intact", async () => {
  const storePath = tempStorePath("legacy-row");
  const engine = new ContextEngine({ storePath });
  engine.registerProvider(stubProvider("p"));
  const host = agent("agent", "host-a", "claude");
  const worker = agent("agent", "worker-a", "codex");
  const pack = await engine.buildPack({
    request: baseRequest({ hostAgent: host, workerAgent: worker }),
    items,
    rankingVersion: "v1",
    creationReason: "t31-legacy",
    createdBy,
  });

  // Simulate a row written before 1.11.0 recorded provenance: NULL columns.
  const db = new DatabaseSync(storePath);
  db.prepare("UPDATE context_packs SET host_agent_json = NULL, worker_agent_json = NULL WHERE pack_id = ?").run(pack.packId);
  db.close();

  const legacy = engine.getPack(pack.packId);
  assert.equal(legacy.hostAgent, null, "unrecorded host provenance must read back null, not fabricated");
  assert.equal(legacy.workerAgent, null);
  assert.equal(legacy.packHash, pack.packHash);
  assert.equal(legacy.items.length, 1);
  assert.equal(legacy.status, "active");
});

test("T31: a pack built under one host attaches to a worker of a different agentType", async () => {
  const engine = new ContextEngine({ storePath: tempStorePath("cross-attach") });
  engine.registerProvider(stubProvider("p"));
  const pack = await engine.buildPack({
    request: baseRequest({ hostAgent: agent("agent", "host-a", "claude") }),
    items,
    rankingVersion: "v1",
    creationReason: "t31-attach",
    createdBy,
  });

  const attachment = engine.attachPack(pack.packId, agent("agent", "worker-a", "codex"), "handoff");
  assert.deepEqual(attachment.target, { kind: "agent", name: "worker-a", agentType: "codex" });
  const explained = engine.explainPack(pack.packId);
  assert.equal(explained.attachments.length, 1);
  assert.equal(explained.attachments[0]?.target.agentType, "codex");
});

test("T31: dedupeByHash shares one pack row across different agents (same content, different host/worker/creator)", async () => {
  const storePath = tempStorePath("cross-agent-cache");
  const engine = new ContextEngine({ storePath });
  engine.registerProvider(stubProvider("p"));

  const first = await engine.buildPack({
    request: baseRequest({ hostAgent: { kind: "agent", name: "host-a", agentType: "claude" }, workerAgent: { kind: "agent", name: "worker-a", agentType: "codex" } }),
    items,
    rankingVersion: "v1",
    creationReason: "t31-cache",
    createdBy,
    dedupeByHash: true,
  });
  const second = await engine.buildPack({
    request: baseRequest({ hostAgent: { kind: "agent", name: "host-b", agentType: "gemini" }, workerAgent: { kind: "agent", name: "worker-b", agentType: "opencode" } }),
    items,
    rankingVersion: "v1",
    creationReason: "t31-cache",
    createdBy: { kind: "agent", name: "host-b", agentType: "gemini" },
    dedupeByHash: true,
  });

  assert.equal(second.packId, first.packId, "agent-independent content identity must let different agents share one pack");
  // The pack row is immutable, provenance included: the second agent's
  // cache hit returns the first build's record (host claude / worker codex),
  // not a rewritten one. The reuse is observable via context.pack.cacheHit.
  assert.deepEqual(second.hostAgent, { kind: "agent", name: "host-a", agentType: "claude" });
  assert.deepEqual(second.workerAgent, { kind: "agent", name: "worker-a", agentType: "codex" });
  assert.deepEqual(second.createdBy, createdBy);

  const db = new DatabaseSync(storePath);
  const count = (db.prepare("SELECT COUNT(*) AS n FROM context_packs").get() as { n: number }).n;
  const cacheHits = (db.prepare("SELECT COUNT(*) AS n FROM engine_events WHERE type = 'context.pack.cacheHit'").get() as { n: number }).n;
  db.close();
  assert.equal(count, 1);
  assert.equal(cacheHits, 1, "the cross-agent reuse must be auditable");
});

test("T31: context.select ranking is agent-independent", async () => {
  const engine = new ContextEngine({ storePath: tempStorePath("select") });
  engine.registerProvider({
    ...stubProvider("p"),
    discover: async () => [
      { providerId: "p", ref: "provider_contract.md", title: "Provider Contract", estimatedTokens: 10 },
      { providerId: "p", ref: "unrelated_notes.md", title: "Notes", estimatedTokens: 10 },
    ],
  });

  const orders: Array<Array<string>> = [];
  for (const host of [
    { kind: "agent", name: "host-a", agentType: "claude" },
    { kind: "agent", name: "host-b", agentType: "codex" },
    { kind: "human", name: "kim" },
  ] as AgentIdentity[]) {
    const result = await engine.selectCandidates({
      request: baseRequest({ hostAgent: host, taskText: "provider contract" }),
      maxItems: 10,
    });
    orders.push(result.items.map((i) => i.ref));
  }
  for (const order of orders) {
    assert.deepEqual(order, orders[0], "ranking must not depend on which agent asks");
  }
  assert.deepEqual(orders[0], ["provider_contract.md", "unrelated_notes.md"]);
});

test("T31: the versioned dispatcher accepts arbitrary agent identities end-to-end", async () => {
  const engine = new ContextEngine({ storePath: tempStorePath("dispatch") });
  engine.registerProvider(stubProvider("p"));

  const response = await dispatch(engine, {
    contractVersion: CONTEXT_ENGINE_CONTRACT_VERSION,
    operation: "context.build",
    request: {
      request: baseRequest({
        hostAgent: { kind: "agent", name: "host-a", agentType: "totally-unknown-agent" },
        workerAgent: { kind: "agent", name: "worker-a", agentType: "another-unknown-one" },
      }),
      items,
      rankingVersion: "v1",
      creationReason: "t31-dispatch",
      createdBy,
    },
  });
  assert.equal(response.ok, true);
  if (!response.ok) return;
  const pack = (response.result as { pack: { hostAgent: AgentIdentity | null; workerAgent: AgentIdentity | null } }).pack;
  assert.deepEqual(pack.hostAgent, { kind: "agent", name: "host-a", agentType: "totally-unknown-agent" });
  assert.deepEqual(pack.workerAgent, { kind: "agent", name: "worker-a", agentType: "another-unknown-one" });
});

test("T31: negative — malformed agent identities are rejected with the typed validation error", () => {
  const badKind = baseRequest({ hostAgent: { kind: "claude" as never, name: "host-a" } });
  assert.throws(() => validateContextRequest(badKind), /hostAgent\.kind must be one of/);

  const oversizedType = baseRequest({
    workerAgent: { kind: "agent", name: "worker-a", agentType: "x".repeat(65) },
  });
  assert.throws(() => validateContextRequest(oversizedType), /workerAgent\.agentType/);

  const noHost = baseRequest();
  delete (noHost as Partial<ContextRequest>).hostAgent;
  assert.throws(() => validateContextRequest(noHost), /hostAgent is required/);

  const badCaps = baseRequest({ callerCapabilities: { actorKind: "codex" as never } });
  assert.throws(() => validateContextRequest(badCaps), /callerCapabilities\.actorKind must be one of/);
});
