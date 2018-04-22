var isChannelReady = false;
var isInitiator = false;
var isStarted = false;
var isNew = false;
var localStream, remoteStream, screenShareStream;
var pc = [];
var pc1;
var clientsList = [];
var chatChannel;
var clientsData = [];
var events = [];
var screenFlag = false;

//STUN server configuration
var pc_config = {
  'iceServers': [   
    {
      'urls': 'stun:eskns.com:19302',
    },
    {
      'urls':'turn:eskns.com:19302?transport=udp',
      'username': 'raghav',
      'credential': 'TOTAL-quota-parameter'
    }
  ]//,
  //"iceTransportPolicy":"relay" 
};

var pc_constraints = {
  'optional': [{
    'DtlsSrtpKeyAgreement': true
  }]
};

// Set up audio and video regardless of what devices are present.
var sdpConstraints = {
  offerToReceiveAudio: true,
  offerToReceiveVideo: true,
  iceRestart: true
};

// Parse a candidate:foo string into an object, for easier use by other methods.
function parseCandidate(text) {
  var candidateStr = 'candidate:';
  var pos = text.indexOf(candidateStr) + candidateStr.length;
  var [foundation, component, protocol, priority, address, port, , type] =
    text.substr(pos).split(' ');
  return {
    'component': component,
    'type': type,
    'foundation': foundation,
    'protocol': protocol,
    'address': address,
    'port': port,
    'priority': priority
  };
}

// Older browsers might not implement mediaDevices at all, so we set an empty object first
if (navigator.mediaDevices === undefined) {
  navigator.mediaDevices = {};
}

// Some browsers partially implement mediaDevices. We can't just assign an object
// with getUserMedia as it would overwrite existing properties.
// Here, we will just add the getUserMedia property if it's missing.
if (navigator.mediaDevices.getUserMedia === undefined) {
  navigator.mediaDevices.getUserMedia = function(constraints) {

    // First get ahold of the legacy getUserMedia, if present
    var getUserMedia = navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

    // Some browsers just don't implement it - return a rejected promise with an error
    // to keep a consistent interface
    if (!getUserMedia) {
      return Promise.reject(new Error('getUserMedia is not implemented in this browser'));
    }

    // Otherwise, wrap the call to the old navigator.getUserMedia with a Promise
    return new Promise(function(resolve, reject) {
      getUserMedia.call(navigator, constraints, resolve, reject);
    });
  }
}

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
console.log('screen share clients ', clientsData);

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
    //screenshareOffer(stream);
    var screenFlag = true;
    offer(stream, screenFlag);

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
////////////////////chat functions////////////////////////////////////

document.getElementById('Submit').onclick = function() {
  if (document.getElementById("message").value != '') {
    client.emit('chat', (name + " : " + document.getElementById("message").value));
  }

  document.getElementById("message").value = ''
  return false;
}

var chatChannel = client.subscribe('yell');

chatChannel.on('subscribeFail', function(err) {
  console.log('Failed to subscribe to Yell channel due to error: ' + err);
});

chatChannel.watch(function(data) {
  let newData = anchorme(data,{
    attributes:[
      {
        name:"target",
        value:"_blank"
      }
    ],
    truncate: 20
  });
  var ul = document.getElementById("messages-list");
  var li = document.createElement("li");
  li.innerHTML= newData;
  ul.appendChild(li);
});

///////////////////////////////////////////////////////////////////////////////
var room = 'foo';

if (room !== '') {
  client.emit('create or join', room);
  getMediaStream();
  console.log('Attempted to create or join room: ', room);
}

var clientsDisconnectChannel = client.subscribe('clientsDisconnect');
clientsDisconnectChannel.on('subscribeFail', function(err) {
  console.error('Failed to subscribe to the clientsDisconnect channel due to error: ' + err);
});
clientsDisconnectChannel.watch(function(data) {
  console.log('clientsDisconnectChannel data is ');
  console.table(data);
  clientsData = data;
});

var clientsConnectedChannel = client.subscribe('clientsConnected');
clientsConnectedChannel.on('subscribeFail', function(err) {
  console.error('Failed to subscribe to the clientsConnected channel due to error: ' + err);
});
clientsConnectedChannel.watch(function(data) {
  console.log('clientsConnectedChannel data is ');
  console.table(data);
  clientsData = data;
});

var removeVideoChannel = client.subscribe('removeVideo');
removeVideoChannel.on('subscribeFail', function(err) {
  console.error('Failed to subscribe to the removeVideo channel due to error: ' + err);
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
    console.error('Failed to subscribe to hello channel due to error: ', err);
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
  console.error('Failed to subscribe to the join channel due to error: ' + err);
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
  //clientsListBroadcastChannel.publish(clientsData);
  for (var i = 0; i < clients.length; i++) {
    console.log(clients[i]);
    if (clients[i] == client.id) {
      console.log(client.id, ' hello');
    } else {

    }
  }
  isChannelReady = true;
});

///////////////////activeVoice()////////////////////////////////////////////////

function activeVoice(stream, div) {
  var speechEvents = hark(stream, {});
  speechEvents.on('speaking', function() {
    // console.log('speaking');
    div.style.border="3px solid yellow";      
  });

  speechEvents.on('stopped_speaking', function() {
    // console.log('stopped_speaking');
    div.style.border="3px solid black";
  });
}

//////////////////////setVideo()///////////////////

function setVideo(stream, clientID){
  var video = document.createElement("video");
  video.autoplay = true;
  video.id = 'video';
  video.controls = true;
  video.class = "videoInsert";
  video.setAttribute('playsInline', '');
  video.style = 'width: 100%;height: 100%;';
  video.srcObject = stream;

  var div = document.createElement("div");
  div.id = clientID;
  div.className = 'videoDiv';
  div.appendChild(video);

  activeVoice(stream, div);

  document.getElementById("webcamDiv").appendChild(div);
}

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
    var video = document.createElement("video");
    video.autoplay = true;
    video.srcObject = stream; //assigning stream to the video element
    video.id = 'video';
    video.controls = true;
    video.muted = true;
    video.class = "videoInsert";
    video.style = 'width: 100%;height: 100%;';
    video.setAttribute('playsInline', ''); 

    var div = document.createElement("div");
    div.id = 'local';
    div.className = 'videoDiv';
    div.appendChild(video);

    document.getElementById("webcamDiv").appendChild(div);
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
    errorMsg('getUserMedia error: ' + error.name, error);
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

function maybeStart() {
  console.log('>>>>>>> maybeStart() ', localStream, isNew);
  if (typeof localStream !== 'undefined' && isNew) {
    var screenFlag = false;
    offer(localStream, screenFlag);
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

///////////////////////////////offer()////////////////////////////////////

function offer(stream, screenFlag) {
  console.log('clientsData.length ', clientsData.length);
  for (var i = 0; i < clientsData.length; i++) {
    if (clientsData[i] === client.id) {
      //console.log('own id');
    } else {
      //clientsList[i]
      console.log('>>>>>> creating peer connection for ', clientsData[i], ' by ', client.id);
      pc[i] = createOfferPeerConnection(clientsData[i], stream, screenFlag);
    }
  }
}

////////////////createOfferPeerConnection(()////////////////////////////////////

function createOfferPeerConnection(clientID, stream, screenFlag) {
  try {
    var pc = new RTCPeerConnection(pc_config, pc_constraints);
    
    pc.onicecandidate = function (event) {
      console.log('offer - onicecandidate event is triggered ', event);
      if (event.candidate) {
        var c = parseCandidate(event.candidate.candidate);
        console.table(c);
        client.emit('iceOffer', {
          type: 'candidate',
          label: event.candidate.sdpMLineIndex,
          id: event.candidate.sdpMid,
          candidate: event.candidate.candidate,
          from: client.id,
          to: clientID
        });
      } else {
        console.info('%c End of candidates Answer.', 'background: green; color: white; display: block;');
      }
    };

    //pc.oniceconnectionstatechange = handleOfferIceCandidateStateChange;

    pc.ontrack = function (event) {
      events.push(event);
  
      if (event.track.kind === "video") {
        console.log('(Offer) Remote stream added.');  

        remoteStream = event.streams[0];
        if(!screenFlag) {
          setVideo(event.streams[0], clientID);      
        }
        console.log('(Offer) remote stream:  of ' + client.id + ' is: ', remoteStream);
      }
    };

    console.log('Created offer RTCPeerConnnection ', pc, ' for ', clientID);
  } catch (e) {
    console.error('Failed to create offer PeerConnection for ', clientID, 'exception: ' + e.message);
    alert('Cannot create offer RTCPeerConnection object for ', clientID);
    return;
  }

  stream.getTracks().forEach(
    function(track) {
      pc.addTrack(
        track,
        stream
      );
    }
  );

  pc.createOffer().then(function(offerdata){   
    console.log('pc[ ] ', pc, ' for ', clientID);
    pc.setLocalDescription(offerdata);
    console.log('setLocalDescription for offer ', offerdata, ' id ', clientID);
    console.table(offerdata);
    client.emit('offer', {
      data: offerdata,
      screenFlag: screenFlag,
      from: client.id,
      to: clientID
    });
  })
  .catch(function(reason){
    console.error('error ', reason);
  });  

  function handleOfferIceCandidateStateChange(event) {
    if (pc.iceConnectionState === "failed") {

    } 
    if(pc.iceConnectionState === "disconnected") {

    } 
    if(pc.iceConnectionState === "closed") {
      // Handle the failure
    }  
  };
  return pc;
}

/////////////////////offerChannel//////////////////////////////////////////////

var offerChannel = client.subscribe('offer');

offerChannel.on('subscribeFail', function(err) {
console.error('Failed to subscribe to the offer channel due to error: ' + err);
});

offerChannel.watch(function(data) {

if (data.to === client.id) {
  console.log('offer if case ', data.data.type);
  pc1 = createAnswerPeerConnection(data);

} else {
  console.log('offer else case ', data);
}
});

////////////////createAnswerPeerConnection(()//////////////////////////////////

function createAnswerPeerConnection(data) {
  try {
    console.log('answer data is ', data);
    var pc = new RTCPeerConnection(pc_config, pc_constraints);   

    pc.onicecandidate = function (event) {
      console.log('answer - onicecandidate event is triggered ', event);
      if (event.candidate) {
        var c = parseCandidate(event.candidate.candidate);
        console.table(c);
        client.emit('iceAnswer', {
          type: 'candidate',
          label: event.candidate.sdpMLineIndex,
          id: event.candidate.sdpMid,
          candidate: event.candidate.candidate,
          from: client.id,
          to: data.from
        });
      } else {
        console.info('%c End of candidates Answer.', 'background: green; color: white; display: block;');
      }
    };

    pc.ontrack = function (event) {

      events.push(event);
  
      if (event.track.kind === "video") {
        console.log('(Answer)Remote stream added.');
        remoteStream = event.streams[0];
        if (data.screenFlag) {
          var v = document.getElementById("screenshareVideo");
          v.autoplay = true;
          v.srcObject = event.streams[0]; //assigning stream to the video element
          v.controls = true;
          v.setAttribute('playsInline', '');
          console.log('(ScreenAnswer)remote stream:  of ' + client.id + ' is: ', remoteStream);
        } else {
          setVideo(event.streams[0], data.from);
          console.log('(Answer)remote stream:  of ' + client.id + ' is: ', remoteStream);
        }        
      }
    };    
    console.log('Created Answer RTCPeerConnnection ', pc, ' for ', data.from);
  } catch (e) {
    console.error('Failed to create Answer PeerConnection,for ', data.from, ' exception: ' + e.message);
    alert('Cannot create Answer RTCPeerConnection object.');
    return;
  }

  localStream.getTracks().forEach(
    function(track) {
      pc.addTrack(
        track,
        localStream
      );
    }
  );

  pc.setRemoteDescription(new RTCSessionDescription(data.data));

  pc.createAnswer().then(function(answerdata){
    // Set Opus as the preferred codec in SDP if Opus is present.
    //  sessionDescription.sdp = preferOpus(sessionDescription.sdp);
    console.log('pc[ ] ', pc, ' for ', data.from);
    pc.setLocalDescription(answerdata);
    console.log('setLocalDescription for answer ', answerdata, ' id ', data.from);
    client.emit('answer', {
      data: answerdata,
      from: data.to,
      to: data.from
    });
  }).catch(function(reason) {
    console.error('error ', reason);
  });
  return pc;
}

////////////////////////answerChannel/////////////////////////////////////

var answerChannel = client.subscribe('answer');

answerChannel.on('subscribeFail', function(err) {
console.error('Failed to subscribe to the Answer channel due to error: ' + err);
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
console.error('Failed to subscribe to the iceOffer channel due to error: ' + err);
});

iceOfferChannel.watch(function(data) {

if (data.to === client.id) {
  console.log('iceOffer if case ', data);
  var candidate = new RTCIceCandidate({
    sdpMLineIndex: data.label,
    candidate: data.candidate
  });
  pc1.addIceCandidate(candidate).then(_=>{
    // Do stuff when the candidate is successfully passed to the ICE agent
  }).catch(e=>{
    console.log("Error: Failure during iceOffer addIceCandidate()");
  });

} else {
  console.log('iceOffer else case ', data);
}
});

///////////////////////////iceAnswerChannel////////////////////////////////

var iceAnswerChannel = client.subscribe('iceAnswer');

iceAnswerChannel.on('subscribeFail', function(err) {
  console.error('Failed to subscribe to the iceAnswer channel due to error: ' + err);
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
        pc[i].addIceCandidate(candidate).then(_=>{
          // Do stuff when the candidate is successfully passed to the ICE agent
        }).catch(e=>{
          console.log("Error: Failure during iceAnswer addIceCandidate()");
        });
      }
    }
  } else {
    console.log('iceAnswer else case ', data);
  }
});
/////////////////////////////////////////////////////////////////////