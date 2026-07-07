/* ===================================================================
   Notas de Viaje para un Rayito de Sol — app.js
   ------------------------------------------------------------------
   Firestore (`db`) comes from firebase-config.js. Image uploads go to
   Cloudinary (see cloudinary-config.js). Translation strings/`t()`
   come from js/i18n.js. Sections are mounted by js/sections.js — each
   feature below REGISTERS itself (with an init that runs once its
   section is on the page) via window.SiteSections.register().
   =================================================================== */

(function () {
  "use strict";


  function openModal(backdrop) {
    if (backdrop) backdrop.hidden = false;
  }
  function closeModal(backdrop) {
    if (backdrop) backdrop.hidden = true;
  }

  function resizeImage(file, maxDim, quality) {
    maxDim = maxDim || 1600;
    quality = quality || 0.82;
    return new Promise(function (resolve, reject) {
      const img = new Image();
      const reader = new FileReader();
      reader.onload = function (e) {
        img.src = e.target.result;
      };
      reader.onerror = reject;
      img.onload = function () {
        let width = img.width;
        let height = img.height;
        if (width > height && width > maxDim) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else if (height > maxDim) {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          function (blob) {
            blob ? resolve(blob) : reject(new Error("No se pudo procesar la imagen"));
          },
          "image/jpeg",
          quality
        );
      };
      img.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function uploadToCloudinary(blob, filename) {
    const url = "https://api.cloudinary.com/v1_1/" + CLOUDINARY_CLOUD_NAME + "/image/upload";
    const formData = new FormData();
    formData.append("file", blob, filename);
    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
    return fetch(url, { method: "POST", body: formData })
      .then(function (res) {
        if (!res.ok) throw new Error("Cloudinary upload failed: " + res.status);
        return res.json();
      })
      .then(function (data) {
        return data.secure_url;
      });
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = a[i];
      a[i] = a[j];
      a[j] = tmp;
    }
    return a;
  }


  function initHero() {
    const SETTINGS_DOC = db.collection("settings").doc("departureDate");

    // Placeholder date: the next upcoming August 14.
    function getPlaceholderDeparture() {
      const now = new Date();
      const year =
        now.getMonth() > 7 || (now.getMonth() === 7 && now.getDate() > 14)
          ? now.getFullYear() + 1
          : now.getFullYear();
      return new Date(year, 7, 14, 9, 0, 0);
    }

    const countdownView = document.getElementById("countdownView");
    const arrivedView = document.getElementById("arrivedView");
    const datePickerForm = document.getElementById("datePickerForm");
    const departureInput = document.getElementById("departureInput");
    const dateSourceNote = document.getElementById("dateSourceNote");
    const cdDays = document.getElementById("cdDays");
    const cdHours = document.getElementById("cdHours");
    const cdMins = document.getElementById("cdMins");
    const cdSecs = document.getElementById("cdSecs");

    let departureDate = getPlaceholderDeparture();
    let dateIsLocked = false;
    let countdownTimer = null;

    departureInput.min = new Date().toISOString().split("T")[0];

    function refreshDateSourceNote() {
      dateSourceNote.textContent = dateIsLocked ? "" : t("dateSourceNote");
    }

    function tickCountdown() {
      const diff = departureDate.getTime() - Date.now();
      if (diff <= 0) {
        clearInterval(countdownTimer);
        countdownView.hidden = true;
        arrivedView.hidden = false;
        return;
      }
      const totalSeconds = Math.floor(diff / 1000);
      cdDays.textContent = String(Math.floor(totalSeconds / 86400)).padStart(2, "0");
      cdHours.textContent = String(Math.floor((totalSeconds % 86400) / 3600)).padStart(2, "0");
      cdMins.textContent = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
      cdSecs.textContent = String(totalSeconds % 60).padStart(2, "0");
    }

    function startCountdown() {
      countdownView.hidden = false;
      if (countdownTimer) clearInterval(countdownTimer);
      tickCountdown();
      countdownTimer = setInterval(tickCountdown, 1000);
    }

    function loadDeparture() {
      SETTINGS_DOC.get()
        .then(function (doc) {
          if (doc.exists && doc.data().date) {
            departureDate = new Date(doc.data().date);
            dateIsLocked = true;
            datePickerForm.hidden = true;
          } else {
            dateIsLocked = false;
            datePickerForm.hidden = false;
          }
          refreshDateSourceNote();
          startCountdown();
        })
        .catch(function (err) {
          console.error("No se pudo leer la fecha de salida:", err);
          datePickerForm.hidden = false;
          refreshDateSourceNote();
          startCountdown();
        });
    }

    datePickerForm.addEventListener("submit", function (e) {
      e.preventDefault();
      if (dateIsLocked) return;
      const val = departureInput.value;
      if (!val) return;

      const submitBtn = datePickerForm.querySelector("button[type=submit]");
      submitBtn.disabled = true;

      db.runTransaction(function (tx) {
        return tx.get(SETTINGS_DOC).then(function (doc) {
          if (doc.exists && doc.data().date) return doc.data().date;
          const isoDate = new Date(val + "T09:00:00").toISOString();
          tx.set(SETTINGS_DOC, {
            date: isoDate,
            setAt: firebase.firestore.FieldValue.serverTimestamp()
          });
          return isoDate;
        });
      })
        .then(function (finalDateIso) {
          departureDate = new Date(finalDateIso);
          dateIsLocked = true;
          datePickerForm.hidden = true;
          refreshDateSourceNote();
          startCountdown();
        })
        .catch(function (err) {
          console.error("Error guardando la fecha:", err);
          submitBtn.disabled = false;
          alert(t("dateSaveError"));
        });
    });

    document.addEventListener("langchange", refreshDateSourceNote);

    // Pause the SMIL globe plane if the visitor prefers reduced motion.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const globeSvg = document.getElementById("globeSvg");
      if (globeSvg && typeof globeSvg.pauseAnimations === "function") globeSvg.pauseAnimations();
    }

    loadDeparture();
  }

  /* =================================================================
     SECTION: MEET OUR TRAVELLER — Feature 1 (new)
     Four tilted polaroids of Tanya, joined by the site's dashed trail,
     each carrying a short well-wish. Photos are static (assets/).
     ================================================================= */

  function initMeetTraveller(section) {
    const trail = section.querySelector(".traveller-trail");
    if (!trail || !window.SiteSections) return;
    // Draw the dashed connectors between the polaroids once they're
    // sized (connectTrail re-runs itself on image load + resize).
    window.SiteSections.connectTrail(trail, ".polaroid-wish");
  }

  /* =================================================================
     SECTION: NOTES MARQUEE — Feature 5 (new)
     A random handful of friends' notes (the same `notes` collection as
     the mailbag) slide right → left, marquee-style.
     ================================================================= */

  function initNotesMarquee(section) {
    const track = section.querySelector(".marquee-track");
    const empty = section.querySelector(".marquee-empty");
    if (!track) return;

    let chosen = [];

    function renderEmpty() {
      track.hidden = true;
      if (empty) {
        empty.hidden = false;
        empty.textContent = t("marqueeEmpty");
      }
    }

    function renderTrack() {
      if (empty) empty.hidden = true;
      track.hidden = false;
      track.innerHTML = "";

      // Build the chips once, then clone the whole set so the loop is
      // seamless (the animation translates by exactly one set's width).
      function makeChip(note) {
        const chip = document.createElement("div");
        chip.className = "marquee-note";
        const msg = document.createElement("p");
        msg.className = "marquee-note-msg";
        msg.textContent = "“" + (note.message || "") + "”";
        const name = document.createElement("p");
        name.className = "marquee-note-name";
        name.textContent = "— " + (note.name || t("aFriend"));
        chip.appendChild(msg);
        chip.appendChild(name);
        return chip;
      }

      const first = document.createElement("div");
      first.className = "marquee-set";
      const second = document.createElement("div");
      second.className = "marquee-set";
      second.setAttribute("aria-hidden", "true");
      chosen.forEach(function (n) {
        first.appendChild(makeChip(n));
        second.appendChild(makeChip(n));
      });
      track.appendChild(first);
      track.appendChild(second);
    }

    db.collection("notes")
      .get()
      .then(function (snapshot) {
        const all = [];
        snapshot.forEach(function (doc) {
          const d = doc.data();
          if (d.message) all.push({ name: d.name || "", message: d.message });
        });
        if (all.length === 0) {
          renderEmpty();
          return;
        }
        // Show a random 3–4 (or fewer, if that's all there is).
        const want = Math.min(all.length, all.length >= 4 ? 3 + Math.floor(Math.random() * 2) : all.length);
        chosen = shuffle(all).slice(0, want);
        renderTrack();
      })
      .catch(function (err) {
        console.error("No se pudieron cargar las notas para el marquee:", err);
        renderEmpty();
      });

    document.addEventListener("langchange", function () {
      if (chosen.length) {
        renderTrack();
      } else if (empty && !empty.hidden) {
        empty.textContent = t("marqueeEmpty");
      }
    });
  }



  function initBeforeAfter() {
    let allPairs = [];
    let currentPairIndex = 0;

    const baEmpty = document.getElementById("baEmpty");
    const baSlider = document.getElementById("baSlider");
    const sliderControls = document.getElementById("sliderControls");
    const baClip = document.getElementById("baClip");
    const baHandle = document.getElementById("baHandle");
    const baBeforeImg = document.getElementById("baBeforeImg");
    const baAfterImg = document.getElementById("baAfterImg");
    const baCaption = document.getElementById("baCaption");
    const pairDots = document.getElementById("pairDots");
    const prevPairBtn = document.getElementById("prevPairBtn");
    const nextPairBtn = document.getElementById("nextPairBtn");

    function renderPairDots() {
      pairDots.innerHTML = "";
      allPairs.forEach(function (_, i) {
        const dot = document.createElement("button");
        dot.className = "pair-dot" + (i === currentPairIndex ? " is-active" : "");
        dot.setAttribute("aria-label", String(i + 1));
        dot.addEventListener("click", function () {
          showPair(i);
        });
        pairDots.appendChild(dot);
      });
    }

    function syncClipImageSize() {
      const width = baSlider.clientWidth;
      baBeforeImg.style.width = width + "px";
      baBeforeImg.style.maxWidth = "none";
    }

    function showPair(index) {
      if (allPairs.length === 0) {
        baEmpty.hidden = false;
        baSlider.hidden = true;
        sliderControls.hidden = true;
        baCaption.textContent = "";
        return;
      }
      if (index < 0 || index >= allPairs.length) return;

      baEmpty.hidden = true;
      baSlider.hidden = false;
      sliderControls.hidden = false;

      currentPairIndex = index;
      const pair = allPairs[index];
      baBeforeImg.src = pair.before;
      baAfterImg.src = pair.after;
      baBeforeImg.alt = t("tagBefore");
      baAfterImg.alt = t("tagAfter");
      baCaption.textContent = pair.caption || "";

      syncClipImageSize();
      prevPairBtn.disabled = index === 0;
      nextPairBtn.disabled = index === allPairs.length - 1;
      renderPairDots();
    }

    window.addEventListener("resize", syncClipImageSize);
    prevPairBtn.addEventListener("click", function () {
      showPair(currentPairIndex - 1);
    });
    nextPairBtn.addEventListener("click", function () {
      showPair(currentPairIndex + 1);
    });

    // --- Drag handle ---
    let isDragging = false;
    function setSliderPosition(clientX) {
      const rect = baSlider.getBoundingClientRect();
      let pct = ((clientX - rect.left) / rect.width) * 100;
      pct = Math.max(2, Math.min(98, pct));
      baClip.style.width = pct + "%";
      baHandle.style.left = pct + "%";
    }
    baHandle.addEventListener("pointerdown", function (e) {
      isDragging = true;
      baHandle.setPointerCapture(e.pointerId);
    });
    baHandle.addEventListener("pointermove", function (e) {
      if (isDragging) setSliderPosition(e.clientX);
    });
    baHandle.addEventListener("pointerup", function () {
      isDragging = false;
    });
    baHandle.addEventListener("pointercancel", function () {
      isDragging = false;
    });
    baSlider.addEventListener("pointerdown", function (e) {
      if (e.target === baHandle || baHandle.contains(e.target)) return;
      setSliderPosition(e.clientX);
      isDragging = true;
    });
    window.addEventListener("pointermove", function (e) {
      if (isDragging) setSliderPosition(e.clientX);
    });
    window.addEventListener("pointerup", function () {
      isDragging = false;
    });

    function loadUploadedPairs() {
      db.collection("photoPairs")
        .orderBy("createdAt", "asc")
        .get()
        .then(function (snapshot) {
          const uploaded = [];
          snapshot.forEach(function (doc) {
            const d = doc.data();
            if (d.beforeUrl && d.afterUrl) {
              uploaded.push({ before: d.beforeUrl, after: d.afterUrl, caption: d.caption || "" });
            }
          });
          allPairs = uploaded;
          showPair(Math.min(currentPairIndex, Math.max(allPairs.length - 1, 0)));
        })
        .catch(function (err) {
          console.error("No se pudieron cargar fotos adicionales:", err);
        });
    }

    // --- Upload modal (static markup outside <main>) ---
    const addPhotoBtn = document.getElementById("addPhotoBtn");
    const addPhotoBackdrop = document.getElementById("addPhotoBackdrop");
    const closeAddPhoto = document.getElementById("closeAddPhoto");
    const addPhotoForm = document.getElementById("addPhotoForm");
    const beforeFileInput = document.getElementById("beforeFileInput");
    const afterFileInput = document.getElementById("afterFileInput");
    const pairCaptionInput = document.getElementById("pairCaptionInput");
    const uploadPairBtn = document.getElementById("uploadPairBtn");
    const uploadStatus = document.getElementById("uploadStatus");

    addPhotoBtn.addEventListener("click", function () {
      openModal(addPhotoBackdrop);
    });
    closeAddPhoto.addEventListener("click", function () {
      closeModal(addPhotoBackdrop);
    });
    addPhotoBackdrop.addEventListener("click", function (e) {
      if (e.target === addPhotoBackdrop) closeModal(addPhotoBackdrop);
    });

    addPhotoForm.addEventListener("submit", function (e) {
      e.preventDefault();
      const beforeFile = beforeFileInput.files[0];
      const afterFile = afterFileInput.files[0];
      if (!beforeFile || !afterFile) return;

      uploadPairBtn.disabled = true;
      uploadStatus.textContent = t("uploadingPhotos");
      const stamp = Date.now();

      Promise.all([resizeImage(beforeFile), resizeImage(afterFile)])
        .then(function (blobs) {
          uploadStatus.textContent = t("uploadingPhotosUpload");
          return Promise.all([
            uploadToCloudinary(blobs[0], stamp + "-before.jpg"),
            uploadToCloudinary(blobs[1], stamp + "-after.jpg")
          ]);
        })
        .then(function (urls) {
          return db.collection("photoPairs").add({
            beforeUrl: urls[0],
            afterUrl: urls[1],
            caption: pairCaptionInput.value.trim(),
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
          });
        })
        .then(function () {
          uploadStatus.textContent = t("uploadPairSuccess");
          addPhotoForm.reset();
          currentPairIndex = Infinity; // clamp to newest once reloaded
          loadUploadedPairs();
          setTimeout(function () {
            closeModal(addPhotoBackdrop);
          }, 1200);
        })
        .catch(function (err) {
          console.error("Error subiendo par de fotos:", err);
          uploadStatus.textContent = t("uploadPairError");
        })
        .finally(function () {
          uploadPairBtn.disabled = false;
        });
    });

    document.addEventListener("langchange", function () {
      if (allPairs.length) {
        baBeforeImg.alt = t("tagBefore");
        baAfterImg.alt = t("tagAfter");
      }
    });

    showPair(0);
    loadUploadedPairs();
  }



  const TRIP_PHOTO_LIMIT = 21;
  const TRIP_TILTS = [-1.5, 1.1, -0.7, 1.6, -1.1, 0.8, -0.4];

  function initTripPolaroids(section) {
    let duringPhotos = [];

    const scroller = section.querySelector(".trip-scroller");
    const emptyHint = section.querySelector(".trip-empty");
    const fullNote = section.querySelector(".trip-full-note");
    const prevBtn = section.querySelector(".trip-prev");
    const nextBtn = section.querySelector(".trip-next");
    const counter = section.querySelector(".trip-counter");

    // Upload modal (static markup outside <main>)
    const addDuringPhotoBackdrop = document.getElementById("addDuringPhotoBackdrop");
    const closeAddDuringPhoto = document.getElementById("closeAddDuringPhoto");
    const addDuringPhotoForm = document.getElementById("addDuringPhotoForm");
    const duringFileInput = document.getElementById("duringFileInput");
    const duringCaptionInput = document.getElementById("duringCaptionInput");
    const uploadDuringBtn = document.getElementById("uploadDuringBtn");
    const uploadDuringStatus = document.getElementById("uploadDuringStatus");

    function isFull() {
      return duringPhotos.length >= TRIP_PHOTO_LIMIT;
    }

    function updateCounter() {
      if (counter) {
        counter.textContent = t("tripCounter")
          .replace("{n}", String(duringPhotos.length))
          .replace("{max}", String(TRIP_PHOTO_LIMIT));
      }
      if (fullNote) fullNote.hidden = !isFull();
      if (emptyHint) emptyHint.hidden = duringPhotos.length !== 0;
    }

    function makePolaroid(photo, index) {
      const fig = document.createElement("figure");
      fig.className = "polaroid trip-polaroid";
      fig.style.setProperty("--tilt", TRIP_TILTS[index % TRIP_TILTS.length] + "deg");
      const img = document.createElement("img");
      img.src = photo.url;
      img.alt = photo.caption || "";
      img.loading = "lazy";
      // Frame auto-fits the photo: redraw connectors/scroll once known.
      fig.appendChild(img);
      const cap = document.createElement("figcaption");
      cap.className = "polaroid-caption";
      cap.textContent = photo.caption || "";
      fig.appendChild(cap);
      return fig;
    }

    function makeAddSlot() {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "polaroid trip-polaroid trip-add-slot";
      btn.style.setProperty("--tilt", TRIP_TILTS[duringPhotos.length % TRIP_TILTS.length] + "deg");
      btn.setAttribute("aria-label", t("addDuringPhotoBtnTitle"));
      btn.setAttribute("title", t("addDuringPhotoBtnTitle"));
      btn.innerHTML =
        '<span class="trip-add-inner">' +
        '<svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true"><path d="M12 5 L12 19 M5 12 L19 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>' +
        '<span class="trip-add-label" data-i18n="addDuringPhotoBtn">' +
        t("addDuringPhotoBtn") +
        "</span></span>";
      btn.addEventListener("click", function () {
        if (isFull()) return;
        openModal(addDuringPhotoBackdrop);
      });
      return btn;
    }

    function renderScroller() {
      scroller.innerHTML = "";
      duringPhotos.forEach(function (photo, i) {
        scroller.appendChild(makePolaroid(photo, i));
      });
      if (!isFull()) scroller.appendChild(makeAddSlot());
      updateCounter();
      updateArrows();
    }

    function cardStep() {
      const card = scroller.querySelector(".trip-polaroid");
      if (!card) return scroller.clientWidth * 0.8;
      const style = window.getComputedStyle(scroller);
      const gap = parseFloat(style.columnGap || style.gap || "0") || 0;
      return card.getBoundingClientRect().width + gap;
    }

    function updateArrows() {
      if (!prevBtn || !nextBtn) return;
      const maxScroll = scroller.scrollWidth - scroller.clientWidth - 1;
      prevBtn.disabled = scroller.scrollLeft <= 0;
      nextBtn.disabled = scroller.scrollLeft >= maxScroll;
    }

    if (prevBtn) {
      prevBtn.addEventListener("click", function () {
        scroller.scrollBy({ left: -cardStep(), behavior: "smooth" });
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener("click", function () {
        scroller.scrollBy({ left: cardStep(), behavior: "smooth" });
      });
    }
    scroller.addEventListener("scroll", function () {
      updateArrows();
    });
    window.addEventListener("resize", updateArrows);

    function loadDuringPhotos() {
      db.collection("duringPhotos")
        .orderBy("createdAt", "asc")
        .get()
        .then(function (snapshot) {
          const loaded = [];
          snapshot.forEach(function (doc) {
            const d = doc.data();
            if (d.url) loaded.push({ url: d.url, caption: d.caption || "" });
          });
          duringPhotos = loaded.slice(0, TRIP_PHOTO_LIMIT);
          renderScroller();
        })
        .catch(function (err) {
          console.error("No se pudieron cargar fotos del viaje:", err);
        });
    }

    // Upload wiring
    if (closeAddDuringPhoto) {
      closeAddDuringPhoto.addEventListener("click", function () {
        closeModal(addDuringPhotoBackdrop);
      });
    }
    if (addDuringPhotoBackdrop) {
      addDuringPhotoBackdrop.addEventListener("click", function (e) {
        if (e.target === addDuringPhotoBackdrop) closeModal(addDuringPhotoBackdrop);
      });
    }

    addDuringPhotoForm.addEventListener("submit", function (e) {
      e.preventDefault();
      if (isFull()) {
        uploadDuringStatus.textContent = t("tripFullNote");
        return;
      }
      const file = duringFileInput.files[0];
      if (!file) return;

      uploadDuringBtn.disabled = true;
      uploadDuringStatus.textContent = t("uploadingDuringPhoto");
      const stamp = Date.now();

      resizeImage(file)
        .then(function (blob) {
          uploadDuringStatus.textContent = t("uploadingDuringPhotoUpload");
          return uploadToCloudinary(blob, stamp + "-during.jpg");
        })
        .then(function (url) {
          return db.collection("duringPhotos").add({
            url: url,
            caption: duringCaptionInput.value.trim(),
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
          });
        })
        .then(function () {
          uploadDuringStatus.textContent = t("uploadDuringSuccess");
          addDuringPhotoForm.reset();
          loadDuringPhotos();
          setTimeout(function () {
            closeModal(addDuringPhotoBackdrop);
          }, 1200);
        })
        .catch(function (err) {
          console.error("Error subiendo foto del viaje:", err);
          uploadDuringStatus.textContent = t("uploadDuringError");
        })
        .finally(function () {
          uploadDuringBtn.disabled = false;
        });
    });

    document.addEventListener("langchange", function () {
      // Re-render so the add-slot label, counter and hints re-translate.
      renderScroller();
    });

    loadDuringPhotos();
  }


  function initNotesPanel() {
    const openNotesBtn = document.getElementById("openNotesBtn");
    const notesBackdrop = document.getElementById("notesBackdrop");
    const notesPanel = document.getElementById("notesPanel");
    const closeNotes = document.getElementById("closeNotes");
    const notesList = document.getElementById("notesList");
    const noteForm = document.getElementById("noteForm");
    const noteName = document.getElementById("noteName");
    const noteMessage = document.getElementById("noteMessage");
    const noteStatus = document.getElementById("noteStatus");
    const envelopeDot = document.getElementById("envelopeDot");
    if (!openNotesBtn || !notesBackdrop) return;

    const TILTS = [-1.2, 0.8, -0.4, 1.4, -0.9, 0.5];
    let lastNotesSnapshot = null;

    function renderNotes(snapshot) {
      lastNotesSnapshot = snapshot;
      if (snapshot.empty) {
        notesList.innerHTML = '<p class="postcard-empty">' + t("notesEmpty") + "</p>";
        return;
      }
      notesList.innerHTML = "";
      let i = 0;
      snapshot.forEach(function (doc) {
        const d = doc.data();
        const card = document.createElement("div");
        card.className = "postcard";
        card.style.setProperty("--tilt", TILTS[i % TILTS.length] + "deg");
        const msgEl = document.createElement("p");
        msgEl.className = "postcard-message";
        msgEl.textContent = d.message || "";
        const nameEl = document.createElement("p");
        nameEl.className = "postcard-name";
        nameEl.textContent = "— " + (d.name || t("aFriend"));
        card.appendChild(msgEl);
        card.appendChild(nameEl);
        notesList.appendChild(card);
        i++;
      });
    }

    let notesLoadedOnce = false;
    db.collection("notes")
      .orderBy("timestamp", "desc")
      .onSnapshot(
        function (snapshot) {
          renderNotes(snapshot);
          if (!notesLoadedOnce && !snapshot.empty && notesBackdrop.hidden) {
            envelopeDot.hidden = false;
          }
          notesLoadedOnce = true;
        },
        function (err) {
          console.error("Error escuchando notas:", err);
          notesList.innerHTML = '<p class="postcard-empty">' + t("notesLoadError") + "</p>";
        }
      );

    function launchPaperPlane(fromEl, toEl) {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const from = fromEl.getBoundingClientRect();
      const to = toEl.getBoundingClientRect();
      const startX = from.left + from.width / 2;
      const startY = from.top + from.height / 2;
      const endX = to.left + Math.min(to.width * 0.35, 140);
      const endY = to.top + 40;

      const plane = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      plane.setAttribute("viewBox", "0 0 24 24");
      plane.classList.add("paper-plane");
      plane.innerHTML =
        '<path d="M2 12 L21 3 L14 21 L11 13 L2 12 Z" fill="currentColor" opacity="0.9"/>' +
        '<path d="M11 13 L21 3" stroke="#EDE3CF" stroke-width="1" fill="none"/>';
      document.body.appendChild(plane);

      const dx = endX - startX;
      const dy = endY - startY;
      const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
      plane.style.transform = "translate(" + startX + "px, " + startY + "px) rotate(" + angle + "deg)";
      plane.style.opacity = "1";

      const anim = plane.animate(
        [
          { transform: "translate(" + startX + "px, " + startY + "px) rotate(" + angle + "deg) scale(0.6)", opacity: 0.9 },
          {
            transform:
              "translate(" + (startX + dx * 0.5) + "px, " + (startY + dy * 0.5 - 40) + "px) rotate(" + (angle - 8) + "deg) scale(1)",
            opacity: 1,
            offset: 0.6
          },
          { transform: "translate(" + endX + "px, " + endY + "px) rotate(" + (angle + 4) + "deg) scale(0.5)", opacity: 0 }
        ],
        { duration: 650, easing: "cubic-bezier(.3,.6,.4,1)" }
      );
      anim.onfinish = function () {
        plane.remove();
      };
    }

    openNotesBtn.addEventListener("click", function () {
      openModal(notesBackdrop);
      launchPaperPlane(openNotesBtn, notesPanel);
      envelopeDot.hidden = true;
    });
    closeNotes.addEventListener("click", function () {
      closeModal(notesBackdrop);
    });
    notesBackdrop.addEventListener("click", function (e) {
      if (e.target === notesBackdrop) closeModal(notesBackdrop);
    });

    noteForm.addEventListener("submit", function (e) {
      e.preventDefault();
      const name = noteName.value.trim();
      const message = noteMessage.value.trim();
      if (!name || !message) return;

      const submitBtn = noteForm.querySelector("button[type=submit]");
      submitBtn.disabled = true;
      noteStatus.textContent = t("noteSending");

      db.collection("notes")
        .add({
          name: name,
          message: message,
          timestamp: firebase.firestore.FieldValue.serverTimestamp()
        })
        .then(function () {
          noteStatus.textContent = t("noteSentSuccess");
          noteForm.reset();
        })
        .catch(function (err) {
          console.error("Error enviando nota:", err);
          noteStatus.textContent = t("noteSentError");
        })
        .finally(function () {
          submitBtn.disabled = false;
        });
    });

    document.addEventListener("langchange", function () {
      if (lastNotesSnapshot) renderNotes(lastNotesSnapshot);
    });
  }


  function initGlobal() {
    document.addEventListener("keydown", function (e) {
      if (e.key !== "Escape") return;
      closeModal(document.getElementById("addPhotoBackdrop"));
      closeModal(document.getElementById("addDuringPhotoBackdrop"));
      closeModal(document.getElementById("notesBackdrop"));
    });
  }



  if (window.SiteSections) {
    window.SiteSections.register("hero", { init: initHero });
    window.SiteSections.register("meetTraveller", {
      tracked: true,
      trackLabelKey: "meetTitle",
      init: initMeetTraveller
    });
    window.SiteSections.register("notesMarquee", { init: initNotesMarquee });
    window.SiteSections.register("photosBefore", {
      tracked: true,
      trackLabelKey: "beforeTitle",
      init: initBeforeAfter
    });
    window.SiteSections.register("photosDuring", {
      tracked: true,
      trackLabelKey: "duringTitle",
      init: initTripPolaroids
    });
  }

  // Static overlays / global handlers (exist from first paint).
  document.addEventListener("DOMContentLoaded", function () {
    initNotesPanel();
    initGlobal();
  });
})();
