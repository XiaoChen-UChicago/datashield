"use client";

import { useCallback, useMemo, useState } from "react";

export type DetectionReportItem = {
  type: string;
  preview: string;
  replacement: string;
  position: number;
  severity: "low" | "medium" | "high";
  token?: string | null;
};

export type DetectionEventRecord = {
  id: string;
  createdAt: string;
  strategy: string;
  detectionCount: number;
  elapsedMs: number;
  report: DetectionReportItem[];
};

type ApiEventPayload = {
  id: string;
  createdAt: string;
  strategy: string;
  detectionCount: number;
  elapsedMs: number;
  report: DetectionReportItem[];
};

const strategyOptions = [
  { value: "mask", label: "脱敏 (Mask)" },
  { value: "encrypt", label: "哈希加密 (Encrypt)" },
  { value: "tokenize", label: "令牌化 (Tokenize)" },
];

const languageOptions = [
  { value: "auto", label: "自动识别" },
  { value: "zh", label: "中文" },
  { value: "en", label: "English" },
  { value: "ko", label: "한국어" },
];

export function Workspace({ initialEvents }: { initialEvents: DetectionEventRecord[] }) {
  const [inputText, setInputText] = useState("");
  const [outputText, setOutputText] = useState("");
  const [strategy, setStrategy] = useState("mask");
  const [language, setLanguage] = useState("auto");
  const [detections, setDetections] = useState<DetectionReportItem[]>([]);
  const [stats, setStats] = useState({ count: 0, elapsed: 0 });
  const [history, setHistory] = useState(initialEvents);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleScan = useCallback(async () => {
    if (!inputText.trim()) {
      setError("请先粘贴待检测文本");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: inputText, strategy, language }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "检测失败");
      }
      const data = await res.json();
      setOutputText(data.processedText);
      setDetections(data.detections ?? []);
      setStats({ count: data.detectionCount ?? 0, elapsed: data.elapsedMs ?? 0 });
      setHistory((prev) => [
        {
          id: data.eventId,
          createdAt: new Date().toISOString(),
          strategy: String(data.strategy ?? "mask").toUpperCase(),
          detectionCount: data.detectionCount ?? 0,
          elapsedMs: data.elapsedMs ?? 0,
          report: data.detections ?? [],
        },
        ...prev,
      ].slice(0, 20));
    } catch (err) {
      setError(err instanceof Error ? err.message : "系统异常");
    } finally {
      setLoading(false);
    }
  }, [inputText, strategy, language]);

  const refreshHistory = useCallback(async () => {
    const res = await fetch("/api/report");
    if (!res.ok) return;
    const data = await res.json();
    const mapped: DetectionEventRecord[] = (data.events ?? []).map((event: ApiEventPayload) => ({
      id: event.id,
      createdAt: event.createdAt,
      strategy: String(event.strategy ?? "mask").toUpperCase(),
      detectionCount: event.detectionCount ?? 0,
      elapsedMs: event.elapsedMs ?? 0,
      report: event.report ?? [],
    }));
    setHistory(mapped);
  }, []);

  const severityColor = useCallback((severity: DetectionReportItem["severity"]) => {
    switch (severity) {
      case "high":
        return "text-rose-400 bg-rose-400/10";
      case "medium":
        return "text-amber-400 bg-amber-400/10";
      default:
        return "text-emerald-400 bg-emerald-400/10";
    }
  }, []);

  const strategyLabel = useMemo(() => {
    const found = strategyOptions.find((opt) => opt.value === strategy);
    return found ? found.label : strategyOptions[0].label;
  }, [strategy]);

  return (
    <section id="workspace" className="space-y-6 rounded-[32px] border border-white/10 bg-white/5 p-6 backdrop-blur">
      <div className="flex flex-col gap-2">
        <p className="text-xs uppercase tracking-[0.3em] text-white/60">Realtime Console</p>
        <h2 className="text-3xl font-bold text-white">数据保护工作台</h2>
        <p className="text-sm text-white/70">粘贴日志 / API 响应，系统将即时检测 8+ 类敏感凭证并执行 {strategyLabel}。</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/5 p-4">
          <label className="text-sm text-white/70">原始数据</label>
          <textarea
            className="min-h-[240px] rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-white placeholder:text-white/40"
            placeholder="粘贴 sk- / AKIA / 身份证 / 电话 / JWT 等，系统不会存储原文"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
          />
          <div className="flex flex-wrap gap-3">
            <div className="flex flex-1 flex-col gap-1">
              <label className="text-xs text-white/50">保护策略</label>
              <select
                value={strategy}
                onChange={(e) => setStrategy(e.target.value)}
                className="rounded-2xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
              >
                {strategyOptions.map((option) => (
                  <option key={option.value} value={option.value} className="bg-slate-900">
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-1 flex-col gap-1">
              <label className="text-xs text-white/50">检测语言</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="rounded-2xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
              >
                {languageOptions.map((option) => (
                  <option key={option.value} value={option.value} className="bg-slate-900">
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={handleScan}
              disabled={loading}
              className="flex-1 rounded-2xl bg-gradient-to-r from-teal-400 to-purple-500 px-4 py-3 text-sm font-semibold text-black shadow-lg disabled:opacity-50"
            >
              {loading ? "检测中..." : "开始检测"}
            </button>
          </div>
          {error && <p className="rounded-2xl bg-rose-500/10 px-3 py-2 text-sm text-rose-200">{error}</p>}
        </div>

        <div className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/5 p-4">
          <label className="text-sm text-white/70">保护结果</label>
          <textarea
            className="min-h-[240px] rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-emerald-100"
            value={outputText}
            readOnly
            placeholder="处理后的文本将显示在这里"
          />
          <div className="grid grid-cols-3 gap-3 text-center text-white">
            <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
              <p className="text-3xl font-semibold">{stats.count}</p>
              <p className="text-xs text-white/60">命中片段</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
              <p className="text-3xl font-semibold">{strategy.toUpperCase()}</p>
              <p className="text-xs text-white/60">策略</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
              <p className="text-3xl font-semibold">{stats.elapsed}ms</p>
              <p className="text-xs text-white/60">耗时</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-white/10 bg-black/30 p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">检测报表</h3>
            <button onClick={refreshHistory} className="text-xs text-white/60 hover:text-white">刷新</button>
          </div>
          <div className="mt-4 space-y-3 overflow-y-auto">
            {detections.length === 0 && <p className="text-sm text-white/50">尚无检测结果</p>}
            {detections.map((item, idx) => (
              <div key={`${item.type}-${idx}`} className="rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-white">
                <div className="flex items-center justify-between text-xs">
                  <span className={`rounded-full px-2 py-0.5 text-[11px] ${severityColor(item.severity)}`}>{item.severity.toUpperCase()}</span>
                  <span className="text-white/50">@{item.position}</span>
                </div>
                <p className="mt-2 text-sm font-semibold text-white">{item.type}</p>
                <p className="text-xs text-white/60">样例: {item.preview}</p>
                <p className="text-xs text-white/60">输出: {item.replacement}</p>
                {item.token && <p className="text-xs text-teal-200">Token: {item.token}</p>}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-black/30 p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">最近事件</h3>
            <span className="text-xs text-white/50">过去 {history.length} 条</span>
          </div>
          <div className="mt-4 space-y-3 text-sm text-white/80">
            {history.length === 0 && <p className="text-sm text-white/50">暂无历史记录</p>}
            {history.map((event) => (
              <div key={event.id} className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <div className="flex items-center justify-between text-xs text-white/60">
                  <span>{new Date(event.createdAt).toLocaleString()}</span>
                  <span>#{event.detectionCount} · {event.strategy.toUpperCase()}</span>
                </div>
                <p className="text-xs text-white/50">耗时 {event.elapsedMs} ms</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
