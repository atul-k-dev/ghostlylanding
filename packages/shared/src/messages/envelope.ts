import type { User } from '../types/user.js';

/**
 * Every extension message follows this envelope.
 * Type-narrow on `type` in handlers.
 */
export interface MessageEnvelope<T extends string = string, P = unknown> {
  type: T;
  payload: P;
  id?: string;
}

// -- diagnostics --------------------------------------------------------------
export type PingMessage = MessageEnvelope<'PING', { from: 'popup' | 'content' | 'background' }>;
export type PongMessage = MessageEnvelope<'PONG', { apiOk: boolean; timestamp: string }>;

// -- auth ---------------------------------------------------------------------
export type GetAuthMessage = MessageEnvelope<'GET_AUTH', Record<string, never>>;
export type GetAuthResponse = MessageEnvelope<
  'AUTH_STATE',
  { authenticated: boolean; user: User | null }
>;

export type RequestMagicLinkMessage = MessageEnvelope<'REQUEST_MAGIC_LINK', { email: string }>;
export type RequestMagicLinkResponse = MessageEnvelope<
  'MAGIC_LINK_SENT',
  { sent: boolean; via: 'resend' | 'console'; devVerifyUrl?: string }
>;

export type AuthFromWebMessage = MessageEnvelope<
  'AUTH_FROM_WEB',
  { token: string; user: User }
>;

export type LogoutMessage = MessageEnvelope<'LOGOUT', Record<string, never>>;
export type LogoutResponse = MessageEnvelope<'LOGGED_OUT', Record<string, never>>;

// -- scheduler ---------------------------------------------------------------
export type EnqueueStubTasksMessage = MessageEnvelope<
  'DEV_ENQUEUE_STUB_TASKS',
  { count: number }
>;
export type FlushBufferMessage = MessageEnvelope<'FLUSH_ACTION_BUFFER', Record<string, never>>;

// -- web → content handoff ----------------------------------------------------
export const WEB_AUTH_MESSAGE_TYPE = 'CASPER_AUTH_HANDOFF' as const;
export interface WebAuthHandoff {
  type: typeof WEB_AUTH_MESSAGE_TYPE;
  payload: { token: string; user: User };
}

export type CasperMessage =
  | PingMessage
  | PongMessage
  | GetAuthMessage
  | GetAuthResponse
  | RequestMagicLinkMessage
  | RequestMagicLinkResponse
  | AuthFromWebMessage
  | LogoutMessage
  | LogoutResponse;
