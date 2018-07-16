import { createSelector } from 'reselect';
import { initialState } from './reducer';
import { LOCAL_STATE_NAME } from './constants';

/**
 * Direct selector to the videoChat state domain
 */

const selectLocalState = state =>
  state.get(LOCAL_STATE_NAME, initialState);

const makeSelectStream = () =>
  createSelector(selectLocalState, substate => substate.get('stream'));

const makeSelectError = () =>
  createSelector(selectLocalState, substate => substate.get('error'));

export {
  makeSelectStream,
  makeSelectError
};
