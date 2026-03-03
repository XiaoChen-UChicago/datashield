export const dynamic = "force-dynamic";


import { Workspace } from "@/components/workspace";
import { prisma } from "@/lib/prisma";
import { DetectionReportItem } from "@/components/workspace";

function serializeReport(report: unknown): DetectionReportItem[] {
  if (!Array.isArray(report)) return [];
  return report as DetectionReportItem[];
}

export default async function Home() {
  const events = await prisma.detectionEvent.findMany({ orderBy: { createdAt: "desc" }, take: 10 });
  type EventRecord = (typeof events)[number];
  const initialEvents = events.map((event: EventRecord) => ({
    id: event.id,
    createdAt: event.createdAt.toISOString(),
    strategy: event.strategy,
    detectionCount: event.detectionCount,
    elapsedMs: event.elapsedMs,
    report: serializeReport(event.report),
  }));

  return (
    <main className="min-h-screen bg-[#05060c] pb-16 text-white">
      <div className="mx-auto w-full max-w-6xl space-y-10 px-4 py-12">
        <header className="space-y-6">
          <p className="text-xs uppercase tracking-[0.5em] text-white/60">DataShield Pro · Preview</p>
          <h1 className="text-4xl font-semibold leading-tight text-white">敏感数据实时检测 & 保护平台</h1>
          <p className="text-base text-white/70">
            针对 API 响应、日志、LLM 输出进行秒级扫描，提供 Mask / Encrypt / Tokenize 三重策略，并自动沉淀审计报表。
          </p>
        </header>

        <Workspace initialEvents={initialEvents} />

        <section id="engine" className="rounded-[32px] border border-white/10 bg-white/5 p-6 backdrop-blur">
          <div className="flex flex-col gap-2">
            <p className="text-xs uppercase tracking-[0.3em] text-white/60">Detection Engine</p>
            <h2 className="text-2xl font-semibold text-white">覆盖类型 & 策略</h2>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-3xl border border-white/10 bg-black/30 p-4">
              <h3 className="text-lg font-semibold">敏感要素</h3>
              <ul className="mt-3 list-disc pl-4 text-sm text-white/70">
                <li>API 密钥：OpenAI / AWS / GitHub / Slack</li>
                <li>凭证：JWT / OAuth / Webhook URLs</li>
                <li>个人信息：邮箱、手机号、身份证</li>
                <li>金融：银行卡号（Luhn 校验）</li>
              </ul>
            </div>
            <div className="rounded-3xl border border-white/10 bg-black/30 p-4">
              <h3 className="text-lg font-semibold">策略流水线</h3>
              <ul className="mt-3 list-disc pl-4 text-sm text-white/70">
                <li>Mask：保首尾字符，中间 *
                </li>
                <li>Encrypt：SHA-256 指纹 `[ENC_xxxx]`
                </li>
                <li>Tokenize：AES-GCM 金库 + 可控还原</li>
              </ul>
            </div>
            <div className="rounded-3xl border border-white/10 bg-black/30 p-4">
              <h3 className="text-lg font-semibold">合规支撑</h3>
              <p className="mt-3 text-sm text-white/70">
                自动生成审计事件，记录策略、命中类型、时间戳；支持导出 JSON / 后续对接 PIPL / GDPR / HIPAA 报告模板。
              </p>
            </div>
          </div>
        </section>

        <section id="compliance" className="rounded-[32px] border border-white/10 bg-gradient-to-br from-white/5 to-emerald-500/10 p-6 backdrop-blur">
          <p className="text-xs uppercase tracking-[0.3em] text-white/60">Roadmap</p>
          <h2 className="text-2xl font-semibold text-white">下一步</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3 text-sm text-white/80">
            <div className="rounded-3xl border border-white/10 bg-black/40 p-4">
              <h3 className="text-lg font-semibold text-white">Beta</h3>
              <ul className="mt-2 list-disc pl-4">
                <li>Policy-as-Code (YAML)</li>
                <li>LLM Guard 插件</li>
                <li>Webhook / SIEM 集成</li>
              </ul>
            </div>
            <div className="rounded-3xl border border-white/10 bg-black/40 p-4">
              <h3 className="text-lg font-semibold text-white">GA</h3>
              <ul className="mt-2 list-disc pl-4">
                <li>多租户 & SSO</li>
                <li>BYOK / KMS / HSM</li>
                <li>私有化 Helm Chart</li>
              </ul>
            </div>
            <div className="rounded-3xl border border-white/10 bg-black/40 p-4">
              <h3 className="text-lg font-semibold text-white">商用</h3>
              <ul className="mt-2 list-disc pl-4">
                <li>计费 / 限流 / SLA</li>
                <li>合规报告中心</li>
                <li>安全运营 API</li>
              </ul>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
