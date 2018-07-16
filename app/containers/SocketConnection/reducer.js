/*
 *
 * SocketConnection reducer
 *
 */

import { fromJS } from 'immutable';
import { SOCKET_CONNECTION_SUCCESS, SOCKET_CONNECTION_FAILURE } from './constants';

export const initialState = fromJS({
  client: null,
  error: null
});

function socketConnectionReducer(state = initialState, action) {
  switch (action.type) {
    case SOCKET_CONNECTION_SUCCESS:
      return state.set('client', action.success);
    case SOCKET_CONNECTION_FAILURE:
      return state.set('error', action.error);
    default:
      return state;
  }
}

export default socketConnectionReducer;
