class BuyerDTO {
  constructor(buyer) {
    this.id = buyer._id;
    this.role = "buyer";

    this.onboardingCompleted =
      buyer.onboardingCompleted || false;

    this.identity = {
      serialNumber: buyer.serialNumber || "",
      username: buyer.username || "",
      fullName: buyer.fullName || "",
      profilePhoto: buyer.profilePhoto || "",
    };

    this.contact = {
      email: buyer.email || "",
      phoneNo: buyer.phoneNo || "",
    };

    this.location = {
      country: buyer.country || "",
      address: buyer.address || "",

      school: buyer.school
        ? {
          id: buyer.school._id || buyer.school,
          name: buyer.school.name || null,
        }
        : null,

      state: buyer.state
        ? {
          id: buyer.state._id || buyer.state,
          name: buyer.state.name || null,
        }
        : null,
    };

    this.preferences = {
      preferredLanguage: buyer.preferredLanguage || "",
      notificationPreference:
        buyer.notificationPreference || "email",
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