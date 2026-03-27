const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const Card = require("./cardModel");

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json({ limit: "25mb" }));
app.use(express.static("public"));

app.set("view engine", "ejs");
app.set("views", "./views");

const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;
const CARD_PRICE_INR = Number(process.env.CARD_PRICE_INR || 499);

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

// 🧪 Test route
app.get("/", (req, res) => {
    res.send("Server is running successfully!");
});

// 💳 Create Razorpay Order
app.post("/create-order", async (req, res) => {
    try {
        const userData = req.body;

        if (!userData.name || !userData.personalEmail || !userData.businessEmail) {
            return res.status(400).json({
                message: "Missing required user details."
            });
        }

        const order = await razorpay.orders.create({
            amount: CARD_PRICE_INR * 100,
            currency: "INR",
            receipt: `ecard_${Date.now()}`
        });

        res.json({
            keyId: process.env.RAZORPAY_KEY_ID,
            orderId: order.id,
            amount: order.amount,
            currency: order.currency
        });

    } catch (error) {
        console.error("Error creating Razorpay order:", error);
        res.status(500).json({
            message: "Failed to create payment order."
        });
    }
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
            description: userData.description,
            brandName: userData.brandName,
            nowShippingKicker: userData.nowShippingKicker,
            nowShippingTitle: userData.nowShippingTitle,
            nowShippingDescription: userData.nowShippingDescription,
            heroRoleLabel: userData.heroRoleLabel,
            heroTagline: userData.heroTagline,
            heroDescription: userData.heroDescription,
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

        // 📧 Send Email
        await transporter.sendMail({
            from: `"Xevonet ECard" <${process.env.EMAIL_USER}>`,
            to: userData.personalEmail,
            subject: "Your Digital Card is Ready 🚀",
            html: `
                <h2>Your E-Card is Ready!</h2>
                <p>Hello ${userData.name},</p>
                <p>Your payment was successful.</p>
                <p>Click below to view your card:</p>
                <p><a href="${cardLink}" target="_blank">${cardLink}</a></p>
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

// 🎯 Card page
app.get("/card/:username", async (req, res) => {
    try {
        const user = await Card.findOne({ slug: req.params.username });

        if (!user) {
            return res.status(404).send("Card not found");
        }

        const cardUrl = `${getBaseUrl(req)}/card/${user.slug}`;
        res.render("card", { user, cardUrl });

    } catch (error) {
        console.error("Error fetching card:", error.message);
        res.status(500).send("Server error");
    }
});

// 🚀 Start server
connectDB().then(() => {
    app.listen(PORT, () => {
        console.log(`Server running on ${BASE_URL}`);
    });
});