/*
    UserStateHistoryList
    The newest saved revisions of one trainer's progress.
*/
CREATE PROCEDURE [dbo].[UserStateHistoryList]
    @UserID BIGINT,
    @Take   INT
AS
BEGIN
    SET NOCOUNT ON;
    SET TRANSACTION ISOLATION LEVEL READ COMMITTED;

    SELECT TOP (@Take)
           h.[Revision],
           h.[UpdatedAt],
           h.[Client],
           h.[Data]
    FROM [dbo].[UserStateHistory] h
    WHERE h.[UserID] = @UserID
    ORDER BY h.[Revision] DESC;
END
