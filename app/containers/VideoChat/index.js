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
import MyVideoStyle from './MyVideoStyle';

/* eslint-disable react/prefer-stateless-function */
export class VideoChat extends React.PureComponent {
  count = 0;
  componentDidMount() {
    this.props.getUserMedia();
  }

  componentDidUpdate(prevProps, prevState) {
    this.count++;
    console.log('count ', this.count);
  }

  render() {
    let video, list;
    if (this.props.clientsList) {
      console.log('vc list ', this.props.clientsList);
      list = this.props.clientsList.map((element)=><li key={element}>{element}</li>)
    }
    if (this.props.stream) {
      console.log(this.props.stream);
      video = <Video stream={this.props.stream} />;
    }
    return (
      <div>
        <Helmet>
          <title>VideoChat</title>
          <meta name="description" content="Description of VideoChat" />
        </Helmet>
        {video}
        <ul>
          {list}
        </ul>
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
