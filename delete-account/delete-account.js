const supabaseUrl = "https://sfjjclirtcvujkfwqshb.supabase.co";
const publishableKey = "sb_publishable_1aTm_wTneH0tjKpTUMaMUg_drAqcDju";
const authEndpoint = `${supabaseUrl}/auth/v1/token?grant_type=password`;
const deletionEndpoint = `${supabaseUrl}/functions/v1/delete-user`;

const form = document.querySelector("#delete-account-form");
const statusElement = document.querySelector("#delete-status");
const submitButton = document.querySelector("#delete-account-button");
const successElement = document.querySelector("#delete-success");
const introElement = document.querySelector("#delete-form-intro");
const loadingElement = document.querySelector("#delete-form-loading");

loadingElement.hidden = true;
form.hidden = false;

const showStatus = (message, type = "error") => {
  statusElement.textContent = message;
  statusElement.dataset.type = type;
  statusElement.hidden = false;
};

const clearStatus = () => {
  statusElement.textContent = "";
  statusElement.removeAttribute("data-type");
  statusElement.hidden = true;
};

const requestJson = async (url, options) => {
  const response = await fetch(url, {
    ...options,
    cache: "no-store",
    credentials: "omit",
    referrerPolicy: "no-referrer",
  });
  const body = await response.json().catch(() => ({}));
  return { response, body };
};

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearStatus();

  const formData = new FormData(form);
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const confirmation = String(formData.get("confirmation") ?? "").trim();
  const permanent = formData.get("permanent") === "on";

  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  if (confirmation !== "DELETE" || !permanent) {
    showStatus("Type DELETE and confirm that deletion is permanent.");
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = "Verifying account…";
  let accessToken = "";

  try {
    const { response: authResponse, body: authBody } = await requestJson(
      authEndpoint,
      {
        method: "POST",
        headers: {
          apikey: publishableKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      },
    );

    const authenticatedEmail = String(authBody?.user?.email ?? "").toLowerCase();
    accessToken = String(authBody?.access_token ?? "");

    if (
      !authResponse.ok ||
      !accessToken ||
      !authenticatedEmail ||
      authenticatedEmail !== email
    ) {
      throw new Error("verification_failed");
    }

    submitButton.textContent = "Deleting account and data…";

    const { response: deleteResponse, body: deleteBody } = await requestJson(
      deletionEndpoint,
      {
        method: "POST",
        headers: {
          apikey: publishableKey,
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password }),
      },
    );

    if (!deleteResponse.ok || deleteBody?.success !== true) {
      if (deleteResponse.status === 401) {
        throw new Error("verification_failed");
      }
      throw new Error("deletion_failed");
    }

    form.reset();
    form.hidden = true;
    introElement.hidden = true;
    successElement.hidden = false;
    successElement.focus();
  } catch (error) {
    if (error instanceof Error && error.message === "verification_failed") {
      showStatus(
        "We could not verify those account credentials. Check the email and current password, then try again.",
      );
    } else {
      showStatus(
        "The account could not be deleted right now. No deletion was completed. Please try again or contact Beacon Support.",
      );
    }
  } finally {
    accessToken = "";
    form.querySelector("#account-password").value = "";
    submitButton.disabled = false;
    submitButton.textContent = "Verify and permanently delete";
  }
});
