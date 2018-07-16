/**
 *
 * Video1
 *
 */

import React from 'react';
// import PropTypes from 'prop-types';
// import styled from 'styled-components';

function Video(props) {
  return (
    <video
      ref={element => {
        element.srcObject = props.stream;
      }}
      id="screenshareVideo"
      autoPlay
      playsInline
      muted
    />
  );
}

Video.propTypes = {};

export default Video;
