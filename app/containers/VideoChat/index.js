/**
 *
 * VideoChat
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { Helmet } from 'react-helmet';
import { createStructuredSelector } from 'reselect';
import { compose } from 'redux';

import injectSaga from 'utils/injectSaga';
import injectReducer from 'utils/injectReducer';
import { makeSelectStream, makeSelectError } from './selectors';
import reducer from './reducer';
import saga from './saga';
import { LOCAL_STATE_NAME } from './constants';
import { getUserMediaAction } from './actions';
import Video from '../../components/Video';
import SocketConnection from '../SocketConnection';
import MyVideoStyle from './MyVideoStyle';

/* eslint-disable react/prefer-stateless-function */
export class VideoChat extends React.PureComponent {
  componentDidMount() {
    this.props.getUserMedia();
  }

  render() {
    return (
      <div>
        <Helmet>
          <title>VideoChat</title>
          <meta name="description" content="Description of VideoChat" />
        </Helmet>
        <SocketConnection/>
        {this.props.stream != null ? (
          <Video stream={this.props.stream} />
        ) : null}
      </div>
    );
  }
}

VideoChat.propTypes = {
  // dispatch: PropTypes.func.isRequired,
};

const mapStateToProps = createStructuredSelector({
  stream: makeSelectStream(),
  error: makeSelectError(),
});

function mapDispatchToProps(dispatch) {
  return {
    getUserMedia: () => dispatch(getUserMediaAction()),
  };
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
)(VideoChat);
