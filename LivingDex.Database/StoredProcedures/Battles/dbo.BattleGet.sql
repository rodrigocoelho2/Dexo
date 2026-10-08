/*
    BattleGet
    One battle, with the full log when asked (replays).
*/
CREATE PROCEDURE [dbo].[BattleGet]
    @BattleID VARCHAR (32),
    @WithLog  BIT = 0
AS
BEGIN
    SET NOCOUNT ON;
    SET TRANSACTION ISOLATION LEVEL READ COMMITTED;

    SELECT b.[BattleID],
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
           b.[EndedAt],
           CASE WHEN @WithLog = 1 THEN b.[Log] END AS [Log]
    FROM [dbo].[Battle] b
    WHERE b.[BattleID] = @BattleID;
END
