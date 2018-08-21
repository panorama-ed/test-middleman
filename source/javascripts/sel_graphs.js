"use strict";

/* global Panorama */

(function () {
  var totalHeightPx = 90;
  var spacingTopPx = 15;
  var spacingBottomPx = 15;
  var tooltipGapPx = 10;
  var scoreMin = 1;
  var scoreMax = 5;

  var drawGraph = function ($graphContainer, scores) {
    var renderTooltip = _.template(
      $("#sel-graph-tooltip-template").html()
    );

    var lastScoreIndex;
    var data = _.map(scores, function (point, i) {
      var tooltip;

      if (!_.isNull(point.score)) {
        lastScoreIndex = i;
        tooltip = renderTooltip(point);
      }

      return {
        y: point.score,
        status_class: point.status_class,
        panoramaTooltip: tooltip
      };
    });

    // Attach a visible label to the last non-null data point
    if (!_.isUndefined(lastScoreIndex)) {
      data[lastScoreIndex].dataLabels = {
        enabled: true,
        x: 3,
        y: 3,
        align: "left",
        crop: false,
        overflow: true,
        verticalAlign: "middle",
        style: {
          color: Panorama.CSSPropertyForStatus(data[lastScoreIndex].status_class, "color"),
          textShadow: "none"
        },
        formatter: function () {
          return this.y.toFixed(1);
        }
      };
    }

    $graphContainer.highcharts({
      chart: {
        type: "area",
        backgroundColor: "transparent",
        height: totalHeightPx,
        spacingTop: spacingTopPx,
        spacingBottom: spacingBottomPx,
        spacingLeft: -5,
        spacingRight: 25
      },
      credits: false,
      title: false,
      legend: {
        enabled: false
      },
      xAxis: {
        minPadding: 0.06,
        maxPadding: 0.06,
        visible: false
      },
      yAxis: {
        gridLineDashStyle: "ShortDot",
        labels: {
          y: 3,
          step: 1
        },
        min: scoreMin,
        max: scoreMax,
        minPadding: 0,
        maxPadding: 0,
        offset: -10,
        tickInterval: 1,
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
          return {
            x: point.plotX + this.chart.plotLeft - (labelWidth / 2),
            y: point.plotY + this.chart.plotTop - labelHeight - tooltipGapPx
          };
        }
      },
      series: [{
        color: "#1d8cd0",
        connectNulls: true,
        data: data,
        fillColor: "rgba(100, 100, 100, 0.2)",
        lineWidth: 1
      }]
    });
  };

  var drawGraphs = function () {
    $(".sel-data .graph").each(function (_, graphContainer) {
      var $graphContainer = $(graphContainer);
      var scores = $graphContainer.data("scores");
      drawGraph($graphContainer, scores);
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
