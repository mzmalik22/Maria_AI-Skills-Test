import { Dashboard } from "@/components/Dashboard";
import type { InsightData } from "@/types/insights";
import initialData from "@/data/insights.json";

export default function Home() {
  return <Dashboard initialData={initialData as InsightData} />;
}
