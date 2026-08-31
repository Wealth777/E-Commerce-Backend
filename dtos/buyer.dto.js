class BuyerDTO {
  constructor(buyer) {
    this.id = buyer._id?.toString();
    this.role = buyer.role || 'buyer';

    this.identity = {
      serialNumber: buyer.serialNumber || '',
      fullName: buyer.fullName || '',
    };

    this.contact = {
      email: buyer.email || '',
      phoneNo: buyer.phoneNo || '',
    };

    this.location = {
      institution: BuyerDTO.formatReference(
        buyer.institution
      ),

      state: BuyerDTO.formatReference(
        buyer.state
      ),
    };

    this.student = {
      profilePhoto:
        buyer.student?.profilePhoto || '',

      gender:
        buyer.student?.gender || null,

      matricNumber:
        buyer.student?.matricNumber || '',

      faculty:
        buyer.student?.faculty || '',

      department:
        buyer.student?.department || '',

      level:
        buyer.student?.level || '',

      residence:
        buyer.student?.residence || null,

      address:
        buyer.student?.address || '',
    };

    this.account = {
      accountStatus:
        buyer.accountStatus || 'active',

      isActive:
        buyer.isActive ?? true,

      isSuspended:
        buyer.isSuspend ?? false,

      isLocked:
        buyer.isLocked ?? false,

      isDeleted:
        buyer.isDeleted ?? false,

      onboardingCompleted:
        buyer.onboardingCompleted ?? false,
    };

    this.verification = {
      emailVerified:
        buyer.emailVerified ?? false,

      emailVerifiedDate:
        buyer.emailVerifiedDate || null,

      pendingEmail:
        buyer.pendingEmail || null,

      changeEmailDate:
        buyer.changeEmailDate || null,
    };

    this.preferences = {
      notificationPreference: buyer.preferences?.notificationPreference,
      promotionalMessages: buyer.preferences?.promotionalMessages,
    };

    this.security = {
      passwordUpdatedAt:
        buyer.updatePasswordDate || null,

      tokenVersion:
        buyer.tokenVersion ?? 0,
    };

    this.timestamps = {
      createdAt:
        buyer.createdAt || null,

      updatedAt:
        buyer.updatedAt || null,
    };
  }

  static formatReference(data) {
    if (!data) {
      return null;
    }

    return {
      id: (
        data._id ||
        data.id ||
        data
      ).toString(),

      name: data.name || null,
    };
  }

  static fromModel(buyer) {
    return new BuyerDTO(buyer);
  }

  static fromList(buyers = []) {
    return buyers.map((buyer) =>
      BuyerDTO.fromModel(buyer)
    );
  }

  static authUser(buyer) {
    return {
      id:
        buyer._id?.toString(),

      role:
        buyer.role || 'buyer',

      serialNumber:
        buyer.serialNumber || '',

      fullName:
        buyer.fullName || '',

      email:
        buyer.email || '',

      profilePhoto:
        buyer.student?.profilePhoto || '',

      emailVerified:
        buyer.emailVerified ?? false,

      onboardingCompleted:
        buyer.onboardingCompleted ?? false,

      accountStatus:
        buyer.accountStatus || 'active',

      isActive:
        buyer.isActive ?? true,

      isSuspended:
        buyer.isSuspend ?? false,

      isLocked:
        buyer.isLocked ?? false,

      preferences: {
        notificationPreference: buyer.preferences?.notificationPreference,
        promotionalMessages: buyer.preferences?.promotionalMessages,
      },
    };
  }
}

module.exports = BuyerDTO;