const verifyResourceOwnership = async (Model, resourceId, userId, field = 'user') => {
  const resource = await Model.findById(resourceId);
  if (!resource) throw new Error('Resource not found');
  
  if (resource[field].toString() !== userId.toString()) {
    throw new Error('Unauthorized');
  }
  
  return resource;
};

module.exports = { verifyResourceOwnership };