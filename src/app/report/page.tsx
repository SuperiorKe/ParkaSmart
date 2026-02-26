import ReportDashboard from "@/components/report-dashboard";

export default function ReportPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">End-of-Day Report</h1>
        <p className="text-muted text-sm mt-1">
          Summary of today&apos;s parking revenue and activity
        </p>
      </div>
      <ReportDashboard />
    </div>
  );
}
