"use strict";

/* global Panorama */

(function () {
  // Parameter of the indicator that's currently expanded. Starts as nothing
  var expandedIndicator;

  var drawVerticalIndicatorGraph = function ($indicatorSummary, summaryData) {
    var $graphContainer = $indicatorSummary.find(".indicator-graph-vertical");

    var series = _.map(summaryData.statuses, function (status, i) {
      return {
        name: status.parameter,
        borderWidth: 0,
        color: Panorama.CSSPropertyForStatus(status.class_name, "background-color"),
        cursor: "pointer",
        data: [status.count],
        groupPadding: 0,
        pointPadding: 0,
        events: {
          click: function () {
            toggle(summaryData.parameter, status.parameter);
          }
        }
      };
    });

    if (_.isUndefined($graphContainer.highcharts())) {
      // Setting up a new graph
      $graphContainer.highcharts({
        chart: {
          animation: {
            // This setting is slightly slower than what we use in CSS
            duration: 550
          },
          type: "column",
          backgroundColor: "transparent",
          spacingTop: 0,
          spacingBottom: 0,
          spacingLeft: 0,
          spacingRight: 0
        },
        credits: {
          enabled: false
        },
        title: {
          text: ""
        },
        xAxis: {
          labels: {
            enabled: false
          },
          lineWidth: 0,
          tickLength: 0
        },
        yAxis: {
          min: 0,
          lineWidth: 0,
          gridLineWidth: 0,
          minorGridLineWidth: 0,
          lineColor: "transparent",
          labels: {
            enabled: false
          },
          title: {
            text: ""
          },
          minorTickLength: 0,
          tickLength: 0,
          tickColor: "transparent"
        },
        legend: {
          enabled: false
        },
        plotOptions: {
          series: {
            stacking: "percent",
            animation: false // This only controls animations on page load
          }
        },
        tooltip: {
          useHTML: true,
          hideDelay: 0,
          shape: "square",
          borderWidth: 0,
          shadow: false,
          style: {
            padding: 0,
            fontFamily: "inherit",
            fontSize: "inherit",
            color: "inherit"
          },
          positioner: function (labelWidth, labelHeight, point) {
            return { x: point.plotX - 365, y: point.plotY };
          },
          formatter: function () {
            return $indicatorSummary.
                   find("[data-indicators-" + summaryData.parameter + "=" + this.series.name + "] .tooltip").
                   html();
          }
        },
        series: series
      });
    } else {
      // Updating an existing graph
      _.each(series, function (newData, i) {
        $graphContainer.highcharts().series[i].setData(newData.data);
      });
    }
  };

  // Expand or contract the given indicator graph.
  // @param indicator [String] Parameter of indicator to toggle
  // @param expand [Boolean] True if we should expand, false if we should contract
  var setIndicatorExpansion = function (indicator, expand) {
    var $thisIndicator = $(".indicator-summary-container .indicator-graph-spacing.top-level." + indicator);
    var $indicatorsContainer = $thisIndicator.parents(".indicator-summary-container");
    var $indicators = $indicatorsContainer.find(".indicator-graph-spacing");
    var $indicatorGroup = $thisIndicator.parent(".parent-indicator-panel");
    var $childIndicators = $indicators.filter("[data-indicator-parent=" + indicator + "]");
    var $unselectedTopLevelIndicators = $(getUnselectedTopLevelIndicators());

    var $otherIndicators = $indicators.
                           not($thisIndicator).
                           not($unselectedTopLevelIndicators).
                           not("[data-indicator-parent]").
                           not($indicatorGroup.find(".top-level"));

    var $otherParentIndicators = $indicatorsContainer.
                                 find(".parent-indicator-panel").
                                 not($thisIndicator);

    if (expand) {
      expandedIndicator = indicator;
      $indicatorGroup.addClass("expanded");
      $thisIndicator.addClass("expanded");
      $otherParentIndicators.addClass("sibling-expanded");
      $otherIndicators.addClass("fade");
      $childIndicators.removeClass("fade");
    } else {
      $indicatorGroup.removeClass("expanded");
      $thisIndicator.removeClass("expanded");
      $otherParentIndicators.removeClass("sibling-expanded");
      $childIndicators.addClass("fade");
      $otherIndicators.removeClass("fade");
      expandedIndicator = null;
    }
  };

  var getUnselectedTopLevelIndicators = function () {
    return $(".top-level-selector .dropdown-menu li").map(function () {
      return ".top-level.indicator-graph-spacing." + $(this).data("indicator");
    }).get().join(",");
  };

  // Select the given top-level indicator within its group.
  // @param indicator [String] Parameter of indicator to swap in
  var selectTopLevelIndicator = function (indicator) {
    var $thisIndicator = $(".indicator-summary-container").
                         find(".indicator-graph-spacing.top-level." + indicator);
    var $indicatorGroup = $thisIndicator.parent(".parent-indicator-panel");
    var $groupIndicators = $indicatorGroup.find(".indicator-graph-spacing.top-level");
    var $indicatorGroupMenu = $indicatorGroup.find(".top-level-selector");

    var $indicatorGroupMenuOptions = $indicatorGroupMenu.find(".dropdown-menu li");
    var $indicatorGroupMenuDropdown = $indicatorGroupMenu.find(".dropdown-menu");

    $groupIndicators.addClass("fade");
    $thisIndicator.removeClass("fade");

    // Reset the dropdown menu state with the selected value
    $indicatorGroupMenuOptions.
      filter("[data-indicator='" + indicator + "']").clone().
      appendTo($indicatorGroupMenu.find(".selection").empty());

    if (_.isString(expandedIndicator)) {
      // Collapse the previous selection
      setIndicatorExpansion(expandedIndicator, false);

      if ($thisIndicator.hasClass("has-children")) {
        // Expand the new selection
        setIndicatorExpansion(indicator, true);
      }
    }
  };

  // Show the given indicator in the right-most graph.
  // @param indicator [String] Parameter of indicator to toggle
  // @param $menu [jQuery] Menu element for the right-most graph
  var selectChildIndicator = function (indicator, $menu) {
    $menu.
      parent().
      find(".indicator-summary-panel").
      addClass("fade").
      filter("." + indicator).
      removeClass("fade");
  };

  var setupIndicatorSummaries = function () {
    // Announce to the rest of the application that indicator graphs are changing
    $(window).trigger("indicators:graphs-updating");

    // iterate through all the summaries.
    $(".indicator-summary").each(function (_i, indicatorSummary) {
      var $indicatorSummary = $(indicatorSummary);
      var initialized = !!$indicatorSummary.data("initialized");

      // this sets the expander button up to use the data in the first
      // indicator summary panel. indicator-graph-spacing still includes
      // the first indicator parameter as a class, so this allows expanding
      // and hiding the top-level summaries.
      var $indicatorSummaryPanel = $indicatorSummary.find(".indicator-summary-panel");
      var summaryData = $indicatorSummaryPanel.data("summary-data");

      // If this is just a spacer element, bail out
      if (_.isUndefined(summaryData)) {
        return;
      }

      if (!initialized) {
        // setup expander button
        $indicatorSummary.find(".expander").click(function () {
          // Announce to the rest of the application that this indicator was toggled
          $(window).trigger("indicators:expanded", {
            indicator: summaryData.parameter,
            expand: !$(this).toggleClass("contracted").hasClass("contracted")
          });
        });

        // Default indicator dropdown selection
        if ($indicatorSummary.find("select").length) {
          $indicatorSummary.find("select").first()[0].selectedIndex = 0;
        }

        // find any selector boxes and setup event to swap panels
        $indicatorSummary.find("select").change(function (e) {
          selectChildIndicator(e.target.value, $(e.target));

          // Announce to the rest of the application that this indicator was selected
          $(window).trigger("indicators:selected", { indicator: e.target.value });
        });

        // Set up any indicator group menu option tied to this indicator
        $(".parent-indicator-panel .top-level-selector li[data-indicator='" + summaryData.parameter + "']").
          click(function () {
            if (!$(this).parent().hasClass("selection")) {
              $(window).trigger("indicators:swapped", { indicator: summaryData.parameter });
            }
          });
      }

      // we now need to iterate through each indicator-summary-panel
      // and render the graph on it.
      $indicatorSummary.find(".indicator-summary-panel").each(function (_, indicatorSummaryPanel) {
        var $indicatorSummaryPanel = $(indicatorSummaryPanel);
        var summaryData = $indicatorSummaryPanel.data("summary-data");

        // Set up filtering interactions on the non-graph percentage labels
        $indicatorSummaryPanel.find(".indicator-status-summary").click(function () {
          var band = $(this).data("indicators-" + summaryData.parameter);
          toggle(summaryData.parameter, band);
        });

        drawVerticalIndicatorGraph($indicatorSummaryPanel, summaryData);
      });

      $indicatorSummary.data("initialized", true);
    });
  };

  // Toggle filtering by the given indicator and status band
  // @param indicator [String]
  // @param indicatorBand [String]
  var toggle = function (indicator, indicatorBand) {
    var selector = "#sidebar-filters-indicators-" + indicator + " " +
                   "input[value='" + indicatorBand + "']";
    $(selector).get(0).click();
  };

  $(document).ready(function () {
    var reset = function () {
      var $progressGraph = $(".hero .progress-indicators .top-level:not(.fade) .indicator-summary-panel");

      // Collapse any expanded indicator
      if (_.isString(expandedIndicator)) {
        $(window).trigger("indicators:expanded", {
          indicator: expandedIndicator,
          expand: false
        });
      }

      // Broadcast which top-level indicator is currently selected in each
      // top-level selector, so the rest of the application can update as needed
      $(".indicator-summary-container .top-level-selector .selection li").
        each(function () {
          $(window).trigger("indicators:swapped", {
            indicator: $(this).data("indicator")
          });
        });

      // If this page has progress graphs, activate the selected one
      if ($progressGraph.length > 0) {
        $(window).trigger("indicators:expanded", {
          indicator: $progressGraph.data("indicator"),
          expand: true
        });
      }

      setupIndicatorSummaries();
    };

    window.load(
      {
        controllers: {
          lists: ["show"],
          students: ["index"],
          groups: ["show"]
        }
      },
      reset
    );

    // Process the results of an AJAX call
    $(window).on("content:updated", function (_event, event_data) {
      var $existingContent;
      var $newContent;

      // If the new content includes a new hero section...
      if (!_.isUndefined(event_data.content.hero_html)) {
        $existingContent = $(".hero .indicator-summary-container");
        $newContent = $(event_data.content.hero_html).
                      find(".indicator-summary-container");

        // Swap the new indicator content in to the page. This replaces graph
        // summaries (the checkboxes and tooltips) and JSON, but not the graphs
        // themselves, since we want to animate those
        $newContent.
          find(".indicator-summary-panel").
          each(function (_, newGraphContainer) {
            var $newGraphContainer = $(newGraphContainer);
            var indicator = $newGraphContainer.data("indicator");

            // Swap all checkboxes and tooltips
            $newGraphContainer.
              find("[data-indicators-" + indicator + "]").
              each(function (_, newStatusSummary) {
                var $newStatusSummary = $(newStatusSummary);
                var status = $newStatusSummary.data("indicators-" + indicator);

                $existingContent.
                  find("[data-indicators-" + indicator + "='" + status + "']").
                  replaceWith($newStatusSummary);
              });

            // Swap graph data JSON
            $existingContent.
              find(".indicator-summary-panel." + indicator).
              data("summary-data", $newGraphContainer.data("summary-data"));
          });

        // Swap modals
        $newContent.find(".modal.indicators-info").each(function (_, newModal) {
          $existingContent.find("#" + newModal.id).replaceWith(newModal);
        });

        setupIndicatorSummaries();
      }
    });

    $(window).on("indicators:swapped", function (_event, event_data) {
      selectTopLevelIndicator(event_data.indicator);
    });

    $(window).on("indicators:expanded", function (_event, event_data) {
      setIndicatorExpansion(event_data.indicator, event_data.expand);
    });

    // If the entire hero was replaced, e.g. because we just changed from the
    // Overview to a subject area view or vice-versa, the new content is already
    // loaded in the DOM at this point. Treat this like a new page load
    $(window).on("hero:replaced", reset);
  });
})();
