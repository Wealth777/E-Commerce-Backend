class VendorDTO {
  constructor(vendor) {
    this.identity = {
      id: vendor._id,
      serialNumber: vendor.serialNumber,
      username: vendor.username,
      fullName: vendor.fullName,
      profilePhoto: vendor.profilePhoto,
      role: vendor.role,
    };

    this.contact = {
      email: vendor.email,
      phoneNo: vendor.phoneNo,
      address: vendor.address,
      supportContact: vendor.supportContact,
    };

    this.location = {
      country: vendor.country,
      state: vendor.state,
    };

    this.store = {
      storeName: vendor.storeName,
      storeDescription: vendor.storeDescription,
      bannerImage: vendor.bannerImage,
      socialLinks: vendor.socialLinks,
    };

    this.preferences = {
      preferredLanguage: vendor.preferredLanguage,
      notificationPreference: vendor.notificationPreference,
    };

    this.payout = {
      bankName: vendor.bankName,
      accountName: vendor.accountName,
      accountNumber: vendor.accountNumber,
    };
  }

  static fromModel(vendor) {
    if (!vendor) return null;
    return new VendorDTO(vendor);
  }

  static fromList(vendors = []) {
    return vendors.map((vendor) => VendorDTO.fromModel(vendor));
  }

  static publicProfile(vendor) {
    if (!vendor) return null;
    return {
      id: vendor._id,
      serialNumber: vendor.serialNumber,
      fullName: vendor.fullName,
      username: vendor.username,
      profilePhoto: vendor.profilePhoto,
      storeName: vendor.storeName,
      storeDescription: vendor.storeDescription,
      bannerImage: vendor.bannerImage,
      supportContact: vendor.supportContact,
      socialLinks: vendor.socialLinks,
    };
  }

  static authUser(vendor) {
    return {
      id: vendor._id,
      email: vendor.email,
      role: vendor.role || 'vendor',
    };
  }
}

module.exports = VendorDTO;
