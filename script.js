const createdButtonsStorageKey = "voicesOfHopeButtons";
const speech = new SpeechSynthesisUtterance();
let voices = [];
let translationLanguage = "en";
let currentOriginalText = "";
const speechSettingsStorageKey = "voicesOfHopeSpeechSettings";
const indianLanguages = {
  "as-IN": "Assamese",
  "bn-IN": "Bengali",
  "en-IN": "English (India)",
  "gu-IN": "Gujarati",
  "hi-IN": "Hindi",
  "kn-IN": "Kannada",
  "kok-IN": "Konkani",
  "ml-IN": "Malayalam",
  "mr-IN": "Marathi",
  "ne-IN": "Nepali",
  "or-IN": "Odia",
  "pa-IN": "Punjabi",
  "sa-IN": "Sanskrit",
  "sd-IN": "Sindhi",
  "ta-IN": "Tamil",
  "te-IN": "Telugu",
  "ur-IN": "Urdu"
};

function showMessage(message, type = "info") {
  const popup = document.getElementById("messagePopup");
  const icon = document.getElementById("messageIcon");
  const text = document.getElementById("messageText");

  if (!popup || !icon || !text) {
    return;
  }

  popup.classList.remove("success", "error", "info");
  popup.classList.add(type);

  if (type === "success") {
    icon.textContent = "✓";
  } else if (type === "error") {
    icon.textContent = "!";
  } else {
    icon.textContent = "i";
  }

  text.textContent = message;
  popup.classList.add("show");

  setTimeout(function () {
    popup.classList.remove("show");
  }, 3000);
}

function showInputPrompt(options = {}) {
  const modal = document.getElementById("inputPromptModal");
  const title = document.getElementById("promptTitle");
  const input = document.getElementById("promptInput");
  const confirmBtn = document.getElementById("promptConfirmBtn");
  const cancelBtn = document.getElementById("promptCancelBtn");

  if (!modal || !title || !input || !confirmBtn || !cancelBtn) {
    return Promise.resolve(null);
  }

  const {
    titleText = "Enter a name",
    placeholder = "Button name",
    defaultValue = "",
    confirmText = "Create"
  } = options;

  title.textContent = titleText;
  input.placeholder = placeholder;
  input.value = defaultValue;
  confirmBtn.textContent = confirmText;

  modal.classList.add("show");
  input.focus();
  input.select();

  return new Promise(function (resolve) {
    function close(value) {
      modal.classList.remove("show");
      input.value = "";
      confirmBtn.onclick = null;
      cancelBtn.onclick = null;
      input.onkeydown = null;
      resolve(value);
    }

    confirmBtn.onclick = function () {
      const value = input.value.trim();
      close(value || null);
    };

    cancelBtn.onclick = function () {
      close(null);
    };

    input.onkeydown = function (event) {
      if (event.key === "Enter") {
        event.preventDefault();
        confirmBtn.click();
      }
      if (event.key === "Escape") {
        event.preventDefault();
        cancelBtn.click();
      }
    };
  });
}

function setPendingMessage(message, type) {
  try {
    localStorage.setItem("voicesOfHopePendingMessage", JSON.stringify({ message, type }));
  } catch (error) {
    // ignore storage issues
  }
}

function showPendingMessage() {
  try {
    const raw = localStorage.getItem("voicesOfHopePendingMessage");
    if (!raw) {
      return;
    }

    const payload = JSON.parse(raw);
    if (payload && payload.message) {
      showMessage(payload.message, payload.type || "info");
    }
    localStorage.removeItem("voicesOfHopePendingMessage");
  } catch (error) {
    localStorage.removeItem("voicesOfHopePendingMessage");
  }
}

function getSpeechSettings() {
  try {
    return JSON.parse(localStorage.getItem(speechSettingsStorageKey) || "{}");
  } catch (error) {
    return {};
  }
}

function saveSpeechSettings(settings) {
  localStorage.setItem(speechSettingsStorageKey, JSON.stringify(settings));
}

function getVoiceLanguage(voice) {
  return voice.lang || "unknown";
}

function populateSpeechControls() {
  const languageSelect = document.getElementById("languageSelect");
  const voiceSelect = document.getElementById("voiceSelect");
  if (!languageSelect || !voiceSelect) {
    return;
  }

  const settings = getSpeechSettings();
  const languages = Object.keys(indianLanguages).sort(function (firstLanguage, secondLanguage) {
    return indianLanguages[firstLanguage].localeCompare(indianLanguages[secondLanguage]);
  });

  languageSelect.innerHTML = "";
  languages.forEach(function (language) {
    const option = new Option(indianLanguages[language], language);
    languageSelect.add(option);
  });

  const selectedLanguage = languages.includes(settings.language) ? settings.language : languages[0];
  languageSelect.value = selectedLanguage;
  speech.lang = selectedLanguage;

  voiceSelect.innerHTML = "";
  const languageVoices = voices.filter(function (voice) {
    return getVoiceLanguage(voice) === selectedLanguage;
  });
  if (languageVoices.length) {
    languageVoices.forEach(function (voice) {
      voiceSelect.add(new Option(voice.name, voice.name));
    });
  } else {
    voiceSelect.add(new Option("No voice installed for this language", ""));
  }

  const selectedVoice = languageVoices.find(function (voice) {
    return voice.name === settings.voice;
  }) || languageVoices[0];
  if (selectedVoice) {
    voiceSelect.value = selectedVoice.name;
    speech.voice = selectedVoice;
  }
}

function loadSpeechVoices() {
  voices = window.speechSynthesis.getVoices();
  populateSpeechControls();
}

function enableScrollableSelect(select) {
  if (!select || select.dataset.scrollable === "true") {
    return;
  }

  select.dataset.scrollable = "true";
  select.addEventListener("focus", function () {
    select.size = Math.min(6, select.options.length);
  });
  select.addEventListener("change", function () {
    select.size = 1;
    select.blur();
  });
  select.addEventListener("blur", function () {
    select.size = 1;
  });
}

function speakText(text) {
  if (!("speechSynthesis" in window)) {
    return;
  }

  speech.text = (text || "").trim();
  if (!speech.text) {
    return;
  }

  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(speech);
}

async function translateText(text, sourceLanguage, targetLanguage) {
  const query = new URLSearchParams({
    q: text,
    langpair: sourceLanguage + "|" + targetLanguage
  });
  const response = await fetch("https://api.mymemory.translated.net/get?" + query);
  if (!response.ok) {
    throw new Error("Translation request failed");
  }

  const data = await response.json();
  const translatedText = data.responseData && data.responseData.translatedText;
  if (!translatedText) {
    throw new Error("No translation returned");
  }

  return translatedText;
}

function updateTranslationVerification(originalText, translatedText) {
  const original = document.getElementById("originalText");
  const translated = document.getElementById("translatedText");
  const backTranslation = document.getElementById("backTranslatedText");
  const verificationResult = document.getElementById("verificationResult");
  const verifyButton = document.getElementById("verifyTranslationButton");
  currentOriginalText = originalText;
  if (original) original.textContent = originalText;
  if (translated) translated.textContent = translatedText;
  if (backTranslation) backTranslation.textContent = "Not checked yet.";
  if (verificationResult) verificationResult.textContent = "Not checked yet.";
  if (verifyButton) verifyButton.disabled = !translatedText || translatedText === "Translation unavailable.";
}

function normalizeTranslationText(text) {
  return text
    .toLowerCase()
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function checkTranslation(original, backTranslation) {
  const verificationResult = document.getElementById("verificationResult");
  if (!verificationResult) {
    return;
  }

  const normalizedOriginal = normalizeTranslationText(original);
  const normalizedBackTranslation = normalizeTranslationText(backTranslation);

  if (normalizedOriginal === normalizedBackTranslation) {
    verificationResult.textContent = "✅ Translation is correct";
  } else {
    verificationResult.textContent = "❌ Translation may be incorrect. Please check the meaning.";
  }
}

async function translateAndSpeakText(text) {
  const languageSelect = document.getElementById("languageSelect");
  const result = document.getElementById("translationResult");
  const selectedLanguage = languageSelect ? languageSelect.value : "en-IN";
  const targetLanguage = selectedLanguage.split("-")[0];

  if (targetLanguage === "en") {
    translationLanguage = "en";
    if (result) result.textContent = text;
    updateTranslationVerification(text, text);
    speakText(text);
    return;
  }

  if (result) result.textContent = "Translating...";
  try {
    const translatedText = await translateText(text, "en", targetLanguage);

    translationLanguage = targetLanguage;
    if (result) result.textContent = translatedText;
    updateTranslationVerification(text, translatedText);
    speakText(translatedText);
  } catch (error) {
    translationLanguage = "";
    if (result) result.textContent = "Translation unavailable. Speaking the English text.";
    updateTranslationVerification(text, "Translation unavailable.");
    speakText(text);
  }
}

async function verifyTranslation() {
  const translated = document.getElementById("translatedText");
  const backTranslation = document.getElementById("backTranslatedText");
  const original = document.getElementById("originalText");
  if (!translated || !backTranslation || !original || !currentOriginalText || !translated.textContent.trim() || translated.textContent.trim() === "No translation yet." || translationLanguage === "") {
    return;
  }

  if (translationLanguage === "en") {
    backTranslation.textContent = translated.textContent;
    checkTranslation(currentOriginalText, backTranslation.textContent);
    return;
  }

  backTranslation.textContent = "Checking translation...";
  try {
    backTranslation.textContent = await translateText(translated.textContent, translationLanguage, "en");
    checkTranslation(currentOriginalText, backTranslation.textContent);
  } catch (error) {
    console.error(error);
    backTranslation.textContent = "Unable to verify translation.";
    const verificationResult = document.getElementById("verificationResult");
    if (verificationResult) verificationResult.textContent = "Unable to verify translation.";
  }
}

if ("speechSynthesis" in window) {
  window.speechSynthesis.onvoiceschanged = loadSpeechVoices;
  loadSpeechVoices();
}

function getCreatedButtonNames() {
  try {
    return JSON.parse(localStorage.getItem(createdButtonsStorageKey) || "[]");
  } catch (error) {
    return [];
  }
}

function saveCreatedButtonNames(names) {
  localStorage.setItem(createdButtonsStorageKey, JSON.stringify(names));
}

function openHospitalPage(buttonName) {
  const safeName = encodeURIComponent((buttonName || "").trim());
  window.location.href = "hospital.html?name=" + safeName;
}

function updateSavedButtonName(oldName, newName) {
  const names = getCreatedButtonNames();
  const normalizedOld = (oldName || "").trim();
  const normalizedNew = (newName || "").trim();

  if (!normalizedOld || !normalizedNew || normalizedOld === normalizedNew) {
    return;
  }

  const updatedNames = names.map(function (name) {
    return ((name || "").trim() === normalizedOld) ? normalizedNew : name;
  });

  saveCreatedButtonNames(updatedNames);
}

function createEditInput(labelElement) {
  const input = document.createElement("textarea");
  input.className = "edit-input";
  input.value = labelElement.textContent.trim();
  input.rows = 4;
  return input;
}

function makeEditIcon() {
  const img = document.createElement("img");
  img.src = "images/icons8-pencil-drawing-48.png";
  img.alt = "Edit";
  img.width = 24;
  img.height = 24;
  return img;
}

 function addButtonToPage(buttonName, buttonId = null, originalName = null){
  const list = document.querySelector("#list .row");
  if (!list) {
    return;
  }

  const wrapper = document.createElement("div");
  wrapper.className = "col-12 col-md-6 col-lg-3 edit-box";

  const glowButton = document.createElement("button");
  glowButton.type = "button";
  glowButton.className = "glow-button";
  glowButton.dataset.name = buttonName;
  glowButton.dataset.id = buttonId || "";
  glowButton.dataset.originalName = originalName || "";  
  

  const gradient = document.createElement("div");
  gradient.className = "gradient";

  const label = document.createElement("span");
  label.textContent = buttonName;

  glowButton.appendChild(gradient);
  glowButton.appendChild(label);

  glowButton.addEventListener("click", function (event) {
    if (wrapper.classList.contains("editing")) {
      event.stopPropagation();
      return;
    }
    openHospitalPage(label.textContent.trim() || glowButton.dataset.name || buttonName);
  });

  const editButton = document.createElement("button");
  editButton.type = "button";
  editButton.className = "edit-btn";
  editButton.setAttribute("aria-label", "Edit text");
  editButton.appendChild(makeEditIcon());

  editButton.addEventListener("click", async function () {
    const currentBox = editButton.closest(".edit-box");
    if (!currentBox) {
      return;
    }

    if (currentBox.classList.contains("editing")) {
      const editingInput = currentBox.querySelector(".edit-input");
      if (!editingInput) {
        return;
      }

      const newText = editingInput.value.trim();
      if (!newText) {
        editingInput.focus();
        return;
      }

      const originalName = glowButton.dataset.originalName || label.textContent.trim();
const buttonId = glowButton.dataset.id;

if (typeof supabaseClient === "undefined") {
  showMessage("Supabase is not available.", "error");
  return;
}

const { data: { user }, error: userError } =
  await supabaseClient.auth.getUser();

if (userError || !user) {
  showMessage("Please login first.", "info");
  return;
}

let data;
let error;

if (buttonId) {
  ({ data, error } = await supabaseClient
    .from("custom_buttons")
    .update({
      button_name: newText
    })
    .eq("id", buttonId)
    .eq("user_id", user.id)
    .select()
    .single());
} else {
  ({ data, error } = await supabaseClient
    .from("custom_buttons")
    .insert({
      user_id: user.id,
      button_name: newText,
      original_name: originalName,
      page_name: "Home"
    })
    .select()
    .single());
}

if (error) {
  console.error("Error saving button:", error);
  showMessage("Could not save the button: " + error.message, "error");
  return;
}

label.textContent = newText;
glowButton.dataset.name = newText;
glowButton.dataset.id = data.id;
glowButton.dataset.originalName = data.original_name || "";
editingInput.replaceWith(label);

currentBox.classList.remove("editing");
editButton.classList.remove("save-btn");
editButton.innerHTML = "";
editButton.appendChild(makeEditIcon());
editButton.setAttribute("aria-label", "Edit text");
return;
    }

    const input = createEditInput(label);
    editButton.dataset.originalName = label.textContent.trim();
    label.replaceWith(input);

    currentBox.classList.add("editing");
    editButton.classList.add("save-btn");
    editButton.textContent = "Save";
    editButton.setAttribute("aria-label", "Save text");
    input.focus();
  });

  wrapper.appendChild(glowButton);
  wrapper.appendChild(editButton);
  list.appendChild(wrapper);
}

function getHospitalButtonStorageKey() {
  const params = new URLSearchParams(window.location.search);
  const pageName = params.get("name") || "Hospital";
  return "hospitalButtons:" + pageName.trim();
}

function getHospitalButtonNames() {
  try {
    return JSON.parse(localStorage.getItem(getHospitalButtonStorageKey()) || "[]");
  } catch (error) {
    return [];
  }
}

function saveHospitalButtonNames(names) {
  const key = getHospitalButtonStorageKey();
  localStorage.setItem(key, JSON.stringify(names));
}

function addHospitalButtonToPage(buttonName) {
  const list = document.querySelector("#hospitalList .row");
  if (!list) {
    return;
  }

  const wrapper = document.createElement("div");
  wrapper.className = "col-12 col-md-6 col-lg-3 edit-box";

  const glowButton = document.createElement("button");
  glowButton.type = "button";
  glowButton.className = "glow-button";
  glowButton.dataset.name = buttonName;

  const gradient = document.createElement("div");
  gradient.className = "gradient";

  const label = document.createElement("span");
  label.textContent = buttonName;

  glowButton.appendChild(gradient);
  glowButton.appendChild(label);

  glowButton.addEventListener("click", function (event) {
    if (wrapper.classList.contains("editing")) {
      event.stopPropagation();
      return;
    }
    const buttonText = label.textContent.trim() || glowButton.dataset.name || buttonName;
    translateAndSpeakText(buttonText);
  });

  const editButton = document.createElement("button");
  editButton.type = "button";
  editButton.className = "edit-btn";
  editButton.setAttribute("aria-label", "Edit text");
  editButton.appendChild(makeEditIcon());

  editButton.addEventListener("click", function () {
    const currentBox = editButton.closest(".edit-box");
    if (!currentBox) {
      return;
    }

    if (currentBox.classList.contains("editing")) {
      const editingInput = currentBox.querySelector(".edit-input");
      if (!editingInput) {
        return;
      }

      const newText = editingInput.value.trim();
      if (!newText) {
        editingInput.focus();
        return;
      }

      const originalName = editButton.dataset.originalName || label.textContent.trim();
      label.textContent = newText;
      glowButton.dataset.name = newText;
      editingInput.replaceWith(label);

      const hospitalNames = getHospitalButtonNames();
      const updatedNames = hospitalNames.map(function (name) {
        return ((name || "").trim() === (originalName || "").trim()) ? newText : name;
      });
      saveHospitalButtonNames(updatedNames);

      currentBox.classList.remove("editing");
      editButton.classList.remove("save-btn");
      editButton.innerHTML = "";
      editButton.appendChild(makeEditIcon());
      editButton.setAttribute("aria-label", "Edit text");
      return;
    }

    const input = createEditInput(label);
    editButton.dataset.originalName = label.textContent.trim();
    label.replaceWith(input);

    currentBox.classList.add("editing");
    editButton.classList.add("save-btn");
    editButton.textContent = "Save";
    editButton.setAttribute("aria-label", "Save text");
    input.focus();
  });

  wrapper.appendChild(glowButton);
  wrapper.appendChild(editButton);
  list.appendChild(wrapper);
}

async function createHospitalButton() {
  const buttonName = await showInputPrompt({
    titleText: "Add a hospital button",
    placeholder: "Enter a button name",
    confirmText: "Add"
  });

  if (!buttonName || !buttonName.trim()) {
    return;
  }

  const trimmedName = buttonName.trim();
  const savedNames = getHospitalButtonNames();
  if (!savedNames.includes(trimmedName)) {
    savedNames.push(trimmedName);
    saveHospitalButtonNames(savedNames);
  }

  addHospitalButtonToPage(trimmedName);
}

async function createButton() {
  if (typeof supabaseClient === "undefined") {
    console.error("Supabase client is not available.");
    showMessage("The button service is unavailable right now.", "error");
    return;
  }

  const { data: { user }, error: userError } = await supabaseClient.auth.getUser();

  if (userError) {
    console.error("Error getting logged-in user:", userError);
    showMessage("Unable to check your login.", "error");
    return;
  }

  if (!user) {
    showMessage("Please login first to create a button.", "info");
    return;
  }

  const buttonName = await showInputPrompt({
    titleText: "Create a button",
    placeholder: "Enter a name for the button",
    confirmText: "Create"
  });

  if (!buttonName || !buttonName.trim()) {
    return;
  }

  const trimmedName = buttonName.trim();

  const { data, error } = await supabaseClient
    .from("custom_buttons")
    .insert({
      user_id: user.id,
      button_name: trimmedName,
      page_name: "Home"
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating button:", error);
    showMessage("Could not create button: " + error.message, "error");
    return;
  }

  addButtonToPage(
  data.button_name,
  data.id,
  data.original_name
);

  console.log("Button created successfully:", data);
}

function scrollToHashSection() {
  const sectionHashes = ["#about", "#contact", "#disclaimer", "#privacy", "#terms"];
  if (!sectionHashes.includes(window.location.hash)) {
    return;
  }

  requestAnimationFrame(function () {
    const section = document.querySelector(window.location.hash);
    if (section) {
      section.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });
}

function updateHomeNavigationState() {
  const homeLink = document.querySelector('.navbar .nav-link[href="index.html"]');
  const aboutLink = document.querySelector('.navbar .nav-link[href="#about"]');
  if (!homeLink || !aboutLink) {
    return;
  }

  const aboutIsActive = window.location.hash === "#about";
  homeLink.classList.toggle("active", !aboutIsActive);
  aboutLink.classList.toggle("active", aboutIsActive);
}

document.addEventListener("DOMContentLoaded", function () {
  showPendingMessage();

  const logoutButton = document.getElementById("logoutButton");

    if (logoutButton) {
        logoutButton.addEventListener("click", logoutUser);
    }
  const hospitalList = document.getElementById("hospitalList");
  if (hospitalList) {
    const createButtonBtn = document.getElementById("createButtonBtn");
    if (createButtonBtn) {
      createButtonBtn.addEventListener("click", createHospitalButton);
    }

    const hospitalNames = getHospitalButtonNames();
    const defaultHospitalNames = ["Doctor", "Emergency", "ICU", "Lab", "Pharmacy"];
    const cleanedNames = hospitalNames.filter(function (name) {
      return !defaultHospitalNames.includes((name || "").trim());
    });

    if (cleanedNames.length !== hospitalNames.length) {
      saveHospitalButtonNames(cleanedNames);
    }

    if (cleanedNames.length) {
      cleanedNames.forEach(function (name) {
        addHospitalButtonToPage(name);
      });
    }

    const params = new URLSearchParams(window.location.search);
    const pageName = params.get("name");
    const displayName = pageName ? decodeURIComponent(pageName) : "Hospital";

    const hospitalNameEl = document.getElementById("hospitalName");
    const pageTitleEl = document.getElementById("pageTitle");
    if (hospitalNameEl) hospitalNameEl.textContent = displayName;
    if (pageTitleEl) pageTitleEl.textContent = displayName;

    const languageSelect = document.getElementById("languageSelect");
    const voiceSelect = document.getElementById("voiceSelect");
    enableScrollableSelect(languageSelect);
    enableScrollableSelect(voiceSelect);
    populateSpeechControls();
    if (languageSelect) {
      languageSelect.addEventListener("change", function () {
        const settings = getSpeechSettings();
        settings.language = languageSelect.value;
        settings.voice = "";
        saveSpeechSettings(settings);
        populateSpeechControls();
      });
    }
    if (voiceSelect) {
      voiceSelect.addEventListener("change", function () {
        const selectedVoice = voices.find(function (voice) {
          return voice.name === voiceSelect.value;
        });
        if (!selectedVoice) {
          return;
        }

        speech.voice = selectedVoice;
        speech.lang = selectedVoice.lang;
        saveSpeechSettings({
          language: selectedVoice.lang,
          voice: selectedVoice.name
        });
      });
    }

    const verifyTranslationButton = document.getElementById("verifyTranslationButton");
    if (verifyTranslationButton) {
      verifyTranslationButton.addEventListener("click", verifyTranslation);
    }

    const hospitalSearch = document.getElementById("search");
    const hospitalRow = document.querySelector("#hospitalList .row");
    if (hospitalSearch && hospitalRow) {
      hospitalSearch.addEventListener("input", function () {
        const text = hospitalSearch.value.trim().toLowerCase();
        const buttons = Array.from(hospitalRow.children);
        buttons.sort(function (a, b) {
          const aText = a.textContent.trim().toLowerCase();
          const bText = b.textContent.trim().toLowerCase();
          const aMatch = aText.startsWith(text);
          const bMatch = bText.startsWith(text);
          if (aMatch && !bMatch) return -1;
          if (!aMatch && bMatch) return 1;
          return aText.localeCompare(bText);
        });
        buttons.forEach(function (button) {
          hospitalRow.appendChild(button);
        });
      });
    }
    return;
  }

  const createButtonBtn = document.getElementById("createButtonBtn");
  if (createButtonBtn) {
    createButtonBtn.addEventListener("click", createButton);
  }

  const search = document.getElementById("search");
  const list = document.querySelector("#list .row");
  if (!list) {
    return;
  }

 const defaultNames = [
  "HOSPITAL",
  "SCHOOL",
  "MALL",
  "BUS STAND",
  "Railway station",
  "Police station",
  "Post office"
];

async function loadUserButtons() {
  if (typeof supabaseClient === "undefined") {
    console.error("Supabase client is not available.");
    return;
  }

  const { data: { user }, error: userError } =
    await supabaseClient.auth.getUser();

  if (userError) {
    console.error("Error getting logged-in user:", userError);
    return;
  }

  if (!user) {
    console.log("No user logged in.");
    return;
  }

  const { data, error } = await supabaseClient
    .from("custom_buttons")
    .select("*")
    .eq("user_id", user.id)
    .eq("page_name", "Home")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error loading buttons:", error);
    return;
  }

  console.log("User's buttons:", data);

  defaultNames.forEach(function (defaultName) {
    const customized = data.find(function (button) {
      return (button.original_name || "").trim().toLowerCase() ===
        defaultName.trim().toLowerCase();
    });

    if (customized) {
      addButtonToPage(
        customized.button_name,
        customized.id,
        customized.original_name
      );
    } else {
      addButtonToPage(
        defaultName,
        null,
        defaultName
      );
    }
  });

  data
    .filter(function (button) {
      return !button.original_name;
    })
    .forEach(function (button) {
      addButtonToPage(
        button.button_name,
        button.id,
        null
      );
    });
}

loadUserButtons();

  if (search) {
    search.addEventListener("input", function () {
      const text = search.value.trim().toLowerCase();
      const buttons = Array.from(list.children);
      buttons.sort(function (a, b) {
        const aText = a.textContent.trim().toLowerCase();
        const bText = b.textContent.trim().toLowerCase();
        const aMatch = aText.startsWith(text);
        const bMatch = bText.startsWith(text);
        if (aMatch && !bMatch) return -1;
        if (!aMatch && bMatch) return 1;
        return aText.localeCompare(bText);
      });
      buttons.forEach(function (button) {
        list.appendChild(button);
      });
    });
  }

  scrollToHashSection();
  updateHomeNavigationState();
});

window.addEventListener("hashchange", updateHomeNavigationState);
const contactForm = document.getElementById("contactForm");

if (contactForm) {

    contactForm.addEventListener("submit", async function (event) {

        event.preventDefault();

        const name = document.getElementById("name").value.trim();
        const email = document.getElementById("email").value.trim();
        const message = document.getElementById("message").value.trim();

        if (!window.supabase || typeof supabaseClient === "undefined") {
          console.error("Supabase is not available. Check the Supabase script and configuration.");
          showMessage("The message service is unavailable right now. Please try again later.", "error");
          return;
        }

        let error;
        try {
          ({ error } = await supabaseClient
            .from("contact_form")
            .insert({ name: name, email: email, message: message }));
        } catch (requestError) {
          console.error("Supabase request failed:", requestError);
          showMessage("The message service could not be reached. Check your connection and try again.", "error");
          return;
        }

        if (error) {
          console.error("Supabase error:", {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
          });
          showMessage("Unable to send your message: " + error.message, "error");
            return;
        }

        showMessage("Your message has been sent successfully!", "success");

        contactForm.reset();
    });
}
// ========================================
// CHECK CURRENTLY LOGGED-IN USER
// ========================================

async function checkUser() {

    const { data, error } = await supabaseClient.auth.getUser();

    if (error) {
        console.error("User check error:", error);
        return;
    }

    if (data.user) {

        console.log("Logged in user:", data.user);
        console.log("User ID:", data.user.id);
        console.log("Email:", data.user.email);

    } else {

        console.log("No user is logged in.");

    }
}

checkUser();
async function logoutUser() {
    const { error } = await supabaseClient.auth.signOut();

    if (error) {
        console.error("Logout error:", error);
        showMessage("Logout failed.", "error");
        return;
    }

    window.location.href = "login.html";
    
}
// ========================================
// UPDATE NAVBAR FOR LOGGED-IN USER
// ========================================

async function updateNavbarUser() {

    const loginLink = document.getElementById("loginLink");

    if (!loginLink) {
        return;
    }

    const { data, error } = await supabaseClient.auth.getUser();

    if (error) {
        console.error("Navbar user error:", error);
        return;
    }

    if (data.user) {

        const fullName = data.user.user_metadata?.full_name;

        if (fullName) {

            const initial = fullName.charAt(0).toUpperCase();

            loginLink.textContent = initial;
            loginLink.href = "#";
            loginLink.title = fullName;
            loginLink.classList.add("user-initial");
            return;
        }
    }

    loginLink.classList.remove("user-initial");
}

updateNavbarUser();