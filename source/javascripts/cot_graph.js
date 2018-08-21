"use strict";

/* global Panorama */

$(document).ready(function () {
  window.load(
    {
      controllers: {
        students: ["show"]
      }
    },
    function () {
      var HIGHCHARTS_GREY = "#e6e6e6"; // Highchart gridline color
      var GREY_LABEL = "#9b9b9b"; // $light-grey in styleguide
      var LABEL_FONT_SIZE = "13px";

      var alphaYAxis = function (yAxisLabels) {
        return {
          min: 0,
          max: yAxisLabels.length - 1,
          endOnTick: false,
          startOnTick: false,
          minPadding: 0.1,
          labels: {
            formatter: function () {
              return yAxisLabels[this.value];
            },
            style: {
              fontSize: LABEL_FONT_SIZE
            }
          },
          tickInterval: 1,
          title: false,
          gridLineDashStyle: "longdash"
        };
      };

      var numericYAxis = function (yAxisLabels) {
        var configurations = {};

        if (_.isEmpty(yAxisLabels)) {
          configurations = {
            gradeMin: 0,
            gradeMax: 100,
            tickInterval: 50
          };
        } else {
          configurations = {
            gradeMin: parseInt(yAxisLabels[0]),
            gradeMax: parseInt(yAxisLabels[yAxisLabels.length - 1]),
            tickInterval: 1
          };
        }

        return {
          max: configurations.gradeMax,
          min: configurations.gradeMin,
          endOnTick: false,
          startOnTick: false,
          tickInterval: configurations.tickInterval,
          title: false,
          gridLineDashStyle: "longdash",
          labels: {
            formatter: function () {
              if (this.value > configurations.gradeMax) { // No labels for extra credit, yes for below gradeMin
                return "";
              } else {
                return this.value;
              }
            },
            style: {
              fontSize: LABEL_FONT_SIZE
            }
          }
        };
      };

      var buildSeriesData = function (gradeData, gradeMap, yAxisLabels) {
        var series = [];
        var colorOptions;
        var maxGrade = -Infinity;
        var numericYAxis = allNumeric(yAxisLabels) || _.isEmpty(yAxisLabels);

        _.each(Object.keys(gradeData), function (gradeSlot) {
          var lastGradeIndex = -1;
          var lastDataPoint;
          var data = _.map(gradeData[gradeSlot], function (datum, i) {
            var grade = parseFloat(datum.grade);
            var yValue;

            // Getting last non-null index
            if (!_.isNull(datum.grade)) {
              lastGradeIndex = i;
            }

            if (numericYAxis) {
              yValue = grade;
            } else if (!_.isEmpty(gradeMap)) {
              yValue = gradeMap[datum.normalized_grade]; // Mapping datum to corresponding yValue for graph
            }

            return {
              y: yValue,
              x: Date.parse(datum.x_coord),
              grade: datum.grade,
              as_of: datum.as_of,
              gradeSlot: datum.grade_slot,
              color: Panorama.CSSPropertyForStatus(datum.status_class_name, "color"),
              panoramaTooltip: _.template($("#cot-tooltip-template").html())($.extend({}, datum)),
              marker: {
                enabled: false, // by default, don't show markers
                symbol: "circle",
                radius: 3
              }
            };
          });

          if (!!data.reduce (function (a,b) { return (a.y === b.y) ? a : NaN; })) {
            colorOptions = data[0].color;
          } else {
            colorOptions = {
              linearGradient: { x1: 0, x2: 1, y1: 0, y2: 0 },
              stops: _.map(data, function (point, i) {
                // COT graph is unevenly spaced: this takes this into consideration
                // and colors the line to be the next point's color. See NDS-2056
                return [
                  (point.x - data[0].x) / (data[data.length - 1].x - data[0].x),
                  point.color
                ];
              })
            };
          }

          // Enable markers for single points
          if (data.length === 1) {
            data[0].marker = {
              enabled: true,
              symbol: "circle"
            };
          }

          // Enable marker and data label for last non-null point if lastGradeIndex found
          if (lastGradeIndex > -1) {
            lastDataPoint = data[lastGradeIndex];

            lastDataPoint.marker = {
              enabled: true,
              symbol: "circle",
              radius: 6
            };

            lastDataPoint.dataLabels = {
              enabled: true,
              x: 3,
              y: 3,
              align: "left",
              crop: false,
              overflow: true,
              verticalAlign: "middle",
              style: {
                color: lastDataPoint.color ? lastDataPoint.color : GREY_LABEL,
                fontSize: "15px",
                textShadow: "none",
                textOutline: "none"
              },
              formatter: function () {
                return lastDataPoint.grade;
              }
            };
          }

          series.push({
            color: colorOptions,
            connectNulls: false,
            data: data,
            lineWidth: 3,
            step: true,
            clip: false // See https://stackoverflow.com/questions/36604015/stop-highcharts-from-cropping-the-series-line-between-points-on-the-x-axis
          });
        });

        return {
          series: series,
          max: maxGrade
        };
      };

      var isNumeric = function (str) {
        return !isNaN(str);
      };

      var allNumeric = function (arr) {
        return arr.every(isNumeric);
      };

      var drawSeries = function ($graphContainer, seriesData, yAxisLabels) {
        var yAxis = _.isEmpty(yAxisLabels) || allNumeric(yAxisLabels) ? numericYAxis(yAxisLabels) : alphaYAxis(yAxisLabels);

        var dividerLines = _.map(window.gon.mp_end_dates, function (d) {
          return {
            dashStyle: "longdash",
            value: Date.parse(d),
            color: HIGHCHARTS_GREY,
            width: 1
          };
        });

        $graphContainer.highcharts({
          credits: false,
          title: false,
          chart: {
            marginRight: 35,
            marginLeft: 50,
            backgroundColor: null,
            style: {
              fontFamily: "\"Gotham SSm A\", \"Gotham SSm B\""
            }
          },
          legend: {
            enabled: false
          },
          xAxis: {
            type: "datetime",
            startOnTick: true,
            endOnTick: true,
            max: Date.parse(window.gon.last_mp_end),
            min: Date.parse(window.gon.first_mp_start),
            lineWidth: 0,
            tickLength: 0,
            labels: {
              formatter: function () {
                return ""; // Override default Highcharts labels
              }
            },
            crosshair: {
              snap: true,
              width: 0
            },
            plotLines: dividerLines
          },
          yAxis: yAxis,
          tooltip: {
            hideDelay: 0,
            useHTML: true,
            shape: "square",
            backgroundColor: "transparent",
            borderWidth: 0,
            padding: 0,
            shadow: false,
            style: {
              padding: 0,
              fontFamily: "inherit",
              fontSize: "inherit",
              color: "inherit"
            },
            formatter: function () {
              return this.point.panoramaTooltip;
            }
          },
          series: seriesData.series
        });
      };

      var drawGraph = function () {
        $(".cot-graph").each(function (__, graphContainer) {
          var $graphContainer = $(graphContainer);
          var preparedGrades = $graphContainer.data("grades");
          var gradeMap = $graphContainer.data("letter-grade-map");
          var yAxisLabels =
            _.map($graphContainer.data("y-axis-labels"), function (grades) {
              return grades.join("/");
            });

          var seriesData = buildSeriesData(preparedGrades, gradeMap, yAxisLabels);
          drawSeries($graphContainer, seriesData, yAxisLabels);
        });
      };

      drawGraph();

      // Send Heap COT graph hover event when hovering over the <g> SVG group
      // that contains all Highcharts series on a given COT graph
      if (window.heap !== undefined) {
        $(".cot-graph .highcharts-series-group").mouseover(function () {
          window.heap.track("Hover Over COT Graph");
        });
      }
    });
});
