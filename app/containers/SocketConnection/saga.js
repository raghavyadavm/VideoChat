import {
  takeLatest,
  call,
  put,
  select,
  take,
  all,
  takeEvery,
} from 'redux-saga/effects';
// import socketCluster from 'socketcluster-client';
import {
  watchEmits,
  watchRemote,
  watchRequests,
  createEventChannel,
  createChannelSubscription,
} from 'redux-saga-sc';

import * as actionTypes from './constants';

import * as actions from './actions';

// the 'socketcluster-client' package throws an exception if WebSocket does not exist
const socketCluster = global.WebSocket
  ? require('socketcluster-client')
  : false;

let socket =
  socketCluster &&
  socketCluster.connect({
    hostname: '10.0.0.12',
    path: `/socketcluster/`,
    port: 8000,
  });

export default function* scsagas() {
  console.log(socket);

  yield all([
    watchRemote(socket),
    watchEmits(socket),
    watchIncomingEmitsSaga(socket),
    watchIncomingChannelSaga(socket),
  ]);
}

// to watch data on channels
export function* watchIncomingChannelSaga(socket) {
  const chan = yield call(createChannelSubscription, socket, 'datachannel');
  while (true) {
    const action = yield take(chan);
    yield put(action);
  }
}

// to handle incoming emits from the server
export function* watchIncomingEmitsSaga(socket) {
  const emitChannel = yield call(createEventChannel, socket, 'events');
  while (true) {
    const emitAction = yield take(emitChannel);
    console.log(emitAction);
    if (emitAction.type == actionTypes.CONNECTED) {
      yield put(actions.myId(emitAction.payload));
      yield put(actions.startExchange());
    } else if (emitAction.type == actionTypes.CREATED) {
      console.log('created room ', emitAction);
    } else if (emitAction.type == actionTypes.OPEN_CHAT_CHANNEL) {
      console.log('chat channel is opened ', emitAction);
      yield put(emitAction);
    }
  }
}
