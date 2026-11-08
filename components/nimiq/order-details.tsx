import { DetailList, DetailRow } from "@/components/transfer/detail-list";
import { formatNaira, formatStable } from "@/lib/naira-deposit";
import type { PublicOrder } from "@/lib/nimiq/order-status";
import type { ReceiptRow } from "@/lib/receipt";
import { shortenAddress } from "@/lib/transfer";

/** Where a top-up's USDT goes, as the screens word it. */
export function topUpPayee(order: Pick<PublicOrder, "recipientAddress">) {
  return order.recipientAddress
    ? `wallet ${shortenAddress(order.recipientAddress, 6, 4)}`
    : "your Nimiq Pay wallet";
}

/** Label/value pairs for an order, shared by the detail box and the shared receipt. */
export function orderRows(order: PublicOrder): ReceiptRow[] {
  const usdt = `${formatStable(order.cryptoAmount)} USDT`;
  const naira = formatNaira(order.fiatAmount);
  const rows: ReceiptRow[] =
    order.direction === "cash_out"
      ? [
          { label: "You send", value: usdt },
          { label: "They get", value: naira },
          ...(order.bank
            ? [
                { label: "Bank", value: order.bank.name },
                {
                  label: "Account",
                  value: `${order.bank.accountName} · ${order.bank.accountNumberMasked}`,
                },
              ]
            : []),
          { label: "Network fee", value: "Paid by Jumpa" },
        ]
      : [
          { label: "You pay", value: naira },
          { label: "You get", value: usdt },
          ...(order.recipientAddress
            ? [
                {
                  label: "To wallet",
                  value: shortenAddress(order.recipientAddress, 6, 4),
                },
              ]
            : []),
        ];
  return [...rows, { label: "Reference", value: order.reference }];
}

/** The order at a glance, with a Polygonscan link once the transfer has settled. */
export function OrderDetails({ order }: { order: PublicOrder }) {
  const rows = orderRows(order);
  return (
    <DetailList>
      {rows.map((row, index) => (
        <DetailRow
          key={row.label}
          label={row.label}
          value={row.value}
          rule={index < rows.length - 1 || Boolean(order.explorerUrl)}
        />
      ))}
      {order.explorerUrl ? (
        <DetailRow
          label="Transaction"
          rule={false}
          value={
            <a
              href={order.explorerUrl}
              target="_blank"
              rel="noreferrer"
              className="text-jumpa-primary-600 underline"
            >
              View on Polygonscan
            </a>
          }
        />
      ) : null}
    </DetailList>
  );
}
