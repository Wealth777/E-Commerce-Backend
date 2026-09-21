const geoip = require("geoip-lite");
const UAParser = require("ua-parser-js");

function getClientIp(req) {
    return (
        req.headers["cf-connecting-ip"] ||
        req.headers["x-real-ip"] ||
        req.headers["x-forwarded-for"]?.split(",")[0].trim() ||
        req.ip ||
        req.socket?.remoteAddress ||
        req.connection?.remoteAddress ||
        null
    );
}

function normalizeIp(ip) {
    if (!ip) return null;

    if (ip === "::1") {
        return "127.0.0.1";
    }

    if (ip.startsWith("::ffff:")) {
        return ip.replace("::ffff:", "");
    }

    return ip;
}

function getDeviceInfo(userAgent) {
    const parser = new UAParser(userAgent);
    const result = parser.getResult();

    return {
        browser: result.browser.name || "Unknown",
        browserVersion: result.browser.version || "",
        os: result.os.name || "Unknown",
        osVersion: result.os.version || "",
        deviceType: result.device.type || "Desktop",
        deviceModel: result.device.model || "Desktop",
        vendor: result.device.vendor || "",
        cpu: result.cpu.architecture || "",
        userAgent,
    };
}

function getLocation(ip) {
    if (!ip) {
        return {
            city: null,
            region: null,
            country: null,
            timezone: null,
        };
    }

    const geo = geoip.lookup(ip);

    if (!geo) {
        return {
            city: null,
            region: null,
            country: null,
            timezone: null,
        };
    }

    return {
        city: geo.city || null,
        region: geo.region || null,
        country: geo.country || null,
        timezone: geo.timezone || null,
    };
}

function getDeviceName(device) {
    return [
        device.browser,
        device.os
    ]
        .filter(Boolean)
        .join(" on ");
}

function getRequestInfo(req) {
    const rawIp = getClientIp(req);
    const ip = normalizeIp(rawIp);

    const userAgent = req.headers["user-agent"] || "";

    const device = getDeviceInfo(userAgent);

    const location = getLocation(ip);

    return {
        ip,
        device,
        location,
        deviceName: getDeviceName(device),
        requestedAt: new Date(),
    };
}

module.exports = getRequestInfo;