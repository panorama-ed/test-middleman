"use strict";

/* global Panorama */

(function () {
  // How long should it take for a new progress graph to "roll out" from left to
  // right? For switching subjects or assessments
  var SWAP_ANIMATION_MS = 100;

  // How long should it take for existing progress graphs to reflect updated
  // filters? This setting is manually tweaked to roughly match the indicator
  // graph animation
  var UPDATE_ANIMATION_MS = 375;

  var drawGraph = function ($graphContainer, fromData, toData) {
    var series = _.map(fromData.statuses, function (status, i) {
      return {
        name: status.parameter,
        borderWidth: 0,
        color: Panorama.CSSPropertyForStatus(status.class_name, "background-color"),
        cursor: "pointer",
        data: [status.count, toData.statuses[i].count],
        groupPadding: 0,
        pointPadding: 0
      };
    });

    if (_.isUndefined($graphContainer.highcharts())) {
      // Set up a new graph
      $graphContainer.highcharts({
        chart: {
          // This animates updating an existing graph with new data
          animation: {
            duration: UPDATE_ANIMATION_MS
          },
          type: "area",
          backgroundColor: "transparent",
          spacingTop: 2,
          spacingBottom: 2,
          spacingLeft: 2,
          spacingRight: 2
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
            lineColor: "#FFFFFF",
            lineWidth: 1,
            enableMouseTracking: false,
            marker: false,
            // This animates initializing a new graph
            animation: {
              duration: SWAP_ANIMATION_MS
            }
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

  $(document).ready(function () {
    var setupProgressGraphs = function (topLevelIndicator) {
      // If we've been given a specific top-level indicator, we want to set up
      // progress graphs for children of just that indicator. Otherwise, we'll
      // set up all visible indicators that need progress graphs
      var $graphGroups = $(".progress-indicators .top-level").not(".fade");

      if (!_.isUndefined(topLevelIndicator)) {
        $graphGroups = $graphGroups.filter("." + topLevelIndicator);
      }

      $graphGroups.each(function () {
        var $topLevel = $(this);
        var indicator = $topLevel.find(".indicator-summary-panel").data("indicator");
        var $group = $topLevel.
                     siblings("[data-indicator-parent='" + indicator + "']").
                     find(".indicator-summary-panel");

        $group.each(function (i) {
          var $thisPanel = $(this);
          var $nextPanel = $($group.get(i + 1));
          var $progressGraph = $thisPanel.find(".progress-graph");

          // If there is no next graph, bail out
          if ($nextPanel.length === 0) {
            return;
          }

          // Create a progress graph if there isn't one already
          if ($progressGraph.length === 0) {
            $progressGraph = $("<div>").addClass("progress-graph");
            $thisPanel.prepend($progressGraph);
          }

          // Draw progress between this graph and the next one in a wave from
          // left to right, to emphasize passage of time between assessments
          setTimeout(function () {
            drawGraph(
              $progressGraph,
              $thisPanel.data("summary-data"),
              $nextPanel.data("summary-data")
            );
          }, i * SWAP_ANIMATION_MS);
        });
      });
    };

    $(window).on("indicators:graphs-updating", function () {
      setupProgressGraphs();
    });

    // When the user picks another assessment to view we want the progress
    // graphs to animate horizontally, but existing graphs animate vertically.
    // We just delete the existing progress graphs and draw new ones to get the
    // initial horizontal animation
    $(window).on("indicators:swapped", function (_event, event_data) {
      $(".progress-indicators").
        find("[data-indicator-parent='" + event_data.indicator + "']").
        find(".progress-graph").
        remove();
      setupProgressGraphs(event_data.indicator);
    });
  });
})();
