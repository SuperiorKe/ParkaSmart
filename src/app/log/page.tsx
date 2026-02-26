import ParkingLogTable from "@/components/parking-log-table";

export default function LogPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Today&apos;s Parking Log</h1>
        <p className="text-muted text-sm mt-1">
          Live view of all vehicles logged today
        </p>
      </div>
      <ParkingLogTable />
    </div>
  );
}
