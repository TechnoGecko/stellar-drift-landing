/* Stellar Drift shared scripts: starfield, fade-ins, rotating headline, forms */
(function() {
  var motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  var reduceMotion = motionQuery.matches;
  var motionListeners = [];
  var onMotionChange = function(e) {
    reduceMotion = e.matches;
    motionListeners.forEach(function(fn) { fn(reduceMotion); });
  };
  if (motionQuery.addEventListener) motionQuery.addEventListener("change", onMotionChange);
  else if (motionQuery.addListener) motionQuery.addListener(onMotionChange);

  /* ---------- Starfield ---------- */
  var canvas = document.getElementById("stars");
  if (canvas) {
    var ctx = canvas.getContext("2d");
    var layerA = [], layerB = [];
    var scrollY = 0, targetScroll = 0;
    var mouseX = 0, mouseY = 0, targetMX = 0, targetMY = 0;
    var tiltX = 0, tiltY = 0;      // kept between frames so the easing actually works
    var MAX_TILT = 6;              // degrees at the edge of the screen; subtle on purpose
    var W, H, frame = 0, running = false;

    var build = function() {
      layerA = []; layerB = [];
      var total = Math.floor((W * H) / 5500);
      for (var i = 0; i < Math.floor(total * 0.65); i++) {
        layerA.push({ baseX: Math.random() * W, baseY: Math.random() * H,
          r: Math.random() * 1.1 + 0.3, a: Math.random() * 0.35 + 0.1,
          speed: Math.random() * 0.003 + 0.001, phase: Math.random() * Math.PI * 2,
          scrollP: 0.1, mouseP: 0.018 });
      }
      for (var j = 0; j < Math.floor(total * 0.35); j++) {
        layerB.push({ baseX: Math.random() * W, baseY: Math.random() * H,
          r: Math.random() * 1.8 + 1.0, a: Math.random() * 0.45 + 0.35,
          speed: Math.random() * 0.004 + 0.002, phase: Math.random() * Math.PI * 2,
          scrollP: 0.28, mouseP: 0.045 });
      }
    };

    var drawLayer = function(stars) {
      for (var i = 0; i < stars.length; i++) {
        var s = stars[i];
        var scrollDrift = (scrollY * s.scrollP) % H;
        var y = ((s.baseY - scrollDrift) % H + H) % H;
        var x = ((s.baseX - mouseX * s.mouseP) % W + W) % W;
        var pulse = reduceMotion ? s.a : s.a + Math.sin(frame * s.speed + s.phase) * 0.07;
        ctx.beginPath();
        ctx.arc(x, y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(248,247,244," + Math.min(1, pulse) + ")";
        ctx.fill();
      }
    };

    var render = function() {
      ctx.clearRect(0, 0, W, H);
      drawLayer(layerA);
      drawLayer(layerB);
    };

    var draw = function() {
      if (reduceMotion) { running = false; return; }
      scrollY += (targetScroll - scrollY) * 0.07;
      mouseX += (targetMX - mouseX) * 0.06;
      mouseY += (targetMY - mouseY) * 0.06;
      var nx = mouseX / (W / 2);   // -1 .. 1 across the screen
      var ny = mouseY / (H / 2);
      tiltX += (-ny * MAX_TILT - tiltX) * 0.06;
      tiltY += (nx * MAX_TILT - tiltY) * 0.06;
      canvas.style.transform = "rotateX(" + tiltX.toFixed(3) + "deg) rotateY(" + tiltY.toFixed(3) + "deg)";
      frame++;
      render();
      requestAnimationFrame(draw);
    };

    var start = function() {
      if (running || reduceMotion) return;
      running = true;
      requestAnimationFrame(draw);
    };

    var resize = function() {
      W = canvas.width = window.innerWidth;
      H = canvas.height = window.innerHeight;
      build();
      if (reduceMotion) render();
    };

    window.addEventListener("scroll", function() { targetScroll = window.scrollY; }, { passive: true });
    window.addEventListener("mousemove", function(e) {
      targetMX = e.clientX - W / 2;
      targetMY = e.clientY - H / 2;
    });
    window.addEventListener("resize", resize);
    motionListeners.push(function(reduced) {
      if (reduced) {
        mouseX = mouseY = scrollY = 0;
        canvas.style.transform = "none";
        render();
      } else {
        start();
      }
    });

    resize();
    if (reduceMotion) render(); else start();
  }

  /* ---------- Fade-ins ---------- */
  var fades = document.querySelectorAll(".fade-in");
  if ("IntersectionObserver" in window) {
    var observer = new IntersectionObserver(function(entries) {
      entries.forEach(function(e) {
        if (e.isIntersecting) {
          e.target.classList.add("visible");
          observer.unobserve(e.target);
        }
      });
    }, { threshold: 0.1 });
    fades.forEach(function(el) { observer.observe(el); });
  } else {
    fades.forEach(function(el) { el.classList.add("visible"); });
  }

  /* ---------- Rotating headline ---------- */
  document.querySelectorAll("[data-rotator]").forEach(function(rotator) {
    var items = rotator.querySelectorAll(".rotator-item");
    if (!items.length) return;
    var i = 0, timer = null;
    var HOLD = 2200;
    items[0].classList.add("is-active");

    var next = function() {
      var current = items[i];
      i = (i + 1) % items.length;
      var incoming = items[i];
      current.classList.remove("is-active");
      current.classList.add("is-leaving");
      // reset the incoming item below the line before sliding it up
      incoming.classList.remove("is-leaving");
      void incoming.offsetWidth;
      incoming.classList.add("is-active");
      setTimeout(function() { current.classList.remove("is-leaving"); }, 600);
      // linger a little longer on the last (punchline) item
      timer = setTimeout(next, i === items.length - 1 ? HOLD + 1200 : HOLD);
    };

    var play = function() { if (!timer && !reduceMotion) timer = setTimeout(next, HOLD); };
    var stop = function() { clearTimeout(timer); timer = null; };

    motionListeners.push(function(reduced) {
      if (reduced) {
        stop();
        items.forEach(function(el) { el.classList.remove("is-active", "is-leaving"); });
        i = 0;
        items[0].classList.add("is-active");
      } else {
        play();
      }
    });
    // don't spin while the tab is hidden
    document.addEventListener("visibilitychange", function() { document.hidden ? stop() : play(); });
    play();
  });

  /* ---------- Forms ---------- */
  var FALLBACK_EMAIL = "stellar_drift_studio@pm.me";
  var $ = function(id) { return document.getElementById(id); };
  var isEmail = function(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); };
  var setStatus = function(el, msg, isError) {
    el.textContent = msg;
    el.classList.toggle("error", !!isError);
  };
  var postJSON = function(url, data) {
    return fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    }).then(function(res) {
      return res.json().catch(function() { return {}; }).then(function(body) {
        if (!res.ok || !body.ok) throw new Error(body.error || "Something went wrong.");
        return body;
      });
    });
  };

  // Newsletter
  var signupForm = $("signup-form");
  if (signupForm) {
    signupForm.addEventListener("submit", function(e) {
      e.preventDefault();
      var input = $("email-input");
      var btn = $("signup-btn");
      var status = $("signup-status");
      var email = input.value.trim();

      if (!isEmail(email)) {
        setStatus(status, "Please enter a valid email address.", true);
        input.focus();
        return;
      }
      btn.disabled = true;
      setStatus(status, "");
      postJSON("/api/subscribe", { email: email, company: $("signup-company").value })
        .then(function() {
          signupForm.style.display = "none";
          status.style.display = "none";
          var note = document.querySelector(".signup-note");
          if (note) note.style.display = "none";
          $("signup-done").style.display = "block";
        })
        .catch(function(err) {
          setStatus(status, err.message + " You can also email " + FALLBACK_EMAIL + ".", true);
          btn.disabled = false;
        });
    });
  }

  // Project inquiry
  var inquiryForm = $("inquiry-form");
  if (inquiryForm) {
    inquiryForm.addEventListener("submit", function(e) {
      e.preventDefault();
      var btn = $("inquiry-btn");
      var status = $("inquiry-status");
      var data = {
        name: $("inq-name").value.trim(),
        email: $("inq-email").value.trim(),
        site: $("inq-site").value.trim(),
        budget: $("inq-budget").value,
        project: $("inq-project").value.trim(),
        company: $("inq-company").value
      };

      if (!data.name) { setStatus(status, "Please add your name.", true); $("inq-name").focus(); return; }
      if (!isEmail(data.email)) { setStatus(status, "Please enter a valid email address.", true); $("inq-email").focus(); return; }
      if (data.project.length < 10) { setStatus(status, "Tell us a little more about the project.", true); $("inq-project").focus(); return; }

      btn.disabled = true;
      btn.textContent = "Sending...";
      setStatus(status, "");
      postJSON("/api/inquiry", data)
        .then(function() {
          inquiryForm.style.display = "none";
          var sub = document.querySelector(".inquiry-sub");
          if (sub) sub.style.display = "none";
          $("inquiry-done").style.display = "block";
        })
        .catch(function(err) {
          setStatus(status, err.message + " You can also email " + FALLBACK_EMAIL + ".", true);
          btn.disabled = false;
          btn.textContent = "Send project details";
        });
    });
  }
})();
