/* A wall of old televisions, from a photograph: each screen is a button laid over its set in the photo.
   Hover, focus or tap one and it changes channel (a burst of snow, the picture rolling, the channel number
   in the corner), and a news-style banner along the bottom of the wall tells a little more about it.
   Data comes from the persona's `tvwall` (js/personas.js). */
(function () {
  var reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var SWITCH_MS = reduceMotion ? 0 : 420;

  // one tile of snow, shared by every set
  function snowTile() {
    var c = document.createElement("canvas");
    c.width = c.height = 160;
    var g = c.getContext("2d"), img = g.createImageData(160, 160);
    for (var i = 0; i < img.data.length; i += 4) {
      var v = 30 + Math.random() * 200;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    return c.toDataURL();
  }

  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;"); }
  function pad(n) { return (n < 10 ? "0" : "") + n; }

  function picture(s) {
    if (s.test === "bars") return '<span class="tvs__bars" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></span>';
    if (s.test === "card") return '<span class="tvs__card" aria-hidden="true"><b>EMH</b><small>Please stand by</small></span>';
    return "";
  }

  function screenHTML(s, i) {
    var b = s.box, live = !!s.face;
    var style = "left:" + b[0] * 100 + "%;top:" + b[1] * 100 + "%;width:" + (b[2] - b[0]) * 100 + "%;height:" + (b[3] - b[1]) * 100 + "%" +
      (s.fs ? ";--fs:" + s.fs : "");
    var face = live
      ? '<span class="tvs__layer tvs__face' + (s.tall ? " tvs__face--tall" : "") + '"><b>' + s.face[0] + "</b>" + (s.face[1] ? "<small>" + esc(s.face[1]) + "</small>" : "") + "</span>"
      : "";
    // the other channel: the title on its own, in a different light (the banner below carries the words)
    var more = s.more
      ? '<span class="tvs__layer tvs__more"><b>' + esc(s.more[0]) + "</b></span>"
      : '<span class="tvs__layer tvs__more">' + picture(s) + "</span>";
    var label = live ? (s.more ? s.more[0] + ": " + s.more[1] : s.face.join(" ")) : "Channel " + s.ch;
    return '<button class="tvs' + (live ? " is-on" : "") + '" type="button" style="' + style + '" data-i="' + i + '"' +
      (live ? "" : ' tabindex="-1" aria-hidden="true"') + ' aria-label="' + esc(label) + '">' +
      '<span class="tvs__tint" aria-hidden="true"></span>' + face + more +
      '<span class="tvs__snow" aria-hidden="true"></span><span class="tvs__lines" aria-hidden="true"></span>' +
      '<span class="tvs__osd" aria-hidden="true">CH ' + pad(s.ch) + "</span></button>";
  }

  function mount(after, data) {
    if (!after || document.querySelector(".tvwall")) return;
    var html =
      '<section class="tvwall" aria-label="' + esc(data.label) + '">' +
        '<div class="tvwall__room" style="--photo:url(' + new URL(data.photo, location.href).href + ')">' +   /* absolute: the stylesheet would read it from css/ */
          '<div class="tvwall__stage" style="aspect-ratio:' + data.width + " / " + data.height + '">' +
            '<img class="tvwall__photo" src="' + data.photo + '" alt="" width="' + data.width + '" height="' + data.height + '">' +
            data.screens.map(screenHTML).join("") +
          "</div>" +
        "</div>" +
        '<p class="tvwall__chyron" aria-live="polite"><span class="tvwall__ch">CH --</span><span class="tvwall__say"></span></p>' +
      "</section>";
    after.insertAdjacentHTML("afterend", html);
    var wall = document.querySelector(".tvwall");
    wall.style.setProperty("--snow", "url(" + snowTile() + ")");
    var chCell = wall.querySelector(".tvwall__ch"), say = wall.querySelector(".tvwall__say");
    var IDLE = "Hover over a set to change the channel.";
    if (!matchMedia("(hover: hover)").matches) IDLE = "Tap a set to change the channel.";
    function banner(s) {
      chCell.textContent = "CH " + (s ? pad(s.ch) : "--");
      say.innerHTML = !s ? esc(IDLE)
        : s.more ? "<b>" + esc(s.more[0]) + "</b> " + esc(s.more[1])
        : "<b>Channel " + s.ch + "</b> Nothing on but the test card. Try one of the lit sets.";
      wall.classList.toggle("is-showing", !!s);
    }
    banner(null);

    // flip a set to its other channel: snow and a roll, then the new picture
    function tune(btn, on) {
      if (btn._on === on) return;
      btn._on = on;
      clearTimeout(btn._t1); clearTimeout(btn._t2);
      btn.classList.remove("is-tuning"); void btn.offsetWidth;   // restart the animation
      btn.classList.add("is-tuning");
      btn._t1 = setTimeout(function () { btn.classList.toggle("is-more", on); }, SWITCH_MS * 0.55);
      btn._t2 = setTimeout(function () { btn.classList.remove("is-tuning"); }, SWITCH_MS + 900);
      if (on) banner(data.screens[+btn.dataset.i]);
      else if (!wall.querySelector(".tvs.is-more:not([data-i='" + btn.dataset.i + "'])")) banner(null);
    }
    var hover = matchMedia("(hover: hover)").matches;
    Array.prototype.forEach.call(wall.querySelectorAll(".tvs"), function (btn) {
      if (hover) {
        btn.addEventListener("mouseenter", function () { tune(btn, true); });
        btn.addEventListener("mouseleave", function () { tune(btn, false); });
      }
      if (hover) {   // keyboard
        btn.addEventListener("focus", function () { tune(btn, true); });
        btn.addEventListener("blur", function () { tune(btn, false); });
      }
      btn.addEventListener("click", function () {   // touch: a tap switches one set over and the last one back
        if (hover) return;
        var turnOn = !btn._on;
        Array.prototype.forEach.call(wall.querySelectorAll(".tvs"), function (o) { if (o !== btn && o._on) tune(o, false); });
        tune(btn, turnOn);
      });
    });
  }

  window.TVWALL = { mount: mount };
})();
