/**
 * Every extension message follows this envelope.
 * Type-narrow on `type` in handlers.
 */
export interface MessageEnvelope<T extends string = string, P = unknown> {
  type: T;
  payload: P;
  id?: string;
}

export type PingMessage = MessageEnvelope<'PING', { from: 'popup' | 'content' | 'background' }>;
export type PongMessage = MessageEnvelope<'PONG', { apiOk: boolean; timestamp: string }>;

export type CasperMessage = PingMessage | PongMessage;
