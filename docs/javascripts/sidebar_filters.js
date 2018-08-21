"use strict";

/* global Panorama */

window.load(
{
  controllers: {
    lists: ["show"],
    students: ["index"],
    groups: ["show"]
  }
},
function () {
  $(document).ready(function () {
    var $section = $(".sidebar-filters");
    var $filterForm = $section.find("form");
    var $sectionTitle = $section.find("h4");
    var $sidebarClearAll = $filterForm.find(".reset-sidebar-filters");

    var changeInputDisabled = function (disabled) {
      $filterForm.
        find("label:not(.locked) input, label:not(.locked) button").
        attr({ disabled: disabled });
    };

    // Show/hide "Clear all" button based on presence of active filters
    var updateSidebarClearAll = function () {
      if ($filterForm.find("label:not(.locked) input[type=checkbox]:checked").length > 0) {
        $sidebarClearAll.removeClass("hide");
      } else {
        $sidebarClearAll.addClass("hide");
      }
    };

    var filterResults = function (filterElem) {
      var params = Panorama.getQueryParameters($filterForm.serialize());
      var removeAttributeLoading = Panorama.loadingWave($(filterElem));
      var removeSectionLoading = Panorama.loadingWave($sectionTitle);

      changeInputDisabled(true);
      $section.addClass("loading");
      $(".body-container").addClass("loading");

      Panorama.
        newState("demographic_filters", params).
        success(updateSidebarClearAll).
        complete(function () {
          changeInputDisabled(false);
          $section.removeClass("loading");
          removeAttributeLoading();
          removeSectionLoading();
          $(".body-container").removeClass("loading");
        });
    };

    // Update the UI to reflect what's in the URL bar, for browser back button
    var loadState = function () {
      var params = Panorama.getQueryParameters();
      _.each(
        Panorama.getQueryParameters($filterForm.serialize()),
        function (_currentState, queryParam) {
          var $filterInputs;
          if (!_.isNull(queryParam.match(/(filter|trends|indicators)\[(.+)]\[]/))) {
            // First, un-check everything for this attribute
            $filterInputs =
              $filterForm.
              find("#sidebar-filters-" + RegExp.$1 + "-" + RegExp.$2 + " input").
              attr({ checked: false });
            // Next, re-check only the values in the current URL
            _.each(params[queryParam], function (value) {
              $filterInputs.
                filter("[value='" + value + "']").
                get(0).checked = true;
            });
          }
        }
      );
      updateSidebarClearAll();
    };

    var setupBindings = function () {
      // Set up the "clear all" buttons
      $("#sidebar .reset-sidebar-filters").unbind("click");
      $(".reset-sidebar-filters").click(function () {
        $filterForm.
          find("label:not(.locked) input[type=checkbox]").
          attr({ checked: false });
        filterResults(this);
      });

      // Set up the X button on hero filter boxes
      $(".filter-box .remove").unbind("click").click(function () {
        var attribute = $(this).data("attribute");
        $filterForm.
          find("#sidebar-filters-" + attribute + " label:not(.locked) input").
          attr({ checked: false });
        filterResults();
      });

      $("#new-group-modal").modal({ show: false });

      // Set up the "save filter" button
      $(".save-filter.button").unbind("click").click(function () {
        $("#new-group-modal").modal({ show: true });
      });
    };

    // Only initialize the filter sidebar if there is one on the page
    if ($filterForm.length > 0) {
      // Prevent the enter key from submitting the filter form
      $filterForm.submit(function () { return false; });

      // Update filtered results when any filter is checked or unchecked
      $filterForm.find("input").change(function () {
        filterResults($(this).parents(".filter-option"));
      });

      // Update checkboxes on browser back button
      $(window).on("popstate", loadState);

      setupBindings();
    }

    // Process the results of an AJAX call
    $(window).on("content:updated", function (_event, event_data) {
      var $newContent;

      // If the new content includes a new hero section...
      if (!_.isUndefined(event_data.content.hero_html)) {
        // Swap new content in to the page and set up the new filtering controls
        $newContent = $(event_data.content.hero_html).
                      find(".student-filter-container");
        $(".hero .student-filter-container").replaceWith($newContent);
        setupBindings();
      }
    });

    // If the entire hero was replaced, e.g. because we just changed from the
    // Overview to a subject area view or vice-versa, the new content is already
    // loaded in the DOM at this point. We just need to initialize
    $(window).on("hero:replaced", setupBindings);
  });
});
