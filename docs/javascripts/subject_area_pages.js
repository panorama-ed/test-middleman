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
    var $form = $(".subject-area-pages form");
    var currentSubjectArea = Panorama.getQueryParameters().subject_area;

    var changeInputDisabled = function (disabled) {
      $form.find("input, button").attr({ disabled: disabled });
    };

    var changeSubjectArea = function (event) {
      var $text = $(event.target).siblings("span");
      var params = Panorama.getQueryParameters($form.serialize());
      var removeLoadingWaveCallback = Panorama.loadingWave($text);

      changeInputDisabled(true);
      $(".body-container").addClass("loading");

      Panorama.
        newState("subject_area", params).
        complete(function () {
          changeInputDisabled(false);
          removeLoadingWaveCallback();
          $(".body-container").removeClass("loading");
        });
    };

    // Update the UI to reflect what's in the URL bar, for browser back button
    var loadState = function () {
      var subjectArea = Panorama.getQueryParameters().subject_area || "";

      $form.find("input").attr({ checked: false });
      $form.
        find("input[value='" + subjectArea + "']").
        get(0).checked = true;
    };

    // Only initialize the filter sidebar if there is one on the page
    if ($form.length > 0) {
      // Prevent the enter key from submitting the filter form
      $form.submit(function () { return false; });

      // Update the subject area when a label is clicked
      $form.find("input").change(changeSubjectArea);

      // Process the results of an AJAX call
      $(window).on("content:updated", function (_event, event_data) {
        var $newContent;
        var newSubjectArea;

        // If the new content includes a new hero section...
        if (!_.isUndefined(event_data.content.hero_html)) {
          $newContent = $(event_data.content.hero_html);
          newSubjectArea = $newContent.data("subject-area");

          // Only swap out hero content if the layout has changed
          if (newSubjectArea !== currentSubjectArea) {
            $(".hero .container").html($newContent);
            currentSubjectArea = newSubjectArea;
            $(window).trigger("hero:replaced");
          }
        }
      });

      // Update buttons on browser back button
      $(window).on("popstate", loadState);
    }

    $(window).on("indicators:expanded", function (_event, event_data) {
      // If there are progress indicators on the page, they will be expanded now
      // with no button to collapse them. We want to assign their expanded width
      // as the element width to prevent flickering. The expanded width is just
      // the total width of all visible graph container children
      $(".progress-indicators").each(function () {
        var $this = $(this);
        $this.css({
          width: _.inject(
            $this.find(".indicator-summary.narrow").not(".fade"),
            function (accumulator, graph) {
              // The graph may still be expanding horizontally at this point, so
              // we need to temporarily remove any width that's been set
              // directly on the graph to access the eventual full width defined
              // in the stylesheet
              var $graph = $(graph);
              var originalWidth = $graph.css("width");
              var width = $graph.css({ width: "" }).css("width");
              $graph.css({ width: originalWidth });

              return accumulator + parseInt(width);
            },
            0
          )
        });
      });
    });
  });
});
