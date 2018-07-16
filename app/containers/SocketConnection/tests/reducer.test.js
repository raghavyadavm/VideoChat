import { fromJS } from 'immutable';
import socketConnectionReducer from '../reducer';

describe('socketConnectionReducer', () => {
  it('returns the initial state', () => {
    expect(socketConnectionReducer(undefined, {})).toEqual(fromJS({}));
  });
});
