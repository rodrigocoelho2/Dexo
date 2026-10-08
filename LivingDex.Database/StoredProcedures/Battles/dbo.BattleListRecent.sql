/*
    BattleListRecent
    The trainer's most recent battles.
*/
CREATE PROCEDURE [dbo].[BattleListRecent]
    @UserID BIGINT,
    @Take   INT
AS
BEGIN
    SET NOCOUNT ON;
    SET TRANSACTION ISOLATION LEVEL READ COMMITTED;

    SELECT TOP (@Take)
           b.[BattleID],
           b.[Format],
           b.[P1UserID],
           b.[P2UserID],
           b.[P1Name],
           b.[P2Name],
           b.[IsCpu],
           b.[Winner],
           b.[Reason],
           b.[Turns],
           b.[P1Left],
           b.[P2Left],
           b.[P1BestKo],
           b.[P2BestKo],
           b.[Teams],
           b.[Background],
           b.[StartedAt],
           b.[EndedAt]
    FROM [dbo].[Battle] b
    WHERE b.[P1UserID] = @UserID
       OR b.[P2UserID] = @UserID
    ORDER BY b.[EndedAt] DESC;
END
