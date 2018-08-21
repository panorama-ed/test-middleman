"use strict";

/* global Panorama */

(function () {
  var DEFAULT_SORT_DIRECTION = "asc";
  var $table;

  // Parameter of the indicator that's currently expanded. Starts as nothing
  var expandedIndicator;

  // Parameter of the indicator that's currently selected in the dropdown menu
  // for the right-most indicator graph
  var selectedIndicator;

  var initializeHandlers = function () {
    $table = $(".sortable-table");

    if ($table.data().initialized === "true") {
      // Prevent double-inits
      return;
    }

    // Set up column headers to control sorting
    $table.find(".data-header [data-sort-by]").click(function () {
      var $header = $(this);
      var column = $header.data().sortBy;
      var newSortDirection;

      if ($header.hasClass("active")) {
        if ($header.hasClass("asc")) {
          newSortDirection = "desc";
        } else {
          newSortDirection = "asc";
        }
      } else {
        newSortDirection = DEFAULT_SORT_DIRECTION;
      }

      Panorama.newState("sort", {
        "sort[by]": column,
        "sort[direction]": newSortDirection
      });
    });

    // Set up "show more students" button, if there is one
    $table.find(".more-students-button").click(function () {
      var $this = $(this);
      var nextPage = $this.data().nextPage;
      Panorama.
        newState(
          "next_page",
          {},
          { extraParams: { page: nextPage.toString() } }
        ).
        success(function (response) {
          if (!_.isUndefined(response.next_page)) {
            $this.data("next-page", response.next_page);
          } else {
            // We're at the end, so remove the button
            $this.remove();
          }
        }).
        complete(Panorama.loadingWave($this));
    });

    $table.data().initialized = "true";
  };

  // @param indicatorGroupID [String]
  // @return [String, undefined] If the given group ID contains a - character,
  //   the widget ID is the part before it and the group ID is the part after;
  //   we return the widget ID and the - character, e.g. "0-". For a globally-
  //   scoped group ID with no - character, or an undefined group ID, there is
  //   no widget ID, so the return value of this function is undefined
  var getWidgetID = function (indicatorGroupID) {
    if (!_.isUndefined(indicatorGroupID)) {
      return $(indicatorGroupID.toString().match(/\d+-/)).get(0);
    }
  };

  // Expand or contract the table column for the given indicator.
  // @param indicator [String] Parameter of indicator to toggle
  // @param $root [jQuery] Container within which to search for the given indicator
  var setIndicatorExpansion = function (indicator, expand, $root) {
    var $unselectedTopLevelIndicators = $(getUnselectedTopLevelIndicators());
    var $thisIndicator = $root.find(".indicator-graph-spacing.has-children." + indicator);
    var $indicators = $thisIndicator.siblings(".indicator-graph-spacing");
    var thisIndicatorGroup = $thisIndicator.data("indicator-group");
    var thisIndicatorWidget = getWidgetID(thisIndicatorGroup);
    var $childIndicators;
    var $otherIndicators;

    // If this indicator is part of a widget, we only want to interact with
    // other indicators in the same widget. Otherwise, we want to interact
    // with all other indicators so we don't do further filtering
    if (!_.isUndefined(thisIndicatorWidget)) {
      $indicators = $indicators.
                    filter("[data-indicator-group^='" + thisIndicatorWidget + "']");
    }

    $childIndicators = $indicators.filter("[data-indicator-parent='" + indicator + "']");
    $otherIndicators = $indicators.
                       not($thisIndicator).
                       not($unselectedTopLevelIndicators).
                       not("[data-indicator-parent]").
                       not("[data-indicator-group='" + thisIndicatorGroup + "']");

    // If the indicator we're trying to expand isn't actually in our content, we
    // want to treat this as a contract command instead
    if (expand && $thisIndicator.length > 0) {
      expandedIndicator = indicator;
      $thisIndicator.addClass("expanded");
      $otherIndicators.addClass("fade");
      $childIndicators.removeClass("fade");
    } else {
      $thisIndicator.removeClass("expanded");
      $childIndicators.addClass("fade");
      $otherIndicators.removeClass("fade");
      expandedIndicator = null;
    }
  };

  var getUnselectedTopLevelIndicators = function () {
    return $(".top-level-selector").
          find(".dropdown-menu").
          find("li").map(function () {
            return ".indicator-graph-spacing." + $(this).data("indicator");
          }).get().join(",");
  };

  // Select the given top-level indicator within its group.
  // @param indicator [String] Parameter of indicator to swap in
  // @param $root [jQuery] Container within which to search for the given indicator
  var selectTopLevelIndicator = function (indicator, $root) {
    var $indicators = $root.find(".indicator-graph-spacing");
    var $thisIndicator = $indicators.filter(".has-children." + indicator);
    var $otherIndicators = $indicators.
                           filter("[data-indicator-group=" + $thisIndicator.data("indicator-group") + "]").
                           not($thisIndicator);

    $otherIndicators.addClass("fade");
    $thisIndicator.removeClass("fade");

    // If the old top-level indicator was expanded, and it's in the same widget
    // as the new selection, collapse it and expand the new one
    if (_.isString(expandedIndicator) &&
        inSameWidget($thisIndicator, expandedIndicator, $root)) {
      setIndicatorExpansion(expandedIndicator, false, $root);

      if ($thisIndicator.hasClass("has-children")) {
        setIndicatorExpansion(indicator, true, $root);
      }
    }
  };

  // @param $indicatorA [jQuery, String] Ideally a jQuery object representing an
  //   indicator column. If given a string, we try to find an indicator column
  //   with the given value as its parameter
  // @param $indicatorB [jQuery, String]
  // @return [Boolean] Are the given indicator columns part of the same widget?
  //   Will also be true if neither indicator is part of a widget
  var inSameWidget = function ($indicatorA, $indicatorB, $root) {
    if (!($indicatorA instanceof $)) {
      $indicatorA = $root.find(".indicator-graph-spacing." + $indicatorA);
    }

    if (!($indicatorB instanceof $)) {
      $indicatorB = $root.find(".indicator-graph-spacing." + $indicatorB);
    }

    return getWidgetID($indicatorA.data("indicator-group")) ===
           getWidgetID($indicatorB.data("indicator-group"));
  };

  // Show the given indicator in the right-most table table column.
  // @param indicator [String] Parameter of indicator to toggle
  // @param $root [jQuery] Container within which to search for the given indicator
  var selectChildIndicator = function (indicator, $root) {
    var $indicators = $root.find(".indicator-graph-spacing");
    var $newSelectedIndicator = $indicators.filter("." + indicator);

    $indicators.filter(".selected").
                filter("[data-indicator-parent=" + $newSelectedIndicator.data("indicator-parent") + "]").
                removeClass("selected").addClass("collapsed");

    $newSelectedIndicator.removeClass("collapsed").addClass("selected");
    selectedIndicator = indicator;
  };

  window.load(
    {
      controllers: {
        lists: ["show"],
        students: ["index"],
        groups: ["show"]
      }
    },
    initializeHandlers
  );

  // Process the results of an AJAX call
  $(window).on("content:updated", function (_event, event_data) {
    var $newContent;
    var rowsOnly;

    if (!_.isUndefined(event_data.content.content_html)) {
      // The new content includes an entirely new students table
      $newContent = $(event_data.content.content_html);
      rowsOnly = false;
    } else if (!_.isUndefined(event_data.content.table_html)) {
      // The new content only includes new rows for the existing table
      $newContent = $(event_data.content.table_html);
      rowsOnly = true;
    }

    // If we have new content to handle...
    if (!_.isUndefined($newContent)) {
      // Pre-process table columns to match current indicator expansion state
      if (!!expandedIndicator) {
        setIndicatorExpansion(expandedIndicator, true, $newContent);
      }

      if (!!selectedIndicator) {
        selectChildIndicator(selectedIndicator, $newContent);
      }

      // Transform the new content to match the current indicator group state
      $(".sortable-table").
        // Only look at table headers
        find(".indicator-graph-spacing[data-indicator-column]").
        // Anything that isn't a child indicator and isn't .fade is selected
        not(".narrow").
        not(".fade").
        each(function (_, e) {
          selectTopLevelIndicator($(e).data("indicator-column"), $newContent);
        });

      if (rowsOnly) {
        $(".sortable-table .data").append($newContent);
        // Announce that a new page of students was added
        $(window).trigger("students-table:page-added");
      } else {
        $(".sortable-table").parent().html($newContent);
        // Announce that the entire students table has been reloaded
        $(window).trigger("students-table:reloaded");
      }

      // Re-initialize sorting handlers
      initializeHandlers();

      // Announce that the students table has changed in some way
      $(window).trigger("students-table:updated");
    }
  });

  // When the expand/contract button is clicked under an indicator graph,
  // expand/contract the corresponding table column
  $(window).on("indicators:expanded", function (_event, event_data) {
    setIndicatorExpansion(
      event_data.indicator,
      event_data.expand,
      $(".sortable-table")
    );
  });

  // When an indicator is selected in the dropdown menu for the right-most
  // indicator graph, swap in the corresponding table column
  $(window).on("indicators:selected", function (_event, event_data) {
    selectChildIndicator(event_data.indicator, $(".sortable-table"));
  });

  // When an indicator group button is pressed to select another top-level
  // indicator in an indicator group, swap in the column and its children
  $(window).on("indicators:swapped", function (_event, event_data) {
    selectTopLevelIndicator(event_data.indicator, $(".sortable-table"));
  });
})();
