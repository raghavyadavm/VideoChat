/*
 *
 * VideoChat reducer
 *
 */

import { fromJS } from 'immutable';
import { GET_USER_MEDIA_SUCCESS, GET_USER_MEDIA_FAILURE } from './constants';

export const initialState = fromJS({
  stream: null,
  error: null
});

function videoChatReducer(state = initialState, action) {
  switch (action.type) {
    case GET_USER_MEDIA_SUCCESS:
      return state.set('stream', action.stream);
    case GET_USER_MEDIA_FAILURE:
      return state.set('error', action.error);
    default:
      return state;
  }
}

export default videoChatReducer;
