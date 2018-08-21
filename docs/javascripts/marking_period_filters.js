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
    var setupMarkingPeriodButtons = function () {
      var $filterForm = $(".marking-period-filters form");
      var $sectionTitle = $(".marking-period-filters h4");

      var changeInputDisabled = function (disabled) {
        $filterForm.find("input, button").attr({ disabled: disabled });
      };

      var filterResults = function () {
        var params = Panorama.getQueryParameters($filterForm.serialize());
        var removeLoadingWave = Panorama.loadingWave($sectionTitle);

        changeInputDisabled(true);

        Panorama.
          newState("marking_period_filter", params).
          complete(function () {
            changeInputDisabled(false);
            removeLoadingWave();
          });
      };

      // Update the UI to reflect what's in the URL bar, for browser back button
      var loadState = function () {
        var markingPeriodId = Panorama.getQueryParameters().marking_period_id;

        if (!_.isUndefined(markingPeriodId)) {
          $filterForm.find("input").attr({ checked: false });
          $filterForm.
            find("input[value='" + markingPeriodId + "']").
            get(0).checked = true;
        }
      };

      // Only initialize the filter sidebar if there is one on the page
      if ($filterForm.length > 0) {
        // Prevent the enter key from submitting the filter form
        $filterForm.submit(function () { return false; });

        // Update the marking period when a label is clicked
        $filterForm.find("input").change(filterResults);

        // Update buttons on browser back button
        $(window).on("popstate", loadState);
      }
    };

    setupMarkingPeriodButtons();
    $(window).on("hero:replaced", setupMarkingPeriodButtons);
  });
});
