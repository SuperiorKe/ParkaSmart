import AfricasTalking from "africastalking";

const at = AfricasTalking({
  apiKey: process.env.AT_API_KEY || "",
  username: process.env.AT_USERNAME || "sandbox",
});

const sms = at.SMS;
const airtime = at.AIRTIME;

interface ReceiptParams {
  phone: string;
  plate: string;
  amount: number;
  method: string;
  building: string;
  refCode: string;
}

export async function sendReceipt(params: ReceiptParams) {
  const { phone, plate, amount, method, building, refCode } = params;
  const now = new Date();
  const time = now.toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" });
  const day = String(now.getDate()).padStart(2, "0");
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const year = String(now.getFullYear()).slice(-2);

  const message = [
    `ParkaSmart \u2713`,
    `Plate: ${plate}`,
    `Location: ${building}`,
    `Amount: Ksh ${amount.toLocaleString()} (${method})`,
    `Time: ${time} | ${day}/${month}/${year}`,
    `Ref: ${refCode}`,
    `Thank you for parking with us!`,
  ].join("\n");

  try {
    const smsPayload: { to: string[]; message: string; from?: string } = {
      to: [phone],
      message,
    };
    if (process.env.AT_SENDER_ID) smsPayload.from = process.env.AT_SENDER_ID;

    const result = await sms.send(smsPayload);
    console.log("SMS sent:", result);
    return { success: true, result };
  } catch (error) {
    console.error("SMS failed:", error);
    return { success: false, error };
  }
}

interface ReportData {
  date: string;
  totalVehicles: number;
  tenantCount: number;
  nonTenantCount: number;
  motorcycleCount: number;
  cashTotal: number;
  mpesaTotal: number;
  grandTotal: number;
  paidCount?: number;
  unpaidCount?: number;
}

export async function sendDailyReport(
  managerPhone: string,
  data: ReportData
) {
  const [y, m, d] = data.date.split("-");
  const shortDate = `${d}/${m}/${y.slice(-2)}`;

  const message = [
    `ParkaSmart Report`,
    shortDate,
    ``,
    `Vehicles: ${data.totalVehicles}`,
    `Tenants: ${data.tenantCount} | Non: ${data.nonTenantCount} | Boda: ${data.motorcycleCount}`,
    ``,
    `Cash: Ksh ${data.cashTotal.toLocaleString()}`,
    `M-Pesa: Ksh ${data.mpesaTotal.toLocaleString()}`,
    `Total: Ksh ${data.grandTotal.toLocaleString()}`,
    ``,
    `Paid: ${data.paidCount ?? "-"} | Unpaid: ${data.unpaidCount ?? "-"}`,
  ].join("\n");

  try {
    const smsPayload: { to: string[]; message: string; from?: string } = {
      to: [managerPhone],
      message,
    };
    if (process.env.AT_SENDER_ID) smsPayload.from = process.env.AT_SENDER_ID;

    const result = await sms.send(smsPayload);
    return { success: true, result };
  } catch (error) {
    console.error("Report SMS failed:", error);
    return { success: false, error };
  }
}

export async function sendAirtimeReward(phone: string, amount: number) {
  try {
    const result = await airtime.send({
      recipients: [{ phoneNumber: phone, currencyCode: "KES", amount: String(amount) }],
    });
    return { success: true, result };
  } catch (error) {
    console.error("Airtime failed:", error);
    return { success: false, error };
  }
}

export { at };
