const form = document.getElementById("userForm");
const previewFrame = document.getElementById("cardPreviewFrame");
const servicesFields = document.getElementById("servicesFields");
const addServiceBtn = document.getElementById("addServiceBtn");
const customSocialFields = document.getElementById("customSocialFields");
const addCustomSocialBtn = document.getElementById("addCustomSocialBtn");
const imageDataCache = {};
let previewTimer = null;
const MAX_SERVICES = 10;
const MAX_CUSTOM_SOCIAL = 3;
let serviceCount = 0;
let customSocialCount = 0;

const previewFrameDoc = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/7.0.1/css/all.min.css">
  <link rel="stylesheet" href="/card.css" />
  <title>Preview</title>
</head>
<body>
  <div id="previewRoot" class="page"></div>
  <script>
    function esc(v){ return String(v || "").replace(/[&<>"']/g, (m) => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[m])); }
    function buildServices(data) {
      const services = [];
      for (let i = 1; i <= 10; i++) {
        const t = data["service" + i + "Title"];
        const d = data["service" + i + "Description"];
        const l = data["service" + i + "Link"];
        const img = data["service" + i + "Image"];
        if (t || d || l || img) {
          services.push({ t, d, l, i: img, ft: "Service " + i, fd: "Professional service tailored for your business goals." });
        }
      }
      return services;
    }
    function render(data){
      const name = data.name || "Your Name";
      const services = buildServices(data);
      const achievements = (data.achievementsList || "").split(/\\r?\\n/).map((s) => s.trim()).filter(Boolean);
      const customSocial = [];
      for (let i = 1; i <= 3; i++) {
        const title = data["customSocial" + i + "Title"];
        const url = data["customSocial" + i + "Url"];
        if (title && url) customSocial.push({ title, url });
      }
      const hasSocial = data.youtube || data.instagram || data.x || data.linkedin || data.facebook || data.pinterest || customSocial.length;
      const avatar = data.profileImage ? '<img class="profile-image" src="' + esc(data.profileImage) + '" alt="profile">' : '<div class="avatar-badge">' + esc(name.charAt(0).toUpperCase()) + '</div>';

      const tabs = services.map((s, i) => '<button class="service-tab-btn ' + (i===0 ? 'active' : '') + '" type="button">' + esc(s.t || s.ft) + '</button>').join("");
      const panels = services.map((s, i) => (
        '<article class="card-box service-tab-panel ' + (i===0 ? 'active' : '') + '">' +
          '<div class="service-panel-content">' +
            '<div class="service-panel-text">' +
              '<h3>' + esc(s.t || s.ft) + '</h3>' +
              '<p>' + esc(s.d || s.fd) + '</p>' +
              (s.l ? '<a class="inline-link" href="#" onclick="return false;">Open service link <i class="fa-solid fa-arrow-up-right-from-square"></i></a>' : '') +
            '</div>' +
            (s.i ? '<img class="service-image" src="' + esc(s.i) + '" alt="service">' : '') +
          '</div>' +
        '</article>'
      )).join("");

      const achievementsList = achievements.length
        ? '<ul class="achievements-list">' + achievements.map((a) => '<li>' + esc(a) + '</li>').join("") + '</ul>'
        : '<p class="muted-tip">Add achievements to preview this section.</p>';

      document.getElementById("previewRoot").innerHTML =
        '<header class="topbar"><div class="topbar-inner"><p class="brand">' + esc(data.brandName || name) + '</p></div></header>' +
        '<main class="wrapper">' +
          '<section class="hero-panel" style="grid-template-columns:1fr;">' +
            '<article class="hero-content">' +
              '<div class="intro-head"><div>' + avatar + '</div><div class="intro-head-copy">' +
                '<h1 class="name">' + esc(name) + '</h1>' +
                '<p class="hero-tagline">' + esc(data.occupation || "Professional") + '</p>' +
              '</div></div>' +
              '<p class="hero-description intro-copy expanded">' + esc(data.heroDescription || data.description || "") + '</p>' +
            '</article>' +
          '</section>' +
          (services.length ? '<section class="section-block">' +
            '<p class="section-kicker">Services Offered</p>' +
            '<h2 class="section-title">What I can help you with</h2>' +
            '<div class="services-tabs"><div class="services-tabs-row">' + tabs + '</div><div class="services-tab-panels">' + panels + '</div></div>' +
          '</section>' : '') +
          '<section class="section-block company-achievements-row">' +
            '<article class="card-box company-pane"><p class="section-kicker">' + esc(data.companySectionTitle || "My Company") + '</p>' +
              '<div class="company-card">' + (data.companyLogo ? '<img class="company-logo" src="' + esc(data.companyLogo) + '" alt="logo">' : '') +
              '<div class="company-content"><h3>' + esc(data.companyName || "My Company") + '</h3><p>' + esc(data.companyDescription || "We build high quality solutions focused on business growth and long term value.") + '</p></div></div>' +
            '</article>' +
            '<article class="card-box achievements-pane achievements-single-card"><p class="section-kicker">Achievements</p><h3>' + esc(data.achievementsSectionTitle || "Highlights so far") + '</h3>' + achievementsList + '</article>' +
          '</section>' +
          '<section class="section-block"><p class="section-kicker">Contact</p><h2 class="section-title">Let\\'s build something great</h2>' +
          '<article class="card-box contact-only-card"><div class="contact-actions">' +
          '<a class="btn primary" href="#" onclick="return false;"><i class="fa-solid fa-envelope"></i><span>Email Me</span></a>' +
          '<a class="btn secondary" href="#" onclick="return false;"><i class="fa-solid fa-phone"></i><span>Call Me</span></a>' +
          '</div></article>' +
          (hasSocial ? '<article class="card-box social-only-card"><h3>Social Links</h3><div class="social-list">' +
            (data.youtube ? '<a class="social-card" href="#" onclick="return false;"><i class="fa-brands fa-youtube"></i><span>YouTube</span></a>' : '') +
            (data.instagram ? '<a class="social-card" href="#" onclick="return false;"><i class="fa-brands fa-instagram"></i><span>Instagram</span></a>' : '') +
            (data.x ? '<a class="social-card" href="#" onclick="return false;"><i class="fa-brands fa-square-x-twitter"></i><span>X</span></a>' : '') +
            (data.linkedin ? '<a class="social-card" href="#" onclick="return false;"><i class="fa-brands fa-linkedin"></i><span>LinkedIn</span></a>' : '') +
            (data.facebook ? '<a class="social-card" href="#" onclick="return false;"><i class="fa-brands fa-facebook"></i><span>Facebook</span></a>' : '') +
            (data.pinterest ? '<a class="social-card" href="#" onclick="return false;"><i class="fa-brands fa-pinterest"></i><span>Pinterest</span></a>' : '') +
            customSocial.map((item) => '<a class="social-card" href="#" onclick="return false;"><i class="fa-light fa-globe"></i><span>' + esc(item.title) + '</span></a>').join("") +
          '</div></article>' : '') +
          '</section>' +
        '</main>';
    }
    window.addEventListener("message", (event) => {
      const payload = event.data;
      if (!payload || payload.type !== "ecard-preview") return;
      render(payload.data || {});
    });
    render({});
  </script>
</body>
</html>
`;

previewFrame.srcdoc = previewFrameDoc;

function appendServiceField(index) {
    if (!servicesFields) return;
    const card = document.createElement("div");
    card.className = "service-field-card";
    card.innerHTML = `
        <p class="service-field-title">Service ${index}</p>
        <input type="text" name="service${index}-title" placeholder="Service ${index} Title">
        <textarea name="service${index}-description" placeholder="Service ${index} Brief Description"></textarea>
        <input type="url" name="service${index}-link" placeholder="Service ${index} Link (https://...)">
        <input type="url" name="service${index}-image" placeholder="Service ${index} Image URL (Optional)">
        <label class="file-input-label">Or upload Service ${index} Image (Optional)</label>
        <input type="file" name="service${index}-image-file" accept="image/*">
    `;
    servicesFields.appendChild(card);
}

function initServicesBuilder() {
    serviceCount = 1;
    appendServiceField(serviceCount);
    if (addServiceBtn) {
        addServiceBtn.addEventListener("click", function () {
            if (serviceCount >= MAX_SERVICES) return;
            serviceCount += 1;
            appendServiceField(serviceCount);
            if (serviceCount >= MAX_SERVICES) {
                addServiceBtn.style.display = "none";
            }
            schedulePreview();
        });
    }
}

initServicesBuilder();

function appendCustomSocialField(index) {
    if (!customSocialFields) return;
    const card = document.createElement("div");
    card.className = "service-field-card";
    card.innerHTML = `
        <p class="service-field-title">Custom Social ${index}</p>
        <input type="text" name="custom-social${index}-title" placeholder="Platform Name (e.g. GitHub, Behance)">
        <input type="url" name="custom-social${index}-url" placeholder="Platform Link (https://...)">
    `;
    customSocialFields.appendChild(card);
}

function initCustomSocialBuilder() {
    if (!addCustomSocialBtn) return;
    addCustomSocialBtn.addEventListener("click", function () {
        if (customSocialCount >= MAX_CUSTOM_SOCIAL) return;
        customSocialCount += 1;
        appendCustomSocialField(customSocialCount);
        if (customSocialCount >= MAX_CUSTOM_SOCIAL) {
            addCustomSocialBtn.style.display = "none";
        }
        schedulePreview();
    });
}

initCustomSocialBuilder();

function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
        if (!file) return resolve("");
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = () => reject(new Error("Failed to read image file."));
        reader.readAsDataURL(file);
    });
}

async function buildUserData() {
    const formData = new FormData(form);
    const fileInputs = [
        "profile-image-file",
        "company-logo-file"
    ];
    for (let i = 1; i <= MAX_SERVICES; i++) {
        fileInputs.push(`service${i}-image-file`);
    }

    for (const inputName of fileInputs) {
        const file = formData.get(inputName);
        if (file && file.size > 0) {
            imageDataCache[inputName] = await readFileAsDataUrl(file);
        } else {
            imageDataCache[inputName] = "";
        }
    }

    const userData = {
        name: formData.get("name"),
        occupation: formData.get("occupation"),
        description: formData.get("description"),
        brandName: formData.get("brand-name"),
        heroDescription: formData.get("description"),
        companySectionTitle: formData.get("company-section-title"),
        achievementsSectionTitle: formData.get("achievements-section-title"),
        achievementsList: formData.get("achievements-list"),
        achievement1: formData.get("achievement1"),
        achievement2: formData.get("achievement2"),
        achievement3: formData.get("achievement3"),
        profileImage: imageDataCache["profile-image-file"] || formData.get("profile-image"),
        companyName: formData.get("company-name"),
        companyDescription: formData.get("company-description"),
        companyWebsite: formData.get("company-website"),
        companyLogo: imageDataCache["company-logo-file"] || formData.get("company-logo"),
        businessEmail: formData.get("bus-email"),
        phone: formData.get("phone"),
        personalEmail: formData.get("per-email"),
        youtube: formData.get("youtube"),
        instagram: formData.get("instagram"),
        x: formData.get("x"),
        linkedin: formData.get("linkedin"),
        facebook: formData.get("facebook"),
        pinterest: formData.get("pinterest")
    };

    const serviceCards = Array.from(servicesFields ? servicesFields.querySelectorAll(".service-field-card") : []);
    for (let i = 1; i <= MAX_SERVICES; i++) {
        const card = serviceCards[i - 1];
        const titleInput = card ? card.querySelector(`[name="service${i}-title"]`) : null;
        const descInput = card ? card.querySelector(`[name="service${i}-description"]`) : null;
        const linkInput = card ? card.querySelector(`[name="service${i}-link"]`) : null;
        const imageInput = card ? card.querySelector(`[name="service${i}-image"]`) : null;

        userData[`service${i}Title`] = titleInput ? titleInput.value.trim() : "";
        userData[`service${i}Description`] = descInput ? descInput.value.trim() : "";
        userData[`service${i}Link`] = linkInput ? linkInput.value.trim() : "";
        userData[`service${i}Image`] = imageDataCache[`service${i}-image-file`] || (imageInput ? imageInput.value.trim() : "");
    }
    for (let i = 1; i <= MAX_CUSTOM_SOCIAL; i++) {
        userData[`customSocial${i}Title`] = formData.get(`custom-social${i}-title`) || "";
        userData[`customSocial${i}Url`] = formData.get(`custom-social${i}-url`) || "";
    }

    return userData;
}

async function refreshPreview() {
    const data = await buildUserData();
    if (previewFrame && previewFrame.contentWindow) {
        previewFrame.contentWindow.postMessage({ type: "ecard-preview", data }, "*");
    }
}

function schedulePreview() {
    if (previewTimer) clearTimeout(previewTimer);
    previewTimer = setTimeout(() => {
        refreshPreview().catch((err) => console.error("Preview update failed:", err));
    }, 120);
}

form.addEventListener("input", schedulePreview);
form.addEventListener("change", schedulePreview);
previewFrame.addEventListener("load", () => {
    refreshPreview().catch((err) => console.error("Initial preview failed:", err));
});

form.addEventListener("submit", async function (event) {
    event.preventDefault();
    const warningMessage = "The things which are in this card can only be done once. They cannot be edited. So look wisely and then pay and get your card. If you want any changes, you have to contact the support staff.";
    const confirmed = window.confirm(warningMessage);
    if (!confirmed) {
        return;
    }

    const submitButton = form.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.textContent = "Processing...";

    try {
        const userData = await buildUserData();

        const orderResponse = await fetch("/create-order", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(userData)
        });

        const orderData = await orderResponse.json();
        if (!orderResponse.ok) {
            throw new Error(orderData.message || "Failed to create payment order.");
        }

        const options = {
            key: orderData.keyId,
            amount: orderData.amount,
            currency: orderData.currency,
            name: "Xevonet ECard",
            description: "Digital Business Card",
            order_id: orderData.orderId,
            handler: async function (response) {
                try {
                    const verifyResponse = await fetch("/verify-payment", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                            userData
                        })
                    });

                    const verifyData = await verifyResponse.json();
                    if (!verifyResponse.ok) {
                        throw new Error(verifyData.message || "Payment verification failed.");
                    }
                    window.location.href = verifyData.cardURL;
                } catch (error) {
                    alert(error.message || "Payment succeeded, but verification failed.");
                    resetButton();
                }
            },
            prefill: {
                name: userData.name,
                email: userData.personalEmail,
                contact: userData.phone
            },
            theme: { color: "#111111" },
            modal: {
                ondismiss: function () {
                    resetButton();
                }
            }
        };

        const razorpay = new Razorpay(options);
        razorpay.open();
    } catch (error) {
        alert(error.message || "Something went wrong while starting payment.");
        resetButton();
    }

    function resetButton() {
        submitButton.disabled = false;
        submitButton.textContent = "Pay & Create My Card";
    }
});