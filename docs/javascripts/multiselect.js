"use strict";

window.load({
  controllers: {
    schools: ["show"],
    students: ["index"],
    groups: ["show"],
    lists: ["show"]
  }
}, function () {
  $(document).ready(function () {
    var $navbar = $(".navbar");
    var $selectVisibleBtn = $navbar.find("#select-visible");
    var $selectAllBtn = $navbar.find("#select-all");
    var $cancelBtn = $navbar.find("#cancel-selection");
    var $actionButtons = $navbar.find(".action-button");
    var $addToGroupBtn = $navbar.find("#add-to-group");
    var $removeFromGroupBtn = $navbar.find("#remove-from-group");
    var $notifications = $navbar.find(".notifications");

    var $addToGroupModal = $("#set-student-lists");
    var $addToGroupForm = $addToGroupModal.find("#set-student-lists-form");
    var $removeFromGroupModal = $("#remove-students-from-group");
    var $removeFromGroupForm = $removeFromGroupModal.find("form");

    var studentPreviewTemplate = _.template(
      $("#add-student-preview-template").html()
    );
    var nTotal;
    var selected;
    var notificationsTimeout;

    var pluralize = function (number, noun) {
      return number.toLocaleString() + " " +
             noun + (number !== 1 ? "s" : "");
    };

    var selectedIds = function () {
      var ids = [];
      $.each(selected, function (key, value) {
        if (value === true) {
          ids.push(key);
        }
      });
      return ids;
    };

    // Restore selection interface to its initial state
    var reset = function () {
      // Get up-to-date counts and text
      nTotal = window.gon.all_student_ids.length;
      $selectAllBtn.find(".total").text(window.gon.select_all_text);
      $cancelBtn.text("Clear");

      // Select nothing
      selected = { length: 0 };
      $(".selectable").removeClass("selected");

      // Exit selection mode
      $navbar.removeClass("selecting");

      // Initialize click handlers
      initializeVisible();
    };

    // Select one or more ID numbers
    // @param ids [Array<String>]
    var select = function (ids) {
      $.each(ids, function (_, id) {
        if (!selected[id]) {
          selected[id] = true;
          selected.length++;
        }
      });

      if (selected.length > 0) {
        $actionButtons.removeClass("disabled");
      }
    };

    // De-select a single ID number
    // @param id [String]
    var deselect = function (id) {
      if (selected[id]) {
        delete selected[id];
        selected.length--;

        if (selected.length === 0) {
          $actionButtons.addClass("disabled");
          reset();
        }
      }
    };

    // Update the text showing how many items are currently selected, along with
    // the various "select all" controls
    var updateCount = function () {
      $navbar.find("#count").html(
        pluralize(selected.length, "student") + " selected"
      );
      updateControls();
    };

    // Update the various "select all" controls based on current selection and
    // how many items are available overall
    var updateControls = function () {
      var $selectable = $(".selectable");
      var nVisible = $selectable.length;
      var nVisibleSelected = $selectable.filter(".selected").length;

      if (nVisibleSelected >= nVisible) {
        $selectVisibleBtn.hide();
        if (selected.length < nTotal) {
          $selectAllBtn.show();
        } else {
          $selectAllBtn.hide();
        }
      } else {
        $selectAllBtn.hide();
        $selectVisibleBtn.show();
      }
    };

    // Update visuals on non-selected selectable items to reflect current
    // internal selection state
    var updateNewlyVisible = function () {
      $(".selectable:not(.selected)").each(function () {
        var $this = $(this);
        if (selected[$this.data("selectable-id")]) {
          $this.addClass("selected");
        }
      });
    };

    // Add click handler to all visible selectable items. Init state is tracked
    // per item to prevent attachment of multiple conflicting handlers
    var initializeVisible = function () {
      $(".selectable").each(function () {
        var $this = $(this);
        if (!this.selectionInitialized) {
          $this.click(function () {
            var id = $this.data("selectable-id");

            if ($this.hasClass("selected")) {
              $this.removeClass("selected");
              deselect(id);
            } else {
              $this.addClass("selected");
              select([id]);
              $navbar.addClass("selecting");
            }

            updateCount();
          });
          this.selectionInitialized = true;
        }
      });
    };

    var buttonToModal = function ($this, $modal, successFn) {
      var ids;

      if ($this.hasClass("disabled")) {
        return false;
      }

      ids = selectedIds();

      return $.ajax($this.data("action"), {
        method: "POST",
        data: JSON.stringify({ student_ids: ids }),
        contentType: "application/json",
        dataType: "json"
      }).success(function (response) {
        var $totalCont = $modal.find("#total");
        var $previewCont = $modal.find("#preview");
        var $extraCont = $modal.find("#extra");
        var $studentIdsInput = $modal.find("#student-ids");
        var nExtra = ids.length - response.preview.length;

        // If we were given an additional success callback, call it here
        if (_.isFunction(successFn)) {
          successFn(response);
        }

        // Store JSON blob of student IDs in the form. Unlike in the AJAX call
        // above, this needs to be parsed on the backend; according to W3C
        // standards, it isn't possible to set the Content-Type header for a
        // regular HTML form to "application/json", which would be necessary for
        // Rails to automatically parse this value
        $studentIdsInput.val(JSON.stringify(ids));

        // Set text for "N student(s) selected" in modal sidebar
        $totalCont.html(pluralize(ids.length, "student"));

        // Render templates for selected student preview
        $previewCont.empty();
        $.each(response.preview, function (_, student) {
          $previewCont.append(studentPreviewTemplate(student));
        });

        // Show/hide "N more..." text in modal sidebar
        if (nExtra > 0) {
          $extraCont.show().find("span").html(nExtra);
        } else {
          $extraCont.hide();
        }

        // Show the modal
        $modal.modal("show");
      }).fail(function () {
        notify(
          "There was a problem processing your request. Please try again."
        );
      });
    };

    var notify = function (text) {
      $notifications.html(text);
      $notifications.css("opacity", 1); // opacity animates, display doesn't
      clearTimeout(notificationsTimeout);
      notificationsTimeout = setTimeout(function () {
        $notifications.css("opacity", 0);
      }, 5000);
    };

    $cancelBtn.click(reset);

    $selectVisibleBtn.click(function () {
      var $allVisible = $(".selectable");
      var visibleIds = $allVisible.map(function () {
        return $(this).data("selectable-id");
      });

      $allVisible.addClass("selected");
      select(visibleIds);
      updateCount();
    });

    $selectAllBtn.click(function () {
      select(window.gon.all_student_ids);
      updateCount();
    });

    $addToGroupBtn.click(function () {
      buttonToModal($(this), $addToGroupModal, function (response) {
        // Store which list IDs already have some of the selected students
        $addToGroupModal.data("current-list-ids", response.current_list_ids);
      });
    });

    $addToGroupForm.on("submit", function (e) {
      var studentCount = selected.length;
      var groupCount = $addToGroupForm.find("input:checked").length;

      e.preventDefault();

      $.ajax($addToGroupForm.attr("action"), {
        method: $addToGroupForm.attr("method"),
        data: $addToGroupForm.serialize()
      }).success(function () {
        notify(
          pluralize(studentCount, "student") + " added to " +
          pluralize(groupCount, "group")
        );
        $addToGroupModal.modal("hide");
        // Change the exit button text once the user has had an interaction
        $cancelBtn.text("Done");
      });
    });

    $removeFromGroupBtn.click(function () {
      buttonToModal($(this), $removeFromGroupModal);
    });

    reset();

    // This pretty much means filters or sorting changed, in which case we want
    // to initialize new items, de-select everything, and exit selection mode
    $(window).on("students-table:reloaded", function () {
      reset();
      initializeVisible();
    });

    // This means another page of students was loaded. Rather than canceling
    // selection, we want to select any of the new items that were selected
    // invisibly before (via "select all X") and update the controls
    $(window).on("students-table:page-added", function () {
      initializeVisible();
      updateNewlyVisible();
      updateCount();
    });
  });
});
