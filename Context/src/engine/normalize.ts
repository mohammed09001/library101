/**
 * Canonical validation for ContextRequest (Task 2).
 *
 * Manual field-by-field validation in the sibling-engine style: every
 * required field is checked, every enum is bounded, every unknown field is
 * rejected outright (a request is not a place to smuggle undeclared data
 * past the contract), and every failure is a typed ValidationError.
 */
import type {
  AgentIdentity,
  ActorKind,
  CallerCapabilities,
  ContextRequest,
  FreshnessWindow,
  PrivacyClass,
  PrivacyPolicy,
  ProviderId,
  SessionContext,
  SourceFieldPolicy,
  ProviderScopeOverride,
  TaskMode,
  TokenBudget,
} from "../contracts/types.ts";
import { TASK_MODES } from "../contracts/types.ts";
import { ContextEngineError, ValidationError } from "../contracts/errors.ts";
import { CONTEXT_ENGINE_CONTRACT_VERSION } from "../contracts/version.ts";

export const LIMITS = {
  projectKey: 128,
  taskText: 65536,
  actorName: 256,
  agentType: 64,
  tag: 64,
  maxTags: 32,
  maxProviders: 64,
  requestId: 128,
  sessionFilePath: 4096,
  sessionLanguage: 64,
  sessionSelectionText: 8192,
  sessionTaskDescription: 4096,
  sessionId: 128,
  maxContentFieldPolicies: 16,
  maxPolicyFields: 16,
  maxPolicyPatterns: 16,
  policyFieldPath: 128,
  policyPattern: 256,
  providerId: 128,
} as const;

const ACTOR_KINDS: readonly ActorKind[] = ["human", "agent", "engine", "tool"];
const PRIVACY_CLASSES: readonly PrivacyClass[] = ["public", "internal", "sensitive"];
const FRESHNESS_KINDS = ["static", "live", "periodic"] as const;
const ISO_LIKE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

function fail(message: string): never {
  throw new ValidationError(message);
}

export function requireObject(value: unknown, field: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    fail(`${field} must be an object`);
  }
  return value as Record<string, unknown>;
}

export function checkString(
  value: unknown,
  field: string,
  max: number,
  { required = true }: { required?: boolean } = {},
): string | undefined {
  if (value === undefined || value === null) {
    if (required) fail(`${field} is required`);
    return undefined;
  }
  if (typeof value !== "string") fail(`${field} must be a string`);
  if (required && value.length === 0) fail(`${field} must not be empty`);
  if (value.length > max) fail(`${field} exceeds ${max} characters`);
  return value;
}

export function checkTimestamp(value: unknown, field: string, { required = false } = {}): string | undefined {
  if (value === undefined || value === null) {
    if (required) fail(`${field} is required`);
    return undefined;
  }
  if (typeof value !== "string" || !ISO_LIKE.test(value) || Number.isNaN(Date.parse(value))) {
    fail(`${field} must be an ISO 8601 timestamp`);
  }
  return value;
}

function checkUnknownFields(obj: Record<string, unknown>, known: readonly string[], field: string): void {
  for (const key of Object.keys(obj)) {
    if (!known.includes(key)) fail(`${field} has unknown field '${key}'`);
  }
}

function checkStringArray(
  value: unknown,
  field: string,
  max: number,
  maxEntries: number,
): string[] | undefined {
  if (value === undefined || value === null) return undefined;
  if (!Array.isArray(value)) fail(`${field} must be an array`);
  if (value.length > maxEntries) fail(`${field} exceeds ${maxEntries} entries`);
  return value.map((v, i) => checkString(v, `${field}[${i}]`, max) as string);
}

export function validateAgentIdentity(value: unknown, field: string, { required = true } = {}): AgentIdentity | undefined {
  if (value === undefined || value === null) {
    if (required) fail(`${field} is required`);
    return undefined;
  }
  const obj = requireObject(value, field);
  const kind = checkString(obj["kind"], `${field}.kind`, 16) as string;
  if (!ACTOR_KINDS.includes(kind as ActorKind)) {
    fail(`${field}.kind must be one of ${ACTOR_KINDS.join(", ")}`);
  }
  const name = checkString(obj["name"], `${field}.name`, LIMITS.actorName) as string;
  const agentType = checkString(obj["agentType"], `${field}.agentType`, LIMITS.agentType, { required: false });
  checkUnknownFields(obj, ["kind", "name", "agentType"], field);
  const identity: AgentIdentity = { kind: kind as ActorKind, name };
  if (agentType !== undefined) identity.agentType = agentType;
  return identity;
}

function validateBudget(value: unknown): TokenBudget {
  const obj = requireObject(value, "budget");
  const maxTokens = obj["maxTokens"];
  if (typeof maxTokens !== "number" || !Number.isFinite(maxTokens) || maxTokens <= 0) {
    fail("budget.maxTokens must be a positive finite number");
  }
  const maxBytesRaw = obj["maxBytes"];
  let maxBytes: number | undefined;
  if (maxBytesRaw !== undefined && maxBytesRaw !== null) {
    if (typeof maxBytesRaw !== "number" || !Number.isFinite(maxBytesRaw) || maxBytesRaw <= 0) {
      fail("budget.maxBytes must be a positive finite number");
    }
    maxBytes = maxBytesRaw;
  }
  const reservedFramingTokensRaw = obj["reservedFramingTokens"];
  let reservedFramingTokens: number | undefined;
  if (reservedFramingTokensRaw !== undefined && reservedFramingTokensRaw !== null) {
    if (
      typeof reservedFramingTokensRaw !== "number" ||
      !Number.isFinite(reservedFramingTokensRaw) ||
      reservedFramingTokensRaw < 0
    ) {
      fail("budget.reservedFramingTokens must be a non-negative finite number");
    }
    reservedFramingTokens = reservedFramingTokensRaw;
  }
  checkUnknownFields(obj, ["maxTokens", "maxBytes", "reservedFramingTokens"], "budget");
  const budget: TokenBudget = { maxTokens };
  if (maxBytes !== undefined) budget.maxBytes = maxBytes;
  if (reservedFramingTokens !== undefined) budget.reservedFramingTokens = reservedFramingTokens;
  return budget;
}

function validateFreshness(value: unknown): FreshnessWindow | undefined {
  if (value === undefined || value === null) return undefined;
  const obj = requireObject(value, "freshness");
  const maxAgeRaw = obj["maxAgeSeconds"];
  let maxAgeSeconds: number | undefined;
  if (maxAgeRaw !== undefined && maxAgeRaw !== null) {
    if (typeof maxAgeRaw !== "number" || !Number.isFinite(maxAgeRaw) || maxAgeRaw < 0) {
      fail("freshness.maxAgeSeconds must be a non-negative finite number");
    }
    maxAgeSeconds = maxAgeRaw;
  }
  const asOf = checkTimestamp(obj["asOf"], "freshness.asOf");
  checkUnknownFields(obj, ["maxAgeSeconds", "asOf"], "freshness");
  const freshness: FreshnessWindow = {};
  if (maxAgeSeconds !== undefined) freshness.maxAgeSeconds = maxAgeSeconds;
  if (asOf !== undefined) freshness.asOf = asOf;
  return freshness;
}

function validatePrivacyPolicy(value: unknown): PrivacyPolicy {
  const obj = requireObject(value, "privacyPolicy");
  const maxPrivacyClass = checkString(obj["maxPrivacyClass"], "privacyPolicy.maxPrivacyClass", 16) as string;
  if (!PRIVACY_CLASSES.includes(maxPrivacyClass as PrivacyClass)) {
    fail(`privacyPolicy.maxPrivacyClass must be one of ${PRIVACY_CLASSES.join(", ")}`);
  }
  const forbiddenTags = checkStringArray(obj["forbiddenTags"], "privacyPolicy.forbiddenTags", LIMITS.tag, LIMITS.maxTags);
  checkUnknownFields(obj, ["maxPrivacyClass", "forbiddenTags"], "privacyPolicy");
  const policy: PrivacyPolicy = { maxPrivacyClass: maxPrivacyClass as PrivacyClass };
  if (forbiddenTags !== undefined) policy.forbiddenTags = forbiddenTags;
  return policy;
}

function validateCallerCapabilities(value: unknown): CallerCapabilities {
  const obj = requireObject(value, "callerCapabilities");
  const actorKind = checkString(obj["actorKind"], "callerCapabilities.actorKind", 16) as string;
  if (!ACTOR_KINDS.includes(actorKind as ActorKind)) {
    fail(`callerCapabilities.actorKind must be one of ${ACTOR_KINDS.join(", ")}`);
  }
  const agentType = checkString(obj["agentType"], "callerCapabilities.agentType", LIMITS.agentType, { required: false });
  const canWriteRaw = obj["canWrite"];
  if (canWriteRaw !== undefined && canWriteRaw !== null && typeof canWriteRaw !== "boolean") {
    fail("callerCapabilities.canWrite must be a boolean");
  }
  checkUnknownFields(obj, ["actorKind", "agentType", "canWrite"], "callerCapabilities");
  const caps: CallerCapabilities = { actorKind: actorKind as ActorKind };
  if (agentType !== undefined) caps.agentType = agentType;
  if (typeof canWriteRaw === "boolean") caps.canWrite = canWriteRaw;
  return caps;
}

/**
 * Task 33: source-specific field policies — bounded, compile-at-validation.
 * A policy that cannot compile as a RegExp, names an unknown field root, or
 * duplicates a providerId is a CONTEXT_VALIDATION_FAILED here, at the
 * boundary — never a runtime redaction surprise mid-pipeline.
 */
function validateContentFieldPolicies(value: unknown): SourceFieldPolicy[] | undefined {
  if (value === undefined || value === null) return undefined;
  if (!Array.isArray(value)) fail("contentFieldPolicies must be an array");
  if (value.length > LIMITS.maxContentFieldPolicies) {
    fail(`contentFieldPolicies exceeds ${LIMITS.maxContentFieldPolicies} entries`);
  }
  const seenProviders = new Set<string>();
  const policies: SourceFieldPolicy[] = value.map((raw, i) => {
    const obj = requireObject(raw, `contentFieldPolicies[${i}]`);
    const providerId = checkString(obj["providerId"], `contentFieldPolicies[${i}].providerId`, LIMITS.providerId) as string;
    if (seenProviders.has(providerId)) {
      fail(`contentFieldPolicies has more than one policy for provider '${providerId}'`);
    }
    seenProviders.add(providerId);
    const redactedFieldsRaw = obj["redactedFields"];
    let redactedFields: string[] | undefined;
    if (redactedFieldsRaw !== undefined && redactedFieldsRaw !== null) {
      if (!Array.isArray(redactedFieldsRaw)) fail(`contentFieldPolicies[${i}].redactedFields must be an array`);
      if (redactedFieldsRaw.length > LIMITS.maxPolicyFields) {
        fail(`contentFieldPolicies[${i}].redactedFields exceeds ${LIMITS.maxPolicyFields} entries`);
      }
      redactedFields = redactedFieldsRaw.map((f, j) => {
        const path = checkString(f, `contentFieldPolicies[${i}].redactedFields[${j}]`, LIMITS.policyFieldPath) as string;
        const segments = path.split(".");
        const root = segments[0]!;
        if (root !== "title" && root !== "sourceMetadata") {
          fail(
                            `contentFieldPolicies[${i}].redactedFields[${j}] must start with 'title' or 'sourceMetadata' (content is pattern-redacted, never dropped): '${path}'`,
          );
        }
        if (root === "title" && segments.length > 1) {
          fail(`contentFieldPolicies[${i}].redactedFields[${j}] 'title' takes no sub-path: '${path}'`);
        }
        return path;
      });
    }
    const redactPatternsRaw = obj["redactPatterns"];
    let redactPatterns: string[] | undefined;
    if (redactPatternsRaw !== undefined && redactPatternsRaw !== null) {
      if (!Array.isArray(redactPatternsRaw)) fail(`contentFieldPolicies[${i}].redactPatterns must be an array`);
      if (redactPatternsRaw.length > LIMITS.maxPolicyPatterns) {
        fail(`contentFieldPolicies[${i}].redactPatterns exceeds ${LIMITS.maxPolicyPatterns} entries`);
      }
      redactPatterns = redactPatternsRaw.map((p, j) => {
        const pattern = checkString(p, `contentFieldPolicies[${i}].redactPatterns[${j}]`, LIMITS.policyPattern) as string;
        try {
          // Compile now (fail fast); the empty match would loop forever on replaceAll.
          const re = new RegExp(pattern);
          re.lastIndex = 0;
          if (re.test("")) fail(`contentFieldPolicies[${i}].redactPatterns[${j}] matches the empty string`);
        } catch (err) {
          if (err instanceof ContextEngineError) throw err;
          fail(`contentFieldPolicies[${i}].redactPatterns[${j}] is not a valid RegExp: ${err instanceof Error ? err.message : String(err)}`);
        }
        return pattern;
      });
    }
    if (redactedFields === undefined && redactPatterns === undefined) {
      fail(`contentFieldPolicies[${i}] must declare redactedFields or redactPatterns`);
    }
    checkUnknownFields(obj, ["providerId", "redactedFields", "redactPatterns"], `contentFieldPolicies[${i}]`);
    const policy: SourceFieldPolicy = { providerId };
    if (redactedFields !== undefined) policy.redactedFields = redactedFields;
    if (redactPatterns !== undefined) policy.redactPatterns = redactPatterns;
    return policy;
  });
  return policies;
}

/**
 * Task 35: explicit cross-project grants — bounded, project-key-shaped.
 * This is the ONLY mechanism by which a provider serves a projectKey
 * outside its declared `grantedProjectKeys`.
 */
function validateProviderScopeOverrides(value: unknown): ProviderScopeOverride[] | undefined {
  if (value === undefined || value === null) return undefined;
  if (!Array.isArray(value)) fail("providerScopeOverrides must be an array");
  if (value.length > LIMITS.maxContentFieldPolicies) {
    fail(`providerScopeOverrides exceeds ${LIMITS.maxContentFieldPolicies} entries`);
  }
  const seen = new Set<string>();
  return value.map((raw, i) => {
    const obj = requireObject(raw, `providerScopeOverrides[${i}]`);
    const providerId = checkString(obj["providerId"], `providerScopeOverrides[${i}].providerId`, LIMITS.providerId) as string;
    if (seen.has(providerId)) fail(`providerScopeOverrides has more than one entry for provider '${providerId}'`);
    seen.add(providerId);
    const keysRaw = obj["projectKeys"];
    if (!Array.isArray(keysRaw) || keysRaw.length === 0) {
      fail(`providerScopeOverrides[${i}].projectKeys must be a non-empty array`);
    }
    if (keysRaw.length > LIMITS.maxProviders) {
      fail(`providerScopeOverrides[${i}].projectKeys exceeds ${LIMITS.maxProviders} entries`);
    }
    const projectKeys = keysRaw.map((k, j) => {
      const key = checkString(k, `providerScopeOverrides[${i}].projectKeys[${j}]`, LIMITS.projectKey) as string;
      if (!/^[\w][\w.-]*$/.test(key)) {
        fail(`providerScopeOverrides[${i}].projectKeys[${j}] must match [\\w][\\w.-]* : '${key}'`);
      }
      return key;
    });
    checkUnknownFields(obj, ["providerId", "projectKeys"], `providerScopeOverrides[${i}]`);
    return { providerId, projectKeys };
  });
}

function validateSessionContext(value: unknown): SessionContext | undefined {  if (value === undefined || value === null) return undefined;
  const obj = requireObject(value, "sessionContext");

  let currentFile: SessionContext["currentFile"];
  const currentFileRaw = obj["currentFile"];
  if (currentFileRaw !== undefined && currentFileRaw !== null) {
    const fileObj = requireObject(currentFileRaw, "sessionContext.currentFile");
    const path = checkString(fileObj["path"], "sessionContext.currentFile.path", LIMITS.sessionFilePath) as string;
    const language = checkString(fileObj["language"], "sessionContext.currentFile.language", LIMITS.sessionLanguage, {
      required: false,
    });
    checkUnknownFields(fileObj, ["path", "language"], "sessionContext.currentFile");
    currentFile = language !== undefined ? { path, language } : { path };
  }

  let selection: SessionContext["selection"];
  const selectionRaw = obj["selection"];
  if (selectionRaw !== undefined && selectionRaw !== null) {
    const selObj = requireObject(selectionRaw, "sessionContext.selection");
    const path = checkString(selObj["path"], "sessionContext.selection.path", LIMITS.sessionFilePath) as string;
    const startLine = selObj["startLine"];
    const endLine = selObj["endLine"];
    if (typeof startLine !== "number" || !Number.isInteger(startLine) || startLine < 0) {
      fail("sessionContext.selection.startLine must be a non-negative integer");
    }
    if (typeof endLine !== "number" || !Number.isInteger(endLine) || endLine < startLine) {
      fail("sessionContext.selection.endLine must be an integer >= startLine");
    }
    const text = checkString(selObj["text"], "sessionContext.selection.text", LIMITS.sessionSelectionText, {
      required: false,
    });
    checkUnknownFields(selObj, ["path", "startLine", "endLine", "text"], "sessionContext.selection");
    selection = { path, startLine, endLine, ...(text !== undefined ? { text } : {}) };
  }

  const taskDescription = checkString(
    obj["taskDescription"],
    "sessionContext.taskDescription",
    LIMITS.sessionTaskDescription,
    { required: false },
  );
  const sessionId = checkString(obj["sessionId"], "sessionContext.sessionId", LIMITS.sessionId, { required: false });
  checkUnknownFields(obj, ["currentFile", "selection", "taskDescription", "sessionId"], "sessionContext");

  const session: SessionContext = {};
  if (currentFile !== undefined) session.currentFile = currentFile;
  if (selection !== undefined) session.selection = selection;
  if (taskDescription !== undefined) session.taskDescription = taskDescription;
  if (sessionId !== undefined) session.sessionId = sessionId;
  return session;
}

function checkProviderIdConflict(
  allowed: ProviderId[] | undefined,
  forbidden: ProviderId[] | undefined,
  label: string,
): void {
  if (!allowed || !forbidden) return;
  const forbiddenSet = new Set(forbidden);
  for (const id of allowed) {
    if (forbiddenSet.has(id)) {
      fail(`${label}: provider id '${id}' cannot be both allowed and forbidden`);
    }
  }
}

const CONTEXT_REQUEST_FIELDS = [
  "requestId",
  "contractVersion",
  "project",
  "taskText",
  "hostAgent",
  "workerAgent",
  "mode",
  "budget",
  "allowedProviders",
  "forbiddenProviders",
  "freshness",
  "privacyPolicy",
  "requiredSources",
  "forbiddenSources",
  "callerCapabilities",
  "createdAt",
  "sessionContext",
  "contentFieldPolicies",
  "providerScopeOverrides",
] as const;

/**
 * Validate and normalize a caller-supplied ContextRequest. Throws
 * ValidationError (CONTEXT_VALIDATION_FAILED) on any structural or semantic
 * violation. Never mutates the input.
 */
export function validateContextRequest(input: unknown): ContextRequest {
  const obj = requireObject(input, "request");
  checkUnknownFields(obj, CONTEXT_REQUEST_FIELDS, "request");

  const requestId = checkString(obj["requestId"], "requestId", LIMITS.requestId, { required: false });
  const contractVersion = checkString(obj["contractVersion"], "contractVersion", 32) as string;

  const projectObj = requireObject(obj["project"], "project");
  const projectKey = checkString(projectObj["projectKey"], "project.projectKey", LIMITS.projectKey) as string;
  if (!/^[\w][\w.-]*$/.test(projectKey)) {
    fail("project.projectKey must match [\\w][\\w.-]* (stable slug; never a filesystem path)");
  }
  checkUnknownFields(projectObj, ["projectKey"], "project");

  const taskText = checkString(obj["taskText"], "taskText", LIMITS.taskText) as string;

  const hostAgent = validateAgentIdentity(obj["hostAgent"], "hostAgent") as AgentIdentity;
  const workerAgent = validateAgentIdentity(obj["workerAgent"], "workerAgent", { required: false });

  const mode = checkString(obj["mode"], "mode", 16) as string;
  if (!TASK_MODES.includes(mode as TaskMode)) {
    fail(`mode must be one of ${TASK_MODES.join(", ")}`);
  }

  const budget = validateBudget(obj["budget"]);

  const allowedProviders = checkStringArray(obj["allowedProviders"], "allowedProviders", 128, LIMITS.maxProviders);
  const forbiddenProviders = checkStringArray(obj["forbiddenProviders"], "forbiddenProviders", 128, LIMITS.maxProviders);
  checkProviderIdConflict(allowedProviders, forbiddenProviders, "allowedProviders/forbiddenProviders");

  const requiredSources = checkStringArray(obj["requiredSources"], "requiredSources", 256, LIMITS.maxProviders);
  const forbiddenSources = checkStringArray(obj["forbiddenSources"], "forbiddenSources", 256, LIMITS.maxProviders);
  checkProviderIdConflict(requiredSources, forbiddenSources, "requiredSources/forbiddenSources");

  const freshness = validateFreshness(obj["freshness"]);
  const privacyPolicy = validatePrivacyPolicy(obj["privacyPolicy"]);
  const callerCapabilities = validateCallerCapabilities(obj["callerCapabilities"]);
  const createdAt = checkTimestamp(obj["createdAt"], "createdAt", { required: true }) as string;
  const sessionContext = validateSessionContext(obj["sessionContext"]);
  const contentFieldPolicies = validateContentFieldPolicies(obj["contentFieldPolicies"]);
  const providerScopeOverrides = validateProviderScopeOverrides(obj["providerScopeOverrides"]);

  const request: ContextRequest = {
    contractVersion,
    project: { projectKey },
    taskText,
    hostAgent,
    mode: mode as TaskMode,
    budget,
    privacyPolicy,
    callerCapabilities,
    createdAt,
  };
  if (requestId !== undefined) request.requestId = requestId;
  if (workerAgent !== undefined) request.workerAgent = workerAgent;
  if (allowedProviders !== undefined) request.allowedProviders = allowedProviders;
  if (forbiddenProviders !== undefined) request.forbiddenProviders = forbiddenProviders;
  if (freshness !== undefined) request.freshness = freshness;
  if (requiredSources !== undefined) request.requiredSources = requiredSources;
  if (forbiddenSources !== undefined) request.forbiddenSources = forbiddenSources;
  if (sessionContext !== undefined) request.sessionContext = sessionContext;
  if (contentFieldPolicies !== undefined) request.contentFieldPolicies = contentFieldPolicies;
  if (providerScopeOverrides !== undefined) request.providerScopeOverrides = providerScopeOverrides;
  return request;
}

/** Convenience: validate a request that omits contractVersion by defaulting it to the engine's current version. */
export function validateContextRequestDefaultingVersion(input: unknown): ContextRequest {
  const obj = requireObject(input, "request");
  if (obj["contractVersion"] === undefined) {
    return validateContextRequest({ ...obj, contractVersion: CONTEXT_ENGINE_CONTRACT_VERSION });
  }
  return validateContextRequest(obj);
}
