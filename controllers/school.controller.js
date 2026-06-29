const School = require("../models/school.model");

const getSchools = async (req, res) => {
  try {
    const schools = await School.find({
      level: 1,
      type: "school",
      isActive: true,
      status: "approved",
    })
      .select("_id name slug")
      .sort({ name: 1 });

    return res.status(200).json({
      success: true,
      count: schools.length,
      data: schools,
    });
  } catch (error) {
    console.error("Get Schools Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch schools",
    });
  }
};

const getStatesBySchool = async (req, res) => {
  try {
    const { schoolId } = req.params;

    const school = await School.findOne({
      _id: schoolId,
      level: 1,
      type: "school",
      isActive: true,
    });

    if (!school) {
      return res.status(404).json({
        success: false,
        message: "School not found",
      });
    }

    const states = await School.find({
      parent: schoolId,
      level: 2,
      type: "state",
      isActive: true,
      status: "approved",
    })
      .select("_id name slug")
      .sort({ name: 1 });

    return res.status(200).json({
      success: true,
      count: states.length,
      data: states,
    });
  } catch (error) {
    console.error("Get States Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch states",
    });
  }
};

const getLocationsByState = async (req, res) => {
  try {
    const { stateId } = req.params;

    const state = await School.findOne({
      _id: stateId,
      level: 2,
      type: "state",
      isActive: true,
    });

    if (!state) {
      return res.status(404).json({
        success: false,
        message: "State not found",
      });
    }

    const locations = await School.find({
      parent: stateId,
      level: 3,
      type: "location",
      isActive: true,
      status: "approved",
    })
      .select("_id name slug")
      .sort({ name: 1 });

    return res.status(200).json({
      success: true,
      count: locations.length,
      data: locations,
    });
  } catch (error) {
    console.error("Get Locations Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch locations",
    });
  }
};

module.exports = {
  getSchools,
  getStatesBySchool,
  getLocationsByState,
};