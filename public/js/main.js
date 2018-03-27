'use strict';

var isChannelReady = false;
var isInitiator = false;
var isStarted = false;
var localStream;
var pc;
var remoteStream;
var turnReady;
var chatChannel;

//STUN server configuration
var pc_config = {
  'iceServers': [
    {
      'urls': 'stun:stun.l.google.com:19302'
    },
    {
      'urls':'turn:numb.viagenie.ca',
      'credential': 'muazkh',
      'username': 'webrtc@live.com'
    }
  ]
};

var pc_constraints = {
  'optional': [{
    'DtlsSrtpKeyAgreement': true
  }]
};

// Set up audio and video regardless of what devices are present.
var sdpConstraints = {
  offerToReceiveAudio: true,
  offerToReceiveVideo: true
};

/////////////////////////////////////////////

var room = 'foo';

var client = socketCluster.connect();

console.log(client);

if (room !== '') {
  client.emit('create or join', room);
  console.log('Attempted to create or join room: ', room);
}

client.on('created', function (room) {
  console.log('created room ', room);
  isInitiator = true;
});

client.on('askClientToSubscribe', function (room){
  chatChannel = client.subscribe(room);
  chatChannel.on('subscribeFail', function (err) {
    console.log('Failed to subscribe to hello channel due to error: ', err);
  });

  chatChannel.watch(function (data) {
    console.log('watch results: ', data);
  });
});

client.on('full', function (room) {
  console.log('Room ' + room + ' is full');
});

//// 2nd client -> server  emits 'join' and 'joined'//client.on('join')///////////////
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

client.on('joined', function (room) {
  console.log('joined: ', room);
  isChannelReady = true;
});

//////////////////sendMessage()///////////////////

function sendMessage(message) {
  console.log('Client sending message: ', message);
  client.emit('msg', message);
}

var msgChannel = client.subscribe('messagebroadcast');

msgChannel.on('subscribeFail', function (err) {
 console.log('Failed to subscribe to the msg channel due to error: ' + err);
});

msgChannel.watch(function (data) {
  var message = data.msg;
  if (data.id === client.id) {
    // console.log('id s are equal');
  } else {
    console.log('Client received message:', message);
    if (message === 'got user media') {
      maybeStart();
    } else if (message.type === 'offer') {
      if (!isInitiator && !isStarted) {
        maybeStart();
      }
      pc.setRemoteDescription(new RTCSessionDescription(message));
      doAnswer();
    } else if (message.type === 'answer' && isStarted) {
      pc.setRemoteDescription(new RTCSessionDescription(message));
    } else if (message.type === 'candidate' && isStarted) {
      var candidate = new RTCIceCandidate({
        sdpMLineIndex: message.label,
        candidate: message.candidate
      });
      pc.addIceCandidate(candidate);
    } else if (message === 'bye' && isStarted) {
      handleRemoteHangup();
    }
  }
});

//////////////////getUserMedia()///////////////////

var localVideo = document.querySelector('#localVideo');
var remoteVideo = document.querySelector('#remoteVideo');

navigator.mediaDevices.getUserMedia({
  audio: true,
  video: true
})
.then(gotStream)
.catch(function(e) {
  console.log('getUserMedia() error: ' + e.name);
});

function gotStream(stream) {
  console.log('Adding local stream.');
  localVideo.srcObject = stream;
  localVideo.muted = true;
  localStream = stream;
  console.log('localStream: of '+client.id+' is: ', localStream);
  sendMessage('got user media');
  if (isInitiator) {
    maybeStart();
  }
}

var constraints = {
  video: true,
  audio: true
};

console.log('Getting user media with constraints', constraints);

function maybeStart() {
  console.log('>>>>>>> maybeStart() ', isStarted, localStream, isChannelReady);
  if (!isStarted && typeof localStream !== 'undefined' && isChannelReady) {
    console.log('>>>>>> creating peer connection');
    createPeerConnection();
    pc.addStream(localStream);
    isStarted = true;
    console.log('isInitiator', isInitiator);
    if (isInitiator) {
      doCall();
    }
  }
}

window.onbeforeunload = function() {
  sendMessage('bye');
};

/////////////////////////////////////////////////////////

function createPeerConnection() {
  try {
    pc  = new RTCPeerConnection(pc_config, pc_constraints);
    pc.onicecandidate = handleIceCandidate;
    pc.onaddstream = handleRemoteStreamAdded;
    pc.onremovestream = handleRemoteStreamRemoved;
    console.log('Created RTCPeerConnnection');
  } catch (e) {
    console.log('Failed to create PeerConnection, exception: ' + e.message);
    alert('Cannot create RTCPeerConnection object.');
    return;
  }
}

function handleIceCandidate(event) {
  console.log('icecandidate event: ', event);
  if (event.candidate) {
    sendMessage({
      type: 'candidate',
      label: event.candidate.sdpMLineIndex,
      id: event.candidate.sdpMid,
      candidate: event.candidate.candidate
    });
  } else {
    console.log('End of candidates.');
  }
}

function handleCreateOfferError(event) {
  console.log('createOffer() error: ', event);
}

function doCall() {
  console.log('Sending offer to peer');
  pc.createOffer(setLocalAndSendMessage, handleCreateOfferError);
}

function doAnswer() {
  console.log('Sending answer to peer.');
  pc.createAnswer().then(
    setLocalAndSendMessage,
    onCreateSessionDescriptionError
  );
}

function setLocalAndSendMessage(sessionDescription) {
  // Set Opus as the preferred codec in SDP if Opus is present.
  //  sessionDescription.sdp = preferOpus(sessionDescription.sdp);
  pc.setLocalDescription(sessionDescription);
  console.log('setLocalAndSendMessage sending message', sessionDescription);
  sendMessage(sessionDescription);
}

function onCreateSessionDescriptionError(error) {
  trace('Failed to create session description: ' + error.toString());
}

function handleRemoteStreamAdded(event) {
  console.log('Remote stream added.');
  remoteVideo.srcObject = event.stream;
  remoteStream = event.stream;
  console.log('remote stream:  of '+client.id+' is: ',remoteStream);
}

function handleRemoteStreamRemoved(event) {
  console.log('Remote stream removed. Event: ', event);
}

function hangup() {
  console.log('Hanging up.');
  stop();
  sendMessage('bye');
}

function handleRemoteHangup() {
  console.log('Session terminated.');
  stop();
  isInitiator = false;
}

function stop() {
  isStarted = false;
  pc.close();
  pc = null;
}
