const mongoose = require("mongoose");

const cardSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },
        slug: {
            type: String,
            required: true,
            unique: true,
            trim: true
        },
        occupation: {
            type: String,
            required: true,
            trim: true
        },
        description: {
            type: String,
            default: ""
        },
        brandName: {
            type: String,
            default: ""
        },
        nowShippingKicker: {
            type: String,
            default: ""
        },
        nowShippingTitle: {
            type: String,
            default: ""
        },
        nowShippingDescription: {
            type: String,
            default: ""
        },
        heroRoleLabel: {
            type: String,
            default: ""
        },
        heroTagline: {
            type: String,
            default: ""
        },
        heroDescription: {
            type: String,
            default: ""
        },
        companySectionTitle: {
            type: String,
            default: ""
        },
        servicesSectionTitle: {
            type: String,
            default: ""
        },
        servicesSectionSubtitle: {
            type: String,
            default: ""
        },
        achievementsSectionTitle: {
            type: String,
            default: ""
        },
        achievementsList: {
            type: String,
            default: ""
        },
        contactSectionTitle: {
            type: String,
            default: ""
        },
        contactSectionSubtitle: {
            type: String,
            default: ""
        },
        contactEmailLabel: {
            type: String,
            default: ""
        },
        contactPhoneLabel: {
            type: String,
            default: ""
        },
        socialSectionTitle: {
            type: String,
            default: ""
        },
        socialSectionSubtitle: {
            type: String,
            default: ""
        },
        achievement1: {
            type: String,
            default: ""
        },
        achievement2: {
            type: String,
            default: ""
        },
        achievement3: {
            type: String,
            default: ""
        },
        profileImage: {
            type: String,
            default: ""
        },
        companyName: {
            type: String,
            default: ""
        },
        companyDescription: {
            type: String,
            default: ""
        },
        companyWebsite: {
            type: String,
            default: ""
        },
        companyLogo: {
            type: String,
            default: ""
        },
        service1Title: {
            type: String,
            default: ""
        },
        service1Description: {
            type: String,
            default: ""
        },
        service1Link: {
            type: String,
            default: ""
        },
        service1Image: {
            type: String,
            default: ""
        },
        service2Title: {
            type: String,
            default: ""
        },
        service2Description: {
            type: String,
            default: ""
        },
        service2Link: {
            type: String,
            default: ""
        },
        service2Image: {
            type: String,
            default: ""
        },
        service3Title: {
            type: String,
            default: ""
        },
        service3Description: {
            type: String,
            default: ""
        },
        service3Link: {
            type: String,
            default: ""
        },
        service3Image: {
            type: String,
            default: ""
        },
        service4Title: {
            type: String,
            default: ""
        },
        service4Description: {
            type: String,
            default: ""
        },
        service4Link: {
            type: String,
            default: ""
        },
        service4Image: {
            type: String,
            default: ""
        },
        service5Title: {
            type: String,
            default: ""
        },
        service5Description: {
            type: String,
            default: ""
        },
        service5Link: {
            type: String,
            default: ""
        },
        service5Image: {
            type: String,
            default: ""
        },
        service6Title: {
            type: String,
            default: ""
        },
        service6Description: {
            type: String,
            default: ""
        },
        service6Link: {
            type: String,
            default: ""
        },
        service6Image: {
            type: String,
            default: ""
        },
        service7Title: {
            type: String,
            default: ""
        },
        service7Description: {
            type: String,
            default: ""
        },
        service7Link: {
            type: String,
            default: ""
        },
        service7Image: {
            type: String,
            default: ""
        },
        service8Title: {
            type: String,
            default: ""
        },
        service8Description: {
            type: String,
            default: ""
        },
        service8Link: {
            type: String,
            default: ""
        },
        service8Image: {
            type: String,
            default: ""
        },
        service9Title: {
            type: String,
            default: ""
        },
        service9Description: {
            type: String,
            default: ""
        },
        service9Link: {
            type: String,
            default: ""
        },
        service9Image: {
            type: String,
            default: ""
        },
        service10Title: {
            type: String,
            default: ""
        },
        service10Description: {
            type: String,
            default: ""
        },
        service10Link: {
            type: String,
            default: ""
        },
        service10Image: {
            type: String,
            default: ""
        },
        businessEmail: {
            type: String,
            required: true,
            trim: true
        },
        personalEmail: {
            type: String,
            required: true,
            trim: true
        },
        phone: {
            type: String,
            required: true,
            trim: true
        },
        youtube: {
            type: String,
            default: ""
        },
        instagram: {
            type: String,
            default: ""
        },
        x: {
            type: String,
            default: ""
        },
        linkedin: {
            type: String,
            default: ""
        },
        facebook: {
            type: String,
            default: ""
        },
        pinterest: {
            type: String,
            default: ""
        },
        customSocial1Title: {
            type: String,
            default: ""
        },
        customSocial1Url: {
            type: String,
            default: ""
        },
        customSocial2Title: {
            type: String,
            default: ""
        },
        customSocial2Url: {
            type: String,
            default: ""
        },
        customSocial3Title: {
            type: String,
            default: ""
        },
        customSocial3Url: {
            type: String,
            default: ""
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Card", cardSchema);
