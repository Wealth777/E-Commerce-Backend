const AuditLog = require('../models(Copy)/auditLog')

exports.getUsersActivities = async (req, res) => {
  try {
    const logs = await AuditLog.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(3);

    if (!logs || logs.length === 0) {
      return res.status(200).json({
        success: true,
        data: logs || []
      });
    }

    res.status(200).json({
      success: true,
      data: logs
    });

  } catch (error) {
    res.status(500).json({
      message: 'Failed to fetch activities'
    });
  }
};