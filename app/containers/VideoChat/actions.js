/*
 *
 * VideoChat actions
 *
 */

import { GET_USER_MEDIA, GET_USER_MEDIA_SUCCESS, GET_USER_MEDIA_FAILURE } from './constants';

export function getUserMediaAction() {
  return {
    type: GET_USER_MEDIA,
  };
}

export function getUserMediaSuccess(stream) {
  return {
    type: GET_USER_MEDIA_SUCCESS,
    stream
  };
}

export function getUserMediaFailure(error) {
  return {
    type: GET_USER_MEDIA_FAILURE,
    error
  };
}

