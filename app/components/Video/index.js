/**
 *
 * Video1
 *
 */

import React from 'react';
// import PropTypes from 'prop-types';
// import styled from 'styled-components';

class Video extends React.PureComponent {
  componentDidMount() {
    this.videoElement.srcObject = this.props.stream;
  }

  render() {
    return (
      <video
        ref={element => {
          this.videoElement = element;
        }}
        id="screenshareVideo"
        autoPlay
        playsInline
        muted
      />
    );
  }
}

Video.propTypes = {};

export default Video;
