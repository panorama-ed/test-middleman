"use strict";

/* global Panorama */

(function () {
  var totalHeightPx = 160;
  var spacingTopPx = 10;
  var spacingBottomPx = 15;
  var tooltipGapPx = 10; // Experimentally derived
  var plotMidwayYPx = 58; // Experimentally derived

  // Specific graph configuration for each type of assessment we support. Keys
  // are assessment_types, as supported by Indicators::AssessmentIndicator.
  // Each value is an object with the following keys:
  //   scoreMin [Integer]      Lowest possible score, for Y axis limits
  //   scoreMax [Integer]      Highest possible score, for Y axis limits
  //   tickInterval [Integer]  Y axis tickInterval, same units as above
  var assessmentTypes = {
    star: {
      scoreMin: 0,
      scoreMax: 1400,
      tickInterval: 200
    },
    nwea_map: {
      scoreMin: 100,
      scoreMax: 350,
      tickInterval: 25
    },
    // min/max values from i-Ready documentation:
    // http://www.aps.edu/assessment/i-ready-documents/i-ready-placement-tables
    iready: {
      scoreMin: 0,
      scoreMax: 800,
      tickInterval: 100
    },
    // aMath: "lower bound 150, higher bound of 250"
    // https://charts.intensiveintervention.org/chart/academic-screening/fast-0
    fastbridge_aMath: {
      scoreMin: 150,
      scoreMax: 250,
      tickInterval: 25
    },
    // aReading: "lower bound of 350 and a higher bound of 650" (page 48)
    // https://panoramaed.slack.com/files/U04G15YG1/FBAPKB7MM/formative_assessment_system_for_teachers__fast__.pdf
    fastbridge_aReading: {
      scoreMin: 350,
      scoreMax: 650,
      tickInterval: 50
    },
    // min/max values are a guess based on max score seen of 321
    aimsweb: {
      scoreMin: 0,
      scoreMax: 350,
      tickInterval: 50
    }
  };

  var drawGraph = function ($graphContainer) {
    var scores = $graphContainer.data("scores");
    var type = $graphContainer.data("assessment-type");
    var name = $graphContainer.data("assessment-name");
    // TODO: remove this hardcoded assessment vendor name and replace with a
    // more programmatic approach
    var assessmentTypeLookup = type === "fastbridge" ? type + "_" + name : type;
    var assessmentType = assessmentTypes[assessmentTypeLookup];
    var scoreMin = assessmentType.scoreMin;
    var scoreMax = assessmentType.scoreMax;

    var renderTooltip = _.template(
      $("#assessment-tooltip-template").html()
    );

    var data = _.map(scores, function (score) {
      var color = Panorama.CSSPropertyForStatus(score.status_class_name, "color");
      // Style the tooltip to point up if it's in the top half of the graph
      var showTooltipAbove = score.scaled_score <= (scoreMax - scoreMin) / 2 + scoreMin;

      var tooltip = renderTooltip($.extend({}, score, {tooltipDirection: "above"}));
      if (!showTooltipAbove) {
        tooltip = renderTooltip($.extend({}, score, {tooltipDirection: "below"}));
      }

      return {
        y: score.scaled_score,
        color: color,
        panoramaTooltip: tooltip,
        marker: {
          fillColor: color,
          states: {
            hover: {
              fillColor: color
            }
          }
        }
      };
    });

    var xLabels = _.map(scores, function (score) {
      return score.date;
    });

    var gradientStops = _.map(data, function (point, i) {
      return [
        i / (data.length - 1),
        point.color
      ];
    });

    $graphContainer.highcharts({
      chart: {
        type: "line",
        backgroundColor: "transparent",
        height: totalHeightPx,
        spacingTop: spacingTopPx,
        spacingBottom: spacingBottomPx,
        style: {
          fontFamily: "inherit"
        }
      },
      credits: false,
      title: false,
      legend: {
        enabled: false
      },
      xAxis: {
        categories: xLabels,
        lineWidth: 0,
        tickLength: 0
      },
      yAxis: {
        min: scoreMin,
        max: scoreMax,
        tickInterval: assessmentType.tickInterval,
        title: false
      },
      tooltip: {
        hideDelay: 0,
        useHTML: true,
        shape: "square",
        backgroundColor: "transparent",
        borderWidth: 0,
        shadow: false,
        style: {
          padding: 0,
          fontFamily: "inherit",
          fontSize: "inherit",
          color: "inherit"
        },
        formatter: function () {
          return this.point.panoramaTooltip;
        },
        positioner: function (labelWidth, labelHeight, point) {
          // Move the tooltip below the point if it's in the top half of the graph
          var positionModifier = 0;
          if (point.plotY < plotMidwayYPx) {
            positionModifier = 120;
          }
          return {
            x: point.plotX + this.chart.plotLeft - (labelWidth / 2),
            y: point.plotY + this.chart.plotTop - labelHeight - tooltipGapPx + positionModifier
          };
        }
      },
      series: [{
        color: {
          linearGradient: { x1: 0, x2: 1, y1: 0, y2: 0 },
          stops: gradientStops
        },
        marker: {
          radius: 7
        },
        data: data
      }]
    });
  };

  var drawGraphs = function () {
    $(".assessment-graph").each(function (_, graphContainer) {
      drawGraph($(graphContainer));
    });
  };

  $(document).ready(function () {
    window.load(
      {
        controllers: {
          students: ["show"]
        }
      },
      drawGraphs
    );
  });
})();
