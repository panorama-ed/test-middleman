"use strict";

$(document).ready(function () {
  $("#search").autocomplete({
    serviceUrl: $("#search").data("search-path"),

    autoSelectFirst: true,

    onSelect: function (suggestion) {
      window.location.pathname = suggestion.path;
    },

    beforeRender: function (container) {
      return container.children().addClass("fs-hide");
    },

    formatResult: function (suggestion, currentValue) {
      return suggestion.value.replace(
        RegExp("(^| )(" + currentValue.toLowerCase() + ")", "gi"),
        "$1<span class='matched-part fs-hide'>$2</span>"
      );
    }
  });
});
