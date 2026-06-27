export type Tone = "positive" | "warning" | "neutral";

export type Segment = {
  name: string;
  leads: number;
  leadShare: number;
  crm: number;
  booked: number;
  closed: number;
  buyersWithCash: number;
  cash: number;
  revenueShare: number;
  avgScore: number;
  medianScore: number;
  scoreCoverage: number;
  crmRate: number;
  bookedRate: number;
  bookedFromCrmRate: number;
  closedRate: number;
  closeFromBookedRate: number;
  buyerRate: number;
  cashPerLead: number;
  cashPerBooked: number;
  cashPerClosed: number;
  avgQuizAnswers: number;
};

export type CountItem = {
  name: string;
  count: number;
  share: number;
};

export type FunnelStage = {
  stage: string;
  count: number;
  rateOfLeads: number;
  stepRate: number;
};

export type DailyPoint = {
  date: string;
  leads: number;
  crm: number;
  booked: number;
  closed: number;
  buyersWithCash: number;
  cash: number;
  avgScore: number;
  bookedRate: number;
  closedRate: number;
};

export type MissingColumn = {
  column: string;
  missing: number;
  present: number;
  missingRate: number;
};

export type ThemeItem = {
  key: string;
  label: string;
  count: number;
  shareOfAnswered: number;
};

export type InsightData = {
  meta: {
    sourceFile: string;
    generatedAt: string;
    sourceHash: string;
    dateCapturedRange: { start: string | null; end: string | null };
    closeCreatedRange: { start: string | null; end: string | null };
    columnCount: number;
    publicColumns: string[];
    personalColumnsExcluded: number;
    piiExcluded: boolean;
    apiVersion: number;
  };
  summary: {
    totalLeads: number;
    columnCount: number;
    crmLeads: number;
    bookedCalls: number;
    closedDeals: number;
    buyersWithCash: number;
    cashCollected: number;
    scoredLeads: number;
    avgLeadScore: number;
    medianLeadScore: number;
    scoreP25: number;
    scoreP75: number;
    rates: {
      crmRate: number;
      bookedRate: number;
      bookedFromCrmRate: number;
      closedRate: number;
      closeFromBookedRate: number;
      buyerRate: number;
      cashPerLead: number;
      cashPerBooked: number;
      cashPerClosed: number;
      cashPerBuyer: number;
    };
    gradeCounts: CountItem[];
    sourceCounts: CountItem[];
    mediumCounts: CountItem[];
  };
  funnel: FunnelStage[];
  timeSeries: DailyPoint[];
  segments: Record<string, Segment[]>;
  dataQuality: {
    scoreMissing: number;
    scoreCoverage: number;
    cashVsClosedMismatch: number;
    emailDuplicates: {
      unique: number;
      duplicateValues: number;
      duplicateRecords: number;
    };
    phoneDuplicates: {
      unique: number;
      duplicateValues: number;
      duplicateRecords: number;
    };
    fullyEmptyColumns: string[];
    topMissingColumns: MissingColumn[];
    quiz: {
      fieldsTracked: number;
      averageAnswers: number;
      medianAnswers: number;
      completedAtLeastEight: number;
      completedAtLeastEightRate: number;
    };
  };
  themeAnalysis: {
    worthTime: {
      answered: number;
      themes: ThemeItem[];
    };
    askQuestion: {
      answered: number;
      themes: ThemeItem[];
    };
  };
  insights: Array<{
    title: string;
    body: string;
    tone: Tone;
  }>;
};
