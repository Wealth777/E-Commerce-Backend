const School = require("../models/school.model");
const logger = require('../logger')
const { sendSuccess, sendError } = require('../utils/responseStruture');

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

    return sendSuccess(res, 200, true, schools, schools.length)
  } catch (error) {
    logger.error("Get Schools Error:", error);

    return sendError(res, 500, false, "Failed to fetch schools")
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
      return sendError(res, 404, false, "School not found") 
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

    return sendSuccess(res, 200, true, states, states.length) 
  } catch (error) {
    logger.error("Get States Error:", error);

    return sendError(res, 500, false, "Failed to fetch states") 
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
      return sendError(res, 404, false, "State not found")
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

    return sendSuccess(res, 200, true, locations, locations.length)
  } catch (error) {
    logger.error("Get Locations Error:", error);

    return sendError(res, 500, false, "Failed to fetch locations")
  }
};

module.exports = {
  getSchools,
  getStatesBySchool,
  getLocationsByState,
};