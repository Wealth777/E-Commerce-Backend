const mongoose = require("mongoose");
require("dotenv").config();

const School = require("../models/school.model");

const schools = [
  {
    name: "University of Ilesa",
    state: "Osun",
    location: "Ilesa",
  },

  {
    name: "Obafemi Awolowo University",
    state: "Osun",
    location: "Ile-Ife",
  },

  {
    name: "Osun State University",
    state: "Osun",
    location: "Osogbo",
  },
];

const slugify = (value) => {
  return value
    .toString()
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

const seedSchools = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL);

    console.log("MongoDB connected");

    for (const schoolData of schools) {
      const schoolSlug = slugify(schoolData.name);

      let school = await School.findOne({
        slug: schoolSlug,
      });

      if (!school) {
        school = await School.create({
          name: schoolData.name,
          slug: schoolSlug,
          parent: null,
          level: 1,
          type: "school",
          status: "approved",
          isDefault: true,
          isActive: true,
          createdBy: null,
          createdByModel: "Admin",
        });

        console.log(`School created: ${schoolData.name}`);
      }

      const stateSlug = `${schoolSlug}-${slugify(
        schoolData.state
      )}`;

      let state = await School.findOne({
        slug: stateSlug,
      });

      if (!state) {
        state = await School.create({
          name: schoolData.state,
          slug: stateSlug,
          parent: school._id,
          level: 2,
          type: "state",
          status: "approved",
          isDefault: true,
          isActive: true,
          createdBy: null,
          createdByModel: "Admin",
        });

        console.log(`State created: ${schoolData.state}`);
      }

      const locationSlug = `${stateSlug}-${slugify(
        schoolData.location
      )}`;

      const existingLocation = await School.findOne({
        slug: locationSlug,
      });

      if (!existingLocation) {
        await School.create({
          name: schoolData.location,
          slug: locationSlug,
          parent: state._id,
          level: 3,
          type: "location",
          status: "approved",
          isDefault: true,
          isActive: true,
          createdBy: null,
          createdByModel: "Admin",
        });

        console.log(
          `Location created: ${schoolData.location}`
        );
      }
    }

    console.log("Schools seeded successfully");

    await mongoose.connection.close();

    process.exit(0);
  } catch (error) {
    console.error("School seeding failed:", error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

seedSchools();