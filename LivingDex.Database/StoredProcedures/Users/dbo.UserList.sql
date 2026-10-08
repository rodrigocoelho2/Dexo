/*
    UserList
    Every account for Manage users, with the progress document so the WebApi can count the marked entries.
*/
CREATE PROCEDURE [dbo].[UserList]
AS
BEGIN
    SET NOCOUNT ON;
    SET TRANSACTION ISOLATION LEVEL READ COMMITTED;

    SELECT u.[UserID],
           u.[UserUniqueID],
           u.[Username],
           u.[IsAdmin],
           u.[CreatedAt],
           u.[LastLoginAt],
           s.[Data]
    FROM [dbo].[User] u
    LEFT JOIN [dbo].[UserState] s ON s.[UserID] = u.[UserID]
    ORDER BY u.[UserID];
END
