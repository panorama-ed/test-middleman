"use strict";

(function () {
  var POLLING_FREQUENCY = 300000; // 5 minutes

  // When a request gets a 401 response, check if the user has been signed out.
  // An additional check is performed to make sure that the user is actually
  // logged out and hasn't simply tried to access something they don't have
  // permission to.
  $.ajaxSetup({ statusCode: { 401: timeoutCheck } });

  // The "/timeout_check" endpoint will return 200 if the user is logged in
  // and 401 otherwise. If a 200 is observed, ignore the response. If
  // a 401 is observed, send the user to the root of the application where
  // they will be funneled through the login flow appropriately.
  //
  // The 401 listener is bound through statusCode instead of an error callback
  // to override the default value of statusCode provided above. Without this
  // override, a 401 inside of the timeoutCheck function would call timeoutCheck
  // a second time.
  function timeoutCheck() {
    $.ajax({
      url: "/timeout_check",
      statusCode: {
        401: function () { window.location = window.gon.timeout_redirect_path; }
      }
    });
  }

  // Periodically confirm that the user is still logged in
  setInterval(timeoutCheck, POLLING_FREQUENCY);
})();
