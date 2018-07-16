import { takeLatest, call, put, select } from 'redux-saga/effects';
import socketCluster from 'socketcluster-client';

import { SOCKET_CONNECTION } from './constants';
import { socketConnectionSuccess, socketConnectionFailure } from './actions';

export function* socketConnectionSaga() {
  const socketOptions = {
    hostname: 'localhost',
    path: `/socketcluster/`,
    port: 8000,
  };

  const socket = socketCluster.create(socketOptions);

  try {
    yield socket.on('connect', () => {
      console.log(socket.state);
      console.log(socket);
    });
    yield put(socketConnectionSuccess(socket));
  } catch (error) {
    yield put(socketConnectionFailure(error));
  }
}

export default function* defaultSocketConnectionSaga() {
  yield takeLatest(SOCKET_CONNECTION, socketConnectionSaga);
}
