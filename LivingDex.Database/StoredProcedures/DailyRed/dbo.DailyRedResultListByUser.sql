/*
    DailyRedResultListByUser
    Every official battle of a trainer, oldest day first; the WebApi works out the stats and streaks from it.
*/
CREATE PROCEDURE [dbo].[DailyRedResultListByUser]
    @UserID BIGINT
AS
BEGIN
    SET NOCOUNT ON;
    SET TRANSACTION ISOLATION LEVEL READ COMMITTED;

    SELECT r.[UserID],
           r.[DayKey],
           r.[BattleID],
           r.[Status],
           r.[Turns],
           r.[MonsLeft],
           r.[RedLeft],
           r.[Grid],
           r.[StartedAt],
           r.[EndedAt]
    FROM [dbo].[DailyRedResult] r
    WHERE r.[UserID] = @UserID
    ORDER BY r.[DayKey];
END
