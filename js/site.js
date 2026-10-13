/* Shared page behaviour: mobile menu, footer year. */
(function () {
  var toggle = document.querySelector(".menu-toggle");
  var nav = document.getElementById("site-nav");
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!open));
      nav.classList.toggle("is-open", !open);
    });
    nav.addEventListener("click", function (e) {
      if (e.target.closest("a")) {
        toggle.setAttribute("aria-expanded", "false");
        nav.classList.remove("is-open");
      }
    });
  }
  // Over the desk scene the masthead goes transparent with light type.
  var masthead = document.querySelector(".masthead");
  var desk = document.getElementById("rolodex");
  if (masthead && desk && desk.classList.contains("desk")) {
    document.body.classList.add("has-desk");
    masthead.classList.add("is-over-desk");
    new IntersectionObserver(function (entries) {
      masthead.classList.toggle("is-over-desk", entries[0].isIntersecting);
    }, { rootMargin: "-70px 0px 0px 0px" }).observe(desk);
  }

  var year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();
})();
