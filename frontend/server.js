const path = require("path");
const fs = require("fs");
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const multer = require("multer");
const Card = require("./cardModel");

dotenv.config({ path: path.join(__dirname, ".env") });

const app = express();
const uploadsDir = path.join(__dirname, "uploads");

if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

const PORT = Number(process.env.PORT || 3000);
const NODE_ENV = (process.env.NODE_ENV || "development").trim();
const DEFAULT_BASE_URL = NODE_ENV === "production" ? "https://card.xevonet.com" : `http://localhost:${PORT}`;
const BASE_URL = (process.env.BASE_URL || DEFAULT_BASE_URL).trim();
const CARD_PRICE_INR = Number(process.env.CARD_PRICE_INR || 499);
const CANONICAL_HOST = (process.env.CANONICAL_HOST || "").trim().toLowerCase();
const corsAllowList = (process.env.CORS_ORIGIN || BASE_URL)
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

app.set("trust proxy", 1);
app.disable("x-powered-by");

app.use(cors({
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        if (corsAllowList.includes(origin)) return callback(null, true);
        return callback(new Error("CORS blocked for this origin."));
    }
}));
app.use(express.json({ limit: "25mb" }));
app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(uploadsDir));

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

if (CANONICAL_HOST) {
    app.use((req, res, next) => {
        const host = String(req.get("host") || "").split(":")[0].toLowerCase();
        if (host && host !== CANONICAL_HOST) {
            return res.redirect(301, `${getBaseUrl(req)}${req.originalUrl}`);
        }
        return next();
    });
}

// 🔥 Razorpay
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

// 🔥 Nodemailer (Hostinger SMTP)
const transporter = nodemailer.createTransport({
    host: "smtp.hostinger.com",
    port: 465,
    secure: true,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// 🔧 Helpers
function createSlug(name) {
    return name
        .toLowerCase()
        .trim()
        .replace(/\s+/g, "-")
        .replace(/[^\w\-]+/g, "");
}

function normalizeUrl(url) {
    if (!url) return "";

    url = url.trim();

    if (
        url.startsWith("http://") ||
        url.startsWith("https://") ||
        url.startsWith("data:image/")
    ) {
        return url;
    }

    return "https://" + url;
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
        const ext = path.extname(file.originalname || "").toLowerCase();
        const safeExt = ext && ext.length <= 10 ? ext : "";
        cb(null, `${Date.now()}_${Math.round(Math.random() * 1e9)}${safeExt}`);
    }
});

const imageUpload = multer({
    storage,
    limits: { fileSize: 25 * 1024 * 1024 },
    fileFilter: function (req, file, cb) {
        if ((file.mimetype || "").startsWith("image/")) return cb(null, true);
        cb(new Error("Only image files are allowed."));
    }
});

const videoUpload = multer({
    storage,
    limits: { fileSize: 120 * 1024 * 1024 },
    fileFilter: function (req, file, cb) {
        const type = file.mimetype || "";
        if (type.startsWith("video/")) return cb(null, true);
        if (/\.(mp4|webm|mov|mkv)$/i.test(file.originalname || "")) return cb(null, true);
        cb(new Error("Only video files are allowed."));
    }
});

function verifyRazorpaySignature(orderId, paymentId, signature) {
    const generatedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
        .update(`${orderId}|${paymentId}`)
        .digest("hex");

    return generatedSignature === signature;
}

function getBaseUrl(req) {
    const configuredBaseUrl = (process.env.BASE_URL || "").trim();
    const isLocalConfiguredUrl = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(configuredBaseUrl);

    if (configuredBaseUrl && !isLocalConfiguredUrl) {
        return configuredBaseUrl;
    }

    const forwardedProto = req.headers["x-forwarded-proto"];
    const protocol = (Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto || req.protocol || "http")
        .toString()
        .split(",")[0]
        .trim();
    const host = req.get("host");

    if (host) {
        return `${protocol}://${host}`;
    }

    return configuredBaseUrl || `http://localhost:${PORT}`;
}

function getDashboardUrl(req) {
    const fromEnv = (process.env.DASHBOARD_URL || "").trim();
    if (fromEnv) return fromEnv;
    return `${getBaseUrl(req)}/dashboard.html`;
}

function stripHtml(html) {
    return String(html || "")
        .replace(/<[^>]*>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function parsePhone(raw) {
    const value = String(raw || "").trim();
    if (!value) return { countryCode: "+91", number: "" };
    const compact = value.replace(/\s+/g, "");
    const match = compact.match(/^(\+\d{1,4})(\d+)$/);
    if (match) {
        return { countryCode: match[1], number: match[2] };
    }
    return { countryCode: "+91", number: compact.replace(/\D/g, "") };
}

function buildProfileFromCard(card, req) {
    const services = [];
    for (let i = 1; i <= 10; i++) {
        const title = card[`service${i}Title`];
        const description = card[`service${i}Description`];
        const fileUrl = card[`service${i}Image`];
        const link = card[`service${i}Link`];
        if ((title || description || fileUrl || link)) {
            services.push({ title: title || "", description: description || "", fileUrl: fileUrl || "", link: link || "" });
        }
    }

    const custom_links = [
        { label: card.customSocial1Title || "", url: card.customSocial1Url || "" },
        { label: card.customSocial2Title || "", url: card.customSocial2Url || "" },
        { label: card.customSocial3Title || "", url: card.customSocial3Url || "" }
    ].filter((item) => item.url);

    const phoneParts = parsePhone(card.phone);
    return {
        theme_color: "#1e90ff",
        companyname: card.companyName || "",
        firstname: card.name || "",
        designation: card.occupation || "",
        tagline: card.heroTagline || "",
        email: card.businessEmail || "",
        phonenumber: phoneParts.number,
        countrycode: phoneParts.countryCode,
        whatsupno: phoneParts.number,
        address: "",
        logo: card.companyLogo || card.profileImage || "",
        establishedyear: "",
        otherbusiness: "",
        about: card.description || card.companyDescription || "",
        services,
        googlepay: "",
        paytm: "",
        paytm_QRcode: "",
        gallery_images: [],
        videos: [],
        googlemap: "",
        website_url: card.companyWebsite || "",
        facebook: card.facebook || "",
        twitter: card.x || "",
        linkedin: card.linkedin || "",
        youtube: card.youtube || "",
        instagram: card.instagram || "",
        custom_links,
        profile_link: `${getBaseUrl(req)}/${card.slug}`,
        view_count: 0
    };
}

function buildSuggestions(slug) {
    const base = createSlug(slug || "card") || "card";
    return [base + "-1", base + "-2026", base + "-xevonet"];
}

// 🔥 MongoDB
async function connectDB() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("MongoDB connected successfully!");
    } catch (error) {
        console.error("MongoDB connection error:", error.message);
        process.exit(1);
    }
}

app.get("/health", (req, res) => {
    res.json({ ok: true, env: NODE_ENV });
});

app.get("/form", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "form.html"));
});

app.get("/preview", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "preview.html"));
});

app.get("/config", (req, res) => {
    const baseUrl = getBaseUrl(req);
    const amountPaise = CARD_PRICE_INR * 100;
    res.json({
        configured: Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET),
        amountPaise,
        publicBaseUrl: baseUrl
    });
});

app.get("/slug-status", async (req, res) => {
    const slug = createSlug(String(req.query.slug || ""));
    const valid = /^[a-z0-9]([a-z0-9-]{0,30}[a-z0-9])?$/.test(slug);
    if (!slug || !valid) {
        return res.json({ valid: false, available: false, suggestions: buildSuggestions(slug) });
    }
    const taken = await Card.exists({ slug });
    res.json({
        valid: true,
        available: !taken,
        suggestions: taken ? buildSuggestions(slug) : []
    });
});

app.post("/create-order", async (req, res) => {
    try {
        const order = await razorpay.orders.create({
            amount: CARD_PRICE_INR * 100,
            currency: "INR",
            receipt: `vcard_${Date.now()}`
        });
        res.json({
            keyId: process.env.RAZORPAY_KEY_ID,
            orderId: order.id,
            amount: order.amount,
            currency: order.currency
        });
    } catch (error) {
        console.error("Error creating API order:", error.message);
        res.status(500).json({ error: "Failed to create payment order." });
    }
});

app.post("/save-profile", async (req, res) => {
    try {
        const {
            slug,
            profile,
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature
        } = req.body || {};

        if (!slug || !profile || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({ error: "Missing publish details." });
        }

        const normalizedSlug = createSlug(slug);
        if (!/^[a-z0-9]([a-z0-9-]{0,30}[a-z0-9])?$/.test(normalizedSlug)) {
            return res.status(400).json({ error: "Invalid slug.", suggestions: buildSuggestions(normalizedSlug) });
        }

        const slugTaken = await Card.exists({ slug: normalizedSlug });
        if (slugTaken) {
            return res.status(409).json({ error: "Slug already taken.", suggestions: buildSuggestions(normalizedSlug) });
        }

        const isValidSignature = verifyRazorpaySignature(
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature
        );
        if (!isValidSignature) {
            return res.status(400).json({ error: "Invalid payment signature." });
        }

        const services = Array.isArray(profile.services) ? profile.services : [];
        const userData = {
            name: (profile.firstname || "").trim(),
            slug: normalizedSlug,
            occupation: (profile.designation || "").trim(),
            description: stripHtml(profile.about || ""),
            brandName: "",
            heroTagline: (profile.tagline || "").trim(),
            heroDescription: stripHtml(profile.about || ""),
            companySectionTitle: "Company",
            companyName: (profile.companyname || "").trim(),
            companyDescription: stripHtml(profile.about || ""),
            companyWebsite: normalizeUrl(profile.website_url || ""),
            companyLogo: normalizeUrl(profile.logo || ""),
            achievementsSectionTitle: "Achievements",
            achievementsList: "",
            businessEmail: (profile.email || "").trim(),
            personalEmail: (profile.email || "").trim(),
            phone: `${profile.countrycode || "+91"}${profile.phonenumber || ""}`,
            youtube: normalizeUrl(profile.youtube || ""),
            instagram: normalizeUrl(profile.instagram || ""),
            x: normalizeUrl(profile.twitter || ""),
            linkedin: normalizeUrl(profile.linkedin || ""),
            facebook: normalizeUrl(profile.facebook || ""),
            pinterest: "",
            customSocial1Title: profile.custom_links?.[0]?.label || "",
            customSocial1Url: normalizeUrl(profile.custom_links?.[0]?.url || ""),
            customSocial2Title: profile.custom_links?.[1]?.label || "",
            customSocial2Url: normalizeUrl(profile.custom_links?.[1]?.url || ""),
            customSocial3Title: profile.custom_links?.[2]?.label || "",
            customSocial3Url: normalizeUrl(profile.custom_links?.[2]?.url || "")
        };

        for (let i = 1; i <= 10; i++) {
            const service = services[i - 1] || {};
            userData[`service${i}Title`] = service.title || "";
            userData[`service${i}Description`] = service.description || "";
            userData[`service${i}Link`] = normalizeUrl(service.link || "");
            userData[`service${i}Image`] = normalizeUrl(service.fileUrl || "");
        }

        await Card.create(userData);

        const baseUrl = getBaseUrl(req);
        const cardLink = `${baseUrl}/${normalizedSlug}`;
        const dashboardLink = getDashboardUrl(req);

        if (userData.personalEmail) {
            await transporter.sendMail({
                from: `"Xevonet ECard" <${process.env.EMAIL_USER}>`,
                to: userData.personalEmail,
                subject: "Your Digital Card is Ready 🚀",
                html: `
                    <h2>Your E-Card is Ready!</h2>
                    <p>Hello ${userData.name || "there"},</p>
                    <p>Your payment was successful.</p>
                    <p>View your digital card:</p>
                    <p><a href="${cardLink}" target="_blank" rel="noopener noreferrer">${cardLink}</a></p>
                    <p>Open your dashboard to review analytics and update your card:</p>
                    <p><a href="${dashboardLink}" target="_blank" rel="noopener noreferrer">${dashboardLink}</a></p>
                    <br>
                    <p>Thanks for using Xevonet.</p>
                `
            });
        }

        res.json({ ok: true, path: `/${normalizedSlug}` });
    } catch (error) {
        console.error("Error saving profile:", error.message);
        res.status(500).json({ error: "Failed to publish profile." });
    }
});

app.get("/profile/:slug", async (req, res) => {
    try {
        const user = await Card.findOne({ slug: req.params.slug });
        if (!user) {
            return res.status(404).json({ error: "Card not found." });
        }
        res.json(buildProfileFromCard(user, req));
    } catch (error) {
        console.error("Error loading profile:", error.message);
        res.status(500).json({ error: "Server error." });
    }
});

app.post("/upload-logo", function (req, res) {
    imageUpload.single("logo")(req, res, function (error) {
        if (error) {
            const status = error instanceof multer.MulterError ? 400 : 415;
            return res.status(status).json({ error: error.message || "Logo upload failed." });
        }
        if (!req.file) {
            return res.status(400).json({ error: "No file received." });
        }
        res.json({ ok: true, url: `/uploads/${req.file.filename}` });
    });
});

app.post("/upload-image", function (req, res) {
    imageUpload.single("image")(req, res, function (error) {
        if (error) {
            const status = error instanceof multer.MulterError ? 400 : 415;
            return res.status(status).json({ error: error.message || "Image upload failed." });
        }
        if (!req.file) {
            return res.status(400).json({ error: "No file received." });
        }
        res.json({ ok: true, url: `/uploads/${req.file.filename}` });
    });
});

app.post("/upload-video", function (req, res) {
    videoUpload.single("video")(req, res, function (error) {
        if (error) {
            const status = error instanceof multer.MulterError ? 400 : 415;
            return res.status(status).json({ error: error.message || "Video upload failed." });
        }
        if (!req.file) {
            return res.status(400).json({ error: "No file received." });
        }
        res.json({ ok: true, url: `/uploads/${req.file.filename}` });
    });
});

// ✅ Verify Payment + Create Card + Send Email
app.post("/verify-payment", async (req, res) => {
    try {
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            userData
        } = req.body;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !userData) {
            return res.status(400).json({
                message: "Missing payment verification details."
            });
        }

        const isValidSignature = verifyRazorpaySignature(
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature
        );

        if (!isValidSignature) {
            return res.status(400).json({
                message: "Invalid payment signature."
            });
        }

        console.log("Payment verified:", razorpay_payment_id);

        // 🔧 Normalize links
        userData.youtube = normalizeUrl(userData.youtube);
        userData.instagram = normalizeUrl(userData.instagram);
        userData.x = normalizeUrl(userData.x);
        userData.linkedin = normalizeUrl(userData.linkedin);
        userData.facebook = normalizeUrl(userData.facebook);
        userData.pinterest = normalizeUrl(userData.pinterest);
        userData.customSocial1Url = normalizeUrl(userData.customSocial1Url);
        userData.customSocial2Url = normalizeUrl(userData.customSocial2Url);
        userData.customSocial3Url = normalizeUrl(userData.customSocial3Url);
        userData.profileImage = normalizeUrl(userData.profileImage);
        userData.companyWebsite = normalizeUrl(userData.companyWebsite);
        userData.companyLogo = normalizeUrl(userData.companyLogo);
        userData.service1Link = normalizeUrl(userData.service1Link);
        userData.service1Image = normalizeUrl(userData.service1Image);
        userData.service2Link = normalizeUrl(userData.service2Link);
        userData.service2Image = normalizeUrl(userData.service2Image);
        userData.service3Link = normalizeUrl(userData.service3Link);
        userData.service3Image = normalizeUrl(userData.service3Image);
        userData.service4Link = normalizeUrl(userData.service4Link);
        userData.service4Image = normalizeUrl(userData.service4Image);
        userData.service5Link = normalizeUrl(userData.service5Link);
        userData.service5Image = normalizeUrl(userData.service5Image);
        userData.service6Link = normalizeUrl(userData.service6Link);
        userData.service6Image = normalizeUrl(userData.service6Image);
        userData.service7Link = normalizeUrl(userData.service7Link);
        userData.service7Image = normalizeUrl(userData.service7Image);
        userData.service8Link = normalizeUrl(userData.service8Link);
        userData.service8Image = normalizeUrl(userData.service8Image);
        userData.service9Link = normalizeUrl(userData.service9Link);
        userData.service9Image = normalizeUrl(userData.service9Image);
        userData.service10Link = normalizeUrl(userData.service10Link);
        userData.service10Image = normalizeUrl(userData.service10Image);

        // 🔥 Unique slug
        let slug = createSlug(userData.name);
        const baseSlug = slug;
        let counter = 1;

        while (await Card.findOne({ slug })) {
            slug = `${baseSlug}-${counter}`;
            counter++;
        }

        // 💾 Save to DB
        const newCard = await Card.create({
            name: userData.name,
            slug,
            occupation: userData.occupation,
            description: (userData.description || "").trim(),
            brandName: (userData.brandName || "").trim(),
            nowShippingKicker: userData.nowShippingKicker,
            nowShippingTitle: userData.nowShippingTitle,
            nowShippingDescription: userData.nowShippingDescription,
            heroRoleLabel: userData.heroRoleLabel,
            heroTagline: userData.heroTagline,
            heroDescription: (userData.heroDescription || "").trim(),
            companySectionTitle: userData.companySectionTitle,
            servicesSectionTitle: userData.servicesSectionTitle,
            servicesSectionSubtitle: userData.servicesSectionSubtitle,
            achievementsSectionTitle: userData.achievementsSectionTitle,
            achievementsList: userData.achievementsList,
            contactSectionTitle: userData.contactSectionTitle,
            contactSectionSubtitle: userData.contactSectionSubtitle,
            contactEmailLabel: userData.contactEmailLabel,
            contactPhoneLabel: userData.contactPhoneLabel,
            socialSectionTitle: userData.socialSectionTitle,
            socialSectionSubtitle: userData.socialSectionSubtitle,
            achievement1: userData.achievement1,
            achievement2: userData.achievement2,
            achievement3: userData.achievement3,
            profileImage: userData.profileImage,
            companyName: userData.companyName,
            companyDescription: userData.companyDescription,
            companyWebsite: userData.companyWebsite,
            companyLogo: userData.companyLogo,
            service1Title: userData.service1Title,
            service1Description: userData.service1Description,
            service1Link: userData.service1Link,
            service1Image: userData.service1Image,
            service2Title: userData.service2Title,
            service2Description: userData.service2Description,
            service2Link: userData.service2Link,
            service2Image: userData.service2Image,
            service3Title: userData.service3Title,
            service3Description: userData.service3Description,
            service3Link: userData.service3Link,
            service3Image: userData.service3Image,
            service4Title: userData.service4Title,
            service4Description: userData.service4Description,
            service4Link: userData.service4Link,
            service4Image: userData.service4Image,
            service5Title: userData.service5Title,
            service5Description: userData.service5Description,
            service5Link: userData.service5Link,
            service5Image: userData.service5Image,
            service6Title: userData.service6Title,
            service6Description: userData.service6Description,
            service6Link: userData.service6Link,
            service6Image: userData.service6Image,
            service7Title: userData.service7Title,
            service7Description: userData.service7Description,
            service7Link: userData.service7Link,
            service7Image: userData.service7Image,
            service8Title: userData.service8Title,
            service8Description: userData.service8Description,
            service8Link: userData.service8Link,
            service8Image: userData.service8Image,
            service9Title: userData.service9Title,
            service9Description: userData.service9Description,
            service9Link: userData.service9Link,
            service9Image: userData.service9Image,
            service10Title: userData.service10Title,
            service10Description: userData.service10Description,
            service10Link: userData.service10Link,
            service10Image: userData.service10Image,
            businessEmail: userData.businessEmail,
            personalEmail: userData.personalEmail,
            phone: userData.phone,
            youtube: userData.youtube,
            instagram: userData.instagram,
            x: userData.x,
            linkedin: userData.linkedin,
            facebook: userData.facebook,
            pinterest: userData.pinterest,
            customSocial1Title: userData.customSocial1Title,
            customSocial1Url: userData.customSocial1Url,
            customSocial2Title: userData.customSocial2Title,
            customSocial2Url: userData.customSocial2Url,
            customSocial3Title: userData.customSocial3Title,
            customSocial3Url: userData.customSocial3Url
        });

        const baseUrl = getBaseUrl(req);
        const cardLink = `${baseUrl}/card/${slug}`;
        const dashboardLink = getDashboardUrl(req);

        // 📧 Send Email
        await transporter.sendMail({
            from: `"Xevonet ECard" <${process.env.EMAIL_USER}>`,
            to: userData.personalEmail,
            subject: "Your Digital Card is Ready 🚀",
            html: `
                <h2>Your E-Card is Ready!</h2>
                <p>Hello ${userData.name},</p>
                <p>Your payment was successful.</p>
                <p>View your digital card:</p>
                <p><a href="${cardLink}" target="_blank" rel="noopener noreferrer">${cardLink}</a></p>
                <p>Open your dashboard to review analytics and update your card:</p>
                <p><a href="${dashboardLink}" target="_blank" rel="noopener noreferrer">${dashboardLink}</a></p>
                <br>
                <p>Thanks for using Xevonet.</p>
            `
        });

        console.log("Card created + email sent");

        res.json({
            message: "Success",
            cardURL: cardLink
        });

    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({
            message: "Failed to complete process."
        });
    }
});

// 🎯 Demo card page (new vCard template)
app.get("/demo/card", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "preview.html"));
});

// Legacy URL support
app.get("/card/:username", async (req, res) => {
    try {
        const user = await Card.findOne({ slug: req.params.username });

        if (!user) {
            return res.status(404).send("Card not found");
        }

        return res.redirect(`/${user.slug}`);

    } catch (error) {
        console.error("Error fetching card:", error.message);
        res.status(500).send("Server error");
    }
});

// Published vCard URL
app.get("/:slug", async (req, res, next) => {
    const slug = String(req.params.slug || "").toLowerCase();
    if (!/^[a-z0-9]([a-z0-9-]{0,30}[a-z0-9])?$/.test(slug)) return next();
    const reserved = new Set(["form", "preview", "api", "card", "demo", "dashboard", "dashboard.html"]);
    if (reserved.has(slug)) return next();

    try {
        const exists = await Card.exists({ slug });
        if (!exists) return next();
        return res.sendFile(path.join(__dirname, "public", "preview.html"));
    } catch (error) {
        return next();
    }
});

// 🚀 Start server
connectDB().then(() => {
    app.listen(PORT, () => {
        console.log(`Server running on ${BASE_URL}`);
    });
});