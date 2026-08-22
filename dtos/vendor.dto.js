// class VendorDTO {
//   constructor(vendor) {
//     // ======================================================
//     // IDENTITY
//     // ======================================================

//     this.identity = {
//       id: vendor._id,
//       serialNumber: vendor.serialNumber,
//       fullName: vendor.fullName,
//       role: vendor.role,
//     };

//     // ======================================================
//     // ACCOUNT
//     // ======================================================

//     this.account = {
//       email: vendor.email,
//       phoneNo: vendor.phoneNo,
//     };

//     // ======================================================
//     // STUDENT
//     // ======================================================

//     this.student = {
//       profilePhoto: vendor.student?.profilePhoto,
//       gender: vendor.student?.gender,
//       institution: vendor.student?.institution,
//       state: vendor.student?.state,
//       matricNumber: vendor.student?.matricNumber,
//       faculty: vendor.student?.faculty,
//       department: vendor.student?.department,
//       level: vendor.student?.level,
//       residence: vendor.student?.residence,
//       address: vendor.student?.address,
//     };

//     // ======================================================
//     // BUSINESS
//     // ======================================================

//     this.business = {
//       storeName: vendor.business?.storeName,
//       type: vendor.business?.type,
//       description: vendor.business?.description,
//       logo: vendor.business?.logo,
//       banner: vendor.business?.banner,

//       socials: {
//         facebook: vendor.business?.socials?.facebook,
//         instagram: vendor.business?.socials?.instagram,
//         whatsapp: vendor.business?.socials?.whatsapp,
//         tiktok: vendor.business?.socials?.tiktok,
//       },
//     };

//     // ======================================================
//     // BANK DETAILS
//     // ======================================================

//     this.bankDetails = {
//       bankName: vendor.bankDetails?.bankName,
//       accountName: vendor.bankDetails?.accountName,
//       accountNumber: vendor.bankDetails?.accountNumber,
//     };

//     // ======================================================
//     // SETTINGS
//     // ======================================================

//     this.preferences = {
//       notificationPreference: vendor.notificationPreference,
//     };

//     // ======================================================
//     // VERIFICATION
//     // ======================================================

//     this.verification = {
//       emailVerified: vendor.emailVerified,
//       onboardingCompleted: vendor.onboardingCompleted,
//       isLocked: vendor.isLocked,
//       verificationStatus: vendor.verificationStatus,
//       isVerified: vendor.isVerified,
//       profileUpdateNotificationSent:
//         vendor.profileUpdateNotificationSent,
//       accountStatus: vendor.accountStatus
//     };

//     this.updatePasswordDate = vendor.updatePasswordDate;

//     this.emailChange = {
//       pendingEmail: vendor.pendingEmail,
//       requestedAt: vendor.pendingEmail ? vendor.changeEmailDate : null,
//     };
//     this.changeEmailDate = vendor.changeEmailDate;

//     this.createdAt = vendor.createdAt;
//     this.updatedAt = vendor.updatedAt;
//   }

//   static fromModel(vendor) {
//     if (!vendor) return null;
//     return new VendorDTO(vendor);
//   }

//   static fromList(vendors = []) {
//     return vendors.map((vendor) => new VendorDTO(vendor));
//   }

//   static publicProfile(vendor) {
//     if (!vendor) return null;

//     return {
//       id: vendor._id,
//       serialNumber: vendor.serialNumber,
//       fullName: vendor.fullName,

//       student: {
//         profilePhoto: vendor.student?.profilePhoto,
//         gender: vendor.student?.gender,
//         institution: vendor.student?.institution,
//       },

//       business: {
//         storeName: vendor.business?.storeName,
//         type: vendor.business?.type,
//         description: vendor.business?.description,
//         logo: vendor.business?.logo,
//         banner: vendor.business?.banner,
//         socials: vendor.business?.socials,
//       },

//       verification: {
//         isVerified: vendor.isVerified,
//       },

//       accountStatus: vendor.accountStatus,
//     };
//   }

//   static authUser(vendor) {
//     return {
//       id: vendor._id,
//       serialNumber: vendor.serialNumber,
//       fullName: vendor.fullName,
//       email: vendor.email,
//       role: vendor.role,

//       emailVerified: vendor.emailVerified,
//       onboardingCompleted: vendor.onboardingCompleted,

//       verificationStatus: vendor.verificationStatus,
//       isVerified: vendor.isVerified,
//       accountStatus: vendor.accountStatus,
//       isLocked: vendor.isLocked,

//       profilePhoto: vendor.student?.profilePhoto,

//       business: {
//         storeName: vendor.business?.storeName,
//         type: vendor.business?.type,
//       },
//     };
//   }
// }

// module.exports = VendorDTO;

// class VendorDTO {
//   constructor(vendor) {
//     // ======================================================
//     // IDENTITY
//     // ======================================================

//     this.identity = {
//       id: vendor._id,
//       serialNumber: vendor.serialNumber,
//       fullName: vendor.fullName,
//       role: vendor.role,
//     };

//     // ======================================================
//     // ACCOUNT
//     // ======================================================

//     this.account = {
//       email: vendor.email,
//       phoneNo: vendor.phoneNo,
//     };

//     // ======================================================
//     // STUDENT
//     // ======================================================

//     this.student = {
//       profilePhoto: vendor.student?.profilePhoto || null,
//       gender: vendor.student?.gender || null,
//       institution: vendor.student?.institution || null,
//       state: vendor.student?.state || null,
//       matricNumber: vendor.student?.matricNumber || null,
//       faculty: vendor.student?.faculty || null,
//       department: vendor.student?.department || null,
//       level: vendor.student?.level || null,
//       residence: vendor.student?.residence || null,
//       address: vendor.student?.address || null,
//     };

//     // ======================================================
//     // BUSINESS
//     // ======================================================

//     this.business = {
//       storeName: vendor.business?.storeName || null,
//       type: vendor.business?.type || null,
//       description: vendor.business?.description || null,
//       logo: vendor.business?.logo || null,
//       banner: vendor.business?.banner || null,

//       socials: {
//         facebook: vendor.business?.socials?.facebook || null,
//         instagram: vendor.business?.socials?.instagram || null,
//         whatsapp: vendor.business?.socials?.whatsapp || null,
//         tiktok: vendor.business?.socials?.tiktok || null,
//       },
//     };

//     // ======================================================
//     // BANK DETAILS
//     // ======================================================

//     this.bankDetails = {
//       bankName: vendor.bankDetails?.bankName,
//       accountName: vendor.bankDetails?.accountName,
//       accountNumber: vendor.bankDetails?.accountNumber,
//     };

//     // ======================================================
//     // SETTINGS
//     // ======================================================

//     this.preferences = {
//       notificationPreference: vendor.notificationPreference,
//     };

//     // ======================================================
//     // VERIFICATION
//     // ======================================================

//     this.verification = {
//       emailVerified: vendor.emailVerified,
//       onboardingCompleted: vendor.onboardingCompleted,
//       isLocked: vendor.isLocked,
//       verificationStatus: vendor.verificationStatus,
//       isVerified: vendor.isVerified,
//       profileUpdateNotificationSent:
//         vendor.profileUpdateNotificationSent,
//       accountStatus: vendor.accountStatus,
//     };

//     // ======================================================
//     // ACCOUNT DATES
//     // ======================================================

//     this.updatePasswordDate = vendor.updatePasswordDate;

//     this.emailChange = {
//       pendingEmail: vendor.pendingEmail,
//       requestedAt: vendor.pendingEmail
//         ? vendor.changeEmailDate
//         : null,
//     };

//     this.changeEmailDate = vendor.changeEmailDate;

//     this.createdAt = vendor.createdAt;
//     this.updatedAt = vendor.updatedAt;
//   }

//   // ======================================================
//   // MODEL
//   // ======================================================

//   static fromModel(vendor) {
//     if (!vendor) return null;

//     return new VendorDTO(vendor);
//   }

//   // ======================================================
//   // LIST
//   // ======================================================

//   static fromList(vendors = []) {
//     return vendors.map((vendor) => new VendorDTO(vendor));
//   }

//   // ======================================================
//   // PUBLIC PROFILE
//   // ======================================================

//   static publicProfile(vendor) {
//     if (!vendor) return null;

//     return {
//       id: vendor._id,
//       _id: vendor._id,

//       serialNumber: vendor.serialNumber,
//       fullName: vendor.fullName,

//       email: vendor.email,
//       phoneNo: vendor.phoneNo,

//       student: {
//         profilePhoto: vendor.student?.profilePhoto || null,
//         gender: vendor.student?.gender || null,
//         institution: vendor.student?.institution || null,
//         state: vendor.student?.state || null,
//       },

//       business: {
//         storeName: vendor.business?.storeName || null,
//         type: vendor.business?.type || null,
//         description: vendor.business?.description || null,
//         logo: vendor.business?.logo || null,
//         banner: vendor.business?.banner || null,

//         socials: {
//           facebook: vendor.business?.socials?.facebook || null,
//           instagram: vendor.business?.socials?.instagram || null,
//           whatsapp: vendor.business?.socials?.whatsapp || null,
//           tiktok: vendor.business?.socials?.tiktok || null,
//         },
//       },

//       verification: {
//         isVerified: Boolean(vendor.isVerified),
//       },

//       accountStatus: vendor.accountStatus,

//       createdAt: vendor.createdAt,
//       updatedAt: vendor.updatedAt,
//     };
//   }

//   // ======================================================
//   // AUTH USER
//   // ======================================================

//   static authUser(vendor) {
//     if (!vendor) return null;

//     return {
//       id: vendor._id,
//       _id: vendor._id,

//       serialNumber: vendor.serialNumber,
//       fullName: vendor.fullName,
//       email: vendor.email,
//       phoneNo: vendor.phoneNo,
//       role: vendor.role,

//       emailVerified: vendor.emailVerified,
//       onboardingCompleted: vendor.onboardingCompleted,

//       verificationStatus: vendor.verificationStatus,
//       isVerified: vendor.isVerified,
//       accountStatus: vendor.accountStatus,
//       isLocked: vendor.isLocked,

//       profilePhoto: vendor.student?.profilePhoto || null,

//       student: {
//         institution: vendor.student?.institution || null,
//         state: vendor.student?.state || null,
//         faculty: vendor.student?.faculty || null,
//         department: vendor.student?.department || null,
//         level: vendor.student?.level || null,
//       },

//       business: {
//         storeName: vendor.business?.storeName || null,
//         type: vendor.business?.type || null,
//       },
//     };
//   }
// }

// module.exports = VendorDTO;

class VendorDTO {
  constructor(vendor) {
    this.identity = {
      id: vendor._id,
      serialNumber: vendor.serialNumber,
      fullName: vendor.fullName,
      role: vendor.role,
    };

    this.account = {
      email: vendor.email,
      phoneNo: vendor.phoneNo,
    };

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

    this.bankDetails = {
      bankName: vendor.bankDetails?.bankName,
      accountName: vendor.bankDetails?.accountName,
      accountNumber: vendor.bankDetails?.accountNumber,
    };

    this.preferences = {
      notificationPreference: vendor.notificationPreference,
    };

    this.verification = {
      emailVerified: vendor.emailVerified,
      onboardingCompleted: vendor.onboardingCompleted,
      isLocked: vendor.isLocked,
      verificationStatus: vendor.verificationStatus,
      isVerified: vendor.isVerified,
      profileUpdateNotificationSent:
        vendor.profileUpdateNotificationSent,
      accountStatus: vendor.accountStatus,
    };

    this.updatePasswordDate = vendor.updatePasswordDate;

    this.emailChange = {
      pendingEmail: vendor.pendingEmail,
      requestedAt: vendor.pendingEmail
        ? vendor.changeEmailDate
        : null,
    };

    this.changeEmailDate = vendor.changeEmailDate;

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
      userId: vendor._id,

      serialNumber: vendor.serialNumber,
      fullName: vendor.fullName,

      account: {
        email: vendor.email,
        phoneNo: vendor.phoneNo,
      },

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

        socials: {
          facebook: vendor.business?.socials?.facebook,
          instagram: vendor.business?.socials?.instagram,
          whatsapp: vendor.business?.socials?.whatsapp,
          tiktok: vendor.business?.socials?.tiktok,
        },
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
      phoneNo: vendor.phoneNo,
      role: vendor.role,

      emailVerified: vendor.emailVerified,
      onboardingCompleted: vendor.onboardingCompleted,

      verificationStatus: vendor.verificationStatus,
      isVerified: vendor.isVerified,
      accountStatus: vendor.accountStatus,
      isLocked: vendor.isLocked,

      profilePhoto: vendor.student?.profilePhoto,

      business: {
        storeName: vendor.business?.storeName,
        type: vendor.business?.type,
      },
    };
  }
}

module.exports = VendorDTO;