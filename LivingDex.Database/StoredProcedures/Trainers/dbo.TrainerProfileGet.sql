/*
    TrainerProfileGet
    One trainer card.
*/
CREATE PROCEDURE [dbo].[TrainerProfileGet]
    @UserID BIGINT
AS
BEGIN
    SET NOCOUNT ON;
    SET TRANSACTION ISOLATION LEVEL READ COMMITTED;

    SELECT u.[UserID],
           u.[Username],
           ISNULL(p.[Partner], 25) AS [Partner],
           ISNULL(p.[PartnerShiny], CAST(0 AS BIT)) AS [PartnerShiny],
           p.[LastSeenAt],
           ISNULL((SELECT COUNT(*) FROM OPENJSON(s.[Data], N'$.caught."home|normal"')), 0) AS [LivingDex]
    FROM [dbo].[User] u
    LEFT JOIN [dbo].[TrainerProfile] p ON p.[UserID] = u.[UserID]
    LEFT JOIN [dbo].[UserState] s ON s.[UserID] = u.[UserID]
    WHERE u.[UserID] = @UserID;
END
