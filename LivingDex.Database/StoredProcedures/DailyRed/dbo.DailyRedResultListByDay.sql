/*
    DailyRedResultListByDay
    Every trainer with their official battle of one day, if they played it (for "Trainers today").
*/
CREATE PROCEDURE [dbo].[DailyRedResultListByDay]
    @DayKey DATE
AS
BEGIN
    SET NOCOUNT ON;
    SET TRANSACTION ISOLATION LEVEL READ COMMITTED;

    SELECT u.[UserID],
           u.[Username],
           r.[DayKey],
           r.[BattleID],
           r.[Status],
           r.[Turns],
           r.[MonsLeft],
           r.[RedLeft],
           r.[Grid],
           r.[StartedAt],
           r.[EndedAt]
    FROM [dbo].[User] u
    LEFT JOIN [dbo].[DailyRedResult] r ON r.[UserID] = u.[UserID] AND r.[DayKey] = @DayKey
    ORDER BY CASE WHEN r.[EndedAt] IS NULL THEN 1 ELSE 0 END, r.[EndedAt], u.[Username];
END
