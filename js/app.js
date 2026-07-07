/* ===================================================================
   Notas de Viaje para un Rayito de Sol — app.js
   Firestore (`db`) comes from firebase-config.js. Image uploads go to
   Cloudinary instead of Firebase Storage — see cloudinary-config.js.
   Translation strings/`t()` come from js/i18n.js (loaded before this file).
   =================================================================== */

(function () {
  "use strict";

  /* -----------------------------------------------------------------
     FEATURE 1 — COUNTDOWN
     ----------------------------------------------------------------- */

  const SETTINGS_DOC = db.collection("settings").doc("departureDate");

  // --- Placeholder date: August 14 --------------------------------
  // NOTE: This is only shown until Tanya picks a real date via the UI.
  // We assume "August 14" means the next upcoming August 14 relative
  // to today. If today is after Aug 14 in the current year, we roll
  // forward to next year. Adjust the YEAR manually below if you know
  // the exact intended year ahead of time.
  function getPlaceholderDeparture() {
    const now = new Date();
    const year = now.getMonth() > 7 || (now.getMonth() === 7 && now.getDate() > 14)
      ? now.getFullYear() + 1
      : now.getFullYear();
    // Month index 7 = August. Time set to a friendly morning departure.
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

  // Set a sane min date for the picker (today).
  departureInput.min = new Date().toISOString().split("T")[0];

  function refreshDateSourceNote() {
    dateSourceNote.textContent = dateIsLocked ? "" : t("dateSourceNote");
  }

  function startCountdown() {
    countdownView.hidden = false;
    if (countdownTimer) clearInterval(countdownTimer);
    tickCountdown();
    countdownTimer = setInterval(tickCountdown, 1000);
  }

  function tickCountdown() {
    const now = new Date();
    const diff = departureDate.getTime() - now.getTime();

    if (diff <= 0) {
      clearInterval(countdownTimer);
      countdownView.hidden = true;
      arrivedView.hidden = false;
      return;
    }

    const totalSeconds = Math.floor(diff / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;

    cdDays.textContent = String(days).padStart(2, "0");
    cdHours.textContent = String(hours).padStart(2, "0");
    cdMins.textContent = String(mins).padStart(2, "0");
    cdSecs.textContent = String(secs).padStart(2, "0");
  }

  function loadDeparture() {
    SETTINGS_DOC.get()
      .then((doc) => {
        if (doc.exists && doc.data().date) {
          // A real date has been set — lock the picker forever.
          departureDate = new Date(doc.data().date);
          dateIsLocked = true;
          datePickerForm.hidden = true;
        } else {
          // Nobody has picked a date yet — show placeholder + picker.
          dateIsLocked = false;
          datePickerForm.hidden = false;
        }
        refreshDateSourceNote();
        startCountdown();
      })
      .catch((err) => {
        console.error("No se pudo leer la fecha de salida:", err);
        // Fail safe: still show the placeholder countdown.
        datePickerForm.hidden = false;
        refreshDateSourceNote();
        startCountdown();
      });
  }

  datePickerForm.addEventListener("submit", (e) => {
    e.preventDefault();
    if (dateIsLocked) return;
    const val = departureInput.value;
    if (!val) return;

    const submitBtn = datePickerForm.querySelector("button[type=submit]");
    submitBtn.disabled = true;

    // Use a transaction so two simultaneous submits can't both "win".
    db.runTransaction((tx) => {
      return tx.get(SETTINGS_DOC).then((doc) => {
        if (doc.exists && doc.data().date) {
          // Someone else already set it while this form was open.
          return doc.data().date;
        }
        const isoDate = new Date(val + "T09:00:00").toISOString();
        tx.set(SETTINGS_DOC, {
          date: isoDate,
          setAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        return isoDate;
      });
    })
      .then((finalDateIso) => {
        departureDate = new Date(finalDateIso);
        dateIsLocked = true;
        datePickerForm.hidden = true;
        refreshDateSourceNote();
        startCountdown();
      })
      .catch((err) => {
        console.error("Error guardando la fecha:", err);
        submitBtn.disabled = false;
        alert(t("dateSaveError"));
      });
  });

  loadDeparture();

  /* -----------------------------------------------------------------
     FEATURE 2 — BEFORE-THE-TRIP: BEFORE/AFTER PHOTO SLIDER
     ----------------------------------------------------------------- */

  // No pairs are preloaded in code. A "before/after" pair only makes
  // sense once BOTH photos actually exist, so every pair — including
  // the very first one — is added the same way: through the
  // "+ agregar foto" button, once both photos are on hand. Uploaded
  // pairs are stored in Firestore's `photoPairs` collection and load
  // for every visitor automatically.
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
    allPairs.forEach((_, i) => {
      const dot = document.createElement("button");
      dot.className = "pair-dot" + (i === currentPairIndex ? " is-active" : "");
      dot.setAttribute("aria-label", `${i + 1}`);
      dot.addEventListener("click", () => showPair(i));
      pairDots.appendChild(dot);
    });
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

    // Keep the slider divider position stable, but reset image sizing.
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

  // The "before" image inside the clipped div must be sized to match
  // the full slider (since its parent is width-clipped), so we mirror
  // the slider's own pixel width onto it.
  function syncClipImageSize() {
    const width = baSlider.clientWidth;
    baBeforeImg.style.width = width + "px";
    baBeforeImg.style.maxWidth = "none";
  }
  window.addEventListener("resize", syncClipImageSize);

  prevPairBtn.addEventListener("click", () => showPair(currentPairIndex - 1));
  nextPairBtn.addEventListener("click", () => showPair(currentPairIndex + 1));

  // --- Drag handle logic ---------------------------------------------
  let isDragging = false;

  function setSliderPosition(clientX) {
    const rect = baSlider.getBoundingClientRect();
    let pct = ((clientX - rect.left) / rect.width) * 100;
    pct = Math.max(2, Math.min(98, pct));
    baClip.style.width = pct + "%";
    baHandle.style.left = pct + "%";
  }

  baHandle.addEventListener("pointerdown", (e) => {
    isDragging = true;
    baHandle.setPointerCapture(e.pointerId);
  });
  baHandle.addEventListener("pointermove", (e) => {
    if (!isDragging) return;
    setSliderPosition(e.clientX);
  });
  baHandle.addEventListener("pointerup", () => { isDragging = false; });
  baHandle.addEventListener("pointercancel", () => { isDragging = false; });

  // Also allow clicking/dragging anywhere on the slider itself.
  baSlider.addEventListener("pointerdown", (e) => {
    if (e.target === baHandle || baHandle.contains(e.target)) return;
    setSliderPosition(e.clientX);
    isDragging = true;
  });
  window.addEventListener("pointermove", (e) => {
    if (!isDragging) return;
    setSliderPosition(e.clientX);
  });
  window.addEventListener("pointerup", () => { isDragging = false; });

  // --- Load additional uploaded pairs from Firestore ------------------
  function loadUploadedPairs() {
    db.collection("photoPairs")
      .orderBy("createdAt", "asc")
      .get()
      .then((snapshot) => {
        const uploaded = [];
        snapshot.forEach((doc) => {
          const d = doc.data();
          if (d.beforeUrl && d.afterUrl) {
            uploaded.push({ before: d.beforeUrl, after: d.afterUrl, caption: d.caption || "" });
          }
        });
        allPairs = uploaded;
        showPair(Math.min(currentPairIndex, Math.max(allPairs.length - 1, 0)));
      })
      .catch((err) => console.error("No se pudieron cargar fotos adicionales:", err));
  }

  showPair(0);
  loadUploadedPairs();

  /* -----------------------------------------------------------------
     ADD BEFORE/AFTER PAIR UPLOAD MODAL
     ----------------------------------------------------------------- */

  const addPhotoBtn = document.getElementById("addPhotoBtn");
  const addPhotoBackdrop = document.getElementById("addPhotoBackdrop");
  const closeAddPhoto = document.getElementById("closeAddPhoto");
  const addPhotoForm = document.getElementById("addPhotoForm");
  const beforeFileInput = document.getElementById("beforeFileInput");
  const afterFileInput = document.getElementById("afterFileInput");
  const pairCaptionInput = document.getElementById("pairCaptionInput");
  const uploadPairBtn = document.getElementById("uploadPairBtn");
  const uploadStatus = document.getElementById("uploadStatus");

  function openModal(backdrop) { backdrop.hidden = false; }
  function closeModal(backdrop) { backdrop.hidden = true; }

  addPhotoBtn.addEventListener("click", () => openModal(addPhotoBackdrop));
  closeAddPhoto.addEventListener("click", () => closeModal(addPhotoBackdrop));
  addPhotoBackdrop.addEventListener("click", (e) => {
    if (e.target === addPhotoBackdrop) closeModal(addPhotoBackdrop);
  });

  // Basic client-side resize/compression so Cloudinary's free tier
  // isn't strained by full-resolution phone photos.
  function resizeImage(file, maxDim = 1600, quality = 0.82) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const reader = new FileReader();
      reader.onload = (e) => { img.src = e.target.result; };
      reader.onerror = reject;
      img.onload = () => {
        let { width, height } = img;
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
          (blob) => (blob ? resolve(blob) : reject(new Error("No se pudo procesar la imagen"))),
          "image/jpeg",
          quality
        );
      };
      img.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function uploadToCloudinary(blob, filename) {
    const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;
    const formData = new FormData();
    formData.append("file", blob, filename);
    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

    return fetch(url, { method: "POST", body: formData })
      .then((res) => {
        if (!res.ok) throw new Error("Cloudinary upload failed: " + res.status);
        return res.json();
      })
      .then((data) => data.secure_url);
  }

  addPhotoForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const beforeFile = beforeFileInput.files[0];
    const afterFile = afterFileInput.files[0];
    if (!beforeFile || !afterFile) return;

    uploadPairBtn.disabled = true;
    uploadStatus.textContent = t("uploadingPhotos");

    const stamp = Date.now();

    Promise.all([resizeImage(beforeFile), resizeImage(afterFile)])
      .then(([beforeBlob, afterBlob]) => {
        uploadStatus.textContent = t("uploadingPhotosUpload");
        return Promise.all([
          uploadToCloudinary(beforeBlob, `${stamp}-before.jpg`),
          uploadToCloudinary(afterBlob, `${stamp}-after.jpg`)
        ]);
      })
      .then(([beforeUrl, afterUrl]) => {
        return db.collection("photoPairs").add({
          beforeUrl,
          afterUrl,
          caption: pairCaptionInput.value.trim(),
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      })
      .then(() => {
        uploadStatus.textContent = t("uploadPairSuccess");
        addPhotoForm.reset();
        currentPairIndex = Infinity; // clamps to the newest pair once reloaded
        loadUploadedPairs();
        setTimeout(() => closeModal(addPhotoBackdrop), 1200);
      })
      .catch((err) => {
        console.error("Error subiendo par de fotos:", err);
        uploadStatus.textContent = t("uploadPairError");
      })
      .finally(() => {
        uploadPairBtn.disabled = false;
      });
  });

  /* -----------------------------------------------------------------
     FEATURE 2b — DURING-THE-TRIP: SIMPLE PHOTO GALLERY
     No before/after comparison here — just single photos as they come
     in during the trip. Stored in Firestore's `duringPhotos` collection,
     files hosted on Cloudinary just like the before/after pairs.
     ----------------------------------------------------------------- */

  let duringPhotos = [];

  const duringEmpty = document.getElementById("duringEmpty");
  const duringGrid = document.getElementById("duringGrid");

  function renderDuringGrid() {
    if (duringPhotos.length === 0) {
      duringEmpty.hidden = false;
      duringGrid.hidden = true;
      duringGrid.innerHTML = "";
      return;
    }
    duringEmpty.hidden = true;
    duringGrid.hidden = false;
    duringGrid.innerHTML = "";

    duringPhotos.forEach((photo) => {
      const figure = document.createElement("figure");
      figure.className = "gallery-item";
      const img = document.createElement("img");
      img.src = photo.url;
      img.alt = photo.caption || "";
      img.loading = "lazy";
      figure.appendChild(img);
      if (photo.caption) {
        const figcaption = document.createElement("figcaption");
        figcaption.textContent = photo.caption;
        figure.appendChild(figcaption);
      }
      duringGrid.appendChild(figure);
    });
  }

  function loadDuringPhotos() {
    db.collection("duringPhotos")
      .orderBy("createdAt", "asc")
      .get()
      .then((snapshot) => {
        const loaded = [];
        snapshot.forEach((doc) => {
          const d = doc.data();
          if (d.url) loaded.push({ url: d.url, caption: d.caption || "" });
        });
        duringPhotos = loaded;
        renderDuringGrid();
      })
      .catch((err) => {
        console.error("No se pudieron cargar fotos del viaje:", err);
      });
  }

  loadDuringPhotos();

  const addDuringPhotoBtn = document.getElementById("addDuringPhotoBtn");
  const addDuringPhotoBackdrop = document.getElementById("addDuringPhotoBackdrop");
  const closeAddDuringPhoto = document.getElementById("closeAddDuringPhoto");
  const addDuringPhotoForm = document.getElementById("addDuringPhotoForm");
  const duringFileInput = document.getElementById("duringFileInput");
  const duringCaptionInput = document.getElementById("duringCaptionInput");
  const uploadDuringBtn = document.getElementById("uploadDuringBtn");
  const uploadDuringStatus = document.getElementById("uploadDuringStatus");

  addDuringPhotoBtn.addEventListener("click", () => openModal(addDuringPhotoBackdrop));
  closeAddDuringPhoto.addEventListener("click", () => closeModal(addDuringPhotoBackdrop));
  addDuringPhotoBackdrop.addEventListener("click", (e) => {
    if (e.target === addDuringPhotoBackdrop) closeModal(addDuringPhotoBackdrop);
  });

  addDuringPhotoForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const file = duringFileInput.files[0];
    if (!file) return;

    uploadDuringBtn.disabled = true;
    uploadDuringStatus.textContent = t("uploadingDuringPhoto");

    const stamp = Date.now();

    resizeImage(file)
      .then((blob) => {
        uploadDuringStatus.textContent = t("uploadingDuringPhotoUpload");
        return uploadToCloudinary(blob, `${stamp}-during.jpg`);
      })
      .then((url) => {
        return db.collection("duringPhotos").add({
          url,
          caption: duringCaptionInput.value.trim(),
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      })
      .then(() => {
        uploadDuringStatus.textContent = t("uploadDuringSuccess");
        addDuringPhotoForm.reset();
        loadDuringPhotos();
        setTimeout(() => closeModal(addDuringPhotoBackdrop), 1200);
      })
      .catch((err) => {
        console.error("Error subiendo foto del viaje:", err);
        uploadDuringStatus.textContent = t("uploadDuringError");
      })
      .finally(() => {
        uploadDuringBtn.disabled = false;
      });
  });

  /* -----------------------------------------------------------------
     FEATURE 3 — FRIEND NOTES PANEL
     ----------------------------------------------------------------- */

  const openNotesBtn = document.getElementById("openNotesBtn");
  const notesBackdrop = document.getElementById("notesBackdrop");
  const closeNotes = document.getElementById("closeNotes");
  const notesList = document.getElementById("notesList");
  const noteForm = document.getElementById("noteForm");
  const noteName = document.getElementById("noteName");
  const noteMessage = document.getElementById("noteMessage");
  const noteStatus = document.getElementById("noteStatus");
  const envelopeDot = document.getElementById("envelopeDot");

  const TILTS = [-1.2, 0.8, -0.4, 1.4, -0.9, 0.5];

  // Keep the last snapshot around so a language switch can re-render
  // the postcards (e.g. the "Un amigo" / "A friend" fallback name and
  // the empty-state message) without waiting for another Firestore read.
  let lastNotesSnapshot = null;

  function renderNotes(snapshot) {
    lastNotesSnapshot = snapshot;
    if (snapshot.empty) {
      notesList.innerHTML = `<p class="postcard-empty">${t("notesEmpty")}</p>`;
      return;
    }
    notesList.innerHTML = "";
    let i = 0;
    snapshot.forEach((doc) => {
      const d = doc.data();
      const card = document.createElement("div");
      card.className = "postcard";
      card.style.setProperty("--tilt", TILTS[i % TILTS.length] + "deg");
      const nameEl = document.createElement("p");
      nameEl.className = "postcard-name";
      nameEl.textContent = "— " + (d.name || t("aFriend"));
      const msgEl = document.createElement("p");
      msgEl.className = "postcard-message";
      msgEl.textContent = d.message || "";
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
      (snapshot) => {
        renderNotes(snapshot);
        if (!notesLoadedOnce && !snapshot.empty && notesBackdrop.hidden) {
          envelopeDot.hidden = false;
        }
        notesLoadedOnce = true;
      },
      (err) => {
        console.error("Error escuchando notas:", err);
        notesList.innerHTML = `<p class="postcard-empty">${t("notesLoadError")}</p>`;
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

    plane.style.transform = `translate(${startX}px, ${startY}px) rotate(${angle}deg)`;
    plane.style.opacity = "1";

    const anim = plane.animate(
      [
        { transform: `translate(${startX}px, ${startY}px) rotate(${angle}deg) scale(0.6)`, opacity: 0.9 },
        {
          transform: `translate(${startX + dx * 0.5}px, ${startY + dy * 0.5 - 40}px) rotate(${angle - 8}deg) scale(1)`,
          opacity: 1,
          offset: 0.6
        },
        { transform: `translate(${endX}px, ${endY}px) rotate(${angle + 4}deg) scale(0.5)`, opacity: 0 }
      ],
      { duration: 650, easing: "cubic-bezier(.3,.6,.4,1)" }
    );
    anim.onfinish = () => plane.remove();
  }

  openNotesBtn.addEventListener("click", () => {
    openModal(notesBackdrop);
    launchPaperPlane(openNotesBtn, notesPanel);
    envelopeDot.hidden = true;
  });
  closeNotes.addEventListener("click", () => closeModal(notesBackdrop));
  notesBackdrop.addEventListener("click", (e) => {
    if (e.target === notesBackdrop) closeModal(notesBackdrop);
  });

  noteForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = noteName.value.trim();
    const message = noteMessage.value.trim();
    if (!name || !message) return;

    const submitBtn = noteForm.querySelector("button[type=submit]");
    submitBtn.disabled = true;
    noteStatus.textContent = t("noteSending");

    db.collection("notes")
      .add({
        name,
        message,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
      })
      .then(() => {
        noteStatus.textContent = t("noteSentSuccess");
        noteForm.reset();
      })
      .catch((err) => {
        console.error("Error enviando nota:", err);
        noteStatus.textContent = t("noteSentError");
      })
      .finally(() => {
        submitBtn.disabled = false;
      });
  });

  /* -----------------------------------------------------------------
     Re-render dynamic (non data-i18n) text whenever the language
     switcher changes languages.
     ----------------------------------------------------------------- */
  document.addEventListener("langchange", () => {
    refreshDateSourceNote();
    if (lastNotesSnapshot) renderNotes(lastNotesSnapshot);
    if (allPairs.length) {
      baBeforeImg.alt = t("tagBefore");
      baAfterImg.alt = t("tagAfter");
    }
  });

  /* -----------------------------------------------------------------
     Scroll reveal — gentle fade/slide-in as sections enter view
     ----------------------------------------------------------------- */
  const revealEls = document.querySelectorAll(".reveal");
  if (revealEls.length && "IntersectionObserver" in window) {
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
    );
    revealEls.forEach((el) => revealObserver.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add("is-visible"));
  }

  // The little plane flying Rusia → Perú on the background globe uses an
  // SMIL <animateMotion>, which CSS's prefers-reduced-motion can't reach
  // directly — pause it manually via the SVG's own animation API instead.
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    const globeSvg = document.getElementById("globeSvg");
    if (globeSvg && typeof globeSvg.pauseAnimations === "function") globeSvg.pauseAnimations();
  }

  /* -----------------------------------------------------------------
     Global: close modals with Escape
     ----------------------------------------------------------------- */
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeModal(addPhotoBackdrop);
      closeModal(addDuringPhotoBackdrop);
      closeModal(notesBackdrop);
    }
  });
})();
