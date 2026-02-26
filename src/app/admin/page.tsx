import TenantAdmin from "@/components/tenant-admin";

export default function AdminPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Tenant Management</h1>
        <p className="text-muted text-sm mt-1">
          Manage registered tenants for plate autocomplete
        </p>
      </div>
      <TenantAdmin />
    </div>
  );
}
