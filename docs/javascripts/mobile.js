"use strict";

window.load({
  controllers: {
    students: ["index"]
  }
},
function () {
  var warnModal;

  $(document).ready(function () {
    warnModal = $("#warn-mobile-modal");

    // load mobile warning modal when necessary
    if (warnModal.css("display") !== "none") {
      warnModal.modal("show");
    }
  });
});
