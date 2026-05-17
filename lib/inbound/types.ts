export type InboundKind = "contact" | "booking" | "subscriber";

export type InboundFilterKind = "all" | InboundKind;

/** Serializable thread for CMS client (server actions). */
export type InboundThread = {
  kind: InboundKind;
  /** Stable selection id: `${kind}:${rowUuid}` */
  id: string;
  createdAtIso: string;
  title: string;
  preview: string;
  listLabel: string;
  secondary: string;
  tag: string;
  unread: boolean;
  status: string;
  emailStatus: string;
  email: string;
  message?: string;
  source?: string;
  metadata?: Record<string, unknown>;
  requestedDay?: string;
  requestedTime?: string;
  notes?: string;
  confirmedMeetingId?: string;
  meetLink?: string;
};
