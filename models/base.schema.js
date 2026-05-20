const mongoose = require('mongoose');

const softDeleteFields = {
  deleted: {
    type: Boolean,
    default: false,
    index: true,
  },
  deletedAt: {
    type: Date,
    default: null,
  },
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'deletedByModel',
    default: null,
  },
  deletedByModel: {
    type: String,
    enum: ['Buyer', 'Vendor', 'Founder'],
    default: null,
  },
};

function softDeletePlugin(schema) {
  schema.add(softDeleteFields);

  function excludeDeleted() {
    const options = this.getOptions ? this.getOptions() : {};
    const query = this.getQuery ? this.getQuery() : {};

    if (!options.withDeleted && query.deleted === undefined) {
      this.where({ deleted: { $ne: true } });
    }
  }

  function excludeDeletedFromAggregate() {
    const options = this.options || {};

    if (!options.withDeleted) {
      const pipeline = this.pipeline();

      const firstStage = pipeline[0];

      const hasGeoNearFirst =
        firstStage && Object.prototype.hasOwnProperty.call(firstStage, '$geoNear');

      if (!hasGeoNearFirst) {
        pipeline.unshift({ $match: { deleted: { $ne: true } } });
      }
    }
  }

  schema.pre('find', excludeDeleted);
  schema.pre('findOne', excludeDeleted);
  schema.pre('findOneAndUpdate', excludeDeleted);
  schema.pre('countDocuments', excludeDeleted);
  schema.pre('aggregate', excludeDeletedFromAggregate);

  schema.methods.softDelete = function softDelete(deletedBy, deletedByModel) {
    this.deleted = true;
    this.deletedAt = new Date();
    this.deletedBy = deletedBy || null;
    this.deletedByModel = deletedByModel || null;
    return this.save();
  };

  schema.methods.restore = function restore() {
    this.deleted = false;
    this.deletedAt = null;
    this.deletedBy = null;
    this.deletedByModel = null;
    return this.save();
  };

  schema.statics.findWithDeleted = function findWithDeleted(filter = {}) {
    return this.find(filter).setOptions({ withDeleted: true });
  };

  schema.statics.findDeleted = function findDeleted(filter = {}) {
    return this.find({ ...filter, deleted: true }).setOptions({ withDeleted: true });
  };
}

module.exports = {
  softDeleteFields,
  softDeletePlugin,
};