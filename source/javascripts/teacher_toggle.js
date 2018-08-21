"use strict";

/* global Panorama */

window.load({
  controllers: {
    students: ["index"],
    groups: ["show"],
    lists: ["show"]
  }
}, function () {
  $(document).ready(function () {
    var $dropdown = $(".teacher-toggle .dropdown");
    var changeInputDisabled = function (disabled) {
      $dropdown.attr({ disabled: disabled });
    };

    var changeRosterView = function ($this) {
      var $container = $dropdown.parent();
      var params = Panorama.getQueryParameters(
        $.param(
          {
            roster_view: $this.data("rosterView")
          }
        )
      );
      var removeLoadingWaveCallback = Panorama.loadingWave($container);

      changeInputDisabled(true);
      $(".body-container").addClass("loading");

      Panorama.
        newState("roster_view", params).
        complete(function () {
          changeInputDisabled(false);
          removeLoadingWaveCallback();
          $(".body-container").removeClass("loading");
        });
    };

    // Update the UI to reflect what's in the URL bar, for browser back button
    var loadState = function () {
      var rosterView = Panorama.getQueryParameters().roster_view ||
                      $dropdown.data("default");
      selectOption(
        $dropdown.find(
          ".dropdown-menu li[data-roster-view='" + rosterView + "']"
        )
      );
    };

    var selectOption = function ($option) {
      // Updates the teacher toggle box with the selection from the
      // dropdown menu. Is intended to mimic typical dropdown menu behavior.
      $(".teacher-toggle .dropdown-menu li").removeClass("active");
      $option.addClass("active");
      $(".teacher-toggle .dropdown ul.selection li").text($option.text());
    };

    $(".teacher-toggle .dropdown-menu li").click(function () {
      var $this = $(this);
      selectOption($this);
      changeRosterView($this);
    });

    // Update buttons on browser back button
    $(window).on("popstate", loadState);
  });
});
