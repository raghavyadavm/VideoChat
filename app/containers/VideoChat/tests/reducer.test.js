import { fromJS } from 'immutable';
import videoChatReducer from '../reducer';

describe('videoChatReducer', () => {
  it('returns the initial state', () => {
    expect(videoChatReducer(undefined, {})).toEqual(fromJS({}));
  });
});
