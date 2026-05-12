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

  function excludeDeleted(next) {
    const options = this.getOptions ? this.getOptions() : {};
    if (!options.withDeleted && !this.getQuery().deleted) {
      this.where({ deleted: { $ne: true } });
    }
    next();
  }

  schema.pre('find', excludeDeleted);
  schema.pre('findOne', excludeDeleted);
  schema.pre('findOneAndUpdate', excludeDeleted);
  schema.pre('countDocuments', excludeDeleted);
  schema.pre('aggregate', function excludeDeletedFromAggregate(next) {
    const options = this.options || {};
    if (!options.withDeleted) {
      this.pipeline().unshift({ $match: { deleted: { $ne: true } } });
    }
    next();
  });

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
