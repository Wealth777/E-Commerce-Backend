class FounderDTO {
  constructor(founder) {
    // ======================================================
    // IDENTITY
    // ======================================================

    this.identity = {
      id: founder._id,
      serialNumber: founder.serialNumber,
      fullName: founder.fullName,
      role: founder.role,
    };

    // ======================================================
    // ACCOUNT
    // ======================================================

    this.account = {
      email: founder.email,
      phoneNo: founder.phoneNo,
    };

    // ======================================================
    // VERIFICATION
    // ======================================================

    this.verification = {
      emailVerified: founder.emailVerified,
      onboardingCompleted: founder.onboardingCompleted,
      accountStatus: founder.accountStatus,
      isActive: founder.isActive,
    };

    // ======================================================
    // SECURITY
    // ======================================================

    this.updatePasswordDate = founder.updatePasswordDate;

    this.emailChange = {
      pendingEmail: founder.pendingEmail,
      requestedAt: founder.pendingEmail ? founder.changeEmailDate : null,
    };

    this.changeEmailDate = founder.changeEmailDate;

    // ======================================================
    // ACCOUNT DATES
    // ======================================================

    this.createdAt = founder.createdAt;
    this.updatedAt = founder.updatedAt;
  }

  // ========================================================
  // FULL FOUNDER
  // ========================================================

  static fromModel(founder) {
    if (!founder) return null;

    return new FounderDTO(founder);
  }

  // ========================================================
  // FOUNDER LIST
  // ========================================================

  static fromList(founders = []) {
    return founders.map((founder) => new FounderDTO(founder));
  }

  // ========================================================
  // PUBLIC PROFILE
  // ========================================================

  static publicProfile(founder) {
    if (!founder) return null;

    return {
      id: founder._id,
      serialNumber: founder.serialNumber,
      fullName: founder.fullName,

      account: {
        email: founder.email,
        phoneNo: founder.phoneNo,
      },

      verification: {
        emailVerified: founder.emailVerified,
      },

      accountStatus: founder.accountStatus,
    };
  }

  // ========================================================
  // AUTH USER
  // ========================================================

  static authUser(founder) {
    return {
      id: founder._id,
      serialNumber: founder.serialNumber,
      fullName: founder.fullName,
      email: founder.email,
      role: founder.role,

      emailVerified: founder.emailVerified,
      onboardingCompleted: founder.onboardingCompleted,

      accountStatus: founder.accountStatus,
      isActive: founder.isActive,
    };
  }
}

module.exports = FounderDTO;