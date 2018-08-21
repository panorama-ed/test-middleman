"use strict";

/* global Highcharts, gon, Sortable */

window.load({
  controllers: {
    schools: ["show"]
  }
}, function () {
  var attendance_goal = gon.attendance_goal;
  var passing_color = "#5abd3c"; // $green in Sass
  var average_passing_color = "#79cc60"; // $green-light in Sass
  var failing_color = "#ffc31d"; // $indicator-at-risk-color in Sass
  var goal_line_color = "#9b9b9b"; // $light-grey in Sass

  /**
   * Calculates SMA with first period dynamic length until it has enough data
   * (https://en.wikipedia.org/wiki/Moving_average#Simple_moving_average)
   * @param  {[Array]} data   data of points to calculate SMA over
   * @param  {[Integer]} period time interval over which to take average
   * @return {[Array]} SMA for data
   */
  var SMAWithDynamicPeriod = function (data, period) {
    var n = 0.0;
    var tot = 0.0;
    var popIndex = 0;

    return _.map(data, function (point, index) {
      if (index <= (period - 1)) {
        tot += point[1];
        n++;

        return [point[0], tot / n];
      } else {
        // start subtracting popIndex and adding pushIndex
        tot = tot - data[popIndex][1] + point[1];
        popIndex++;
        return [point[0], tot / period];
      }
    });
  };

  Highcharts.setOptions({
    lang: {
      rangeSelectorZoom: ""
    },
    chart: {
      style: {
        fontSize: "inherit",
        fontFamily: "inherit",
        fill: "#4a4a4a"
      }
    }
  });

  // Create the chart
  $("#attendance-graph").highcharts("StockChart", {
    plotOptions: {
      series: {
        lineWidth: 3,
        states: {
          hover: {
            lineWidth: 4
          }
        }
      }
    },
    rangeSelector: {
      allButtonsEnabled: false,
      inputBoxHeight: 23,
      inputBoxWidth: 100,
      inputEditDateFormat: "%m/%d/%Y",
      inputPosition: {
        y: -5
      },
      buttonPosition: {
        y: -5
      },
      buttonTheme: {
        height: 15,
        padding: 6,
        fontSize: "1.3rem",
        style: {
          color: "inherit"
        },
        states: {
          select: {
            fill: "#e0e0e0",
            style: {
              color: "inherit"
            }
          }
        }
      },
      buttons: [{
        type: "week",
        count: 1,
        text: "1w"
      }, {
        type: "month",
        count: 1,
        text: "1m"
      }, {
        type: "month",
        count: 3,
        text: "3m"
      }, {
        type: "month",
        count: 6,
        text: "6m"
      }, {
        type: "all",
        text: "YTD"
      }],
      selected: 4
    },

    credits: {
      enabled: false
    },

    xAxis: {
      ordinal: false,
      type: "datetime"
    },

    yAxis: {
      max: 100,
      showLastLabel: true,
      labels: {
        formatter: function () {
          return this.value + "%";
        }
      },
      plotLines: [{
        label: {
          text: "Goal: " + attendance_goal + "% ",
          style: {
            color: "inherit"
          },
          x: 8,
          y: 15
        },
        color: goal_line_color,
        width: 2,
        value: attendance_goal,
        dashStyle: "solid"
      }]
    },

    series: [
      {
        name: "On this day",
        id: "attendance",
        data: gon.daily_attendance_percentages,
        threshold: attendance_goal,
        negativeColor: failing_color,
        color: passing_color,
        tooltip: {
          valueDecimals: 1,
          valueSuffix: "%"
        }
      },
      {
        threshold: attendance_goal,
        negativeColor: failing_color,
        color: average_passing_color,
        dashStyle: "dash",
        name: "30-day average",
        data: SMAWithDynamicPeriod(gon.daily_attendance_percentages, 30),
        tooltip: {
          valueDecimals: 1,
          valueSuffix: "%"
        }
      }
    ],

    navigator: {
      maskFill: "rgba(17, 142, 184, 0.3)",
      xAxis: {
        labels: {
          format: "{value:%b '%y}"
        }
      }
    },
    // scrollbar styled away instead of disabled to maintain live-scroll
    // re-rendering behavior
    scrollbar: {
      height: 1,
      buttonArrowColor: "white"
    }
  });

  $(document).ready(function () {
    var $absentStudentsTable = $(".absent-students");
    var $birthdayTable = $(".birthday-table");
    var gradeLevelSorterName = "grade_level";

    // Add our new custom grade sorter
    Sortable.types.push({
      name: gradeLevelSorterName,
      defaultSortDirection: "ascending",
      match: function () {
        // This sorter can only be used explicitly
        return false;
      },
      compare: function (as, bs) {
        // copy-pasta from here: https://stackoverflow.com/questions/4373018/sort-array-of-numeric-alphabetical-elements-natural-sort
        var a;
        var b;
        var al;
        var bl;
        var a1;
        var b1;
        var rx = /(\d+)|(\D+)/g;
        var rd = /\d+/;

        al = String(as).toLowerCase();
        bl = String(bs).toLowerCase();
        a = al.match(rx);
        b = bl.match(rx);

        // If letter starts with k, sort above int and after all alpha chars
        if (al[0] == "k" && bl[0] == "k") {
          return al < bl ? 1 : -1;
        }
        if (al[0] == "k") {
          return rd.test(bl[0]) ? -1 : 1;
        }
        if (bl[0] == "k") {
          return rd.test(al[0]) ? 1 : -1;
        }
        while (a.length && b.length) {
          a1 = a.shift();
          b1 = b.shift();
          if (rd.test(a1) || rd.test(b1)) {
            if (!rd.test(a1)) {
              return -1;
            }
            if (!rd.test(b1)) {
              return 1;
            }
            if (a1 != b1) {
              return a1 - b1;
            }
          } else if (a1 != b1) {
            return a1 > b1 ? 1 : -1;
          }
        }
        return a.length - b.length;
      }
    });

    // Allow our Sortable table to be re-initialized
    $absentStudentsTable.attr("data-sortable-initialized", null);
    $birthdayTable.attr("data-sortable-initialized", null);

    // Switch on columns that use the custom sorter type
    $("th[data-sortable-type=" + gradeLevelSorterName + "]").
      each(function (_, column) {
        $(column).attr("data-sortable", null);
      });

    // Register our custom type and re-initialize Sortable
    Sortable.setupTypes(Sortable.types);
    Sortable.init();

    // Sort by table by column marked with initial-sort
    $(".initial-sort").click();
    $(".initial-birthday-sort").click().click();

    $(".show-more").click(function (e) {
      $(this).parents("table").toggleClass("abbreviated");
    });
  });
});
