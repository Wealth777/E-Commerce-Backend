const crypto = require("crypto");
const VerificationToken = require("../models/VerificationToken.model");
const generateVerificationToken = require("../utils/generateVerificationToken");
const logger = require("../logger");

const VERIFICATION_TOKEN_EXPIRY = 60 * 60 * 1000;

class VerificationTokenService {
    async create(userId, userModel) {
        await VerificationToken.deleteMany({    
            user: userId,
            userModel,
        });

        const token = generateVerificationToken();

        const expiresAt = new Date(Date.now() + VERIFICATION_TOKEN_EXPIRY);

        await VerificationToken.create(
            {
                user: userId,
                userModel,
                token,
                expiresAt,
            }
        );

        return {
            token,
            expiresAt,
        };
    }

    async findValidToken(token, session) {
        const verificationToken = await VerificationToken.findOne({
            token,
            expiresAt: { $gt: new Date() },
        }).session(session);

        return verificationToken;
    }

    async deleteToken(id, session) {
        return VerificationToken.findByIdAndDelete(id).session(session);
    }

    async deleteUserTokens(userId, session) {
        return VerificationToken.deleteMany(
            { user: userId },
            { session }
        );
    };
}

module.exports = new VerificationTokenService();