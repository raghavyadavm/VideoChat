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

import VideoChat from '../VideoChat';
import injectSaga from 'utils/injectSaga';
import injectReducer from 'utils/injectReducer';
import * as selectors from './selectors';
import reducer from './reducer';
import saga from './saga';
import { LOCAL_STATE_NAME } from './constants';
import * as actions from './actions';

/* eslint-disable react/prefer-stateless-function */
export class SocketConnection extends React.PureComponent {
  componentDidMount() {
    console.log(`cdm -- my id is ${this.props.myId}`);

    // this.props.startExchangeEvent();
  }

  render() {
    console.log('sc list ', this.props.clientsList);
    console.log(`my id is ${this.props.myId}`);
    console.log(`chat channel opened ${this.props.chatChannel}`);

    let videoChat = null;
    let bool = true;
    if (this.props.myId) {
      // this.props.startExchangeEvent();
      if (this.props.clientsList) {
        console.log(this.props.clientsList);
        var room = 'foo';
        if (room !== '') {
          this.props.createOrJoinEvent(room); // client.emit('create or join', room);
          console.log('Attempted to create or join room: ', room);
          videoChat = <VideoChat clientsList={this.props.clientsList} />;
        }
      }
      // if (this.props.clientsList && this.props.clientsList.length > 1) {
      //   console.log(this.props.clientsList);
      //   videoChat = <VideoChat clientsList={this.props.clientsList} />;
      // }
    }

    return <div>
        {videoChat}
      <p>Is chatChannel opened {this.props.chatChannel? 'true': 'false'}</p>
      </div>;
  }
}

SocketConnection.propTypes = {
  // dispatch: PropTypes.func.isRequired,
};

const mapStateToProps = createStructuredSelector({
  myId: selectors.makeSelectMyID(),
  error: selectors.makeSelectError(),
  clientsList: selectors.makeSelectClientsList(),
  chatChannel: selectors.makeSelectChatChannel(),
});

function mapDispatchToProps(dispatch) {
  return {
    startExchangeEvent: () => dispatch(actions.startExchange()),
    createOrJoinEvent: room => dispatch(actions.createOrJoinEmit(room)),
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
)(SocketConnection);
