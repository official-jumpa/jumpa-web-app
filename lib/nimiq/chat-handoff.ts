/**
 * A screen the chat opens with what the user already said filled in. The chat
 * never moves money: the screen checks the details and Nimiq Pay confirms.
 */
export type ChatHandoff =
  | { flow: "cash-out"; amountUsdt?: string; accountNumber?: string }
  | { flow: "top-up"; amountNgn?: number }
  | { flow: "airtime"; phone?: string; network?: string; amountNgn?: number }
  | { flow: "data"; phone?: string; network?: string }
  | { flow: "history" };

export type HandoffFlow = ChatHandoff["flow"];

/** The button under the reply that opens the screen. */
export const HANDOFF_LABEL: Record<HandoffFlow, string> = {
  "cash-out": "Open cash-out",
  "top-up": "Open top-up",
  airtime: "Open airtime",
  data: "Open data",
  history: "Open history",
};
