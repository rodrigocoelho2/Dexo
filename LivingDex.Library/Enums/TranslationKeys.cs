namespace LivingDex.Library.Enums;

/// <summary>
/// Keys of the user-facing messages. Use with <c>nameof(TranslationKeys.X)</c>, never a magic string.
/// </summary>
public enum TranslationKeys
{
    /// <summary>Generic title of a validation failure.</summary>
    ValidationProblems,

    /// <summary>The record does not exist.</summary>
    NoRecordsFound,

    /// <summary>A write without the X-LivingDex header.</summary>
    MissingAppHeader,

    /// <summary>The username does not follow the rules.</summary>
    InvalidUsername,

    /// <summary>The password is too short.</summary>
    PasswordTooShort,

    /// <summary>The password is too long.</summary>
    PasswordTooLong,

    /// <summary>Sign-up is closed on this server.</summary>
    RegistrationClosed,

    /// <summary>Another account already uses the username.</summary>
    UsernameTaken,

    /// <summary>Wrong username or password.</summary>
    WrongCredentials,

    /// <summary>The current password does not match.</summary>
    WrongCurrentPassword,

    /// <summary>The password does not match (delete account).</summary>
    WrongPassword,

    /// <summary>The admin tried to reset their own password.</summary>
    ResetOwnPassword,

    /// <summary>The admin tried to delete their own account from Manage users.</summary>
    DeleteOwnAccount,

    /// <summary>The progress document is not a JSON object.</summary>
    MustBeJsonObject,

    /// <summary>The progress document is too large.</summary>
    StateTooLarge,

    /// <summary>The partner is outside #1–#1025.</summary>
    InvalidPartner,

    /// <summary>Asset caching is turned off.</summary>
    AssetDownloadDisabled,

    /// <summary>The download list is empty.</summary>
    AssetNothingToDownload,

    /// <summary>The download list is too long.</summary>
    AssetTooManyItems,

    /// <summary>A fallback chain has the wrong length.</summary>
    AssetBadChain,

    /// <summary>A path names an unknown kind of asset.</summary>
    AssetUnknown,

    /// <summary>A download is already running.</summary>
    AssetAlreadyRunning,

    /// <summary>The Daily Red date is not the caller's today (yyyy-MM-dd, within a day of UTC).</summary>
    InvalidDailyDate,

    /// <summary>No account is linked to that Discord account.</summary>
    DiscordNotLinked,

    /// <summary>That Discord account is linked to another account.</summary>
    DiscordTaken,

    /// <summary>Discord's answer is missing or too old.</summary>
    DiscordExpired,

    /// <summary>Discord is the only way into the account, so it can't be unlinked before a password is set.</summary>
    DiscordNeedsPassword,
}
