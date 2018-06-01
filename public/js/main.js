var isChannelReady = false;
var isInitiator = false;
var isStarted = false;
var isNew = false;
var localStream,
  remoteStream,
  screenShareStream;
var off = [];
var ans = {};
var clientsList = [];
var chatChannel;
var clientsData = [];
var events = [];
var screenFlag = false;
var receiveBuffer = [];
var receivedSize = 0;

var bytesPrev = 0;
var timestampPrev = 0;
var timestampStart;
var statsInterval = null;
var bitrateMax = 0;
var broadcastfile, file;
var sendProgress = document.querySelector('progress#progressbar');
var ul = document.getElementById('messages-list');

//STUN server configuration
var pc_config = {
  iceServers: [
    {
      urls: 'turn:eskns.com:19302?transport=udp',
      username: 'raghav',
      credential: 'TOTAL-quota-parameter'
    }
  ] //,
  //"iceTransportPolicy":"relay"
};

//Enable DTLS for peerconnection
var pc_constraints = {
  optional: [
    {
      DtlsSrtpKeyAgreement: true
    }
  ]
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
  var [foundation,
    component,
    protocol,
    priority,
    address,
    port,,
    type] = text
    .substr(pos)
    .split(' ');
  return {
    component: component,
    type: type,
    foundation: foundation,
    protocol: protocol,
    address: address,
    port: port,
    priority: priority
  };
}

// Older browsers might not implement mediaDevices at all, so we set an empty
// object first
if (navigator.mediaDevices === undefined) {
  navigator.mediaDevices = {};
}

// Some browsers partially implement mediaDevices. We can't just assign an
// object with getUserMedia as it would overwrite existing properties. Here, we
// will just add the getUserMedia property if it's missing.
if (navigator.mediaDevices.getUserMedia === undefined) {
  navigator.mediaDevices.getUserMedia = function (constraints) {
    // First get ahold of the legacy getUserMedia, if present
    var getUserMedia = navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

    // Some browsers just don't implement it - return a rejected promise with an
    // error to keep a consistent interface
    if (!getUserMedia) {
      return Promise.reject(new Error('getUserMedia is not implemented in this browser'));
    }

    // Otherwise, wrap the call to the old navigator.getUserMedia with a Promise
    return new Promise(function (resolve, reject) {
      getUserMedia.call(navigator, constraints, resolve, reject);
    });
  };
}

///////////////////////////////////////////////////////////////////////////////
var name = prompt('Enter your name');
console.log('your name is ', name);

var client = socketCluster.connect();
// client connecting to server var client = socketCluster.connect({   hostname:
// 'localhost',   secure: true,   port: 8004,   rejectUnauthorized: false //
// Only necessary during debug if using a self-signed certificate });
console.log(client);
console.log('screen share clients ', clientsData);

///////////////////////screenShare())/////////////////////////////////
let screen_constraints;

document
  .getElementById('capture-screen')
  .onclick = function () {
  screen_constraints = {
    video: {
      mozMediaSource: 'window',
      mediaSource: 'window'
    }
  };

  function handleScreenSuccess(stream) {
    document
      .getElementById('screenshareVideo')
      .srcObject = stream;
    screenShareStream = stream;
    var screenFlag = true;
    offer(stream, screenFlag);

    stream.oninactive = stream.onended = function () {
      document
        .getElementById('screenshareVideo')
        .srcObject = null;
    };
  }

  function handleScreenError(error) {
    console.error('getScreenId error', error);
    alert('Failed to capture your screen.');
  }
  navigator
    .mediaDevices
    .getUserMedia(screen_constraints)
    .then(handleScreenSuccess)
    .catch(handleScreenError);
};
/////////////////////////////////////////////////////////////////////////////
var room = 'foo';

if (room !== '') {
  client.emit('create or join', room);
  getMediaStream();
  console.log('Attempted to create or join room: ', room);
}

var clientsDisconnectChannel = client.subscribe('clientsDisconnect');
clientsDisconnectChannel.on('subscribeFail', function (err) {
  console.error('Failed to subscribe to the clientsDisconnect channel due to error: ' + err);
});
clientsDisconnectChannel.watch(function (data) {
  console.log('clientsDisconnectChannel data is ');
  console.table(data);
  clientsData = data;
});

var clientsConnectedChannel = client.subscribe('clientsConnected');
clientsConnectedChannel.on('subscribeFail', function (err) {
  console.error('Failed to subscribe to the clientsConnected channel due to error: ' + err);
});
clientsConnectedChannel.watch(function (data) {
  console.log('clientsConnectedChannel data is ');
  console.table(data);
  clientsData = data;
});

var removeVideoChannel = client.subscribe('removeVideo');
removeVideoChannel.on('subscribeFail', function (err) {
  console.error('Failed to subscribe to the removeVideo channel due to error: ' + err);
});
removeVideoChannel.watch(function (data) {
  console.log('removeVideoChannel data is ', data);
  document
    .getElementById(data)
    .remove();
});

client.on('created', function (room) {
  console.log('created room ', room);
  // isInitiator = true;
});

client.on('askClientToSubscribe', function (room) {
  chatChannel = client.subscribe(room);
  chatChannel.on('subscribeFail', function (err) {
    console.error('Failed to subscribe to hello channel due to error: ', err);
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
  console.error('Failed to subscribe to the join channel due to error: ' + err);
});

joinChannel.watch(function (data) {
  var roomid = data.room;
  if (data.id === client.id) {
    // console.log('id s are equal');
  } else {
    console.log('another peer made a request to join room ' + roomid);
    console.log('This peer is the initiator of a room ', roomid);
    isChannelReady = true;
  }
});

client.on('joined', function (clients) {
  console.log('joined: ', clients);
  // client.emit('chat', name + ' joined ');
  isNew = true;
  clientsData = clients;
  //clientsListBroadcastChannel.publish(clientsData);
  for (var i = 0; i < clients.length; i++) {
    console.log(clients[i]);
    if (clients[i] == client.id) {
      console.log(client.id, ' hello');
    } else {}
  }
  isChannelReady = true;
});

///////////////////activeVoice()////////////////////////////////////////////////

function activeVoice(stream, div) {
  var speechEvents = hark(stream, {});
  speechEvents.on('speaking', function () {
    // console.log('speaking');
    div.style.border = '3px solid yellow';
  });

  speechEvents.on('stopped_speaking', function () {
    // console.log('stopped_speaking');
    div.style.border = '3px solid black';
  });
}

//////////////////////setVideo()///////////////////

function setVideo(stream, clientID) {
  var video = document.createElement('video');
  video.autoplay = true;
  video.id = 'video';
  video.controls = true;
  video.class = 'videoInsert';
  video.setAttribute('playsInline', '');
  video.style = 'width: 100%;height: 100%;';
  video.srcObject = stream;

  var div = document.createElement('div');
  div.id = clientID;
  div.className = 'videoDiv';
  div.appendChild(video);

  activeVoice(stream, div);

  document
    .getElementById('webcamDiv')
    .appendChild(div);
}

//////////////////getUserMedia()///////////////////

function getMediaStream() {
  console.log('media stream');
  var constraints = (window.constraints = {
    audio: true,
    video: {
      facingMode: 'user',
      mirrored: true
    }
  });

  function handleSuccess(stream) {
    console.log('Adding local stream.');
    var videoTracks = stream.getVideoTracks();
    console.log('Got stream with constraints:', constraints);
    console.log('Using video device: ' + videoTracks[0].label);
    stream.oninactive = function () {
      console.log('Stream inactive');
    };
    window.stream = stream; // make variable available to browser console

    //create a video element and add it to the DOM
    var video = document.createElement('video');
    video.autoplay = true;
    video.srcObject = stream; //assigning stream to the video element
    video.id = 'video';
    video.controls = true;
    video.muted = true;
    video.class = 'videoInsert';
    video.style = 'width: 100%;height: 100%;';
    video.setAttribute('playsInline', '');

    var div = document.createElement('div');
    div.id = 'local';
    div.className = 'videoDiv';
    div.appendChild(video);

    document
      .getElementById('webcamDiv')
      .appendChild(div);
    localStream = stream;

    sendMessage('got user media');
  }

  function handleError(error) {
    if (error.name === 'ConstraintNotSatisfiedError') {
      errorMsg('The resolution ' + constraints.video.width.exact + 'x' + constraints.video.width.exact + ' px is not supported by your device.');
    } else if (error.name === 'PermissionDeniedError') {
      errorMsg('Permissions have not been granted to use your camera and microphone, you need to' +
          ' allow the page access to your devices in order for the demo to work.');
    }
    errorMsg('getUserMedia error: ' + error.name, error);
  }

  function errorMsg(msg, error) {
    console.log('<p>' + msg + '</p>');
    if (typeof error !== 'undefined') {
      console.error(error);
    }
  }

  navigator
    .mediaDevices
    .getUserMedia(constraints)
    .then(handleSuccess)
    .catch(handleError);

  console.log('Getting user media with constraints', constraints);
}

//////////////////sendMessage()///////////////////

function sendMessage(message) {
  if (message.type === 'candidate') {} else {
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
  } else {}
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
        console.log('sd for off[', clientsData[i], '] is', off[clientsData[i]]);
      }
    }
  }
}

window.onbeforeunload = function () {
  sendMessage('bye');
};
// /////////////////////////////offer()////////////////////////////////////

function offer(stream, screenFlag) {
  console.log('clientsData.length ', clientsData.length);
  for (var i = 0; i < clientsData.length; i++) {
    if (clientsData[i] === client.id) {
      //console.log('own id');
    } else {
      //clientsList[i]
      console.log('>>>>>> creating peer connection for ', clientsData[i], ' by ', client.id);
      off[clientsData[i]] = createOfferPeerConnection(clientsData[i], stream, screenFlag);
    }
  }
}

////////////////createOfferPeerConnection(()////////////////////////////////////

function createOfferPeerConnection(clientID, stream, screenFlag) {
  try {
    var pc = new RTCPeerConnection(pc_config, pc_constraints);
    var dc;
    try {
      // Note: SCTP-based reliable DataChannels supported in Chrome 29+ ! use
      // {reliable: false} if you have an older version of Chrome
      dc = pc.createDataChannel("sendDataChannel", {reliable: true});
      console.log('Created reliable send data channel', dc);

      // Associate handlers with data channel events
      dc.onopen = handleSendChannelStateChange;
      dc.onmessage = handleMessage;
      dc.onclose = handleSendChannelStateChange;
      dc.binaryType = 'arraybuffer';
    } catch (e) {
      alert('Failed to create data channel!');
      console.log('createDataChannel() failed with following message: ' + e.message);
    }

    isInitiator = true;

    // Handler for either 'open' or 'close' events on sender's data channel
    function handleSendChannelStateChange() {
      var readyState = dc.readyState;
      console.log('dc channel state is: ' + readyState);
    }

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

      if (event.track.kind === 'video') {
        console.log('(Offer) Remote stream added.');

        remoteStream = event.streams[0];
        if (!screenFlag) {
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

  stream
    .getTracks()
    .forEach(function (track) {
      pc.addTrack(track, stream);
    });

  pc
    .createOffer()
    .then(function (offerdata) {
      console.log('off[ ] ', pc, ' for ', clientID);
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
    .catch(function (reason) {
      console.error('error ', reason);
    });

  function handleOfferIceCandidateStateChange(event) {
    if (pc.iceConnectionState === 'failed') {}
    if (pc.iceConnectionState === 'disconnected') {}
    if (pc.iceConnectionState === 'closed') {
      // Handle the failure
    }
  }
  return {pc, dc};
}

/////////////////////offerChannel//////////////////////////////////////////////

var offerChannel = client.subscribe('offer');

offerChannel.on('subscribeFail', function (err) {
  console.error('Failed to subscribe to the offer channel due to error: ' + err);
});

offerChannel.watch(function (data) {
  if (data.to === client.id) {
    console.log('offer if case ', data.data.type);
    ans[data.from] = createAnswerPeerConnection(data);
  } else {
    console.log('offer else case ', data);
  }
});

////////////////createAnswerPeerConnection(()//////////////////////////////////

function createAnswerPeerConnection(data) {
  var dc1;
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

      if (event.track.kind === 'video') {
        console.log('(Answer)Remote stream added.');
        remoteStream = event.streams[0];
        if (data.screenFlag) {
          var v = document.getElementById('screenshareVideo');
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

  localStream
    .getTracks()
    .forEach(function (track) {
      pc.addTrack(track, localStream);
    });

  pc.setRemoteDescription(new RTCSessionDescription(data.data));

  pc
    .createAnswer()
    .then(function (answerdata) {
      // Set Opus as the preferred codec in SDP if Opus is present.
      // sessionDescription.sdp = preferOpus(sessionDescription.sdp);
      console.log('ans[ ] ', pc, ' for ', data.from);
      pc.setLocalDescription(answerdata);
      console.log('setLocalDescription for answer ', answerdata, ' id ', data.from);
      client.emit('answer', {
        data: answerdata,
        from: data.to,
        to: data.from
      });
    })
    .catch(function (reason) {
      console.error('error ', reason);
    });
  pc.ondatachannel = gotReceiveChannel;

  function gotReceiveChannel(event) {
    console.log('Receive Channel Callback: event --> ' + event);
    dc1 = event.channel;
    console.log('dc1 is ' + dc1);
    receivedSize = 0;
    bitrateMax = 0;
    // Set handlers for the following events: (i) open; (ii) message; (iii) close
    dc1.onopen = handleReceiveChannelStateChange;

    dc1.onmessage = handleMessage;

    dc1.onclose = handleReceiveChannelStateChange;
  }

  // Handler for either 'open' or 'close' events on receiver's data channel
  function handleReceiveChannelStateChange() {
    var readyState = dc1.readyState;
    ans[data.from].dc1 = dc1;
    console.log('dc1 channel state is: ' + dc1.readyState);    
  }
  return {pc, dc1};
}



////////////////////////answerChannel/////////////////////////////////////

var answerChannel = client.subscribe('answer');

answerChannel.on('subscribeFail', function (err) {
  console.error('Failed to subscribe to the Answer channel due to error: ' + err);
});

answerChannel.watch(function (data) {
  if (data.to === client.id) {
    for (var i = 0; i < clientsData.length; i++) {
      if (clientsData[i] == data.from) {
        console.log('this offer belongs to off[', i, '] ', off[clientsData[i]].pc, ' of ', clientsData[i]);
        off[clientsData[i]]
          .pc
          .setRemoteDescription(new RTCSessionDescription(data.data));
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
  console.error('Failed to subscribe to the iceOffer channel due to error: ' + err);
});

iceOfferChannel.watch(function (data) {
  if (data.to === client.id) {
    console.log('iceOffer if case ', data);
    var candidate = new RTCIceCandidate({sdpMLineIndex: data.label, candidate: data.candidate});
    ans[data.from]
      .pc
      .addIceCandidate(candidate)
      .then(_ => {
        // Do stuff when the candidate is successfully passed to the ICE agent
      })
      .catch(e => {
        console.log('Error: Failure during iceOffer addIceCandidate()');
      });
  } else {
    console.log('iceOffer else case ', data);
  }
});

///////////////////////////iceAnswerChannel////////////////////////////////

var iceAnswerChannel = client.subscribe('iceAnswer');

iceAnswerChannel.on('subscribeFail', function (err) {
  console.error('Failed to subscribe to the iceAnswer channel due to error: ' + err);
});

iceAnswerChannel.watch(function (data) {
  if (data.to === client.id) {
    for (var i = 0; i < clientsData.length; i++) {
      if (clientsData[i] == data.from) {
        console.log('iceAnswer if case ', data);
        var candidate = new RTCIceCandidate({sdpMLineIndex: data.label, candidate: data.candidate});
        off[clientsData[i]]
          .pc
          .addIceCandidate(candidate)
          .then(_ => {
            // Do stuff when the candidate is successfully passed to the ICE agent
          })
          .catch(e => {
            console.log('Error: Failure during iceAnswer addIceCandidate()');
          });
      }
    }
  } else {
    console.log('iceAnswer else case ', data);
  }
});
/////////////////send data in datachannel////////////////////

document
  .getElementById('Submit')
  .onclick = (e) => {
  e.preventDefault();
  var data = document
    .getElementById('message')
    .value;

  for (var key in ans) {
    if (ans.hasOwnProperty(key)) {
      ((ans[key]).dc1).send(name + ' : ' + data);
      console.log('Sent to dc1 channel data: ' + data);
    }
  }

  for (var key in off) {
    if (off.hasOwnProperty(key)) {
      ((off[key]).dc).send(name + ' : ' + data);
      console.log('Sent to dc channel data: ' + data);
    }
  }

  let newData = anchorme((name + ' : ' + data), {
    attributes: [
      {
        name: 'target',
        value: '_blank'
      }
    ],
    truncate: 20
  });

  var li = document.createElement('li');
  li.innerHTML = newData;
  ul.appendChild(li);

  document
    .getElementById('message')
    .value = '';
};
/////////////////////////////////////////////////////////////////////
document
  .getElementById('fileUpload')
  .addEventListener('change', handleFileUpload, false)

function handleFileUpload(e) {
  file = e.target.files[0];
  console.log('File is ' + [file.name, file.size, file.type, file.lastModifiedDate].join(' '));
  if (!file) {
    trace('No file chosen');
  } else {    
    client.emit('filemetadata', { name: file.name, size: file.size, type: file.type, lastModifiedDate : file.lastModifiedDate, from : client.id});    
  }
}

document.getElementById('sendfile').onclick = sendFileData;

function sendFileData(){
  // sendProgress.max = file.size;
  var chunkSize = 16384;
  var sliceFile = function (offset) {
    var reader = new window.FileReader();
    reader.onload = (function () {
      return function (e) {
        // dc.send(e.target.result);
        sendData(e.target.result);
        if (file.size > offset + e.target.result.byteLength) {
          window.setTimeout(sliceFile, 0, offset + chunkSize);
        }
        sendProgress.value = offset + e.target.result.byteLength;
      };
    })(file);
    var slice = file.slice(offset, offset + chunkSize);
    reader.readAsArrayBuffer(slice);
  };
  sliceFile(0);
  function sendData(f) {

    for (var key in ans) {
      if (ans.hasOwnProperty(key)) {
        ((ans[key]).dc1).send(f);
        console.log('Sent to dc1 channel data: ' + f);
      }
    }

    for (var key in off) {
      if (off.hasOwnProperty(key)) {
        ((off[key]).dc).send(f);
        console.log('Sent to dc channel data: ' + f);
      }
    }
  }
}

function handleMessage(event) {  
  if (event.data instanceof ArrayBuffer)
  {    
    receiveBuffer.push(event.data);
    receivedSize += event.data.byteLength;
    console.log(receivedSize);

    sendProgress.value = receivedSize;
    // we are assuming that our signaling protocol told about the expected file
    // size(and name, hash, etc). var file = fileInput.files[0];
    if (receivedSize === broadcastfile.size) {
      console.log('Received Message ' + event.data.byteLength);
      var received = new window.Blob(receiveBuffer);
      receiveBuffer = [];
      console.log(URL.createObjectURL(received));
      if (broadcastfile.type.split('/')[0] == 'image'){
        var image = new Image();
        image.src = URL.createObjectURL(received);
        image.style = 'width: 100%';
        var li = document.createElement('li');
        li.append(image);
        ul.appendChild(li);
      } else {
        var downloadAnchor = document.createElement('a');
        var linkText = document.createTextNode('file download');
        downloadAnchor.appendChild(linkText);
        downloadAnchor.href = URL.createObjectURL(received);
        downloadAnchor.download = broadcastfile.name;
        downloadAnchor.textContent = 'Click to download \'' + broadcastfile.name + '\' (' + broadcastfile.size + ' bytes)';
        downloadAnchor.style.display = 'block';

        var li = document.createElement('li');
        li.append(downloadAnchor);
        ul.appendChild(li);
      }
      
      receivedSize = 0; //resetting the received size
      client.emit('filesentnotify', broadcastfile.from);            
    }
  } else if(typeof event.data === 'string' || myVar instanceof String) {    
    console.log('Received message: ' + event.data);
    // Show    message in the HTML5 page
    let newData = anchorme(event.data, {
      attributes: [
        {
          name: 'target',
          value: '_blank'
        }
      ],
      truncate: 20
    });    
    var li = document.createElement('li');
    li.innerHTML = newData;
    ul.appendChild(li);
  }  
}

////////////////////filemetadata///////////////////////////////
var filemetadataChannel = client.subscribe('filemetadata');

filemetadataChannel.on('subscribeFail', function (err) {
  console.error('Failed to subscribe to the filemetadata channel due to error: ' + err);
});

filemetadataChannel.watch(function (data) {
  console.log('broadcastfile metadata is ', data);
  broadcastfile = data;
  sendProgress.max = data.size;
});
///////////////////filesentnotify/////////////////////////////
var filesentnotifyChannel = client.subscribe('filesentnotify');

filesentnotifyChannel.on('subscribeFail', function (err) {
  console.error('Failed to subscribe to the filesentnotify channel due to error: ' + err);
});

filesentnotifyChannel.watch(function (data) {
sendProgress.value = 0;
  if(client.id == data){
    var li = document.createElement('li');
    li.innerHTML = 'file sent successfully';
    ul.appendChild(li);
    console.log('append successfull');
  }
});
//////////////////////////////////////////////////////////////