const crypto = require("crypto");
const SecurityRecoveryToken = require("../models/securityRecoveryToken.model");
const logger = require("../logger");

const SECURITY_TOKEN_EXPIRY = 30 * 60 * 1000;

const generateSecurityToken = () => {
    return crypto.randomBytes(32).toString("hex");
};

class SecurityRecoveryTokenService {
    async create({userId, userModel, metadata = {}}) {
        try {
            await SecurityRecoveryToken.deleteMany({
                user: userId,
                used: false,
            });

            const token = generateSecurityToken();

            const expiresAt = new Date(
                Date.now() + SECURITY_TOKEN_EXPIRY
            );

            const recoveryToken = await SecurityRecoveryToken.create({
                user: userId,
                userModel,
                token,
                metadata,
                expiresAt,
            });

            return {
                token: recoveryToken.token,
                expiresAt: recoveryToken.expiresAt,
                _id: recoveryToken._id,
            };
        } catch (error) {
            logger.error("Failed to create security recovery token.", {
                userId,
                error: error.message,
            });

            throw error;
        }
    }

    async findValidToken(token, session = null) {
        try {
            const query = SecurityRecoveryToken.findOne({
                token,
                used: false,
                expiresAt: { $gt: new Date() },
            });

            if (session) {
                query.session(session);
            }

            return await query;
        } catch (error) {
            logger.error("Failed to find security recovery token.", {
                error: error.message,
            });

            throw error;
        }
    }

    async consumeToken(token, session = null) {
        try {
            const query = SecurityRecoveryToken.findOneAndUpdate(
                {
                    token,
                    used: false,
                    expiresAt: { $gt: new Date() },
                },
                {
                    used: true,
                    usedAt: new Date(),
                },
                {
                    returnDocument: "after",
                }
            );

            if (session) {
                query.session(session);
            }

            return await query;
        } catch (error) {
            logger.error("Failed to consume security recovery token.", {
                error: error.message,
            });

            throw error;
        }
    }

    async deleteToken(tokenId, session = null) {
        try {
            const query = SecurityRecoveryToken.findByIdAndDelete(tokenId);

            if (session) {
                query.session(session);
            }

            return await query;
        } catch (error) {
            logger.error("Failed to delete security recovery token.", {
                tokenId,
                error: error.message,
            });

            throw error;
        }
    }

    async deleteUserTokens(userId, session = null) {
        try {
            const query = SecurityRecoveryToken.deleteMany({
                user: userId,
            });

            if (session) {
                query.session(session);
            }

            return await query;
        } catch (error) {
            logger.error("Failed to delete user's recovery tokens.", {
                userId,
                error: error.message,
            });

            throw error;
        }
    }

    async revokeExpiredTokens() {
        try {
            const result = await SecurityRecoveryToken.deleteMany({
                expiresAt: {
                    $lte: new Date(),
                },
            });

            logger.info("Expired security recovery tokens removed.", {
                deletedCount: result.deletedCount,
            });

            return result;
        } catch (error) {
            logger.error("Failed to remove expired security recovery tokens.", {
                error: error.message,
            });

            throw error;
        }
    }

}

module.exports = new SecurityRecoveryTokenService();