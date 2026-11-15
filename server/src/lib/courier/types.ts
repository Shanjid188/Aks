// Provider-neutral courier contract. Each courier (Steadfast today; Pathao,
// RedX later) implements CourierProvider; the booking/sync service in
// ./index.ts only talks to this interface.

/** What we ask the courier to deliver (already validated and normalised). */
export interface CourierBookingInput {
  /** Our order number — unique per merchant account at the courier. */
  invoice: string;
  recipientName: string;
  /** Bangladeshi mobile, 01XXXXXXXXX. */
  recipientPhone: string;
  recipientAddress: string;
  /** Whole taka the rider must collect; 0 for prepaid orders. */
  codAmount: number;
  note?: string;
  itemDescription?: string;
}

export interface CourierBookingResult {
  consignmentId: string;
  trackingCode: string | null;
  trackingLink: string | null;
  /** Courier's own status right after booking (e.g. "in_review"). */
  status: string;
}

/** Where a courier status takes our order; null = stays as it is (still in transit). */
export type CourierOutcome = 'delivered' | 'returned' | null;

/** A parsed, authenticated webhook notification. */
export interface CourierWebhookEvent {
  type: string;
  consignmentId: string | null;
  invoice: string | null;
  /** Present on status notifications; absent on plain tracking updates. */
  status: string | null;
  message: string | null;
}

export type CourierErrorKind = 'config' | 'validation' | 'auth' | 'duplicate' | 'network' | 'remote' | 'rate_limited';

export class CourierError extends Error {
  constructor(
    message: string,
    readonly kind: CourierErrorKind,
    /**
     * True when the request may have reached the courier and been accepted
     * (timeout / 5xx on a write). The booking is then "unconfirmed" rather than
     * "failed", and a retry relies on the courier's unique-invoice rule.
     */
    readonly ambiguous = false,
    readonly httpStatus?: number
  ) {
    super(message);
  }
}

export interface CourierProvider {
  id: string;
  label: string;
  /** Secret keys this provider needs (all must be set for booking). */
  credentialKeys: string[];
  isConfigured(): boolean;
  createOrder(input: CourierBookingInput): Promise<CourierBookingResult>;
  /** Find a consignment already created for this invoice (recovery after a duplicate/timeout). */
  findByInvoice(invoice: string): Promise<{ consignmentId: string; status: string | null } | null>;
  getStatus(consignmentId: string): Promise<string>;
  /** Account balance — used by the admin "Test connection" button. */
  getBalance(): Promise<number>;
  outcomeFor(status: string): CourierOutcome;
  /** Human label for a courier status. */
  statusLabel(status: string): string;
  /** True when a webhook request carries valid credentials. */
  verifyWebhook(headers: Record<string, string | string[] | undefined>): boolean;
  parseWebhook(body: unknown): CourierWebhookEvent | null;
}
