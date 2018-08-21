"use strict";

_.templateSettings = {
  interpolate: /\{\{(.+?)\}\}/g,
  evaluate: /\{%(.+?)%\}/g
};

(function () {
  // @return [Object] Representation of a "state" of the frontend. Properties:
  //   id      [Integer] Monotonically-increasing ID number
  //   source  [String] Name of the specific frontend component that caused
  //                    this state to exist
  //   options [Object] AJAX options the specific source needs to send to the
  //                    backend
  var newStateObject = function (source, options) {
    return { id: nextStateId++, source: source, options: options };
  };

  // ID number the next state object will get
  var nextStateId = 0;

  // Current state of the frontend
  var lastState = newStateObject("init");

  var ajaxRequest = function (source, params, options) {
    options = $.extend({}, options);
    return $.ajax(window.location.pathname, {
      // Add a different param to the AJAX request so that the browser doesn't
      // cache the unstyled page at the same route as the styled one
      data: $.extend({}, params, options.extraParams, { source: source, xhr: "true" }),
      dataType: "json"
    }).success(function (response) {
      // Announce that new page content is available. Individual pieces of the
      // application listen for this event and handle the data in the response
      $(window).trigger("content:updated", { content: response });
    });
  };

  // Helper for getting query parameters as an object, largely based on:
  // https://css-tricks.com/snippets/jquery/get-query-params-object/
  var getQueryParameters = function (query_string) {
    var tokenParser = function (token) {
      var vals = token.split("=");
      var isArray;

      vals[0] = decodeURIComponent(vals[0]);
      isArray = vals[0].substr(-2, 2) === "[]";

      if (vals.length === 2) {
        // Decode after replacing +'s, so we don't accidentally nuke a real +
        vals[1] = decodeURIComponent(vals[1].replace(/\+/g, " "));
        if (isArray) {
          if (_.isUndefined(this[vals[0]])) {
            this[vals[0]] = [];
          }
          if (vals[1].length > 0) {
            this[vals[0]].push(vals[1]);
          }
        } else {
          this[vals[0]] = vals[1];
        }
      }

      return this;
    };

    if (_.isUndefined(query_string)) {
      query_string = window.location.search;
    }

    return query_string.
           replace(/^\?/, "").
           split("&").
           map(tokenParser.bind({}))[0];
  };

  // @param newParams [Object] Map of query keys to values
  // @return [Object] Object with all query parameters, with newParams applied
  var updatedParams = function (newParams) {
    var params = getQueryParameters();

    $.each(newParams, function (queryParam, value) {
      if (value.length > 0) {
        params[queryParam] = value;
      } else {
        delete params[queryParam];
      }
    });

    return params;
  };

  // Update the URL bar to include new values for the given query parameters
  // @param source [String]
  // @param newParams [Object] Map of query keys to values
  // @param options [Object]
  var updateUrl = function (source, newParams, options) {
    var nextState = newStateObject(source, options);
    var params = $.param(updatedParams(newParams));
    var newUrl = window.location.protocol + "//" +
                 window.location.host +
                 window.location.pathname;

    if (params.length > 0) {
      params = "?" + params;
    }

    if (_.isEmpty(window.history.state)) {
      // Add data to the initial state object, since it starts empty
      window.history.replaceState(lastState, "");
    }

    // Add the new state to the browser's history, update the URL bar, and
    // update our local tracking variable
    window.history.pushState(nextState, "", newUrl + params);
    lastState = nextState;
  };

  // Make an AJAX request to the backend. Endpoint is the browser's current URL,
  // with newParams applied to the browser's current query parameters. The
  // location bar will be updated with the new URL if the request succeeds. This
  // is for fetching new data, handling user actions, etc.
  // @param source [String] What the operation is called. This will be forwarded
  //   to the backend in the "source" parameter
  // @param newParams [Object] New params to apply to the browser's current URL
  // @param options [Object] Options for send to ajaxRequest:
  //   extraParams: [Object] Extra params to pass to the AJAX request and store
  //                         in browser state history, but not in the URL bar
  var newState = function (source, newParams, options) {
    return ajaxRequest(source, updatedParams(newParams), options).
            success(function () {
              // Only update the URL bar if params have changed
              if (!_.isEmpty(newParams)) {
                updateUrl(source, newParams, options);
              }
            });
  };

  // Make an AJAX request to the backend based only on the browser's current URL
  // and query parameters. This is for re-fetching data from the server to
  // support the use of the browser back/forward buttons
  var existingState = function (event) {
    var state;
    if (event.originalEvent.state.id < lastState.id) {
      // State ID went down; browser back. Use the "previous" state object we
      // saved from before to rewind itself
      state = lastState;
    } else {
      // State ID went up; browser forward. Use the "current" state object from
      // the event
      state = event.originalEvent.state;
    }
    // Update "current" state object to be the one from the state change event.
    // Because the browser cycles through states without waiting for our AJAX
    // requests to come back, we want to update this immediately instead of
    // waiting for .success() like we do above in newState()
    lastState = event.originalEvent.state;
    return ajaxRequest(state.source, getQueryParameters(), state.options);
  };

  // Attach a copy of the loading icon to the given $container
  // @return [Function] Callback function for removing the loading icon
  var loadingWaveTemplate;
  var loadingWave = function ($container) {
    var $loadingWave = $(loadingWaveTemplate());
    $container.append($loadingWave);
    return (function () { $loadingWave.remove(); });
  };

  // @param parameter [String] CSS class name for an indicator status
  // @param property [String] CSS property to fetch. Must be one of the
  //   properties that vary by indicator status: color, background-color, or
  //   border-color
  // @return [String] Value of the given property for the given indicator status
  var CSSPropertyForStatus = function (parameter, property) {
    var value;
    var CSSClass = {
      "color": "with-indicator-color",
      "background-color": "with-indicator-background",
      "border-color": "with-indicator-border"
    }[property];
    var $elem = $("<span>").
                addClass("indicator " + CSSClass).
                addClass(parameter).
                appendTo($("body"));
    value = $elem.css(property);
    $elem.remove();

    return value;
  };

  // Public interface
  window.Panorama = {
    newState: newState,
    loadingWave: loadingWave,
    getQueryParameters: getQueryParameters,
    CSSPropertyForStatus: CSSPropertyForStatus
  };

  $(document).ready(function () {
    // Template html for the "loading wave" spinner
    loadingWaveTemplate = $("#loading-wave-template");
    if (loadingWaveTemplate.length > 0) {
      loadingWaveTemplate = _.template(loadingWaveTemplate.html());
    } else {
      loadingWaveTemplate = _.template("");
    }

    // Only set up state tracking on student index pages
    window.load(
      {
        controllers: {
          lists: ["show"],
          students: ["index"],
          groups: ["show"]
        }
      },
      function () {
        $(window).on("popstate", existingState);
      }
    );
  });
})();
