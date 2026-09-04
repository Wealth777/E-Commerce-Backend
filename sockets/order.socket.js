  const logger = require("../logger");

  let ioInstance = null;

  const getRoomName = (role, userId) => {
    if (!role || !userId) return null;

    return `${role}:${userId.toString()}`;
  };

  const initializeOrderSocket = (io) => {
    ioInstance = io;

    logger.info("Order socket service initialized");
  };

  /**
   * Emit a newly created order to the vendor.
   */
  const emitNewOrderToVendor = ({ order, vendorId }) => {
    if (!ioInstance || !order || !vendorId) return;

    const room = getRoomName("vendor", vendorId);

    ioInstance.to(room).emit("order:new", {
      order,
      timestamp: new Date(),
    });

    logger.info("New order emitted to vendor", {
      orderId: order._id,
      vendorId,
    });
  };

  /**
   * Generic order update emitter.
   */
  const emitOrderUpdate = ({
    order,
    buyerId,
    vendorId,
    action,
  }) => {
    if (!ioInstance || !order || !action) return;

    const payload = {
      order,
      action,
      timestamp: new Date(),
    };

    if (buyerId) {
      const buyerRoom = getRoomName("buyer", buyerId);

      ioInstance.to(buyerRoom).emit("order:updated", payload);
    }

    if (vendorId) {
      const vendorRoom = getRoomName("vendor", vendorId);

      ioInstance.to(vendorRoom).emit("order:updated", payload);
    }

    logger.info("Order update emitted", {
      orderId: order._id,
      buyerId,
      vendorId,
      action,
    });
  };

  /**
   * ORDER_PAYMENT_UPDATED
   */
  const emitPaymentUpdated = ({ order, buyerId, vendorId }) => {
    emitOrderUpdate({
      order,
      buyerId,
      vendorId,
      action: "ORDER_PAYMENT_UPDATED",
    });
  };

  /**
   * ORDER_CONFIRMED
   */
  const emitOrderConfirmed = ({ order, buyerId, vendorId }) => {
    emitOrderUpdate({
      order,
      buyerId,
      vendorId,
      action: "ORDER_CONFIRMED",
    });
  };

  /**
   * ORDER_SHIPPED
   */
  const emitOrderShipped = ({ order, buyerId, vendorId }) => {
    emitOrderUpdate({
      order,
      buyerId,
      vendorId,
      action: "ORDER_SHIPPED",
    });
  };

  /**
   * ORDER_DELIVERED
   */
  const emitOrderDelivered = ({ order, buyerId, vendorId }) => {
    emitOrderUpdate({
      order,
      buyerId,
      vendorId,
      action: "ORDER_DELIVERED",
    });
  };

  /**
   * ORDER_CANCELLED
   */
  const emitOrderCancelled = ({ order, buyerId, vendorId }) => {
    emitOrderUpdate({
      order,
      buyerId,
      vendorId,
      action: "ORDER_CANCELLED",
    });
  };

  /**
   * REFUND_REQUESTED
   */
  const emitRefundRequested = ({ order, buyerId, vendorId }) => {
    emitOrderUpdate({
      order,
      buyerId,
      vendorId,
      action: "REFUND_REQUESTED",
    });
  };

  /**
   * REFUND_UPDATED
   */
  const emitRefundUpdated = ({ order, buyerId, vendorId }) => {
    emitOrderUpdate({
      order,
      buyerId,
      vendorId,
      action: "REFUND_UPDATED",
    });
  };

  /**
   * RETURN_REQUESTED
   */
  const emitReturnRequested = ({ order, buyerId, vendorId }) => {
    emitOrderUpdate({
      order,
      buyerId,
      vendorId,
      action: "RETURN_REQUESTED",
    });
  };

  /**
   * RETURN_UPDATED
   */
  const emitReturnUpdated = ({ order, buyerId, vendorId }) => {
    emitOrderUpdate({
      order,
      buyerId,
      vendorId,
      action: "RETURN_UPDATED",
    });
  };

  module.exports = {
    initializeOrderSocket,

    emitNewOrderToVendor,

    emitOrderUpdate,

    emitPaymentUpdated,
    emitOrderConfirmed,
    emitOrderShipped,
    emitOrderDelivered,
    emitOrderCancelled,

    emitRefundRequested,
    emitRefundUpdated,

    emitReturnRequested,
    emitReturnUpdated,
  };