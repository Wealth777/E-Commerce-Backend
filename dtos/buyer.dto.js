class BuyerDTO {
  constructor(buyer) {
    this.id = buyer._id;
    this.serialNumber = buyer.serialNumber;
    this.fullName = buyer.fullName;
    this.email = buyer.email;
    this.profilePhoto = buyer.profilePhoto;
    // Never include password!
  }

  static fromModel(buyer) {
    return new BuyerDTO(buyer);
  }

  static fromList(buyers) {
    return buyers.map(b => this.fromModel(b));
  }
}

module.exports = BuyerDTO;