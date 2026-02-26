import VehicleEntryForm from "@/components/vehicle-entry-form";

export default function Home() {
  return (
    <div className="max-w-lg mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Log Vehicle Entry</h1>
        <p className="text-muted text-sm mt-1">
          Enter plate number to auto-fill tenant details
        </p>
      </div>

      <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
        <VehicleEntryForm />
      </div>
    </div>
  );
}
