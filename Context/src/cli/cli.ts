/**
 * Context Engine CLI — terminal/tool surface. The engine is fully usable
 * without any game client. Output is machine-readable JSON on stdout;
 * failures print { error: { code, message } } and exit non-zero.
 *
 * Exit codes: 0 success, 1 engine/failure, 2 usage error.
 */
import { ContextEngine } from "../engine/contextEngine.ts";
import { dispatch } from "../engine/dispatcher.ts";
import { isContextOperation, type ContextOperation } from "../contracts/operations.ts";
import { ContextEngineError } from "../contracts/errors.ts";
import { CONTEXT_ENGINE_CONTRACT_VERSION } from "../contracts/version.ts";
import type { ContextResponseEnvelope } from "../contracts/operations.ts";
import { buildCliEngine, optFlag } from "./engineFactory.ts";
import type { DetachResult } from "../engine/packs.ts";
import {
  formatAttachOp,
  formatDetachOp,
  formatExplainOp,
  formatHandoffOp,
  formatHandoffsOp,
  formatHealth,
  formatListOp,
  formatPackOp,
  formatPreviewOp,
} from "./format.ts";

interface ParsedArgs {
  command: string | null;
  args: string[];
  flags: Map<string, string>;
}

function parseArgs(argv: string[]): ParsedArgs {
  const flags = new Map<string, string>();
  const positional: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith("--")) {
        flags.set(key, next);
        i++;
      } else {
        flags.set(key, "true");
      }
    } else {
      positional.push(arg);
    }
  }
  return { command: positional[0] ?? null, args: positional.slice(1), flags };
}

function fail(payload: { code: string; message: string }, exitCode: number): never {
  process.stdout.write(`${JSON.stringify({ error: payload }, null, 2)}\n`);
  process.exit(exitCode);
}

function requireFlag(parsed: ParsedArgs, name: string, usage: string): string {
  const v = parsed.flags.get(name);
  if (v === undefined || v === "true") {
    process.stderr.write(`usage: context-engine ${usage}\n`);
    process.exit(2);
  }
  return v;
}

function parseJsonFlag(value: string, field: string): unknown {
  try {
    return JSON.parse(value);
  } catch (err) {
    fail(
      { code: "CONTEXT_VALIDATION_FAILED", message: `${field} must be valid JSON: ${err instanceof Error ? err.message : String(err)}` },
      2,
    );
  }
}

/** A CLI-only ContextEngine pre-wired with the project_files reference provider when --project-root is given. */
function buildEngine(parsed: ParsedArgs): ContextEngine {
  return buildCliEngine(parsed.flags);
}

/** Run a dispatcher operation and print its envelope, exiting 0/1 on ok/error. `render` (Task 29 `--format human`) receives the ok-result for the human rendering; error envelopes always stay JSON. */
async function runViaDispatch(
  engine: ContextEngine,
  operation: ContextOperation,
  request: unknown,
  render?: (result: unknown) => string,
): Promise<never> {
  const envelope = { contractVersion: CONTEXT_ENGINE_CONTRACT_VERSION, operation, request };
  const response: ContextResponseEnvelope = await dispatch(engine, envelope);
  if (response.ok && render !== undefined) {
    process.stdout.write(`${render(response.result)}\n`);
    process.exit(0);
  }
  process.stdout.write(`${JSON.stringify(response, null, 2)}\n`);
  process.exit(response.ok ? 0 : 1);
}

async function main(): Promise<void> {
  const parsed = parseArgs(process.argv.slice(2));
  const formatRaw = parsed.flags.get("format");
  if (formatRaw !== undefined && formatRaw !== "true" && formatRaw !== "human" && formatRaw !== "json") {
    process.stderr.write("usage: --format <human|json> (default json)\n");
    process.exit(2);
  }
  const render = formatRaw === "human";
  const engine = buildEngine(parsed);

  try {
    switch (parsed.command) {
      case "doctor":
      case "health": {
        const report = await engine.doctor();
        process.stdout.write(`${render ? formatHealth(report) : JSON.stringify(report, null, 2)}\n`);
        return;
      }
      case "select": {
        const requestJson = requireFlag(
          parsed,
          "request",
          "select --request '<json>' [--max-per-provider N] [--max-items N]",
        );
        const request = parseJsonFlag(requestJson, "--request");
        const selectRequest: Record<string, unknown> = { request };
        const maxPerProvider = parsed.flags.get("max-per-provider");
        if (maxPerProvider !== undefined && maxPerProvider !== "true") {
          selectRequest["maxCandidatesPerProvider"] = Number(maxPerProvider);
        }
        const maxItems = parsed.flags.get("max-items");
        if (maxItems !== undefined && maxItems !== "true") {
          selectRequest["maxItems"] = Number(maxItems);
        }
        await runViaDispatch(engine, "context.select", selectRequest);
        return;
      }
      case "pack": {
        const sub = parsed.args[0];
        if (sub === "build" || sub === "preview") {
          const requestJson = requireFlag(parsed, "request", `pack ${sub} --request '<json>'`);
          const request = parseJsonFlag(requestJson, "--request");
          await runViaDispatch(
            engine,
            sub === "build" ? "context.build" : "context.preview",
            request,
            render ? (sub === "build" ? formatPackOp : formatPreviewOp) : undefined,
          );
          return;
        }
        if (sub === "get") {
          const packId = requireFlag(parsed, "pack-id", "pack get --pack-id <id>");
          await runViaDispatch(engine, "context.get", { packId }, render ? formatPackOp : undefined);
          return;
        }
        if (sub === "explain") {
          const packId = requireFlag(parsed, "pack-id", "pack explain --pack-id <id>");
          await runViaDispatch(engine, "context.explain", { packId }, render ? formatExplainOp : undefined);
          return;
        }
        if (sub === "list") {
          const usage = "pack list [--project-key <key>] [--status <active|invalidated|expired>] [--mode <attach|sync>] [--limit <1-500>]";
          const request: Record<string, unknown> = {};
          const projectKey = optFlag(parsed.flags, "project-key");
          if (projectKey !== undefined) request["projectKey"] = projectKey;
          const status = optFlag(parsed.flags, "status");
          if (status !== undefined) request["status"] = status;
          const mode = optFlag(parsed.flags, "mode");
          if (mode !== undefined) request["mode"] = mode;
          const limit = optFlag(parsed.flags, "limit");
          if (limit !== undefined) {
            const n = Number(limit);
            if (!Number.isInteger(n)) {
              process.stderr.write(`usage: context-engine ${usage}\n`);
              process.exit(2);
            }
            request["limit"] = n;
          }
          await runViaDispatch(engine, "context.list", request, render ? formatListOp : undefined);
          return;
        }
        if (sub === "invalidate") {
          const packId = requireFlag(parsed, "pack-id", "pack invalidate --pack-id <id> --reason <text> --actor '<json>'");
          const reason = requireFlag(parsed, "reason", "pack invalidate --pack-id <id> --reason <text> --actor '<json>'");
          const actorJson = requireFlag(parsed, "actor", "pack invalidate --pack-id <id> --reason <text> --actor '<json>'");
          await runViaDispatch(engine, "context.invalidate", { packId, reason, actor: parseJsonFlag(actorJson, "--actor") });
          return;
        }
        if (sub === "attach") {
          const packId = requireFlag(parsed, "pack-id", "pack attach --pack-id <id> --target '<json>' [--note <text>]");
          const targetJson = requireFlag(parsed, "target", "pack attach --pack-id <id> --target '<json>' [--note <text>]");
          const note = parsed.flags.get("note");
          const request: Record<string, unknown> = { packId, target: parseJsonFlag(targetJson, "--target") };
          if (note !== undefined && note !== "true") request["note"] = note;
          await runViaDispatch(engine, "context.attach", request, render ? formatAttachOp : undefined);
          return;
        }
        if (sub === "detach") {
          const usage = "pack detach --pack-id <id> --attachment-id <id> --actor '<json>'";
          const packId = requireFlag(parsed, "pack-id", usage);
          const attachmentId = requireFlag(parsed, "attachment-id", usage);
          const actorJson = requireFlag(parsed, "actor", usage);
          await runViaDispatch(
            engine,
            "context.detach",
            { packId, attachmentId, actor: parseJsonFlag(actorJson, "--actor") },
            render ? (result) => formatDetachOp(result as DetachResult) : undefined,
          );
          return;
        }
        if (sub === "sweep") {
          const at = parsed.flags.get("at");
          const request: Record<string, unknown> = {};
          if (at !== undefined && at !== "true") request["at"] = at;
          await runViaDispatch(engine, "context.sweep", request);
          return;
        }
        if (sub === "promote") {
          const packId = requireFlag(parsed, "pack-id", "pack promote --pack-id <id> --actor '<json>'");
          const actorJson = requireFlag(parsed, "actor", "pack promote --pack-id <id> --actor '<json>'");
          await runViaDispatch(engine, "context.promote", { packId, actor: parseJsonFlag(actorJson, "--actor") });
          return;
        }
        if (sub === "get-by-hash") {
          const packHash = requireFlag(parsed, "pack-hash", "pack get-by-hash --pack-hash <hash> [--mode <attach|sync>]");
          const mode = parsed.flags.get("mode");
          const request: Record<string, unknown> = { packHash };
          if (mode !== undefined && mode !== "true") request["mode"] = mode;
          await runViaDispatch(engine, "context.getByHash", request);
          return;
        }
        if (sub === "invalidate-affected") {
          const providerId = requireFlag(
            parsed,
            "provider-id",
            "pack invalidate-affected --provider-id <id> [--ref <r>] [--current-content-hash <h>] [--current-provider-version <v>] --actor '<json>' [--reason <text>]",
          );
          const actorJson = requireFlag(
            parsed,
            "actor",
            "pack invalidate-affected --provider-id <id> [--ref <r>] [--current-content-hash <h>] [--current-provider-version <v>] --actor '<json>' [--reason <text>]",
          );
          const ref = parsed.flags.get("ref");
          const currentContentHash = parsed.flags.get("current-content-hash");
          const currentProviderVersion = parsed.flags.get("current-provider-version");
          const reason = parsed.flags.get("reason");
          const request: Record<string, unknown> = { providerId, actor: parseJsonFlag(actorJson, "--actor") };
          if (ref !== undefined && ref !== "true") request["ref"] = ref;
          if (currentContentHash !== undefined && currentContentHash !== "true") request["currentContentHash"] = currentContentHash;
          if (currentProviderVersion !== undefined && currentProviderVersion !== "true") request["currentProviderVersion"] = currentProviderVersion;
          if (reason !== undefined && reason !== "true") request["reason"] = reason;
          await runViaDispatch(engine, "context.invalidateAffected", request);
          return;
        }
        if (sub === "replay") {
          const packId = requireFlag(parsed, "pack-id", "pack replay --pack-id <id>");
          await runViaDispatch(engine, "context.replay", { packId });
          return;
        }
        process.stderr.write(
          "usage: context-engine pack <build|preview|get|explain|list|invalidate|attach|detach|sweep|promote|get-by-hash|invalidate-affected|replay> ...\n",
        );
        process.exit(2);
        return;
      }
      case "projection": {
        const sub = parsed.args[0];
        if (sub === "handoff") {
          const usage = "projection handoff (--pack-id <id> --projection-ref <ref> | --definition-id <id>)";
          const packId = parsed.flags.get("pack-id");
          const projectionRef = parsed.flags.get("projection-ref");
          const definitionId = parsed.flags.get("definition-id");
          if (packId === undefined && definitionId === undefined) {
            process.stderr.write(`usage: context-engine ${usage}\n`);
            process.exit(2);
          }
          const request: Record<string, unknown> = {};
          if (packId !== undefined && packId !== "true") request["packId"] = packId;
          if (projectionRef !== undefined && projectionRef !== "true") request["projectionRef"] = projectionRef;
          if (definitionId !== undefined && definitionId !== "true") request["definitionId"] = definitionId;
          await runViaDispatch(engine, "context.projection.handoff", request, render ? formatHandoffOp : undefined);
          return;
        }
        if (sub === "handoffs") {
          const request: Record<string, unknown> = {};
          const packId = parsed.flags.get("pack-id");
          if (packId !== undefined && packId !== "true") request["packId"] = packId;
          const limit = parsed.flags.get("limit");
          if (limit !== undefined && limit !== "true") {
            const n = Number(limit);
            if (!Number.isInteger(n)) {
              process.stderr.write("usage: projection handoffs [--pack-id <id>] [--limit <1-500>]\n");
              process.exit(2);
            }
            request["limit"] = n;
          }
          await runViaDispatch(engine, "context.projection.listHandoffs", request, render ? formatHandoffsOp : undefined);
          return;
        }
        process.stderr.write("usage: context-engine projection <handoff|handoffs> ...\n");
        process.exit(2);
        return;
      }
      case "definition": {
        const sub = parsed.args[0];
        if (sub === "create") {
          const requestJson = requireFlag(parsed, "request", "definition create --request '<json>'");
          const request = parseJsonFlag(requestJson, "--request");
          await runViaDispatch(engine, "context.definition.create", request);
          return;
        }
        if (sub === "get") {
          const definitionId = requireFlag(parsed, "definition-id", "definition get --definition-id <id>");
          await runViaDispatch(engine, "context.definition.get", { definitionId });
          return;
        }
        if (sub === "sync") {
          const definitionId = requireFlag(parsed, "definition-id", "definition sync --definition-id <id>");
          await runViaDispatch(engine, "context.definition.sync", { definitionId });
          return;
        }
        process.stderr.write("usage: context-engine definition <create|get|sync> ...\n");
        process.exit(2);
        return;
      }
      case "auto": {
        const sub = parsed.args[0];
        if (sub === "run") {
          const requestJson = requireFlag(parsed, "request", "auto run --request '<json>'");
          const request = parseJsonFlag(requestJson, "--request");
          await runViaDispatch(engine, "context.autoContext.run", request);
          return;
        }
        if (sub === "policy") {
          const policySub = parsed.args[1];
          if (policySub === "get") {
            const projectKey = requireFlag(parsed, "project-key", "auto policy get --project-key <key>");
            await runViaDispatch(engine, "context.autoContext.getPolicy", { projectKey });
            return;
          }
          if (policySub === "set") {
            const usage = "auto policy set --project-key <key> --allow <true|false> --actor '<json>'";
            const projectKey = requireFlag(parsed, "project-key", usage);
            // Not requireFlag: its "true" == "valueless boolean flag" sentinel
            // would wrongly treat a literal --allow true as missing.
            const allowRaw = parsed.flags.get("allow");
            if (allowRaw !== "true" && allowRaw !== "false") {
              process.stderr.write(`usage: context-engine ${usage}\n`);
              process.exit(2);
            }
            const actorJson = requireFlag(parsed, "actor", usage);
            await runViaDispatch(engine, "context.autoContext.setPolicy", {
              projectKey,
              allowAutomaticAttachment: allowRaw === "true",
              actor: parseJsonFlag(actorJson, "--actor"),
            });
            return;
          }
        }
        process.stderr.write("usage: context-engine auto <run|policy get|policy set> ...\n");
        process.exit(2);
        return;
      }
      case "providers": {
        const sub = parsed.args[0];
        if (sub === "list") {
          process.stdout.write(`${JSON.stringify({ providers: engine.listProviders() }, null, 2)}\n`);
          return;
        }
        if (sub === "discover") {
          const requestJson = requireFlag(parsed, "request", "providers discover --project-root <dir> --request '<json>'");
          const request = engine.validateRequest(parseJsonFlag(requestJson, "--request"));
          const result = await engine.discoverAll(request);
          process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
          return;
        }
        process.stderr.write("usage: context-engine providers <list|discover> ...\n");
        process.exit(2);
        return;
      }
      case "request": {
        const sub = parsed.args[0];
        if (sub === "validate") {
          const requestJson = requireFlag(parsed, "request", "request validate --request '<json>'");
          const request = engine.validateRequest(parseJsonFlag(requestJson, "--request"));
          process.stdout.write(`${JSON.stringify({ request }, null, 2)}\n`);
          return;
        }
        process.stderr.write("usage: context-engine request validate --request '<json>'\n");
        process.exit(2);
        return;
      }
      case "contract": {
        const sub = parsed.args[0];
        if (sub === "call") {
          const operation = requireFlag(parsed, "operation", "contract call --operation <op> --request '<json>'");
          if (!isContextOperation(operation)) {
            fail(
              { code: "CONTEXT_VALIDATION_FAILED", message: `unknown operation '${operation}'` },
              2,
            );
          }
          const requestJson = parsed.flags.get("request") ?? "{}";
          const request = parseJsonFlag(requestJson, "--request");
          await runViaDispatch(engine, operation as ContextOperation, request);
        }
        process.stderr.write("usage: context-engine contract call --operation <op> --request '<json>'\n");
        process.exit(2);
        return;
      }
      default:
        process.stderr.write(
          "usage: context-engine <health|doctor|providers list|providers discover|select|request validate|pack build|pack preview|pack get|pack explain|pack list|pack invalidate|pack attach|pack detach|pack sweep|pack promote|pack get-by-hash|pack invalidate-affected|pack replay|projection handoff|projection handoffs|definition create|definition get|definition sync|auto run|auto policy get|auto policy set|contract call> [--format <human|json>] ...\n",
        );
        process.exit(2);
    }
  } catch (err) {
    if (err instanceof ContextEngineError) {
      fail({ code: err.code, message: err.message }, 1);
    }
    fail({ code: "CONTEXT_ENGINE_UNEXPECTED", message: err instanceof Error ? err.message : String(err) }, 1);
  }
}

main();
