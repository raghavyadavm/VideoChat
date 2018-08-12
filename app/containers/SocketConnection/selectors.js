import { createSelector } from 'reselect';
import { initialState } from './reducer';
import { LOCAL_STATE_NAME } from './constants';

const selectLocalState = state => state.get(LOCAL_STATE_NAME, initialState);

const makeSelectMyID = () =>
  createSelector(selectLocalState, substate => substate.get('myId'));

const makeSelectClientsList = () =>
  createSelector(selectLocalState, substate => substate.get('clientsList'));

const makeSelectError = () =>
  createSelector(selectLocalState, substate => substate.get('error'));

const makeSelectExchange = () =>
  createSelector(selectLocalState, substate => substate.get('exchange'));

const makeSelectChatChannel = () =>
  createSelector(selectLocalState, substate => substate.get('chatChannel'));

export {
  makeSelectMyID,
  makeSelectError,
  makeSelectClientsList,
  makeSelectExchange,
  makeSelectChatChannel,
};
