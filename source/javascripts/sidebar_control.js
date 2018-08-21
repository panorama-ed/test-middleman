"use strict";

$(document).ready(function () {
  $(".sidebar-hide").click(function () {
    $(this).toggleClass("sidebar-toggled");
    $("body > .content").toggleClass("sidebar-toggled");
  });
});
