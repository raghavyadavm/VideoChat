/**
 *
 * SocketConnection
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { createStructuredSelector } from 'reselect';
import { compose } from 'redux';

import injectSaga from 'utils/injectSaga';
import injectReducer from 'utils/injectReducer';
import { makeSelectClient, makeSelectError } from './selectors';
import reducer from './reducer';
import saga from './saga';
import { LOCAL_STATE_NAME } from './constants';
import { socketConnectionAction } from './actions';


/* eslint-disable react/prefer-stateless-function */
export class SocketConnection extends React.PureComponent {

  componentDidMount() {
    this.props.createSocketConnection();
  }

  render() {
    console.log(this.props.client);
    return <div>
        {/* <p>{this.props.client}</p>
        <p>{this.props.error}</p> */}
      </div>;
  }
}

SocketConnection.propTypes = {
  // dispatch: PropTypes.func.isRequired,
};

const mapStateToProps = createStructuredSelector({
  client: makeSelectClient(),
  error: makeSelectError(),
});

function mapDispatchToProps(dispatch) {
  return { createSocketConnection: () => dispatch(socketConnectionAction()) };
}

const withConnect = connect(
  mapStateToProps,
  mapDispatchToProps,
);

const withReducer = injectReducer({ key: LOCAL_STATE_NAME, reducer });
const withSaga = injectSaga({ key: LOCAL_STATE_NAME, saga });

export default compose(
  withReducer,
  withSaga,
  withConnect,
)(SocketConnection);
