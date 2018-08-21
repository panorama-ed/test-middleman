"use strict";

/* global Sortable, Panorama */

window.load("students#show", function () {
  $(document).ready(function () {
    // The easiest way to sort grade columns correctly is to let Sortable use
    // its internal logic to determine column type for us (numeric or grade).
    // Unfortunately, if we happen to load the page with a blank grade first,
    // Sortable will determine the column type to be alpha. We fix that here:

    // 1. Cache Sortable's default sorter
    var alphaSorter = Sortable.typesObject.alpha;

    // 2. Copy Sortable's default types order, except for the alpha sorter
    var newSortableTypes = _.select(Sortable.types, function (type) {
      return type !== alphaSorter;
    });

    // 3. Add our new grade sorter
    newSortableTypes.unshift({
      name: "grade",
      defaultSortDirection: "descending",
      match: function (a) {
        return a.length <= 2 && a.match(/^[abcdefxnp][+-]?$/i);
      },
      compare: function (a, b) {
        var sortableGrade = function (grade) {
          // Sort empty grades as the lowest (worst) possible grade
          if (!grade) {
            return "z-";
          }

          // "," sorts between + and -
          if (grade.length === 1) {
            grade = grade + ",";
          }

          return grade.toLowerCase();
        };

        var sortableA = sortableGrade(a);
        var sortableB = sortableGrade(b);

        if (sortableA < sortableB) {
          return -1;
        } else if (sortableA > sortableB) {
          return 1;
        } else {
          return 0;
        }
      }
    });

    // 4. Re-initialize types with grade and without alpha
    Sortable.setupTypes(newSortableTypes);
    // 5. Add alpha back to the type lookup
    Sortable.typesObject.alpha = alphaSorter;

    // Start with the grade column for default sort
    Sortable.init();
    $(".initial-sort").click().click();
  });

  $(document).ready(function () {
    var $body = $("body");
    var $existingNavbar = $("#default-navbar");
    var $replacementNavbarContent = $("#student-profile-navbar").
      insertAfter($existingNavbar).
      removeClass("hidden");


    // Listen for scroll events on an element near the top of the hero:
    var currentlyVisible = $("div.hero").listenScroll().on("scrollout", function () {
      $replacementNavbarContent.css("top", "0");
      $existingNavbar.css("top", "-100px");
      $body.toggleClass("two-row-navbar");
    }).on("scrollin", function () {
      $replacementNavbarContent.css("top", "");
      $existingNavbar.css("top", "");
      $body.toggleClass("two-row-navbar");
    }).isScrolled();

    if (!currentlyVisible) {
      $replacementNavbarContent.css("top", "0");
      $existingNavbar.css("top", "-100px");
      $body.toggleClass("two-row-navbar");
    }

    // Set transition property after we are all set up so that we don't animate
    // the initial state if the user begins half way down the page.
    setTimeout(function () {
      $replacementNavbarContent.addClass("animated");
      $existingNavbar.addClass("animated");
    }, 10);
  });

  $(document).ready(function () {
    var $navBubbles = $("#profile-bar-bubbles").children();

    //When a data box is prominent, highlight it:
    $(".data-box.has-indicator").on("scrollProminent", function () {
      var indicator = $(this).find("h1").attr("id");
      $navBubbles.each(function () {
        var $navBubbleContainer = $(this);
        var $navBubble = $navBubbleContainer.find(".indicator-level");
        if ($navBubbleContainer.data("indicator") === indicator) {
          $navBubbleContainer.addClass("active");
          // Wait 25 ms before reading the width of the indicator label
          // and making space. This is so that, if this is just appearing, the
          // browser has time to flow the page and assign it a width.
          setTimeout(function () {
            // Get the width of the indicator bubble label
            var textWidth = $navBubbleContainer.find(".profile-bar-indicator-label").width();

            // Add padding to the right side of the indicator bubble container that accounts
            // for the width of the indicator bubble plus any padding on the text
            // and bubble.
            $navBubble.css("paddingRight", (textWidth + 45 + 10) + "px");
          }, 25);
        } else {
          $navBubbleContainer.removeClass("active");
          $navBubble.css("paddingRight", "");
        }
      });
    }).scrollChoose();

    setTimeout(function () {
      $navBubbles.addClass("animated");
    }, 10);
  });

  $(document).ready(function () {
    function scroll(y) {
      $("html, body").animate({ scrollTop: y }, 300);
    }

    $("#profile-bar-bubbles").children().click(function () {
      var indicator = $(this).data("indicator");
      var $dataBox = $(".data-boxes").children().filter(function () {
        return $(this).find("h1").attr("id") === indicator;
      });
      scroll($dataBox.offset().top - 75);
    });
    $("#student-profile-navbar").find(".student-profile").click(function () {
      scroll(0);
    });
    $(".indicator-row").click(function () {
      scroll($(this.hash).offset().top);
    });
  });

  $(document).ready(function () {
    var contentHeight = function ($element) {
      return $element.get(0).scrollHeight -
             ($element.innerHeight() - $element.height());
    };

    $("textarea[data-autosize]").each(function () {
      var $this = $(this);

      // Use jQuery.css() first to ensure the element has a style object
      $this.css({ overflowY: "hidden", height: "auto" });

      // Apply the initial resize to the un-wrapped element. This leaves a
      // minimum height for placeholder text; jQuery.height() doesn't seem to
      this.style.height = contentHeight($this) + "px";

      $this.on("input", function () {
        $this.
          height(contentHeight($this)).
          siblings(".edit-button").
          addClass("btn-primary edited").
          // Point the "button" (really a label) at the invisible submit button
          attr("for", $this.siblings("[type=submit]").get(0).id).
          text("Save");
      });

      // apply initial resize when the support plan is expanded
      $this.parents(".support-details").on("show.bs.collapse", function () {
        setTimeout(function () { $this.height(contentHeight($this)); }, 0);
      });
    });
  });

  $(document).ready(function () {
    var ajaxInteraction = function (xhr, container, $loadingWaveContainer) {
      var $this = $(container);
      var removeLoadingWave;

      if ($this.hasClass("saving")) {
        xhr.abort();
        return;
      }

      removeLoadingWave = Panorama.loadingWave($loadingWaveContainer);
      $this.addClass("saving");

      $this.one("ajax:complete", function () {
        removeLoadingWave();
        $this.removeClass("saving");
      });
    };

    $(".delete-support-modal form").submit(function () {
      var $form = $(this);
      $form.addClass("loading");
      Panorama.loadingWave($form.find("[type=submit]"));
    });

    $(".complete-action").
      tooltip("show").
      on("ajax:beforeSend", function (_, xhr) {
        $(".complete-action").tooltip("hide");
        ajaxInteraction(xhr, this, $(this));
      }).
      on("ajax:success", function () {
        var $action = $(this);
        var $plan = $action.parents(".support-plan.data-box");
        var $actions = $plan.find(".complete-action");
        var nCompleted;

        $action.toggleClass("completed");

        nCompleted = $actions.filter(".completed").length;

        if (nCompleted === $actions.length) {
          $plan.addClass("completed");
        } else {
          $plan.removeClass("completed");
        }

        $plan.find(".completed-action-count").text(nCompleted);
      });

    $(".update-notes").
      on("ajax:beforeSend", function (_, xhr) {
        ajaxInteraction(xhr, this, $(this).find(".edit-button"));
      }).
      on("ajax:success", function () {
        var $form = $(this);
        $form.
          find(".edit-button").
          removeClass("btn-primary edited").
          // Point the "button" (really a label) at the notes text field
          attr("for", $form.find("textarea").get(0).id).
          text("Edit");
      });
  });
});
