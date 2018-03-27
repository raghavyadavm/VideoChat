(function() {
  window.getScreenId = function(callback) {
    // for Firefox:
    // sourceId == 'firefox'
    // screen_constraints = {...}
    if (!!navigator.mozGetUserMedia) {
      callback(null, 'firefox', {
        video: {
          mozMediaSource: 'window',
          mediaSource: 'window'
        }
      });
      return;
    }

    window.addEventListener('message', onIFrameCallback);

    function onIFrameCallback(event) {
      if (!event.data) return;

      if (event.data.chromeMediaSourceId) {
        if (event.data.chromeMediaSourceId === 'PermissionDeniedError') {
          callback('permission-denied');
        } else {
          callback(null, event.data.chromeMediaSourceId,
            getScreenConstraints(null, event.data.chromeMediaSourceId));
        }

        // this event listener is no more needed
        window.removeEventListener('message', onIFrameCallback);
      }

      if (event.data.chromeExtensionStatus) {
        callback(event.data.chromeExtensionStatus, null,
          getScreenConstraints(event.data.chromeExtensionStatus));

        // this event listener is no more needed
        window.removeEventListener('message', onIFrameCallback);
      }
    }

    setTimeout(postGetSourceIdMessage, 100);
  };

  function getScreenConstraints(error, sourceId) {
    var screen_constraints = {
      audio: false,
      video: {
        mandatory: {
          chromeMediaSource: error ? 'screen' : 'desktop',
          maxWidth: window.screen.width > 1920 ? window.screen.width : 1920,
          maxHeight: window.screen.height > 1080 ? window.screen.height : 1080
        },
        optional: []
      }
    };

    if (sourceId) {
      screen_constraints.video.mandatory.chromeMediaSourceId = sourceId;
    }

    return screen_constraints;
  }

  function postGetSourceIdMessage() {
    if (!iframe) {
      loadIFrame(postGetSourceIdMessage);
      return;
    }

    if (!iframe.isLoaded) {
      setTimeout(postGetSourceIdMessage, 100);
      return;
    }

    iframe.contentWindow.postMessage({
      captureSourceId: true
    }, '*');
  }

  var iframe;

  // this function is used in RTCMultiConnection v3
  window.getScreenConstraints = function(callback) {
    loadIFrame(function() {
      getScreenId(function(error, sourceId, screen_constraints) {
        callback(error, screen_constraints.video);
      });
    });
  };

  function loadIFrame(loadCallback) {
    if (iframe) {
      loadCallback();
      return;
    }

    iframe = document.createElement('iframe');
    iframe.onload = function() {
      iframe.isLoaded = true;

      loadCallback();
    };
    iframe.src = 'https://www.webrtc-experiment.com/getSourceId/'; // https://wwww.yourdomain.com/getScreenId.html
    iframe.style.display = 'none';
    (document.body || document.documentElement).appendChild(iframe);
  }

  window.getChromeExtensionStatus = function(callback) {
    // for Firefox:
    if (!!navigator.mozGetUserMedia) {
      callback('installed-enabled');
      return;
    }

    window.addEventListener('message', onIFrameCallback);

    function onIFrameCallback(event) {
      if (!event.data) return;

      if (event.data.chromeExtensionStatus) {
        callback(event.data.chromeExtensionStatus);

        // this event listener is no more needed
        window.removeEventListener('message', onIFrameCallback);
      }
    }

    setTimeout(postGetChromeExtensionStatusMessage, 100);
  };

  function postGetChromeExtensionStatusMessage() {
    if (!iframe) {
      loadIFrame(postGetChromeExtensionStatusMessage);
      return;
    }

    if (!iframe.isLoaded) {
      setTimeout(postGetChromeExtensionStatusMessage, 100);
      return;
    }

    iframe.contentWindow.postMessage({
      getChromeExtensionStatus: true
    }, '*');
  }
})();
