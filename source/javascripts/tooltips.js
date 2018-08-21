"use strict";

(function () {
  // How much space should be kept between the left edge of the page and the
  // left-most edge of tooltips, in pixels
  var leftPadding = 5;
  var tooltipTemplates;

  // Process a left-opening tooltip element to ensure it doesn't display off the
  // left edge of the page
  var fixLeftTooltip = function ($e) {
    var savedTransition = $e.prop("style").transition;
    var leftOffset;

    // Clear existing position correction. Transitions also need to be cleared
    // before offset() can return an accurate value
    $e.css({ transition: "none", marginRight: "" });
    leftOffset = $e.offset().left;

    if (leftOffset < leftPadding) {
      $e.css({ marginRight: leftOffset - leftPadding });
    }

    $e.css({ transition: savedTransition });
  };

  // Fix all already-rendered left-opening tooltips on the page
  var fixLeftTooltips = function () {
    $(".popover-container.left").each(function () {
      fixLeftTooltip($(this));
    });
  };

  // Load all available tooltip templates into the tooltipTemplates object
  var loadTemplates = function () {
    if (_.isUndefined(tooltipTemplates)) {
      tooltipTemplates =
        _.reduce($("script[role=tooltip-template]"), function (templates, elem) {
          var matches = elem.id.toString().match(/^tooltip-(.+)-template$/);
          if (!_.isNull(matches)) {
            templates[matches[1]] = _.template($(elem).html());
          }
          return templates;
        }, {});
    }
  };

  // Set up all dynamic template-based tooltips on the page to render when the
  // user hovers over the container the first time
  var initTooltips = function () {
    loadTemplates();
    $("[data-tooltip-template]").mouseover(function () {
      var $this = $(this);
      var templateName = $this.attr("data-tooltip-template");
      var data;
      var tooltip;

      if (templateName) {
        // Prevent the tooltip from being initialized more than once
        $this.removeAttr("data-tooltip-template");
        if (tooltipTemplates[templateName]) {
          data = $this.data("tooltip-data");
          if (data) {
            data = $.extend(data, { "$container": $this });
            tooltip = tooltipTemplates[templateName](data);
            $this.addClass("has-popover");
            $this.prepend(tooltip);
            fixLeftTooltip($(tooltip));
          }
        }
      }
    });
  };

  $(document).ready(function () {
    initTooltips();

    // TODO: this can be removed once all pre-rendered tooltips in the
    // application are switched to use JS templates, since those fix themselves
    fixLeftTooltips();

    $(window).on("resize", fixLeftTooltips);

    // Tooltips currently only ever get loaded via AJAX in the students table,
    // so listen for that event and initialize new tooltips as necessary
    $(window).on("students-table:updated", initTooltips);
  });
})();
