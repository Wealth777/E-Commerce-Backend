const { randomUUID } = require('node:crypto');

const PLACEMENTS = new Set([
    'homepage_hero', 'homepage_secondary', 'product_listing', 'store',
]);

let namespace = null;
const roomFor = (placement) => `placement:${placement}`;

const initializeAdvertisementSocket = (io) => {
    if (!io) throw new Error('Socket.IO server is required.');
    if (namespace) throw new Error('Advertisement socket already initialized.');

    namespace = io.of('/advertisements');
    namespace.on('connection', (socket) => {
        socket.emit('advertisements:ready', {
            message: 'Fetch the latest advertisements using the public API.',
            at: new Date().toISOString(),
        });

        socket.on('advertisements:subscribe', (placement, acknowledge) => {
            if (!PLACEMENTS.has(placement)) {
                if (typeof acknowledge === 'function') acknowledge({ success: false, message: 'Invalid placement.' });
                return;
            }
            socket.join(roomFor(placement));
            if (typeof acknowledge === 'function') acknowledge({ success: true, placement });
        });

        socket.on('advertisements:unsubscribe', (placement, acknowledge) => {
            if (!PLACEMENTS.has(placement)) {
                if (typeof acknowledge === 'function') acknowledge({ success: false, message: 'Invalid placement.' });
                return;
            }
            socket.leave(roomFor(placement));
            if (typeof acknowledge === 'function') acknowledge({ success: true, placement });
        });
    });
    return namespace;
};

const publishAdvertisementChange = ({ placement = 'homepage_hero', action = 'updated' } = {}) => {
    if (!PLACEMENTS.has(placement)) throw new Error('Invalid advertisement placement.');
    if (!namespace) throw new Error('Advertisement socket is not initialized.');
    const payload = { eventId: randomUUID(), placement, action, at: new Date().toISOString() };
    namespace.to(roomFor(placement)).emit('advertisements:changed', payload);
    return payload;
};

module.exports = { initializeAdvertisementSocket, publishAdvertisementChange };