"use strict";

window.load({
  controllers: {
    students: ["index", "show"],
    schools: ["show"],
    groups: ["show"],
    lists: ["show"]
  }
},
function () {
  $(document).ready(function () {
    var selectedListIds;
    var halfSelectedListIds;

    var $modal = $("#set-student-lists");
    var $setStudentListsForm = $("#set-student-lists-form");
    var $createListOrSave = $("#create-list-or-save");
    var $showCreateNewList = $("#show-create-new-list");

    // Buttons and inputs within the form for creating a new list
    var $createNewList = $modal.find(".creation-form");
    var $cancelCreateNewList = $createNewList.find(".cancel-create");
    var $submitCreateNewList = $createNewList.find(".submit-create");
    var $createdListName = $createNewList.find("#created-list-name");
    var $errorBox = $createNewList.find(".alert-danger");
    var $saveListsButton = $setStudentListsForm.find("[type=submit]");
    var creationEndpoint = $createNewList.data("creation-endpoint");

    // List of lists that we can render
    var availableLists = _.clone(window.gon.available_lists);

    // UL of all lists that user can select from
    var $availableListsDisplay = $setStudentListsForm.find("ul");

    // Template for rendering elements inside of $availableListsDisplay
    var $availableListTemplate = $("#available-student-list-template");
    var availableListTemplate;

    // Run the template on the provided list data and then append it into
    // $availableListsDisplay
    //
    // @param listData [Object] list data directly from the server
    var renderAvailableList = function (listData) {
      var listId = listData.list_id;
      var isChecked = _.includes(selectedListIds, listId);
      var isHalfChecked = _.includes(halfSelectedListIds, listId);

      listData = _.defaults(
        { is_checked: isChecked, is_half_checked: isHalfChecked },
        listData
      );

      $availableListsDisplay.append(availableListTemplate(listData));
    };

    // Toggle the view on the bottom of the lists modal (its two modes are 1.
    // buttons to allow the user to submit the form 2. a form for creating
    // new lists)
    var toggleCreationVisibility = function () {
      $createListOrSave.toggleClass("hide");
      $createNewList.toggleClass("hide");
      $createdListName.val("");
      $errorBox.addClass("hide");
    };

    if ($availableListTemplate.length > 0) {
      availableListTemplate = _.template($availableListTemplate.html());
    }

    $cancelCreateNewList.click(toggleCreationVisibility);
    $showCreateNewList.click(function (e) {
      e.preventDefault();
      toggleCreationVisibility();
      $createdListName.focus();
    });

    // Make the AJAX request to create a new list. If successful, render
    // the newly created list. If not, render the errors returned by the
    // server.
    $createNewList.on("submit", function (e) {
      var createdListName = $createdListName.val();

      e.preventDefault();

      $.post(creationEndpoint, { list: { name: createdListName } }).
        done(function (response) {
          var newList = response.list;
          availableLists.push(newList);
          selectedListIds.push(newList.list_id);
          renderAvailableList(newList);
          toggleCreationVisibility();
          $saveListsButton.focus();
        }).
        fail(function (response) {
          $errorBox.removeClass("hide");
          $errorBox.html(response.responseJSON.errors.join("<br>"));
        });
    });

    $modal.on(
      "show.bs.modal",
      function (e) {
        // we need to fill in the list of student_list_ids to know which
        // lists are checked in the modal. We want to reset this list
        // every time the modal is opened so that if a user creates
        // a list, cancels the modal, and then reopens it, the list isn't
        // erroneously checked.
        selectedListIds = _.clone(window.gon.student_list_ids || []);

        // If the modal is handling bulk addition of students to lists, which
        // available lists are "half selected" (at least one selected student
        // already belongs to it) is stored in the modal element's data. If the
        // modal is for just a single student, half selection isn't possible
        halfSelectedListIds = $modal.data("current-list-ids") || [];

        // Whenever the modal is shown, clear out the list of available lists and
        // repopulate it so the checkmarks don't persist when the user doesn't
        // save them.
        $availableListsDisplay.empty();

        _.each(availableLists || [], renderAvailableList);
      }
    );
  });
});
