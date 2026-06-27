import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { parse } from "csv-parse/sync";

const root = process.cwd();
const csvPath = path.join(root, "dashboard", "Untitled spreadsheet - event2_leads_enriched.csv");
const outputPath = path.join(root, "src", "data", "insights.json");

const columns = {
  leadName: "Lead Name",
  phone: "Phone Number",
  email: "Email",
  captured: "Date Captured",
  campaign: "UTM Campaign",
  source: "UTM Source",
  content: "UTM Content",
  medium: "UTM Medium",
  score: "Lead Score",
  grade: "Lead Grade",
  age: "Q1. Age",
  dayToDay: "Q2. Day-to-day",
  profession: "Q3. Current profession",
  income: "Q4. Monthly income (before tax)",
  spent: "Q5. Spent on courses/coaching",
  timeTrying: "Q6. How long trying to make money online",
  onlineStage: "Q7. Where are you with making money online",
  wantsMost: "Q8. What do you want most",
  frustration: "Q9. What frustrates you most",
  following: "Q10. How long following Abu Lahya",
  triedBusiness: "Q11. Have you tried online business before",
  worthTime: "Q12. What needs to happen for masterclass to be worth your time",
  askQuestion: "Q13. If you had 30 min 1-on-1 with Abu Lahya, what would you ask",
  capital: "Capital available in next 30 days",
  inCrm: "Close_In_CRM",
  leadStatus: "Close_Lead_Status",
  opportunityStage: "Close_Opportunity_Stage",
  pipeline: "Close_Pipeline",
  bookedCall: "Close_Booked_Call",
  closed: "Close_Closed",
  cash: "Cash_Collected_USD",
  paymentType: "Payment_Type",
  programType: "Program_Type",
  closeCreated: "Close_Date_Created",
  preWebinar: "Pre_Webinar_Lead"
};

const quizColumns = [
  columns.age,
  columns.dayToDay,
  columns.profession,
  columns.income,
  columns.spent,
  columns.onlineStage,
  columns.wantsMost,
  columns.frustration,
  columns.following,
  columns.triedBusiness,
  columns.worthTime,
  columns.askQuestion,
  columns.capital
];

const openTextColumns = [columns.worthTime, columns.askQuestion];
const excludedPersonalColumns = [columns.leadName, columns.phone, columns.email];

const themeDefinitions = [
  {
    key: "roadmap",
    label: "Clear plan or roadmap",
    terms: ["plan", "roadmap", "step", "steps", "guide", "structure", "blueprint", "path"]
  },
  {
    key: "businessModel",
    label: "Business model selection",
    terms: ["business", "model", "niche", "offer", "product", "service", "brand", "agency"]
  },
  {
    key: "income",
    label: "Income and financial target",
    terms: ["money", "income", "earn", "earning", "profit", "revenue", "cash", "financial", "wealth"]
  },
  {
    key: "deen",
    label: "Deen and halal alignment",
    terms: ["deen", "halal", "akhira", "allah", "islam", "muslim", "haram", "faith"]
  },
  {
    key: "execution",
    label: "Execution and consistency",
    terms: ["commit", "consistent", "discipline", "focus", "execute", "action", "practice", "time"]
  },
  {
    key: "confidence",
    label: "Confidence and mindset",
    terms: ["confidence", "mindset", "fear", "overcome", "stuck", "motivation", "belief"]
  },
  {
    key: "salesMarketing",
    label: "Sales, marketing, or audience",
    terms: ["marketing", "sales", "client", "lead", "audience", "traffic", "content", "social"]
  },
  {
    key: "aiTech",
    label: "AI or technical skills",
    terms: ["ai", "gpt", "automation", "tech", "technical", "coding", "software"]
  },
  {
    key: "family",
    label: "Family and lifestyle freedom",
    terms: ["family", "parents", "wife", "children", "freedom", "country", "move"]
  }
];

function clean(value) {
  return String(value ?? "")
    .replace(/\u00c2\u00a3/g, "\u00a3")
    .replace(/\u0141/g, "\u00a3")
    .replace(/\s+/g, " ")
    .trim();
}

function textKey(value, blankLabel = "Not answered") {
  const valueText = clean(value);
  return valueText || blankLabel;
}

function numeric(value) {
  const text = clean(value).replace(/[$,]/g, "");
  if (!text) return null;
  const parsed = Number.parseFloat(text);
  return Number.isFinite(parsed) ? parsed : null;
}

function yes(value) {
  return clean(value).toLowerCase() === "yes";
}

function parseDate(value) {
  const raw = clean(value);
  if (!raw) return null;
  const normalized = raw.replace(" ", "T").replace(/(\.\d{3})\d+/, "$1");
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

function dayKey(date) {
  return date.toISOString().slice(0, 10);
}

function round(value, digits = 2) {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function ratio(numerator, denominator) {
  return denominator ? numerator / denominator : 0;
}

function sum(values) {
  return values.reduce((total, value) => total + value, 0);
}

function average(values) {
  return values.length ? sum(values) / values.length : 0;
}

function median(values) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

function percentile(values, p) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = (sorted.length - 1) * p;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
}

function money(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value >= 1000 ? 0 : 2
  }).format(value);
}

function pct(value) {
  return `${round(value * 100, 1)}%`;
}

function makeBaseGroup(name) {
  return {
    name,
    leads: 0,
    crm: 0,
    booked: 0,
    closed: 0,
    buyersWithCash: 0,
    cash: 0,
    scores: [],
    quizAnswered: 0
  };
}

function addRowStats(group, row) {
  group.leads += 1;
  if (yes(row[columns.inCrm])) group.crm += 1;
  if (yes(row[columns.bookedCall])) group.booked += 1;
  if (yes(row[columns.closed])) group.closed += 1;
  const cash = numeric(row[columns.cash]) ?? 0;
  group.cash += cash;
  if (cash > 0) group.buyersWithCash += 1;
  const score = numeric(row[columns.score]);
  if (score !== null) group.scores.push(score);
  group.quizAnswered += quizColumns.filter((column) => clean(row[column])).length;
}

function finalizeGroup(group, totalLeads, totalCash) {
  const scoreCount = group.scores.length;
  return {
    name: group.name,
    leads: group.leads,
    leadShare: round(ratio(group.leads, totalLeads), 4),
    crm: group.crm,
    booked: group.booked,
    closed: group.closed,
    buyersWithCash: group.buyersWithCash,
    cash: round(group.cash, 2),
    revenueShare: round(ratio(group.cash, totalCash), 4),
    avgScore: round(average(group.scores), 2),
    medianScore: round(median(group.scores), 2),
    scoreCoverage: round(ratio(scoreCount, group.leads), 4),
    crmRate: round(ratio(group.crm, group.leads), 4),
    bookedRate: round(ratio(group.booked, group.leads), 4),
    bookedFromCrmRate: round(ratio(group.booked, group.crm), 4),
    closedRate: round(ratio(group.closed, group.leads), 4),
    closeFromBookedRate: round(ratio(group.closed, group.booked), 4),
    buyerRate: round(ratio(group.buyersWithCash, group.leads), 4),
    cashPerLead: round(ratio(group.cash, group.leads), 2),
    cashPerBooked: round(ratio(group.cash, group.booked), 2),
    cashPerClosed: round(ratio(group.cash, group.closed), 2),
    avgQuizAnswers: round(ratio(group.quizAnswered, group.leads), 2)
  };
}

function groupBy(records, column, options = {}) {
  const groups = new Map();
  const blankLabel = options.blankLabel ?? "Not answered";
  for (const row of records) {
    const name = textKey(row[column], blankLabel);
    if (!groups.has(name)) groups.set(name, makeBaseGroup(name));
    addRowStats(groups.get(name), row);
  }

  const totalLeads = records.length;
  const totalCash = sum(records.map((row) => numeric(row[columns.cash]) ?? 0));
  return [...groups.values()]
    .map((group) => finalizeGroup(group, totalLeads, totalCash))
    .sort((a, b) => b.cash - a.cash || b.closed - a.closed || b.booked - a.booked || b.leads - a.leads);
}

function topByCount(records, column, blankLabel = "Not answered", limit = 10) {
  const counts = new Map();
  for (const row of records) {
    const name = textKey(row[column], blankLabel);
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count, share: round(ratio(count, records.length), 4) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

function scoreBins(records) {
  const bins = [
    { name: "0-4", min: 0, max: 4 },
    { name: "4-5", min: 4, max: 5 },
    { name: "5-6", min: 5, max: 6 },
    { name: "6-7", min: 6, max: 7 },
    { name: "7-8", min: 7, max: 8 },
    { name: "8-9", min: 8, max: 9 },
    { name: "9-10", min: 9, max: 10.01 },
    { name: "Missing", min: null, max: null }
  ].map((bin) => ({ ...bin, ...makeBaseGroup(bin.name) }));

  for (const row of records) {
    const score = numeric(row[columns.score]);
    const target =
      score === null
        ? bins[bins.length - 1]
        : bins.find((bin) => bin.min !== null && score >= bin.min && score < bin.max);
    if (target) addRowStats(target, row);
  }

  const totalCash = sum(records.map((row) => numeric(row[columns.cash]) ?? 0));
  return bins.map((bin) => finalizeGroup(bin, records.length, totalCash));
}

function ageBands(records) {
  const bins = [
    { name: "Under 20", min: 0, max: 20 },
    { name: "20-24", min: 20, max: 25 },
    { name: "25-29", min: 25, max: 30 },
    { name: "30-34", min: 30, max: 35 },
    { name: "35-44", min: 35, max: 45 },
    { name: "45+", min: 45, max: 120 },
    { name: "Missing", min: null, max: null }
  ].map((bin) => ({ ...bin, ...makeBaseGroup(bin.name) }));

  for (const row of records) {
    const age = numeric(row[columns.age]);
    const target =
      age === null
        ? bins[bins.length - 1]
        : bins.find((bin) => bin.min !== null && age >= bin.min && age < bin.max);
    if (target) addRowStats(target, row);
  }

  const totalCash = sum(records.map((row) => numeric(row[columns.cash]) ?? 0));
  return bins.map((bin) => finalizeGroup(bin, records.length, totalCash));
}

function dailySeries(records) {
  const byDay = new Map();
  for (const row of records) {
    const date = parseDate(row[columns.captured]);
    if (!date) continue;
    const key = dayKey(date);
    if (!byDay.has(key)) {
      byDay.set(key, {
        date: key,
        leads: 0,
        crm: 0,
        booked: 0,
        closed: 0,
        buyersWithCash: 0,
        cash: 0,
        scores: []
      });
    }
    const item = byDay.get(key);
    item.leads += 1;
    if (yes(row[columns.inCrm])) item.crm += 1;
    if (yes(row[columns.bookedCall])) item.booked += 1;
    if (yes(row[columns.closed])) item.closed += 1;
    const cash = numeric(row[columns.cash]) ?? 0;
    item.cash += cash;
    if (cash > 0) item.buyersWithCash += 1;
    const score = numeric(row[columns.score]);
    if (score !== null) item.scores.push(score);
  }

  return [...byDay.values()]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((item) => ({
      date: item.date,
      leads: item.leads,
      crm: item.crm,
      booked: item.booked,
      closed: item.closed,
      buyersWithCash: item.buyersWithCash,
      cash: round(item.cash, 2),
      avgScore: round(average(item.scores), 2),
      bookedRate: round(ratio(item.booked, item.leads), 4),
      closedRate: round(ratio(item.closed, item.leads), 4)
    }));
}

function missingness(records, headers) {
  return headers
    .map((column) => {
      const missing = records.filter((row) => !clean(row[column])).length;
      return {
        column,
        missing,
        present: records.length - missing,
        missingRate: round(ratio(missing, records.length), 4)
      };
    })
    .sort((a, b) => b.missingRate - a.missingRate || b.missing - a.missing);
}

function duplicateStats(records, column) {
  const seen = new Map();
  for (const row of records) {
    const key = clean(row[column]).toLowerCase();
    if (!key) continue;
    seen.set(key, (seen.get(key) ?? 0) + 1);
  }
  const duplicateValues = [...seen.values()].filter((count) => count > 1);
  return {
    unique: seen.size,
    duplicateValues: duplicateValues.length,
    duplicateRecords: sum(duplicateValues.map((count) => count - 1))
  };
}

function themeCounts(records, column) {
  const counts = themeDefinitions.map((theme) => ({
    key: theme.key,
    label: theme.label,
    count: 0,
    shareOfAnswered: 0
  }));
  let answered = 0;

  for (const row of records) {
    const text = clean(row[column]).toLowerCase();
    if (!text) continue;
    answered += 1;
    for (const theme of themeDefinitions) {
      const hit = theme.terms.some((term) => {
        const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        return new RegExp(`\\b${escaped}\\b`, "i").test(text);
      });
      if (hit) counts.find((item) => item.key === theme.key).count += 1;
    }
  }

  return {
    answered,
    themes: counts
      .map((item) => ({
        ...item,
        shareOfAnswered: round(ratio(item.count, answered), 4)
      }))
      .sort((a, b) => b.count - a.count)
  };
}

function getDateRange(records, column) {
  const dates = records.map((row) => parseDate(row[column])).filter(Boolean);
  if (!dates.length) return { start: null, end: null };
  return {
    start: new Date(Math.min(...dates.map((date) => date.getTime()))).toISOString(),
    end: new Date(Math.max(...dates.map((date) => date.getTime()))).toISOString()
  };
}

function campaignFamily(name) {
  const value = clean(name).toLowerCase();
  if (!value || value === "not answered") return "Unattributed";
  if (value.includes("broadcast")) return "Broadcast";
  if (value.includes("webinar")) return "Webinar";
  if (value.includes("bio")) return "Bio";
  if (value.includes("gpt")) return "GPT creative";
  if (value.includes("imran")) return "Imran creative";
  if (value.includes("lahya")) return "Lahya creative";
  if (value.includes("twitter")) return "Twitter format";
  if (value.includes("delivery")) return "Delivery angle";
  return "Other campaigns";
}

function campaignFamilies(records) {
  const groups = new Map();
  for (const row of records) {
    const name = campaignFamily(row[columns.campaign]);
    if (!groups.has(name)) groups.set(name, makeBaseGroup(name));
    addRowStats(groups.get(name), row);
  }
  const totalCash = sum(records.map((row) => numeric(row[columns.cash]) ?? 0));
  return [...groups.values()]
    .map((group) => finalizeGroup(group, records.length, totalCash))
    .sort((a, b) => b.cash - a.cash || b.leads - a.leads);
}

function buildInsights(summary, segments, dataQuality, themeAnalysis) {
  const insights = [];
  const bestGrade = segments.grades.find((item) => item.name !== "Not answered");
  const bestCapital = segments.capital
    .filter((item) => item.leads >= 40 && item.name !== "Not answered")
    .sort((a, b) => b.cashPerLead - a.cashPerLead)[0];
  const preWebinarYes = segments.preWebinar.find((item) => item.name === "Yes");
  const preWebinarNo = segments.preWebinar.find((item) => item.name === "No");
  const topRevenueCampaign = segments.campaigns[0];
  const paidSource = segments.sources.find((item) => item.name === "ig") ?? segments.sources[0];
  const sourceEmail = segments.sources.find((item) => item.name === "email");
  const topNeedTheme = themeAnalysis.worthTime.themes[0];
  const topQuestionTheme = themeAnalysis.askQuestion.themes[0];

  if (bestGrade) {
    insights.push({
      title: `${bestGrade.name}-grade leads drive the revenue core`,
      body: `${bestGrade.name} leads contributed ${money(bestGrade.cash)} (${pct(bestGrade.revenueShare)} of collected cash) with a ${pct(bestGrade.closedRate)} lead-to-close rate.`,
      tone: "positive"
    });
  }

  if (preWebinarYes && preWebinarNo) {
    insights.push({
      title: "Pre-webinar CRM leads close much harder",
      body: `Pre-webinar leads marked Yes show ${pct(preWebinarYes.closedRate)} close rate and ${money(preWebinarYes.cashPerLead)} per lead, versus ${pct(preWebinarNo.closedRate)} and ${money(preWebinarNo.cashPerLead)} for No.`,
      tone: "positive"
    });
  }

  if (topRevenueCampaign) {
    insights.push({
      title: "Attribution gaps hide a large revenue pocket",
      body: `${topRevenueCampaign.name} is the top campaign bucket by cash at ${money(topRevenueCampaign.cash)}. Unattributed rows should be fixed before budget decisions.`,
      tone: "warning"
    });
  }

  if (paidSource && sourceEmail) {
    insights.push({
      title: "Volume and cash quality diverge by source",
      body: `${paidSource.name} supplies the most leads (${paidSource.leads.toLocaleString()}), while email generates ${money(sourceEmail.cashPerLead)} per lead at ${pct(sourceEmail.closedRate)} close rate.`,
      tone: "positive"
    });
  }

  if (bestCapital) {
    insights.push({
      title: "Capital availability is a buying-intent signal",
      body: `${bestCapital.name} leads produced ${money(bestCapital.cashPerLead)} per lead and ${pct(bestCapital.closedRate)} close rate across ${bestCapital.leads.toLocaleString()} leads.`,
      tone: "positive"
    });
  }

  if (topNeedTheme && topQuestionTheme) {
    insights.push({
      title: "Open-text answers ask for execution clarity",
      body: `${topNeedTheme.label} leads Q12 themes (${topNeedTheme.count.toLocaleString()} mentions); ${topQuestionTheme.label} leads 1-on-1 question themes (${topQuestionTheme.count.toLocaleString()} mentions).`,
      tone: "neutral"
    });
  }

  insights.push({
    title: "Data completeness needs attention",
    body: `${dataQuality.scoreMissing.toLocaleString()} leads lack a score, ${dataQuality.cashVsClosedMismatch} more cash records than closed flags exist, and one quiz field is fully blank.`,
    tone: "warning"
  });

  insights.push({
    title: "Current funnel benchmark",
    body: `${summary.totalLeads.toLocaleString()} leads converted to ${summary.bookedCalls.toLocaleString()} booked calls, ${summary.closedDeals.toLocaleString()} closed flags, and ${money(summary.cashCollected)} collected cash.`,
    tone: "neutral"
  });

  return insights;
}

const csvExists = await fs
  .access(csvPath)
  .then(() => true)
  .catch(() => false);

if (!csvExists) {
  const outputExists = await fs
    .access(outputPath)
    .then(() => true)
    .catch(() => false);
  if (outputExists) {
    console.log(`CSV not found at ${path.relative(root, csvPath)}. Keeping existing aggregate insights JSON.`);
    process.exit(0);
  }
  throw new Error(`CSV not found at ${csvPath}, and no generated insights JSON exists.`);
}

const csvText = await fs.readFile(csvPath, "utf8");
const sourceHash = crypto.createHash("sha256").update(csvText).digest("hex");
const previousOutput = await fs
  .readFile(outputPath, "utf8")
  .then((text) => JSON.parse(text))
  .catch(() => null);
const generatedAt =
  previousOutput?.meta?.sourceHash === sourceHash
    ? previousOutput.meta.generatedAt
    : new Date().toISOString();
const records = parse(csvText, {
  bom: true,
  columns: true,
  skip_empty_lines: true,
  relax_column_count: true,
  trim: false
});

const headers = Object.keys(records[0] ?? {});
const totalLeads = records.length;
const scores = records.map((row) => numeric(row[columns.score])).filter((value) => value !== null);
const cashValues = records.map((row) => numeric(row[columns.cash]) ?? 0);
const cashCollected = sum(cashValues);
const crmLeads = records.filter((row) => yes(row[columns.inCrm])).length;
const bookedCalls = records.filter((row) => yes(row[columns.bookedCall])).length;
const closedDeals = records.filter((row) => yes(row[columns.closed])).length;
const buyersWithCash = records.filter((row) => (numeric(row[columns.cash]) ?? 0) > 0).length;
const quizAnsweredCounts = records.map((row) => quizColumns.filter((column) => clean(row[column])).length);

const segments = {
  sources: groupBy(records, columns.source, { blankLabel: "Unattributed" }),
  mediums: groupBy(records, columns.medium, { blankLabel: "Unattributed" }),
  campaigns: groupBy(records, columns.campaign, { blankLabel: "Unattributed" }),
  campaignFamilies: campaignFamilies(records),
  grades: groupBy(records, columns.grade, { blankLabel: "Not graded" }),
  capital: groupBy(records, columns.capital),
  profession: groupBy(records, columns.profession),
  dayToDay: groupBy(records, columns.dayToDay),
  income: groupBy(records, columns.income),
  spent: groupBy(records, columns.spent),
  onlineStage: groupBy(records, columns.onlineStage),
  wantsMost: groupBy(records, columns.wantsMost),
  frustrations: groupBy(records, columns.frustration),
  following: groupBy(records, columns.following),
  triedBusiness: groupBy(records, columns.triedBusiness),
  leadStatus: groupBy(records, columns.leadStatus, { blankLabel: "Not in CRM" }),
  opportunityStage: groupBy(records, columns.opportunityStage, { blankLabel: "Not in CRM" }),
  paymentType: groupBy(records, columns.paymentType, { blankLabel: "No payment recorded" }),
  programType: groupBy(records, columns.programType, { blankLabel: "No program recorded" }),
  preWebinar: groupBy(records, columns.preWebinar, { blankLabel: "Not in Close" }),
  ageBands: ageBands(records),
  scoreBins: scoreBins(records)
};

const missing = missingness(records, headers);
const emailDuplicates = duplicateStats(records, columns.email);
const phoneDuplicates = duplicateStats(records, columns.phone);
const scoreMissing = totalLeads - scores.length;
const cashVsClosedMismatch = Math.max(0, buyersWithCash - closedDeals);
const themeAnalysis = {
  worthTime: themeCounts(records, columns.worthTime),
  askQuestion: themeCounts(records, columns.askQuestion)
};

const dataQuality = {
  scoreMissing,
  scoreCoverage: round(ratio(scores.length, totalLeads), 4),
  cashVsClosedMismatch,
  emailDuplicates,
  phoneDuplicates,
  fullyEmptyColumns: missing.filter((item) => item.present === 0).map((item) => item.column),
  topMissingColumns: missing.slice(0, 12),
  quiz: {
    fieldsTracked: quizColumns.length,
    averageAnswers: round(average(quizAnsweredCounts), 2),
    medianAnswers: round(median(quizAnsweredCounts), 2),
    completedAtLeastEight: records.filter((_, index) => quizAnsweredCounts[index] >= 8).length,
    completedAtLeastEightRate: round(
      ratio(
        records.filter((_, index) => quizAnsweredCounts[index] >= 8).length,
        totalLeads
      ),
      4
    )
  }
};

const summary = {
  totalLeads,
  columnCount: headers.length,
  crmLeads,
  bookedCalls,
  closedDeals,
  buyersWithCash,
  cashCollected: round(cashCollected, 2),
  scoredLeads: scores.length,
  avgLeadScore: round(average(scores), 2),
  medianLeadScore: round(median(scores), 2),
  scoreP25: round(percentile(scores, 0.25), 2),
  scoreP75: round(percentile(scores, 0.75), 2),
  rates: {
    crmRate: round(ratio(crmLeads, totalLeads), 4),
    bookedRate: round(ratio(bookedCalls, totalLeads), 4),
    bookedFromCrmRate: round(ratio(bookedCalls, crmLeads), 4),
    closedRate: round(ratio(closedDeals, totalLeads), 4),
    closeFromBookedRate: round(ratio(closedDeals, bookedCalls), 4),
    buyerRate: round(ratio(buyersWithCash, totalLeads), 4),
    cashPerLead: round(ratio(cashCollected, totalLeads), 2),
    cashPerBooked: round(ratio(cashCollected, bookedCalls), 2),
    cashPerClosed: round(ratio(cashCollected, closedDeals), 2),
    cashPerBuyer: round(ratio(cashCollected, buyersWithCash), 2)
  },
  gradeCounts: topByCount(records, columns.grade, "Not graded", 10),
  sourceCounts: topByCount(records, columns.source, "Unattributed", 10),
  mediumCounts: topByCount(records, columns.medium, "Unattributed", 10)
};

const funnel = [
  {
    stage: "Captured leads",
    count: totalLeads,
    rateOfLeads: 1,
    stepRate: 1
  },
  {
    stage: "In Close CRM",
    count: crmLeads,
    rateOfLeads: round(ratio(crmLeads, totalLeads), 4),
    stepRate: round(ratio(crmLeads, totalLeads), 4)
  },
  {
    stage: "Booked call",
    count: bookedCalls,
    rateOfLeads: round(ratio(bookedCalls, totalLeads), 4),
    stepRate: round(ratio(bookedCalls, crmLeads), 4)
  },
  {
    stage: "Closed flag",
    count: closedDeals,
    rateOfLeads: round(ratio(closedDeals, totalLeads), 4),
    stepRate: round(ratio(closedDeals, bookedCalls), 4)
  },
  {
    stage: "Cash record",
    count: buyersWithCash,
    rateOfLeads: round(ratio(buyersWithCash, totalLeads), 4),
    stepRate: round(ratio(buyersWithCash, closedDeals), 4)
  }
];

const output = {
  meta: {
    sourceFile: path.relative(root, csvPath).replaceAll("\\", "/"),
    generatedAt,
    sourceHash,
    dateCapturedRange: getDateRange(records, columns.captured),
    closeCreatedRange: getDateRange(records, columns.closeCreated),
    columnCount: headers.length,
    publicColumns: headers.filter((header) => !excludedPersonalColumns.includes(header)),
    personalColumnsExcluded: excludedPersonalColumns.length,
    piiExcluded: true,
    apiVersion: 1
  },
  summary,
  funnel,
  timeSeries: dailySeries(records),
  segments,
  dataQuality,
  themeAnalysis,
  insights: buildInsights(summary, segments, dataQuality, themeAnalysis)
};

await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");
console.log(`Wrote ${path.relative(root, outputPath)} from ${records.length.toLocaleString()} rows.`);
