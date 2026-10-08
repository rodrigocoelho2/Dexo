/*
    UserStateSave
    Saves the progress if @Revision is still the current one, keeps it in the history and trims the history. Always returns the current progress; @Saved = 0 means another device saved first.
*/
CREATE PROCEDURE [dbo].[UserStateSave]
    @UserID       BIGINT,
    @Revision     BIGINT,          -- the revision the client loaded; 0 before the first save
    @Data         NVARCHAR (MAX),
    @Client       NVARCHAR (80) = NULL,
    @HistoryLimit INT,
    @Saved        BIT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;

    DECLARE @Current BIGINT;

    BEGIN TRANSACTION;

    SELECT @Current = [Revision]
    FROM [dbo].[UserState] WITH (UPDLOCK, HOLDLOCK)
    WHERE [UserID] = @UserID;

    SET @Saved = CASE WHEN ISNULL(@Current, 0) = @Revision THEN 1 ELSE 0 END;

    IF @Saved = 1
    BEGIN
        IF @Current IS NULL
        BEGIN
            INSERT INTO [dbo].[UserState] ([UserID], [Revision], [Data], [UpdatedAt])
            VALUES (@UserID, @Revision + 1, @Data, SYSUTCDATETIME());
        END
        ELSE
        BEGIN
            UPDATE [dbo].[UserState]
            SET [Revision] = @Revision + 1,
                [Data] = @Data,
                [UpdatedAt] = SYSUTCDATETIME()
            WHERE [UserID] = @UserID;
        END

        INSERT INTO [dbo].[UserStateHistory] ([UserID], [Revision], [Data], [UpdatedAt], [Client])
        SELECT [UserID], [Revision], [Data], [UpdatedAt], @Client
        FROM [dbo].[UserState]
        WHERE [UserID] = @UserID;

        DELETE FROM [dbo].[UserStateHistory]
        WHERE [UserID] = @UserID
          AND [Revision] <= @Revision + 1 - @HistoryLimit;
    END

    COMMIT TRANSACTION;

    SELECT s.[UserID],
           s.[Revision],
           s.[Data],
           s.[UpdatedAt]
    FROM [dbo].[UserState] s
    WHERE s.[UserID] = @UserID;
END
