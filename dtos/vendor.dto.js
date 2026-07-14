class VendorDTO {
  constructor(vendor) {
    // ======================================================
    // IDENTITY
    // ======================================================

    this.identity = {
      id: vendor._id,
      serialNumber: vendor.serialNumber,
      fullName: vendor.fullName,
      role: vendor.role,
    };

    // ======================================================
    // ACCOUNT
    // ======================================================

    this.account = {
      email: vendor.email,
      phoneNo: vendor.phoneNo,
    };

    // ======================================================
    // STUDENT
    // ======================================================

    this.student = {
      profilePhoto: vendor.student?.profilePhoto,
      gender: vendor.student?.gender,
      institution: vendor.student?.institution,
      state: vendor.student?.state,
      matricNumber: vendor.student?.matricNumber,
      faculty: vendor.student?.faculty,
      department: vendor.student?.department,
      level: vendor.student?.level,
      residence: vendor.student?.residence,
      address: vendor.student?.address,
    };

    // ======================================================
    // BUSINESS
    // ======================================================

    this.business = {
      storeName: vendor.business?.storeName,
      type: vendor.business?.type,
      description: vendor.business?.description,
      logo: vendor.business?.logo,
      banner: vendor.business?.banner,

      socials: {
        facebook: vendor.business?.socials?.facebook,
        instagram: vendor.business?.socials?.instagram,
        whatsapp: vendor.business?.socials?.whatsapp,
        tiktok: vendor.business?.socials?.tiktok,
      },
    };

    // ======================================================
    // BANK DETAILS
    // ======================================================

    this.bankDetails = {
      bankName: vendor.bankDetails?.bankName,
      accountName: vendor.bankDetails?.accountName,
      accountNumber: vendor.bankDetails?.accountNumber,
    };

    // ======================================================
    // SETTINGS
    // ======================================================

    this.preferences = {
      notificationPreference: vendor.notificationPreference,
    };

    // ======================================================
    // VERIFICATION
    // ======================================================

    this.verification = {
      onboardingCompleted: vendor.onboardingCompleted,
      verificationStatus: vendor.verificationStatus,
      isVerified: vendor.isVerified,
      profileUpdateNotificationSent:
        vendor.profileUpdateNotificationSent,
      accountStatus: vendor.accountStatus
    };

    this.createdAt = vendor.createdAt;
    this.updatedAt = vendor.updatedAt;
  }

  static fromModel(vendor) {
    if (!vendor) return null;
    return new VendorDTO(vendor);
  }

  static fromList(vendors = []) {
    return vendors.map((vendor) => new VendorDTO(vendor));
  }

  static publicProfile(vendor) {
    if (!vendor) return null;

    return {
      id: vendor._id,
      serialNumber: vendor.serialNumber,
      fullName: vendor.fullName,

      student: {
        profilePhoto: vendor.student?.profilePhoto,
        gender: vendor.student?.gender,
        institution: vendor.student?.institution,
      },

      business: {
        storeName: vendor.business?.storeName,
        type: vendor.business?.type,
        description: vendor.business?.description,
        logo: vendor.business?.logo,
        banner: vendor.business?.banner,
        socials: vendor.business?.socials,
      },

      verification: {
        isVerified: vendor.isVerified,
      },

      accountStatus: vendor.accountStatus,
    };
  }

  static authUser(vendor) {
    return {
      id: vendor._id,
      serialNumber: vendor.serialNumber,
      fullName: vendor.fullName,
      email: vendor.email,
      role: vendor.role,

      onboardingCompleted: vendor.onboardingCompleted,

      verificationStatus: vendor.verificationStatus,
      isVerified: vendor.isVerified,
      accountStatus: vendor.accountStatus,

      profilePhoto: vendor.student?.profilePhoto,

      business: {
        storeName: vendor.business?.storeName,
        type: vendor.business?.type,
      },
    };
  }
}

module.exports = VendorDTO;