const logger = require('../../logger');
const AddProduct = require('../../models/addproduct.model');
const BuyerOrder = require("../../models/buyerOrder.model");
const AuditLog = require('../../models/auditLog');
const PDFDocument = require("pdfkit");
const { getDateRange } = require("../../utils(copy)/feedAlgorithm");

exports.getVendorAnalytics = async (req, res) => {
  try {
    const vendorId = req.user._id;
    const range = req.query.range || "7days";

    const startDate = getDateRange(range);

    const orders = await BuyerOrder.find({
      vendor: vendorId,
      createdAt: { $gte: startDate },
      "payment.status": "paid"
    })
      .populate("buyer", "username email")
      .sort({ createdAt: -1 });

    const totalSales = orders.reduce(
      (sum, order) => sum + (order.pricing?.total || 0),
      0
    );
    const totalOrders = orders.length;

    const avgOrderValue =
      totalOrders > 0
        ? Math.round(totalSales / totalOrders)
        : 0;

    const recentOrders = orders.slice(0, 5);

    const topProducts = await AddProduct.find({
      vendor: vendorId
    })
      .sort({ sold: -1 })
      .limit(5)
      .select("name image price sold stock");

    const salesOverviewMap = {};

    orders.forEach((order) => {
      const date = order.createdAt.toISOString().split("T")[0];

      if (!salesOverviewMap[date]) {
        salesOverviewMap[date] = 0;
      }

      salesOverviewMap[date] += (order.pricing?.total || 0);
    });

    const salesOverview = Object.keys(salesOverviewMap).map((date) => ({
      date,
      sales: salesOverviewMap[date]
    }));

    res.status(200).json({
      success: true,
      summary: {
        totalSales,
        totalOrders,
        avgOrderValue
      },
      salesOverview,
      recentOrders,
      topProducts
    });
  } catch (error) {
    logger.error("Vendor Analytics Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch analytics"
    });
  }
};

exports.exportVendorAnalyticsPDF = async (req, res) => {
  try {
    const vendorId = req.user._id;
    const range = req.query.range || "7days";

    const startDate = getDateRange(range);

    const orders = await BuyerOrder.find({
      vendor: vendorId,
      createdAt: { $gte: startDate },
      "payment.status": "paid",
    })
      .populate("buyer", "username email")
      .sort({ createdAt: -1 });

    const totalSales = orders.reduce(
      (sum, order) => sum + (order.pricing?.total || 0),
      0
    );

    const totalOrders = orders.length;

    const avgOrderValue =
      totalOrders > 0
        ? Math.round(totalSales / totalOrders)
        : 0;

    const topProducts = await AddProduct.find({
      vendor: vendorId,
    })
      .sort({ sold: -1 })
      .limit(5)
      .select("name price sold stock");

    res.setHeader(
      "Content-Type",
      "application/pdf"
    );

    res.setHeader(
      "Content-Disposition",
      `attachment; filename=vendor-analytics-${range}.pdf`
    );

    const doc = new PDFDocument({
      margin: 50,
      size: "A4",
    });

    doc.pipe(res);

    // Title
    doc
      .fontSize(20)
      .text("Vendor Analytics Report", {
        align: "center",
      });

    doc.moveDown();

    doc
      .fontSize(12)
      .text(`Date Range: ${range}`);

    doc.text(
      `Generated On: ${new Date().toLocaleString()}`
    );

    doc.moveDown();

    // Summary Section
    doc
      .fontSize(16)
      .text("Analytics Summary");

    doc.moveDown(0.5);

    doc
      .fontSize(12)
      .text(`Total Sales: ₦${totalSales}`);

    doc.text(`Total Orders: ${totalOrders}`);

    doc.text(
      `Average Order Value: ₦${avgOrderValue}`
    );

    doc.moveDown();

    // Recent Orders Section
    doc
      .fontSize(16)
      .text("Recent Orders");

    doc.moveDown(0.5);

    if (orders.length === 0) {
      doc
        .fontSize(12)
        .text("No orders found.");
    } else {
      orders.slice(0, 5).forEach((order, index) => {
        doc
          .fontSize(12)
          .text(
            `${index + 1}. Order ID: ${order._id}`
          );

        doc.text(
          `Buyer: ${order.buyer?.username || "N/A"
          }`
        );

        doc.text(
          `Amount: ₦${order.pricing?.total || 0}`
        );

        doc.text(
          `Date: ${new Date(
            order.createdAt
          ).toLocaleDateString()}`
        );

        doc.moveDown();
      });
    }

    // Top Products Section
    doc
      .fontSize(16)
      .text("Top Products");

    doc.moveDown(0.5);

    if (topProducts.length === 0) {
      doc
        .fontSize(12)
        .text("No products found.");
    } else {
      topProducts.forEach((product, index) => {
        doc
          .fontSize(12)
          .text(
            `${index + 1}. ${product.name}`
          );

        doc.text(
          `Price: ₦${product.price || 0}`
        );

        doc.text(
          `Sold: ${product.sold || 0}`
        );

        doc.text(
          `Stock: ${product.stock || 0}`
        );

        doc.moveDown();
      });
    }

    doc.end();

    await AuditLog.create({
      user: req.user._id,
      role: 'vendor',
      action: 'DOWNLOAD_ANALTYIC_PDF',
      entity: 'Vendor'
    });

  } catch (error) {
    logger.info(
      "Export Vendor Analytics PDF Error:",
      error
    );

    res.status(500).json({
      success: false,
      message: "Failed to export analytics PDF",
    });
  }
};
