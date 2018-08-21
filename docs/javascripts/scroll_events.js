"use strict";

/* A quick little jQuery plugin to monitor for scroll events on the page
   and allow us to fire events when elements scroll in and out of the page or
   change prominence based on user scrolling.
 */

(function ($) {
  // A timer so we can debounce scroll events to keep scroll jitter from
  // causing duplicate events
  var _debounce_timeout;

  // The elements that we are watching for scroll in/out events:
  var _listeners = [];

  // The groups of elements from which we are choosing a prominent element.
  var _chooseGroups = [];

  /***
   * Builds a function for checking the visibility of individual elements on the
   * page based on its scroll position
   * @returns {Object} An object containing various types of scroll position
   *  checkers.
   */
  function buildScrollChecker() {
    var $window = $(window);
    var docViewTop = $window.scrollTop();
    var docViewBottom = docViewTop + $window.height();

    return {
      /***
       * Checks whether an element is visible on the page according to scroll
       * position
       * @param $element [JQueryElement] to check
       * @returns {boolean} true, if visible.
       */
      checkElementVisibility: function ($element) {
        var elementTop = $element.offset().top;
        var elementBottom = elementTop + $element.height();

        return (elementBottom >= docViewTop) && (elementTop <= docViewBottom);
      },
      /***
       *
       * @param $elements: Array<JQueryElement> Elements from which to pick the
       * most prominent on the page.
       */
      pickProminentElement: function ($elements) {
        var elementsOrderByProminence =  $elements.map(function () {
            var $element = $(this);
            var elementTop = $element.offset().top;
            var elementBottom = elementTop + $element.height();

            var overlapsPage =
              (elementBottom >= docViewTop) && (elementTop <= docViewBottom);

            if (!overlapsPage) {
              return null;
            } else {
              return {
                element: $element,
                prominence: Math.abs(elementTop - docViewTop)
              };
            }
          }).filter(function () {
            return !!this;
          }).sort(function (x,y) {
            return x.prominence - y.prominence;
          });

        if (elementsOrderByProminence.length === 0) {
          return null;
        } else { return elementsOrderByProminence[0].element; }
      }
    };
  }

  /***
   * Checks visibility of all elements that have been configured and calls event
   * handlers when an elements visibility has changed.
   * @param {event} The PageScrolled event that triggered this check.
   */
  function fireScrollEvents(event) {
    var checkElementVisibility = buildScrollChecker().checkElementVisibility;

    $.each(_listeners, function () {
      if (checkElementVisibility(this.element)) {
        // The element is visible on the page currently.
        if (!this.wasVisible) {
          // The element was not visible on the last check
          this.wasVisible = true;

          // Fire event
          this.element.trigger("scrollin", event);
        }
      } else {
        // The element is not visible on the page currently.
        if (this.wasVisible) {
          // The element was visible on the last check
          this.wasVisible = false;

          // Fire event
          this.element.trigger("scrollout", event);
        }
      }
    });
  }

  function fireProminenceEvents(event) {
    var pickProminentElement = buildScrollChecker().pickProminentElement;
    $.each(_chooseGroups, function () {
      var prominentElement = pickProminentElement(this.elements);
      if (!prominentElement) {
        this.lastProminentElement = null;
      } else if (!this.lastProminentElement || (this.lastProminentElement[0] !== prominentElement[0])) {
        this.lastProminentElement = prominentElement;
        prominentElement.trigger("scrollProminent", event);
      }
    });
  }

  // Register a listener in the window element for scroll events
  $(window).on("scroll", function (event) {
    if (!_debounce_timeout) {
      // The plugin has not received a scroll event in a little while
      if (_listeners.length > 0 || _chooseGroups.length > 0) {
        // The plugin has elements that it is watching for scroll in and out, so
        // set a timeout to fire scroll events. This has the effect of
        // consolidating tons of scroll events, that may have contradicting
        // results on the page, into fewer checks for scroll position.
        _debounce_timeout = setTimeout(function () {
          fireScrollEvents(event);
          fireProminenceEvents(event);
          _debounce_timeout = null;
        }, 100);
      }
    }
  });

  // Register a jQuery extension to listen for scrollin/scrollout events
  $.fn.listenScroll = function () {
    var checkElementVisibility = buildScrollChecker().checkElementVisibility;

    // Input from jQuery could be a selector with > 1 element:
    this.each(function () {
      var $el = $(this);
      var currentlyVisible = checkElementVisibility($el);

      _listeners.push({
        element: $el,
        wasVisible: currentlyVisible
      });
    });

    return this; // Plugin is chainable
  };

  // Register a jQuery extension to check if an element is visible
  $.fn.isScrolled = function () {
    var checkElementVisibility = buildScrollChecker().checkElementVisibility;

    if (this.length === 1) {
      return checkElementVisibility(this);
    }

    this.map(function () {
      var $el = $(this);
      return checkElementVisibility($el);
    });
  };


  // Register a jQuery extension to, given a group of elements, choose which one
  // is most prominent on the page and issue a "scrollProminent" event on that
  // element.
  $.fn.scrollChoose = function () {
    var prominentElement = buildScrollChecker().pickProminentElement(this);

    if (prominentElement) {
      prominentElement.trigger("scrollProminent");
    }

    _chooseGroups.push({
      lastProminentElement: prominentElement,
      elements: this
    });

    return this;
  };
})(jQuery);
