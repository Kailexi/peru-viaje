/* ===================================================================
   Notas de Viaje para un Rayito de Sol — i18n.js
   Language dictionary + switching logic (Español / English / Русский).

   The language choice is a per-visitor UI preference, not shared
   trip data, so it's stored in localStorage only (not Firestore) —
   each person who opens the link picks their own language.

   Deliberately left untranslated: the passport-stamp arc text
   ("REPÚBLICA DEL PERÚ" / "RAYITO DE SOL · VIAJERA") and Tanya's
   name. Those are part of the stamp graphic itself, and a passport
   stamp only really reads as a passport stamp in Spanish here.
   =================================================================== */

const TRANSLATIONS = {
  es: {
    pageTitle: "Notas de Viaje para un Rayito de Sol",
    pageDescription: "Para Tanya, antes de su viaje a Perú.",
    headerWordmark: "Notas de Viaje",
    envelopeAria: "Abrir notas de amigos",
    heroEyebrow: "PARA",
    heroSub: "un puñado de notas de viaje antes de que el Perú te reciba",
    unitDays: "días",
    unitHours: "horas",
    unitMins: "min",
    unitSecs: "seg",
    countdownCaption: "hasta el despegue",
    arrivedTitle: "¡Buen viaje!",
    arrivedSub: "ya estás en Perú, rayito ☀️",
    datePickerLabel: "elige tu fecha de vuelo",
    datePickerButton: "Guardar fecha",
    datePickerHint: "solo se puede fijar una vez — ¡elígela con cariño!",
    dateSourceNote: "(fecha provisional — aún sin confirmar)",

    beforeStamp: "ANTES DEL VIAJE",
    beforeTitle: "Cómo has crecido",
    beforeEmptyText: "aún no hay fotos de antes/después",
    beforeEmptySub: "sube el primer par cuando lo tengas — un antes y un después juntos",
    tagBefore: "ANTES",
    tagAfter: "DESPUÉS",
    prevPairAria: "Par anterior",
    nextPairAria: "Siguiente par",
    addPhotoBtn: "agregar foto",
    addPhotoBtnTitle: "Agregar una foto",

    duringStamp: "DURANTE EL VIAJE",
    duringTitle: "El viaje en fotos",
    duringEmptyText: "aún no hay fotos del viaje",
    duringEmptySub: "las fotos que subas aquí aparecerán para todos los que abran este sitio",
    addDuringPhotoBtn: "agregar foto del viaje",
    addDuringPhotoBtnTitle: "Agregar una foto del viaje",

    closeAria: "Cerrar",
    closeNotesAria: "Cerrar notas",

    addPairModalTitle: "Añade un par de fotos",
    beforeFileLabel: "Foto \"antes\"",
    afterFileLabel: "Foto \"después\"",
    captionLabel: "Nota breve (opcional)",
    pairCaptionPlaceholder: "ej. de la ventana a las nubes",
    uploadPairBtn: "Subir par",
    uploadingPhotos: "Procesando fotos...",
    uploadingPhotosUpload: "Subiendo fotos...",
    uploadPairSuccess: "¡Listo! Tu par se agregó a la galería.",
    uploadPairError: "Algo falló al subir. Intenta de nuevo.",

    addDuringModalTitle: "Añade una foto del viaje",
    duringFileLabel: "Foto",
    duringCaptionPlaceholder: "ej. Machu Picchu al amanecer",
    uploadDuringBtn: "Subir foto",
    uploadingDuringPhoto: "Procesando foto...",
    uploadingDuringPhotoUpload: "Subiendo foto...",
    uploadDuringSuccess: "¡Listo! Tu foto se agregó a la galería.",
    uploadDuringError: "Algo falló al subir. Intenta de nuevo.",

    notesTitle: "La saca postal",
    notesSub: "notas de quienes te desean buen viaje",
    noteNamePlaceholder: "tu nombre",
    noteMessagePlaceholder: "deja tu mensaje de buen viaje...",
    noteSubmitBtn: "Enviar nota",
    noteSending: "Enviando...",
    noteSentSuccess: "¡Nota enviada! Gracias.",
    noteSentError: "No se pudo enviar. Intenta de nuevo.",
    notesEmpty: "aún no hay notas — ¡sé la primera persona en escribir!",
    notesLoadError: "no se pudieron cargar las notas.",
    aFriend: "Un amigo",

    footerText: "hecho a mano, con cariño, para tu vuelta al mundo",

    dateSaveError: "No se pudo guardar la fecha. Intenta de nuevo.",
    duringLoadError: "No se pudieron cargar las fotos del viaje."
  },

  en: {
    pageTitle: "Travel Notes for a Little Ray of Sunshine",
    pageDescription: "For Tanya, before her trip to Peru.",
    headerWordmark: "Travel Notes",
    envelopeAria: "Open friends' notes",
    heroEyebrow: "FOR",
    heroSub: "a handful of travel notes before Peru welcomes you",
    unitDays: "days",
    unitHours: "hours",
    unitMins: "min",
    unitSecs: "sec",
    countdownCaption: "until takeoff",
    arrivedTitle: "Bon voyage!",
    arrivedSub: "you're in Peru now, sunshine ☀️",
    datePickerLabel: "pick your flight date",
    datePickerButton: "Save date",
    datePickerHint: "this can only be set once — choose it with care!",
    dateSourceNote: "(placeholder date — not yet confirmed)",

    beforeStamp: "BEFORE THE TRIP",
    beforeTitle: "How you've grown",
    beforeEmptyText: "no before/after photos yet",
    beforeEmptySub: "upload the first pair whenever you have it — a before and an after together",
    tagBefore: "BEFORE",
    tagAfter: "AFTER",
    prevPairAria: "Previous pair",
    nextPairAria: "Next pair",
    addPhotoBtn: "add a photo",
    addPhotoBtnTitle: "Add a photo",

    duringStamp: "DURING THE TRIP",
    duringTitle: "The trip in photos",
    duringEmptyText: "no trip photos yet",
    duringEmptySub: "photos you upload here will show up for everyone who opens this site",
    addDuringPhotoBtn: "add a trip photo",
    addDuringPhotoBtnTitle: "Add a trip photo",

    closeAria: "Close",
    closeNotesAria: "Close notes",

    addPairModalTitle: "Add a pair of photos",
    beforeFileLabel: "\"Before\" photo",
    afterFileLabel: "\"After\" photo",
    captionLabel: "Short note (optional)",
    pairCaptionPlaceholder: "e.g. from the window seat to the clouds",
    uploadPairBtn: "Upload pair",
    uploadingPhotos: "Processing photos...",
    uploadingPhotosUpload: "Uploading photos...",
    uploadPairSuccess: "Done! Your pair was added to the gallery.",
    uploadPairError: "Something went wrong uploading. Try again.",

    addDuringModalTitle: "Add a trip photo",
    duringFileLabel: "Photo",
    duringCaptionPlaceholder: "e.g. Machu Picchu at sunrise",
    uploadDuringBtn: "Upload photo",
    uploadingDuringPhoto: "Processing photo...",
    uploadingDuringPhotoUpload: "Uploading photo...",
    uploadDuringSuccess: "Done! Your photo was added to the gallery.",
    uploadDuringError: "Something went wrong uploading. Try again.",

    notesTitle: "The mailbag",
    notesSub: "notes from people wishing you safe travels",
    noteNamePlaceholder: "your name",
    noteMessagePlaceholder: "leave your bon voyage message...",
    noteSubmitBtn: "Send note",
    noteSending: "Sending...",
    noteSentSuccess: "Note sent! Thank you.",
    noteSentError: "Couldn't send it. Try again.",
    notesEmpty: "no notes yet — be the first to write one!",
    notesLoadError: "couldn't load the notes.",
    aFriend: "A friend",

    footerText: "made by hand, with love, for your trip around the world",

    dateSaveError: "Couldn't save the date. Try again.",
    duringLoadError: "Couldn't load the trip photos."
  },

  ru: {
    pageTitle: "Путевые заметки для солнечного лучика",
    pageDescription: "Для Тани, перед её поездкой в Перу.",
    headerWordmark: "Путевые заметки",
    envelopeAria: "Открыть записки друзей",
    heroEyebrow: "ДЛЯ",
    heroSub: "немного путевых заметок перед тем, как Перу тебя встретит",
    unitDays: "дн",
    unitHours: "ч",
    unitMins: "мин",
    unitSecs: "сек",
    countdownCaption: "до вылета",
    arrivedTitle: "Счастливого пути!",
    arrivedSub: "ты уже в Перу, солнышко ☀️",
    datePickerLabel: "выбери дату вылета",
    datePickerButton: "Сохранить дату",
    datePickerHint: "это можно сделать только один раз — выбирай с душой!",
    dateSourceNote: "(дата пока предварительная — не подтверждена)",

    beforeStamp: "ДО ПОЕЗДКИ",
    beforeTitle: "Как ты выросла",
    beforeEmptyText: "фото «до/после» пока нет",
    beforeEmptySub: "загрузи первую пару, когда будет готова — снимок «до» и «после» вместе",
    tagBefore: "ДО",
    tagAfter: "ПОСЛЕ",
    prevPairAria: "Предыдущая пара",
    nextPairAria: "Следующая пара",
    addPhotoBtn: "добавить фото",
    addPhotoBtnTitle: "Добавить фото",

    duringStamp: "ВО ВРЕМЯ ПОЕЗДКИ",
    duringTitle: "Поездка в фотографиях",
    duringEmptyText: "фото поездки пока нет",
    duringEmptySub: "фото, которые ты загрузишь сюда, увидят все, кто откроет этот сайт",
    addDuringPhotoBtn: "добавить фото поездки",
    addDuringPhotoBtnTitle: "Добавить фото поездки",

    closeAria: "Закрыть",
    closeNotesAria: "Закрыть записки",

    addPairModalTitle: "Добавь пару фотографий",
    beforeFileLabel: "Фото «до»",
    afterFileLabel: "Фото «после»",
    captionLabel: "Короткая подпись (необязательно)",
    pairCaptionPlaceholder: "например, от окна самолёта до облаков",
    uploadPairBtn: "Загрузить пару",
    uploadingPhotos: "Обработка фото...",
    uploadingPhotosUpload: "Загрузка фото...",
    uploadPairSuccess: "Готово! Пара добавлена в галерею.",
    uploadPairError: "Не удалось загрузить. Попробуй ещё раз.",

    addDuringModalTitle: "Добавь фото поездки",
    duringFileLabel: "Фото",
    duringCaptionPlaceholder: "например, Мачу-Пикчу на рассвете",
    uploadDuringBtn: "Загрузить фото",
    uploadingDuringPhoto: "Обработка фото...",
    uploadingDuringPhotoUpload: "Загрузка фото...",
    uploadDuringSuccess: "Готово! Фото добавлено в галерею.",
    uploadDuringError: "Не удалось загрузить. Попробуй ещё раз.",

    notesTitle: "Почтовый мешок",
    notesSub: "записки от тех, кто желает тебе счастливого пути",
    noteNamePlaceholder: "твоё имя",
    noteMessagePlaceholder: "оставь пожелание доброго пути...",
    noteSubmitBtn: "Отправить записку",
    noteSending: "Отправка...",
    noteSentSuccess: "Записка отправлена! Спасибо.",
    noteSentError: "Не удалось отправить. Попробуй ещё раз.",
    notesEmpty: "записок пока нет — стань первым, кто напишет!",
    notesLoadError: "не удалось загрузить записки.",
    aFriend: "Друг",

    footerText: "сделано вручную, с любовью, для твоего путешествия по миру",

    dateSaveError: "Не удалось сохранить дату. Попробуй ещё раз.",
    duringLoadError: "Не удалось загрузить фото поездки."
  }
};

const SUPPORTED_LANGS = ["es", "en", "ru"];
const LANG_STORAGE_KEY = "notasViajeLang";

function getCurrentLang() {
  const stored = localStorage.getItem(LANG_STORAGE_KEY);
  return SUPPORTED_LANGS.includes(stored) ? stored : "es";
}

// t(key) — used by app.js for dynamically-generated strings (status
// messages, postcard fallback names, etc.) that live outside the
// data-i18n-attributed DOM elements.
function t(key) {
  const lang = getCurrentLang();
  return (TRANSLATIONS[lang] && TRANSLATIONS[lang][key]) || TRANSLATIONS.es[key] || key;
}

function applyLanguage(lang) {
  if (!SUPPORTED_LANGS.includes(lang)) lang = "es";
  localStorage.setItem(LANG_STORAGE_KEY, lang);
  const dict = TRANSLATIONS[lang];

  document.documentElement.lang = lang;

  const pageTitleEl = document.getElementById("pageTitle");
  if (pageTitleEl) pageTitleEl.textContent = dict.pageTitle;
  const pageDescEl = document.getElementById("pageDescription");
  if (pageDescEl) pageDescEl.setAttribute("content", dict.pageDescription);

  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (dict[key] !== undefined) el.textContent = dict[key];
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    const key = el.getAttribute("data-i18n-placeholder");
    if (dict[key] !== undefined) el.setAttribute("placeholder", dict[key]);
  });
  document.querySelectorAll("[data-i18n-aria]").forEach((el) => {
    const key = el.getAttribute("data-i18n-aria");
    if (dict[key] !== undefined) el.setAttribute("aria-label", dict[key]);
  });
  document.querySelectorAll("[data-i18n-title]").forEach((el) => {
    const key = el.getAttribute("data-i18n-title");
    if (dict[key] !== undefined) el.setAttribute("title", dict[key]);
  });

  document.querySelectorAll(".lang-btn").forEach((btn) => {
    btn.classList.toggle("is-active", btn.getAttribute("data-lang") === lang);
  });

  // Let the rest of the app (countdown source note, live-loaded
  // notes/photos, etc.) know the language changed so it can re-render
  // any text it owns dynamically rather than through data-i18n.
  document.dispatchEvent(new CustomEvent("langchange", { detail: { lang } }));
}

document.addEventListener("DOMContentLoaded", () => {
  applyLanguage(getCurrentLang());
  document.querySelectorAll(".lang-btn").forEach((btn) => {
    btn.addEventListener("click", () => applyLanguage(btn.getAttribute("data-lang")));
  });
});
