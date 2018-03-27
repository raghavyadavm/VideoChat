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

navigator.getUserMedia = navigator.mozGetUserMedia || navigator.webkitGetUserMedia;

/////////////////////////////////////////////

var room = 'foo';
var client = socketCluster.connect();
console.log(client);

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
  clientsList = data;
});

var clientsDisconnectChannel = client.subscribe('clientsDisconnect');
clientsDisconnectChannel.on('subscribeFail', function(err) {
  console.log('Failed to subscribe to the clientsDisconnect channel due to error: ' + err);
});
clientsDisconnectChannel.watch(function(data) {
  console.log('clientsDisconnectChannel data is ', data);
  clientsList = data;
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
    console.log('watch results: ', room);
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
  }

  isChannelReady = true;
});


//////////////////////////////////////////////////////////////////////////////
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

//////////////////////////////////////////////////////////////////////////////
var answerChannel = client.subscribe('answer');

answerChannel.on('subscribeFail', function (err) {
 console.log('Failed to subscribe to the offer channel due to error: ' + err);
});

answerChannel.watch(function (data) {

  if (data.to === client.id) {
    for (var i = 0; i < clientsList.length-1; i++) {
      if (clientsList[i] == data.from ) {
        console.log('this offer belongs to pc[',i,'] ',pc[i], ' of ', clientsList[i]);
        pc[i].setRemoteDescription(new RTCSessionDescription(data.data));
      }
    }
    console.log('answer if case', data);
  } else {
    console.log('answer else case ', data);
  }
});

//////////////////////////////////////////////////////////////////////////////
var iceOfferChannel = client.subscribe('iceOffer');

iceOfferChannel.on('subscribeFail', function (err) {
 console.log('Failed to subscribe to the iceOffer channel due to error: ' + err);
});

iceOfferChannel.watch(function (data) {

  if (data.to === client.id) {
    console.log('iceOffer if case ', data);
    //pc1 = createAnswerPeerConnection(data);
    var candidate = new RTCIceCandidate({
        sdpMLineIndex: data.label,
        candidate: data.candidate
    });
    pc1.addIceCandidate(candidate);

  } else {
    console.log('iceOffer else case ', data);
  }
});

//////////////////////////////////////////////////////////////////////////////
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
  var localVideo = document.querySelector('#localVideo');

  var constraints = {
    video: true,
    audio: true
  };

  navigator.mediaDevices.getUserMedia(constraints)
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
  }
  console.log('Getting user media with constraints', constraints);
}

////////////////////offer()/////////////////////////////////////////

function offer() {
  console.log('clientsList.length ',clientsList.length);
  for (var i = 0; i < clientsList.length-1; i++) {
    //clientsList[i]
    console.log('>>>>>> creating peer connection ',i);
    pc[i] = createOfferPeerConnection(clientsList[i]);

  }
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

////////////////////////////////////////////////////////////////////////////////
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

/////////////////////////////////////////////////////////

function createOfferPeerConnection(clientID) {
  try {
    var pc  = new RTCPeerConnection(pc_config, pc_constraints);
    pc.onicecandidate = handleOfferIceCandidate;
    pc.onaddstream = handleOfferRemoteStreamAdded;
    pc.onremovestream = handleOfferRemoteStreamRemoved;
    console.log('Created offer RTCPeerConnnection ', pc);
    //return pc;
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
    //console.log('icecandidate event: ', event);
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
    var x = document.createElement("video");
    x.autoplay = true;
    x.controls = true;
    x.setAttribute('playsInline', '');
    x.src = window.URL.createObjectURL(event.stream);
    remoteStream = event.stream;
    var td = document.createElement("td");
    td.id = clientID;
    td.appendChild(x);
    document.getElementById("videoTable").appendChild(td);
    console.log('(Offer) remote stream:  of '+client.id+' is: ',remoteStream);
  }

  function handleOfferRemoteStreamRemoved(event) {
    console.log('(Offer) Remote stream removed. Event: ', event);
  }

  return pc;
}

function createAnswerPeerConnection(data) {
  try {
    var pc  = new RTCPeerConnection(null);
    pc.onicecandidate = handleAnswerIceCandidate;
    pc.onaddstream = handleAnswerRemoteStreamAdded;
    pc.onremovestream = handleAnswerRemoteStreamRemoved;
    console.log('Created Answer RTCPeerConnnection ', pc);
    //return pc;
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
    //console.log('pc[ ]',pc);
    pc.setLocalDescription(answer);
    console.log('answer', answer, ' id ', data);
    client.emit('answer', {data:answer, from:data.to, to:data.from});
    //sendMessage(sessionDescription);
  }, function (err) {
      console.log('error', err);
  });

  function handleAnswerIceCandidate(event) {
    //console.log('icecandidate event: ', event);
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

    var x = document.createElement("video");
    x.autoplay = true;
    x.controls = true;
    x.setAttribute('playsInline', '');
    x.src = window.URL.createObjectURL(event.stream);
    remoteStream = event.stream;

    var td = document.createElement("td");
    td.id = data.from;
    td.appendChild(x);

    document.getElementById("videoTable").appendChild(td);

    console.log('(Answer)remote stream:  of '+client.id+' is: ',remoteStream);
  }

  function handleAnswerRemoteStreamRemoved(event) {
    console.log('(Answer)Remote stream removed. Event: ', event);
  }

  return pc;
}
