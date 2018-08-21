"use strict";

/* global Panorama */

window.load("students#show", function () {
  $(document).ready(function () {
    var MAX_CUSTOM_SUPPORTS = 3;

    var $section = $(".support-planning-form");
    var $form = $section.find("form");
    var $submitButton = $form.find("[type=submit]");
    var $customSupports = $form.find("#custom-support-actions");
    var styleCustomSupport;
    var maybeAddNewCustomSupportField;
    var initCustomSupportFields;

    var nSelectedActions = function () {
      return $form.
             find(".action input:checked, .custom-support.selected").
             get().length;
    };

    var setDisabled = function (disabled) {
      if (disabled) {
        $form.addClass("disabled");
        $submitButton.attr("disabled", true);
      } else {
        $form.removeClass("disabled");
        $submitButton.attr("disabled", null);
      }
    };

    var checkDisabled = function () {
      setDisabled(nSelectedActions() === 0);
    };

    $form.find(".action input").change(checkDisabled);

    $form.submit(function () {
      if ($form.hasClass("disabled")) {
        return false;
      }

      setDisabled(true);
      $section.addClass("loading");
      Panorama.loadingWave($section.find("h2"));
    });

    $form.on("reset", function () {
      setDisabled(true);
      $customSupports.find("textarea").removeClass("selected");
    });

    styleCustomSupport = function () {
      var $this = $(this);
      if ($this.val().length > 0) {
        $this.addClass("selected");
      } else {
        $this.removeClass("selected");
      }
    };

    maybeAddNewCustomSupportField = function () {
      var $textarea;
      if ($customSupports.find("textarea").length < MAX_CUSTOM_SUPPORTS) {
        $textarea = $(this).clone().val("").removeClass("selected in");
        initCustomSupportFields($textarea);
        $customSupports.append($textarea);
        // Fade in the new textarea. This needs to be wrapped in a timeout
        // or the CSS transition won't do anything
        setTimeout(function () { $textarea.addClass("in"); }, 0);
      }
    };

    initCustomSupportFields = function ($fields) {
      $fields.
        change(styleCustomSupport).
        change(checkDisabled).
        one("keydown", maybeAddNewCustomSupportField);
    };

    initCustomSupportFields($customSupports.find("textarea"));
  });
});
