/*
    TrainerProfileTouch
    Records that the trainer was online in Showdown.
*/
CREATE PROCEDURE [dbo].[TrainerProfileTouch]
    @UserID BIGINT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    SET TRANSACTION ISOLATION LEVEL READ COMMITTED;

    BEGIN TRANSACTION;

    UPDATE [dbo].[TrainerProfile] WITH (UPDLOCK, SERIALIZABLE)
    SET [LastSeenAt] = SYSUTCDATETIME()
    WHERE [UserID] = @UserID;

    IF @@ROWCOUNT = 0
    BEGIN
        INSERT INTO [dbo].[TrainerProfile] ([UserID], [LastSeenAt])
        VALUES (@UserID, SYSUTCDATETIME());
    END

    COMMIT TRANSACTION;
END
