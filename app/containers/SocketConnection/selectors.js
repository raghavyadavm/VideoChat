import { createSelector } from 'reselect';
import { initialState } from './reducer';
import { LOCAL_STATE_NAME } from './constants';

const selectLocalState = state => state.get(LOCAL_STATE_NAME, initialState);

const makeSelectClient = () =>
  createSelector(selectLocalState, substate => substate.get('client'));

const makeSelectError = () =>
  createSelector(selectLocalState, substate => substate.get('error'));

export { makeSelectClient, makeSelectError };
