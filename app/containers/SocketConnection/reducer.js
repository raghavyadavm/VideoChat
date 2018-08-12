/*
 *
 * SocketConnection reducer
 *
 */

import { fromJS } from 'immutable';

import * as actionTypes from './constants';

export const initialState = fromJS({
  myId: null,
  error: null,
  clientsList: null,
  exchange: null,
  chatChannel: false
});

function socketConnectionReducer(state = initialState, action) {
  switch (action.type) {
    case actionTypes.MY_ID:
      return state.set('myId', action.payload);
    case actionTypes.CONNECTED_CLIENTS:
      return state.set('clientsList', action.payload);
    case actionTypes.RECEIVE_MESSAGE:
      console.log(action.payload);
      return state;
    case actionTypes.RECEIVE_MESSAGE:
      console.log(action.payload);
      return state;
    case actionTypes.DISCONNECTED_CLIENTS:
      return state.set('clientsList', action.payload);
    case actionTypes.OPEN_CHAT_CHANNEL:
      return state.set('chatChannel', true);
    default:
      return state;
  }
}

export default socketConnectionReducer;
