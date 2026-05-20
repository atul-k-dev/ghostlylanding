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

export type RequestCodeMessage = MessageEnvelope<'REQUEST_CODE', { email: string }>;
export type RequestCodeResponse = MessageEnvelope<
  'CODE_SENT',
  { sent: boolean; via: 'resend' | 'console'; ttlMinutes: number; devCode?: string }
>;

export type VerifyCodeMessage = MessageEnvelope<'VERIFY_CODE', { email: string; code: string }>;
export type VerifyCodeResponse = MessageEnvelope<
  'CODE_VERIFIED',
  { ok: boolean; error?: string }
>;

export type LogoutMessage = MessageEnvelope<'LOGOUT', Record<string, never>>;
export type LogoutResponse = MessageEnvelope<'LOGGED_OUT', Record<string, never>>;

// -- scheduler ---------------------------------------------------------------
export type EnqueueStubTasksMessage = MessageEnvelope<
  'DEV_ENQUEUE_STUB_TASKS',
  { count: number }
>;
export type FlushBufferMessage = MessageEnvelope<'FLUSH_ACTION_BUFFER', Record<string, never>>;

export type CasperMessage =
  | PingMessage
  | PongMessage
  | GetAuthMessage
  | GetAuthResponse
  | RequestCodeMessage
  | RequestCodeResponse
  | VerifyCodeMessage
  | VerifyCodeResponse
  | LogoutMessage
  | LogoutResponse;
