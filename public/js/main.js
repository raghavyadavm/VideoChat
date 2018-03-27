'use strict';

var isChannelReady = false;
var isInitiator = false;
var isStarted = false;
var isNew = false;
var localStream;
var pc = [];
var pc1;
var clientsList = [];
var remoteStream;
var turnReady;
var chatChannel;
var i = 0;
var localScreen = [];
var localScreenMaterial = [];
var localScreenTexture = [];
var clientsData = [];
var screenShareStream;

/*
    ******************NEEDS TO BE FIXED***********************
    navigator support for different browsers
*/
navigator.getUserMedia = navigator.getUserMedia || navigator.mozGetUserMedia ||
                navigator.webkitGetUserMedia;
window.RTCPeerConnection = window.RTCPeerConnection ||
                window.mozRTCPeerConnection || window.webkitRTCPeerConnection;
window.RTCIceCandidate = window.RTCIceCandidate || window.mozRTCIceCandidate ||
                window.webkitRTCIceCandidate;
window.RTCSessionDescription = window.RTCSessionDescription ||
      window.mozRTCSessionDescription || window.webkitRTCSessionDescription;

//STUN server configuration
var pc_config = {'iceServers': [{'url': 'stun:stun.l.google.com:19302'}]};

var pc_constraints = {
  'optional': [{'DtlsSrtpKeyAgreement': true}]
};

// Set up audio and video regardless of what devices are present.
var sdpConstraints = {
  offerToReceiveAudio: true,
  offerToReceiveVideo: true
};

///////////////////////////////////////////////////////////////////////////////
var name = prompt('Enter your name');
console.log('your name is ', name);

var client = socketCluster.connect();
//client connecting to server
// var client = socketCluster.connect({
//   hostname: 'localhost',
//   secure: true,
//   port: 8003,
//   rejectUnauthorized: false // Only necessary during debug if using a self-signed certificate
// });
console.log(client);
console.log('screen share clients ',clientsList);

///////////////////////screenShare chrome extension/////////////////////////////////

var maxTries = 0;

function showChromeExtensionStatus() {
  if (typeof window.getChromeExtensionStatus !== 'function') return;

  var gotResponse;
  window.getChromeExtensionStatus(function(status) {
    gotResponse = true;
    document.getElementById('chrome-extension-status').innerHTML =
      'Chrome extension status is: <b>' + status + '</b>';
    console.info('getChromeExtensionStatus', status);
  });

  maxTries++;
  if (maxTries > 15) return;
  setTimeout(function() {
    if (!gotResponse) showChromeExtensionStatus();
  }, 1000);
}

showChromeExtensionStatus();
// via: https://bugs.chromium.org/p/chromium/issues/detail?id=487935#c17
// you can capture screen on Android Chrome >= 55 with flag: "Experimental ScreenCapture android"
window.IsAndroidChrome = false;
try {
  if (navigator.userAgent.toLowerCase().indexOf("android") > -1 &&
    /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor)) {
    window.IsAndroidChrome = true;
  }
} catch (e) {}

document.getElementById('capture-screen').onclick = function() {
  document.getElementById('capture-screen').disabled = true;

  setTimeout(function() {
    if (document.getElementById('capture-screen').disabled &&
      !document.querySelector('video').src) {
        document.getElementById('capture-screen').disabled = false;
    }
  }, 5000);

  getScreenId(function(error, sourceId, screen_constraints) {
    // error    == null || 'permission-denied' || 'not-installed' || 'installed-disabled' || 'not-chrome'
    // sourceId == null || 'string' || 'firefox'
    // getUserMedia(screen_constraints, onSuccess, onFailure);

    document.getElementById('capture-screen').disabled = false;

    if (IsAndroidChrome) {
      screen_constraints = {
        mandatory: {
          chromeMediaSource: 'screen'
        },
        optional: []
      };

      screen_constraints = {
        video: screen_constraints
      };

      error = null;
    }

    if (error == 'not-installed') {
      alert('Please install Chrome extension. See the link below.');
      return;
    }

    if (error == 'installed-disabled') {
      alert('Please install or enable Chrome extension. Please check '+
      'chrome://extensions" page.');
      return;
    }

    if (error == 'permission-denied') {
      alert('Please make sure you are using HTTPs. Because HTTPs is required.');
      return;
    }

    console.info('getScreenId callback \n(error, sourceId, screen_constraints)'+
      '=>\n', error, sourceId, screen_constraints);

    document.getElementById('capture-screen').disabled = true;
    navigator.getUserMedia = navigator.mozGetUserMedia ||
      navigator.webkitGetUserMedia;
    navigator.getUserMedia(screen_constraints, function(stream) {
      // share this "MediaStream" object using RTCPeerConnection API

      document.querySelector('video').src = URL.createObjectURL(stream);
      screenShareStream = stream;
      screenshareOffer(stream);

      stream.oninactive = stream.onended = function() {
        document.querySelector('video').src = null;
        document.getElementById('capture-screen').disabled = false;
      };

      document.getElementById('capture-screen').disabled = false;
    }, function(error) {
      console.error('getScreenId error', error);

      alert('Failed to capture your screen. Please check Chrome console logs '+
        'for further information.');
    });
  });
};

///////////////////screenshareOffer()/////////////////////////////////

function screenshareOffer(stream) {
  for (var i = 0; i < clientsData.length; i++) {
    if (clientsData[i] === client.id) {
      console.log('own id');
    } else {
        console.log('>>>>>> creating peer connection ',i, ' for ', clientsData[i]);
        pc[i] = screenshareOfferPeerConnection(clientsData[i]);
    }
  }
}

function screenshareOfferPeerConnection(clientID) {
  try {
    var pc  = new RTCPeerConnection(pc_config, pc_constraints);
    pc.onicecandidate = handleScreenShareOfferIceCandidate;
    pc.onaddstream = handleScreenShareOfferRemoteStreamAdded;
    pc.onremovestream = handleScreenShareOfferRemoteStreamRemoved;
    console.log('Created screenshareOffer RTCPeerConnnection ', pc);
  } catch (e) {
    console.log('Failed to create screenshareOffer PeerConnection, exception: ' + e.message);
    alert('Cannot create screenshareOffer RTCPeerConnection object.');
    return;
  }

    pc.addStream(screenShareStream);
    pc.createOffer(function (offer) {
      // Set Opus as the preferred codec in SDP if Opus is present.
      //  sessionDescription.sdp = preferOpus(sessionDescription.sdp);
      console.log('pc[ ]',pc);
      pc.setLocalDescription(offer);
      console.log('setLocalDescription for offer ', offer, ' id ', clientID);
      client.emit('screenOffer', {data:offer, from:client.id, to:clientID});
      //sendMessage(sessionDescription);
    }, function (err) {
        console.log('error', err);
    });

    function handleScreenShareOfferRemoteStreamAdded(event) {
      console.log('(GetClientsOffer) Remote stream added.', event.stream);
      remoteStream = event.stream;
    }

    function handleScreenShareOfferIceCandidate(event) {
      console.log('handleScreenShareOfferIceCandidate event is triggered ', event);
      if (event.candidate) {
        client.emit('iceOffer', {
          type: 'candidate',
          label: event.candidate.sdpMLineIndex,
          id: event.candidate.sdpMid,
          candidate: event.candidate.candidate,
          from:client.id,
          to:clientID
        });
      } else {
        console.log('End of candidates for offer.');
      }
    }

    function handleScreenShareOfferRemoteStreamRemoved(event) {
      console.log('(Offer) Remote stream removed. Event: ', event);
    }

    return pc;
}

var screenOfferChannel = client.subscribe('screenOffer');

screenOfferChannel.on('subscribeFail', function (err) {
 console.log('Failed to subscribe to the offer channel due to error: ' + err);
});

screenOfferChannel.watch(function (data) {

  if (data.to === client.id) {
    console.log('offer if case ', data.data.type);
    pc1 = createScreenAnswerPeerConnection(data);

  } else {
    console.log('offer else case ', data);
  }
});

function createScreenAnswerPeerConnection(data) {
  try {
    var pc  = new RTCPeerConnection(pc_config, pc_constraints);
    pc.onicecandidate = handleAnswerIceCandidate;
    pc.onaddstream = handleAnswerRemoteStreamAdded;
    pc.onremovestream = handleAnswerRemoteStreamRemoved;
    console.log('Created Answer RTCPeerConnnection ', pc);
  } catch (e) {
    console.log('Failed to create Answer PeerConnection, exception: ' + e.message);
    alert('Cannot create Answer RTCPeerConnection object.');
    return;
  }

  pc.addStream(localStream);
  pc.setRemoteDescription(new RTCSessionDescription(data.data));
  pc.createAnswer(function (answer) {
    // Set Opus as the preferred codec in SDP if Opus is present.
    //  sessionDescription.sdp = preferOpus(sessionDescription.sdp);
    pc.setLocalDescription(answer);
    console.log('answer', answer, ' id ', data);
    client.emit('answer', {data:answer, from:data.to, to:data.from});
  }, function (err) {
      console.log('error', err);
  });

  function handleAnswerIceCandidate(event) {
    console.log('handleAnswerIceCandidate event is triggered ', event);
    if (event.candidate) {
      client.emit('iceAnswer', {
        type: 'candidate',
        label: event.candidate.sdpMLineIndex,
        id: event.candidate.sdpMid,
        candidate: event.candidate.candidate,
        from:client.id,
        to:data.from
      });
    } else {
      console.log('End of candidates Answer.');
    }
  }

  function handleAnswerRemoteStreamAdded(event) {
    console.log('(Answer)Remote stream added.');
    remoteStream = event.stream;

    var v = document.getElementById("screenshareVideo");
    v.autoplay = true;
    v.srcObject = event.stream; //assigning stream to the video element
    v.width = "400";
    v.height = "200";
    v.controls = true;
    v.class = "videoInsert";
    v.style="display:block; margin: 0 auto; width: 50% !important; height: 70% !important; position: relative";
    v.setAttribute('playsInline', '');

    console.log('(Answer)remote stream:  of '+client.id+' is: ',remoteStream);
  }

  function handleAnswerRemoteStreamRemoved(event) {
    console.log('(Answer)Remote stream removed. Event: ', event);
  }

  return pc;
}


////////////////////chat functions////////////////////////////////////

$('form').submit(function() {
  if ($('#message').val() != '') {
    client.emit('chat', (name + " : " + $('#message').val()));
  }

  $('#message').val('')
  return false;
});

var chatChannel = client.subscribe('yell');

chatChannel.on('subscribeFail', function(err) {
  console.log('Failed to subscribe to Yell channel due to error: ' + err);
});

chatChannel.watch(function(data) {
  $('#messages-list').append($('<li>').text(data));
});

///////////////////////////////////////////////////////////////////////////////
var room = 'foo';

if (room !== '') {
  client.emit('create or join', room);
  getMediaStream();
  console.log('Attempted to create or join room: ', room);
}

var clientsListBroadcastChannel = client.subscribe('clientsListBroadcast');

clientsListBroadcastChannel.on('subscribeFail', function (err) {
 console.log('Failed to subscribe to the clientsListBroadcast channel due to error: ' + err);
});

clientsListBroadcastChannel.watch(function (data) {
  console.log('clientsListBroadcastChannel data is ', data);
  clientsData = data;
});

client.on('created', function (room) {
  console.log('created room ', room);
  isInitiator = true;
});

client.on('askClientToSubscribe', function (room){
  chatChannel = client.subscribe(room);
  chatChannel.on('subscribeFail', function (err) {
    console.log('Failed to subscribe to hello channel due to error: ', err);
  });

  chatChannel.watch(function (room) {
    console.log('watch result s: ', room);
  });
});

client.on('full', function (room) {
  console.log('Room ' + room + ' is full');
});

//// 2nd client -> server  emits 'join' and 'joined'//client.on('join')/////////
var joinChannel = client.subscribe('join');

joinChannel.on('subscribeFail', function (err) {
 console.log('Failed to subscribe to the join channel due to error: ' + err);
});

joinChannel.watch(function (data) {
  var roomid = data.room;
  if (data.id === client.id) {

    // console.log('id s are equal');
  } else {
    console.log('another peer made a request to join room '+roomid);
    console.log('This peer is the initiator of a room ', roomid);
    isChannelReady = true;
  }
});

client.on('joined', function (clients) {
  console.log('joined: ', clients);
  isNew = true;
  clientsList = clients;
  clientsListBroadcastChannel.publish(clientsList);
  for (var i = 0; i < clients.length; i++) {
    console.log(clients[i]);
    if (clients[i] == client.id) {
      console.log(client.id,' hello');
    }
    else {

    }
  }
  isChannelReady = true;
});

/////////////////////offerChannel//////////////////////////////////////////////

var offerChannel = client.subscribe('offer');

offerChannel.on('subscribeFail', function (err) {
 console.log('Failed to subscribe to the offer channel due to error: ' + err);
});

offerChannel.watch(function (data) {

  if (data.to === client.id) {
    console.log('offer if case ', data.data.type);
    pc1 = createAnswerPeerConnection(data);

  } else {
    console.log('offer else case ', data);
  }
});

////////////////////////answerChannel/////////////////////////////////////

var answerChannel = client.subscribe('answer');

answerChannel.on('subscribeFail', function (err) {
 console.log('Failed to subscribe to the offer channel due to error: ' + err);
});

answerChannel.watch(function (data) {

  if (data.to === client.id) {
    for (var i = 0; i < clientsData.length; i++) {
      if (clientsData[i] == data.from ) {
        console.log('this offer belongs to pc[',i,'] ',pc[i], ' of ', clientsList[i]);
        pc[i].setRemoteDescription(new RTCSessionDescription(data.data));
      }
    }
    console.log('answer if case', data);
  } else {
    console.log('answer else case ', data);
  }
});

/////////////////////////////iceOfferChannel///////////////////////////////////

var iceOfferChannel = client.subscribe('iceOffer');

iceOfferChannel.on('subscribeFail', function (err) {
 console.log('Failed to subscribe to the iceOffer channel due to error: ' + err);
});

iceOfferChannel.watch(function (data) {

  if (data.to === client.id) {
    console.log('iceOffer if case ', data);
    var candidate = new RTCIceCandidate({
        sdpMLineIndex: data.label,
        candidate: data.candidate
    });
    pc1.addIceCandidate(candidate);

  } else {
    console.log('iceOffer else case ', data);
  }
});

///////////////////////////iceAnswerChannel////////////////////////////////////////

var iceAnswerChannel = client.subscribe('iceAnswer');

iceAnswerChannel.on('subscribeFail', function (err) {
 console.log('Failed to subscribe to the iceAnswer channel due to error: ' + err);
});

iceAnswerChannel.watch(function (data) {

  if (data.to === client.id) {
    for (var i = 0; i < clientsList.length-1; i++) {
      if (clientsList[i] == data.from ) {
        console.log('iceAnswer if case ', data);
        //pc1 = createAnswerPeerConnection(data);
        var candidate = new RTCIceCandidate({
            sdpMLineIndex: data.label,
            candidate: data.candidate
        });
        pc[i].addIceCandidate(candidate);
      }
    }
  } else {
    console.log('iceAnswer else case ', data);
  }
});

//////////////////getUserMedia()///////////////////

function getMediaStream() {

  console.log('media stream');
  var constraints = window.constraints = {
    audio: true,
    video: true
  };

  function handleSuccess(stream) {
    console.log('Adding local stream.');
    var videoTracks = stream.getVideoTracks();
    console.log('Got stream with constraints:', constraints);
    console.log('Using video device: ' + videoTracks[0].label);
    stream.oninactive = function() {
      console.log('Stream inactive');
    };
    window.stream = stream; // make variable available to browser console

    //create a video element and add it to the DOM
    localScreen[i] = document.createElement("video");
    //document.getElementById("videoDiv").appendChild(localScreen[i]);
    //localScreen[i].id = 'localScreen[i]';
    localScreen[i].autoplay = true;
    localScreen[i].srcObject = stream; //assigning stream to the video element
    localScreen[i].width = "400";
    localScreen[i].height = "200";
    localScreen[i].controls = true;
    localScreen[i].muted = true;
    localScreen[i].class = "videoInsert";
    localScreen[i].style="display:block; margin: 0 auto; width: 50% !important; height: 70% !important; position: relative";
    localScreen[i].setAttribute('playsInline', '');

    var div = document.createElement("div");
    div.id = i;
    div.className = i;
    div.appendChild(localScreen[i]);

    document.getElementById("webcamDiv").appendChild(div);
    i = i + 1;
    localStream = stream;

    sendMessage('got user media');
  }

  function handleError(error) {
    if (error.name === 'ConstraintNotSatisfiedError') {
      errorMsg('The resolution ' + constraints.video.width.exact + 'x' +
          constraints.video.width.exact + ' px is not supported by your device.');
    } else if (error.name === 'PermissionDeniedError') {
      errorMsg('Permissions have not been granted to use your camera and ' +
        'microphone, you need to allow the page access to your devices in ' +
        'order for the demo to work.');
    }
     ('getUserMedia error: ' + error.name, error);
  }

  function errorMsg(msg, error) {
    console.log('<p>' + msg + '</p>');
    if (typeof error !== 'undefined') {
      console.error(error);
    }
  }

  navigator.mediaDevices.getUserMedia(constraints).
    then(handleSuccess).catch(handleError);

  console.log('Getting user media with constraints', constraints);
}

//////////////////sendMessage()///////////////////

function sendMessage(message) {
  if ((message.type === 'candidate')) {

  } else {
    console.log('Client sending message: ', message);
  }
  client.emit('msg', message);
}

var msgChannel = client.subscribe('messagebroadcast');

msgChannel.on('subscribeFail', function (err) {
 console.log('Failed to subscribe to the msg channel due to error: ' + err);
});

msgChannel.watch(function (data) {
  var message = data.msg;
  if (data.id === client.id) {
    if (message === 'got user media') {
      console.log('Client received message:', message);
      maybeStart();
    }
  } else {

  }
});

///////////////////////////maybeStart()/////////////////////////////////////

// if (location.hostname !== 'localhost') {
//   requestTurn(
//     'https://computeengineondemand.appspot.com/turn?username=41784574&key=4080218913'
//   );
// }

function maybeStart() {
  console.log('>>>>>>> maybeStart() ', localStream, isNew);
  if ( typeof localStream !== 'undefined' && isNew) {
    offer();
    for (var i = 0; i < clientsList.length-1; i++) {
      console.log('sd for pc[',i,'] is',pc[i].localDescription);
    }
  }
}

window.onbeforeunload = function() {
  sendMessage('bye');
};

///////////////////////////////offer()/////////////////////////////////////////

function offer() {
  console.log('clientsList.length ',clientsList.length);
  for (var i = 0; i < clientsList.length-1; i++) {
    //clientsList[i]
    console.log('>>>>>> creating peer connection ',i);
    pc[i] = createOfferPeerConnection(clientsList[i]);
  }
}

////////////////createOfferPeerConnection(()////////////////////////////////////

function createOfferPeerConnection(clientID) {
  try {
    var pc  = new RTCPeerConnection(pc_config, pc_constraints);
    pc.onicecandidate = handleOfferIceCandidate;
    pc.onaddstream = handleOfferRemoteStreamAdded;
    pc.onremovestream = handleOfferRemoteStreamRemoved;
    console.log('Created offer RTCPeerConnnection ', pc);
  } catch (e) {
    console.log('Failed to create offer PeerConnection, exception: ' + e.message);
    alert('Cannot create offer RTCPeerConnection object.');
    return;
  }

  pc.addStream(localStream);
  pc.createOffer(function (offer) {
    // Set Opus as the preferred codec in SDP if Opus is present.
    //  sessionDescription.sdp = preferOpus(sessionDescription.sdp);
    console.log('pc[ ]',pc);
    pc.setLocalDescription(offer);
    console.log('setLocalDescription for offer ', offer, ' id ', clientID);
    client.emit('offer', {data:offer, from:client.id, to:clientID});
    //sendMessage(sessionDescription);
  }, function (err) {
      console.log('error', err);
  });

  function handleOfferIceCandidate(event) {
    console.log('handleOfferIceCandidate event is triggered ', event);
    if (event.candidate) {
      client.emit('iceOffer', {
        type: 'candidate',
        label: event.candidate.sdpMLineIndex,
        id: event.candidate.sdpMid,
        candidate: event.candidate.candidate,
        from:client.id,
        to:clientID
      });
    } else {
      console.log('End of candidates for offer.');
    }
  }

  function handleOfferRemoteStreamAdded(event) {
    console.log('(Offer) Remote stream added.');

    remoteStream = event.stream;

    localScreen[i] = document.createElement("video");
    localScreen[i].autoplay = true;
    localScreen[i].srcObject = event.stream; //assigning stream to the video element
    localScreen[i].width = "400";
    localScreen[i].height = "200";
    localScreen[i].controls = true;
    localScreen[i].class = "videoInsert";
    localScreen[i].style="display:block; margin: 0 auto; width: 50% !important; height: 70% !important; position: relative";
    localScreen[i].setAttribute('playsInline', '');
    var div = document.createElement("div");
    div.id = i;
    div.className = i;
    div.appendChild(localScreen[i]);

    document.getElementById("webcamDiv").appendChild(div);
    i = i + 1;

    console.log('(Offer) remote stream:  of '+client.id+' is: ',remoteStream);
  }

  function handleOfferRemoteStreamRemoved(event) {
    console.log('(Offer) Remote stream removed. Event: ', event);
  }

  return pc;
}

////////////////createAnswerPeerConnection(()//////////////////////////////////

function createAnswerPeerConnection(data) {
  try {
    var pc  = new RTCPeerConnection(pc_config, pc_constraints);
    pc.onicecandidate = handleAnswerIceCandidate;
    pc.onaddstream = handleAnswerRemoteStreamAdded;
    pc.onremovestream = handleAnswerRemoteStreamRemoved;
    console.log('Created Answer RTCPeerConnnection ', pc);
  } catch (e) {
    console.log('Failed to create Answer PeerConnection, exception: ' + e.message);
    alert('Cannot create Answer RTCPeerConnection object.');
    return;
  }

  pc.addStream(localStream);
  pc.setRemoteDescription(new RTCSessionDescription(data.data));
  pc.createAnswer(function (answer) {
    // Set Opus as the preferred codec in SDP if Opus is present.
    //  sessionDescription.sdp = preferOpus(sessionDescription.sdp);
    pc.setLocalDescription(answer);
    console.log('answer', answer, ' id ', data);
    client.emit('answer', {data:answer, from:data.to, to:data.from});
  }, function (err) {
      console.log('error', err);
  });

  function handleAnswerIceCandidate(event) {
    console.log('handleAnswerIceCandidate event is triggered ', event);
    if (event.candidate) {
      client.emit('iceAnswer', {
        type: 'candidate',
        label: event.candidate.sdpMLineIndex,
        id: event.candidate.sdpMid,
        candidate: event.candidate.candidate,
        from:client.id,
        to:data.from
      });
    } else {
      console.log('End of candidates Answer.');
    }
  }

  function handleAnswerRemoteStreamAdded(event) {
    console.log('(Answer)Remote stream added.');
    remoteStream = event.stream;

    //create a video element and add it to the DOM
    localScreen[i] = document.createElement("video");
    localScreen[i].autoplay = true;
    localScreen[i].srcObject = event.stream; //assigning stream to the video element
    localScreen[i].width = "400";
    localScreen[i].height = "200";
    localScreen[i].controls = true;
    localScreen[i].class = "videoInsert";
    localScreen[i].style="display:block; margin: 0 auto; width: 50% !important; height: 70% !important; position: relative";
    localScreen[i].setAttribute('playsInline', '');

    var div = document.createElement("div");
    div.id = i;
    div.className = i;
    div.appendChild(localScreen[i]);

    document.getElementById("webcamDiv").appendChild(div);
    i = i + 1;

    console.log('(Answer)remote stream:  of '+client.id+' is: ',remoteStream);
  }

  function handleAnswerRemoteStreamRemoved(event) {
    console.log('(Answer)Remote stream removed. Event: ', event);
  }

  return pc;
}
///////////////////////////////////////////////////////////////////////////////

// function requestTurn(turnURL) {
//   var turnExists = false;
//   for (var i in pc_config.iceServers) {
//     if (pc_config.iceServers[i].url.substr(0, 5) === 'turn:') {
//       turnExists = true;
//       turnReady = true;
//       break;
//     }
//   }
//   if (!turnExists) {
//     console.log('Getting TURN server from ', turnURL);
//     // No TURN server. Get one from computeengineondemand.appspot.com:
//     var xhr = new XMLHttpRequest();
//     xhr.onreadystatechange = function() {
//       if (xhr.readyState === 4 && xhr.status === 200) {
//         var turnServer = JSON.parse(xhr.responseText);
//         console.log('Got TURN server: ', turnServer);
//         pc_config.iceServers.push({
//           'url': 'turn:' + turnServer.username + '@' + turnServer.turn,
//           'credential': turnServer.password
//         });
//         turnReady = true;
//       }
//     };
//     xhr.open('GET', turnURL, true);
//     xhr.send();
//   }
// }
//
// // ///////////////////////////////////////////
// // Set Opus as the default audio codec if it's present.
// function preferOpus(sdp) {
//   var sdpLines = sdp.split('\r\n');
//   var mLineIndex;
//   // Search for m line.
//   for (var i = 0; i < sdpLines.length; i++) {
//     if (sdpLines[i].search('m=audio') !== -1) {
//       mLineIndex = i;
//       break;
//     }
//   }
//   if (mLineIndex === null) {
//     return sdp;
//   }
//
//   // If Opus is available, set it as the default in m line.
//   for (i = 0; i < sdpLines.length; i++) {
//     if (sdpLines[i].search('opus/48000') !== -1) {
//       var opusPayload = extractSdp(sdpLines[i], /:(\d+) opus\/48000/i);
//       if (opusPayload) {
//         sdpLines[mLineIndex] = setDefaultCodec(sdpLines[mLineIndex],
//           opusPayload);
//       }
//       break;
//     }
//   }
//
//   // Remove CN in m line and sdp.
//   sdpLines = removeCN(sdpLines, mLineIndex);
//
//   sdp = sdpLines.join('\r\n');
//   return sdp;
// }
//
// function extractSdp(sdpLine, pattern) {
//   var result = sdpLine.match(pattern);
//   return result && result.length === 2 ? result[1] : null;
// }
//
// // Set the selected codec to the first in m line.
// function setDefaultCodec(mLine, payload) {
//   var elements = mLine.split(' ');
//   var newLine = [];
//   var index = 0;
//   for (var i = 0; i < elements.length; i++) {
//     if (index === 3) { // Format of media starts from the fourth.
//       newLine[index++] = payload; // Put target payload to the first.
//     }
//     if (elements[i] !== payload) {
//       newLine[index++] = elements[i];
//     }
//   }
//   return newLine.join(' ');
// }
//
// // Strip CN from sdp before CN constraints is ready.
// function removeCN(sdpLines, mLineIndex) {
//   var mLineElements = sdpLines[mLineIndex].split(' ');
//   // Scan from end for the convenience of removing an item.
//   for (var i = sdpLines.length - 1; i >= 0; i--) {
//     var payload = extractSdp(sdpLines[i], /a=rtpmap:(\d+) CN\/\d+/i);
//     if (payload) {
//       var cnPos = mLineElements.indexOf(payload);
//       if (cnPos !== -1) {
//         // Remove CN payload from m line.
//         mLineElements.splice(cnPos, 1);
//       }
//       // Remove CN line in sdp
//       sdpLines.splice(i, 1);
//     }
//   }
//
//   sdpLines[mLineIndex] = mLineElements.join(' ');
//   return sdpLines;
// }
