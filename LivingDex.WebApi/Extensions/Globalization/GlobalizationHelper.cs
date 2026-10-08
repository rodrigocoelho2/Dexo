using System.Globalization;
using LivingDex.Library.Enums;
using LivingDex.Library.Validation;

namespace LivingDex.WebApi.Extensions.Globalization;

/// <summary>
/// Translates message keys into user-facing text.
/// </summary>
internal interface IGlobalizationHelper
{
    /// <summary>
    /// Translates a key.
    /// </summary>
    /// <param name="key">A <see cref="TranslationKeys"/> name.</param>
    /// <param name="arguments">Values for the message placeholders.</param>
    /// <returns>The translated text, or the key itself when there is no translation.</returns>
    Task<string> TranslateAsync(string key, params object[] arguments);

    /// <summary>
    /// Builds a validation error for one field.
    /// </summary>
    /// <param name="field">The field identifier (camelCase, as the page sends it).</param>
    /// <param name="messageKey">The message key.</param>
    /// <param name="arguments">Values for the message placeholders.</param>
    /// <returns>The validation error.</returns>
    Task<ApiValidationError> ValidationErrorAsync(string field, string messageKey, params object[] arguments);
}

/// <summary>
/// English translations. The page is English-only, so the texts live in code rather than in a translation table.
/// Every message is a whole sentence: the page shows it as is.
/// </summary>
internal sealed class GlobalizationHelper : IGlobalizationHelper
{
    // Numbers in messages are formatted the same way whatever culture the server runs in.
    private static readonly CultureInfo English = CultureInfo.InvariantCulture;

    private static readonly Dictionary<string, string> Translations = new(StringComparer.OrdinalIgnoreCase)
    {
        [nameof(TranslationKeys.ValidationProblems)] = "Some of the values sent are not valid.",
        [nameof(TranslationKeys.NoRecordsFound)] = "'{0}' does not exist.",
        [nameof(TranslationKeys.MissingAppHeader)] = "Missing the {0} header.",

        // Accounts
        [nameof(TranslationKeys.InvalidUsername)] = "Username must be 3–24 letters, numbers, dots, dashes or underscores.",
        [nameof(TranslationKeys.PasswordTooShort)] = "Password must have at least {0} characters.",
        [nameof(TranslationKeys.PasswordTooLong)] = "Password can have at most {0} characters.",
        [nameof(TranslationKeys.RegistrationClosed)] = "New accounts are turned off on this server. Ask the admin to create one for you.",
        [nameof(TranslationKeys.UsernameTaken)] = "That username is taken.",
        [nameof(TranslationKeys.WrongCredentials)] = "Wrong username or password.",
        [nameof(TranslationKeys.WrongCurrentPassword)] = "Your current password is not correct.",
        [nameof(TranslationKeys.WrongPassword)] = "Your password is not correct.",
        [nameof(TranslationKeys.ResetOwnPassword)] = "Use Change password for your own account.",
        [nameof(TranslationKeys.DeleteOwnAccount)] = "Delete your own account from the account menu instead.",

        // States
        [nameof(TranslationKeys.MustBeJsonObject)] = "Must be a JSON object.",
        [nameof(TranslationKeys.StateTooLarge)] = "Progress document is larger than {0} bytes.",

        // Trainers
        [nameof(TranslationKeys.InvalidPartner)] = "Pick a Pokémon from #1 to #1025.",

        // Assets
        [nameof(TranslationKeys.AssetDownloadDisabled)] = "Asset caching is turned off (LivingDex__CacheAssets), so there is nothing to download.",
        [nameof(TranslationKeys.AssetNothingToDownload)] = "Nothing to download.",
        [nameof(TranslationKeys.AssetTooManyItems)] = "At most {0} items per run.",
        [nameof(TranslationKeys.AssetBadChain)] = "Each item needs 1 to {0} paths.",
        [nameof(TranslationKeys.AssetUnknown)] = "Unknown asset: {0}",
        [nameof(TranslationKeys.AssetAlreadyRunning)] = "A download is already running.",
    };

    /// <inheritdoc />
    public Task<string> TranslateAsync(string key, params object[] arguments)
    {
        var text = Translations.TryGetValue(key, out var translation) ? translation : key;
        return Task.FromResult(arguments.Length == 0 ? text : string.Format(English, text, arguments));
    }

    /// <inheritdoc />
    public async Task<ApiValidationError> ValidationErrorAsync(string field, string messageKey, params object[] arguments) =>
        new(field, await TranslateAsync(messageKey, arguments));
}
