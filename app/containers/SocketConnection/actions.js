/*
 *
 * SocketConnection actions
 *
 */
import { socketEmit } from 'redux-saga-sc';

import * as actionTypes from './constants';

// export function socketConnectionAction() {
//   return {
//     type: SOCKET_CONNECTION,
//   };
// }

// export function socketConnectionSuccess(success) {
//   return {
//     type: SOCKET_CONNECTION_SUCCESS,
//     success,
//   };
// }

// export function socketConnectionFailure(error) {
//   return {
//     type: SOCKET_CONNECTION_FAILURE,
//     error,
//   };
// }

// export function socketListenerAction(client) {
//   return {
//     type: SOCKET_LISTENER,
//     client,
//   };
// }

export const createOrJoinEmit = room =>
  socketEmit(
    {
      type: actionTypes.CREATE_OR_JOIN,
      payload: room,
    },
    'create or join',
  );

export function myId(id) {
  return {
    type: actionTypes.MY_ID,
    payload: id,
  };
}

export const startExchange = () =>
  socketEmit(
    {
      type: actionTypes.CONNECTED_CLIENTS,
      payload: { message: 'exchange started' },
    },
    'connectedClients',
  );

// export function startExchange() {
//   return { type: START_EXCHANGE };
// }

export const sendMessage = (message, sender) =>
  socketEmit({
    type: actionTypes.CONNECTED_CLIENTS,
    payload: {
      message,
      sender,
    },
  });
