"use strict";

$(document).ready(function () {
  $(".school-selector a").click(function () {
    // Updates the school selector box with the school name selected from the
    // dropdown menu. Is intended to mimic typical dropdown menu behavior.
    $(".school-selector .selection li").text($(this).text());
  });
});
