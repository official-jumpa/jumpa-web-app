import { SendByte, SendByteError } from "@sendbyte/node";
import { environment } from "./environment";

let clientInstance: SendByte | null = null;

export function getSendByteClient(): SendByte | null {
  const apiKey = environment.SENDBYTE_API_KEY.trim();
  if (!apiKey) return null;
  if (!clientInstance) {
    clientInstance = new SendByte(apiKey);
  }
  return clientInstance;
}

export const DEFAULT_SENDBYTE_FROM =
  environment.SENDBYTE_FROM_EMAIL.trim() || "Jumpa <onboarding@mail.usejumpa.com>";

export { SendByteError };
