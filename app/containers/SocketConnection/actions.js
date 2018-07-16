/*
 *
 * SocketConnection actions
 *
 */

import { SOCKET_CONNECTION, SOCKET_CONNECTION_SUCCESS, SOCKET_CONNECTION_FAILURE } from './constants';

export function socketConnectionAction() {
  return {
    type: SOCKET_CONNECTION,
  };
}

export function socketConnectionSuccess(success) {
  return {
    type: SOCKET_CONNECTION_SUCCESS,
    success
  };
}

export function socketConnectionFailure(error) {
  return {
    type: SOCKET_CONNECTION_FAILURE,
    error
  };
}
