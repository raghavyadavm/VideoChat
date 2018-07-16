import { put, takeLatest } from 'redux-saga/effects';

import { GET_USER_MEDIA } from './constants';
import { getUserMediaSuccess, getUserMediaFailure} from './actions';

export function* getUserMediaSaga() {
  let constraints = (window.constraints = {
    audio: true,
    video: {
      facingMode: 'user',
      mirrored: true
    }
  });

  try {
    const stream = yield navigator
      .mediaDevices
      .getUserMedia(constraints);
    yield put(getUserMediaSuccess(stream));
  } catch (error) {
    yield put(getUserMediaFailure(error));
  }
}

export default function* defaultUserMediaSaga() {
  yield takeLatest(GET_USER_MEDIA, getUserMediaSaga);
}
