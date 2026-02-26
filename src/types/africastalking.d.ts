declare module "africastalking" {
  interface ATConfig {
    apiKey: string;
    username: string;
  }

  interface SMSSendOptions {
    to: string[];
    message: string;
    from?: string;
  }

  interface AirtimeRecipient {
    phoneNumber: string;
    currencyCode: string;
    amount: string;
  }

  interface SMS {
    send(options: SMSSendOptions): Promise<unknown>;
  }

  interface Airtime {
    send(options: { recipients: AirtimeRecipient[] }): Promise<unknown>;
  }

  interface ATInstance {
    SMS: SMS;
    AIRTIME: Airtime;
  }

  function AfricasTalking(config: ATConfig): ATInstance;
  export default AfricasTalking;
}
