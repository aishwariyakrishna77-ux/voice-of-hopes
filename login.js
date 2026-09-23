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

function setPendingMessage(message, type) {
  try {
    localStorage.setItem("voicesOfHopePendingMessage", JSON.stringify({ message, type }));
  } catch (error) {
    // ignore storage issues
  }
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

const container = document.getElementById("container");
const signUpButton = document.getElementById("signUp");
const signInButton = document.getElementById("signIn");

signUpButton.addEventListener("click", function () {
  container.classList.add("right-panel-active");
});

signInButton.addEventListener("click", function () {
  container.classList.remove("right-panel-active");
});
const signupForm = document.getElementById("signupForm");

signupForm.addEventListener("submit", async function (event) {

    event.preventDefault();

    const name = document.getElementById("name").value.trim();

    const email = document.getElementById("signup-email").value.trim();

    const password = document.getElementById("signup-password").value;


    const { data, error } = await supabaseClient.auth.signUp({

        email: email,

        password: password,

        options: {
            data: {
                full_name: name
            }
        }

    });


    if (error) {

        console.error("Sign up error:", error);

        showMessage(error.message, "error");

        return;

    }


    console.log("User created:", data.user);

    showMessage("Account created successfully!", "success");
    setPendingMessage("Login successful!", "success");

});


// ===============================
// SIGN IN
// ===============================

const signinForm = document.getElementById("signinForm");

signinForm.addEventListener("submit", async function (event) {

    event.preventDefault();

    const email = document.getElementById("signin-email").value.trim();

    const password = document.getElementById("signin-password").value;


    const { data, error } =
        await supabaseClient.auth.signInWithPassword({

            email: email,

            password: password

        });


    if (error) {

        console.error("Sign in error:", error);

        showMessage(error.message, "error");

        return;

    }


    console.log("Logged in user:", data.user);

    setPendingMessage("Login successful!", "success");
    showMessage("Login successful!", "success");

    setTimeout(function () {
      window.location.href = "index.html";
    }, 1000);

});


/**document.querySelectorAll(".form-container form").forEach(function (form) {
  form.addEventListener("submit", function (event) {
    event.preventDefault();
  });
});**/
