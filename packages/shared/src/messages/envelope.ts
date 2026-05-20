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

export type SignupMessage = MessageEnvelope<
  'SIGNUP',
  { name: string; email: string; password: string }
>;
export type LoginMessage = MessageEnvelope<'LOGIN', { email: string; password: string }>;
export type GoogleLoginMessage = MessageEnvelope<'GOOGLE_LOGIN', Record<string, never>>;

export type AuthResultMessage = MessageEnvelope<
  'AUTH_RESULT',
  { ok: boolean; error?: string; errorCode?: string }
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
  | SignupMessage
  | LoginMessage
  | GoogleLoginMessage
  | AuthResultMessage
  | LogoutMessage
  | LogoutResponse;
