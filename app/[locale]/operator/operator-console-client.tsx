"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clipboard,
  Database,
  Eye,
  FileJson,
  Gavel,
  KeyRound,
  ListRestart,
  Play,
  RefreshCw,
  Save,
  ShieldCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  buildApiFootballFixtureDraft,
  buildDisputeDraft,
  buildDisputeResolutionDraft,
  buildEvidenceSnapshotDraft,
  buildOracleAssertionDraft,
  buildResolutionPolicyDraft,
  buildSumoJsaObservationDraft,
  type OperatorConsoleMarket,
} from "@/lib/operator-console/default-payloads";
import { getInspectableArchiveUrl } from "@/lib/operator-console/archive-records";
import { cn } from "@/lib/utils";

type Outcome = {
  id?: string;
  slug: string;
  name: string;
};

type AdminMarketListItem = OperatorConsoleMarket & {
  slug: string;
  lifecycle: string;
  category: string;
  resolution?: {
    status: string;
    proposedOutcome?: string | null;
    finalOutcome?: string | null;
  } | null;
  outcomes?: Outcome[];
};

type MarketDetail = AdminMarketListItem & {
  resolutionPolicy?: unknown;
  resolution?: {
    status: string;
    proposedOutcome?: string | null;
    finalOutcome?: string | null;
    disputeDeadline?: string | null;
    sourceSnapshot?: unknown;
  } | null;
  chainDeployments?: Array<{
    chain: string;
    deployStatus: string;
    contractAddress?: string | null;
    poolAddress?: string | null;
  }>;
};

type ApiRecord = Record<string, unknown>;

type ConsoleLog = {
  id: number;
  tone: "ok" | "error" | "info";
  message: string;
};

const STORAGE_KEY = "kiai.operatorToken";

function pretty(value: unknown) {
  return JSON.stringify(value, null, 2);
}

function parseJson(value: string) {
  try {
    return { ok: true as const, data: JSON.parse(value) as unknown };
  } catch (err) {
    return {
      ok: false as const,
      message: err instanceof Error ? err.message : "Invalid JSON",
    };
  }
}

function recordTitle(record: ApiRecord, fallback: string) {
  return String(record.sourceName ?? record.reason ?? record.provider ?? record.chain ?? fallback);
}

export function OperatorConsoleClient() {
  const [token, setToken] = useState("");
  const [markets, setMarkets] = useState<AdminMarketListItem[]>([]);
  const [selectedMarketId, setSelectedMarketId] = useState("");
  const [market, setMarket] = useState<MarketDetail | null>(null);
  const [evidenceSnapshots, setEvidenceSnapshots] = useState<ApiRecord[]>([]);
  const [disputes, setDisputes] = useState<ApiRecord[]>([]);
  const [oracleAssertions, setOracleAssertions] = useState<ApiRecord[]>([]);
  const [settlementJobs, setSettlementJobs] = useState<ApiRecord[]>([]);
  const [policyJson, setPolicyJson] = useState("");
  const [evidenceJson, setEvidenceJson] = useState("");
  const [oracleJson, setOracleJson] = useState("");
  const [disputeJson, setDisputeJson] = useState("");
  const [disputeResolutionJson, setDisputeResolutionJson] = useState("");
  const [sumoJson, setSumoJson] = useState("");
  const [apiFootballJson, setApiFootballJson] = useState("");
  const [proposalJson, setProposalJson] = useState("");
  const [adapterResult, setAdapterResult] = useState("");
  const [archivePreviewJson, setArchivePreviewJson] = useState("");
  const [opsStatusJson, setOpsStatusJson] = useState("");
  const [busy, setBusy] = useState(false);
  const [logs, setLogs] = useState<ConsoleLog[]>([]);

  const selectedMarketForDrafts = useMemo<OperatorConsoleMarket | null>(
    () =>
      market
        ? {
            id: market.id,
            slug: market.slug,
            titleEn: market.titleEn,
            outcomes: market.outcomes,
          }
        : null,
    [market]
  );

  useEffect(() => {
    const stored = window.sessionStorage.getItem(STORAGE_KEY);
    if (stored) setToken(stored);
  }, []);

  useEffect(() => {
    if (!selectedMarketForDrafts) return;
    setPolicyJson(pretty(market?.resolutionPolicy ?? buildResolutionPolicyDraft(selectedMarketForDrafts)));
    setEvidenceJson(pretty(buildEvidenceSnapshotDraft(selectedMarketForDrafts)));
    setOracleJson(pretty(buildOracleAssertionDraft(selectedMarketForDrafts)));
    setDisputeJson(pretty(buildDisputeDraft()));
    setDisputeResolutionJson(pretty(buildDisputeResolutionDraft()));
    setSumoJson(pretty(buildSumoJsaObservationDraft(selectedMarketForDrafts)));
    setApiFootballJson(pretty(buildApiFootballFixtureDraft(selectedMarketForDrafts)));
    setProposalJson("");
    setAdapterResult("");
    setArchivePreviewJson("");
    setOpsStatusJson("");
  }, [market?.resolutionPolicy, selectedMarketForDrafts]);

  function pushLog(tone: ConsoleLog["tone"], message: string) {
    setLogs((current) => [
      { id: Date.now() + Math.random(), tone, message },
      ...current,
    ].slice(0, 8));
  }

  function saveToken() {
    window.sessionStorage.setItem(STORAGE_KEY, token);
    pushLog("ok", "Operator token saved for this browser session.");
  }

  async function adminApi<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    if (!token) throw new Error("Operator token is required.");

    const response = await fetch(path, {
      ...options,
      headers: {
        Authorization: "Bearer " + token,
        "Content-Type": "application/json",
        ...(options.headers ?? {}),
      },
    });
    const text = await response.text();
    const body = text ? JSON.parse(text) : null;

    if (!response.ok) {
      const message =
        body?.message ??
        body?.error ??
        "Request failed with HTTP " + response.status;
      throw new Error(String(message));
    }

    return body as T;
  }

  async function run(label: string, task: () => Promise<void>) {
    setBusy(true);
    try {
      await task();
      pushLog("ok", label + " completed.");
    } catch (err) {
      pushLog("error", label + ": " + (err instanceof Error ? err.message : "Unknown error"));
    } finally {
      setBusy(false);
    }
  }

  async function refreshMarkets() {
    await run("Refresh markets", async () => {
      const data = await adminApi<{ markets: AdminMarketListItem[] }>("/api/admin/markets");
      setMarkets(data.markets);
      const nextId = selectedMarketId || data.markets[0]?.id || "";
      setSelectedMarketId(nextId);
      if (nextId) await loadMarket(nextId);
    });
  }

  async function refreshOpsStatus() {
    await run("Refresh ops status", async () => {
      const status = await adminApi<unknown>("/api/admin/ops/status");
      setOpsStatusJson(pretty(status));
    });
  }

  async function loadMarket(id: string) {
    const [detail, evidence, disputeList, oracleList, jobs] = await Promise.all([
      adminApi<{ market: MarketDetail }>("/api/admin/markets/" + id),
      adminApi<{ evidenceSnapshots: ApiRecord[] }>("/api/admin/markets/" + id + "/evidence"),
      adminApi<{ disputes: ApiRecord[] }>("/api/admin/markets/" + id + "/disputes"),
      adminApi<{ oracleAssertions: ApiRecord[] }>("/api/admin/markets/" + id + "/oracle-assertions"),
      adminApi<{ jobs: ApiRecord[] }>("/api/admin/markets/" + id + "/settlement"),
    ]);
    setMarket(detail.market);
    setEvidenceSnapshots(evidence.evidenceSnapshots);
    setDisputes(disputeList.disputes);
    setOracleAssertions(oracleList.oracleAssertions);
    setSettlementJobs(jobs.jobs);
  }

  async function reloadSelected(label = "Reload market") {
    if (!selectedMarketId) {
      pushLog("error", "Select a market first.");
      return;
    }
    await run(label, async () => loadMarket(selectedMarketId));
  }

  async function postJson(label: string, path: string, json: string) {
    const parsed = parseJson(json);
    if (!parsed.ok) {
      pushLog("error", label + ": " + parsed.message);
      return;
    }
    await run(label, async () => {
      await adminApi(path, {
        method: "POST",
        body: JSON.stringify(parsed.data),
      });
      await loadMarket(selectedMarketId);
    });
  }

  async function putPolicy() {
    const parsed = parseJson(policyJson);
    if (!parsed.ok) {
      pushLog("error", "Save policy: " + parsed.message);
      return;
    }
    await run("Save resolution policy", async () => {
      await adminApi("/api/admin/markets/" + selectedMarketId + "/resolution-policy", {
        method: "PUT",
        body: JSON.stringify(parsed.data),
      });
      await loadMarket(selectedMarketId);
    });
  }

  async function transitionLifecycle(lifecycle: string) {
    await run("Move to " + lifecycle, async () => {
      await adminApi("/api/admin/markets/" + selectedMarketId, {
        method: "PATCH",
        body: JSON.stringify({
          lifecycle,
          reason: "operator console transition",
        }),
      });
      await loadMarket(selectedMarketId);
    });
  }

  async function runSumoAdapter() {
    const parsed = parseJson(sumoJson);
    if (!parsed.ok) {
      pushLog("error", "Run Sumo/JSA adapter: " + parsed.message);
      return;
    }
    await run("Run Sumo/JSA adapter", async () => {
      const result = await adminApi<{
        suggestedResolution?: unknown;
      }>("/api/admin/markets/" + selectedMarketId + "/source-adapters/sumo-jsa", {
        method: "POST",
        body: JSON.stringify(parsed.data),
      });
      setAdapterResult(pretty(result));
      if (result.suggestedResolution) {
        setProposalJson(pretty(result.suggestedResolution));
      }
    });
  }

  async function runApiFootballAdapter() {
    const parsed = parseJson(apiFootballJson);
    if (!parsed.ok) {
      pushLog("error", "Run API-Football adapter: " + parsed.message);
      return;
    }
    await run("Run API-Football adapter", async () => {
      const result = await adminApi<{
        suggestedResolution?: unknown;
      }>("/api/admin/markets/" + selectedMarketId + "/source-adapters/api-football", {
        method: "POST",
        body: JSON.stringify(parsed.data),
      });
      setAdapterResult(pretty(result));
      if (result.suggestedResolution) {
        setProposalJson(pretty(result.suggestedResolution));
      }
    });
  }

  async function resolveFirstOpenDispute() {
    const openDispute = disputes.find((dispute) => dispute.status === "OPEN");
    if (!openDispute?.id) {
      pushLog("error", "No open dispute is available to resolve.");
      return;
    }

    const parsed = parseJson(disputeResolutionJson);
    if (!parsed.ok) {
      pushLog("error", "Resolve dispute: " + parsed.message);
      return;
    }

    await run("Resolve first open dispute", async () => {
      await adminApi(
        "/api/admin/markets/" + selectedMarketId + "/disputes/" + openDispute.id,
        {
          method: "PATCH",
          body: JSON.stringify(parsed.data),
        }
      );
      await loadMarket(selectedMarketId);
    });
  }

  async function settlementAction(action: "prepare" | "run") {
    await run(action === "prepare" ? "Prepare settlement jobs" : "Run settlement jobs", async () => {
      await adminApi("/api/admin/markets/" + selectedMarketId + "/settlement", {
        method: "POST",
        body: JSON.stringify({ action }),
      });
      await loadMarket(selectedMarketId);
    });
  }

  async function inspectArchive(record: ApiRecord) {
    const archiveUrl = getInspectableArchiveUrl(record);
    if (!archiveUrl) {
      pushLog("error", "Evidence archive is not an internal inspectable URL.");
      return;
    }

    await run("Inspect evidence archive", async () => {
      const archive = await adminApi<unknown>(archiveUrl);
      setArchivePreviewJson(pretty(archive));
    });
  }

  const marketDisabled = busy || !selectedMarketId;

  return (
    <div className="min-h-screen bg-background-secondary">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-4 px-4 py-5 lg:px-6">
        <section className="rounded-lg border border-border bg-background p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                <h1 className="text-xl font-semibold text-foreground">
                  KIAI Operator Console
                </h1>
              </div>
              <p className="mt-1 text-sm text-foreground-secondary">
                Resolution policy, evidence, dispute, oracle, and settlement workflow.
              </p>
            </div>
            <div className="flex min-w-0 flex-col gap-2 sm:flex-row">
              <Input
                aria-label="Operator bearer token"
                className="min-w-[280px]"
                placeholder="OPERATOR_SECRET bearer token"
                type="password"
                value={token}
                onChange={(event) => setToken(event.target.value)}
              />
              <Button type="button" onClick={saveToken} disabled={!token || busy}>
                <KeyRound className="h-4 w-4" />
                Save
              </Button>
              <Button type="button" variant="outline" onClick={refreshMarkets} disabled={!token || busy}>
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
              <Button type="button" variant="outline" onClick={refreshOpsStatus} disabled={!token || busy}>
                <Activity className="h-4 w-4" />
                Ops
              </Button>
            </div>
          </div>
        </section>

        <div className="grid gap-4 xl:grid-cols-[320px_1fr]">
          <aside className="rounded-lg border border-border bg-background p-3">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">Markets</h2>
              <Badge variant="outline">{markets.length}</Badge>
            </div>
            <div className="flex max-h-[720px] flex-col gap-2 overflow-auto">
              {markets.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={cn(
                    "rounded-md border border-border p-3 text-left transition hover:border-primary/50 hover:bg-primary-light/30",
                    selectedMarketId === item.id && "border-primary bg-primary-light/40"
                  )}
                  onClick={() => {
                    setSelectedMarketId(item.id);
                    run("Load market", async () => loadMarket(item.id));
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="line-clamp-2 text-sm font-medium text-foreground">
                      {item.titleEn}
                    </span>
                    <Badge variant="outline">{item.lifecycle}</Badge>
                  </div>
                  <div className="mt-2 text-xs text-foreground-muted">{item.slug}</div>
                </button>
              ))}
              {markets.length === 0 && (
                <div className="rounded-md border border-dashed border-border p-4 text-sm text-foreground-muted">
                  Save token, then refresh.
                </div>
              )}
            </div>
          </aside>

          <main className="flex flex-col gap-4">
            <section className="grid gap-3 lg:grid-cols-4">
              <StatusTile label="Lifecycle" value={market?.lifecycle ?? "-"} />
              <StatusTile label="Resolution" value={market?.resolution?.status ?? "-"} />
              <StatusTile label="Evidence" value={String(evidenceSnapshots.length)} />
              <StatusTile label="Settlement Jobs" value={String(settlementJobs.length)} />
            </section>

            <section className="rounded-lg border border-border bg-background p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">
                    {market?.titleEn ?? "Select a market"}
                  </h2>
                  <p className="text-sm text-foreground-muted">
                    {market?.id ?? "No market selected"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {["REVIEWED", "DEPLOY_PENDING", "LIVE", "CLOSED"].map((state) => (
                    <Button
                      key={state}
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={marketDisabled}
                      onClick={() => transitionLifecycle(state)}
                    >
                      {state}
                    </Button>
                  ))}
                  <Button type="button" size="sm" disabled={marketDisabled} onClick={() => reloadSelected()}>
                    <RefreshCw className="h-4 w-4" />
                    Reload
                  </Button>
                </div>
              </div>
            </section>

            <section className="grid gap-4 xl:grid-cols-2">
              <JsonPanel
                title="Resolution Policy"
                icon={<FileJson className="h-4 w-4" />}
                value={policyJson}
                onChange={setPolicyJson}
                actionLabel="Save Policy"
                actionIcon={<Save className="h-4 w-4" />}
                disabled={marketDisabled}
                onAction={putPolicy}
              />
              <JsonPanel
                title="Official Evidence Snapshot"
                icon={<Database className="h-4 w-4" />}
                value={evidenceJson}
                onChange={setEvidenceJson}
                actionLabel="Create Evidence"
                actionIcon={<Clipboard className="h-4 w-4" />}
                disabled={marketDisabled}
                onAction={() =>
                  postJson(
                    "Create evidence snapshot",
                    "/api/admin/markets/" + selectedMarketId + "/evidence",
                    evidenceJson
                  )
                }
              />
              <JsonPanel
                title="Sumo/JSA Source Adapter"
                icon={<ListRestart className="h-4 w-4" />}
                value={sumoJson}
                onChange={setSumoJson}
                actionLabel="Build Proposal"
                actionIcon={<Play className="h-4 w-4" />}
                disabled={marketDisabled}
                onAction={runSumoAdapter}
              />
              <JsonPanel
                title="API-Football Source Adapter"
                icon={<Activity className="h-4 w-4" />}
                value={apiFootballJson}
                onChange={setApiFootballJson}
                actionLabel="Fetch Fixture"
                actionIcon={<Play className="h-4 w-4" />}
                disabled={marketDisabled}
                onAction={runApiFootballAdapter}
              />
              <JsonPanel
                title="Resolution Proposal"
                icon={<CheckCircle2 className="h-4 w-4" />}
                value={proposalJson}
                onChange={setProposalJson}
                actionLabel="Submit Proposal"
                actionIcon={<Gavel className="h-4 w-4" />}
                disabled={marketDisabled || !proposalJson}
                onAction={() =>
                  postJson(
                    "Submit resolution proposal",
                    "/api/admin/markets/" + selectedMarketId + "/resolution",
                    proposalJson
                  )
                }
              />
              <JsonPanel
                title="Oracle Assertion"
                icon={<ShieldCheck className="h-4 w-4" />}
                value={oracleJson}
                onChange={setOracleJson}
                actionLabel="Record Oracle"
                actionIcon={<Save className="h-4 w-4" />}
                disabled={marketDisabled}
                onAction={() =>
                  postJson(
                    "Record oracle assertion",
                    "/api/admin/markets/" + selectedMarketId + "/oracle-assertions",
                    oracleJson
                  )
                }
              />
              <div className="rounded-lg border border-border bg-background p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-semibold text-foreground">Disputes</h3>
                  </div>
                  <Badge variant="outline">{disputes.length}</Badge>
                </div>
                <Textarea
                  className="min-h-[148px] font-mono text-xs"
                  value={disputeJson}
                  onChange={(event) => setDisputeJson(event.target.value)}
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    disabled={marketDisabled}
                    onClick={() =>
                      postJson(
                        "Open dispute",
                        "/api/admin/markets/" + selectedMarketId + "/disputes",
                        disputeJson
                      )
                    }
                  >
                    <AlertTriangle className="h-4 w-4" />
                    Open
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={marketDisabled}
                    onClick={resolveFirstOpenDispute}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Resolve First Open
                  </Button>
                </div>
                <Textarea
                  className="mt-3 min-h-[96px] font-mono text-xs"
                  value={disputeResolutionJson}
                  onChange={(event) => setDisputeResolutionJson(event.target.value)}
                />
              </div>
            </section>

            <section className="grid gap-4 xl:grid-cols-2">
              <JsonPanel
                title="Ops Status"
                icon={<Activity className="h-4 w-4" />}
                value={opsStatusJson}
                onChange={setOpsStatusJson}
                actionLabel="Refresh Ops"
                actionIcon={<RefreshCw className="h-4 w-4" />}
                disabled={!token || busy}
                onAction={refreshOpsStatus}
              />
              <EvidenceArchivePanel
                records={evidenceSnapshots}
                archivePreviewJson={archivePreviewJson}
                disabled={busy}
                onInspectArchive={inspectArchive}
              />
              <RecordList title="Oracle Assertions" records={oracleAssertions} />
              <RecordList title="Resolution Disputes" records={disputes} />
              <div className="rounded-lg border border-border bg-background p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground">Settlement Jobs</h3>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={marketDisabled}
                      onClick={() => settlementAction("prepare")}
                    >
                      Prepare
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      disabled={marketDisabled}
                      onClick={() => settlementAction("run")}
                    >
                      Run
                    </Button>
                  </div>
                </div>
                <RecordRows records={settlementJobs} />
              </div>
            </section>

            {adapterResult && (
              <JsonPanel
                title="Latest Adapter Result"
                icon={<FileJson className="h-4 w-4" />}
                value={adapterResult}
                onChange={setAdapterResult}
                actionLabel="Copy Into Proposal"
                actionIcon={<Clipboard className="h-4 w-4" />}
                disabled={!adapterResult}
                onAction={() => {
                  const parsed = parseJson(adapterResult);
                  if (parsed.ok && typeof parsed.data === "object" && parsed.data) {
                    const maybe = parsed.data as { suggestedResolution?: unknown };
                    if (maybe.suggestedResolution) {
                      setProposalJson(pretty(maybe.suggestedResolution));
                      pushLog("ok", "Adapter proposal copied.");
                    }
                  }
                }}
              />
            )}

            <section className="rounded-lg border border-border bg-background p-4">
              <h3 className="mb-3 text-sm font-semibold text-foreground">Activity</h3>
              <div className="flex flex-col gap-2">
                {logs.map((entry) => (
                  <div
                    key={entry.id}
                    className={cn(
                      "rounded-md border px-3 py-2 text-sm",
                      entry.tone === "ok" && "border-green-200 bg-green-50 text-green-800",
                      entry.tone === "error" && "border-red-200 bg-red-50 text-red-800",
                      entry.tone === "info" && "border-border bg-muted text-foreground-secondary"
                    )}
                  >
                    {entry.message}
                  </div>
                ))}
                {logs.length === 0 && (
                  <p className="text-sm text-foreground-muted">No actions yet.</p>
                )}
              </div>
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}

function StatusTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-background p-4">
      <div className="text-xs font-medium uppercase text-foreground-muted">{label}</div>
      <div className="mt-2 truncate text-lg font-semibold text-foreground">{value}</div>
    </div>
  );
}

function JsonPanel({
  title,
  icon,
  value,
  onChange,
  actionLabel,
  actionIcon,
  disabled,
  onAction,
}: {
  title: string;
  icon: ReactNode;
  value: string;
  onChange: (value: string) => void;
  actionLabel: string;
  actionIcon: ReactNode;
  disabled?: boolean;
  onAction: () => void;
}) {
  return (
    <div className="rounded-lg border border-border bg-background p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        </div>
        <Button type="button" size="sm" disabled={disabled} onClick={onAction}>
          {actionIcon}
          {actionLabel}
        </Button>
      </div>
      <Textarea
        className="min-h-[280px] font-mono text-xs"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

function RecordList({ title, records }: { title: string; records: ApiRecord[] }) {
  return (
    <div className="rounded-lg border border-border bg-background p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <Badge variant="outline">{records.length}</Badge>
      </div>
      <RecordRows records={records} />
    </div>
  );
}

function EvidenceArchivePanel({
  records,
  archivePreviewJson,
  disabled,
  onInspectArchive,
}: {
  records: ApiRecord[];
  archivePreviewJson: string;
  disabled?: boolean;
  onInspectArchive: (record: ApiRecord) => void;
}) {
  return (
    <div className="rounded-lg border border-border bg-background p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Evidence Snapshots</h3>
        <Badge variant="outline">{records.length}</Badge>
      </div>
      <RecordRows
        records={records}
        renderActions={(record) => {
          const archiveUrl = getInspectableArchiveUrl(record);
          return (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={disabled || !archiveUrl}
              onClick={() => onInspectArchive(record)}
            >
              <Eye className="h-4 w-4" />
              Inspect Archive
            </Button>
          );
        }}
      />
      {archivePreviewJson && (
        <div className="mt-3 rounded-md border border-border bg-muted/30 p-3">
          <div className="mb-2 text-xs font-semibold uppercase text-foreground-muted">
            Latest archive artifact
          </div>
          <pre className="max-h-72 overflow-auto whitespace-pre-wrap text-xs text-foreground-muted">
            {archivePreviewJson}
          </pre>
        </div>
      )}
    </div>
  );
}

function RecordRows({
  records,
  renderActions,
}: {
  records: ApiRecord[];
  renderActions?: (record: ApiRecord) => ReactNode;
}) {
  if (records.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border p-4 text-sm text-foreground-muted">
        Empty
      </div>
    );
  }

  return (
    <div className="flex max-h-[320px] flex-col gap-2 overflow-auto">
      {records.map((record, index) => (
        <div key={String(record.id ?? index)} className="rounded-md border border-border p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="truncate text-sm font-medium text-foreground">
              {recordTitle(record, "Record " + (index + 1))}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {renderActions?.(record)}
              <Badge variant="outline">
                {String(record.status ?? record.action ?? record.kind ?? "-")}
              </Badge>
            </div>
          </div>
          <pre className="mt-2 max-h-28 overflow-auto whitespace-pre-wrap text-xs text-foreground-muted">
            {pretty(record)}
          </pre>
        </div>
      ))}
    </div>
  );
}
