/*
    UserStateHistoryGet
    One saved revision, for Restore.
*/
CREATE PROCEDURE [dbo].[UserStateHistoryGet]
    @UserID   BIGINT,
    @Revision BIGINT
AS
BEGIN
    SET NOCOUNT ON;
    SET TRANSACTION ISOLATION LEVEL READ COMMITTED;

    SELECT h.[Revision],
           h.[UpdatedAt],
           h.[Client],
           h.[Data]
    FROM [dbo].[UserStateHistory] h
    WHERE h.[UserID] = @UserID
      AND h.[Revision] = @Revision;
END
