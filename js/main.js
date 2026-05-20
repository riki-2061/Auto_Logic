(function () {
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  var toggle = document.querySelector(".nav-toggle");
  var nav = document.querySelector(".nav");
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    nav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        nav.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  var form = document.getElementById("contact-form");
  var thanks = document.getElementById("form-thanks");
  var errEl = document.getElementById("form-error");
  var submitBtn = document.getElementById("contact-submit");

  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (thanks) thanks.hidden = true;
      if (errEl) {
        errEl.hidden = true;
        errEl.textContent = "";
      }

      var fd = new FormData(form);
      var payload = {
        name: fd.get("name"),
        company: fd.get("company") || "",
        email: fd.get("email"),
        phone: fd.get("phone"),
        message: fd.get("message"),
      };

      if (submitBtn) {
        submitBtn.disabled = true;
        var labelEl = submitBtn.querySelector(".btn__label");
        if (labelEl) {
          labelEl.dataset.prev = labelEl.textContent;
          labelEl.textContent = "שולחים…";
        }
      }

      fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
        .then(function (r) {
          return r.json().then(function (data) {
            return { ok: r.ok, status: r.status, data: data };
          });
        })
        .then(function (result) {
          if (result.ok && result.data && result.data.ok) {
            if (thanks) thanks.hidden = false;
            form.reset();
          } else {
            var msg =
              (result.data && result.data.error) ||
              "לא הצלחנו לשלוח. נסו שוב או צרו קשר בטלפון.";
            if (errEl) {
              errEl.textContent = msg;
              errEl.hidden = false;
            }
          }
        })
        .catch(function () {
          if (errEl) {
            errEl.textContent =
              "אין חיבור לשרת. אם פתחתם את האתר כקובץ מהמחשב — הריצו npm start וגלשו ל-http://localhost:3000";
            errEl.hidden = false;
          }
        })
        .finally(function () {
          if (submitBtn) {
            submitBtn.disabled = false;
            var le = submitBtn.querySelector(".btn__label");
            if (le && le.dataset.prev) le.textContent = le.dataset.prev;
          }
        });
    });
  }

  var observer =
    typeof IntersectionObserver !== "undefined"
      ? new IntersectionObserver(
          function (entries) {
            entries.forEach(function (entry) {
              if (entry.isIntersecting) {
                entry.target.classList.add("is-visible");
                observer.unobserve(entry.target);
              }
            });
          },
          { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
        )
      : null;

  if (observer) {
    document
      .querySelectorAll(".section__head, .about-card, .service-card, .process__step, .why__item, .integrations__icon")
      .forEach(function (el) {
        el.classList.add("reveal");
        observer.observe(el);
      });
  }
})();
