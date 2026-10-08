/*
    UserStateGet
    The current progress of one trainer (no row before the first save).
*/
CREATE PROCEDURE [dbo].[UserStateGet]
    @UserID BIGINT
AS
BEGIN
    SET NOCOUNT ON;
    SET TRANSACTION ISOLATION LEVEL READ COMMITTED;

    SELECT s.[UserID],
           s.[Revision],
           s.[Data],
           s.[UpdatedAt]
    FROM [dbo].[UserState] s
    WHERE s.[UserID] = @UserID;
END
