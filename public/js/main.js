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
var spc = [];
var spc1;

//STUN server configuration
var pc_config = {
  'iceServers': [
    {
      'urls': 'stun:stun.l.google.com:19302'
    },
    {
      'urls':'turn:131.95.31.237:3478',
      'credential': 'test',
      'username': 'test'
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

navigator.getUserMedia = navigator.getUserMedia || navigator.mozGetUserMedia || navigator.webkitGetUserMedia;

///////////////////////////////////////////////////////////////////////////////
var name = prompt('Enter your name');
console.log('your name is ', name);

var client = socketCluster.connect();
//client connecting to server
// var client = socketCluster.connect({
//   hostname: 'localhost',
//   secure: true,
//   port: 8004,
//   rejectUnauthorized: false // Only necessary during debug if using a self-signed certificate
// });
console.log(client);
console.log('screen share clients ', clientsList);

///////////////////////screenShare())/////////////////////////////////
let screen_constraints;

document.getElementById('capture-screen').onclick = function() {

  screen_constraints = {
    video: {
      mozMediaSource: 'window',
      mediaSource: 'window'
    }
  }

  function handleScreenSuccess(stream) {
    document.getElementById('screenshareVideo').srcObject = stream;
    screenShareStream = stream;
    screenshareOffer(stream);

    stream.oninactive = stream.onended = function() {
      document.getElementById('screenshareVideo').srcObject = null;
    };
  }

  function handleScreenError(error) {
    console.error('getScreenId error', error);

    alert('Failed to capture your screen.');
  }
  navigator.mediaDevices.getUserMedia(screen_constraints)
    .then(handleScreenSuccess).catch(handleScreenError);
};

///////////////////screenshareOffer()/////////////////////////////////

function screenshareOffer(stream) {
  for (var i = 0; i < clientsData.length; i++) {
    if (clientsData[i] === client.id) {
      console.log('own id');
    } else {
      console.log('>>>>>> creating screen peer connection ', i, ' for ', clientsData[i]);
      pc[i] = screenshareOfferPeerConnection(clientsData[i]);
    }
  }
}

function screenshareOfferPeerConnection(clientID) {
  try {
    var pc = new RTCPeerConnection(pc_config, pc_constraints);
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
  pc.createOffer(function(offer) {
    // Set Opus as the preferred codec in SDP if Opus is present.
    //  sessionDescription.sdp = preferOpus(sessionDescription.sdp);
    console.log('screenpcoffer[ ]', pc);
    pc.setLocalDescription(offer);
    console.log('setLocalDescription for screenOffer ', offer, ' id ', clientID);
    client.emit('screenOffer', {
      data: offer,
      from: client.id,
      to: clientID
    });
    //sendMessage(sessionDescription);
  }, function(err) {
    console.log('screenOffererror', err);
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
        from: client.id,
        to: clientID
      });
    } else {
      console.log('End of candidates for screenIceOffer.');
    }
  }

  function handleScreenShareOfferRemoteStreamRemoved(event) {
    console.log('(screenOffer) Remote stream removed. Event: ', event);
  }

  return pc;
}

var screenOfferChannel = client.subscribe('screenOffer');

screenOfferChannel.on('subscribeFail', function(err) {
  console.log('Failed to subscribe to the screenOffer channel due to error: ' + err);
});

screenOfferChannel.watch(function(data) {

  if (data.to === client.id) {
    console.log('screenAnswer if case ', data.data.type);
    pc1 = createScreenAnswerPeerConnection(data);

  } else {
    console.log('screenAnswer else case ', data);
  }
});

// var screenIceOfferChannel = client.subscribe('screenIceOffer');
//
// screenIceOfferChannel.on('subscribeFail', function(err) {
//   console.log('Failed to subscribe to the screenIceOffer channel due to error: ' + err);
// });
//
// screenIceOfferChannel.watch(function(data) {
//
//   if (data.to === client.id) {
//     console.log('screenIceOffer if case ', data);
//     var candidate = new RTCIceCandidate({
//       sdpMLineIndex: data.label,
//       candidate: data.candidate
//     });
//     spc1.addIceCandidate(candidate);
//
//   } else {
//     console.log('screenIceOffer else case ', data);
//   }
// });

function createScreenAnswerPeerConnection(data) {
  try {
    var pc = new RTCPeerConnection(pc_config, pc_constraints);
    pc.onicecandidate = handleScreenAnswerIceCandidate;
    pc.onaddstream = handleScreenAnswerRemoteStreamAdded;
    pc.onremovestream = handleScreenAnswerRemoteStreamRemoved;
    console.log('Created screenAnswer RTCPeerConnnection ', pc);
  } catch (e) {
    console.log('Failed to create screenAnswer PeerConnection, exception: ' + e.message);
    alert('Cannot create screenAnswer RTCPeerConnection object.');
    return;
  }

  pc.addStream(localStream);
  pc.setRemoteDescription(new RTCSessionDescription(data.data));
  pc.createAnswer(function(answer) {
    // Set Opus as the preferred codec in SDP if Opus is present.
    //  sessionDescription.sdp = preferOpus(sessionDescription.sdp);
    console.log('screenpcanswer[ ]', pc);
    pc.setLocalDescription(answer);
    console.log('answer', answer, ' id ', data);
    client.emit('answer', {
      data: answer,
      from: data.to,
      to: data.from
    });
  }, function(err) {
    console.log('screenAnswererror', err);
  });

  function handleScreenAnswerIceCandidate(event) {
    console.log('handleAnswerIceCandidate event is triggered ', event);
    if (event.candidate) {
      client.emit('iceAnswer', {
        type: 'candidate',
        label: event.candidate.sdpMLineIndex,
        id: event.candidate.sdpMid,
        candidate: event.candidate.candidate,
        from: client.id,
        to: data.from
      });
    } else {
      console.log('End of candidates screenIceAnswer.');
    }
  }

  function handleScreenAnswerRemoteStreamAdded(event) {
    console.log('(Answer)Remote stream added.');
    remoteStream = event.stream;

    var v = document.getElementById("screenshareVideo");
    v.autoplay = true;
    v.srcObject = event.stream; //assigning stream to the video element
    v.width = "400";
    v.height = "200";
    v.controls = true;
    v.class = "videoInsert";
    v.style = "display:block; margin: 0 auto; width: 50% !important; height: 70% !important; position: relative";
    v.setAttribute('playsInline', '');

    console.log('(ScreenAnswer)remote stream:  of ' + client.id + ' is: ', remoteStream);
  }

  function handleScreenAnswerRemoteStreamRemoved(event) {
    console.log('(ScreenAnswer)Remote stream removed. Event: ', event);
  }

  return pc;
}

// var screenAnswerChannel = client.subscribe('screenAnswer');
//
// screenAnswerChannel.on('subscribeFail', function(err) {
//   console.log('Failed to subscribe to the screenAnswer channel due to error: ' + err);
// });
//
// screenAnswerChannel.watch(function(data) {
//
//   if (data.to === client.id) {
//     for (var i = 0; i < clientsData.length; i++) {
//       if (clientsData[i] == data.from) {
//         console.log('this offer belongs to pc[', i, '] ', spc[i], ' of ', clientsList[i]);
//         spc[i].setRemoteDescription(new RTCSessionDescription(data.data));
//       }
//     }
//     console.log('screenAnswer if case', data);
//   } else {
//     console.log('screenAnswer else case ', data);
//   }
// });
//
// var screenIceAnswerChannel = client.subscribe('screenIceAnswer');
//
// screenIceAnswerChannel.on('subscribeFail', function(err) {
// console.log('Failed to subscribe to the screenIceAnswer channel due to error: ' + err);
// });
//
// screenIceAnswerChannel.watch(function(data) {
//
// if (data.to === client.id) {
//   for (var i = 0; i < clientsData.length; i++) {
//     if (clientsData[i] == data.from) {
//       console.log('screenIceAnswer if case ', data);
//       //pc1 = createAnswerPeerConnection(data);
//       var candidate = new RTCIceCandidate({
//         sdpMLineIndex: data.label,
//         candidate: data.candidate
//       });
//       spc[i].addIceCandidate(candidate);
//     }
//   }
// } else {
//   console.log('screenIceAnswer else case ', data);
// }
// });

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
clientsListBroadcastChannel.on('subscribeFail', function(err) {
  console.log('Failed to subscribe to the clientsListBroadcast channel due to error: ' + err);
});
clientsListBroadcastChannel.watch(function(data) {
  console.log('clientsListBroadcastChannel data is ', data);
  clientsData = data;
});

var clientsDisconnectChannel = client.subscribe('clientsDisconnect');
clientsDisconnectChannel.on('subscribeFail', function(err) {
  console.log('Failed to subscribe to the clientsDisconnect channel due to error: ' + err);
});
clientsDisconnectChannel.watch(function(data) {
  console.log('clientsDisconnectChannel data is ', data);
  clientsData = data;
});

var clientsConnectedChannel = client.subscribe('clientsConnected');
clientsConnectedChannel.on('subscribeFail', function(err) {
  console.log('Failed to subscribe to the clientsConnected channel due to error: ' + err);
});
clientsConnectedChannel.watch(function(data) {
  console.log('clientsConnectedChannel data is ', data);
  //clientsData = data;
});

var removeVideoChannel = client.subscribe('removeVideo');
removeVideoChannel.on('subscribeFail', function(err) {
  console.log('Failed to subscribe to the removeVideo channel due to error: ' + err);
});
removeVideoChannel.watch(function(data) {
  console.log('removeVideoChannel data is ', data);
  //client.emit('chat', data +' got disconnected');
  document.getElementById(data).remove();
});

client.on('created', function(room) {
  console.log('created room ', room);
  isInitiator = true;
});

client.on('askClientToSubscribe', function(room) {
  chatChannel = client.subscribe(room);
  chatChannel.on('subscribeFail', function(err) {
    console.log('Failed to subscribe to hello channel due to error: ', err);
  });

  chatChannel.watch(function(room) {
    console.log('watch result s: ', room);
  });
});

client.on('full', function(room) {
  console.log('Room ' + room + ' is full');
});

//// 2nd client -> server  emits 'join' and 'joined'//client.on('join')/////////
var joinChannel = client.subscribe('join');

joinChannel.on('subscribeFail', function(err) {
  console.log('Failed to subscribe to the join channel due to error: ' + err);
});

joinChannel.watch(function(data) {
  var roomid = data.room;
  if (data.id === client.id) {

    // console.log('id s are equal');
  } else {
    console.log('another peer made a request to join room ' + roomid);
    console.log('This peer is the initiator of a room ', roomid);
    isChannelReady = true;
  }
});

client.on('joined', function(clients) {
  console.log('joined: ', clients);
  client.emit('chat', name + ' joined ');
  isNew = true;
  clientsData = clients;
  clientsListBroadcastChannel.publish(clientsData);
  for (var i = 0; i < clients.length; i++) {
    console.log(clients[i]);
    if (clients[i] == client.id) {
      console.log(client.id, ' hello');
    } else {

    }
  }
  isChannelReady = true;
});

/////////////////////offerChannel//////////////////////////////////////////////

var offerChannel = client.subscribe('offer');

offerChannel.on('subscribeFail', function(err) {
console.log('Failed to subscribe to the offer channel due to error: ' + err);
});

offerChannel.watch(function(data) {

if (data.to === client.id) {
  console.log('offer if case ', data.data.type);
  pc1 = createAnswerPeerConnection(data);

} else {
  console.log('offer else case ', data);
}
});

////////////////////////answerChannel/////////////////////////////////////

var answerChannel = client.subscribe('answer');

answerChannel.on('subscribeFail', function(err) {
console.log('Failed to subscribe to the Answer channel due to error: ' + err);
});

answerChannel.watch(function(data) {

if (data.to === client.id) {
  for (var i = 0; i < clientsData.length; i++) {
    if (clientsData[i] == data.from) {
      console.log('this offer belongs to pc[', i, '] ', pc[i], ' of ', clientsData[i]);
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

iceOfferChannel.on('subscribeFail', function(err) {
console.log('Failed to subscribe to the iceOffer channel due to error: ' + err);
});

iceOfferChannel.watch(function(data) {

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

iceAnswerChannel.on('subscribeFail', function(err) {
console.log('Failed to subscribe to the iceAnswer channel due to error: ' + err);
});

iceAnswerChannel.watch(function(data) {

if (data.to === client.id) {
  for (var i = 0; i < clientsData.length; i++) {
    if (clientsData[i] == data.from) {
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
    localScreen[i].style = "display:block; margin: 0 auto; width: 50% !important; height: 70% !important; position: relative";
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

msgChannel.on('subscribeFail', function(err) {
  console.log('Failed to subscribe to the msg channel due to error: ' + err);
});

msgChannel.watch(function(data) {
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
  if (typeof localStream !== 'undefined' && isNew) {
    offer();
    for (var i = 0; i < clientsData.length; i++) {
      if (clientsData[i] === client.id) {
        //console.log('own id');
      } else {
        console.log('sd for pc[', i, '] is', pc[i].localDescription);
      }

    }
  }
}

window.onbeforeunload = function() {
  sendMessage('bye');
};

///////////////////////////////offer()/////////////////////////////////////////

function offer() {
  console.log('clientsData.length ', clientsData.length);
  for (var i = 0; i < clientsData.length; i++) {
    if (clientsData[i] === client.id) {
      //console.log('own id');
    } else {
      //clientsList[i]
      console.log('>>>>>> creating peer connection ', i);
      pc[i] = createOfferPeerConnection(clientsData[i]);
    }
  }
}

////////////////createOfferPeerConnection(()////////////////////////////////////

function createOfferPeerConnection(clientID) {
  try {
    var pc = new RTCPeerConnection(pc_config, pc_constraints);
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
  pc.createOffer(function(offer) {
    // Set Opus as the preferred codec in SDP if Opus is present.
    //  sessionDescription.sdp = preferOpus(sessionDescription.sdp);
    console.log('pc[ ]', pc);
    pc.setLocalDescription(offer);
    console.log('setLocalDescription for offer ', offer, ' id ', clientID);
    client.emit('offer', {
      data: offer,
      from: client.id,
      to: clientID
    });
    //sendMessage(sessionDescription);
  }, function(err) {
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
        from: client.id,
        to: clientID
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
    localScreen[i].style = "display:block; margin: 0 auto; width: 50% !important; height: 70% !important; position: relative";
    localScreen[i].setAttribute('playsInline', '');
    var div = document.createElement("div");
    div.id = clientID;
    div.className = i;
    div.appendChild(localScreen[i]);

    document.getElementById("webcamDiv").appendChild(div);
    i = i + 1;

    console.log('(Offer) remote stream:  of ' + client.id + ' is: ', remoteStream);
  }

  function handleOfferRemoteStreamRemoved(event) {
    console.log('(Offer) Remote stream removed. Event: ', event);
  }

  return pc;
}

////////////////createAnswerPeerConnection(()//////////////////////////////////

function createAnswerPeerConnection(data) {
  try {
    var pc = new RTCPeerConnection(pc_config, pc_constraints);
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
  pc.createAnswer(function(answer) {
    // Set Opus as the preferred codec in SDP if Opus is present.
    //  sessionDescription.sdp = preferOpus(sessionDescription.sdp);
    pc.setLocalDescription(answer);
    console.log('answer', answer, ' id ', data);
    client.emit('answer', {
      data: answer,
      from: data.to,
      to: data.from
    });
  }, function(err) {
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
        from: client.id,
        to: data.from
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
    localScreen[i].style = "display:block; margin: 0 auto; width: 50% !important; height: 70% !important; position: relative";
    localScreen[i].setAttribute('playsInline', '');

    var div = document.createElement("div");
    div.id = data.from;
    div.className = i;
    div.appendChild(localScreen[i]);

    document.getElementById("webcamDiv").appendChild(div);
    i = i + 1;

    console.log('(Answer)remote stream:  of ' + client.id + ' is: ', remoteStream);
  }

  function handleAnswerRemoteStreamRemoved(event) {
    console.log('(Answer)Remote stream removed. Event: ', event);
  }

  return pc;
}
///////////////////////////////////////////////////////////////////////////////
