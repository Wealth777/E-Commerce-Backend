class BuyerDTO {
  constructor(buyer) {
    this.id = buyer._id;
    this.role = 'buyer';

    this.identity = {
      serialNumber: buyer.serialNumber || '',
      username: buyer.username || '',
      fullName: buyer.fullName || '',
      profilePhoto: buyer.profilePhoto || '',
    };

    this.contact = {
      email: buyer.email || '',
      phoneNo: buyer.phoneNo || '',
    };

    this.location = {
      country: buyer.country || '',
      state: buyer.state || '',
      address: buyer.address || '',
    };

    this.preferences = {
      preferredLanguage: buyer.preferredLanguage || '',
      notificationPreference: buyer.notificationPreference || 'email',
    };
  }

  static fromModel(buyer) {
    return new BuyerDTO(buyer);
  }

  static fromList(buyers) {
    return buyers.map((buyer) => BuyerDTO.fromModel(buyer));
  }
}

module.exports = BuyerDTO;