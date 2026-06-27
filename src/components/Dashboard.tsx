"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  LabelList,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  Compass,
  Database,
  DollarSign,
  Download,
  Filter,
  HelpCircle,
  RefreshCw,
  Search,
  Target,
  TrendingUp,
  Users,
  X
} from "lucide-react";
import type { DailyPoint, InsightData, Segment, ThemeItem, Tone } from "@/types/insights";

type DashboardProps = {
  initialData: InsightData;
};

const segmentOptions = [
  { key: "sources", label: "Source" },
  { key: "mediums", label: "Medium" },
  { key: "campaigns", label: "Campaign" },
  { key: "campaignFamilies", label: "Campaign family" },
  { key: "grades", label: "Grade" },
  { key: "capital", label: "Capital" },
  { key: "profession", label: "Profession" },
  { key: "income", label: "Income" },
  { key: "wantsMost", label: "Goal" },
  { key: "frustrations", label: "Frustration" },
  { key: "following", label: "Following" },
  { key: "preWebinar", label: "Pre-webinar" }
];

const colors = {
  ink: "#172033",
  muted: "#667085",
  grid: "#e4e7ec",
  blue: "#2563eb",
  teal: "#0f9f8f",
  green: "#16a34a",
  amber: "#d97706",
  red: "#dc2626",
  purple: "#7c3aed",
  rose: "#e11d48"
};

const chartPalette = [colors.blue, colors.teal, colors.amber, colors.green, colors.rose, colors.purple];

function numberFormat(value: number) {
  return new Intl.NumberFormat("en-US").format(Math.round(value));
}

function compactNumber(value: number) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1
  }).format(value);
}

function money(value: number, compact = false) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: compact ? "compact" : "standard",
    maximumFractionDigits: value >= 1000 || compact ? 0 : 2
  }).format(value);
}

function pct(value: number) {
  return `${(value * 100).toFixed(value > 0.1 ? 1 : 2)}%`;
}

function dateLabel(value: string | null) {
  if (!value) return "Unknown";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(value));
}

function shortDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric"
  }).format(new Date(`${value}T00:00:00Z`));
}

function toneClass(tone: Tone) {
  if (tone === "positive") return "insight insightPositive";
  if (tone === "warning") return "insight insightWarning";
  return "insight insightNeutral";
}

function MetricHint({ text }: { text: string }) {
  return (
    <span className="metricHint" tabIndex={0} aria-label={text}>
      <HelpCircle size={14} />
      <span className="metricBubble">{text}</span>
    </span>
  );
}

function CustomTooltip({
  active,
  payload,
  label
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number; color?: string; dataKey?: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="tooltip">
      {label ? <div className="tooltipTitle">{label}</div> : null}
      {payload.map((item) => {
        const rawValue = Number(item.value ?? 0);
        const formatted =
          String(item.dataKey ?? "").toLowerCase().includes("cash") ||
          String(item.name ?? "").toLowerCase().includes("cash")
            ? money(rawValue)
            : numberFormat(rawValue);
        return (
          <div className="tooltipRow" key={`${item.name}-${item.dataKey}`}>
            <span className="tooltipDot" style={{ background: item.color }} />
            <span>{item.name}</span>
            <strong>{formatted}</strong>
          </div>
        );
      })}
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  sub,
  accent,
  hint
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  accent: string;
  hint: string;
}) {
  return (
    <article className="kpi">
      <div className="kpiIcon" style={{ color: accent, background: `${accent}16` }}>
        {icon}
      </div>
      <div>
        <div className="kpiLabel">
          <p>{label}</p>
          <MetricHint text={hint} />
        </div>
        <strong>{value}</strong>
        <span>{sub}</span>
      </div>
    </article>
  );
}

function SectionHeader({
  eyebrow,
  title,
  right
}: {
  eyebrow: string;
  title: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="sectionHeader">
      <div>
        <span>{eyebrow}</span>
        <h2>{title}</h2>
      </div>
      {right}
    </div>
  );
}

function SegmentTable({ rows }: { rows: Segment[] }) {
  return (
    <div className="tableWrap">
      <table>
        <thead>
          <tr>
            <th>Segment</th>
            <th>Leads</th>
            <th>Cash</th>
            <th>Cash/lead</th>
            <th>Booked</th>
            <th>Close rate</th>
            <th>Avg score</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.name}>
              <td>
                <strong>{row.name}</strong>
                <span>{pct(row.leadShare)} of leads</span>
              </td>
              <td>{numberFormat(row.leads)}</td>
              <td>{money(row.cash)}</td>
              <td>{money(row.cashPerLead)}</td>
              <td>{pct(row.bookedRate)}</td>
              <td>{pct(row.closedRate)}</td>
              <td>{row.avgScore ? row.avgScore.toFixed(2) : "n/a"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ThemeBars({ title, answered, themes }: { title: string; answered: number; themes: ThemeItem[] }) {
  const top = themes.slice(0, 7);
  return (
    <div className="themePanel">
      <div className="miniHeader">
        <h3>{title}</h3>
        <span>{numberFormat(answered)} answered</span>
      </div>
      <div className="themeList">
        {top.map((theme, index) => (
          <div className="themeItem" key={theme.key}>
            <div>
              <strong>{theme.label}</strong>
              <span>{numberFormat(theme.count)} mentions</span>
            </div>
            <div className="barTrack">
              <div
                className="barFill"
                style={{
                  width: `${Math.max(theme.shareOfAnswered * 100, 2)}%`,
                  background: chartPalette[index % chartPalette.length]
                }}
              />
            </div>
            <b>{pct(theme.shareOfAnswered)}</b>
          </div>
        ))}
      </div>
    </div>
  );
}

function ExecutiveSummaryPanel({ data }: { data: InsightData }) {
  return (
    <section className="executivePanel" aria-label="Executive summary">
      <div className="executiveCopy">
        <span className="sectionPill">
          <Compass size={15} />
          Executive read
        </span>
        <h2>{data.executiveSummary.title}</h2>
        <p>{data.executiveSummary.body}</p>
      </div>
      <div className="primaryReadGrid">
        {data.executiveSummary.primaryRead.map((item) => (
          <div className="primaryRead" key={item.label}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
            <p>{item.detail}</p>
          </div>
        ))}
      </div>
      <div className="signalList">
        {data.executiveSummary.strongestSignals.slice(0, 5).map((signal) => (
          <div key={signal}>
            <CheckCircle2 size={16} />
            <span>{signal}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function RecommendationPanel({ data }: { data: InsightData }) {
  return (
    <section className="panel wide">
      <SectionHeader
        eyebrow="Operating priorities"
        title="What to do with this read"
        right={
          <span className="decisionBadge">
            <ClipboardCheck size={15} />
            Ranked by decision impact
          </span>
        }
      />
      <div className="recommendationGrid">
        {data.recommendations.map((recommendation) => (
          <article className="recommendation" key={recommendation.title}>
            <div>
              <span className={`priority ${recommendation.priority.toLowerCase()}`}>{recommendation.priority}</span>
              <strong>{recommendation.title}</strong>
            </div>
            <p>{recommendation.body}</p>
            <b>{recommendation.metric}</b>
          </article>
        ))}
      </div>
    </section>
  );
}

function ReadGuideModal({
  data,
  onClose
}: {
  data: InsightData;
  onClose: () => void;
}) {
  return (
    <div className="modalLayer" role="presentation" onMouseDown={onClose}>
      <section
        className="readGuide"
        role="dialog"
        aria-modal="true"
        aria-labelledby="read-guide-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="readGuideHeader">
          <div>
            <span className="sectionPill">
              <BookOpen size={15} />
              Dashboard guide
            </span>
            <h2 id="read-guide-title">How to read this dashboard</h2>
            <p>{data.readGuide.summary}</p>
          </div>
          <button type="button" className="iconButton" onClick={onClose} aria-label="Close guide">
            <X size={18} />
          </button>
        </div>

        <div className="readGuideGrid">
          <div className="guideBlock guideOrder">
            <h3>Read order</h3>
            {data.readGuide.order.map((item) => (
              <div className="guideStep" key={item.title}>
                <strong>{item.title}</strong>
                <p>{item.body}</p>
              </div>
            ))}
          </div>

          <div className="guideBlock">
            <h3>Metric glossary</h3>
            <div className="definitionList">
              {data.readGuide.metricDefinitions.map((item) => (
                <div key={item.metric}>
                  <strong>{item.metric}</strong>
                  <p>{item.definition}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="guideBlock caveats">
            <h3>Decision caveats</h3>
            {data.readGuide.caveats.map((item) => (
              <p key={item}>{item}</p>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function downloadJson(data: InsightData) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "lead-insights.json";
  link.click();
  URL.revokeObjectURL(url);
}

export function Dashboard({ initialData }: DashboardProps) {
  const [data, setData] = useState<InsightData>(initialData);
  const [activeSegment, setActiveSegment] = useState("campaigns");
  const [query, setQuery] = useState("");
  const [sortMetric, setSortMetric] = useState<"cash" | "cashPerLead" | "closedRate" | "bookedRate" | "leads">(
    "cash"
  );
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [apiState, setApiState] = useState<"ready" | "refreshing" | "error">("ready");

  async function refreshData() {
    try {
      setIsRefreshing(true);
      setApiState("refreshing");
      const response = await fetch("/api/insights", { cache: "no-store" });
      if (!response.ok) throw new Error("API request failed");
      const nextData = (await response.json()) as InsightData;
      setData(nextData);
      setApiState("ready");
    } catch {
      setApiState("error");
    } finally {
      setIsRefreshing(false);
    }
  }

  useEffect(() => {
    refreshData();
  }, []);

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setIsGuideOpen(false);
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, []);

  const segmentRows = useMemo(() => {
    const rows = [...(data.segments[activeSegment] ?? [])];
    const filtered = rows.filter((row) => row.name.toLowerCase().includes(query.toLowerCase()));
    return filtered
      .sort((a, b) => Number(b[sortMetric]) - Number(a[sortMetric]) || b.leads - a.leads)
      .slice(0, activeSegment === "campaigns" ? 20 : 12);
  }, [activeSegment, data.segments, query, sortMetric]);

  const sourceRows = data.segments.sources.slice(0, 8);
  const mediumRows = data.segments.mediums.slice(0, 8);
  const gradeRows = data.segments.grades;
  const scoreRows = data.segments.scoreBins;
  const ageRows = data.segments.ageBands;

  const revenueSeries = data.timeSeries.map((point: DailyPoint) => ({
    ...point,
    displayDate: shortDate(point.date)
  }));

  const healthScore = Math.round(
    ((data.dataQuality.scoreCoverage +
      data.dataQuality.quiz.completedAtLeastEightRate +
      (1 - Math.min(data.dataQuality.phoneDuplicates.duplicateRecords / data.summary.totalLeads, 1))) /
      3) *
      100
  );

  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <div className="eyebrow">
            <Database size={16} />
            <span>{data.meta.sourceFile}</span>
          </div>
          <h1>Lead Insights Dashboard</h1>
          <p>
            Cohort captured {dateLabel(data.meta.dateCapturedRange.start)} to{" "}
            {dateLabel(data.meta.dateCapturedRange.end)}. Aggregated API data excludes names, emails, and phone
            numbers.
          </p>
        </div>
        <div className="actions">
          <span className={`apiBadge ${apiState}`}>
            {apiState === "error" ? <AlertTriangle size={15} /> : <CheckCircle2 size={15} />}
            {apiState === "refreshing" ? "Refreshing API" : apiState === "error" ? "API fallback" : "API live"}
          </span>
          <button type="button" className="guideButton" onClick={() => setIsGuideOpen(true)}>
            <BookOpen size={16} />
            {data.readGuide.buttonLabel}
            <span className="buttonTip">Open the read order, metric glossary, and data caveats.</span>
          </button>
          <button type="button" onClick={refreshData} disabled={isRefreshing}>
            <RefreshCw size={16} className={isRefreshing ? "spin" : ""} />
            Refresh
          </button>
          <button type="button" onClick={() => downloadJson(data)}>
            <Download size={16} />
            JSON
          </button>
        </div>
      </header>

      <ExecutiveSummaryPanel data={data} />

      <section className="kpiGrid" aria-label="Lead dashboard KPIs">
        <KpiCard
          icon={<Users size={22} />}
          label="Captured leads"
          value={numberFormat(data.summary.totalLeads)}
          sub={`${numberFormat(data.summary.scoredLeads)} scored, ${pct(data.dataQuality.scoreCoverage)} coverage`}
          accent={colors.blue}
          hint="Total imported CSV rows. This is the widest denominator and should not be confused with CRM-qualified leads."
        />
        <KpiCard
          icon={<DollarSign size={22} />}
          label="Cash collected"
          value={money(data.summary.cashCollected, true)}
          sub={`${money(data.summary.rates.cashPerLead)} per captured lead`}
          accent={colors.green}
          hint="Sum of Cash_Collected_USD. Revenue views use cash records, which may not always match the closed flag."
        />
        <KpiCard
          icon={<Target size={22} />}
          label="Booked calls"
          value={numberFormat(data.summary.bookedCalls)}
          sub={`${pct(data.summary.rates.bookedFromCrmRate)} of CRM leads`}
          accent={colors.teal}
          hint="Rows marked Close_Booked_Call = Yes. The sub-metric divides booked calls by leads present in Close CRM."
        />
        <KpiCard
          icon={<TrendingUp size={22} />}
          label="Closed flags"
          value={numberFormat(data.summary.closedDeals)}
          sub={`${pct(data.summary.rates.closeFromBookedRate)} of booked calls`}
          accent={colors.amber}
          hint="Rows marked Close_Closed = Yes. Use beside cash collected because payment data can exist without the flag."
        />
        <KpiCard
          icon={<Activity size={22} />}
          label="Avg lead score"
          value={data.summary.avgLeadScore.toFixed(2)}
          sub={`Median ${data.summary.medianLeadScore.toFixed(2)}, IQR ${data.summary.scoreP25.toFixed(2)}-${data.summary.scoreP75.toFixed(2)}`}
          accent={colors.purple}
          hint="Average of numeric Lead Score values only. Missing scores are excluded from the average."
        />
        <KpiCard
          icon={<BarChart3 size={22} />}
          label="Data readiness"
          value={`${healthScore}%`}
          sub={`${data.dataQuality.quiz.completedAtLeastEight.toLocaleString()} quiz-rich leads`}
          accent={healthScore >= 70 ? colors.green : colors.red}
          hint="Blended quality signal using score coverage, quiz completeness, and duplicate-phone cleanliness."
        />
      </section>

      <section className="insightGrid">
        {data.insights.slice(0, 8).map((insight) => (
          <article className={toneClass(insight.tone)} key={insight.title}>
            <h3>{insight.title}</h3>
            <p>{insight.body}</p>
          </article>
        ))}
      </section>

      <RecommendationPanel data={data} />

      <section className="dashboardGrid twoCol">
        <article className="panel">
          <SectionHeader eyebrow="Funnel" title="Lead-to-cash movement" />
          <div className="funnelList">
            {data.funnel.map((stage, index) => (
              <div className="funnelRow" key={stage.stage}>
                <div className="funnelCopy">
                  <strong>{stage.stage}</strong>
                  <span>
                    {numberFormat(stage.count)} records, {pct(stage.rateOfLeads)} of captured leads
                  </span>
                </div>
                <div className="funnelBar">
                  <div
                    style={{
                      width: `${Math.max(stage.rateOfLeads * 100, stage.count ? 2 : 0)}%`,
                      background: chartPalette[index % chartPalette.length]
                    }}
                  />
                </div>
                <b>{pct(stage.stepRate)}</b>
              </div>
            ))}
          </div>
          <p className="panelNote">
            Cash records can exceed closed flags when payment data exists without a matching closed status.
          </p>
        </article>

        <article className="panel">
          <SectionHeader eyebrow="Trend" title="Daily acquisition and revenue" />
          <div className="chartHeight">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={revenueSeries} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid stroke={colors.grid} vertical={false} />
                <XAxis dataKey="displayDate" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
                <YAxis
                  yAxisId="left"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 12 }}
                  tickFormatter={compactNumber}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => money(Number(value), true)}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar yAxisId="left" dataKey="leads" name="Leads" fill={colors.blue} radius={[4, 4, 0, 0]} />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="cash"
                  name="Cash"
                  stroke={colors.green}
                  strokeWidth={3}
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </article>
      </section>

      <section className="dashboardGrid twoCol">
        <article className="panel">
          <SectionHeader eyebrow="Acquisition" title="Source revenue quality" />
          <div className="chartHeight">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sourceRows} layout="vertical" margin={{ top: 0, right: 34, left: 10, bottom: 0 }}>
                <CartesianGrid stroke={colors.grid} horizontal={false} />
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={92}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="cash" name="Cash" radius={[0, 5, 5, 0]}>
                  {sourceRows.map((_, index) => (
                    <Cell key={index} fill={chartPalette[index % chartPalette.length]} />
                  ))}
                  <LabelList
                    dataKey="cash"
                    position="right"
                    formatter={(value: number) => money(value, true)}
                    fontSize={12}
                    fill={colors.muted}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="panel">
          <SectionHeader eyebrow="Placements" title="Medium performance mix" />
          <div className="chartHeight">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={mediumRows} margin={{ top: 10, right: 12, left: 0, bottom: 28 }}>
                <CartesianGrid stroke={colors.grid} vertical={false} />
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11 }}
                  interval={0}
                  angle={-18}
                  textAnchor="end"
                  height={58}
                />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12 }} tickFormatter={compactNumber} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="leads" name="Leads" fill={colors.blue} radius={[4, 4, 0, 0]} />
                <Line type="monotone" dataKey="cashPerLead" name="Cash/lead" stroke={colors.rose} strokeWidth={3} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </article>
      </section>

      <section className="dashboardGrid twoCol">
        <article className="panel">
          <SectionHeader eyebrow="Quality" title="Grade conversion and revenue" />
          <div className="chartHeight small">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={gradeRows} margin={{ top: 12, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid stroke={colors.grid} vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} tickFormatter={compactNumber} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="cash" name="Cash" fill={colors.green} radius={[4, 4, 0, 0]} />
                <Line dataKey="leads" name="Leads" stroke={colors.blue} strokeWidth={3} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="panel">
          <SectionHeader eyebrow="Scoring" title="Score band distribution" />
          <div className="chartHeight small">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={scoreRows} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid stroke={colors.grid} vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} tickFormatter={compactNumber} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="leads" name="Leads" fill={colors.blue} radius={[4, 4, 0, 0]} />
                <Bar dataKey="closed" name="Closed" fill={colors.amber} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>
      </section>

      <section className="panel wide">
        <SectionHeader
          eyebrow="Segment explorer"
          title="Performance leaderboard"
          right={
            <div className="controls">
              <label>
                <Filter size={15} />
                <select value={activeSegment} onChange={(event) => setActiveSegment(event.target.value)}>
                  {segmentOptions.map((option) => (
                    <option value={option.key} key={option.key}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <BarChart3 size={15} />
                <select value={sortMetric} onChange={(event) => setSortMetric(event.target.value as typeof sortMetric)}>
                  <option value="cash">Cash</option>
                  <option value="cashPerLead">Cash per lead</option>
                  <option value="closedRate">Close rate</option>
                  <option value="bookedRate">Booked rate</option>
                  <option value="leads">Lead volume</option>
                </select>
              </label>
              <label className="searchBox">
                <Search size={15} />
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search"
                />
              </label>
            </div>
          }
        />
        <SegmentTable rows={segmentRows} />
      </section>

      <section className="dashboardGrid twoCol">
        <article className="panel">
          <SectionHeader eyebrow="Audience" title="Age and intent composition" />
          <div className="splitVisual">
            <div className="chartHeight donut">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={ageRows} dataKey="leads" nameKey="name" innerRadius={58} outerRadius={92} paddingAngle={2}>
                    {ageRows.map((_, index) => (
                      <Cell key={index} fill={chartPalette[index % chartPalette.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="miniList">
              {ageRows.slice(0, 6).map((row, index) => (
                <div key={row.name}>
                  <i style={{ background: chartPalette[index % chartPalette.length] }} />
                  <span>{row.name}</span>
                  <strong>{numberFormat(row.leads)}</strong>
                </div>
              ))}
            </div>
          </div>
        </article>

        <article className="panel">
          <SectionHeader eyebrow="Revenue intent" title="Capital available in 30 days" />
          <div className="capitalList">
            {data.segments.capital.slice(0, 8).map((row, index) => (
              <div className="capitalRow" key={row.name}>
                <div>
                  <strong>{row.name}</strong>
                  <span>
                    {numberFormat(row.leads)} leads, {pct(row.closedRate)} close rate
                  </span>
                </div>
                <div className="barTrack">
                  <div
                    className="barFill"
                    style={{
                      width: `${Math.max(row.revenueShare * 100, row.cash ? 2 : 0)}%`,
                      background: chartPalette[index % chartPalette.length]
                    }}
                  />
                </div>
                <b>{money(row.cash)}</b>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="dashboardGrid twoCol">
        <article className="panel">
          <SectionHeader eyebrow="Voice of customer" title="Masterclass value themes" />
          <ThemeBars
            title="Worth-time answers"
            answered={data.themeAnalysis.worthTime.answered}
            themes={data.themeAnalysis.worthTime.themes}
          />
        </article>

        <article className="panel">
          <SectionHeader eyebrow="Voice of customer" title="1-on-1 question themes" />
          <ThemeBars
            title="Questions for Abu Lahya"
            answered={data.themeAnalysis.askQuestion.answered}
            themes={data.themeAnalysis.askQuestion.themes}
          />
        </article>
      </section>

      <section className="panel wide">
        <SectionHeader eyebrow="Data health" title="Completeness and CRM consistency" />
        <div className="qualityGrid">
          <div className="qualityStat">
            <strong>{numberFormat(data.dataQuality.scoreMissing)}</strong>
            <span>leads missing score</span>
          </div>
          <div className="qualityStat">
            <strong>{numberFormat(data.dataQuality.phoneDuplicates.duplicateRecords)}</strong>
            <span>duplicate phone records</span>
          </div>
          <div className="qualityStat">
            <strong>{numberFormat(data.dataQuality.emailDuplicates.duplicateRecords)}</strong>
            <span>duplicate email records</span>
          </div>
          <div className="qualityStat">
            <strong>{numberFormat(data.dataQuality.cashVsClosedMismatch)}</strong>
            <span>cash records above closed flags</span>
          </div>
          <div className="qualityStat">
            <strong>{data.dataQuality.quiz.averageAnswers.toFixed(1)}</strong>
            <span>avg quiz fields answered</span>
          </div>
        </div>
        <div className="missingGrid">
          {data.dataQuality.topMissingColumns.slice(0, 10).map((column) => (
            <div className="missingItem" key={column.column}>
              <div>
                <strong>{column.column}</strong>
                <span>
                  {numberFormat(column.missing)} missing, {pct(column.missingRate)}
                </span>
              </div>
              <div className="barTrack">
                <div className="barFill danger" style={{ width: `${column.missingRate * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </section>

      {isGuideOpen ? <ReadGuideModal data={data} onClose={() => setIsGuideOpen(false)} /> : null}
    </main>
  );
}
